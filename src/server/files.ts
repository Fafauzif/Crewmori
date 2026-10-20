import { randomUUID, createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { validateUpload, safeFilename } from "../lib/downloads";
import type { Actor } from "./contracts";
import { requireConfiguration } from "./config";
import { database, transaction } from "./db";
import { assertService } from "./errors";
import { appendEvent } from "./repository";
import { checkActor, lockActor, rateLimit } from "./domain";
import { fetchWithTimeout } from "./providers/http";

export function privateStorage() {
  const { SUPABASE_URL, SUPABASE_SECRET_KEY, STORAGE_BUCKET } = requireConfiguration(["SUPABASE_URL", "SUPABASE_SECRET_KEY", "STORAGE_BUCKET"]);
  // Storage calls get a deadline like every other provider call, so a stalled transfer cannot hold a worker slot.
  const client = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetchWithTimeout(30_000) } });
  return { client, bucket: client.storage.from(STORAGE_BUCKET), name: STORAGE_BUCKET };
}
export async function uploadFile(actor: Actor, file: File) {
  const validation = await validateUpload(file);
  assertService(!validation, "UPLOAD_REJECTED", validation || "Invalid file.", 422);
  const { client: storageClient, bucket, name } = privateStorage();
  const settings = await storageClient.storage.getBucket(name);
  assertService(!settings.error && settings.data && settings.data.public === false, "PRIVATE_STORAGE_REQUIRED", "Configure a private storage bucket before uploading.", 503);
  const id = randomUUID(), path = `${actor.workspaceId}/${id}/${safeFilename(file.name)}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(bytes).digest("hex");
  await transaction(async (client) => {
    const workspace = await lockActor(client, actor);
    await rateLimit(client, `upload:${actor.workspaceId}`, 100, 86400);
    await client.query("insert into crewmori.files(id,workspace_id,owner_id,name,mime_type,byte_size,sha256,object_path,engagement_id,audience) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", [id, actor.workspaceId, workspace.owner_id, safeFilename(file.name), file.type, file.size, hash, path, actor.kind === "buyer" ? actor.engagementId : null, actor.kind === "buyer" ? "buyer" : "owner"]);
  });
  const upload = await bucket.upload(path, bytes, { contentType: file.type, upsert: false });
  assertService(!upload.error, "UPLOAD_FAILED", "File upload did not complete. Its pending record is retained for recovery.", 502);
  await transaction(async (client) => {
    await lockActor(client, actor);
    const saved = await client.query("update crewmori.files set state='available' where workspace_id=$1 and id=$2 and state='pending'", [actor.workspaceId, id]);
    assertService(saved.rowCount, "UPLOAD_EXPIRED", "This upload expired before it completed. Upload the file again.", 409);
    await appendEvent(client, actor.workspaceId, "file.saved", "A private file was saved.", [{ table: "files", id }]);
  });
  return { id, name: safeFilename(file.name), type: file.type, size: file.size, sha256: hash };
}
export async function downloadFile(actor: Actor, id: string) {
  const record = await transaction(async (client) => { await checkActor(client, actor); return client.query("select object_path,name from crewmori.files where workspace_id=$1 and id=$2 and state='available' and ($3::text is null or (engagement_id=$3 and audience='buyer'))", [actor.workspaceId, id, actor.kind === "buyer" ? actor.engagementId : null]); }, database(), true);
  assertService(record.rowCount, "FILE_UNAVAILABLE", "This file is unavailable for this session.", 404);
  const signed = await privateStorage().bucket.createSignedUrl(record.rows[0].object_path, 60, { download: record.rows[0].name });
  assertService(!signed.error && signed.data, "FILE_UNAVAILABLE", "The file could not be opened.", 502);
  return { url: signed.data.signedUrl, expiresIn: 60 };
}

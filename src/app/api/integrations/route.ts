import { randomUUID } from "node:crypto";
import { z } from "zod";
import { api, json, jsonBody } from "@/server/http";
import { ownerActor } from "@/server/auth";
import { googleForWorkspace } from "@/server/connections";
import { searchOpportunities } from "@/server/providers/discovery";
import { uploadFile } from "@/server/files";
import { runDomainCommand, rateLimit } from "@/server/domain";
import { transaction } from "@/server/db";
import { lockWorkspace } from "@/server/repository";
export const runtime = "nodejs";
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("drive.list") }).strict(),
  z.object({ action: z.literal("drive.import"), fileId: z.string().regex(/^[A-Za-z0-9_-]{1,200}$/) }).strict(),
  z.object({ action: z.literal("calendar.availability"), start: z.iso.datetime({ offset: true }), end: z.iso.datetime({ offset: true }) }).strict(),
  z.object({ action: z.literal("discovery.search"), query: z.string().min(3).max(500), domains: z.array(z.string().max(100)).min(1).max(10) }).strict(),
]);
export async function POST(request: Request) {
  return api(request, async () => {
    const actor = await ownerActor(request), input = await jsonBody(request, schema);
    await transaction(async (client) => { await lockWorkspace(client, actor); await rateLimit(client, `integration:${actor.workspaceId}:${input.action}`, 30, 86400); });
    if (input.action === "discovery.search") return json(await searchOpportunities(input));
    const google = await googleForWorkspace(actor.workspaceId);
    if (input.action === "drive.list") return json(await google.listFiles());
    if (input.action === "calendar.availability") return json(await google.freeBusy(input.start, input.end));
    const downloaded = await google.downloadFile(input.fileId), file = new File([downloaded.bytes as BlobPart], downloaded.name, { type: downloaded.type });
    const uploaded = await uploadFile(actor, file), sourceId = `source_${randomUUID()}`, attachmentId = `attachment_${randomUUID()}`;
    const saved = await runDomainCommand(actor, { type: "knowledge.save", idempotencyKey: randomUUID(), input: { id: sourceId, source: { label: downloaded.name, kind: "drive_file", external_id: input.fileId, connection_id: "drive", attachment_ids: [attachmentId], content: file.type === "text/plain" ? (await file.text()).slice(0, 30000) : "" }, attachment: { id: attachmentId, name: file.name, content_ref: uploaded.id, mime_type: file.type, size_bytes: file.size } } });
    return json(saved);
  });
}

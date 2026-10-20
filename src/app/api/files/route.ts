import { z } from "zod";
import { api, json, bodyBytes } from "@/server/http";
import { ownerActor, buyerActor } from "@/server/auth";
import { uploadFile, downloadFile } from "@/server/files";
import { ServiceError } from "@/server/errors";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return api(request, async () => {
    const actor = new URL(request.url).searchParams.get("buyer") === "true" ? await buyerActor(request) : await ownerActor(request);
    let decoded: string;
    try { decoded = decodeURIComponent(request.headers.get("x-file-name") || ""); }
    catch { throw new ServiceError("INVALID_FILE_NAME", "The file name is not valid.", 422); }
    const name = z.string().min(1).max(200).parse(decoded);
    const type = z.enum(["application/pdf", "image/png", "image/jpeg", "text/plain"]).parse(request.headers.get("content-type"));
    const bytes = await bodyBytes(request, 10_485_760);
    return json(await uploadFile(actor, new File([bytes as BlobPart], name, { type })), 201);
  });
}
export async function GET(request: Request) {
  return api(request, async () => {
    const actor = (request.headers.has("authorization") || new URL(request.url).searchParams.get("buyer") === "true") ? await buyerActor(request) : await ownerActor(request);
    const id = z.string().uuid().parse(new URL(request.url).searchParams.get("id"));
    return json(await downloadFile(actor, id));
  });
}

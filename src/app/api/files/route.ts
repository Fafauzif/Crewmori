import { z } from "zod";
import { api, json, bodyBytes } from "@/server/http";
import { ownerActor, buyerActor } from "@/server/auth";
import { uploadFile, downloadFile } from "@/server/files";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return api(request, async () => {
    const actor = await ownerActor(request);
    const name = z.string().min(1).max(200).parse(request.headers.get("x-file-name"));
    const type = z.enum(["application/pdf", "image/png", "image/jpeg", "text/plain"]).parse(request.headers.get("content-type"));
    const bytes = await bodyBytes(request, 10_485_760);
    return json(await uploadFile(actor, new File([bytes as BlobPart], name, { type })), 201);
  });
}
export async function GET(request: Request) {
  return api(request, async () => {
    const actor = request.headers.has("authorization") ? await buyerActor(request) : await ownerActor(request);
    const id = z.string().uuid().parse(new URL(request.url).searchParams.get("id"));
    return json(await downloadFile(actor, id));
  });
}

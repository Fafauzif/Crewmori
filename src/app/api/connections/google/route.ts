import { z } from "zod";
import { api, json, jsonBody } from "@/server/http";
import { ownerActor } from "@/server/auth";
import { beginGoogleConnection, revokeGoogleConnection } from "@/server/connections";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return api(request, async () => {
    const actor = await ownerActor(request);
    const input = await jsonBody(request, z.object({ capabilities: z.array(z.enum(["gmail", "calendar_read", "calendar_write", "drive"])).min(1).max(4) }).strict());
    return json(await beginGoogleConnection(actor, input.capabilities));
  });
}
export async function DELETE(request: Request) {
  return api(request, async () => json({ disconnected: true, ...(await revokeGoogleConnection(await ownerActor(request))) }));
}

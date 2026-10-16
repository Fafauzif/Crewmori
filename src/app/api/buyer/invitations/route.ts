import { z } from "zod";
import { api, json, jsonBody } from "@/server/http";
import { ownerActor } from "@/server/auth";
import { createInvitation } from "@/server/buyers";
import { runtimeConfig } from "@/server/config";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return api(request, async () => {
    const input = await jsonBody(request, z.object({ engagementId: z.string().min(1).max(160) }).strict());
    const invite = await createInvitation(await ownerActor(request), input.engagementId);
    return json({ url: `${runtimeConfig().APP_URL}/inquiry/${encodeURIComponent(invite.engagementId)}#invite=${invite.token}` });
  });
}

import { z } from "zod";
import { api, json, jsonBody } from "@/server/http";
import { exchangeInvitation } from "@/server/buyers";
import { setBuyerCookie } from "@/server/buyer-cookie";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return api(request, async () => {
    const input = await jsonBody(request, z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict());
    const session = await exchangeInvitation(input.token);
    await setBuyerCookie(session.token);
    return json({ engagementId: session.engagementId, grantId: session.grantId });
  });
}

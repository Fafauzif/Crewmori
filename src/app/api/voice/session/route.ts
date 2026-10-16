import { z } from "zod";
import { api, json, jsonBody } from "@/server/http";
import { buyerActor } from "@/server/auth";
import { startVoiceSession } from "@/server/voice";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return api(request, async () => {
    const actor = await buyerActor(request);
    const input = await jsonBody(request, z.object({ consent: z.literal(true) }).strict());
    return json(await startVoiceSession(actor, input.consent), 201);
  });
}

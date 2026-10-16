import { z } from "zod";
import { api, json, jsonBody } from "@/server/http";
import { ownerActor, buyerActor } from "@/server/auth";
import { startPayment } from "@/server/payments";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return api(request, async () => {
    const input = await jsonBody(request, z.object({ requestId: z.string().min(1).max(160), idempotencyKey: z.uuid(), buyer: z.boolean().default(false) }).strict());
    return json(await startPayment(input.buyer ? await buyerActor(request) : await ownerActor(request), input.requestId, input.idempotencyKey));
  });
}

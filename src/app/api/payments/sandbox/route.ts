import { z } from "zod";
import { api, json, jsonBody } from "@/server/http";
import { buyerActor, ownerActor } from "@/server/auth";
import { runtimeConfig } from "@/server/config";
import { assertService } from "@/server/errors";
import { transaction } from "@/server/db";
import { lockActor } from "@/server/domain";
import { recordPaymentObservation } from "@/server/webhooks";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return api(request, async () => {
    assertService(runtimeConfig().PAYMENT_PROVIDER === "sandbox", "SANDBOX_DISABLED", "Sandbox payments are disabled.", 403);
    const input = await jsonBody(request, z.object({ requestId: z.uuid(), buyer: z.boolean().default(false), confirmed: z.literal(true) }).strict());
    const actor = input.buyer ? await buyerActor(request) : await ownerActor(request);
    const payment = await transaction(async (client) => {
      await lockActor(client, actor);
      const found = (await client.query("select * from crewmori.payment_requests where workspace_id=$1 and id=$2 and provider='sandbox'", [actor.workspaceId, input.requestId])).rows[0];
      assertService(found && (actor.kind === "owner" || found.engagement_id === actor.engagementId), "NOT_FOUND", "This payment request is unavailable.", 404);
      return found;
    });
    return json(await recordPaymentObservation("sandbox", { eventId: `sandbox-confirm-${payment.id}`, requestId: payment.id, currency: payment.currency, grossMinor: Number(payment.expected_minor), feeMinor: 0, occurredAt: payment.created_at.toISOString() }, null));
  });
}

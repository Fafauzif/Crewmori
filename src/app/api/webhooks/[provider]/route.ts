import { api, json, rawBody } from "@/server/http";
import { assertService, ServiceError } from "@/server/errors";
import { verifySandboxWebhook, verifyStripeWebhook } from "@/server/providers/payments";
import { verifyVoiceWebhook } from "@/server/providers/voice";
import { recordPaymentObservation } from "@/server/webhooks";
import { recordVoiceTranscript } from "@/server/voice";
import { ConfigurationError } from "@/server/config";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  return api(request, async () => {
    const { provider } = await context.params;
    assertService(["sandbox", "stripe", "elevenlabs"].includes(provider), "NOT_FOUND", "Unknown webhook provider.", 404);
    const raw = await rawBody(request);
    if (provider === "sandbox") return json(await recordPaymentObservation("sandbox", verifySandboxWebhook(raw, request.headers.get("x-crewmori-signature")), null));
    if (provider === "elevenlabs") return json(await recordVoiceTranscript(verifyVoiceWebhook(raw, request.headers.get("elevenlabs-signature"))));
    let verified;
    try { verified = verifyStripeWebhook(raw, request.headers.get("stripe-signature")); }
    catch (error) {
      if (error instanceof ServiceError || error instanceof ConfigurationError) throw error;
      throw new ServiceError("INVALID_SIGNATURE", "Stripe webhook signature is invalid.", 401);
    }
    if (!verified.normalized) return json({ ignored: true });
    return json(await recordPaymentObservation("stripe_test", verified.normalized.receipt, verified.normalized.reference));
  }, { webhook: true });
}

import { z } from "zod";
import { requireConfiguration } from "../config";
import { emailDraftSchema } from "./google";
import { providerJson, type Fetch } from "./http";

export async function sendTransactionalEmail(input: z.infer<typeof emailDraftSchema>, idempotencyKey: string, transport?: Fetch) {
  const { RESEND_API_KEY, RESEND_FROM } = requireConfiguration(["RESEND_API_KEY", "RESEND_FROM"]);
  const message = emailDraftSchema.parse(input);
  z.string().uuid().parse(idempotencyKey);
  return providerJson("Resend", "https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${RESEND_API_KEY}`, "content-type": "application/json", "idempotency-key": idempotencyKey }, body: JSON.stringify({ from: RESEND_FROM, to: [message.to], subject: message.subject, text: message.text }) }, z.object({ id: z.string() }), { fetch: transport, mutation: true });
}

import Stripe from "stripe";
import { requireConfiguration, runtimeConfig } from "../config";
import { receiptSchema, type Receipt } from "../contracts";
import { assertService } from "../errors";
import { verifyHmac } from "../security";

export interface PaymentRequestInput { id: string; currency: "USD" | "IDR"; amountMinor: number; description: string }
export function stripeAmount(amountMinor: number, currency: "USD" | "IDR"): number {
  const amount = currency === "IDR" ? amountMinor * 100 : amountMinor;
  assertService(Number.isSafeInteger(amount) && amount > 0, "INVALID_AMOUNT", "Invalid payment amount.", 422);
  return amount;
}
export function domainAmount(amount: number, currency: string): { currency: "USD" | "IDR"; amountMinor: number } {
  assertService(currency === "usd" || currency === "idr", "CURRENCY_MISMATCH", "Unsupported provider currency.", 422);
  const value = currency === "idr" ? amount / 100 : amount;
  assertService(Number.isSafeInteger(value) && value > 0, "INVALID_AMOUNT", "Provider amount cannot be represented exactly.", 422);
  return { currency: currency.toUpperCase() as "USD" | "IDR", amountMinor: value };
}
export function stripeClient() {
  const { STRIPE_SECRET_KEY } = requireConfiguration(["STRIPE_SECRET_KEY"]);
  assertService(STRIPE_SECRET_KEY.startsWith("sk_test_") || STRIPE_SECRET_KEY.startsWith("rk_test_"), "LIVE_PAYMENTS_DISABLED", "Configure a Stripe test key. Live settlement is not enabled.", 503);
  return new Stripe(STRIPE_SECRET_KEY, { maxNetworkRetries: 0, timeout: 20000 });
}
export async function createStripeRequest(input: PaymentRequestInput) {
  const session = await stripeClient().checkout.sessions.create({
    mode: "payment",
    client_reference_id: input.id,
    metadata: { request_id: input.id },
    line_items: [{ quantity: 1, price_data: { currency: input.currency.toLowerCase(), unit_amount: stripeAmount(input.amountMinor, input.currency), product_data: { name: input.description.slice(0, 200) } } }],
    success_url: `${runtimeConfig().APP_URL}/payment/return?request=${encodeURIComponent(input.id)}`,
    cancel_url: `${runtimeConfig().APP_URL}/payment/return?request=${encodeURIComponent(input.id)}`,
  }, { idempotencyKey: `crewmori-payment-${input.id}` });
  assertService(!session.livemode && session.url, "INVALID_PROVIDER_RESPONSE", "Stripe did not return a test checkout.", 502);
  return { reference: session.id, url: session.url };
}
export async function getStripeRequest(reference: string) {
  const session = await stripeClient().checkout.sessions.retrieve(reference);
  assertService(!session.livemode, "LIVE_PAYMENTS_DISABLED", "Live settlement is not enabled.", 422);
  return { reference: session.id, status: session.payment_status, expiresAt: new Date(session.expires_at * 1000).toISOString() };
}
export function normalizeStripeEvent(event: Stripe.Event): { receipt: Receipt; reference: string } | null {
  assertService(!event.livemode, "LIVE_PAYMENTS_DISABLED", "Live settlement is not enabled.", 422);
  if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) return null;
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") return null;
  assertService(session.amount_total && session.currency, "INVALID_RECEIPT", "The payment event is incomplete.", 422);
  const money = domainAmount(session.amount_total, session.currency);
  return { reference: session.id, receipt: receiptSchema.parse({ eventId: event.id, requestId: session.metadata?.request_id, currency: money.currency, grossMinor: money.amountMinor, feeMinor: null, occurredAt: new Date(event.created * 1000).toISOString() }) };
}
export function verifyStripeWebhook(raw: string, signature: string | null) {
  const { STRIPE_WEBHOOK_SECRET } = requireConfiguration(["STRIPE_WEBHOOK_SECRET"]);
  assertService(signature, "INVALID_SIGNATURE", "Webhook signature is missing.", 401);
  const event = stripeClient().webhooks.constructEvent(raw, signature, STRIPE_WEBHOOK_SECRET);
  return { event, normalized: normalizeStripeEvent(event) };
}
export function verifySandboxWebhook(raw: string, signature: string | null, now?: number): Receipt {
  const { PAYMENT_SANDBOX_SECRET } = requireConfiguration(["PAYMENT_SANDBOX_SECRET"]);
  assertService(runtimeConfig().sandboxPayments, "SANDBOX_DISABLED", "Sandbox receipts are disabled.", 403);
  verifyHmac(raw, signature, PAYMENT_SANDBOX_SECRET, now);
  return receiptSchema.parse(JSON.parse(raw));
}

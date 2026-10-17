export const PAYMENT_CHECK_DELAYS = [0, 4000, 6000, 10000, 15000, 20000, 30000, 30000] as const;
export function isPaymentRequestId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
export function paymentStatusCopy(state: string | undefined) {
  switch (state) {
    case "confirmed": return { title: "Payment confirmed", detail: "The verified receipt has been recorded against your invoice.", tone: "success", terminal: true };
    case "created": return { title: "Payment not completed", detail: "This payment request is open. Returning from checkout does not confirm a charge; review your invoice before trying again.", tone: "neutral", terminal: true };
    case "pending": return { title: "Waiting for payment confirmation", detail: "The provider has not yet confirmed this payment to Crewmori. Keep your provider receipt and avoid paying again while the status is uncertain.", tone: "info", terminal: false };
    case "unknown": return { title: "Payment needs a status check", detail: "Crewmori could not confirm the provider result. Check your provider account before trying again, and contact the business if a charge appears.", tone: "warning", terminal: true };
    case "cancelled": return { title: "Payment request cancelled", detail: "This request is no longer available for payment. Ask the business for a current invoice if you still need to pay.", tone: "neutral", terminal: true };
    case "expired": return { title: "Payment link expired", detail: "Ask the business to review the invoice and provide a current payment link. An expired link does not confirm a charge.", tone: "warning", terminal: true };
    case "failed": return { title: "Payment was not confirmed", detail: "Check the provider result before retrying. No payment is recorded as confirmed in Crewmori.", tone: "error", terminal: true };
    case "review_required": return { title: "Payment is under review", detail: "The business needs to review this payment before it can be confirmed against the invoice. Keep your receipt; do not make a second payment to resolve this status.", tone: "warning", terminal: true };
    default: return { title: "Payment status unavailable", detail: "This payment state needs review. Return to the project or ask the business to check the invoice; do not assume a payment succeeded.", tone: "warning", terminal: true };
  }
}

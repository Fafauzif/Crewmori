"use client";
import { UiText } from "@/components/ui-text";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BackendClient, BackendError } from "@/lib/backend-client";
import { useStore } from "@/lib/store";
import { a, s, money, type Entity } from "@/lib/types";
import { isPaymentRequestId, paymentStatusCopy, PAYMENT_CHECK_DELAYS } from "@/lib/payment-experience";
import { Badge, Button, Panel } from "@/components/ui";

type Checkout = { id: string; provider: string; state: string; url: string | null; message?: string };
export function ConnectedBuyerPayment({ data }: { data: Record<string, unknown> }) {
  const { refresh, t } = useStore();
  const [checkout, setCheckout] = useState<Record<string, Checkout>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const inFlight = useRef(false), keys = useRef(new Map<string, string>());
  const start = async (request: Entity) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(request.id); setErrors((all) => ({ ...all, [request.id]: "" }));
    const key = keys.current.get(request.id) || crypto.randomUUID(); keys.current.set(request.id, key);
    try {
      const result = await new BackendClient().request<Checkout>("/api/payments/start", { requestId: request.id, buyer: true, idempotencyKey: key });
      setCheckout((all) => ({ ...all, [request.id]: result })); await refresh();
    } catch (error) { setErrors((all) => ({ ...all, [request.id]: error instanceof Error ? error.message : "Payment could not be opened. Retry checks this same request." })); }
    finally { inFlight.current = false; setBusy(""); }
  };
  const confirmSandbox = async (requestId: string, checkoutId: string) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(requestId); setErrors((all) => ({ ...all, [requestId]: "" }));
    try { await new BackendClient().request("/api/payments/sandbox", { requestId: checkoutId, buyer: true, confirmed: true }); await refresh(); }
    catch (error) { setErrors((all) => ({ ...all, [requestId]: error instanceof Error ? error.message : "Test payment could not finish. Check its status before retrying." })); }
    finally { inFlight.current = false; setBusy(""); }
  };
  const requests = a<Entity>(data.requests);
  return <section><h2><UiText>{"Payment, clearly laid out."}</UiText></h2><p><UiText>{"Review the invoice before continuing. Payment status updates after the provider confirms it."}</UiText></p>
    {!requests.length && <p><UiText>{"No payment is requested for this project right now."}</UiText></p>}
    {requests.map((request) => { const value = checkout[request.id], state = value?.state || s(request.state); return <Panel key={request.id} aria-busy={busy === request.id}><h3><UiText>{"Invoice payment"}</UiText></h3><p>{money(request.expected)}</p><Badge>{state.replaceAll("_", " ")}</Badge>
      {errors[request.id] && <p className="feedback error" role="alert">{t(errors[request.id])}</p>}
      {!["confirmed", "cancelled", "expired"].includes(state) && <div className="public-actions"><Button disabled={!!busy} onClick={() => void start(request)}>{busy === request.id ? "Checking payment request…" : value ? "Check this payment request" : "Open payment"}</Button>
        {value?.url && <a className="btn primary" href={value.url}><UiText>{"Continue to Stripe test checkout"}</UiText></a>}
        {value?.provider === "sandbox" && <><p><UiText>{"Sandbox: this test records a receipt without charging money."}</UiText></p><Button disabled={!!busy} onClick={() => void confirmSandbox(request.id, value.id)}>{"Confirm test payment"}</Button></>}
      </div>}
      {state === "unknown" && <p className="feedback" role="status"><UiText>{"The provider result is uncertain. Check your provider account before paying again. Retrying above keeps this same invoice request."}</UiText></p>}
      {state === "confirmed" && <p role="status"><UiText>{"The verified payment is recorded."}</UiText></p>}
    </Panel>; })}
    {a<Entity>(data.receipts).map((receipt) => <Panel key={receipt.id}><h3><UiText>{"Payment received"}</UiText></h3><p>{money(receipt.gross)} · {s(receipt.reconciliation_state).replaceAll("_", " ")}</p></Panel>)}
  </section>;
}
export function PaymentReturn() {
  const { t } = useStore();
  const params = useSearchParams(), id = params.get("request") || "";
  const valid = isPaymentRequestId(id), checkedId = useRef(id);
  const [result, setResult] = useState<{ state: string; engagementId: string } | null>(null);
  const [error, setError] = useState(""), [checking, setChecking] = useState(valid), [exhausted, setExhausted] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!valid) { setResult(null); setError(""); setChecking(false); setExhausted(false); return; }
    let active = true, timer: ReturnType<typeof setTimeout> | undefined, checks = 0, inFlight = false, stopped = false;
    if (checkedId.current !== id) { setResult(null); checkedId.current = id; }
    setError(""); setChecking(true); setExhausted(false);
    const check = async () => {
      if (!active || inFlight || stopped || document.visibilityState === "hidden") return;
      inFlight = true; setChecking(true);
      let terminal = false;
      try {
        const next = await new BackendClient().request<{ state: string; engagementId: string }>(`/api/payments/status?request=${encodeURIComponent(id)}`);
        if (active) { setResult(next); setError(""); terminal = paymentStatusCopy(next.state).terminal; stopped = terminal; }
      } catch (failure) { if (active) { setError(failure instanceof Error ? failure.message : "Payment status is unavailable. Your payment has not been marked confirmed."); terminal = failure instanceof BackendError && [400, 401, 403, 404, 410, 422].includes(failure.status); stopped = terminal; } }
      finally {
        inFlight = false; checks++;
        if (active) {
          setChecking(false);
          if (!terminal && checks < PAYMENT_CHECK_DELAYS.length) timer = setTimeout(() => void check(), PAYMENT_CHECK_DELAYS[checks]);
          else if (!terminal) setExhausted(true);
        }
      }
    };
    const visible = () => { if (document.visibilityState === "visible" && checks < PAYMENT_CHECK_DELAYS.length && !inFlight) { clearTimeout(timer); void check(); } };
    void check(); document.addEventListener("visibilitychange", visible);
    return () => { active = false; clearTimeout(timer); document.removeEventListener("visibilitychange", visible); };
  }, [id, valid, attempt]);
  const copy = result ? paymentStatusCopy(result.state) : null;
  return <main className="public-main"><Panel aria-busy={checking && valid}><div role="status" aria-live="polite" aria-atomic="true"><h1>{t(!valid ? "This payment link is incomplete" : copy?.title || (error ? "We couldn’t check your payment" : "Checking your payment"))}</h1>
    <p>{t(!valid ? "Open the complete payment link from your project, or ask the business to review the invoice." : copy?.detail || "We’re checking the recorded provider result. Returning from checkout does not prove a payment succeeded.")}</p></div>
    {error && <p className="feedback error" role="alert">{t(error)}</p>}
    {checking && valid && <p role="status"><UiText>{"Checking the verified payment record…"}</UiText></p>}
    {exhausted && <p className="feedback" role="status"><UiText>{"Automatic checks have paused. You can check again later or return to your project; no new payment will be started."}</UiText></p>}
    <div className="public-actions">{valid && !checking && result?.state !== "confirmed" && <Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>{"Check status again"}</Button>}{result?.engagementId && <Link className="btn primary" href={`/buyer/${encodeURIComponent(result.engagementId)}`}><UiText>{"Return to your project"}</UiText></Link>}{!result?.engagementId && <Link href="/"><UiText>{"Back to Crewmori"}</UiText></Link>}</div>
  </Panel></main>;
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BackendClient } from "@/lib/backend-client";
import { useStore } from "@/lib/store";
import { a, s, money, type Entity } from "@/lib/types";
import { Badge, Button, Panel } from "@/components/ui";

type Checkout = { id: string; provider: string; state: string; url: string | null; message?: string };
export function ConnectedBuyerPayment({ data }: { data: Record<string, unknown> }) {
  const { refresh } = useStore();
  const [checkout, setCheckout] = useState<Record<string, Checkout>>({}), [error, setError] = useState(""), [busy, setBusy] = useState("");
  const start = async (request: Entity) => {
    setBusy(request.id); setError("");
    try {
      const result = await new BackendClient().request<Checkout>("/api/payments/start", { requestId: request.id, buyer: true, idempotencyKey: crypto.randomUUID() });
      setCheckout((all) => ({ ...all, [request.id]: result })); await refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Payment could not be opened."); }
    finally { setBusy(""); }
  };
  const confirmSandbox = async (id: string) => {
    setBusy(id); setError("");
    try { await new BackendClient().request("/api/payments/sandbox", { requestId: id, buyer: true, confirmed: true }); await refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : "Test payment could not finish."); }
    finally { setBusy(""); }
  };
  return <section><h2>Payment, clearly laid out.</h2><p>Review the invoice before continuing. Payment status updates after the provider confirms it.</p>{error && <p role="alert">{error}</p>}
    {a<Entity>(data.requests).map((request) => { const value = checkout[request.id]; return <Panel key={request.id}><h3>Invoice payment</h3><p>{money(request.expected)}</p><Badge>{s(request.state)}</Badge>
      {request.state !== "confirmed" && <div className="public-actions"><Button disabled={!!busy} onClick={() => void start(request)}>Open payment</Button>
        {value?.url && <a className="btn btn-primary" href={value.url}>Continue to Stripe test checkout</a>}
        {value?.provider === "sandbox" && <><p>Sandbox: this test records a receipt without charging money.</p><Button disabled={!!busy} onClick={() => void confirmSandbox(value.id)}>Confirm test payment</Button></>}
      </div>}</Panel>; })}
    {a<Entity>(data.receipts).map((receipt) => <Panel key={receipt.id}><h3>Payment received</h3><p>{money(receipt.gross)} · {s(receipt.reconciliation_state)}</p></Panel>)}
  </section>;
}
export function PaymentReturn() {
  const params = useSearchParams(), id = params.get("request") || "";
  const [result, setResult] = useState<{ state: string; engagementId: string } | null>(null), [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const check = async () => {
      try { const next = await new BackendClient().request<{ state: string; engagementId: string }>(`/api/payments/status?request=${encodeURIComponent(id)}`); if (active) { setResult(next); setError(""); } }
      catch (error) { if (active) setError(error instanceof Error ? error.message : "Payment status is unavailable."); }
    };
    void check(); const timer = setInterval(() => void check(), 4000);
    return () => { active = false; clearInterval(timer); };
  }, [id]);
  return <main className="public-main"><Panel><h1>{result?.state === "confirmed" ? "Payment confirmed" : "Checking your payment"}</h1><p>{result?.state === "confirmed" ? "Your receipt has been recorded against the invoice." : "Closing checkout does not confirm a payment. We are waiting for the verified provider result."}</p>{error && <p role="alert">{error}</p>}{result && <Link href={`/buyer/${result.engagementId}`}>Return to your project</Link>}</Panel></main>;
}

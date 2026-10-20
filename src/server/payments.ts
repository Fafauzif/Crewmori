import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { execute, invoiceOutstanding } from "../lib/engine";
import { s, type Entity } from "../lib/types";
import type { Actor, OwnerActor } from "./contracts";
import { database, transaction } from "./db";
import { bindBuyer, lockActor } from "./domain";
import { loadDomain, persistDomain } from "./domain-state";
import { assertService } from "./errors";
import { runtimeConfig } from "./config";
import { appendEvent, previousCommand, saveCommand } from "./repository";
import { createStripeRequest } from "./providers/payments";

export async function startPayment(actor: Actor, domainRequestId: string, idempotencyKey: string, createCheckout = createStripeRequest) {
  const prepared = await transaction(async (client) => {
    await lockActor(client, actor);
    const receiptActor: OwnerActor = { kind: "owner", workspaceId: actor.workspaceId, userId: actor.kind === "owner" ? actor.userId : actor.grantId };
    const input = { domainRequestId };
    const prior = await previousCommand(client, receiptActor, "payment.start", idempotencyKey, input);
    if (prior) return (await client.query("select * from crewmori.payment_requests where workspace_id=$1 and id=$2", [actor.workspaceId, prior.id])).rows[0];
    const before = await loadDomain(client, actor.workspaceId);
    if (actor.kind === "buyer") bindBuyer(before, actor);
    const request = before.tables.payment_requests?.[domainRequestId];
    assertService(request, "NOT_FOUND", "This payment request is unavailable.", 404);
    const invoice = before.tables.invoices?.[s(request.invoice_id)];
    assertService(invoice && invoice.state !== "void", "INVALID_INVOICE", "This invoice cannot accept payment.", 422);
    const engagement = Object.values(before.tables.engagements || {}).find((e) => e.project_id && e.project_id === invoice.project_id && e.client_id === invoice.client_id);
    assertService(engagement && (actor.kind === "owner" || engagement.id === actor.engagementId), "NOT_FOUND", "This invoice is unavailable for this engagement.", 404);
    const existing = (await client.query("select * from crewmori.payment_requests where workspace_id=$1 and domain_request_id=$2", [actor.workspaceId, domainRequestId])).rows[0];
    if (existing) {
      await saveCommand(client, receiptActor, "payment.start", idempotencyKey, input, { id: existing.id });
      return existing;
    }
    const execution = execute(before, "payment.startRequest", { id: request.id, ...(actor.kind === "buyer" ? { grant_id: actor.grantId, engagement_id: actor.engagementId } : {}), idempotency_key: idempotencyKey });
    assertService(execution.result.ok, execution.result.code || "INVALID_INVOICE", execution.result.message, 422);
    const outstanding = invoiceOutstanding(execution.state, invoice.id);
    assertService(outstanding > 0, "ALREADY_PAID", "This invoice has no outstanding balance.", 409);
    const config = runtimeConfig(), id = randomUUID(), provider = config.PAYMENT_PROVIDER;
    assertService(provider !== "sandbox" || config.sandboxPayments, "PAYMENTS_NOT_CONFIGURED", "Online payment is not available yet. Contact the freelancer to arrange payment.", 503);
    const saved = (await client.query("insert into crewmori.payment_requests(id,workspace_id,domain_request_id,invoice_id,engagement_id,provider,expected_minor,currency) values($1,$2,$3,$4,$5,$6,$7,$8) returning *", [id, actor.workspaceId, domainRequestId, invoice.id, engagement.id, provider, outstanding, invoice.currency])).rows[0];
    await persistDomain(client, before, execution.state, actor.workspaceId);
    await saveCommand(client, receiptActor, "payment.start", idempotencyKey, input, { id });
    return saved;
  });
  if (prepared.provider === "sandbox") return { id: prepared.id, provider: "sandbox", state: prepared.state, url: null, message: "Sandbox payment. No real money will be charged." };
  if (prepared.checkout_url || prepared.state === "confirmed") return { id: prepared.id, provider: prepared.provider, state: prepared.state, url: prepared.checkout_url };
  // Stripe's deterministic key makes concurrent retries of this immutable request safe.
  let checkout;
  try { checkout = await createCheckout({ id: prepared.id, currency: prepared.currency, amountMinor: Number(prepared.expected_minor), description: `Invoice ${prepared.invoice_id}` }); }
  catch (error) {
    await database().query("update crewmori.payment_requests set state='unknown' where id=$1 and state='created'", [prepared.id]);
    throw error;
  }
  return transaction(async (client) => {
    await lockActor(client, actor);
    const found = (await client.query("select * from crewmori.payment_requests where id=$1 for update", [prepared.id])).rows[0];
    assertService(!found.provider_reference || found.provider_reference === checkout.reference, "PAYMENT_CONFLICT", "The provider reference changed. Review before retrying.", 409);
    await client.query("update crewmori.payment_requests set provider_reference=$2,checkout_url=$3,state=case when state='confirmed' then state else 'pending' end where id=$1", [prepared.id, checkout.reference, checkout.url]);
    await appendEvent(client, actor.workspaceId, "payment.checkout_ready", "A test checkout is ready for the authorized invoice.");
    return { id: prepared.id, provider: prepared.provider, state: found.state === "confirmed" ? "confirmed" : "pending", url: checkout.url };
  });
}

export async function reconcileObservation(client: PoolClient, observationId: string): Promise<string> {
  const observation = (await client.query("select o.*,r.domain_request_id,r.invoice_id,r.expected_minor from crewmori.payment_observations o join crewmori.payment_requests r on r.id=o.request_id where o.id=$1", [observationId])).rows[0];
  if (!observation?.domain_request_id) return "review_required";
  const before = await loadDomain(client, observation.workspace_id), after = structuredClone(before);
  const invoice = after.tables.invoices?.[observation.invoice_id];
  const gross = { amount_minor: Number(observation.gross_minor), currency: observation.currency, scale: observation.currency === "USD" ? 2 : 0 };
  const receipt: Entity = { id: `receipt_${observation.id}`, version: 1, workspace_id: observation.workspace_id, observation_id: observation.id, payment_request_id: observation.domain_request_id, provider: observation.provider, provider_event_id: observation.event_id, gross, fee: observation.fee_minor === null ? null : { ...gross, amount_minor: Number(observation.fee_minor) }, observation_state: "provider_confirmed", reconciliation_state: "unmatched", received_at: observation.occurred_at.toISOString(), created_at: new Date().toISOString() };
  (after.tables.receipts ||= {})[receipt.id] = receipt;
  let resultState = after;
  let state = "review_required";
  if (invoice && !["draft", "void"].includes(s(invoice.state)) && invoice.currency === observation.currency) {
    const amount = Math.min(gross.amount_minor, invoiceOutstanding(after, invoice.id));
    if (amount > 0) {
      const execution = execute(after, "finance.allocateReceipt", { receipt_id: receipt.id, invoice_id: invoice.id, amount_minor: amount, reason: "Verified provider receipt matched to its authorized invoice", idempotency_key: observation.id });
      assertService(execution.result.ok, "SETTLEMENT_FAILED", "The verified receipt could not be allocated.", 409);
      resultState = execution.state;
      if (amount === gross.amount_minor) state = "reconciled";
    }
  }
  if (state === "review_required") {
    const issueId = `receipt_review_${observation.id}`;
    (resultState.tables.finance_issues ||= {})[issueId] = { id: issueId, version: 1, receipt_id: receipt.id, invoice_id: observation.invoice_id, kind: invoice?.currency !== observation.currency ? "currency_mismatch" : "unallocated_receipt", state: "open", summary: "Review the unmatched or excess receipt. No currency conversion was applied." };
  }
  await persistDomain(client, before, resultState, observation.workspace_id);
  await client.query("update crewmori.payment_observations set state=$2 where id=$1", [observation.id, state]);
  if (invoice && invoiceOutstanding(resultState, invoice.id) === 0) await client.query("update crewmori.payment_requests set state='confirmed' where id=$1", [observation.request_id]);
  await appendEvent(client, observation.workspace_id, `payment.${state}`, state === "reconciled" ? "The verified receipt was allocated and project prerequisites were checked." : "The receipt is retained for allocation review.");
  return state;
}

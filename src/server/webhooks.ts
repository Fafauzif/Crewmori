import { receiptSchema, type Receipt } from "./contracts";
import { transaction } from "./db";
import { assertService } from "./errors";
import { fingerprint } from "./security";
import { reconcileObservation } from "./payments";
import { appendEvent } from "./repository";

// Observation is deliberately separate from invoice allocation. A valid signature
// proves provenance; amount, beneficiary and commercial authority need reconciliation.
export async function recordPaymentObservation(provider: "sandbox" | "stripe_test", raw: Receipt, reference: string | null) {
  const receipt = receiptSchema.parse(raw);
  return transaction(async (client) => {
    // Lock the workspace first, then read the request, so a concurrent checkout update cannot slip between.
    const owner = (await client.query("select workspace_id from crewmori.payment_requests where id=$1 and provider=$2", [receipt.requestId, provider])).rows[0];
    if (owner) await client.query("select id from crewmori.workspaces where id=$1 for update", [owner.workspace_id]);
    const request = owner ? (await client.query("select * from crewmori.payment_requests where id=$1 and provider=$2 for update", [receipt.requestId, provider])).rows[0] : undefined;
    const payload = { ...receipt, reference };
    const hash = fingerprint(payload);
    const inserted = await client.query("insert into crewmori.provider_inbox(provider,event_id,fingerprint,workspace_id,payload) values($1,$2,$3,$4,$5) on conflict do nothing returning event_id", [provider, receipt.eventId, hash, request?.workspace_id ?? null, JSON.stringify(payload)]);
    if (!inserted.rowCount) {
      const prior = (await client.query("select fingerprint,state from crewmori.provider_inbox where provider=$1 and event_id=$2", [provider, receipt.eventId])).rows[0];
      assertService(prior.fingerprint === hash, "PROVIDER_EVENT_CONFLICT", "This provider event ID has different content.", 409);
      return { replayed: true, state: prior.state };
    }
    // A signed event can arrive before the Checkout-create response is persisted.
    if (request && provider === "stripe_test" && !request.provider_reference && reference && request.domain_request_id && request.currency === receipt.currency && Number(request.expected_minor) === receipt.grossMinor) {
      const bound = await client.query("update crewmori.payment_requests set provider_reference=$2 where id=$1 and provider_reference is null", [request.id, reference]);
      if (bound.rowCount === 1) request.provider_reference = reference;
    }
    if (!request || (provider === "stripe_test" && (!reference || request.provider_reference !== reference))) {
      await client.query("update crewmori.provider_inbox set state='quarantined' where provider=$1 and event_id=$2", [provider, receipt.eventId]);
      return { replayed: false, state: "quarantined" };
    }
    if (provider === "stripe_test") {
      const prior = await client.query("select request_id,gross_minor,currency from crewmori.payment_observations where provider=$1 and provider_reference=$2", [provider, reference]);
      if (prior.rowCount) {
        const consistent = prior.rows[0].request_id === receipt.requestId && Number(prior.rows[0].gross_minor) === receipt.grossMinor && prior.rows[0].currency === receipt.currency;
        const state = consistent ? "processed" : "quarantined";
        await client.query("update crewmori.provider_inbox set state=$3 where provider=$1 and event_id=$2", [provider, receipt.eventId, state]);
        return { replayed: consistent, state };
      }
    }
    const result = await client.query("insert into crewmori.payment_observations(workspace_id,request_id,provider,event_id,provider_reference,gross_minor,fee_minor,currency,occurred_at,state) values($1,$2,$3,$4,$5,$6,$7,$8,$9,'review_required') returning id", [request.workspace_id, receipt.requestId, provider, receipt.eventId, reference, receipt.grossMinor, receipt.feeMinor, receipt.currency, receipt.occurredAt]);
    await client.query("update crewmori.provider_inbox set state='processed' where provider=$1 and event_id=$2", [provider, receipt.eventId]);
    await appendEvent(client, request.workspace_id, "receipt.observed", "A verified receipt observation is awaiting allocation review.", [{ table: "payment_observations", id: result.rows[0].id }]);
    const state = await reconcileObservation(client, result.rows[0].id);
    return { replayed: false, state, observationId: result.rows[0].id };
  });
}

import { receiptSchema, type Receipt } from "./contracts";
import { transaction } from "./db";
import { assertService } from "./errors";
import { fingerprint } from "./security";
import { appendEvent } from "./repository";

// Observation is deliberately separate from invoice allocation. A valid signature
// proves provenance; amount, beneficiary and commercial authority need reconciliation.
export async function recordPaymentObservation(provider: "sandbox" | "stripe_test", raw: Receipt, reference: string | null) {
  const receipt = receiptSchema.parse(raw);
  return transaction(async (client) => {
    const requestResult = await client.query("select * from crewmori.payment_requests where id=$1 and provider=$2", [receipt.requestId, provider]);
    const request = requestResult.rows[0];
    if (request) await client.query("select id from crewmori.workspaces where id=$1 for update", [request.workspace_id]);
    const payload = { ...receipt, reference };
    const hash = fingerprint(payload);
    const inserted = await client.query("insert into crewmori.provider_inbox(provider,event_id,fingerprint,workspace_id,payload) values($1,$2,$3,$4,$5) on conflict do nothing returning event_id", [provider, receipt.eventId, hash, request?.workspace_id ?? null, JSON.stringify(payload)]);
    if (!inserted.rowCount) {
      const prior = (await client.query("select fingerprint,state from crewmori.provider_inbox where provider=$1 and event_id=$2", [provider, receipt.eventId])).rows[0];
      assertService(prior.fingerprint === hash, "PROVIDER_EVENT_CONFLICT", "This provider event ID has different content.", 409);
      return { replayed: true, state: prior.state };
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
    return { replayed: false, state: "review_required", observationId: result.rows[0].id };
  });
}

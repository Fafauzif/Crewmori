import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { execute } from "../lib/engine";
import { a, s, type Input, type Result } from "../lib/types";
import type { OwnerActor } from "./contracts";
import { transaction, database } from "./db";
import { assertService, ServiceError } from "./errors";
import { loadDomain, persistDomain } from "./domain-state";
import { appendEvent, lockWorkspace } from "./repository";
import { fingerprint } from "./security";
import { googleForWorkspace } from "./connections";
import { requireConfiguration, runtimeConfig } from "./config";
import { emailDraftSchema } from "./providers/google";
import { sendTransactionalEmail } from "./providers/email";

export const dispatchSchema = z.object({ type: z.enum(["message.send", "invoice.send", "calendar.invite"]), input: z.record(z.string(), z.unknown()), idempotencyKey: z.uuid() }).strict();
export type DispatchTransport = (operation: string, payload: Input, id: string) => Promise<{ id: string }>;
async function providerSend(operation: string, payload: Input, id: string) {
  if (operation === "calendar.invite") {
    const google = await googleForWorkspace(s(payload.workspaceId));
    return google.createEvent({ ...payload.event as Parameters<typeof google.createEvent>[0], id: createHash("sha256").update(id).digest("hex") });
  }
  const email = emailDraftSchema.parse(payload.email);
  if (runtimeConfig().MAIL_PROVIDER === "resend") return sendTransactionalEmail(email, id);
  return (await googleForWorkspace(s(payload.workspaceId))).sendMessage(email);
}
export async function dispatchApproved(actor: OwnerActor, raw: unknown, transport: DispatchTransport = providerSend) {
  const input = dispatchSchema.parse(raw);
  // Check configuration before claiming the one external attempt. No credentials are persisted in the dispatch.
  if (transport === providerSend) {
    if (input.type === "calendar.invite" || runtimeConfig().MAIL_PROVIDER === "google") await googleForWorkspace(actor.workspaceId);
    else requireConfiguration(["RESEND_API_KEY", "RESEND_FROM"]);
  }
  const prepared = await transaction(async (client) => {
    await lockWorkspace(client, actor);
    const hash = fingerprint({ type: input.type, input: input.input });
    const prior = (await client.query("select * from crewmori.external_dispatches where workspace_id=$1 and command_key=$2", [actor.workspaceId, input.idempotencyKey])).rows[0];
    if (prior) {
      assertService(prior.fingerprint === hash, "IDEMPOTENCY_CONFLICT", "This dispatch key was used for different content.", 409);
      if (prior.provider_reference && prior.state !== "completed") return { id: prior.id as string, payload: prior.payload as Input, delivered: { id: prior.provider_reference as string } };
      assertService(prior.state === "completed", "DISPATCH_REVIEW_REQUIRED", "This external attempt is unresolved. Check its status before preparing another send.", 409);
      return { replay: prior.result as Result };
    }
    const before = await loadDomain(client, actor.workspaceId);
    // Transport configuration is checked above; the shared domain validates exact approval and destination.
    if (input.type !== "calendar.invite") before.tables.connections.gmail = { id: "gmail", version: 1, state: "connected", approved_capabilities: ["simulate_send"] };
    else if (transport !== providerSend) before.tables.connections.calendar = { id: "calendar", version: 1, state: "connected", approved_capabilities: ["simulate_invite"] };
    const execution = execute(before, input.type, { ...input.input, idempotency_key: input.idempotencyKey });
    assertService(execution.result.ok, execution.result.code || "APPROVAL_REQUIRED", execution.result.message, 422);
    const references: string[] = [];
    let payload: Input;
    if (input.type === "calendar.invite") {
      const event = before.tables.calendar_events[s(input.input.id)];
      references.push(`calendar_events:${event.id}`);
      payload = { workspaceId: actor.workspaceId, event: { summary: s(event.title), start: event.starts_at, end: event.ends_at, timezone: s(event.timezone, "Asia/Jakarta"), attendees: a<string>(input.input.recipients).length ? input.input.recipients : event.recipients } };
    } else if (input.type === "message.send") {
      const message = before.tables.messages[s(input.input.id)];
      const contact = before.tables.contacts[s(message.destination_contact_id)];
      assertService(!a(message.attachment_ids).length, "PORTAL_FILES_REQUIRED", "Send files through the secure client portal. Email dispatch supports the reviewed message text.", 422);
      references.push(`messages:${message.id}`, `contacts:${contact.id}`);
      payload = { workspaceId: actor.workspaceId, email: emailDraftSchema.parse({ to: contact.email, subject: s(message.subject, "Project update") || "Project update", text: message.content }) };
    } else {
      const invoice = before.tables.invoices[s(input.input.id)], contact = before.tables.contacts[s(input.input.destination_contact_id, s(input.input.contact_id))];
      references.push(`invoices:${invoice.id}`, `contacts:${contact.id}`);
      payload = { workspaceId: actor.workspaceId, email: emailDraftSchema.parse({ to: contact.email, subject: `Invoice ${s(invoice.number, invoice.id)}`, text: s(input.input.content, "Please review your invoice in your client portal.") }) };
    }
    const active = await client.query("select 1 from crewmori.external_dispatches where workspace_id=$1 and state in ('dispatching','unknown') and reference_ids && $2::text[]", [actor.workspaceId, references]);
    assertService(!active.rowCount, "DISPATCH_REVIEW_REQUIRED", "This content already has an unresolved external attempt.", 409);
    const id = randomUUID();
    await client.query("insert into crewmori.external_dispatches(id,workspace_id,owner_id,operation,command_key,fingerprint,input,payload,reference_ids,state) values($1,$2,$3,$4,$5,$6,$7,$8,$9,'dispatching')", [id, actor.workspaceId, actor.userId, input.type, input.idempotencyKey, hash, JSON.stringify(input.input), JSON.stringify(payload), references]);
    return { id, payload };
  });
  if (prepared.replay) return { result: { ...prepared.replay, replayed: true } };
  let delivered: { id: string };
  // Only the provider call is uncertain. Once it confirms, a database hiccup must not turn a sent message into "unknown".
  try { delivered = prepared.delivered || await transport(input.type, prepared.payload!, prepared.id!); }
  catch (error) {
    await database().query("update crewmori.external_dispatches set state='unknown',updated_at=now() where id=$1 and state='dispatching'", [prepared.id]);
    throw error;
  }
  if (!prepared.delivered) await saveProviderReference(prepared.id!, delivered.id);
  return transaction(async (client) => {
    await lockWorkspace(client, actor);
    const saved = (await client.query("select state,result from crewmori.external_dispatches where workspace_id=$1 and id=$2 for update", [actor.workspaceId, prepared.id])).rows[0];
    if (saved.state === "completed") return { result: { ...saved.result, replayed: true } as Result };
    const before = await loadDomain(client, actor.workspaceId);
    const connection = input.type === "calendar.invite" ? "calendar" : "gmail";
    before.tables.connections[connection] = { id: connection, version: 1, state: "connected", approved_capabilities: [connection === "gmail" ? "simulate_send" : "simulate_invite"] };
    const finalInput: Input = { ...input.input, idempotency_key: input.idempotencyKey };
    if (input.type === "invoice.send") delete finalInput.expected_version;
    const execution = execute(before, input.type, finalInput);
    assertService(execution.result.ok, "DISPATCH_FINALIZATION_REQUIRED", "The provider confirmed delivery, but recording it needs review.", 409);
    await persistDomain(client, before, execution.state, actor.workspaceId);
    const result = { ...execution.result, message: input.type === "calendar.invite" ? "Calendar invitation sent." : "Email sent.", ids: { dispatch_id: prepared.id! } };
    await client.query("update crewmori.external_dispatches set state='completed',provider_reference=$2,result=$3,updated_at=now() where id=$1", [prepared.id, delivered.id, JSON.stringify(result)]);
    await appendEvent(client, actor.workspaceId, "dispatch.completed", result.message, [{ table: "external_dispatches", id: prepared.id }]);
    return { result };
  });
}
async function saveProviderReference(id: string, reference: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await database().query("update crewmori.external_dispatches set provider_reference=$2,updated_at=now() where id=$1", [id, reference]);
      return;
    } catch {
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
  }
  // Keep the confirmed reference recoverable from logs; the attempt stays "dispatching" and is never resent automatically.
  process.stderr.write(`${JSON.stringify({ event: "dispatch.reference_unsaved", dispatchId: id, providerReference: reference })}\n`);
  throw new ServiceError("DISPATCH_FINALIZATION_REQUIRED", "The provider confirmed delivery, but recording it needs review.", 503);
}
export async function reviewUnknownDispatch(actor: OwnerActor, id: string) {
  return transaction(async (client) => {
    await lockWorkspace(client, actor);
    const updated = await client.query("update crewmori.external_dispatches set state='abandoned',updated_at=now() where workspace_id=$1 and id=$2 and provider_reference is null and (state='unknown' or (state='dispatching' and created_at<now()-interval '5 minutes')) returning id", [actor.workspaceId, id]);
    assertService(updated.rowCount, "INVALID_STATE", "This attempt is not eligible for manual review yet.", 409);
    await appendEvent(client, actor.workspaceId, "dispatch.reviewed", "The owner reviewed an uncertain provider attempt. No message was resent.", [{ table: "external_dispatches", id }]);
    return { reviewed: true };
  });
}
export async function finalizeConfirmedDispatch(actor: OwnerActor, id: string) {
  const saved = await transaction(async (client) => {
    await lockWorkspace(client, actor);
    const found = (await client.query("select operation,input,command_key,provider_reference from crewmori.external_dispatches where workspace_id=$1 and id=$2", [actor.workspaceId, id])).rows[0];
    assertService(found?.provider_reference, "INVALID_STATE", "Delivery has no confirmed provider reference.", 409);
    return found;
  });
  // A confirmed attempt follows the stored-reference branch; this transport must never run.
  return dispatchApproved(actor, { type: saved.operation, input: saved.input, idempotencyKey: saved.command_key }, async () => { throw new Error("Confirmed delivery cannot be sent again."); });
}

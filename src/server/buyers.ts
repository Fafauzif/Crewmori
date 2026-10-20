import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { z } from "zod";
import { execute } from "../lib/engine";
import { buyerOffer, buyerPortal, inquiryProjection, publicProfile } from "../lib/projections";
import { s, type Result } from "../lib/types";
import type { BuyerActor, OwnerActor } from "./contracts";
import { database, transaction } from "./db";
import { assertService } from "./errors";
import { loadDomain, persistDomain } from "./domain-state";
import { bindBuyer, checkActor, rateLimit } from "./domain";
import { appendEvent, lockWorkspace, previousCommand, saveCommand } from "./repository";
import { hashToken, randomToken } from "./security";

export async function publicWorkspace(handle: string) {
  const row = (await database().query("select workspace_id from crewmori.public_profiles where handle=$1", [handle])).rows[0];
  assertService(row, "NOT_FOUND", "This freelancer is unavailable.", 404);
  return row.workspace_id as string;
}
const PUBLIC_PROFILE_COLLECTIONS = ["owners", "profiles", "services", "portfolio_items", "publication_snapshots", "attachments"];
export async function getPublicProfile(handle: string) {
  const id = await publicWorkspace(handle);
  // Anonymous traffic reads only the published collections, without the owner's activity or a write lock.
  return transaction(async (client) => {
    const profile = publicProfile(await loadDomain(client, id, { collections: PUBLIC_PROFILE_COLLECTIONS, eventLimit: 0, activity: false }), handle);
    assertService(profile, "NOT_FOUND", "This freelancer is unavailable.", 404);
    return profile;
  }, database(), true);
}
async function sessionGrant(client: PoolClient, workspaceId: string, engagementId: string) {
  const token = randomToken(), id = randomUUID();
  await client.query("insert into crewmori.buyer_grants(id,workspace_id,engagement_id,token_hash,expires_at) values($1,$2,$3,$4,now()+interval '7 days')", [id, workspaceId, engagementId, hashToken(token)]);
  return { token, grantId: id, engagementId };
}
export async function createInvitation(actor: OwnerActor, engagementId: string) {
  return transaction(async (client) => {
    await lockWorkspace(client, actor);
    assertService((await client.query("select 1 from crewmori.records where workspace_id=$1 and collection='engagements' and id=$2", [actor.workspaceId, engagementId])).rowCount, "NOT_FOUND", "This engagement is unavailable.", 404);
    await client.query("update crewmori.buyer_grants set revoked_at=now() where workspace_id=$1 and engagement_id=$2 and revoked_at is null", [actor.workspaceId, engagementId]);
    await client.query("update crewmori.buyer_invitations set consumed_at=now() where workspace_id=$1 and engagement_id=$2 and consumed_at is null", [actor.workspaceId, engagementId]);
    const token = randomToken();
    await client.query("insert into crewmori.buyer_invitations(token_hash,workspace_id,engagement_id,expires_at) values($1,$2,$3,now()+interval '2 days')", [hashToken(token), actor.workspaceId, engagementId]);
    await appendEvent(client, actor.workspaceId, "buyer.invitation_replaced", "Buyer access replaced with a new single-use invitation. Previous links and sessions were revoked.", [{ table: "engagements", id: engagementId }]);
    return { token, engagementId };
  });
}
export async function exchangeInvitation(token: string) {
  return transaction(async (client) => {
    const row = (await client.query("select * from crewmori.buyer_invitations where token_hash=$1", [hashToken(token)])).rows[0];
    assertService(row, "INVALID_INVITATION", "This invitation is unavailable.", 401);
    await client.query("select id from crewmori.workspaces where id=$1 for update", [row.workspace_id]);
    const consumed = await client.query("update crewmori.buyer_invitations set consumed_at=now() where token_hash=$1 and consumed_at is null and expires_at>now() returning engagement_id", [hashToken(token)]);
    assertService(consumed.rowCount, "INVALID_INVITATION", "This invitation expired or was already opened. Request another link.", 401);
    return sessionGrant(client, row.workspace_id, row.engagement_id);
  });
}
const inquirySchema = z.object({
  handle: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(100), idempotencyKey: z.uuid(),
  values: z.object({ name: z.string().trim().min(1).max(120), email: z.email(), request: z.string().trim().min(5).max(10000), handle: z.string().optional(), service_id: z.string().max(160).optional(), organization: z.string().max(160).optional(), budget: z.object({ amount_minor: z.number().int().nonnegative(), currency: z.enum(["USD", "IDR"]), scale: z.union([z.literal(0), z.literal(2)]) }).nullable().optional(), desired_timing: z.string().max(500).nullable().optional(), consent: z.literal(true) }).strict(),
}).strict();
export async function submitInquiry(raw: unknown, anonymousId: string) {
  const input = inquirySchema.parse(raw), workspaceId = await publicWorkspace(input.handle);
  return transaction(async (client) => {
    await client.query("select id from crewmori.workspaces where id=$1 for update", [workspaceId]);
    const receiptActor: OwnerActor = { kind: "owner", workspaceId, userId: `inquiry:${hashToken(anonymousId)}` };
    const prior = await previousCommand(client, receiptActor, "inquiry.submit", input.idempotencyKey, input.values);
    let result: Result;
    if (prior) result = prior as Result;
    else {
      await rateLimit(client, `inquiry:${workspaceId}`, 100, 86400);
      await rateLimit(client, `inquiry:${workspaceId}:${hashToken(anonymousId)}`, 5, 3600);
      const before = await loadDomain(client, workspaceId);
      const profile = publicProfile(before, input.handle);
      assertService(profile && profile.public_availability !== "unavailable", "INQUIRIES_CLOSED", "This freelancer is not accepting inquiries.", 422);
      assertService(!input.values.service_id || profile.services.some((service) => service.id === input.values.service_id), "NOT_FOUND", "This service is unavailable.", 404);
      // Published profile handle is the authority even when the draft handle is being edited.
      Object.values(before.tables.owners)[0].handle = input.handle;
      const execution = execute(before, "inquiry.submit", { values: { ...input.values, handle: input.handle }, idempotency_key: input.idempotencyKey });
      assertService(execution.result.ok, "INVALID_INQUIRY", execution.result.message, 422);
      await persistDomain(client, before, execution.state, workspaceId);
      result = { ...execution.result, message: "Your inquiry has been saved." };
      await saveCommand(client, receiptActor, "inquiry.submit", input.idempotencyKey, input.values, result);
    }
    const session = await sessionGrant(client, workspaceId, s(result.id));
    return { ...session, result: { ...result, ids: { engagement_id: s(result.id), grant_id: session.grantId } } };
  });
}
export async function buyerState(actor: BuyerActor, versionId?: string) {
  return transaction(async (client) => {
    await checkActor(client, actor);
    const state = await loadDomain(client, actor.workspaceId);
    bindBuyer(state, actor);
    const offer = buyerOffer(state, actor.engagementId, actor.grantId, versionId);
    const portal = buyerPortal(state, actor.engagementId, actor.grantId);
    // Checkout URLs only come from the provider-backed payment request table.
    if (portal) {
      const requests = await client.query("select id,checkout_url,state,invoice_id from crewmori.payment_requests where workspace_id=$1", [actor.workspaceId]);
      for (const request of portal.requests) {
        const match = requests.rows.find((row) => row.invoice_id === request.invoice_id);
        if (match?.checkout_url) request.checkout_url = match.checkout_url;
      }
    }
    return { engagementId: actor.engagementId, grantId: actor.grantId, revision: state.revision, offer, latestOffer: buyerOffer(state, actor.engagementId, actor.grantId), portal, inquiry: inquiryProjection(state, actor.engagementId, actor.grantId) };
  }, database(), true);
}

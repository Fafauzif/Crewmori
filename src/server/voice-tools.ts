import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { requireConfiguration } from "./config";
import { transaction } from "./db";
import { assertService } from "./errors";
import { fingerprint, hashToken } from "./security";
import { appendEvent } from "./repository";

export function verifyVoiceToolSecret(supplied: string | null) {
  const { ELEVENLABS_TOOL_SECRET } = requireConfiguration(["ELEVENLABS_TOOL_SECRET"]);
  assertService(supplied && timingSafeEqual(Buffer.from(hashToken(supplied)), Buffer.from(hashToken(ELEVENLABS_TOOL_SECRET))), "INVALID_VOICE_AUTH", "Voice tool authentication failed.", 401);
}
const schemas = {
  capture_requirements: z.object({ scope: z.string().trim().min(1).max(8000), timing: z.string().max(1000).optional(), budgetMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(), currency: z.enum(["USD", "IDR"]).optional() }).strict(),
  get_public_offer_status: z.object({}).strict(),
  request_owner: z.object({ reason: z.string().trim().min(1).max(2000) }).strict(),
} as const;
export const voiceToolEnvelope = z.object({ sessionBinding: z.string().regex(/^[A-Za-z0-9_-]{43}$/), eventId: z.string().uuid(), input: z.record(z.string(), z.unknown()) }).strict();
export async function runVoiceTool(tool: string, envelope: z.infer<typeof voiceToolEnvelope>) {
  assertService(Object.hasOwn(schemas, tool), "TOOL_NOT_ALLOWED", "This voice tool is not allowed.", 403);
  const input = schemas[tool as keyof typeof schemas].parse(envelope.input);
  return transaction(async (client) => {
    const lookup = await client.query("select s.* from crewmori.voice_sessions s join crewmori.buyer_grants g on g.id=s.grant_id where s.binding_hash=$1 and s.expires_at>now() and g.revoked_at is null and g.expires_at>now()", [hashToken(envelope.sessionBinding)]);
    assertService(lookup.rowCount, "INVALID_VOICE_SESSION", "Voice session expired or was revoked.", 401);
    const session = lookup.rows[0];
    await client.query("select id from crewmori.workspaces where id=$1 for update", [session.workspace_id]);
    const currentGrant = await client.query("select id from crewmori.buyer_grants where id=$1 and revoked_at is null and expires_at>now()", [session.grant_id]);
    assertService(currentGrant.rowCount, "INVALID_VOICE_SESSION", "Voice access was revoked.", 401);
    const operation = `voice.${tool}`, actorId = `voice:${session.id}`;
    const prior = await client.query("select fingerprint,result from crewmori.command_receipts where workspace_id=$1 and actor_id=$2 and operation=$3 and key=$4", [session.workspace_id, actorId, operation, envelope.eventId]);
    if (prior.rowCount) {
      assertService(prior.rows[0].fingerprint === fingerprint(input), "IDEMPOTENCY_CONFLICT", "Tool event has different input.", 409);
      return prior.rows[0].result;
    }
    let result: Record<string, unknown>;
    if (tool === "get_public_offer_status") {
      const engagement = await client.query("select data from crewmori.records where workspace_id=$1 and collection='engagements' and id=$2", [session.workspace_id, session.engagement_id]);
      const offerId = engagement.rows[0]?.data.offer_id;
      const offer = offerId ? await client.query("select data from crewmori.records where workspace_id=$1 and collection='offers' and id=$2", [session.workspace_id, offerId]) : null;
      const status = offer?.rows[0]?.data.status;
      result = { status: ["shared", "accepted", "withdrawn", "expired"].includes(status) ? status : "not_shared", message: "Review and accept commercial terms explicitly on the buyer page." };
    } else {
      const collection = tool === "capture_requirements" ? "buyer_briefs" : "owner_requests";
      await client.query("insert into crewmori.records(workspace_id,collection,id,version,data) values($1,$2,$3,1,$4) on conflict(workspace_id,collection,id) do update set version=crewmori.records.version+1,data=excluded.data", [session.workspace_id, collection, session.engagement_id, JSON.stringify({ ...input, engagement_id: session.engagement_id, audience: "buyer", source: "voice", captured_at: new Date().toISOString() })]);
      await appendEvent(client, session.workspace_id, operation, tool === "capture_requirements" ? "A buyer brief was saved from voice for owner review." : "A buyer requested the owner's attention.");
      result = { saved: true, requiresOwnerReview: true };
    }
    await client.query("insert into crewmori.command_receipts(workspace_id,actor_id,operation,key,fingerprint,result) values($1,$2,$3,$4,$5,$6)", [session.workspace_id, actorId, operation, envelope.eventId, fingerprint(input), JSON.stringify(result)]);
    return result;
  });
}

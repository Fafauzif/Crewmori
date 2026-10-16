import { z } from "zod";
import type { BuyerActor } from "./contracts";
import { createVoiceSession, voiceWebhookSchema } from "./providers/voice";
import { database, transaction } from "./db";
import { requireConfiguration } from "./config";
import { assertService } from "./errors";
import { fingerprint, hashToken, randomToken } from "./security";
import { appendEvent } from "./repository";

export async function startVoiceSession(actor: BuyerActor, consent: boolean) {
  assertService(consent === true, "CONSENT_REQUIRED", "Consent to AI representation and transcript retention before connecting.", 422);
  const binding = randomToken();
  const session = await transaction(async (client) => {
    await client.query("select id from crewmori.workspaces where id=$1 for update", [actor.workspaceId]);
    const grant = await client.query("select id from crewmori.buyer_grants where id=$1 and workspace_id=$2 and revoked_at is null and expires_at>now()", [actor.grantId, actor.workspaceId]);
    assertService(grant.rowCount, "UNAUTHENTICATED", "This buyer invitation is no longer active.", 401);
    const count = await client.query("select count(*)::int as count from crewmori.voice_sessions where workspace_id=$1 and created_at>now()-interval '24 hours'", [actor.workspaceId]);
    assertService(count.rows[0].count < 10, "VOICE_LIMIT", "The workspace daily voice-session limit was reached.", 429);
    return (await client.query("insert into crewmori.voice_sessions(workspace_id,grant_id,engagement_id,binding_hash,expires_at) values($1,$2,$3,$4,now()+interval '1 hour') returning id", [actor.workspaceId, actor.grantId, actor.engagementId, hashToken(binding)])).rows[0];
  });
  const provider = await createVoiceSession();
  return { id: session.id, signedUrl: provider.signed_url, dynamicVariables: { crewmori_session: binding }, transcriptRetention: true, rawAudioStoredByApplication: false };
}

export async function recordVoiceTranscript(event: z.infer<typeof voiceWebhookSchema>) {
  const { ELEVENLABS_AGENT_ID } = requireConfiguration(["ELEVENLABS_AGENT_ID"]);
  assertService(event.data.agent_id === ELEVENLABS_AGENT_ID, "INVALID_VOICE_AGENT", "Unknown voice agent.", 403);
  const token = event.data.conversation_initiation_client_data?.dynamic_variables.crewmori_session;
  assertService(typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token), "INVALID_VOICE_SESSION", "Voice session binding is missing.", 401);
  return transaction(async (client) => {
    const lookup = await client.query("select * from crewmori.voice_sessions where binding_hash=$1", [hashToken(token)]);
    assertService(lookup.rowCount, "INVALID_VOICE_SESSION", "Unknown voice session.", 401);
    const session = lookup.rows[0];
    await client.query("select id from crewmori.workspaces where id=$1 for update", [session.workspace_id]);
    const eventId = `transcript:${event.data.conversation_id}`;
    const hash = fingerprint(event.data.transcript);
    const inserted = await client.query("insert into crewmori.provider_inbox(provider,event_id,fingerprint,workspace_id,payload) values('elevenlabs',$1,$2,$3,$4) on conflict do nothing returning event_id", [eventId, hash, session.workspace_id, JSON.stringify({ conversationId: event.data.conversation_id, sessionId: session.id })]);
    if (!inserted.rowCount) {
      const prior = await client.query("select fingerprint,state from crewmori.provider_inbox where provider='elevenlabs' and event_id=$1", [eventId]);
      assertService(prior.rows[0].fingerprint === hash, "PROVIDER_EVENT_CONFLICT", "Transcript replay has different content.", 409);
      return { replayed: true, state: prior.rows[0].state };
    }
    const grant = await client.query("select id from crewmori.buyer_grants where id=$1 and revoked_at is null and expires_at>now()", [session.grant_id]);
    const eventTime = event.event_timestamp * 1000;
    if (!grant.rowCount || eventTime < new Date(session.created_at).getTime() - 5000 || eventTime > new Date(session.expires_at).getTime() + 300000 || (session.provider_conversation_id && session.provider_conversation_id !== event.data.conversation_id)) {
      await client.query("update crewmori.provider_inbox set state='quarantined' where provider='elevenlabs' and event_id=$1", [eventId]);
      return { state: "quarantined" };
    }
    await client.query("update crewmori.voice_sessions set provider_conversation_id=$2 where id=$1", [session.id, event.data.conversation_id]);
    const transcript = event.data.transcript.filter((segment) => segment.message !== null);
    await client.query("insert into crewmori.records(workspace_id,collection,id,version,data) values($1,'voice_transcripts',$2,1,$3)", [session.workspace_id, event.data.conversation_id, JSON.stringify({ engagement_id: session.engagement_id, segments: transcript, audience: "buyer", source: "elevenlabs", final: true })]);
    await client.query("update crewmori.provider_inbox set state='processed' where provider='elevenlabs' and event_id=$1", [eventId]);
    await appendEvent(client, session.workspace_id, "voice.transcript_saved", "A final buyer conversation transcript was saved.");
    return { replayed: false, state: "processed" };
  });
}

export async function getVoiceTranscript(actor: BuyerActor, conversationId: string) {
  const result = await database().query("select data from crewmori.records where workspace_id=$1 and collection='voice_transcripts' and id=$2 and data->>'engagement_id'=$3", [actor.workspaceId, conversationId, actor.engagementId]);
  assertService(result.rowCount, "NOT_FOUND", "Transcript unavailable for this conversation.", 404);
  return { segments: result.rows[0].data.segments, final: true };
}

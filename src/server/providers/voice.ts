import { z } from "zod";
import { requireConfiguration } from "../config";
import { verifyHmac } from "../security";
import { providerJson, type Fetch } from "./http";

export async function createVoiceSession(transport?: Fetch) {
  const { ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID } = requireConfiguration(["ELEVENLABS_API_KEY", "ELEVENLABS_AGENT_ID"]);
  const url = new URL("https://api.elevenlabs.io/v1/convai/conversation/get-signed-url");
  url.searchParams.set("agent_id", ELEVENLABS_AGENT_ID);
  return providerJson("ElevenLabs", url.toString(), { headers: { "xi-api-key": ELEVENLABS_API_KEY } }, z.object({ signed_url: z.url().refine((url) => new URL(url).protocol === "wss:") }), { fetch: transport });
}
export const voiceWebhookSchema = z.object({
  type: z.literal("post_call_transcription"),
  event_timestamp: z.number().int(),
  data: z.object({
    agent_id: z.string(), conversation_id: z.string(),
    transcript: z.array(z.object({ role: z.enum(["user", "agent"]), message: z.string().nullable(), time_in_call_secs: z.number() })).max(2000),
    conversation_initiation_client_data: z.object({ dynamic_variables: z.record(z.string(), z.unknown()) }).optional(),
  }),
});
export function verifyVoiceWebhook(raw: string, signature: string | null, now?: number) {
  const { ELEVENLABS_WEBHOOK_SECRET } = requireConfiguration(["ELEVENLABS_WEBHOOK_SECRET"]);
  verifyHmac(raw, signature, ELEVENLABS_WEBHOOK_SECRET, now);
  return voiceWebhookSchema.parse(JSON.parse(raw));
}

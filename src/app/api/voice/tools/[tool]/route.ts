import { api, json, jsonBody } from "@/server/http";
import { verifyVoiceToolSecret, voiceToolEnvelope, runVoiceTool } from "@/server/voice-tools";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ tool: string }> }) {
  return api(request, async () => {
    verifyVoiceToolSecret(request.headers.get("x-crewmori-voice-secret"));
    return json(await runVoiceTool((await context.params).tool, await jsonBody(request, voiceToolEnvelope)));
  }, { webhook: true });
}

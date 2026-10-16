import { json } from "@/server/http";
import { runtimeConfig } from "@/server/config";
export const runtime = "nodejs";
export async function GET() {
  return json({ service: "crewmori", backend: runtimeConfig().enabled ? "enabled" : "disabled" });
}

import { json } from "@/server/http";
import { runtimeConfig } from "@/server/config";
import { readiness } from "@/server/health";
export const runtime = "nodejs";
// Plain GET is liveness and never touches dependencies; ?check=ready also verifies the database and worker queue.
export async function GET(request: Request) {
  const backend = runtimeConfig().enabled ? "enabled" : "disabled";
  if (new URL(request.url).searchParams.get("check") !== "ready" || backend === "disabled") return json({ service: "crewmori", backend });
  const ready = await readiness();
  return json({ service: "crewmori", backend, ...ready }, ready.ok ? 200 : 503);
}

import { api, json } from "@/server/http";
import { buyerActor } from "@/server/auth";
import { buyerState } from "@/server/buyers";
import { assertService } from "@/server/errors";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return api(request, async () => {
    const actor = await buyerActor(request), url = new URL(request.url);
    assertService(actor.engagementId === url.searchParams.get("engagement"), "NOT_FOUND", "This engagement is unavailable for this session.", 404);
    return json(await buyerState(actor, url.searchParams.get("version") || undefined));
  });
}

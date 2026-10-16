import { z } from "zod";
import { api, json } from "@/server/http";
import { buyerActor, ownerActor } from "@/server/auth";
import { transaction } from "@/server/db";
import { lockActor } from "@/server/domain";
import { assertService, ServiceError } from "@/server/errors";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return api(request, async () => {
    const id = z.uuid().parse(new URL(request.url).searchParams.get("request"));
    let actor;
    try { actor = await buyerActor(request); } catch (error) { if (!(error instanceof ServiceError && error.status === 401)) throw error; actor = await ownerActor(request); }
    const row = await transaction(async (client) => { await lockActor(client, actor); return (await client.query("select state,engagement_id from crewmori.payment_requests where workspace_id=$1 and id=$2", [actor.workspaceId, id])).rows[0]; });
    assertService(row && (actor.kind === "owner" || row.engagement_id === actor.engagementId), "NOT_FOUND", "This payment request is unavailable.", 404);
    return json({ state: row.state, engagementId: row.engagement_id });
  });
}

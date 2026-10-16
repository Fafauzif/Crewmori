import { z } from "zod";
import { api, json, jsonBody } from "@/server/http";
import { ownerActor } from "@/server/auth";
import { transaction } from "@/server/db";
import { randomToken, hashToken } from "@/server/security";
import { assertService } from "@/server/errors";
import { appendEvent, lockWorkspace } from "@/server/repository";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return api(request, async () => {
    const actor = await ownerActor(request);
    const input = await jsonBody(request, z.object({ engagementId: z.string().min(1).max(160), expiresInHours: z.number().int().min(1).max(720).default(168) }).strict());
    const token = randomToken();
    const grant = await transaction(async (client) => {
      await lockWorkspace(client, actor);
      const engagement = await client.query("select id from crewmori.records where workspace_id=$1 and collection='engagements' and id=$2", [actor.workspaceId, input.engagementId]);
      assertService(engagement.rowCount, "ENGAGEMENT_NOT_FOUND", "This engagement is unavailable.", 404);
      await client.query("update crewmori.buyer_grants set revoked_at=now() where workspace_id=$1 and engagement_id=$2 and revoked_at is null", [actor.workspaceId, input.engagementId]);
      const result = await client.query("insert into crewmori.buyer_grants(workspace_id,engagement_id,token_hash,expires_at) values($1,$2,$3,now()+make_interval(hours=>$4)) returning id,expires_at", [actor.workspaceId, input.engagementId, hashToken(token), input.expiresInHours]);
      await appendEvent(client, actor.workspaceId, "buyer.invitation_created", "A scoped buyer invitation was created.");
      return result.rows[0];
    });
    return json({ id: grant.id, token, expiresAt: grant.expires_at }, 201);
  });
}

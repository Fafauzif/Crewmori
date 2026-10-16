import { z } from "zod";
import { api, json } from "@/server/http";
import { ownerActor } from "@/server/auth";
import { database } from "@/server/db";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return api(request, async () => {
    const actor = await ownerActor(request);
    const after = z.coerce.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).parse(new URL(request.url).searchParams.get("after") || 0);
    const rows = (await database().query("select sequence,id,kind,summary,record_refs,created_at from crewmori.events where workspace_id=$1 and sequence>$2 order by sequence limit 101", [actor.workspaceId, after])).rows;
    const events = rows.slice(0, 100);
    return json({ events, nextSequence: events.length ? Number(events.at(-1).sequence) : after, hasMore: rows.length > 100 });
  });
}

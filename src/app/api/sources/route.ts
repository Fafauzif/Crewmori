import { z } from "zod";
import { randomUUID } from "node:crypto";
import { api, json, jsonBody } from "@/server/http";
import { ownerActor } from "@/server/auth";
import { transaction } from "@/server/db";
import { appendEvent, lockWorkspace, previousCommand, saveCommand } from "@/server/repository";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return api(request, async () => {
    const actor = await ownerActor(request);
    const input = await jsonBody(request, z.object({ title: z.string().trim().min(1).max(200), text: z.string().trim().min(1).max(16000), idempotencyKey: z.string().uuid() }).strict());
    const result = await transaction(async (client) => {
      await lockWorkspace(client, actor);
      const prior = await previousCommand(client, actor, "source.create", input.idempotencyKey, input);
      if (prior) return { ...prior, replayed: true };
      const id = randomUUID();
      await client.query("insert into crewmori.records(workspace_id,collection,id,version,data) values($1,'sources',$2,1,$3)", [actor.workspaceId, id, JSON.stringify({ title: input.title, text: input.text, audience: "owner", origin: "manual_import" })]);
      const result = { table: "sources", id, version: 1 };
      await appendEvent(client, actor.workspaceId, "source.saved", "An owner source was saved.", [result]);
      await saveCommand(client, actor, "source.create", input.idempotencyKey, input, result);
      return result;
    });
    return json(result, 201);
  });
}

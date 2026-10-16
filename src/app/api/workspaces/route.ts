import { z } from "zod";
import { api, json, jsonBody } from "@/server/http";
import { authenticatedUser } from "@/server/auth";
import { database, transaction } from "@/server/db";

export const runtime = "nodejs";
export async function GET(request: Request) {
  return api(request, async () => {
    const user = await authenticatedUser();
    return json({ workspaces: (await database().query("select id,name,timezone,revision,created_at from crewmori.workspaces where owner_id=$1", [user.id])).rows });
  });
}
export async function POST(request: Request) {
  return api(request, async () => {
    const user = await authenticatedUser();
    const input = await jsonBody(request, z.object({ name: z.string().trim().min(1).max(120) }).strict());
    const workspace = await transaction(async (client) => {
      await client.query("insert into crewmori.workspaces(owner_id,name) values($1,$2) on conflict(owner_id) do nothing", [user.id, input.name]);
      return (await client.query("select id,name,timezone,revision from crewmori.workspaces where owner_id=$1", [user.id])).rows[0];
    });
    return json({ workspace }, 201);
  });
}

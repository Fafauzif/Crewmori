import { z } from "zod";
import { api, json, jsonBody } from "@/server/http";
import { authenticatedUser } from "@/server/auth";
import { database } from "@/server/db";
import { ensureOwnerWorkspace } from "@/server/workspaces";

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
    const { id, name, revision } = await ensureOwnerWorkspace(user.id, user.email, input.name);
    return json({ workspace: { id, name, revision } }, 201);
  });
}

import { z } from "zod";
import { api, json, jsonBody } from "@/server/http";
import { ownerActor } from "@/server/auth";
import { getTask, controlTask, controlInputSchema } from "@/server/tasks";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  return api(request, async () => json(await getTask(await ownerActor(request), z.string().uuid().parse((await context.params).id))));
}
export async function POST(request: Request, context: Context) {
  return api(request, async () => json(await controlTask(await ownerActor(request), z.string().uuid().parse((await context.params).id), await jsonBody(request, controlInputSchema))));
}

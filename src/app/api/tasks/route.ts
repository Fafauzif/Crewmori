import { api, json, jsonBody } from "@/server/http";
import { ownerActor } from "@/server/auth";
import { taskInputSchema } from "@/server/contracts";
import { startTask } from "@/server/tasks";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return api(request, async () => json(await startTask(await ownerActor(request), await jsonBody(request, taskInputSchema)), 202));
}

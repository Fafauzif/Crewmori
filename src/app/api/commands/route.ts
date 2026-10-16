import { api, json, jsonBody } from "@/server/http";
import { ownerActor } from "@/server/auth";
import { commandSchema, runDomainCommand } from "@/server/domain";
export const runtime = "nodejs";
export async function POST(request: Request) { return api(request, async () => json(await runDomainCommand(await ownerActor(request), await jsonBody(request, commandSchema)))); }

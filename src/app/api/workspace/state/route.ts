import { api, json } from "@/server/http";
import { ownerActor } from "@/server/auth";
import { ownerState } from "@/server/domain";
export const runtime = "nodejs";
export async function GET(request: Request) { return api(request, async () => json({ state: await ownerState(await ownerActor(request)) })); }

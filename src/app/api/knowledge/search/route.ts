import { z } from "zod";
import { api, json, jsonBody } from "@/server/http";
import { ownerActor } from "@/server/auth";
import { searchKnowledge } from "@/server/knowledge";
export const runtime = "nodejs";
export async function POST(request: Request) { return api(request, async () => { const input = await jsonBody(request, z.object({ query: z.string().min(2).max(2000), semantic: z.boolean().default(true) }).strict()); return json({ results: await searchKnowledge(await ownerActor(request), input.query, input.semantic) }); }); }

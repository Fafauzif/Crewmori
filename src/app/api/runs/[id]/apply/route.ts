import { z } from "zod";
import { api, json, jsonBody } from "@/server/http";
import { ownerActor } from "@/server/auth";
import { applyArtifact, applyArtifactSchema } from "@/server/artifacts";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { return api(request, async () => json(await applyArtifact(await ownerActor(request), z.string().uuid().parse((await context.params).id), await jsonBody(request, applyArtifactSchema)))); }

import { z } from "zod";
import { api, json, jsonBody } from "@/server/http";
import { ownerActor } from "@/server/auth";
import { dispatchApproved, dispatchSchema, reviewUnknownDispatch, finalizeConfirmedDispatch } from "@/server/dispatch";
export const runtime = "nodejs";
export async function POST(request: Request) { return api(request, async () => json(await dispatchApproved(await ownerActor(request), await jsonBody(request, dispatchSchema)))); }
export async function PATCH(request: Request) { return api(request, async () => { const input = await jsonBody(request, z.object({ id: z.uuid(), action: z.enum(["review", "finalize"]).default("review"), checkedProvider: z.literal(true) }).strict()); const actor = await ownerActor(request); return json(input.action === "finalize" ? await finalizeConfirmedDispatch(actor, input.id) : await reviewUnknownDispatch(actor, input.id)); }); }

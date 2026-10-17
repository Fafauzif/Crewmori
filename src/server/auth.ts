import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireConfiguration, runtimeConfig } from "./config";
import { database } from "./db";
import { assertService } from "./errors";
import type { OwnerActor, BuyerActor } from "./contracts";
import { hashToken } from "./security";

export async function sessionClient() {
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = requireConfiguration(["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"]);
  const jar = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { cookies: {
    getAll: () => jar.getAll(),
    setAll: (values) => values.forEach(({ name, value, options }) => jar.set(name, value, { ...options, httpOnly: true, sameSite: "lax", secure: runtimeConfig().APP_URL.startsWith("https:") })),
  } });
}
// Asymmetric session tokens verify against the cached project JWKS without an Auth round trip.
// Symmetric or unknown keys fall back to the Auth server inside getClaims.
export async function authenticatedUser(): Promise<{ id: string; email?: string }> {
  const client = await sessionClient();
  const { data, error } = await client.auth.getClaims();
  const claims = data?.claims;
  assertService(!error && claims?.sub && claims.role === "authenticated", "UNAUTHENTICATED", "Sign in to continue.", 401);
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : undefined };
}
export async function ownerActor(request: Request): Promise<OwnerActor> {
  const user = await authenticatedUser();
  const requested = request.headers.get("x-workspace-id");
  if (requested) z.string().uuid().parse(requested);
  const result = await database().query("select id from crewmori.workspaces where owner_id=$1 and ($2::uuid is null or id=$2) order by created_at limit 1", [user.id, requested]);
  assertService(result.rowCount, "WORKSPACE_NOT_FOUND", "This workspace is unavailable.", 404);
  return { kind: "owner", workspaceId: result.rows[0].id, userId: user.id };
}
export async function buyerActor(request: Request): Promise<BuyerActor> {
  const bearer = request.headers.get("authorization");
  const cookie = (await cookies()).get("crewmori_buyer")?.value;
  const authorization = bearer || (cookie ? `Bearer ${cookie}` : "");
  assertService(/^Bearer [A-Za-z0-9_-]{43}$/.test(authorization), "UNAUTHENTICATED", "A current buyer invitation is required.", 401);
  const token = authorization.slice(7);
  const result = await database().query("select id, workspace_id, engagement_id from crewmori.buyer_grants where token_hash=$1 and revoked_at is null and expires_at > now()", [hashToken(token)]);
  assertService(result.rowCount === 1, "UNAUTHENTICATED", "This invitation has expired or was revoked.", 401);
  return { kind: "buyer", workspaceId: result.rows[0].workspace_id, engagementId: result.rows[0].engagement_id, grantId: result.rows[0].id };
}

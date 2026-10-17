import { z } from "zod";
import { api, json, jsonBody } from "@/server/http";
import { sessionClient, authenticatedUser } from "@/server/auth";
import { requireConfiguration, runtimeConfig } from "@/server/config";
import { createGoogleProviderCheck } from "@/server/auth-provider";
import { ensureOwnerWorkspace } from "@/server/workspaces";
import { safeReturnPath } from "@/server/auth-redirect";
import { signInPath } from "@/lib/auth-experience";
import { assertService, ServiceError } from "@/server/errors";

export const runtime = "nodejs";
type Context = { params: Promise<{ action: string }> };
const redirect = (path: string) => new Response(null, { status: 303, headers: { location: new URL(path, runtimeConfig().APP_URL).toString(), "cache-control": "no-store" } });
// Supabase can show raw JSON for a disabled provider; keep that recovery inside Crewmori.
const googleEnabled = createGoogleProviderCheck(() => requireConfiguration(["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"]));
// Accounts are created and resumed only through Google; the PKCE verifier stays in an HTTP-only cookie.
async function startGoogle(request: Request) {
  const returnTo = safeReturnPath(new URL(request.url).searchParams.get("returnTo"));
  if (!(await googleEnabled())) return redirect(signInPath("unavailable", returnTo));
  const callback = new URL("/api/auth/callback", runtimeConfig().APP_URL);
  callback.searchParams.set("returnTo", returnTo);
  const { data, error } = await (await sessionClient()).auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback.toString(), skipBrowserRedirect: true, queryParams: { prompt: "select_account" } } });
  if (error || !data.url) return redirect(signInPath("unavailable", returnTo));
  return new Response(null, { status: 303, headers: { location: data.url, "cache-control": "no-store" } });
}
async function finishGoogle(request: Request) {
  const params = new URL(request.url).searchParams, code = params.get("code");
  if (!code) return redirect(signInPath(params.get("error") === "access_denied" ? "cancelled" : "failed", params.get("returnTo")));
  const { data, error } = await (await sessionClient()).auth.exchangeCodeForSession(code);
  if (error || !data.user) return redirect(signInPath("expired", params.get("returnTo")));
  return redirect(`/auth/verify?phase=workspace&returnTo=${encodeURIComponent(safeReturnPath(params.get("returnTo")))}`);
}
export async function GET(request: Request, context: Context) {
  const { action } = await context.params;
  const response = await api(request, async () => {
    if (action === "google") return startGoogle(request);
    if (action === "callback") return finishGoogle(request);
    assertService(action === "user", "NOT_FOUND", "Unknown authentication action.", 404);
    const user = await authenticatedUser();
    return json({ user: { id: user.id, email: user.email } });
  });
  // OAuth is a browser navigation: failures must return to readable recovery, not a JSON document.
  if (["google", "callback"].includes(action) && !response.ok && response.status !== 303) return redirect(signInPath("unavailable", new URL(request.url).searchParams.get("returnTo")));
  return response;
}
export async function POST(request: Request, context: Context) {
  return api(request, async () => {
    const { action } = await context.params;
    if (action === "complete") {
      const input = await jsonBody(request, z.object({ returnTo: z.string().max(2000).optional() }).strict());
      const user = await authenticatedUser();
      const workspace = await ensureOwnerWorkspace(user.id, user.email);
      return json({ destination: workspace.onboarded ? safeReturnPath(input.returnTo) : "/onboarding" });
    }
    const client = await sessionClient();
    if (action === "sign-out") {
      const { error } = await client.auth.signOut();
      assertService(!error, "SIGN_OUT_FAILED", "Sign-out could not finish. Retry.", 502);
      return json({ authenticated: false });
    }
    assertService(["sign-in", "sign-up", "recover", "reset"].includes(action), "NOT_FOUND", "Unknown authentication action.", 404);
    throw new ServiceError("GOOGLE_SIGN_IN_REQUIRED", "Crewmori accounts use Google sign-in.", 410);
  });
}

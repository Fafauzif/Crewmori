import { api, json } from "@/server/http";
import { sessionClient, authenticatedUser } from "@/server/auth";
import { requireConfiguration, runtimeConfig } from "@/server/config";
import { ensureOwnerWorkspace } from "@/server/workspaces";
import { safeReturnPath } from "@/server/auth-redirect";
import { assertService, ServiceError } from "@/server/errors";

export const runtime = "nodejs";
type Context = { params: Promise<{ action: string }> };
const redirect = (path: string) => new Response(null, { status: 303, headers: { location: new URL(path, runtimeConfig().APP_URL).toString(), "cache-control": "no-store" } });
// Supabase answers a disabled provider with a raw JSON page, so check before leaving the app.
let providerCheck: { enabled: boolean; at: number } | undefined;
async function googleEnabled() {
  if (providerCheck && Date.now() - providerCheck.at < 60_000) return providerCheck.enabled;
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = requireConfiguration(["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"]);
  try {
    const response = await fetch(new URL("/auth/v1/settings", SUPABASE_URL), { headers: { apikey: SUPABASE_PUBLISHABLE_KEY }, signal: AbortSignal.timeout(5000) });
    const settings = (await response.json()) as { external?: { google?: boolean } };
    providerCheck = { enabled: settings.external?.google === true, at: Date.now() };
    return providerCheck.enabled;
  } catch { return true; }
}
// Accounts are created and resumed only through Google; the PKCE verifier stays in an HTTP-only cookie.
async function startGoogle(request: Request) {
  if (!(await googleEnabled())) return redirect("/auth/sign-in?error=unavailable");
  const returnTo = safeReturnPath(new URL(request.url).searchParams.get("returnTo"));
  const callback = new URL("/api/auth/callback", runtimeConfig().APP_URL);
  callback.searchParams.set("returnTo", returnTo);
  const { data, error } = await (await sessionClient()).auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback.toString(), skipBrowserRedirect: true, queryParams: { prompt: "select_account" } } });
  if (error || !data.url) return redirect("/auth/sign-in?error=unavailable");
  return new Response(null, { status: 303, headers: { location: data.url, "cache-control": "no-store" } });
}
async function finishGoogle(request: Request) {
  const params = new URL(request.url).searchParams, code = params.get("code");
  if (!code) return redirect(`/auth/sign-in?error=${params.get("error") === "access_denied" ? "cancelled" : "failed"}`);
  const { data, error } = await (await sessionClient()).auth.exchangeCodeForSession(code);
  if (error || !data.user) return redirect("/auth/sign-in?error=expired");
  const workspace = await ensureOwnerWorkspace(data.user.id, data.user.email);
  return redirect(workspace.onboarded ? safeReturnPath(params.get("returnTo")) : "/onboarding");
}
export async function GET(request: Request, context: Context) {
  return api(request, async () => {
    const { action } = await context.params;
    if (action === "google") return startGoogle(request);
    if (action === "callback") return finishGoogle(request);
    assertService(action === "user", "NOT_FOUND", "Unknown authentication action.", 404);
    const user = await authenticatedUser();
    return json({ user: { id: user.id, email: user.email } });
  });
}
export async function POST(request: Request, context: Context) {
  return api(request, async () => {
    const { action } = await context.params;
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

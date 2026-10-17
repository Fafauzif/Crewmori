import { api, json } from "@/server/http";
import { sessionClient, authenticatedUser } from "@/server/auth";
import { runtimeConfig } from "@/server/config";
import { ensureOwnerWorkspace } from "@/server/workspaces";
import { safeReturnPath } from "@/server/auth-redirect";
import { assertService, ServiceError } from "@/server/errors";

export const runtime = "nodejs";
type Context = { params: Promise<{ action: string }> };
const redirect = (path: string) => new Response(null, { status: 303, headers: { location: new URL(path, runtimeConfig().APP_URL).toString(), "cache-control": "no-store" } });
// Accounts are created and resumed only through Google; the PKCE verifier stays in an HTTP-only cookie.
async function startGoogle(request: Request) {
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

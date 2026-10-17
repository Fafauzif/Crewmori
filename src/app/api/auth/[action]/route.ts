import { z } from "zod";
import { api, json, jsonBody } from "@/server/http";
import { sessionClient, authenticatedUser } from "@/server/auth";
import { runtimeConfig } from "@/server/config";
import { assertService, ServiceError } from "@/server/errors";

export const runtime = "nodejs";
type Context = { params: Promise<{ action: string }> };
// Supabase error codes become specific guidance without echoing provider text.
const authFailures: Record<string, [string, number]> = {
  over_email_send_rate_limit: ["Too many account emails were sent recently. Try again in about an hour.", 429],
  over_request_rate_limit: ["Too many attempts. Wait a few minutes and try again.", 429],
  user_already_exists: ["An account with this email already exists. Sign in or reset your password.", 409],
  email_exists: ["An account with this email already exists. Sign in or reset your password.", 409],
  weak_password: ["Choose a stronger password that is not commonly used.", 422],
  email_address_invalid: ["Enter a valid email address you can receive mail at.", 422],
  email_address_not_authorized: ["Account emails cannot be sent to this address yet. Contact the workspace administrator.", 403],
  signup_disabled: ["New accounts are not available right now.", 403],
  invalid_credentials: ["The email or password is incorrect.", 401],
  email_not_confirmed: ["Confirm your email first. Check your inbox for the confirmation link.", 401],
};
function authFailure(error: { code?: string; status?: number } | null) {
  const [message, status] = authFailures[error?.code || ""] || ["Authentication could not be completed. Check your details and account confirmation.", 401];
  return new ServiceError(error?.code === undefined ? "AUTH_FAILED" : error.code.toUpperCase(), message, status);
}
export async function GET(request: Request, context: Context) {
  return api(request, async () => {
    const { action } = await context.params;
    if (action === "callback") {
      const code = new URL(request.url).searchParams.get("code");
      assertService(code, "INVALID_CALLBACK", "The sign-in code is missing.", 422);
      const { error } = await (await sessionClient()).auth.exchangeCodeForSession(code);
      assertService(!error, "INVALID_CALLBACK", "This sign-in code expired or was already used.", 401);
      const next = new URL(request.url).searchParams.get("next") === "reset" ? "/auth/reset" : "/onboarding";
      return Response.redirect(new URL(next, runtimeConfig().APP_URL), 303);
    }
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
    if (action === "recover") {
      const input = await jsonBody(request, z.object({ email: z.email() }).strict());
      const { error } = await client.auth.resetPasswordForEmail(input.email, { redirectTo: `${runtimeConfig().APP_URL}/api/auth/callback?next=reset` });
      // Only rate limits are surfaced; other outcomes stay identical so account existence is not revealed.
      if (error && ["over_email_send_rate_limit", "over_request_rate_limit"].includes(error.code || "")) throw authFailure(error);
      return json({ message: "If this account exists, recovery instructions will be sent." });
    }
    if (action === "reset") {
      await authenticatedUser();
      const input = await jsonBody(request, z.object({ password: z.string().min(12).max(128) }).strict());
      const { error } = await client.auth.updateUser({ password: input.password });
      assertService(!error, "PASSWORD_RESET_FAILED", "Password could not be updated.", 422);
      return json({ updated: true });
    }
    assertService(action === "sign-in" || action === "sign-up", "NOT_FOUND", "Unknown authentication action.", 404);
    const input = await jsonBody(request, z.object({ email: z.email(), password: z.string().min(action === "sign-up" ? 12 : 1).max(128) }).strict());
    const { data, error } = action === "sign-in" ? await client.auth.signInWithPassword(input) : await client.auth.signUp({ ...input, options: { emailRedirectTo: `${runtimeConfig().APP_URL}/api/auth/callback` } });
    if (error) throw authFailure(error);
    return json({ authenticated: !!data.session, confirmationRequired: !data.session });
  });
}

import { z } from "zod";
import { api, json, jsonBody } from "@/server/http";
import { sessionClient, authenticatedUser } from "@/server/auth";
import { runtimeConfig } from "@/server/config";
import { assertService } from "@/server/errors";

export const runtime = "nodejs";
type Context = { params: Promise<{ action: string }> };
export async function GET(request: Request, context: Context) {
  return api(request, async () => {
    const { action } = await context.params;
    if (action === "callback") {
      const code = new URL(request.url).searchParams.get("code");
      assertService(code, "INVALID_CALLBACK", "The sign-in code is missing.", 422);
      const { error } = await (await sessionClient()).auth.exchangeCodeForSession(code);
      assertService(!error, "INVALID_CALLBACK", "This sign-in code expired or was already used.", 401);
      return json({ authenticated: true, message: "Session established. Continue in the application." });
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
      await client.auth.resetPasswordForEmail(input.email, { redirectTo: `${runtimeConfig().APP_URL}/api/auth/callback` });
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
    assertService(!error, "AUTH_FAILED", "Authentication could not be completed. Check your details and account confirmation.", 401);
    return json({ authenticated: !!data.session, confirmationRequired: !data.session });
  });
}

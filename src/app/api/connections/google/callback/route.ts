import { z } from "zod";
import { api } from "@/server/http";
import { authenticatedUser } from "@/server/auth";
import { completeGoogleConnection } from "@/server/connections";
import { runtimeConfig } from "@/server/config";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const failure = () => Response.redirect(new URL(`/app/connections?connectionError=${params.get("error") === "access_denied" ? "cancelled" : "failed"}`, runtimeConfig().APP_URL), 303);
  if (params.has("error")) return failure();
  const response = await api(request, async () => {
    const user = await authenticatedUser();
    const input = z.object({ state: z.string().length(43), code: z.string().min(1).max(4096) }).parse({ state: params.get("state"), code: params.get("code") });
    await completeGoogleConnection(user.id, input.state, input.code);
    return Response.redirect(new URL("/app/connections?connected=google", runtimeConfig().APP_URL), 303);
  });
  return response.status === 303 ? response : failure();
}

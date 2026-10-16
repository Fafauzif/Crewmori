import { z } from "zod";
import { api, json } from "@/server/http";
import { authenticatedUser } from "@/server/auth";
import { completeGoogleConnection } from "@/server/connections";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return api(request, async () => {
    const user = await authenticatedUser();
    const params = new URL(request.url).searchParams;
    const input = z.object({ state: z.string().length(43), code: z.string().min(1).max(4096) }).parse({ state: params.get("state"), code: params.get("code") });
    await completeGoogleConnection(user.id, input.state, input.code);
    return json({ connected: true, message: "Google consent saved. You can return to the application." });
  });
}

import { api, json } from "@/server/http";
import { ownerActor } from "@/server/auth";
import { integrationStatus, runtimeConfig } from "@/server/config";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return api(request, async () => {
    await ownerActor(request);
    return json({ enabled: true, paymentMode: runtimeConfig().PAYMENT_PROVIDER, integrations: integrationStatus(), verification: "Configuration presence does not prove provider connectivity." });
  });
}

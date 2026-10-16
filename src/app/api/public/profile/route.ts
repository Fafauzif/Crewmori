import { cookies } from "next/headers";
import { api, json } from "@/server/http";
import { getPublicProfile } from "@/server/buyers";
import { randomToken } from "@/server/security";
import { runtimeConfig } from "@/server/config";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return api(request, async () => {
    const jar = await cookies();
    if (!jar.get("crewmori_inquiry")) jar.set("crewmori_inquiry", randomToken(), { httpOnly: true, sameSite: "lax", secure: runtimeConfig().APP_URL.startsWith("https:"), path: "/api/public", maxAge: 86400 });
    return json({ profile: await getPublicProfile(new URL(request.url).searchParams.get("handle") || "") });
  });
}

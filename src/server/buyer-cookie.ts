import { cookies } from "next/headers";
import { runtimeConfig } from "./config";
export async function setBuyerCookie(token: string) {
  (await cookies()).set("crewmori_buyer", token, { httpOnly: true, secure: runtimeConfig().APP_URL.startsWith("https:"), sameSite: "lax", path: "/", maxAge: 7 * 86400 });
}

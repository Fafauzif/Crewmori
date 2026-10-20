import { cookies } from "next/headers";
import { z } from "zod";
import { api, json, jsonBody } from "@/server/http";
import { submitInquiry } from "@/server/buyers";
import { setBuyerCookie } from "@/server/buyer-cookie";
import { assertService } from "@/server/errors";
import { clientAddress } from "@/server/security";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return api(request, async () => {
    const anonymous = (await cookies()).get("crewmori_inquiry")?.value;
    assertService(anonymous, "SESSION_REQUIRED", "Open the public profile before submitting an inquiry.", 401);
    const response = await submitInquiry(await jsonBody(request, z.unknown()), anonymous, clientAddress(request));
    await setBuyerCookie(response.token);
    return json({ result: response.result });
  });
}

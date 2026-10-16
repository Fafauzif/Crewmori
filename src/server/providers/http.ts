import { z } from "zod";
import { ServiceError } from "../errors";

export type Fetch = typeof fetch;
export async function providerJson<T>(provider: string, url: string, init: RequestInit, schema: z.ZodType<T>, options: { fetch?: Fetch; mutation?: boolean; timeoutMs?: number } = {}): Promise<T> {
  let response: Response;
  try {
    response = await (options.fetch ?? fetch)(url, { ...init, redirect: "error", signal: AbortSignal.timeout(options.timeoutMs ?? 20000) });
  } catch {
    throw new ServiceError(options.mutation ? "UNKNOWN_EXTERNAL_OUTCOME" : "PROVIDER_UNAVAILABLE", `${provider} did not return a confirmed result.`, 502);
  }
  if (!response.ok) {
    const code = [401, 403].includes(response.status) ? "CONNECTION_REVOKED" : options.mutation && response.status >= 500 ? "UNKNOWN_EXTERNAL_OUTCOME" : "PROVIDER_REJECTED";
    await response.body?.cancel();
    throw new ServiceError(code, `${provider} rejected the request (${response.status}).`, 502);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new ServiceError("INVALID_PROVIDER_RESPONSE", `${provider} returned an empty response.`, 502);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2_000_000) { await reader.cancel(); throw Error("oversize"); }
      chunks.push(value);
    }
    return schema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  } catch {
    throw new ServiceError(options.mutation ? "UNKNOWN_EXTERNAL_OUTCOME" : "INVALID_PROVIDER_RESPONSE", `${provider} returned an invalid response.`, 502);
  }
}

export async function providerBytes(provider: string, url: string, init: RequestInit, transport: Fetch = fetch, limit = 10_485_760): Promise<Uint8Array> {
  let response: Response;
  try { response = await transport(url, { ...init, redirect: "error", signal: AbortSignal.timeout(30000) }); }
  catch { throw new ServiceError("PROVIDER_UNAVAILABLE", `${provider} download was interrupted.`, 502); }
  if (!response.ok) { await response.body?.cancel(); throw new ServiceError("PROVIDER_REJECTED", `${provider} file is unavailable.`, 502); }
  const reader = response.body?.getReader();
  if (!reader) throw new ServiceError("FILE_UNAVAILABLE", "The file is empty.", 422);
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > limit) { await reader.cancel(); throw new ServiceError("FILE_TOO_LARGE", "Choose a file of at most 10 MiB.", 422); } chunks.push(value); }
  } catch (error) { if (error instanceof ServiceError) throw error; throw new ServiceError("PROVIDER_UNAVAILABLE", "File download was interrupted.", 502); }
  return Buffer.concat(chunks);
}

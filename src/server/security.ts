import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { assertService } from "./errors";
import { ConfigurationError } from "./config";

export const randomToken = () => randomBytes(32).toString("base64url");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
export const fingerprint = (value: unknown) => hashToken(stableJson(value));
// The hosting proxy (Vercel or a configured reverse proxy) sets these headers; null means no trustworthy address.
export function clientAddress(request: Request): string | null {
  const address = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0];
  return address?.trim() || null;
}

function encryptionKey(key: string) {
  const bytes = Buffer.from(key, "base64");
  if (bytes.length !== 32) throw new ConfigurationError(["TOKEN_ENCRYPTION_KEY (32 random bytes, base64)"]);
  return bytes;
}

// AAD binds ciphertext to its workspace/connector. Copying a row cannot transfer credentials.
export function encryptSecret(value: string, key: string, binding: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(key), iv);
  cipher.setAAD(Buffer.from(binding));
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(envelope: string, key: string, binding: string): string {
  const [version, iv, tag, ciphertext, extra] = envelope.split(".");
  assertService(version === "v1" && iv && tag && ciphertext && !extra, "INVALID_CREDENTIAL", "The saved connector credential is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(key), Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(binding));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

export function verifyHmac(raw: string, signature: string | null, secret: string, now = Date.now()): void {
  const parts = signature?.split(",") ?? [];
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith("v0=") || part.startsWith("v1=")).map((part) => part.slice(3));
  assertService(timestamp && /^\d+$/.test(timestamp) && Math.abs(now / 1000 - Number(timestamp)) <= 300, "INVALID_SIGNATURE", "Webhook timestamp is invalid.", 401);
  const expected = createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest();
  assertService(signatures.some((sig) => /^[a-f\d]{64}$/i.test(sig) && timingSafeEqual(Buffer.from(sig, "hex"), expected)), "INVALID_SIGNATURE", "Webhook signature is invalid.", 401);
}

export function assertSameOrigin(request: Request, appUrl: string): void {
  assertService(request.headers.get("origin") === new URL(appUrl).origin, "INVALID_ORIGIN", "This action requires the application origin.", 403);
}

import { z } from "zod";
import { requireConfiguration, runtimeConfig } from "../config";
import { assertService } from "../errors";
import { providerJson, type Fetch } from "./http";

export const googleScopes = {
  gmail: "https://www.googleapis.com/auth/gmail.compose",
  calendar_read: "https://www.googleapis.com/auth/calendar.freebusy",
  calendar_write: "https://www.googleapis.com/auth/calendar.events",
  drive: "https://www.googleapis.com/auth/drive.file",
} as const;
export type GoogleCapability = keyof typeof googleScopes;
export const googleTokenSchema = z.object({ access_token: z.string().min(1), refresh_token: z.string().optional(), expires_in: z.number().positive(), scope: z.string(), token_type: z.string() });
export type GoogleToken = z.infer<typeof googleTokenSchema>;

export function googleAuthorizationUrl(state: string, challenge: string, capabilities: GoogleCapability[]) {
  const { GOOGLE_CLIENT_ID } = requireConfiguration(["GOOGLE_CLIENT_ID"]);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, redirect_uri: `${runtimeConfig().APP_URL}/api/connections/google/callback`, response_type: "code", access_type: "offline", prompt: "consent", state, code_challenge: challenge, code_challenge_method: "S256", scope: [...new Set(capabilities.map((capability) => googleScopes[capability]))].join(" ") }).toString();
  return url.toString();
}
export async function exchangeGoogleCode(code: string, verifier: string, transport?: Fetch) {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = requireConfiguration(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]);
  return providerJson("Google OAuth", "https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, code, code_verifier: verifier, redirect_uri: `${runtimeConfig().APP_URL}/api/connections/google/callback`, grant_type: "authorization_code" }) }, googleTokenSchema, { fetch: transport, mutation: true });
}
export async function refreshGoogleToken(refreshToken: string, transport?: Fetch) {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = requireConfiguration(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]);
  return providerJson("Google OAuth", "https://oauth2.googleapis.com/token", { method: "POST", body: new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, refresh_token: refreshToken, grant_type: "refresh_token" }) }, googleTokenSchema, { fetch: transport });
}

export const emailDraftSchema = z.object({ to: z.email().max(254), subject: z.string().min(1).max(200).refine((s) => !/[\r\n]/.test(s)), text: z.string().min(1).max(50000) }).strict();
export function mimeMessage(input: z.infer<typeof emailDraftSchema>): string {
  const message = emailDraftSchema.parse(input);
  return Buffer.from([`To: ${message.to}`, `Subject: =?UTF-8?B?${Buffer.from(message.subject).toString("base64")}?=`, "MIME-Version: 1.0", "Content-Type: text/plain; charset=utf-8", "Content-Transfer-Encoding: base64", "", Buffer.from(message.text).toString("base64").match(/.{1,76}/g)!.join("\r\n")].join("\r\n")).toString("base64url");
}

export class GoogleAdapter {
  constructor(private token: string, private scopes: string[], private transport?: Fetch) {}
  private require(capability: GoogleCapability) {
    assertService(this.scopes.includes(googleScopes[capability]), "CAPABILITY_MISSING", `Google consent is missing for ${capability}.`, 403);
  }
  private json<T>(url: string, body: unknown, schema: z.ZodType<T>, mutation = false) {
    return providerJson("Google", url, { method: "POST", headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json" }, body: JSON.stringify(body) }, schema, { fetch: this.transport, mutation });
  }
  async createDraft(input: z.infer<typeof emailDraftSchema>) {
    this.require("gmail");
    return this.json("https://gmail.googleapis.com/gmail/v1/users/me/drafts", { message: { raw: mimeMessage(input) } }, z.object({ id: z.string(), message: z.object({ id: z.string() }) }), true);
  }
  // Dispatch authority belongs to the application approval service, never this adapter.
  async sendDraft(draftId: string) {
    this.require("gmail");
    return this.json("https://gmail.googleapis.com/gmail/v1/users/me/drafts/send", { id: z.string().min(1).max(200).parse(draftId) }, z.object({ id: z.string(), threadId: z.string().optional() }), true);
  }
  async freeBusy(timeMin: string, timeMax: string) {
    this.require("calendar_read");
    z.iso.datetime({ offset: true }).parse(timeMin); z.iso.datetime({ offset: true }).parse(timeMax);
    assertService(Date.parse(timeMax) > Date.parse(timeMin), "INVALID_DATES", "End must follow start.");
    return this.json("https://www.googleapis.com/calendar/v3/freeBusy", { timeMin, timeMax, items: [{ id: "primary" }] }, z.object({ calendars: z.record(z.string(), z.object({ busy: z.array(z.object({ start: z.string(), end: z.string() })).optional(), errors: z.array(z.unknown()).optional() })) }));
  }
  async createEvent(input: { id: string; summary: string; start: string; end: string; timezone: string; attendees: string[] }) {
    this.require("calendar_write");
    const value = z.object({ id: z.string().regex(/^[a-v0-9]{5,1024}$/), summary: z.string().min(1).max(200), start: z.iso.datetime({ offset: true }), end: z.iso.datetime({ offset: true }), timezone: z.string().max(80), attendees: z.array(z.email()).max(20) }).strict().parse(input);
    assertService(Date.parse(value.end) > Date.parse(value.start), "INVALID_DATES", "End must follow start.");
    return this.json("https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all", { id: value.id, summary: value.summary, start: { dateTime: value.start, timeZone: value.timezone }, end: { dateTime: value.end, timeZone: value.timezone }, attendees: value.attendees.map((email) => ({ email })) }, z.object({ id: z.string(), htmlLink: z.string().optional() }), true);
  }
  async listFiles() {
    this.require("drive");
    return providerJson("Google Drive", "https://www.googleapis.com/drive/v3/files?pageSize=50&fields=files(id,name,mimeType,size),nextPageToken&q=trashed%3Dfalse", { headers: { authorization: `Bearer ${this.token}` } }, z.object({ files: z.array(z.object({ id: z.string(), name: z.string(), mimeType: z.string(), size: z.string().optional() })), nextPageToken: z.string().optional() }), { fetch: this.transport });
  }
}

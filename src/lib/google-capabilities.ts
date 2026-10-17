/** Public permission names only. Credentials and access tokens never enter this projection. */
export const GOOGLE_ACCESS = {
  gmail: { scope: "https://www.googleapis.com/auth/gmail.compose", label: "Send reviewed email" },
  calendar_read: { scope: "https://www.googleapis.com/auth/calendar.freebusy", label: "Read calendar availability" },
  calendar_write: { scope: "https://www.googleapis.com/auth/calendar.events", label: "Send approved calendar invitations" },
  drive: { scope: "https://www.googleapis.com/auth/drive.file", label: "Import files you share with Crewmori" },
} as const;
export type GoogleAccess = keyof typeof GOOGLE_ACCESS;
export function googleAccessFromScopes(scopes: readonly string[]): GoogleAccess[] {
  return (Object.keys(GOOGLE_ACCESS) as GoogleAccess[]).filter((key) => scopes.includes(GOOGLE_ACCESS[key].scope));
}
export function connectionAccess(records: Array<Record<string, unknown>>): GoogleAccess[] {
  const scopes = records.filter((record) => record.state === "connected").flatMap((record) => Array.isArray(record.granted_scopes) ? record.granted_scopes.filter((scope): scope is string => typeof scope === "string") : []);
  return googleAccessFromScopes(scopes);
}
export function availabilityInterval(start: string, end: string): { start: string; end: string } {
  const first = new Date(start), last = new Date(end);
  if (!start || !end || !Number.isFinite(first.getTime()) || !Number.isFinite(last.getTime())) throw new Error("Choose a valid start and end date and time.");
  if (last.getTime() <= first.getTime()) throw new Error("Until must be later than From.");
  return { start: first.toISOString(), end: last.toISOString() };
}
export function discoveryDomains(value: string): string[] {
  const domains = [...new Set(value.split(",").map((domain) => domain.trim().toLowerCase()).filter(Boolean))];
  if (!domains.length || domains.length > 10 || domains.some((domain) => domain.length > 100 || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain))) throw new Error("Enter up to 10 domain names, separated by commas, such as example.com. Leave out https:// and page paths.");
  return domains;
}

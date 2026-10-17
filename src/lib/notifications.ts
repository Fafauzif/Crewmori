import { a, o, s, type Entity, type Input } from "./types";

/** View bookkeeping belongs in persistence/receipts, not the crew's business-activity feed. */
export function recordsTeamActivity(type: string, input: Input): boolean {
  return type !== "ui.set" && type !== "activity.markRead" && type !== "activity.catchUp" && type !== "preferences.save" && !(type === "record.save" && input.table === "preferences");
}

/** Also hides preference events from workspaces created before this policy was introduced. */
export function isTeamUpdate(event: Entity): boolean {
  const type = s(event.kind);
  if (!recordsTeamActivity(type, {})) return false;
  if (type === "record.save") {
    const refs = a(event.record_refs);
    if (refs.length > 0 && refs.every((ref) => o(ref).table === "preferences")) return false;
  }
  return true;
}

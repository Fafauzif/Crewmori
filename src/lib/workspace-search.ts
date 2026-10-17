import { s, type Entity, type StoreState } from "./types";

export const searchableTables = ["opportunities", "offers", "projects", "clients", "work_tasks", "invoices", "receipts", "sources"] as const;
export type WorkspaceSearchResult = { table: string; e: Entity; title: string };

function titleFor(state: StoreState, table: string, record: Entity): string {
  const offerTitle = table === "offers" ? state.tables.offer_versions?.[s(record.current_version_id)]?.title : undefined;
  return s(offerTitle) || s(record.title) || s(record.label) || s(record.name) || s(record.display_name) || s(record.number) || record.id.replaceAll("_", " ");
}

/** Search only the owner records already authorized and present in the store. Never fetch hidden data. */
export function searchWorkspace(state: StoreState, query = "", type = ""): WorkspaceSearchResult[] {
  const normalized = query.trim().toLocaleLowerCase();
  const terms = normalized.split(/\s+/).filter(Boolean);
  return searchableTables
    .filter((table) => !type || table === type)
    .flatMap((table) => Object.values(state.tables[table] || {}).map((e) => ({ table, e, title: titleFor(state, table, e) })))
    .map((result) => {
      const title = result.title.toLocaleLowerCase();
      const body = [result.e.summary, result.e.content].map((value) => s(value).toLocaleLowerCase()).join(" ");
      const all = title + " " + body;
      const matches = terms.every((term) => all.includes(term));
      const rank = !normalized ? 0 : title === normalized ? 4 : title.startsWith(normalized) ? 3 : title.includes(normalized) ? 2 : 1;
      return { ...result, matches, rank };
    })
    .filter((result) => result.matches)
    .sort((a, b) => b.rank - a.rank || s(b.e.updated_at).localeCompare(s(a.e.updated_at)) || a.title.localeCompare(b.title) || a.e.id.localeCompare(b.e.id))
    .map(({ table, e, title }) => ({ table, e, title }));
}

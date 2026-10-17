export type Entity = { id: string; version: number; [key: string]: unknown };
export type Tables = Record<string, Record<string, Entity>>;
export interface StoreState {
  mode?: "sample" | "connected";
  remote?: Record<string, unknown>;
  schema_version: string;
  sample_clock: string;
  tables: Tables;
  revision: number;
  scenario: string;
  dirty: boolean;
  session: boolean;
  ui: Record<string, unknown>;
}
export type Input = Record<string, unknown>;
export type Result = {
  ok: boolean;
  message: string;
  id?: string;
  ids?: Record<string, string>;
  code?: string;
  replayed?: boolean;
  /** The transport did not establish whether the submitted write committed. Retry the same intent. */
  outcomeUnknown?: boolean;
};
export const s = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;
export const n = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
export const b = (v: unknown): boolean => v === true;
export const o = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
export const a = <T = Entity>(v: unknown): T[] =>
  Array.isArray(v) ? (v as T[]) : [];
export const money = (v: unknown): string => {
  const x = o(v);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: s(x.currency, "USD"),
  }).format(n(x.amount_minor) / (s(x.currency) === "IDR" ? 1 : 100));
};
export const label = (v: unknown): string =>
  s(v).replaceAll("_", " ").replaceAll(".", " ");
export const date = (v: unknown): string => {
  const d = new Date(s(v));
  return Number.isNaN(d.getTime())
    ? "Not scheduled"
    : new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Jakarta",
      }).format(d);
};

export const primaryId = (st: StoreState, table: string, fallback = ""): string => Object.keys(st.tables[table] || {})[0] || fallback;

import { s } from "./types";

/** Explicit external references may navigate, but are never fetched as private file bytes. */
export function externalFileHref(value: unknown): string {
  try {
    const url = new URL(s(value));
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : "";
  } catch {
    return "";
  }
}

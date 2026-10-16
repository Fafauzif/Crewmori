"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { BackendClient } from "@/lib/backend-client";
import { Button, Field, Panel } from "@/components/ui";
import { useStore } from "@/lib/store";
export default function KnowledgeSearch() {
  const { connected } = useStore();
  const [query, setQuery] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), [results, setResults] = useState<Array<{ sourceId: string; title: string; text: string }>>([]);
  if (!connected) return null;
  const search = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try { setResults((await new BackendClient().request<{ results: typeof results }>("/api/knowledge/search", { query, semantic: true })).results); }
    catch (error) { setError(error instanceof Error ? error.message : "Search unavailable."); }
    finally { setBusy(false); }
  };
  return <Panel><h2>Search your knowledge</h2><form onSubmit={search}><Field label="What do you need to find?"><input value={query} minLength={2} maxLength={2000} required onChange={(e) => setQuery(e.target.value)} /></Field><Button type="submit" disabled={busy}>{busy ? "Searching…" : "Search"}</Button></form>{error && <p role="alert">{error}</p>}{results.map((result, index) => <article key={`${result.sourceId}:${index}`}><Link href={`/app/settings/knowledge?source=${encodeURIComponent(result.sourceId)}`}>{result.title || "Source"}</Link><p>{result.text}</p></article>)}</Panel>;
}

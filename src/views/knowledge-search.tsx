"use client";
import { UiText } from "@/components/ui-text";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { BackendClient } from "@/lib/backend-client";
import { Button, Field, Form, Panel } from "@/components/ui";
import { useStore } from "@/lib/store";
type Match = { sourceId: string; title: string; text: string };
export default function KnowledgeSearch() {
  const { connected, t } = useStore();
  const [query, setQuery] = useState(""), [status, setStatus] = useState<"idle" | "searching" | "done" | "error">("idle");
  const [error, setError] = useState(""), [searched, setSearched] = useState(""), [results, setResults] = useState<Match[]>([]);
  const generation = useRef(0), queryInput = useRef<HTMLInputElement>(null), request = useRef<AbortController | null>(null);
  useEffect(() => () => { generation.current++; request.current?.abort(); }, []);
  if (!connected) return null;
  const search = async (event: FormEvent) => {
    event.preventDefault();
    request.current?.abort();
    const current = ++generation.current, term = query.trim();
    if (term.length < 2) { setError("Enter at least two characters to search your knowledge."); setStatus("error"); return; }
    const controller = new AbortController(); request.current = controller;
    setStatus("searching"); setError(""); setResults([]); setSearched(term);
    try {
      const response = await new BackendClient().request<{ results: Match[] }>("/api/knowledge/search", { query: term, semantic: true }, "POST", { signal: controller.signal });
      if (current === generation.current) { setResults(response.results); setStatus("done"); }
    } catch (failure) {
      if (current === generation.current) { setError(failure instanceof Error ? failure.message : "Search is unavailable. Your sources are unchanged; try again."); setStatus("error"); }
    } finally { if (request.current === controller) request.current = null; }
  };
  const changeQuery = (value: string) => { generation.current++; request.current?.abort(); request.current = null; setQuery(value); setResults([]); setError(""); setSearched(""); setStatus("idle"); };
  const clear = () => { changeQuery(""); queryInput.current?.focus(); };
  return <Panel aria-busy={status === "searching"}><h2><UiText>{"Search your knowledge"}</UiText></h2><p className="muted"><UiText>{"Search the sources that have finished indexing. New uploads may need a moment before they appear."}</UiText></p><Form noValidate intent="read" onSubmit={search}><Field label="What do you need to find?"><input ref={queryInput} type="search" value={query} minLength={2} maxLength={2000} required onChange={(event) => changeQuery(event.target.value)} /></Field><div className="public-actions"><Button type="submit" pendingLabel="Searching…" disabled={status === "searching"}>{status === "searching" ? "Searching…" : "Search"}</Button>{(query || status !== "idle") && <Button variant="secondary" onClick={clear}>{"Clear search"}</Button>}</div></Form>
    {status === "idle" && <p className="muted"><UiText>{"Try a client name, service, or phrase from one of your sources."}</UiText></p>}
    {status === "searching" && <p role="status"><UiText>{"Searching your indexed sources…"}</UiText></p>}
    {error && <p className="feedback error" role="alert">{t(error)}</p>}
    {status === "done" && <p role="status">{results.length ? `${results.length} ${results.length === 1 ? "match" : "matches"} for “${searched}”.` : `No matches for “${searched}”. Try another phrase or check whether your sources have finished indexing.`}</p>}
    {results.map((result, index) => <article className="tool-result" key={`${result.sourceId}:${index}`}><Link href={`/app/settings/knowledge?source=${encodeURIComponent(result.sourceId)}`}>{result.title || "Source"}</Link><p>{result.text}</p></article>)}
  </Panel>;
}

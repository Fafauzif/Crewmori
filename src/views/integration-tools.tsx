"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BackendClient } from "@/lib/backend-client";
import { useStore } from "@/lib/store";
import { o, s } from "@/lib/types";
import { Button, Field, Panel, PageHead, Badge } from "@/components/ui";
// Sidebar shortcuts open the panel that holds each tool's controls.
const focusTargets: Record<string, string> = { gmail: "connection-google", calendar: "connection-calendar", drive: "connection-drive" };
const focused = (focus: string, id: string) => (focusTargets[focus] === id ? "panel-focused" : "");
export function ConnectedConnections() {
  const { rows, refresh } = useStore();
  const focus = useSearchParams().get("connection") || "";
  useEffect(() => {
    const target = document.getElementById(focusTargets[focus] || "");
    if (!target) { window.scrollTo({ top: 0 }); return; }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches || ["reduced", "off"].includes(document.documentElement.dataset.motion || "");
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    target.focus({ preventScroll: true });
  }, [focus]);
  const [selected, setSelected] = useState<string[]>(["gmail", "calendar_read", "calendar_write", "drive"]);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const manage = async (disconnect = false) => {
    setBusy(true); setError("");
    try {
      const client = new BackendClient();
      if (disconnect) { await client.request("/api/connections/google", undefined, "DELETE"); await refresh(); }
      else { const result = await client.request<{ url: string }>("/api/connections/google", { capabilities: selected }); window.location.assign(result.url); }
    } catch (error) { setError(error instanceof Error ? error.message : "The connection could not be updated."); }
    finally { setBusy(false); }
  };
  return <div className="settings-content"><PageHead title="Your tools, working together." description="Connect the Google capabilities your business needs." />
    {error && <p role="alert">{error}</p>}
    <Panel id="connection-google" tabIndex={-1} aria-label="Google account" className={focused(focus, "connection-google")}><h2>Google account</h2><div className="public-actions">{rows("connections").map((connection) => <Badge key={connection.id}>{s(connection.label)} · {s(connection.state)}</Badge>)}</div>
      <p>Select access before continuing to Google. Reconnecting replaces the saved permission set.</p>
      {[["gmail", "Send reviewed email"], ["calendar_read", "Read calendar availability"], ["calendar_write", "Send approved calendar invitations"], ["drive", "Import files accessible to this application"]].map(([capability, title]) => <label className="settings-permission" key={capability}><input type="checkbox" checked={selected.includes(capability)} onChange={(event) => setSelected((values) => event.target.checked ? [...values, capability] : values.filter((value) => value !== capability))} />{title}</label>)}
      <div className="public-actions"><Button disabled={busy || !selected.length} onClick={() => void manage()}>Connect or update Google</Button><Button variant="secondary" disabled={busy || !rows("connections").some((connection) => connection.state === "connected")} onClick={() => void manage(true)}>Disconnect Google</Button></div>
    </Panel><IntegrationTools focus={focus} /></div>;
}
export default function IntegrationTools({ focus = "" }: { focus?: string }) {
  const { connected, rows, refresh, command } = useStore();
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [files, setFiles] = useState<Array<{ id: string; name: string }>>([]), [results, setResults] = useState<Array<{ id: string; url: string; title?: string; highlights?: string[] }>>([]), [query, setQuery] = useState(""), [domains, setDomains] = useState(""), [availability, setAvailability] = useState<string[]>([]), [start, setStart] = useState(""), [end, setEnd] = useState("");
  if (!connected) return null;
  const act = async (work: () => Promise<void>) => { setBusy(true); setError(""); try { await work(); } catch (error) { setError(error instanceof Error ? error.message : "The service is unavailable."); } finally { setBusy(false); } };
  const client = new BackendClient();
  const search = (event: FormEvent) => { event.preventDefault(); void act(async () => { setResults((await client.request<{ results: typeof results }>("/api/integrations", { action: "discovery.search", query, domains: domains.split(",").map((s) => s.trim()).filter(Boolean) })).results); }); };
  return <div className="stack">{error && <p role="alert">{error}</p>}
    <Panel id="connection-drive" tabIndex={-1} aria-label="Google Drive" className={focused(focus, "connection-drive")}><h2>Google Drive</h2><p>Import files shared with this application into private knowledge storage.</p><Button disabled={busy} onClick={() => void act(async () => { setFiles((await client.request<{ files: typeof files }>("/api/integrations", { action: "drive.list" })).files); })}>List accessible files</Button>{files.map((file) => <div className="row" key={file.id}><span>{file.name}</span><Button disabled={busy} variant="secondary" onClick={() => void act(async () => { await client.request("/api/integrations", { action: "drive.import", fileId: file.id }); await refresh(); })}>Import to knowledge</Button></div>)}<Link href="/app/settings/knowledge">Open knowledge</Link></Panel>
    <Panel id="connection-calendar" tabIndex={-1} aria-label="Calendar availability" className={focused(focus, "connection-calendar")}><h2>Calendar availability</h2><form onSubmit={(event) => { event.preventDefault(); void act(async () => { const data = await client.request<{ calendars: Record<string, { busy?: Array<{ start: string; end: string }>; errors?: unknown[] }> }>("/api/integrations", { action: "calendar.availability", start: new Date(start).toISOString(), end: new Date(end).toISOString() }); if (Object.values(data.calendars).some((calendar) => calendar.errors?.length)) throw new Error("Google could not read this calendar."); setAvailability(Object.values(data.calendars).flatMap((calendar) => calendar.busy || []).map((period) => `${new Date(period.start).toLocaleString()} – ${new Date(period.end).toLocaleString()}`)); }); }}><Field label="From"><input type="datetime-local" value={start} required onChange={(event) => setStart(event.target.value)} /></Field><Field label="Until"><input type="datetime-local" value={end} required onChange={(event) => setEnd(event.target.value)} /></Field><Button disabled={busy} type="submit">Check availability</Button></form>{availability.map((period) => <p key={period}>{period}</p>)}</Panel>
    <Panel><h2>Find opportunity sources</h2><form onSubmit={search}><Field label="Search"><input required minLength={3} maxLength={500} value={query} onChange={(event) => setQuery(event.target.value)} /></Field><Field label="Allowed domains, separated by commas"><input required value={domains} onChange={(event) => setDomains(event.target.value)} placeholder="example.com" /></Field><Button disabled={busy} type="submit">Search with Exa</Button></form>{results.map((result) => <article key={result.id}><a href={result.url} target="_blank" rel="noreferrer">{result.title || result.url}</a><p>{result.highlights?.join(" ")}</p><Button disabled={busy} variant="secondary" onClick={() => void act(async () => { const saved = await command("knowledge.save", { source: { label: result.title || result.url, url: result.url, content: result.highlights?.join("\n") || "", kind: "discovery", factual_status: "unverified_external" } }); if (!saved.ok) throw new Error(saved.message); })}>Save source for review</Button></article>)}</Panel>
    <Panel><h2>External sends</h2>{rows("external_dispatches").map((dispatch) => <article key={dispatch.id}><p>{s(dispatch.operation)} · {s(dispatch.state)}</p><p>{s(o(o(dispatch.payload).email).to)} {s(o(o(dispatch.payload).email).subject)}</p>{dispatch.provider_reference && dispatch.state !== "completed" ? <Button disabled={busy} onClick={() => void act(async () => { await client.request("/api/dispatch", { id: dispatch.id, action: "finalize", checkedProvider: true }, "PATCH"); await refresh(); })}>Finish recording confirmed delivery</Button> : ["unknown", "dispatching"].includes(s(dispatch.state)) && <><p>Check the provider account before releasing an uncertain attempt. This action does not resend it.</p><Button disabled={busy} variant="secondary" onClick={() => void act(async () => { await client.request("/api/dispatch", { id: dispatch.id, checkedProvider: true }, "PATCH"); await refresh(); })}>I checked the provider; release this attempt</Button></>}</article>)}{!rows("external_dispatches").length && <p>Approved email and calendar sends will appear here.</p>}</Panel>
  </div>;
}

"use client";
import { UiText } from "@/components/ui-text";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BackendClient } from "@/lib/backend-client";
import { pickDriveFiles, type PickerConfig } from "@/lib/google-picker";
import { useStore } from "@/lib/store";
import { o, s } from "@/lib/types";
import { availabilityInterval, connectionAccess, discoveryDomains, GOOGLE_ACCESS, type GoogleAccess } from "@/lib/google-capabilities";
import { Button, Field, Form, Panel, PageHead, Badge } from "@/components/ui";
const focusTargets: Record<string, string> = { gmail: "connection-google", calendar: "connection-calendar", drive: "connection-drive" };
const focused = (focus: string, id: string) => (focusTargets[focus] === id ? "panel-focused" : "");
export function ConnectedConnections() {
  const { rows, refresh, t } = useStore();
  const params = useSearchParams(), focus = params.get("connection") || "", justConnected = params.get("connected") === "google", connectionError = params.get("connectionError");
  const access = connectionAccess(rows("connections"));
  const [draft, setDraft] = useState<GoogleAccess[] | null>(null);
  const selected = draft ?? access;
  const anyConnected = rows("connections").some((connection) => connection.state === "connected");
  const [busy, setBusy] = useState(""), [error, setError] = useState(""), [disconnecting, setDisconnecting] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    const target = document.getElementById(focusTargets[focus] || "");
    if (!target) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches || ["reduced", "off"].includes(document.documentElement.dataset.motion || "");
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }); target.focus({ preventScroll: true });
  }, [focus]);
  const manage = async (disconnect = false) => {
    if (lock.current) return;
    lock.current = true; setBusy(disconnect ? "disconnect" : "connect"); setError("");
    try {
      const client = new BackendClient();
      if (disconnect) { await client.request("/api/connections/google", undefined, "DELETE"); setDraft(null); setDisconnecting(false); await refresh(); }
      else { const result = await client.request<{ url: string }>("/api/connections/google", { capabilities: selected }); window.location.assign(result.url); }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The connection could not be updated. Your saved records are still available."); }
    finally { lock.current = false; setBusy(""); }
  };
  const added = selected.filter((value) => !access.includes(value)), removed = access.filter((value) => !selected.includes(value));
  return <div className="settings-content"><PageHead title="Your tools, working together." description="Choose the Google access your business needs. Your account sign-in and these optional tool permissions are separate." />
    {connectionError && <p className="feedback error" role="alert">{t(connectionError === "cancelled" ? "Google access was cancelled. Your saved connection permissions are listed below; continue when you’re ready." : "Google access could not be updated. Review your saved permissions below, then try connecting again.")}</p>}
    {justConnected && <p className="feedback success" role="status"><UiText>{"Google access has been saved. The available permissions are listed below; external sends still require your approval."}</UiText></p>}
    <Panel id="connection-google" tabIndex={-1} aria-label="Google account" className={focused(focus, "connection-google")}><h2><UiText>{"Google account"}</UiText></h2>
      <ul className="connection-status">{[
        { label: "Gmail", enabled: access.includes("gmail"), detail: "Send exact-content approved emails from your account.", href: "/app/clients", action: "Open client messages" },
        { label: "Google Calendar", enabled: access.includes("calendar_read") || access.includes("calendar_write"), detail: [access.includes("calendar_read") ? "Read availability" : "", access.includes("calendar_write") ? "send approved invitations" : ""].filter(Boolean).join(" and "), href: "/app/connections?connection=calendar", action: "Open Calendar tools" },
        { label: "Google Drive", enabled: access.includes("drive"), detail: "Import only files shared with this application.", href: "/app/connections?connection=drive", action: "Open Drive tools" },
      ].map((tool) => <li key={tool.label}><Badge tone={tool.enabled ? "success" : "neutral"}>{tool.enabled ? "Connected" : "Not connected"}</Badge><div><strong>{tool.label}</strong><p className="muted">{t(tool.enabled ? tool.detail : "Select the access you need below, then continue to Google.")}</p>{tool.enabled && <Link href={tool.href}><UiText>{tool.action}</UiText></Link>}</div></li>)}</ul>
      <h3><UiText>{"Access to request"}</UiText></h3><p><UiText>{"Your current permissions are selected. Choose what Crewmori should request; after reconnecting, this page shows the access Google actually granted."}</UiText></p>
      {(Object.keys(GOOGLE_ACCESS) as GoogleAccess[]).map((capability) => <label className="settings-permission" key={capability}><input type="checkbox" checked={selected.includes(capability)} disabled={!!busy} onChange={(event) => setDraft(event.target.checked ? [...selected, capability] : selected.filter((value) => value !== capability))} /><UiText>{GOOGLE_ACCESS[capability].label}</UiText></label>)}
      {!!added.length && <p className="muted"><UiText>{"Requesting:"}</UiText>{" "}{added.map((key) => GOOGLE_ACCESS[key].label).join("; ")}.</p>}
      {!!removed.length && <p className="feedback"><UiText>{"Removing:"}</UiText>{" "}{removed.map((key) => GOOGLE_ACCESS[key].label).join("; ")}<UiText>{". Review the returned permissions after reconnecting. Disconnect Google here to stop all Crewmori tool access."}</UiText></p>}
      {error && <p className="feedback error" role="alert">{t(error)}</p>}
      <div className="public-actions"><Button disabled={!!busy || !selected.length} onClick={() => manage()}>{busy === "connect" ? "Opening Google…" : anyConnected ? "Update Google access" : "Connect Google"}</Button><Button variant="secondary" disabled={!!busy || !anyConnected} onClick={() => setDisconnecting(true)}>{"Disconnect Google"}</Button></div>
      {disconnecting && <div className="feedback"><p><UiText>{"Disconnect Google from Crewmori? Email sends, calendar tools and Drive imports will stop. Existing records and files stay in your workspace. You can also review provider-side access in your Google account settings."}</UiText></p><div className="public-actions"><Button variant="secondary" disabled={!!busy} onClick={() => setDisconnecting(false)}>{"Keep connected"}</Button><Button disabled={!!busy} onClick={() => manage(true)}>{busy === "disconnect" ? "Disconnecting…" : "Disconnect Google access"}</Button></div></div>}
    </Panel><IntegrationTools focus={focus} /></div>;
}

type FileItem = { id: string; name: string };
type DiscoveryResult = { id: string; url: string; title?: string; highlights?: string[] };
export default function IntegrationTools({ focus = "" }: { focus?: string }) {
  const { connected, rows, refresh, command, t } = useStore();
  const access = connectionAccess(rows("connections")), driveEnabled = access.includes("drive"), calendarEnabled = access.includes("calendar_read");
  const [errors, setErrors] = useState<Record<string, string>>({}), [pending, setPending] = useState<Record<string, boolean>>({});
  const locks = useRef(new Set<string>()), discoveryVersion = useRef(0), calendarVersion = useRef(0);
  const [files, setFiles] = useState<FileItem[] | null>(null), [imported, setImported] = useState<string[]>([]);
  const [results, setResults] = useState<DiscoveryResult[] | null>(null), [query, setQuery] = useState(""), [domains, setDomains] = useState(""), [saved, setSaved] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string[] | null>(null), [checkedInterval, setCheckedInterval] = useState("");
  const [start, setStart] = useState(""), [end, setEnd] = useState("");
  if (!connected) return null;
  const act = async (key: string, work: () => Promise<void>) => {
    if (locks.current.has(key)) return;
    locks.current.add(key); setPending((all) => ({ ...all, [key]: true })); setErrors((all) => ({ ...all, [key]: "" }));
    try { await work(); } catch (failure) { setErrors((all) => ({ ...all, [key]: failure instanceof Error ? failure.message : "This service is unavailable. Try again shortly." })); }
    finally { locks.current.delete(key); setPending((all) => ({ ...all, [key]: false })); }
  };
  const feedback = (key: string) => errors[key] ? <p className="feedback error" role="alert">{t(errors[key])}</p> : null;
  const client = new BackendClient();
  const importFile = async (file: FileItem) => {
    const result = await client.request<{ ok?: boolean; message?: string }>("/api/integrations", { action: "drive.import", fileId: file.id });
    if (result.ok === false) throw new Error(result.message || "The file could not be imported. Check Knowledge before trying again.");
    setImported((all) => [...new Set([...all, file.name])]);
  };
  const search = async (event: FormEvent) => { event.preventDefault(); const current = ++discoveryVersion.current; await act("discovery", async () => {
    const allowed = discoveryDomains(domains); if (query.trim().length < 3) throw new Error("Enter at least three characters for your search.");
    setResults(null); setSaved([]);
    const response = await client.request<{ results: DiscoveryResult[] }>("/api/integrations", { action: "discovery.search", query: query.trim(), domains: allowed });
    if (current === discoveryVersion.current) setResults(response.results);
  }); };
  return <div className="stack">
    <Panel id="connection-drive" tabIndex={-1} aria-label="Google Drive" className={focused(focus, "connection-drive")}><h2><UiText>{"Google Drive"}</UiText></h2><p><UiText>{"Choose supported Drive files to import into private knowledge. Crewmori can only open the files shared with this application."}</UiText></p>
      {!driveEnabled && <p className="feedback"><UiText>{"Drive access is not connected."}</UiText>{" "}<a href="#connection-google"><UiText>{"Select Drive access above"}</UiText></a><UiText>{", then connect Google."}</UiText></p>}
      <div className="public-actions"><Button disabled={!driveEnabled || !!pending.drive} onClick={() => act("drive", async () => {
        const picked = await pickDriveFiles(await client.request<PickerConfig>("/api/integrations", { action: "drive.pickerConfig" }));
        try { for (const file of picked) { await importFile(file); } }
        finally { if (picked.length) await refresh(); }
      })}>{pending.drive ? "Working with Drive…" : "Choose files from Drive"}</Button><Button variant="secondary" disabled={!driveEnabled || !!pending.drive} onClick={() => act("drive", async () => { setFiles((await client.request<{ files: FileItem[] }>("/api/integrations", { action: "drive.list" })).files); })}>{"List accessible files"}</Button></div>
      {pending.drive && <p role="status"><UiText>{"Opening or importing the selected Drive files. Keep this page open."}</UiText></p>}{feedback("drive")}
      {imported.length > 0 && <p className="feedback success" role="status"><UiText>{"Imported"}</UiText>{" "}{imported.join(", ")}<UiText>{". Indexing continues in Knowledge."}</UiText></p>}
      {files?.length === 0 && <p className="feedback" role="status"><UiText>{"No files are shared with Crewmori yet. Choose files from Drive to grant access to specific files."}</UiText></p>}
      {files && files.length > 0 && <p role="status"><UiText>{"Showing"}</UiText>{" "}{files.length} <UiText>{"accessible files"}</UiText>{files.length === 50 ? " from the first page. Use the picker to choose other files" : ""}.</p>}
      {files?.map((file) => <div className="row tool-result" key={file.id}><span>{file.name}</span><Button disabled={!driveEnabled || !!pending.drive} variant="secondary" onClick={() => act("drive", async () => { await importFile(file); await refresh(); })}>{"Import to knowledge"}</Button></div>)}<Link href="/app/settings/knowledge"><UiText>{"Open knowledge"}</UiText></Link>
    </Panel>
    <Panel id="connection-calendar" tabIndex={-1} aria-label="Calendar availability" className={focused(focus, "connection-calendar")}><h2><UiText>{"Calendar availability"}</UiText></h2><p><UiText>{"Check busy periods in your primary Google calendar. Times use your device’s local timezone ("}</UiText>{Intl.DateTimeFormat().resolvedOptions().timeZone}).</p>
      {!calendarEnabled && <p className="feedback"><UiText>{"Reading availability needs its own permission."}</UiText>{" "}<a href="#connection-google"><UiText>{"Select Read calendar availability above"}</UiText></a><UiText>{", then update Google access."}</UiText></p>}
      <Form noValidate intent="read" onSubmit={async (event) => { event.preventDefault(); const current = ++calendarVersion.current; await act("calendar", async () => {
        const interval = availabilityInterval(start, end); setAvailability(null);
        const data = await client.request<{ calendars: Record<string, { busy?: Array<{ start: string; end: string }>; errors?: unknown[] }> }>("/api/integrations", { action: "calendar.availability", ...interval });
        if (!Object.keys(data.calendars).length || Object.values(data.calendars).some((calendar) => calendar.errors?.length)) throw new Error("Google could not read this calendar. Availability is not confirmed; check access and try again.");
        if (current !== calendarVersion.current) return;
        setCheckedInterval(`${new Date(interval.start).toLocaleString()} – ${new Date(interval.end).toLocaleString()}`);
        setAvailability(Object.values(data.calendars).flatMap((calendar) => calendar.busy || []).map((period) => `${new Date(period.start).toLocaleString()} – ${new Date(period.end).toLocaleString()}`));
      }); }}><Field label="From"><input type="datetime-local" value={start} required onChange={(event) => { calendarVersion.current++; setStart(event.target.value); setAvailability(null); }} /></Field><Field label="Until"><input type="datetime-local" value={end} required onChange={(event) => { calendarVersion.current++; setEnd(event.target.value); setAvailability(null); }} /></Field><Button disabled={!calendarEnabled || !!pending.calendar} pendingLabel="Checking availability…" type="submit">{pending.calendar ? "Checking availability…" : "Check availability"}</Button></Form>
      {feedback("calendar")}{pending.calendar && <p role="status"><UiText>{"Checking your primary calendar…"}</UiText></p>}{availability && <div role="status"><p><UiText>{"Checked"}</UiText>{" "}{checkedInterval}.</p><p>{availability.length ? `${availability.length} busy ${availability.length === 1 ? "period" : "periods"} found.` : "No busy periods found in this checked interval. This is a calendar snapshot, not a reservation."}</p></div>}{availability?.map((period) => <p key={period}>{period}</p>)}
    </Panel>
    <Panel><h2><UiText>{"Find opportunity sources"}</UiText></h2><p><UiText>{"Search selected websites for sources to review. Results are external claims until you verify them."}</UiText></p><Form noValidate intent="read" onSubmit={search}><Field label="What are you looking for?"><input required minLength={3} maxLength={500} value={query} onChange={(event) => { discoveryVersion.current++; setQuery(event.target.value); setResults(null); }} /></Field><Field label="Allowed domains, separated by commas"><input required value={domains} onChange={(event) => { discoveryVersion.current++; setDomains(event.target.value); setResults(null); }} placeholder="example.com, another.org" /></Field><p className="muted"><UiText>{"Use domain names without https:// or page paths. Discovery is powered by Exa."}</UiText></p><Button disabled={!!pending.discovery} pendingLabel="Finding sources…" type="submit">{pending.discovery ? "Finding sources…" : "Find sources"}</Button></Form>
      {feedback("discovery")}{pending.discovery && <p role="status"><UiText>{"Searching the selected websites…"}</UiText></p>}{results && <p role="status">{results.length ? `${results.length} sources found. Review them before saving.` : "No sources found for this search. Try another phrase or a different allowed domain."}</p>}
      {results?.map((result) => { const key = `save:${result.id}`; return <article className="tool-result" key={result.id}><a href={result.url} target="_blank" rel="noreferrer">{result.title || result.url}</a><p>{result.highlights?.join(" ")}</p><Button disabled={!!pending[key] || saved.includes(result.id)} variant="secondary" onClick={() => act(key, async () => { const value = await command("knowledge.save", { source: { label: result.title || result.url, url: result.url, content: result.highlights?.join("\n") || "", kind: "discovery", factual_status: "unverified_external" } }); if (!value.ok) throw new Error(value.message); setSaved((all) => [...all, result.id]); })}>{saved.includes(result.id) ? "Saved for review" : pending[key] ? "Saving source…" : "Save source for review"}</Button>{feedback(key)}</article>; })}
    </Panel>
    <Panel><h2><UiText>{"External sends"}</UiText></h2><p><UiText>{"Review uncertain deliveries in the provider account before changing their local status. These controls never resend a message."}</UiText></p>{rows("external_dispatches").map((dispatch) => { const key = `dispatch:${dispatch.id}`; return <article className="tool-result" key={dispatch.id}><p>{s(dispatch.operation).replaceAll("_", " ")} · {s(dispatch.state).replaceAll("_", " ")}</p><p>{s(o(o(dispatch.payload).email).to)} {s(o(o(dispatch.payload).email).subject)}</p>{dispatch.operation === "calendar.invite" && <p>{s(o(o(dispatch.payload).event).summary)} · {s(o(o(dispatch.payload).event).start)} – {s(o(o(dispatch.payload).event).end)} ({s(o(o(dispatch.payload).event).timezone)})</p>}<p className="muted"><UiText>{"Attempt created"}</UiText>{" "}{new Date(s(dispatch.created_at)).toLocaleString()}{dispatch.provider_reference ? ` · Provider reference: ${s(dispatch.provider_reference)}` : " · Provider confirmation is not recorded"}.</p>{dispatch.provider_reference && dispatch.state !== "completed" ? <Button disabled={!!pending[key]} onClick={() => act(key, async () => { await client.request("/api/dispatch", { id: dispatch.id, action: "finalize", checkedProvider: true }, "PATCH"); await refresh(); })}>{"Finish recording confirmed delivery"}</Button> : ["unknown", "dispatching"].includes(s(dispatch.state)) && <><p><UiText>{"First check the provider account for this exact message or invitation. Releasing an uncertain attempt does not resend it."}</UiText></p><Button disabled={!!pending[key]} variant="secondary" onClick={() => act(key, async () => { await client.request("/api/dispatch", { id: dispatch.id, checkedProvider: true }, "PATCH"); await refresh(); })}>{"I checked the provider; release this attempt"}</Button></>}{feedback(key)}</article>; })}{!rows("external_dispatches").length && <p><UiText>{"Approved email and calendar sends will appear here."}</UiText></p>}</Panel>
  </div>;
}

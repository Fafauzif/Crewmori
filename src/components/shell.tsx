"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Home,
  Users,
  Compass,
  BriefcaseBusiness,
  Wallet,
  Mail,
  Calendar,
  Cloud,
  Link2,
  Settings,
  Search,
  Bell,
  Menu,
  ChevronDown,
  Focus,
  Play,
  Pause,
  ArrowRight,
  LogOut,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { s, n, a, o, label, date, type Entity, type Result } from "@/lib/types";
import {
  Button,
  Modal,
  Form,
  Confirm,
  SearchBar,
  Field,
  Badge,
  Empty,
  Feedback,
  RecordLink,
  useDirtyGuard,
} from "./ui";
import { roles, recordHref, eventHref } from "@/views/home-team";
import scenarios from "@/lib/scenarios.json";
import { searchWorkspace } from "@/lib/workspace-search";
import { isTeamUpdate } from "@/lib/notifications";
import "./shell.css";
import { persistUpload, downloadText } from "@/lib/downloads";
const nav = [
  { name: "Home", path: "/app/home", icon: Home, match: /^\/app\/home/ },
  { name: "Team", path: "/app/team", icon: Users, match: /^\/app\/team/ },
  {
    name: "Opportunities",
    path: "/app/opportunities",
    icon: Compass,
    match: /^\/app\/(opportunities|offers|promotion)/,
  },
  {
    name: "Work",
    path: "/app/projects",
    icon: BriefcaseBusiness,
    match: /^\/app\/(projects|clients|calendar)/,
  },
  {
    name: "Money",
    path: "/app/money/invoices",
    icon: Wallet,
    match: /^\/app\/money/,
  },
];
const connectionLinks = [
  { id: "gmail", label: "Gmail", icon: Mail, size: 16 },
  { id: "calendar", label: "Google Calendar", icon: Calendar, size: 16 },
  { id: "drive", label: "Google Drive", icon: Cloud, size: 16 },
  { id: "", label: "Manage connections", icon: Link2, size: 15 },
];
export function Shell({
  children,
  onAsk,
}: {
  children: ReactNode;
  onAsk: (text?: string) => void;
}) {
  const path = usePathname(),
    router = useRouter(),
    params = useSearchParams();
  const {
    state,
    rows,
    record,
    command,
    notify,
    t,
    storageError,
    resetStorage,
    connected,
    refresh,
  } = useStore();
  const [menu, setMenu] = useState(false),
    [search, setSearch] = useState(false),
    [sample, setSample] = useState(params.get("scenario") === "1"),
    [notifications, setNotifications] = useState(
      params.get("notifications") === "1",
    ),
    [recap, setRecap] = useState(false),
    [recapIndex, setRecapIndex] = useState(0),
    [playing, setPlaying] = useState(false),
    [snapshot, setSnapshot] = useState<Entity[]>([]),
    [query, setQuery] = useState(""),
    [type, setType] = useState(""),
    [unread, setUnread] = useState(false),
    [pendingScenario, setPendingScenario] = useState(""),
    [visibleResults, setVisibleResults] = useState(30);
  const prefs = record("preferences", "preferences_alya"),
    owner = record("owners", "owner_alya");
  const read = a<string>(state.ui.read_events);
  const events = rows("events").filter(isTeamUpdate).sort((a, b) => n(b.sequence) - n(a.sequence));
  const count = events.filter((e) => !read.includes(e.id)).length;
  const focus = s(prefs?.focus_mode) === "focus";
  const active = nav.find((x) => x.match.test(path));
  useEffect(() => {
    setVisibleResults(30);
  }, [query, type]);
  useEffect(() => {
    const closeOnDesktop = () => { if (window.innerWidth > 1024) setMenu(false); };
    window.addEventListener("resize", closeOnDesktop);
    return () => window.removeEventListener("resize", closeOnDesktop);
  }, []);
  useEffect(() => {
    setMenu(false);
    setSearch(false);
    setRecap(false);
    setPlaying(false);
  }, [path]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "k" &&
        !document.querySelector("dialog[open]") &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      if (recapIndex + 1 >= snapshot.length) {
        setPlaying(false);
      } else setRecapIndex((i) => i + 1);
    }, 2200);
    return () => clearTimeout(timer);
  }, [playing, recapIndex, snapshot.length]);
  useEffect(() => {
    if (params.get("scenario") === "1") setSample(true);
    if (params.get("notifications") === "1") setNotifications(true);
  }, [params]);
  const closeQueryModal = (key: string) => {
    const next = new URLSearchParams(params);
    next.delete(key);
    router.replace(path + (next.size ? "?" + next : ""), { scroll: false });
    if (key === "scenario") setSample(false);
    else setNotifications(false);
  };
  const enterScenario = async (id: string) => {
    const result = (await command("scenario.load", {
      id,
      discard_edited_work_confirmed: true,
    }));
    if (result.ok) {
      setSample(false);
      setPendingScenario("");
      notify("Sample scenario loaded.");
      router.push(id === "first_use" ? "/onboarding" : "/app/home");
    }
  };
  const openRecap = async () => {
    const list = events
      .filter((e) => n(e.sequence) > n(prefs?.last_seen_event_sequence))
      .reverse();
    setSnapshot(list);
    setRecapIndex(0);
    setPlaying(list.length > 0 && prefs?.motion !== "reduced");
    setRecap(true);
    if (list.length)
      (await command("record.save", {
        table: "preferences",
        id: "preferences_alya",
        expected_version: prefs?.version,
        values: {
          last_seen_event_sequence: Math.max(...list.map((e) => n(e.sequence))),
        },
      }));
  };
  const recordTitle = (table: string, e: Entity) =>
    table === "offers"
      ? s(record("offer_versions", s(e.current_version_id))?.title, e.id)
      : s(e.title) ||
        s(e.label) ||
        s(e.name) ||
        s(e.display_name) ||
        s(e.number) ||
        label(e.id);
  const results = useMemo(() => search ? searchWorkspace(state, query, type) : [], [search, state, query, type]);
  const shownResults = results.slice(0, visibleResults);
  const navigation = (
    <>
        <Link
          href="/app/home"
          className="brand-link"
          aria-label={t("Crewmori home")}
        >
          <img src="/assets/brand/crewmori-primary-green.svg" alt="Crewmori" />
        </Link>
        <div className="sample-label">{t(connected ? "Your workspace" : "Your sample workspace")}</div>
        <nav className="primary-nav">
          {nav.map(({ name, path: href, icon: Icon, match }) => (
            <Link
              key={name}
              href={href}
              className={`nav-item ${match.test(path) ? "active" : ""}`}
              aria-current={match.test(path) ? "page" : undefined}
            >
              <Icon size={18} />
              {t(name)}
            </Link>
          ))}
        </nav>
        <div className="sidebar-tools">
          <div className="eyebrow">{t(connected ? "Connections" : "Sample connections")}</div>
          {connectionLinks.map(({ id, label, icon: Icon, size }) => {
            const active =
              path.startsWith("/app/connections") &&
              (params.get("connection") || "") === id;
            return (
              <Link
                key={id || "all"}
                className={`nav-item ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined}
                href={id ? `/app/connections?connection=${id}` : "/app/connections"}
              >
                <Icon size={size} />
                {id ? label : t(label)}
              </Link>
            );
          })}
        </div>
        <div className="sidebar-footer">
          <Link
            href="/app/settings/profile"
            className={`nav-item ${path.includes("/settings") ? "active" : ""}`}
          >
            <Settings size={18} />
            {t("Settings")}
          </Link>
          <Link href="/app/settings/profile" className="owner-chip">
            <span className="owner-avatar">
              {s(owner?.display_name, "A").slice(0, 1)}
            </span>
            <div className="owner-chip-copy">
              <strong>{s(owner?.display_name, "Your profile")}</strong>
              <small>{t("Profile and workspace")}</small>
            </div>
          </Link>
        </div>
    </>
  );
  return (
    <>
      <a className="skip-link" href="#main-content">
        {t("Skip to content")}
      </a>
      <aside className="sidebar" aria-label={t("Main navigation")}>
        {navigation}
      </aside>
      {menu && (
        <Modal title="Navigation" className="shell-nav-dialog" onClose={() => setMenu(false)}>
          <div id="mobile-navigation" className="shell-mobile-nav" onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) setMenu(false);
          }}>
            {navigation}
            <Button variant="secondary" onClick={() => { setMenu(false); onAsk(); }}>
              {t("Ask your team")}
            </Button>
            <Button variant="secondary" aria-pressed={focus} onClick={async () => await command("record.save", {
              table: "preferences", id: "preferences_alya", expected_version: prefs?.version,
              values: { focus_mode: focus ? "normal" : "focus" },
            })}>
              <Focus size={16} />{t("Focus")}: {t(focus ? "On" : "Off")}
            </Button>
            <Button variant="ghost" onClick={async () => { setMenu(false); await openRecap(); }}>
              <Play size={16} />{t("Catch me up")}
            </Button>
            {connected && <Button variant="ghost" onClick={async () => {
              const result = await command("session.signOut");
              if (result.ok) { setMenu(false); router.replace("/auth/sign-in"); }
            }}>{t("Sign out")}</Button>}
          </div>
        </Modal>
      )}
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-title">
            <Button
              variant="icon"
              className="mobile-menu"
              aria-label={t("Open navigation menu")}
              aria-expanded={menu}
              aria-controls="mobile-navigation"
              aria-haspopup="dialog"
              onClick={() => setMenu(!menu)}
            >
              <Menu size={18} />
            </Button>
            <span>
              {t(
                active?.name ||
                  (path.includes("connections") ? "Connections" : "Settings"),
              )}
            </span>
          </div>
          <div className="topbar-actions">
            {connected ? <Button variant="ghost" className="shell-sign-out" onClick={async () => { const result = await command("session.signOut"); if (result.ok) router.replace("/auth/sign-in"); }}>Sign out</Button> : <>
            <button
              className="sample-trigger"
              aria-label={t("Sample workspace")}
              onClick={() => setSample(true)}
            >
              <span className="sample-trigger-wide">
                {t("Sample workspace")}
              </span>
              <span className="sample-trigger-narrow" aria-hidden="true">
                {t("Sample")}
              </span>
              <ChevronDown size={12} />
            </button>
            </>}
            {path.includes("/team") && (
              <Button variant="secondary" className="desktop-only" onClick={openRecap}>
                <Play size={14} />
                {t("Catch me up")}
              </Button>
            )}
            <Button
              variant="secondary"
              className="desktop-only"
              aria-pressed={focus}
              onClick={async () =>
                (await command("record.save", {
                  table: "preferences",
                  id: "preferences_alya",
                  expected_version: prefs?.version,
                  values: { focus_mode: focus ? "normal" : "focus" },
                }))
              }
            >
              <Focus size={15} />
              {t("Focus")}: {t(focus ? "On" : "Off")}
            </Button>
            <Button
              variant="icon"
              aria-label={t("Search workspace")}
              onClick={() => setSearch(true)}
            >
              <Search size={17} />
            </Button>
            <Button
              variant="icon"
              aria-label={`${t("Notifications")}, ${count} ${t("unread")}`}
              onClick={() => setNotifications(true)}
            >
              <Bell size={17} />
              {count > 0 && <span className="notification-dot" />}
            </Button>
            {!["/app/home", "/app/team"].includes(path) && (
              <Button
                variant="secondary"
                className="shell-ask"
                onClick={() => onAsk()}
              >
                {t("Ask your team")}
              </Button>
            )}
          </div>
        </header>
        <main className="page-content" id="main-content">
          {storageError && (
            <div className="feedback error" role="alert">
              <p>{storageError}</p>
              <div className="actions">
                {connected ? (
                  <Button variant="secondary" onClick={refresh}>{t("Try again")}</Button>
                ) : (
                  <>
                    <Button variant="secondary" onClick={() => downloadText(
                      "Crewmori_local_sample_recovery.json",
                      localStorage.getItem("crewmori.workspace.v1") || "{}",
                      "application/json",
                    )}>Export local sample data</Button>
                    <Button variant="danger" onClick={() => setPendingScenario("recovery")}>
                      Reset sample
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
      <nav className="bottom-nav" aria-label={t("Primary mobile navigation")}>
        {nav.map(({ name, path: href, icon: Icon, match }) => (
          <Link
            key={name}
            href={href}
            className={match.test(path) ? "active" : ""}
            aria-current={match.test(path) ? "page" : undefined}
          >
            <Icon />
            {t(name)}
          </Link>
        ))}
      </nav>
      {search && (
        <Modal title="Search your workspace" onClose={() => setSearch(false)}>
          <div className="stack">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Search saved records"
            />
            <Field label="Record type">
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">{t("All records")}</option>
                {[
                  "opportunities",
                  "offers",
                  "projects",
                  "clients",
                  "work_tasks",
                  "invoices",
                  "receipts",
                  "sources",
                ].map((x) => (
                  <option key={x} value={x}>
                    {t(label(x))}
                  </option>
                ))}
              </select>
            </Field>
            <p className="muted shell-search-count" role="status">
              {results.length === 0
                ? t(query || type ? "No matching records" : "No saved records yet")
                : `${t("Showing")} ${Math.min(visibleResults, results.length)} ${t("of")} ${results.length} ${t("saved records")}${query.trim() ? ` ${t("for")} “${query.trim()}”` : ""}`}
            </p>
            <div className="shell-search-results" aria-label={t("Search results")}>
            {shownResults.map(({ table, e }) => (
              <RecordLink
                key={table + e.id}
                href={recordHref(table, e.id, state)}
              >
                <span>
                  {recordTitle(table, e)}
                  {e.archived === true && <Badge>Archived</Badge>}
                  <small className="muted" style={{ display: "block" }}>
                    {label(table)}
                  </small>
                </span>
              </RecordLink>
            ))}
            </div>
            {results.length > visibleResults && (
              <Button variant="secondary" onClick={() => setVisibleResults((count) => count + 30)}>
                {t("Show more results")}
              </Button>
            )}
            {!results.length && (
              <Empty
                title={query || type ? "No matching records" : "No saved records yet"}
                description={query || type ? "Try a different term or clear the filters." : "Your leads, projects, clients and invoices will appear here as you add them."}
              />
            )}
            {(query || type) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setQuery("");
                  setType("");
                }}
              >
                Clear search and filters
              </Button>
            )}
          </div>
        </Modal>
      )}
      {sample && !connected && (
        <Modal
          title="Explore your sample workspace"
          onClose={() => closeQueryModal("scenario")}
        >
          <div className="stack">
            <p className="muted">
              Everything here is saved in this browser. Connections, messages
              and payments are simulated. No real account or funds are involved.
            </p>
            <div className="row">
              <Badge>Frozen clock: {date(state.sample_clock)}</Badge>
              <Button
                variant="secondary"
                onClick={async () => {
                  const r = (await command("clock.advance", { days: 1 }));
                  notify(r.message);
                }}
              >
                Advance one day
              </Button>
            </div>
            <div className="scenario-list">
              {scenarios.scenarios.map((x) => (
                <button
                  key={x.id}
                  className={`scenario-option ${state.scenario === x.id ? "selected" : ""}`}
                  onClick={async () =>
                    state.dirty ? setPendingScenario(x.id) : (await enterScenario(x.id))
                  }
                >
                  <strong>{x.title}</strong>
                  <small className="muted">{x.description}</small>
                </button>
              ))}
            </div>
            <div className="actions">
              <Button
                variant="secondary"
                onClick={() => setPendingScenario("review_ready")}
              >
                Reset sample workspace
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  (await command("session.set", { authenticated: false }));
                  router.push("/auth/sign-in");
                }}
              >
                <LogOut size={16} />
                Sign out of sample
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {pendingScenario && (
        <Confirm
          title="Reset the saved sample?"
          description="Your edited records in this browser will be replaced with this scenario. Downloaded files stay on your device."
          confirmLabel="Load sample"
          onClose={() => setPendingScenario("")}
          onConfirm={async () => {
            if (pendingScenario === "recovery") {
              resetStorage();
              setPendingScenario("");
            } else (await enterScenario(pendingScenario));
          }}
        />
      )}
      {notifications && (
        <Modal
          title="Your team’s updates"
          onClose={() => closeQueryModal("notifications")}
        >
          <div className="stack">
            <div className="actions">
              <Button
                variant={unread ? "secondary" : "primary"}
                aria-pressed={!unread}
                onClick={() => setUnread(false)}
              >
                All
              </Button>
              <Button
                variant={unread ? "primary" : "secondary"}
                aria-pressed={unread}
                onClick={() => setUnread(true)}
              >
                {t("Unread")} ({count})
              </Button>
              <Button
                variant="ghost"
                disabled={count === 0}
                onClick={async () =>
                  (await command("ui.set", {
                    values: { read_events: [...new Set([...read, ...events.map((e) => e.id)])] },
                  }))
                }
              >
                Mark all as read
              </Button>
            </div>
            {events
              .filter((e) => !unread || !read.includes(e.id))
              .map((e) => (
                <div className="list-row" key={e.id}>
                  <div>
                    <p>{s(e.summary)}</p>
                    <small className="muted">{date(e.occurred_at)}</small>
                  </div>
                  <div className="actions">
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        (await command("ui.set", {
                          values: { read_events: [...read, e.id] },
                        }));
                        setNotifications(false);
                        router.push(eventHref(e, state));
                      }}
                    >
                      Open
                      <ArrowRight size={14} />
                    </Button>
                    {!read.includes(e.id) && (
                      <Button
                        variant="ghost"
                        onClick={async () =>
                          (await command("ui.set", {
                            values: { read_events: [...read, e.id] },
                          }))
                        }
                      >
                        Mark read
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            {((unread && !count) || !events.length) && <Empty
              title="You’re all caught up"
              description="New activity from your team will appear here."
            />}
          </div>
        </Modal>
      )}
      {recap && (
        <Modal
          title="A recap of your team’s work"
          onClose={() => {
            setRecap(false);
            setPlaying(false);
          }}
        >
          <div className="stack">
            <Badge>Historical recap · saved events only</Badge>
            {!snapshot.length ? (
              <Empty
                title="You’re all caught up"
                description="New saved activity will appear in your next recap."
              />
            ) : (
              <>
                <h3>{s(snapshot[recapIndex]?.summary)}</h3>
                <small className="muted">
                  {recapIndex + 1} of {snapshot.length} saved updates
                </small>
                <div className="actions">
                  <Button
                    variant="secondary"
                    onClick={() => setPlaying(!playing)}
                  >
                    {playing ? <Pause size={15} /> : <Play size={15} />}{" "}
                    {playing ? "Pause recap" : "Resume recap"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setPlaying(false);
                      setRecapIndex(snapshot.length - 1);
                    }}
                  >
                    Skip recap
                  </Button>
                  <Button variant="ghost" onClick={() => setPlaying(false)}>
                    Read summary
                  </Button>
                </div>
                <div className="stack">
                  {snapshot.map((e) => (
                    <RecordLink key={e.id} href={eventHref(e, state)}>
                      {s(e.summary)}
                    </RecordLink>
                  ))}
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
const taskOptions = [
  { label: "Assess a lead", intent: "assess_opportunity", role: "scout" },
  { label: "Draft an offer", intent: "draft_offer", role: "sales" },
  { label: "Draft a promotion", intent: "draft_promotion", role: "promoter" },
  {
    label: "Draft a follow-up",
    intent: "draft_followup",
    role: "account_manager",
  },
  { label: "Plan a project", intent: "plan_project", role: "operations" },
  { label: "Inspect an invoice", intent: "inspect_invoice", role: "finance" },
];
export function Delegate({
  initial,
  onClose,
}: {
  initial: string;
  onClose: () => void;
}) {
  const { state, rows, command, record, notify, connected, t } = useStore();
  const router = useRouter();
  const draft = o(state.ui.delegate_draft);
  const leads = rows("opportunities").filter(
    (x) => !x.archived && !["archived", "declined"].includes(s(x.status)),
  );
  const services = rows("services").filter(
    (x) => x.published === true && !x.archived,
  );
  const [text, setText] = useState(initial || s(draft.text)),
    [role, setRole] = useState(s(draft.role, "auto")),
    [sourceIds, setSourceIds] = useState<string[]>(a<string>(draft.source_ids)),
    [opportunityId, setOpportunityId] = useState(
      s(draft.opportunity_id, leads[0]?.id || ""),
    ),
    [serviceId, setServiceId] = useState(
      s(draft.service_id, services[0]?.id || ""),
    ),
    [result, setResult] = useState<Result | null>(null),
    [busy, setBusy] = useState(false),
    [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);
  const value = {
    text,
    role,
    source_ids: sourceIds,
    opportunity_id: opportunityId,
    service_id: serviceId,
  };
  const [saved, setSaved] = useState(() => JSON.stringify(value));
  const dirty = JSON.stringify(value) !== saved;
  useDirtyGuard(dirty);
  const task =
    taskOptions.find((x) =>
      [x.label.toLowerCase(), x.intent].includes(text.trim().toLowerCase()),
    ) ||
    (text.trim().toLowerCase() === "assess the northstar lead"
      ? taskOptions[0]
      : undefined);
  const promotion = task ? task.role === "promoter" : role === "promoter";
  const sourceTitle = (id: string) =>
    s(record("sources", id)?.label, s(record("sources", id)?.title, id));
  const save = async () => {
    const r = (await command("ui.set", { values: { delegate_draft: value } }));
    if (r.ok) {
      setSaved(JSON.stringify(value));
      notify("Request draft saved.");
    }
    setResult(r);
  };
  const submit = async () => {
    if (submitLock.current || busy) return;
    if (!text.trim()) {
      setResult({
        ok: false,
        message: "Tell your team what you need help with.",
      });
      return;
    }
    if (task && !promotion && !record("opportunities", opportunityId)) {
      setResult({
        ok: false,
        message:
          "Add or select a recorded opportunity before delegating this task.",
      });
      return;
    }
    if (task && promotion && !services.some((x) => x.id === serviceId)) {
      setResult({
        ok: false,
        message:
          "Publish and select a service before asking for a promotion draft.",
      });
      return;
    }
    submitLock.current = true;
    setSubmitting(true);
    try {
    const lead = record("opportunities", opportunityId),
      requirement = record("requirements", s(lead?.requirements_id));
    const refs = sourceIds
      .filter((id) => !!record("sources", id))
      .map((id) => ({
        table: "sources",
        id,
        version: record("sources", id)!.version,
      }));
    if (promotion && record("services", serviceId))
      refs.push({
        table: "services",
        id: serviceId,
        version: record("services", serviceId)!.version,
      });
    else if (requirement)
      refs.push({
        table: "requirements",
        id: requirement.id,
        version: requirement.version,
      });
    const r = (await command("agent.start", {
      role_id: task ? task.role : role,
      intent: task?.intent || text,
      opportunity_id: promotion ? "" : opportunityId,
      service_id: promotion ? serviceId : undefined,
      source_ids: sourceIds,
      input_refs: refs,
    }));
    setResult(r);
    if (r.ok && r.id) {
      setSaved(JSON.stringify(value));
      (await command("ui.set", { values: { delegate_draft: {} } }));
      router.push("/app/team?task=" + r.id);
      onClose();
    }
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : "Your request could not be started. Your draft is still here." });
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };
  return (
    <Modal title="Ask your team" onClose={onClose} closeDisabled={submitting || busy} dirty={dirty}>
      <Form className="stack" noValidate aria-busy={submitting || busy} onSubmit={async (event) => { event.preventDefault(); await submit(); }}>
        <fieldset className="shell-delegate-fields" disabled={submitting || busy}>
        <p className="muted">
          A little help with the business around your work.
        </p>
        <Field
          label="What would you like help with?"
          error={result && !result.ok ? result.message : undefined}
        >
          <textarea
            className="resize-none"
            required
            value={text}
            autoFocus
            onChange={(e) => setText(e.target.value)}
            placeholder="Assess a lead, draft an offer, plan a project…"
          />
        </Field>
        <div className="row">
          {taskOptions.map((v) => (
            <Button
              variant="secondary"
              key={v.intent}
              onClick={() => {
                setText(v.label);
                setRole("auto");
                setResult(null);
              }}
            >
              {v.label}
            </Button>
          ))}
        </div>
        <Field label="Choose teammate">
          <select
            value={task ? task.role : role}
            disabled={!!task}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="auto">Let the team decide</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        {task && (
          <small className="muted">
            This supported task is handled by{" "}
            {roles.find((r) => r.id === task.role)?.name}.
          </small>
        )}
        {promotion ? (
          <Field label="Published service">
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              <option value="">Choose a published service</option>
              {services.map((x) => (
                <option key={x.id} value={x.id}>
                  {s(x.title)}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Linked client request">
            <select
              value={opportunityId}
              onChange={(e) => setOpportunityId(e.target.value)}
            >
              <option value="">Choose a request</option>
              {leads.map((x) => (
                <option key={x.id} value={x.id}>
                  {s(x.title)} · {s(record("clients", s(x.client_id))?.name)}
                </option>
              ))}
            </select>
          </Field>
        )}
        {!promotion && !leads.length && (
          <RecordLink href="/app/opportunities?new=1">
            Add your first lead
          </RecordLink>
        )}
        {promotion && !services.length && (
          <RecordLink href="/app/settings/profile?tab=services">
            Prepare your public services
          </RecordLink>
        )}
        <Field label="Add a saved source">
          <select
            value=""
            onChange={(e) => {
              if (e.target.value && !sourceIds.includes(e.target.value))
                setSourceIds([...sourceIds, e.target.value]);
            }}
          >
            <option value="">Choose a saved source</option>
            {rows("sources")
              .filter((x) => !x.archived && x.status !== "failed")
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {sourceTitle(x.id)}
                </option>
              ))}
          </select>
        </Field>
        <div className="row">
          {sourceIds.map((id) => (
            <span className="source-chip" key={id}>
              {sourceTitle(id)}
              <button
                aria-label={"Remove " + sourceTitle(id)}
                onClick={() => setSourceIds(sourceIds.filter((x) => x !== id))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <Field label="Attach context (PDF, PNG, JPEG or TXT)">
          <input
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.txt"
            disabled={busy}
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              if (files.length > 5) {
                setResult({
                  ok: false,
                  message: "Choose at most five files per upload.",
                });
                return;
              }
              const input = e.currentTarget;
              setBusy(true);
              setResult(null);
              const ids = [...sourceIds];
              for (const file of files) {
                try {
                  const uploaded = await persistUpload(file);
                  const id = "source_" + uploaded.id,
                    attachmentId = "attachment_" + uploaded.id;
                  const content =
                    file.type === "text/plain" ? await file.text() : "";
                  const r = (await command("knowledge.save", {
                    id,
                    source: {
                      label: file.name,
                      kind: "uploaded_file",
                      status: "ready",
                      content: content.slice(0, 30000),
                      content_truncated: content.length > 30000,
                      observed_at: state.sample_clock,
                      factual_status: "owner_provided",
                      extraction_status: content
                        ? "text_retained"
                        : "original_file_retained",
                      attachment_ids: [attachmentId],
                      audience: "owner",
                    },
                    attachment: {
                      id: attachmentId,
                      name: file.name,
                      media_type: file.type,
                      storage_kind: connected ? "private" : "indexeddb",
                      storage_locator: uploaded.id,
                      content_ref: uploaded.id,
                      blob_id: uploaded.id,
                      byte_length: file.size,
                      size_bytes: file.size,
                      mime_type: file.type,
                      availability: "available",
                      source_id: id,
                      sha256: uploaded.sha256,
                      audience: "owner",
                      shared_with_buyer: false,
                    },
                  }));
                  if (r.ok) ids.push(id);
                  else setResult(r);
                } catch (error) {
                  setResult({
                    ok: false,
                    message:
                      error instanceof Error
                        ? error.message
                        : "File could not be saved.",
                  });
                }
              }
              setSourceIds(ids);
              setBusy(false);
              input.value = "";
            }}
          />
        </Field>
        <small className="muted">
          {t(connected
            ? "Up to 5 files, 10 MiB each. Files are saved privately to your workspace and can be used as context for this request."
            : "Up to 5 files, 10 MiB each. Files stay in this browser. Sample tasks do not interpret arbitrary file content.")}
        </small>
        </fieldset>
        {(busy || submitting) && <p className="shell-pending-status" role="status">
          {t(busy ? "Saving your context files…" : "Starting your team’s task. Please wait…")}
        </p>}
        <Feedback result={result} />
        <div className="actions dialog-actions">
          <Button variant="secondary" onClick={save} disabled={busy || submitting}>
            Save request draft
          </Button>
          <Button type="submit" disabled={busy || submitting || !text.trim()}>
            {t(busy ? "Saving files…" : submitting ? "Starting task…" : "Start task")}
            <ArrowRight size={15} />
          </Button>
        </div>
      </Form>
    </Modal>
  );
}

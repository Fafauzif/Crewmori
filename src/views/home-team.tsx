"use client";
import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  FileText,
  Play,
  Pause,
  List,
  Map as MapIcon,
  Compass,
  CheckCircle2,
} from "lucide-react";
import { useStore } from "@/lib/store";
import {
  s,
  n,
  o,
  a,
  label,
  money,
  date,
  type Entity,
  type Result,
} from "@/lib/types";
import {
  Button,
  Panel,
  PageHead,
  LinkButton,
  Badge,
  Modal,
  Confirm,
  SearchBar,
  Field,
  Empty,
  Feedback,
  RecordLink,
  Tabs,
  useQuery,
  Form,
} from "@/components/ui";
import { downloadCsv } from "@/lib/downloads";
import { halfUp } from "@/lib/engine";
import { manualRunHref, runWaitingMessage, selectHomePriority } from "@/lib/home-priority";
export const roles = [
  {
    id: "scout",
    name: "Scout",
    job: "Find & assess",
    color: "#F2C983",
    x: 49,
    y: 43,
  },
  {
    id: "promoter",
    name: "Promoter",
    job: "Grow your presence",
    color: "#EFAF9B",
    x: 51,
    y: 65,
  },
  {
    id: "sales",
    name: "Sales",
    job: "Shape the offer",
    color: "#B9D8EC",
    x: 29,
    y: 59,
  },
  {
    id: "account_manager",
    name: "Account Manager",
    job: "Keep clients close",
    color: "#D3C6E7",
    x: 77,
    y: 69,
  },
  {
    id: "operations",
    name: "Operations",
    job: "Plan your work",
    color: "#C6D4B5",
    x: 70,
    y: 45,
  },
  {
    id: "finance",
    name: "Finance",
    job: "Make money clear",
    color: "#B6D9C6",
    x: 89,
    y: 59,
  },
];
export const roleAsset = (id: string) =>
  `/assets/characters/${id.replace("_", "-")}.svg`;
// Evidence cites "table:id" references; show the record the owner recognizes instead.
const evidenceKinds: Record<string, string> = { opportunities: "Opportunity", requirements: "Requirements", policies: "Business policy", sources: "Knowledge source", services: "Service", offers: "Offer", offer_versions: "Offer version", projects: "Project", clients: "Client", invoices: "Invoice", receipts: "Receipt", profiles: "Profile", contacts: "Contact" };
function EvidenceSource({ sourceId, state }: { sourceId: string; state: ReturnType<typeof useStore>["state"] }) {
  const [table, ...rest] = sourceId.split(":"), id = rest.join(":");
  const rec = state.tables[table]?.[id];
  const kind = evidenceKinds[table] || label(table).replace(/^./, (c) => c.toUpperCase());
  const title = rec ? s(rec.title) || s(rec.label) || s(rec.name) || s(rec.display_name) : "";
  const text = title && title !== kind ? `${kind}: ${title}` : kind;
  const href = recordHref(table, id, state);
  return <small className="muted">({href.startsWith("/app/unavailable") ? text : <Link href={href}>{text}</Link>})</small>;
}
// Intents are either typed instructions or workflow slugs such as "draft_offer".
function taskSummary(run: Entity): string {
  const intent = s(run.intent) || s(run.task_kind);
  const text = /^[a-z0-9_]+$/.test(intent) ? label(intent).replace(/^./, (c) => c.toUpperCase()) : intent.trim();
  return text ? (/[.!?]$/.test(text) ? text : text + ".") : "";
}
function taskTimestamp(value: unknown): string {
  const instant = new Date(s(value));
  return Number.isNaN(instant.getTime()) ? "Not recorded" : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta", timeZoneName: "short" }).format(instant);
}
export function recordHref(
  table: string,
  id: string,
  state?: ReturnType<typeof useStore>["state"],
): string {
  const unavailable =
    "/app/unavailable?record=" + encodeURIComponent(id || "missing");
  if (!id) return unavailable;
  const resolvedTable =
    table ||
    (state
      ? Object.keys(state.tables).find((key) => !!state.tables[key]?.[id])
      : "") ||
    "";
  const rec = state?.tables[resolvedTable]?.[id];
  if (state && !rec) return unavailable;
  const map: Record<string, string> = {
    opportunities: "/app/opportunities/",
    offers: "/app/offers/",
    projects: "/app/projects/",
    clients: "/app/clients/",
    invoices: "/app/money/invoices/",
    receipts: "/app/money/payments/",
    payment_requests: "/app/money/payments/",
  };
  if (map[resolvedTable]) return map[resolvedTable] + encodeURIComponent(id);
  if (resolvedTable === "offer_versions")
    return rec?.offer_id
      ? "/app/offers/" + s(rec.offer_id) + "?version=" + encodeURIComponent(id)
      : unavailable;
  if (resolvedTable === "assessments")
    return rec?.opportunity_id
      ? "/app/opportunities/" + s(rec.opportunity_id) + "?panel=assessment"
      : unavailable;
  if (resolvedTable === "promotions")
    return "/app/promotion?draft=" + encodeURIComponent(id);
  if (resolvedTable === "promotion_versions")
    return rec?.promotion_id
      ? "/app/promotion?draft=" + s(rec.promotion_id)
      : unavailable;
  if (resolvedTable === "work_tasks")
    return rec?.project_id
      ? "/app/projects/" +
          s(rec.project_id) +
          "?tab=tasks&task=" +
          encodeURIComponent(id)
      : unavailable;
  if (resolvedTable === "agent_runs")
    return "/app/team?task=" + encodeURIComponent(id);
  if (resolvedTable === "requirements")
    return rec?.opportunity_id
      ? "/app/opportunities/" + s(rec.opportunity_id)
      : unavailable;
  if (resolvedTable === "team_notes")
    return rec?.offer_id
      ? "/app/offers/" + s(rec.offer_id)
      : rec?.run_id
        ? "/app/team?artifact=" + encodeURIComponent("artifact_" + s(rec.run_id))
        : unavailable;
  if (resolvedTable === "contacts")
    return rec?.client_id ? "/app/clients/" + s(rec.client_id) : unavailable;
  if (resolvedTable === "messages" || resolvedTable === "conversations") {
    const conversation =
      resolvedTable === "messages"
        ? state?.tables.conversations?.[s(rec?.conversation_id)]
        : rec;
    return conversation?.client_id
      ? "/app/clients/" +
          s(conversation.client_id) +
          "?tab=messages" +
          (resolvedTable === "messages"
            ? "&draft=" + encodeURIComponent(id)
            : "")
      : unavailable;
  }
  if (resolvedTable === "sources")
    return "/app/settings/knowledge?source=" + encodeURIComponent(id);
  if (resolvedTable === "artifacts")
    return "/app/team?artifact=" + encodeURIComponent(id);
  if (resolvedTable === "events")
    return "/app/team/activity?event=" + encodeURIComponent(id);
  return unavailable;
}
export function eventHref(
  event: Entity,
  state: ReturnType<typeof useStore>["state"],
): string {
  for (const ref of a<Record<string, unknown>>(event.record_refs)) {
    const href = recordHref(s(ref.table), s(ref.id), state);
    if (!href.startsWith("/app/unavailable")) return href;
  }
  if (event.run_id && state.tables.agent_runs?.[s(event.run_id)])
    return recordHref("agent_runs", s(event.run_id), state);
  return "/app/team/activity?event=" + encodeURIComponent(event.id);
}

export function AskBar({ onAsk }: { onAsk: (text?: string) => void }) {
  const [text, setText] = useState("");
  const { t } = useStore();
  return (
    <Form
      className="ask-bar"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onAsk(text);
      }}
    >
      <Compass size={18} color="var(--forest)" aria-hidden="true" />
      <input
        aria-label={t("Ask your team")}
        placeholder={t("Ask your team anything…")}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Button type="submit" variant="secondary">
        {t("Delegate")}
        <ArrowRight size={16} />
      </Button>
    </Form>
  );
}
export function PriorityCard() {
  const { state, record, rows, t } = useStore();
  const priority = selectHomePriority(state);
  if (priority && priority.kind !== "offer") {
    const item = priority.record;
    const client = record("clients", s(item.client_id));
    const invoice = priority.kind === "invoice";
    const task = priority.kind === "task";
    const reschedule = priority.reason === "reschedule";
    const taskReview = task && priority.reason === "review";
    const title = invoice ? "An invoice needs a follow-up." : taskReview ? "Your team prepared something to review." : task ? "Your team needs a little direction." : reschedule ? "Your project needs a new plan." : "Check what this project needs before it starts.";
    const description = invoice ? "Its due date has passed and an outstanding balance remains. Review the invoice and recorded receipts before deciding how to follow up." : taskReview ? "Open the prepared output and review it before saving a business draft. Nothing is sent by reviewing it." : task ? "This request is saved and waiting for your input. Open it to clarify the next step." : reschedule ? "The saved schedule needs attention. Review the current scope, prerequisites and dates before committing to new timing." : "An agreement is in place, but prerequisites are still open. Check the deposit and buyer inputs before starting professional delivery.";
    return <Panel className="priority-card home-next-decision" aria-label={t("Your next decision")}>
      <div className="decision-meta"><Badge tone="warning">{t(invoice ? "Past due" : taskReview ? "Ready for review" : task ? "Needs your input" : reschedule ? "Needs attention" : "Prerequisites open")}</Badge><span className="muted">{s(client?.name)}</span></div>
      <h2>{t(title)}</h2><p className="home-decision-record">{s(item.number) || s(item.title) || s(item.name) || (task ? label(item.role_id) + " task" : "Saved project")}</p>
      <p>{t(description)}</p><div className="actions"><LinkButton href={invoice ? `/app/money/invoices/${item.id}` : task ? `/app/team?task=${item.id}` : `/app/projects/${item.id}`}>{t(invoice ? "Review invoice" : task ? "Open task" : "Open project checklist")}<ArrowRight size={16} /></LinkButton></div>
    </Panel>;
  }
  const offer = priority?.record;
  const v = record("offer_versions", s(offer?.current_version_id));
  if (!offer || !v)
    return (
      <Panel className="priority-card">
        <Empty
          title="No decisions waiting here."
          description="Your saved work is available whenever you need it. Explore opportunities when you are ready for something new."
        >
          <LinkButton href="/app/opportunities">
            Explore opportunities
          </LinkButton>
        </Empty>
      </Panel>
    );
  const terms = o(v.terms),
    price = o(v.price),
    request = record("requirements", s(v.requirements_id)),
    client = record("clients", s(offer.client_id)),
    lead = record("opportunities", s(offer.opportunity_id));
  const contact = record(
    "contacts",
    s(lead?.contact_id, s(a<string>(client?.contact_ids)[0])),
  );
  const accepted = offer.status === "accepted",
    shared = offer.status === "shared",
    approved = offer.status === "approved",
    review = offer.status === "awaiting_review";
  const project = rows("projects").find(
    (p) => p.offer_id === offer.id || p.opportunity_id === offer.opportunity_id,
  );
  const deposit = {
    ...price,
    amount_minor: halfUp(
      n(price.amount_minor),
      n(terms.deposit_basis_points),
      10000,
    ),
  };
  const requestedCount = n(request?.requested_asset_count),
    offeredCount = a<Record<string, unknown>>(v.deliverables).reduce(
      (sum, d) => sum + n(d.quantity, 1),
      0,
    ),
    narrowed = requestedCount > offeredCount && offeredCount > 0;
  const headline = accepted
    ? `An agreement in place with ${s(client?.name, "your client")}.`
    : shared
      ? "Your offer is with the buyer."
      : approved
        ? "The terms are approved. You choose when to share."
        : review && narrowed
          ? "A smaller scope. A better fit for your week."
          : review
            ? "A clear offer, ready for your judgment."
            : offer.status === "draft"
              ? "Your offer draft is ready."
              : `This offer is ${label(offer.status)}.`;
  const intro = accepted
    ? `Follow the saved project checklist for deposit, inputs, and delivery. ${project?.committed_start_at ? "Your agreed dates are recorded in Work." : "A start date is not committed until the prerequisites are satisfied."}`
    : shared
      ? "The buyer can review the exact shared terms, request changes, or accept. No payment is implied by sharing."
      : approved
        ? "Your exact-version approval is saved. Preview the buyer-safe document and share it when you are ready."
        : `The current proposal includes ${offeredCount} deliverable${offeredCount === 1 ? "" : "s"}${v.price ? " for " + money(v.price) : ", with price still to confirm"}${terms.delivery_business_days ? " over " + n(terms.delivery_business_days) + " business days" : ", with timing still to confirm"}. Your review decides the next step.`;
  return (
    <Panel className="priority-card">
      <div className="decision-meta">
        <div className="row">
          <Badge tone={accepted ? "success" : review ? "warning" : "info"}>
            {t(review ? "Needs your review" : label(offer.status))}
          </Badge>
          <span className="muted">
            {s(client?.name)}
            {contact ? " · " + s(contact.display_name, s(contact.name)) : ""}
          </span>
        </div>
        <small className="muted">{date(v.updated_at)}</small>
      </div>
      <div className="decision-layout">
        <div className="decision-copy">
          <h2>{headline}</h2>
          <p>{intro}</p>
          <details className="decision-evidence">
            <summary>{t("Compare request and offer")}</summary>
            <div className="comparison">
              <div>
                <span className="eyebrow">{t("Original request")}</span>
                <strong>
                  {requestedCount
                    ? requestedCount + " requested assets"
                    : a<string>(request?.deliverables).join(", ") ||
                      "Scope to clarify"}
                  {request?.budget
                    ? " · " + money(request.budget)
                    : " · Budget to clarify"}
                </strong>
                <p>
                  {request?.delivery_business_days
                    ? n(request.delivery_business_days) +
                      " business days requested."
                    : "Requested timing remains open."}
                </p>
              </div>
              <div>
                <span className="eyebrow">{t("Proposed offer")}</span>
                <strong>{s(v.title)}</strong>
                <p>
                  {v.price ? money(v.price) : "Price to confirm"}
                  {terms.delivery_business_days
                    ? " · " + n(terms.delivery_business_days) + " business days"
                    : ""}
                  {v.estimated_effort_minutes
                    ? " · " +
                      n(v.estimated_effort_minutes) / 60 +
                      " estimated hours"
                    : ""}
                </p>
              </div>
            </div>
          </details>
        </div>
        <aside className="term-summary">
          <span className="eyebrow">{t("At a glance")}</span>
          <dl>
            <dt>{t("Project total")}</dt>
            <dd className="term-total">
              {v.price ? money(v.price) : "To confirm"}
            </dd>
            <dt>
              {t("Deposit")}
              {v.terms ? " (" + n(terms.deposit_basis_points) / 100 + "%)" : ""}
            </dt>
            <dd>{v.price && v.terms ? money(deposit) : "To confirm"}</dd>
            <dt>{t("Delivery")}</dt>
            <dd>
              {terms.delivery_business_days
                ? n(terms.delivery_business_days) + " business days"
                : "To confirm"}
            </dd>
          </dl>
          <LinkButton
            href={
              accepted && project
                ? "/app/projects/" + project.id
                : "/app/offers/" + offer.id
            }
          >
            {t(
              accepted && project
                ? "Open project"
                : approved
                  ? "Preview offer"
                  : shared
                    ? "Open offer"
                    : "Review offer",
            )}
            <ArrowRight size={16} />
          </LinkButton>
          {!accepted && (
            <LinkButton
              href={"/app/offers/" + offer.id + "?edit=1"}
              variant="secondary"
            >
              {t("Adjust terms")}
            </LinkButton>
          )}
        </aside>
      </div>
    </Panel>
  );
}
export function Home({ onAsk }: { onAsk: (text?: string) => void }) {
  const { state, rows, record, command, t } = useStore();
  const policy = record("policies", "policy_business"),
    owner = record("owners", "owner_alya");
  const dismissed = a<string>(state.ui.dismissed_updates),
    saved = rows("events")
      .filter(
        (e) => roles.some((r) => r.id === e.role_id) && e.kind !== "ui.set",
      )
      .sort((x, y) => n(y.sequence) - n(x.sequence));
  const updates = saved
    .filter(
      (item, index) =>
        saved.findIndex((x) => x.role_id === item.role_id) === index,
    )
    .slice(0, 3);
  const visibleUpdates = updates.filter((item) => !dismissed.includes(item.id));
  const reviewCount = rows("offers").filter((x) =>
    ["awaiting_review", "draft"].includes(s(x.status)),
  ).length;
  const receipts = rows("receipts"),
    hasLeads = rows("opportunities").length > 0;
  const hasWork = hasLeads || rows("projects").length > 0 || rows("invoices").length > 0;
  return (
    <>
      <AskBar onAsk={onAsk} />
      <Panel className={`home-hero${hasWork ? " home-hero-returning" : ""}`}>
        <div>
          <div className="eyebrow">{t("Studio briefing")}</div>
          <h1>
            {t("Welcome back")}, {s(owner?.display_name, "there")}.
          </h1>
          <p className="intro">
            {hasWork
                ? "Your saved work, and the next decision that needs you."
                : "A fresh workspace, and a team ready to help you begin."}
          </p>
          <div className="hero-stats">
            <span>
              {typeof policy?.available_effort_minutes === "number" ? <><strong>{n(policy.available_effort_minutes) / 60}h</strong> studio capacity</> : "Studio capacity not set"}
            </span>
            <span>
              <strong>{reviewCount}</strong>{" "}
              {t(reviewCount === 1 ? "offer to review" : "offers to review")}
            </span>
            <span>
              <strong>{receipts.length}</strong> recorded{" "}
              {receipts.length === 1 ? "receipt" : "receipts"}
            </span>
          </div>
        </div>
        <div className="scout-portrait">
          <img
            src="/assets/characters/scout-hero.svg"
            alt="Scout, your illustrated opportunity specialist"
          />
          <p>
            {hasLeads ? (
              <>
                A client request.
                <br />A thoughtful next step.
              </>
            ) : (
              <>
                A little possibility.
                <br />A place to begin.
              </>
            )}
          </p>
          <span className="eyebrow">Scout · your opportunity specialist</span>
        </div>
      </Panel>
      <PriorityCard />
      <div className="section-heading">
        <h2>{t("While you were away")}</h2>
        <small>Saved updates from your team</small>
      </div>
      {visibleUpdates.length ? (
        <div className="home-updates">
          {visibleUpdates.map((u) => (
            <article className={`update-card ${s(u.role_id)}`} key={u.id}>
              <div className="update-head">
                <img src={roleAsset(s(u.role_id))} alt="" />
                <div>
                  <strong>
                    {roles.find((r) => r.id === u.role_id)?.name || "Team"}
                  </strong>
                  <small>{date(u.occurred_at)}</small>
                </div>
                <button
                  style={{ marginLeft: "auto" }}
                  aria-label={`Dismiss ${label(u.role_id)} update`}
                  onClick={async () =>
                    (await command("ui.set", {
                      values: { dismissed_updates: [...dismissed, u.id] },
                    }))
                  }
                >
                  ×
                </button>
              </div>
              <h3>
                {t(
                  (
                    {
                      "offer.review_requested": "Offer ready for review",
                      "assessment.completed": "Assessment ready",
                      "source.recorded": "Request saved",
                    } as Record<string, string>
                  )[s(u.kind)] ||
                    label(u.kind).replace(/^./, (letter) =>
                      letter.toUpperCase(),
                    ),
                )}
              </h3>
              <p>{s(u.summary)}</p>
              <RecordLink href={eventHref(u, state)}>
                Open saved update
              </RecordLink>
            </article>
          ))}
        </div>
      ) : (
        <Panel>
          <p className="muted">
            {dismissed.length
              ? t("You’re all caught up. Restore dismissed updates below.")
              : t(
                  "Your crew’s saved updates will appear here as work progresses.",
                )}
          </p>
        </Panel>
      )}
      {dismissed.length > 0 && (
        <Button
          variant="ghost"
          onClick={async () =>
            (await command("ui.set", { values: { dismissed_updates: [] } }))
          }
        >
          Undo dismissed updates
        </Button>
      )}
      <Panel className="crew-strip">
        <div>
          <h3>{t("Your business team")}</h3>
          <small className="muted">Six specialists, on your side.</small>
        </div>
        <div className="crew-chips">
          {roles.map((r) => (
            <Link
              href={"/app/team?agent=" + r.id}
              className="crew-chip"
              key={r.id}
            >
              <img src={roleAsset(r.id)} alt="" />
              {r.name}
              <ArrowUpRight size={12} />
            </Link>
          ))}
        </div>
      </Panel>
    </>
  );
}
export function Team({ onAsk }: { onAsk: (text?: string) => void }) {
  const { state, record, rows, command, t, connected, refresh } = useStore();
  const router = useRouter(),
    query = useSearchParams();
  const [list, setList] = useState(false),
    [cancel, setCancel] = useState(false),
    [result, setResult] = useState<Result | null>(null),
    [clarify, setClarify] = useState("assess_opportunity");
  const agent = query.get("agent"),
    task = query.get("task"),
    artifact = query.get("artifact"),
    handoff = query.get("handoff");
  const selectedRole = roles.find((r) => r.id === agent);
  const latestRunEvent = (id: string) =>
    Math.max(
      0,
      ...rows("events")
        .filter(
          (e) =>
            e.run_id === id ||
            a<Record<string, unknown>>(e.record_refs).some((r) => r.id === id),
        )
        .map((e) => n(e.sequence)),
    );
  const runs = rows("agent_runs").sort(
    (x, y) =>
      latestRunEvent(x.id) - latestRunEvent(y.id) ||
      Date.parse(s(x.updated_at)) - Date.parse(s(y.updated_at)) ||
      x.id.localeCompare(y.id),
  );
  const selectedRun = task
    ? record("agent_runs", task)
    : runs.filter((r) => r.role_id === agent).at(-1);
  const [taskClock, setTaskClock] = useState("");
  const activeRunId = selectedRun?.id;
  const activeRunStatus = s(selectedRun?.status);
  useEffect(() => {
    if (!connected || !activeRunId || !["queued", "running"].includes(activeRunStatus)) return;
    const tick = () => setTaskClock(new Date().toISOString());
    tick();
    const timer = window.setInterval(tick, 30000);
    return () => window.clearInterval(timer);
  }, [connected, activeRunId, activeRunStatus]);
  const runMessage = selectedRun ? runWaitingMessage(selectedRun, connected ? taskClock || state.sample_clock : state.sample_clock) : undefined;
  const blockedCopy: Record<string, string> = {
    WORKER_INTERRUPTED: "This attempt stopped before finishing. Check the latest state before deciding whether to retry.",
    BUDGET_EXHAUSTED: "The workspace’s daily AI allowance cannot cover this task. You can continue manually or try again after the allowance resets.",
    UNKNOWN_MODEL_OUTCOME: "The previous attempt has no confirmed result. Review its saved activity before retrying; another attempt can use additional allowance.",
    PROVIDER_UNAVAILABLE: "The AI service could not finish this request. Check the status, or continue manually while it is unavailable.",
    STALE_VERSION: "A source changed while this task was being prepared. Open the current record before retrying.",
  };
  const prefs = record("preferences", "preferences_alya");
  const motionPaused =
    !!prefs?.team_animation_paused ||
    s(prefs?.motion) === "reduced" ||
    s(prefs?.focus_mode) === "focus";
  const artifacts = rows("artifacts");
  const close = () => router.push("/app/team", { scroll: false });
  const action = async (act: string) => {
    if (selectedRun) {
      const result = (await command("agent.control", {
        id: selectedRun.id,
        action: act,
        control_version: selectedRun.control_version,
        expected_version: selectedRun.version,
      }));
      setResult(result);
      if (result.ok && act === "retry" && result.id)
        router.push("/app/team?task=" + result.id, { scroll: false });
    }
  };
  const select = (id: string) =>
    router.push("/app/team?agent=" + id, { scroll: false });
  const status = (id: string) =>
    label(runs.filter((r) => r.role_id === id).at(-1)?.status) || "Resting";
  const featuredOffer =
    rows("offers").find((x) => x.status === "awaiting_review") ||
    rows("offers")[0];
  const inbound =
    record("opportunities", s(featuredOffer?.opportunity_id)) ||
    rows("opportunities").find((x) => !x.archived);
  const inboundClient = record("clients", s(inbound?.client_id)),
    inboundReq = record("requirements", s(inbound?.requirements_id));
  const scoutFinding = rows("assessments").find(
    (x) =>
      x.role_id === "scout" &&
      x.opportunity_id === inbound?.id &&
      x.status === "current",
  );
  const operationsFinding = rows("assessments").find(
    (x) =>
      x.role_id === "operations" &&
      x.opportunity_id === inbound?.id &&
      x.status === "current",
  );
  return (
    <>
      <div className="team-heading">
        <div>
          <h1>{t("Your team, at work.")}</h1>
          <p className="intro">
            {t("Here’s what’s moved forward—and where your team needs you.")}
          </p>
        </div>
        <AskBar onAsk={onAsk} />
      </div>
      <div className="row between" style={{ marginBottom: 18 }}>
        <Tabs
          items={[
            { label: t("Overview"), href: "/app/team" },
            { label: t("Activity"), href: "/app/team/activity" },
          ]}
        />
        <div className="actions">
          <Button variant="secondary" onClick={() => setList(!list)}>
            {list ? <MapIcon size={15} /> : <List size={15} />}{" "}
            {list ? t("Map view") : t("List view")}
          </Button>
          <Button
            variant="ghost"
            onClick={async () =>
              (await command("record.save", {
                table: "preferences",
                id: "preferences_alya",
                expected_version: prefs?.version,
                values: {
                  team_animation_paused: !prefs?.team_animation_paused,
                },
              }))
            }
          >
            {prefs?.team_animation_paused ? (
              <Play size={15} />
            ) : (
              <Pause size={15} />
            )}{" "}
            {prefs?.team_animation_paused
              ? "Resume animation"
              : "Pause animation"}
          </Button>
        </div>
      </div>
      <section
        className={`studio ${list ? "list-mode" : ""}`}
        aria-label="Global Studio"
      >
        <div className="studio-header">
          <span className="studio-label">
            <i />
            Global Studio <span className="muted">· Your business team</span>
          </span>
          <span className="studio-label">
            Studio base:{" "}
            {s(
              record("workspaces", "workspace_alya")?.timezone,
              "Asia/Jakarta",
            )}
          </span>
        </div>
        <div className="studio-desktop">
          <img
            className="studio-map"
            src="/assets/demo/team-worldmap.svg"
            alt=""
          />
          <svg
            className="studio-lines"
            viewBox="0 0 1200 600"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M220 160 C370 130 350 320 580 258"
              fill="none"
              stroke="#F2C983"
              strokeWidth="2"
              strokeDasharray="4 6"
            />
            <path
              d="M590 280 C730 350 720 250 840 280 S1030 290 1060 355"
              fill="none"
              stroke="#B6D9C6"
              strokeWidth="2"
              strokeDasharray="4 6"
            />
            <path
              d="M840 300 C900 380 920 450 650 500"
              fill="none"
              stroke="#245C47"
              strokeWidth="2"
              strokeDasharray="4 7"
            />
            <path
              d="M390 380 C500 480 530 440 650 500"
              fill="none"
              stroke="#EFAF9B"
              strokeWidth="2"
              strokeDasharray="4 6"
            />
          </svg>
          {inbound ? (
            <button
              className="inbound-node"
              onClick={() => router.push("/app/opportunities/" + inbound.id)}
            >
              <span className="eyebrow">
                Client inquiry · {s(inboundClient?.name)}
              </span>
              <strong>
                {s(inbound.title)} <ArrowUpRight size={13} />
              </strong>
              <small className="muted">
                {inboundReq?.budget
                  ? money(inboundReq.budget) + " requested budget"
                  : "Budget to clarify"}
              </small>
            </button>
          ) : (
            <button
              className="inbound-node"
              onClick={() => router.push("/app/opportunities")}
            >
              <span className="eyebrow">Your next opportunity</span>
              <strong>
                Ready for a first request <ArrowUpRight size={13} />
              </strong>
              <small className="muted">
                Add a lead to give your crew a starting point.
              </small>
            </button>
          )}
          {scoutFinding && (
            <div
              className="studio-bubble"
              style={{ left: "49%", top: "25%", borderColor: "var(--scout)" }}
            >
              <div className="eyebrow">
                Saved ·{" "}
                {date(scoutFinding.updated_at || scoutFinding.created_at)}
              </div>
              <p title={s(scoutFinding.summary)}>
                “{s(scoutFinding.summary).slice(0, 95)}
                {s(scoutFinding.summary).length > 95 ? "…" : ""}”
              </p>
            </div>
          )}
          {operationsFinding && (
            <div
              className="studio-bubble"
              style={{
                left: "71%",
                top: "28%",
                borderColor: "var(--operations)",
              }}
            >
              <div className="eyebrow">
                Saved ·{" "}
                {date(
                  operationsFinding.updated_at || operationsFinding.created_at,
                )}
              </div>
              <p title={s(operationsFinding.summary)}>
                “{s(operationsFinding.summary).slice(0, 95)}
                {s(operationsFinding.summary).length > 95 ? "…" : ""}”
              </p>
            </div>
          )}
          {roles.map((r) => (
            <button
              key={r.id}
              className={`studio-node ${agent === r.id ? "selected" : ""}`}
              aria-pressed={agent === r.id}
              style={
                {
                  left: r.x + "%",
                  top: r.y + "%",
                  "--role": r.color,
                } as CSSProperties
              }
              onClick={() => select(r.id)}
              aria-label={`Inspect ${r.name}: ${status(r.id)}`}
            >
              <span className="node-art">
                <img src={roleAsset(r.id)} alt="" />
              </span>
              <strong>{r.name}</strong>
              <small>{r.job}</small>
              <span className="badge">{status(r.id)}</span>
            </button>
          ))}
          <div className="owner-node">
            <span className="owner-avatar">
              {s(record("owners", "owner_alya")?.display_name, "A").slice(0, 1)}
            </span>
            <div>
              <strong>
                {s(
                  record("profiles", "profile_alya")?.public_name,
                  "Alya Studio",
                )}
              </strong>
              <small>You make the final call.</small>
            </div>
            <CheckCircle2 color="var(--forest)" size={19} />
          </div>
          {!motionPaused &&
            runs
              .filter((r) => s(r.status) === "running")
              .slice(0, 2)
              .map((r, i) => (
                <div
                  key={r.id + ":" + r.progress_step}
                  className={`cursor-tag ${i ? "second" : ""}`}
                >
                  {roles.find((x) => x.id === r.role_id)?.name} ·{" "}
                  {label(r.status)}
                </div>
              ))}
        </div>
        <div className="team-list">
          {roles.map((r) => (
            <button
              key={r.id}
              className={`team-list-item ${agent === r.id ? "selected" : ""}`}
              aria-pressed={agent === r.id}
              onClick={() => select(r.id)}
            >
              <img src={roleAsset(r.id)} alt="" />
              <strong>{r.name}</strong>
              <small>{r.job}</small>
              <Badge>{status(r.id)}</Badge>
            </button>
          ))}
        </div>
        <div className="studio-footer">
          <strong>Handoff thread</strong>
          {rows("handoffs")
            .slice(0, 3)
            .map((h) => (
              <button
                key={h.id}
                onClick={() =>
                  router.push("/app/team?handoff=" + h.id, { scroll: false })
                }
              >
                {
                  roles.find(
                    (r) =>
                      r.id === record("agent_runs", s(h.from_run_id))?.role_id,
                  )?.name
                }{" "}
                <ArrowRight size={10} />
                {roles.find(
                  (r) => r.id === record("agent_runs", s(h.to_run_id))?.role_id,
                )?.name || "Receiving teammate"}
              </button>
            ))}
        </div>
      </section>
      <div className={`team-below${artifacts.length ? "" : " team-below-single"}`}>
        <PriorityCard />
        {artifacts.length > 0 && <Panel className="artifact-list">
          <div className="eyebrow">
            Ready to open · {artifacts.length} artifacts
          </div>
          {artifacts.slice(0, 4).map((item) => (
            <RecordLink
              key={item.id}
              href={recordHref(
                s(o(item.record_ref).table),
                s(o(item.record_ref).id),
                state,
              )}
            >
              <span className="row">
                <span className="artifact-icon">
                  <FileText size={18} />
                </span>
                <span>
                  {s(item.title)}
                  <small>
                    {label(item.role_id)} · {label(item.status)}
                  </small>
                </span>
              </span>
            </RecordLink>
          ))}
        </Panel>}
      </div>
      {(agent || task) && (
        <Modal
          title={
            selectedRole?.name || s(selectedRun?.title, "Teammate unavailable")
          }
          onClose={close}
        >
          {selectedRun ? (
            <div className="stack">
              <div className="row">
                <img
                  src={roleAsset(s(selectedRun.role_id))}
                  width={55}
                  height={65}
                  alt=""
                />
                <div>
                  <h3>{s(selectedRun.title) || (roles.find((role) => role.id === selectedRun.role_id)?.name || "Team") + " request"}</h3>
                  <Badge
                    tone={selectedRun.status === "failed" ? "error" : "info"}
                  >
                    {runMessage?.title || label(selectedRun.status)}
                  </Badge>
                </div>
              </div>
              <p className="muted">
                {taskSummary(selectedRun)} This task supports your business;
                professional delivery remains yours.
              </p>
              <p className={runMessage?.delayed ? "feedback warning" : "team-task-status"}>{runMessage?.description}</p>
              {selectedRun.blocked_reason ? (
                <div className="feedback error"><p>{blockedCopy[s(selectedRun.blocked_reason)] || "This task needs attention before it can continue. Review the saved details or continue manually."}</p><details><summary>Technical details</summary><code>{s(selectedRun.blocked_reason)}</code></details></div>
              ) : null}
              <div className="row">
                <small>
                  {/* Connected runs report state and timestamps, not sample step counters. */}
                  {selectedRun.progress_total !== undefined
                    ? `Step ${n(selectedRun.progress_step)} of ${n(selectedRun.progress_total, 3)} · Attempt ${n(selectedRun.attempt, 1)}`
                    : `Requested ${taskTimestamp(selectedRun.created_at)} · Last activity ${taskTimestamp(selectedRun.updated_at)}`}
                </small>
              </div>
              <div className="actions">
                {connected && ["queued", "running", "blocked", "failed"].includes(s(selectedRun.status)) && <Button variant="secondary" onClick={async () => { await refresh(); }}>Check status</Button>}
                {["queued", "running"].includes(s(selectedRun.status)) && (
                  <>
                    {!connected && <Button onClick={async () => (await action("checkpoint"))}>Run next sample step</Button>}
                    <Button variant="secondary" onClick={async () => (await action("pause"))}>
                      Pause task
                    </Button>
                  </>
                )}
                {selectedRun.status === "paused" && (
                  <Button onClick={async () => (await action("resume"))}>Resume task</Button>
                )}
                {["failed", "blocked"].includes(s(selectedRun.status)) && (
                  <Button onClick={async () => (await action("retry"))}>Retry task</Button>
                )}
                {!["completed", "cancelled", "failed"].includes(
                  s(selectedRun.status),
                ) && (
                  <Button variant="ghost" onClick={() => setCancel(true)}>
                    Cancel task
                  </Button>
                )}
              </div>
              {["queued", "running", "blocked", "failed"].includes(s(selectedRun.status)) && <p><RecordLink href={manualRunHref(selectedRun, state)}>Continue in the workspace manually</RecordLink><small className="muted"> Your saved request stays available. Cancel it if you no longer need its result.</small></p>}
              {selectedRun.status === "waiting_input" && (
                <div className="stack">
                  <p>
                    This request is saved. Choose one supported task, or make a
                    manual draft.
                  </p>
                  <Field label="What should the team prepare?">
                    <select
                      value={clarify}
                      onChange={(e) => setClarify(e.target.value)}
                    >
                      {[
                        "assess_opportunity",
                        "draft_offer",
                        "draft_followup",
                        "draft_promotion",
                        "plan_project",
                        "inspect_invoice",
                      ].map((x) => (
                        <option key={x} value={x}>
                          {label(x)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="actions">
                    <Button
                      onClick={async () => {
                        setResult(
                          (await command("agent.control", {
                            id: selectedRun.id,
                            action: "clarify",
                            intent: clarify,
                            expected_version: selectedRun.version,
                            control_version: selectedRun.control_version,
                          })),
                        );
                      }}
                    >
                      Continue task
                    </Button>
                    <LinkButton href={manualRunHref(selectedRun, state)} variant="secondary">
                      Continue manually
                    </LinkButton>
                    <Button variant="ghost" onClick={close}>
                      Decide later
                    </Button>
                  </div>
                </div>
              )}
              <Feedback result={result} />
              <h3>Saved outputs</h3>
              {a<string>(selectedRun.output_artifact_ids).map((id) => {
                const artifact = record("artifacts", id);
                return artifact ? (
                  <RecordLink
                    key={id}
                    href={
                      // Unreviewed artifacts have no business record yet; open the review first.
                      s(o(artifact.record_ref).id)
                        ? recordHref(
                            s(o(artifact.record_ref).table),
                            s(o(artifact.record_ref).id),
                            state,
                          )
                        : recordHref("artifacts", id, state)
                    }
                  >
                    {s(artifact.title)}
                  </RecordLink>
                ) : null;
              })}
              {!a(selectedRun.output_artifact_ids).length && (
                <p className="muted">
                  Outputs appear here after their step is saved.
                </p>
              )}
              <details>
                <summary>Sources and recent events</summary>
                {a<string>(selectedRun.source_ids).map((id) => (
                  <RecordLink key={id} href={recordHref("sources", id, state)}>
                    {s(
                      record("sources", id)?.label,
                      s(record("sources", id)?.title, id),
                    )}
                  </RecordLink>
                ))}
                {rows("events")
                  .filter(
                    (e) =>
                      e.run_id === selectedRun.id ||
                      e.role_id === selectedRun.role_id,
                  )
                  .slice(-3)
                  .map((e) => (
                    <p key={e.id}>{s(e.summary)}</p>
                  ))}
              </details>
              <Button
                variant="secondary"
                onClick={() => onAsk("Follow up on " + s(selectedRun.title))}
              >
                Ask a follow-up
              </Button>
            </div>
          ) : selectedRole && !task ? (
            <div className="stack">
              <img
                src={roleAsset(selectedRole.id)}
                alt=""
                width={80}
                height={90}
              />
              <h3>Ready when you need a hand.</h3>
              <p>
                {selectedRole.name} has no active task. Ask your team to prepare
                an internal draft or review.
              </p>
              <Button
                onClick={() =>
                  onAsk(
                    (
                      {
                        scout: "Assess a lead",
                        promoter: "Draft a promotion",
                        sales: "Draft an offer",
                        operations: "Plan a project",
                        finance: "Inspect an invoice",
                        account_manager: "Draft a follow-up",
                      } as Record<string, string>
                    )[selectedRole.id],
                  )
                }
              >
                Start a task
              </Button>
            </div>
          ) : (
            <Empty
              title="This teammate or task could not be found"
              description="Choose one of the six teammates in your studio."
            />
          )}
        </Modal>
      )}
      {cancel && selectedRun && (
        <Confirm
          title="Cancel remaining work?"
          description="Saved outputs and completed actions stay available. Only the remaining steps stop."
          confirmLabel="Cancel remaining work"
          onClose={() => setCancel(false)}
          onConfirm={async () => {
            (await action("cancel"));
            setCancel(false);
          }}
        />
      )}
      {artifact && (
        <Modal title="Saved artifact" onClose={close}>
          {record("artifacts", artifact) ? (
            <>
              <h3>{s(record("artifacts", artifact)?.title)}</h3>
              <p>
                {s(
                  record("artifacts", artifact)?.summary,
                  "This saved result is linked to its originating task.",
                )}
              </p>
              {connected && <>
                <h4>Evidence</h4><ul>{a<{ text: string; sourceId: string }>(record("artifacts", artifact)?.facts).map((fact, index) => <li key={index}>{fact.text} <EvidenceSource sourceId={fact.sourceId} state={state} /></li>)}</ul>
                <h4>Unknowns</h4><ul>{a<string>(record("artifacts", artifact)?.unknowns).map((text, index) => <li key={index}>{text}</li>)}</ul>
                <h4>Recommendations</h4><ul>{a<string>(record("artifacts", artifact)?.recommendations).map((text, index) => <li key={index}>{text}</li>)}</ul>
                {record("artifacts", artifact)?.status !== "applied" && <Button onClick={async () => { const item = record("artifacts", artifact); const outcome = await command("artifact.apply", { id: item?.run_id, expected_version: item?.version, confirmed: true }); setResult(outcome); }}>Save reviewed business draft</Button>}
                <Feedback result={result} />
              </>}
              {s(o(record("artifacts", artifact)?.record_ref).id) && (
                <RecordLink
                  href={recordHref(
                    s(o(record("artifacts", artifact)?.record_ref).table),
                    s(o(record("artifacts", artifact)?.record_ref).id),
                    state,
                  )}
                >
                  Open the saved result
                </RecordLink>
              )}
              <RecordLink
                href={recordHref(
                  "agent_runs",
                  s(record("artifacts", artifact)?.creator_run_id),
                  state,
                )}
              >
                Inspect its task
              </RecordLink>
            </>
          ) : (
            <Empty
              title="Artifact unavailable"
              description="The link may refer to another sample scenario."
            />
          )}
        </Modal>
      )}
      {handoff && (
        <Modal title="A handoff between teammates" onClose={close}>
          {(() => {
            const h = record("handoffs", handoff);
            if (!h) return <Empty title="Handoff unavailable" />;
            return (
              <div className="stack">
                <h3>
                  {label(record("agent_runs", s(h.from_run_id))?.role_id)} →{" "}
                  {label(record("agent_runs", s(h.to_run_id))?.role_id)}
                </h3>
                <Badge>{label(h.status)}</Badge>
                <p>{s(record("artifacts", s(h.artifact_id))?.title)}</p>
                <small>{date(h.created_at)}</small>
                <LinkButton href={"/app/team?task=" + s(h.to_run_id)}>
                  Inspect receiving task
                </LinkButton>
              </div>
            );
          })()}
        </Modal>
      )}
    </>
  );
}
const localDay = (value: unknown, timezone: string) => {
  const d = new Date(s(value));
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timezone,
  }).formatToParts(d);
  return ["year", "month", "day"]
    .map((type) => parts.find((x) => x.type === type)?.value)
    .join("-");
};
export function Activity() {
  const { state, rows, t } = useStore();
  const { query, setQuery } = useQuery();
  const [range, setRange] = useState(false),
    [from, setFrom] = useState(query.get("from") || ""),
    [to, setTo] = useState(query.get("to") || ""),
    [error, setError] = useState(""),
    [inspect, setInspect] = useState<Entity | null>(null);
  const timezone = s(
    state.tables.workspaces.workspace_alya?.timezone,
    "Asia/Jakarta",
  );
  const selectedEvent =
    inspect ||
    (query.get("event") ? state.tables.events[query.get("event")!] : null);
  const q = query.get("q") || "",
    role = query.get("role") || "",
    kind = query.get("kind") || "",
    requestedPage = Math.max(1, Number(query.get("page")) || 1);
  const all = rows("events")
    .filter(
      (e) =>
        (!q || s(e.summary).toLowerCase().includes(q.toLowerCase())) &&
        (!role || e.role_id === role) &&
        (!kind || s(e.kind).includes(kind)) &&
        (!query.get("from") ||
          localDay(e.occurred_at, timezone) >= query.get("from")!) &&
        (!query.get("to") ||
          localDay(e.occurred_at, timezone) <= query.get("to")!),
    )
    .sort((x, y) => n(y.sequence) - n(x.sequence));
  const page = Math.min(requestedPage, Math.max(1, Math.ceil(all.length / 10)));
  return (
    <>
      <PageHead
        title={t("Team activity")}
        description="A saved history of the work behind your next step."
        action={
          <Button
            variant="secondary"
            onClick={() =>
              downloadCsv(
                "Crewmori_activity.csv",
                ["Time", "Teammate", "Event", "Summary"],
                all.map((e) => [
                  s(e.occurred_at),
                  s(e.role_id),
                  s(e.kind),
                  s(e.summary),
                ]),
              )
            }
          >
            Export activity
          </Button>
        }
      />
      <Tabs
        items={[
          { label: "Overview", href: "/app/team" },
          { label: "Activity", href: "/app/team/activity" },
        ]}
      />
      <div className="filter-row">
        <SearchBar
          value={q}
          onChange={(v) => setQuery({ q: v, page: null })}
          placeholder="Search activity"
        />
        <select
          aria-label="Teammate"
          value={role}
          onChange={(e) => setQuery({ role: e.target.value, page: null })}
        >
          <option value="">All teammates</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Event type"
          value={kind}
          onChange={(e) => setQuery({ kind: e.target.value, page: null })}
        >
          <option value="">All events</option>
          {["offer", "project", "run", "receipt", "assessment"].map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <Button
          variant="secondary"
          onClick={() => {
            setFrom(query.get("from") || "");
            setTo(query.get("to") || "");
            setRange(true);
          }}
        >
          Date range
        </Button>
        {(q || role || kind || query.get("from")) && (
          <Button
            variant="ghost"
            onClick={() =>
              setQuery({
                q: null,
                role: null,
                kind: null,
                from: null,
                to: null,
                page: null,
              })
            }
          >
            Clear filters
          </Button>
        )}
      </div>
      <Panel>
        {!all.length ? (
          <Empty
            title="No matching activity"
            description="Try another teammate or clear the filters."
          />
        ) : (
          <>
            <small className="muted">
              {all.length} saved events · {timezone}
            </small>
            <div className="activity-list">
              {all.slice((page - 1) * 10, page * 10).map((e) => (
                <div className="activity-row" key={e.id}>
                  {roles.some((r) => r.id === e.role_id) ? (
                    <img src={roleAsset(s(e.role_id))} alt="" />
                  ) : (
                    <FileText size={22} aria-label="Workspace event" />
                  )}
                  <div>
                    <button
                      style={{ textAlign: "left", padding: 0 }}
                      onClick={() => setInspect(e)}
                    >
                      <p>{s(e.summary)}</p>
                      <small className="muted">
                        {[label(e.kind), label(e.role_id)]
                          .filter(Boolean)
                          .join(" · ")}
                      </small>
                    </button>
                  </div>
                  <small className="muted">{date(e.occurred_at)}</small>
                </div>
              ))}
            </div>
            <div className="row between" style={{ marginTop: 20 }}>
              <small>
                Page {page} of {Math.max(1, Math.ceil(all.length / 10))}
              </small>
              <div className="actions">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setQuery({ page: String(page - 1) })}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  disabled={page * 10 >= all.length}
                  onClick={() => setQuery({ page: String(page + 1) })}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Panel>
      {range && (
        <Modal title="Filter activity dates" onClose={() => setRange(false)}>
          <div className="stack">
            <p className="muted">
              Dates follow {timezone}. The sample clock is{" "}
              {date(state.sample_clock)}.
            </p>
            <div className="actions">
              {[1, 7, 30].map((days) => (
                <Button
                  key={days}
                  variant="secondary"
                  onClick={() => {
                    const today = localDay(state.sample_clock, timezone);
                    const start = new Date(today + "T12:00:00Z");
                    start.setUTCDate(start.getUTCDate() - days + 1);
                    setFrom(start.toISOString().slice(0, 10));
                    setTo(today);
                  }}
                >
                  {days === 1 ? "Today" : `Last ${days} days`}
                </Button>
              ))}
            </div>
            <div className="grid2">
              <Field label="From">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </Field>
              <Field label="Through">
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </Field>
            </div>
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <div className="actions">
              <Button variant="secondary" onClick={() => setRange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (from && to && from > to) {
                    setError("End date must be on or after start date.");
                    return;
                  }
                  setQuery({ from, to, page: null });
                  setRange(false);
                }}
              >
                Apply range
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {(selectedEvent || query.get("event")) && (
        <Modal
          title="Saved event"
          onClose={() => {
            setInspect(null);
            setQuery({ event: null });
          }}
        >
          <div className="stack">
            {!selectedEvent ? (
              <Empty
                title="Event unavailable"
                description="This event does not exist in the current sample scenario."
              />
            ) : (
              <>
                <h3>{s(selectedEvent.summary)}</h3>
                <Badge>{label(selectedEvent.kind)}</Badge>
                <p className="muted">{s(selectedEvent.occurred_at)}</p>
              </>
            )}
            {a<Entity>(selectedEvent?.record_refs).map((r) => (
              <RecordLink key={r.id} href={recordHref(s(r.table), r.id, state)}>
                {label(r.table)} · Version {r.version}
              </RecordLink>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}

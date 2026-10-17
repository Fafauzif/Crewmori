import { invoiceOutstanding } from "./engine";
import { a, s, type Entity, type StoreState } from "./types";

export type HomePriority = { kind: "project" | "invoice" | "task" | "offer"; record: Entity; reason: "reschedule" | "overdue" | "owner_input" | "review" | "prerequisites" | "offer" };
const active = (record: Entity) => !record.archived && !record.archived_at;
const recent = (x: Entity, y: Entity) => s(y.updated_at).localeCompare(s(x.updated_at)) || x.id.localeCompare(y.id);

/** Uses saved facts only. Acceptance, a payment request and an AI run are never proof of delivery or payment. */
export function selectHomePriority(state: StoreState): HomePriority | undefined {
  const rows = (table: string) => Object.values(state.tables[table] || {}).filter(active);
  const projects = rows("projects").filter((p) => !["completed", "cancelled", "archived"].includes(s(p.state))).sort(recent);
  const reschedule = projects.find((p) => p.state === "needs_rescheduling" || p.amendment_schedule_state === "needs_rescheduling" || p.state === "blocked");
  if (reschedule) return { kind: "project", record: reschedule, reason: "reschedule" };
  const overdue = rows("invoices").filter((invoice) => ["issued", "partially_paid"].includes(s(invoice.state)) && invoiceOutstanding(state, invoice.id) > 0 && Number.isFinite(Date.parse(s(invoice.due_at))) && Date.parse(s(invoice.due_at)) < Date.parse(state.sample_clock)).sort((x, y) => s(x.due_at).localeCompare(s(y.due_at)) || recent(x, y))[0];
  if (overdue) return { kind: "invoice", record: overdue, reason: "overdue" };
  const task = rows("agent_runs").filter((run) => run.status === "waiting_input").sort(recent)[0];
  if (task) return { kind: "task", record: task, reason: "owner_input" };
  const offers = rows("offers").filter((offer) => state.tables.offer_versions?.[s(offer.current_version_id)]).sort(recent);
  const review = offers.find((offer) => ["awaiting_review", "change_requested"].includes(s(offer.status)));
  if (review) return { kind: "offer", record: review, reason: "review" };
  const pendingArtifact = rows("artifacts").find((artifact) => ["awaiting_review", "waiting_approval"].includes(s(artifact.status)) && !!state.tables.agent_runs?.[s(artifact.run_id)]);
  if (pendingArtifact) return { kind: "task", record: state.tables.agent_runs[s(pendingArtifact.run_id)], reason: "review" };
  const prerequisites = projects.find((p) => p.state === "awaiting_prerequisites" || p.deposit_state === "awaiting_payment" || p.inputs_state === "awaiting_inputs");
  if (prerequisites) return { kind: "project", record: prerequisites, reason: "prerequisites" };
  const next = offers.find((offer) => ["approved", "draft"].includes(s(offer.status)));
  return next ? { kind: "offer", record: next, reason: "offer" } : undefined;
}

export function runWaitingMessage(run: Entity, now: string): { delayed: boolean; title: string; description: string } {
  const status = s(run.status), updated = Date.parse(s(run.updated_at, s(run.created_at))), clock = Date.parse(now);
  const delayed = ["queued", "running"].includes(status) && Number.isFinite(updated) && Number.isFinite(clock) && clock - updated >= 2 * 60 * 1000;
  const descriptions: Record<string, string> = {
    queued: "Your request is saved and waiting to start. You can leave this page and return to the same task.",
    running: "The team is preparing this request. Completed work will appear here for your review.",
    waiting_input: "Your team needs a decision from you before this request can continue.",
    waiting_approval: "The prepared work needs your review. Nothing is shared by this status alone.",
    paused: "This task is paused. Resume it when you are ready; saved work stays available.",
    blocked: "This task cannot continue yet. Review the problem below before retrying.",
    failed: "This attempt did not finish. Your saved business records remain available.",
    completed: "This task finished. Open its saved output to see what was prepared.",
    cancelled: "This task was cancelled. Cancelling does not undo work that was already saved or sent.",
  };
  return { delayed, title: delayed ? "Taking longer than expected" : ({ queued: "Waiting to start", running: "In progress", waiting_input: "Needs your input", waiting_approval: "Ready for review" }[status] || status.replaceAll("_", " ")), description: delayed ? "No recent activity has been recorded for this request. Check its status or continue manually; another request may duplicate work. No completion time is available." : descriptions[status] || "Open the saved activity for this task’s latest recorded state." };
}

/** References are explicit and do not fall back to an unrelated record. */
export function manualRunHref(run: Entity, state: StoreState): string {
  const refs = a<{ table?: string; id?: string }>(run.input_refs);
  const project = refs.find((ref) => ref.table === "projects" && state.tables.projects?.[s(ref.id)]);
  if (project) return `/app/projects/${encodeURIComponent(s(project.id))}`;
  const opportunityId = s(run.opportunity_id) || s(refs.find((ref) => ref.table === "opportunities")?.id);
  if (opportunityId && state.tables.opportunities?.[opportunityId]) return `/app/opportunities/${encodeURIComponent(opportunityId)}`;
  return run.role_id === "promoter" ? "/app/promotion" : run.role_id === "finance" ? "/app/money/invoices" : run.role_id === "operations" || run.role_id === "account_manager" ? "/app/projects" : "/app/opportunities";
}

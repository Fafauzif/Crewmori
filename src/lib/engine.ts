/** Deterministic, transactional sample domain adapter. All effects remain local. */
import fixture from "./fixture.json";
import scenarioFile from "./scenarios.json";
import { sampleId } from "./local-crypto";
import {
  a,
  n,
  o,
  s,
  type Entity,
  type Input,
  type Result,
  type StoreState,
  type Tables,
} from "./types";

const clone = <T>(value: T): T => structuredClone(value);
const rows = (st: StoreState, table: string): Entity[] =>
  Object.values(st.tables[table] || {});
const table = (st: StoreState, name: string) => (st.tables[name] ||= {});
const fail = (code: string, message: string): never => {
  throw new DomainError(code, message);
};
class DomainError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
const need = (
  value: unknown,
  message: string,
  code = "VALIDATION_ERROR",
): void => {
  if (!value) fail(code, message);
};
const get = (st: StoreState, t: string, id: unknown): Entity =>
  table(st, t)[s(id)] ||
  fail(
    "NOT_FOUND",
    "This record could not be found. Return to the list and try again.",
  );
const identifier = (_st: StoreState, prefix: string): string =>
  sampleId(prefix);
const put = (st: StoreState, t: string, id: string, fields: Input): Entity => {
  const prior = table(st, t)[id];
  const record: Entity = {
    workspace_id: "workspace_alya",
    audience: "owner",
    created_at: st.sample_clock,
    ...prior,
    ...fields,
    id,
    version: prior ? prior.version + 1 : 1,
    updated_at: st.sample_clock,
  };
  table(st, t)[id] = record;
  return record;
};
const patch = (st: StoreState, t: string, rec: Entity, fields: Input) =>
  put(st, t, rec.id, fields);
function expect(rec: Entity, input: Input) {
  const expected = input.expected_version ?? o(input.expected_versions)[rec.id];
  if (expected !== undefined && n(expected, -1) !== rec.version)
    fail(
      "STALE_VERSION",
      "This record changed in another view. Keep your draft, reload the current record, and compare before saving.",
    );
}
function stable(v: unknown): string {
  if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
  if (v && typeof v === "object")
    return (
      "{" +
      Object.keys(v)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + stable(o(v)[k]))
        .join(",") +
      "}"
    );
  return JSON.stringify(v) ?? "null";
}
function event(
  st: StoreState,
  kind: string,
  summary: string,
  refs: Entity[] = [],
  role: string | null = null,
  command: string | null = null,
) {
  const seq = Math.max(0, ...rows(st, "events").map((e) => n(e.sequence))) + 1;
  put(st, "events", `event_runtime_${seq}`, {
    sequence: seq,
    occurred_at: st.sample_clock,
    kind,
    summary,
    role_id: role,
    run_id: null,
    record_refs: refs.map((r) => ({
      table:
        Object.keys(st.tables).find((t) => !!st.tables[t][r.id]) || "unknown",
      id: r.id,
      version: r.version,
    })),
    semantic_focus_target: role
      ? `team.agent.${role}`
      : kind.startsWith("offer")
        ? "offer.review"
        : kind.startsWith("receipt")
          ? "money.receipt"
          : null,
    cause_command_id: command,
    visibility: "owner",
  });
}
export interface MoneyValue {
  amount_minor: number;
  currency: "USD" | "IDR";
  scale: 0 | 2;
}
export function validateMoney(value: unknown, positive = false): MoneyValue {
  const m = o(value),
    amount = n(m.amount_minor, -1),
    currency = s(m.currency),
    scale = currency === "USD" ? 2 : 0;
  need(
    (currency === "USD" || currency === "IDR") &&
      Number.isSafeInteger(amount) &&
      amount >= (positive ? 1 : 0) &&
      n(m.scale, scale) === scale,
    "Enter an exact, nonnegative amount in USD cents or IDR rupiah.",
  );
  return {
    amount_minor: amount,
    currency: currency as "USD" | "IDR",
    scale: scale as 0 | 2,
  };
}
/** Integer rational half-up arithmetic; no binary floating-point money rounding. */
export function halfUp(
  value: number,
  numerator: number,
  denominator: number,
): number {
  need(
    [value, numerator, denominator].every(Number.isSafeInteger) &&
      value >= 0 &&
      numerator >= 0 &&
      denominator > 0,
    "Invalid exact money ratio.",
  );
  const q =
    (BigInt(value) * BigInt(numerator) * 2n + BigInt(denominator)) /
    (BigInt(denominator) * 2n);
  need(q <= BigInt(Number.MAX_SAFE_INTEGER), "Amount is too large.");
  return Number(q);
}
function quantityHundred(value: unknown): number {
  const text = String(value);
  need(
    /^\d+(?:\.\d{1,2})?$/.test(text),
    "Quantity must use no more than two decimal places.",
  );
  const [whole, fraction = ""] = text.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  need(
    Number.isSafeInteger(result) && result > 0 && result <= 1000000,
    "Quantity must be greater than zero and at most 10,000.",
  );
  return result;
}
export function invoiceTotal(st: StoreState, invoice: Entity | string): number {
  const inv =
    typeof invoice === "string" ? get(st, "invoices", invoice) : invoice;
  return rows(st, "invoice_lines")
    .filter((l) => l.invoice_id === inv.id)
    .reduce((total, l) => {
      const unit = validateMoney(l.unit_amount);
      return (
        total +
        halfUp(
          halfUp(unit.amount_minor, quantityHundred(l.quantity), 100),
          10000 + n(l.tax_basis_points),
          10000,
        )
      );
    }, 0);
}
export function invoicePaid(st: StoreState, id: string): number {
  return rows(st, "allocations")
    .filter((x) => x.invoice_id === id && x.state === "posted")
    .reduce((v, x) => v + n(o(x.amount).amount_minor), 0);
}
export function invoiceOutstanding(st: StoreState, id: string): number {
  return Math.max(0, invoiceTotal(st, id) - invoicePaid(st, id));
}
function granted(st: StoreState, input: Input): Entity {
  const grant = get(st, "buyer_grants", input.grant_id);
  need(
    grant.state === "active" &&
      new Date(s(grant.expires_at)).getTime() >
        new Date(st.sample_clock).getTime(),
    "This sample invitation is no longer active. Ask the owner for a new link.",
    "NOT_AUTHORIZED",
  );
  need(
    grant.engagement_id === input.engagement_id,
    "This invitation does not belong to that conversation.",
    "NOT_AUTHORIZED",
  );
  return grant;
}
function scope(st: StoreState, input: Input, relation: string, id: string) {
  if (input.grant_id || input.actor === "buyer") {
    const g = granted(st, input);
    need(
      g[relation] === id,
      "This invitation does not allow that action.",
      "NOT_AUTHORIZED",
    );
  }
}
function attachmentMatchesProject(
  st: StoreState,
  file: Entity,
  project: Entity,
): boolean {
  const engagements = rows(st, "engagements").filter(
    (x) => x.project_id === project.id,
  );
  const engagementIds = engagements.map((x) => x.id),
    conversationIds = engagements.map((x) => s(x.conversation_id));
  if (
    (file.client_id && file.client_id !== project.client_id) ||
    (file.project_id && file.project_id !== project.id) ||
    (file.engagement_id && !engagementIds.includes(s(file.engagement_id))) ||
    (file.conversation_id && !conversationIds.includes(s(file.conversation_id)))
  )
    return false;
  return (
    file.project_id === project.id ||
    engagementIds.includes(s(file.engagement_id)) ||
    conversationIds.includes(s(file.conversation_id))
  );
}
function capability(st: StoreState, id: string, cap: string) {
  const c = get(st, "connections", id);
  need(
    c.state === "connected",
    "The sample connection needs reconnecting. Your draft is preserved. Reconnect, then retry deliberately.",
    "CONNECTION_REVOKED",
  );
  need(
    a<string>(c.approved_capabilities).includes(cap),
    "This sample connection has not approved the required permission.",
    "CAPABILITY_MISSING",
  );
}
function validateDate(v: unknown) {
  need(
    typeof v === "string" &&
      /^\d{4}-\d{2}-\d{2}T/.test(v) &&
      Number.isFinite(Date.parse(v)),
    "Enter a valid date and time with timezone.",
  );
}
function validateFields(st: StoreState, t: string, v: Input, id = "") {
  for (const [key, value] of Object.entries(v)) {
    need(
      ![
        "password",
        "password_confirmation",
        "token",
        "secret",
        "access_token",
      ].includes(key),
      "Credentials cannot be saved in the sample workspace.",
    );
    if (typeof value === "string") {
      need(value.length <= 30000, "Text is too long.");
      if (
        (key === "url" || key.endsWith("_url") || key === "website") &&
        value
      ) {
        try {
          const url = new URL(value);
          need(
            ["http:", "https:"].includes(url.protocol),
            "Use a secure web address.",
          );
        } catch {
          fail("VALIDATION_ERROR", "Enter a valid http or https address.");
        }
      }
      if (key.includes("email") && value)
        need(
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
          "Enter a valid email address.",
        );
      if ((key === "slug" || key === "handle") && value) {
        need(
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
          "Use lowercase letters, numbers, and hyphens.",
        );
        need(
          !rows(st, t).some((r) => r.id !== id && r[key] === value),
          "That address is already in use.",
        );
      }
    }
    if (key.endsWith("basis_points") && value !== null)
      need(
        Number.isSafeInteger(value) &&
          n(value, -1) >= 0 &&
          n(value) > -1 &&
          n(value) <= 10000,
        "Percentage must be between 0 and 100%.",
      );
    if (
      [
        "price",
        "amount",
        "unit_amount",
        "requested_budget",
        "upfront_cost_assumption",
      ].includes(key) &&
      value !== null &&
      typeof value === "object"
    )
      validateMoney(value);
  }
  if (t === "expenses") {
    need(s(v.description).trim(), "Add an expense description.");
    validateMoney(v.amount, true);
  }
  if (t === "invoice_lines") {
    quantityHundred(v.quantity);
    validateMoney(v.unit_amount);
  }
  if (t === "policies" && v.business_weekdays !== undefined)
    need(
      a<number>(v.business_weekdays).length > 0 &&
        a<number>(v.business_weekdays).every(
          (d) => Number.isInteger(d) && d >= 0 && d <= 6,
        ),
      "Choose at least one working day.",
    );
  if (t === "preferences") {
    if (v.locale !== undefined)
      need(
        ["en", "id"].includes(s(v.locale)),
        "Choose English or Bahasa Indonesia.",
      );
    if (v.motion !== undefined)
      need(
        ["system", "full", "reduced", "normal"].includes(s(v.motion)),
        "Choose a valid motion preference.",
      );
    if (v.timezone !== undefined) {
      try {
        new Intl.DateTimeFormat("en", { timeZone: s(v.timezone) }).format();
      } catch {
        fail("VALIDATION_ERROR", "Choose a valid IANA timezone.");
      }
    }
  }
  if (t === "profiles" && v.public_availability !== undefined)
    need(
      ["open_to_inquiries", "limited", "unavailable"].includes(
        s(v.public_availability),
      ),
      "Choose a valid public availability.",
    );
  if (t === "policies") {
    if (v.available_effort_minutes !== undefined)
      need(
        Number.isSafeInteger(v.available_effort_minutes) &&
          n(v.available_effort_minutes) >= 0 &&
          n(v.available_effort_minutes) <= 10080,
        "Available effort must be whole minutes within one week.",
      );
    if (v.reservation_hours !== undefined)
      need(
        Number.isInteger(v.reservation_hours) &&
          n(v.reservation_hours) > 0 &&
          n(v.reservation_hours) <= 720,
        "Reservation must be 1–720 hours.",
      );
    if (v.start_local_time && v.due_local_time)
      need(
        /^([01]\d|2[0-3]):[0-5]\d$/.test(s(v.start_local_time)) &&
          s(v.start_local_time) < s(v.due_local_time),
        "Working hours must be valid and end after they start.",
      );
    if (v.holiday_dates !== undefined) {
      const dates = a<string>(v.holiday_dates);
      need(
        new Set(dates).size === dates.length &&
          dates.every(
            (d) =>
              /^\d{4}-\d{2}-\d{2}$/.test(d) &&
              new Date(d + "T00:00:00Z").toISOString().slice(0, 10) === d,
          ),
        "Use distinct valid holiday dates.",
      );
    }
  }
  if (t === "capability_preferences") {
    need(
      [
        "scout",
        "promoter",
        "sales",
        "account_manager",
        "operations",
        "finance",
      ].includes(s(v.role, s(v.role_id))),
      "Choose a valid role.",
    );
    need(
      Number.isInteger(v.max_concurrent) &&
        n(v.max_concurrent) > 0 &&
        n(v.max_concurrent) <= 10,
      "Set a concurrent task limit from 1 to 10.",
    );
    need(
      a<string>(v.allowed_connection_ids).every(
        (id) => table(st, "connections")[id]?.state === "connected",
      ),
      "Select connected tools only.",
    );
    need(
      v.mandatory_external_approval !== false,
      "External action approval cannot be disabled.",
    );
  }
  if (t === "calendar_events" && v.starts_at && v.ends_at) {
    validateDate(v.starts_at);
    validateDate(v.ends_at);
    need(
      Date.parse(s(v.ends_at)) > Date.parse(s(v.starts_at)),
      "The end must be after the start.",
    );
  }
}
function staleAssessments(st: StoreState) {
  for (const ass of rows(st, "assessments"))
    patch(st, "assessments", ass, { status: "stale" });
  for (const artifact of rows(st, "artifacts"))
    if (artifact.status === "current")
      patch(st, "artifacts", artifact, { status: "stale" });
}
function snapshots(st: StoreState) {
  for (const t of ["profiles", "services", "portfolio_items"])
    for (const rec of rows(st, t))
      if (
        rec.published &&
        !table(st, "publication_snapshots")[`${t}_${rec.id}`]
      )
        put(st, "publication_snapshots", `${t}_${rec.id}`, {
          source_table: t,
          source_id: rec.id,
          source_version: rec.version,
          values: clone(rec),
          published_at: st.sample_clock,
          approval: "approved_sample",
        });
}
export function createState(scenarioId = "review_ready"): StoreState {
  const base = clone(fixture) as unknown as {
    schema_version: string;
    sample_clock: string;
    tables: Tables;
  };
  const branch = scenarioFile.scenarios.find((x) => x.id === scenarioId);
  if (!branch) throw new Error("Unknown sample scenario");
  for (const name of branch.replace_tables) base.tables[name] = {};
  for (const [name, recs] of Object.entries(branch.upsert_records))
    base.tables[name] = {
      ...(base.tables[name] || {}),
      ...clone(recs),
    } as Record<string, Entity>;
  const state: StoreState = {
    schema_version: "1.1.0",
    sample_clock: branch.sample_clock,
    tables: base.tables,
    revision: 0,
    scenario: scenarioId,
    dirty: false,
    session: true,
    ui: clone(branch.ui_state) as Input,
  };
  for (const name of [
    "publication_snapshots",
    "editor_drafts",
    "team_requests",
    "notification_states",
    "issue_actions",
    "publication_evidence",
    "sample_sessions",
    "recovery_grants",
    "capability_preferences",
  ])
    table(state, name);
  snapshots(state);
  settleApprovedRuns(state);
  return state;
}
function exactOffer(st: StoreState, input: Input) {
  let id = s(input.id, s(input.offer_id));
  if (!id && input.engagement_id)
    id = s(get(st, "engagements", input.engagement_id).offer_id);
  const offer = get(st, "offers", id);
  expect(offer, input);
  const version = get(st, "offer_versions", offer.current_version_id);
  if (input.offer_version_id)
    need(
      input.offer_version_id === version.id,
      "This offer has been updated. Wait for the current revision to be shared.",
      "OFFER_SUPERSEDED",
    );
  return { offer, version };
}
function completeOffer(st: StoreState, v: Entity) {
  need(
    s(v.title).trim() && a(v.deliverables).length > 0,
    "Add a title and at least one deliverable before review.",
  );
  validateMoney(v.price, true);
  const terms = o(v.terms);
  need(
    Number.isInteger(terms.delivery_business_days) &&
      n(terms.delivery_business_days) > 0 &&
      n(terms.delivery_business_days) <= 365,
    "Set a valid delivery period.",
  );
  need(
    Number.isInteger(terms.deposit_basis_points) &&
      n(terms.deposit_basis_points) >= 0 &&
      n(terms.deposit_basis_points) <= 10000,
    "Set the deposit percentage between 0 and 100%.",
  );
  need(
    n(terms.reservation_hours) > 0 &&
      a(terms.workdays).length > 0 &&
      s(terms.acceptance_disclosure).trim(),
    "Complete the reservation and working-day terms.",
  );
  for (const d of a<Input>(v.deliverables))
    need(
      s(d.label).trim() && Number.isInteger(d.quantity) && n(d.quantity) > 0,
      "Each deliverable needs a label and positive quantity.",
    );
  const req = get(st, "requirements", v.requirements_id),
    policy = get(st, "policies", "policy_business");
  need(
    req.version === n(v.requirements_version) &&
      policy.version === n(v.policy_version),
    "The brief or business rules changed. Refresh assessments and review this draft again.",
    "ASSESSMENT_STALE",
  );
  if (v.expires_at)
    need(
      Date.parse(s(v.expires_at)) > Date.parse(st.sample_clock),
      "This offer has expired. Prepare a new revision.",
      "OFFER_EXPIRED",
    );
}
function reviewAssessments(st: StoreState, v: Entity) {
  for (const role of ["scout", "operations", "finance"])
    need(
      rows(st, "assessments").some(
        (x) =>
          x.role_id === role &&
          x.opportunity_id === get(st, "offers", v.offer_id).opportunity_id &&
          x.status === "current" &&
          x.requirements_version === v.requirements_version &&
          x.policy_version === v.policy_version,
      ),
      `${role.replace("_", " ")} needs to refresh its assessment before this offer can proceed.`,
      "ASSESSMENT_STALE",
    );
}
function deriveDates(clock: string, terms: Input) {
  const current = new Date(Date.parse(clock) + 7 * 3600000);
  current.setUTCHours(0, 0, 0, 0);
  const holidays = a<string>(terms.holidays),
    days = a<number>(terms.workdays).length
      ? a<number>(terms.workdays)
      : [0, 1, 2, 3, 4];
  const valid = (d: Date) =>
    days.includes((d.getUTCDay() + 6) % 7) &&
    !holidays.includes(d.toISOString().slice(0, 10));
  do {
    current.setUTCDate(current.getUTCDate() + 1);
  } while (!valid(current));
  const start = current.toISOString().slice(0, 10) + "T09:00:00+07:00";
  let left = n(terms.delivery_business_days, 5) - 1;
  while (left > 0) {
    current.setUTCDate(current.getUTCDate() + 1);
    if (valid(current)) left--;
  }
  return { start, due: current.toISOString().slice(0, 10) + "T17:00:00+07:00" };
}
export function amendmentSchedule(
  startAt: string,
  terms: Input,
): { start: string; due: string } {
  const current = new Date(Date.parse(startAt) + 7 * 3600000);
  current.setUTCHours(0, 0, 0, 0);
  const days = a<number>(terms.workdays).length
      ? a<number>(terms.workdays)
      : [0, 1, 2, 3, 4],
    holidays = a<string>(terms.holidays);
  const valid = (d: Date) =>
    days.includes((d.getUTCDay() + 6) % 7) &&
    !holidays.includes(d.toISOString().slice(0, 10));
  need(
    valid(current),
    "The agreed start is outside the amended working calendar. Prepare a reviewed new start.",
    "RESCHEDULING_REVIEW_REQUIRED",
  );
  let remaining = n(terms.delivery_business_days, 5) - 1;
  need(
    Number.isInteger(remaining) && remaining >= 0 && remaining < 365,
    "Set valid delivery business days.",
  );
  while (remaining > 0) {
    current.setUTCDate(current.getUTCDate() + 1);
    if (valid(current)) remaining--;
  }
  return {
    start: startAt,
    due: current.toISOString().slice(0, 10) + "T17:00:00+07:00",
  };
}
function applyAmendmentSchedule(
  st: StoreState,
  project: Entity,
  dates: { start: string; due: string },
  acceptanceId: string,
) {
  need(
    Date.parse(dates.due) > Date.parse(st.sample_clock),
    "The proposed deadline has elapsed. Prepare a new schedule.",
    "RESCHEDULING_REVIEW_REQUIRED",
  );
  put(st, "project_schedule_history", identifier(st, "schedule_history"), {
    project_id: project.id,
    acceptance_id: acceptanceId,
    previous_start_at: project.committed_start_at,
    previous_due_at: project.committed_due_at,
    start_at: dates.start,
    due_at: dates.due,
    reason: "Buyer accepted separately owner-approved amendment",
  });
  const reservation = get(st, "reservations", project.reservation_id);
  patch(st, "reservations", reservation, {
    state: "committed",
    start_at: dates.start,
    due_at: dates.due,
    latest_amendment_acceptance_id: acceptanceId,
  });
  for (const kind of ["start", "due"]) {
    const existing = rows(st, "calendar_events").find(
        (x) =>
          x.project_id === project.id &&
          x.kind ===
            (kind === "start" ? "committed_start" : "committed_deadline"),
      ),
      d = kind === "start" ? dates.start : dates.due;
    put(
      st,
      "calendar_events",
      existing?.id || `calendar_${project.id}_${kind}`,
      {
        project_id: project.id,
        title: `${s(project.title)} ${kind === "start" ? "starts" : "delivery due"}`,
        kind: kind === "start" ? "committed_start" : "committed_deadline",
        state: "committed",
        starts_at: d,
        ends_at: new Date(Date.parse(d) + 1800000).toISOString(),
        timezone: "Asia/Jakarta",
        external_invitation_state:
          existing?.external_invitation_state || "not_requested",
        connection_id: "calendar",
        shared_with_buyer: true,
        latest_amendment_acceptance_id: acceptanceId,
      },
    );
  }
  for (const milestone of rows(st, "milestones").filter(
    (x) => x.project_id === project.id && x.shared_with_buyer,
  ))
    patch(st, "milestones", milestone, { due_at: dates.due });
  patch(st, "projects", project, {
    state: "active",
    committed_start_at: dates.start,
    committed_due_at: dates.due,
    pending_amendment_schedule: null,
    amendment_schedule_state: "committed",
  });
  event(
    st,
    "project.schedule_amended",
    "The buyer accepted the reviewed amendment. Updated project dates are committed internally.",
    [project],
  );
}
function depositComplete(st: StoreState, project: Entity): boolean {
  const invoices = rows(st, "invoices").filter(
    (x) =>
      x.project_id === project.id &&
      ["deposit", "amendment_deposit"].includes(s(x.kind)) &&
      x.state !== "void",
  );
  const acceptance = get(
    st,
    "acceptances",
    project.latest_amendment_acceptance_id || project.acceptance_id,
  );
  const expected = halfUp(
    n(o(acceptance.price_snapshot).amount_minor),
    n(o(acceptance.terms_snapshot).deposit_basis_points),
    10000,
  );
  return invoices.reduce((v, x) => v + invoicePaid(st, x.id), 0) >= expected;
}
function amendmentScheduleIssue(
  st: StoreState,
  project: Entity,
  pending: Input,
): string | null {
  const acceptance = get(
      st,
      "acceptances",
      project.latest_amendment_acceptance_id || project.acceptance_id,
    ),
    terms = o(acceptance.terms_snapshot),
    reservation = get(st, "reservations", project.reservation_id);
  if (Date.parse(s(pending.due)) <= Date.parse(st.sample_clock))
    return "The proposed deadline has elapsed. Prepare a new schedule.";
  if (terms.proposed_start_at) {
    if (Date.parse(st.sample_clock) >= Date.parse(s(reservation.expires_at)))
      return "The renewed reservation has expired. Prepare a new schedule.";
    if (
      Date.parse(s(pending.start)) <
      Date.parse(deriveDates(st.sample_clock, terms).start)
    )
      return "The agreed proposed start is no longer the next or a later business day. Prepare a new schedule.";
  }
  const other = rows(st, "reservations")
    .filter(
      (x) =>
        x.id !== reservation.id &&
        ["committed", "provisional"].includes(s(x.state)) &&
        (x.state === "committed" ||
          Date.parse(s(x.expires_at)) > Date.parse(st.sample_clock)),
    )
    .reduce((sum, x) => sum + n(x.effort_minutes), 0);
  if (
    n(reservation.effort_minutes) + other >
    n(get(st, "policies", "policy_business").available_effort_minutes)
  )
    return "Available capacity has changed. Review a new schedule.";
  return null;
}
function refreshProject(st: StoreState, projectId: string, force = false) {
  const project = get(st, "projects", projectId);
  if (
    !project.acceptance_id ||
    ["cancelled", "completed", "archived"].includes(s(project.state)) ||
    project.archived
  )
    return;
  const deposit = depositComplete(st, project);
  const inputs = rows(st, "required_inputs")
    .filter((x) => x.project_id === projectId && x.required !== false)
    .every((x) => x.state === "provided");
  const res = get(st, "reservations", project.reservation_id);
  let updates: Input = {
    deposit_state: deposit ? "confirmed" : "awaiting_payment",
    inputs_state: inputs ? "complete" : "awaiting_inputs",
  };
  const pending = o(project.pending_amendment_schedule);
  if (deposit && inputs && pending.start && pending.due) {
    const reason = amendmentScheduleIssue(st, project, pending);
    if (!reason) {
      applyAmendmentSchedule(
        st,
        project,
        { start: s(pending.start), due: s(pending.due) },
        s(project.latest_amendment_acceptance_id),
      );
      patch(st, "projects", get(st, "projects", project.id), updates);
      return;
    }
    updates = {
      ...updates,
      amendment_schedule_state: "needs_rescheduling",
      schedule_review_reason: reason,
      ...(res.state === "committed" ? {} : { state: "needs_rescheduling" }),
    };
    patch(st, "projects", project, updates);
    return;
  }
  if (res.state === "committed") {
    patch(st, "projects", project, updates);
    return;
  }

  if (Date.parse(st.sample_clock) >= Date.parse(s(res.expires_at)) && !force) {
    if (res.state !== "expired") {
      patch(st, "reservations", res, { state: "expired" });
      event(
        st,
        "reservation.expired",
        "The provisional reservation expired. Confirm a new schedule before promising dates.",
        [project],
      );
    }
    updates = { ...updates, state: "needs_rescheduling" };
  } else if (deposit && inputs) {
    const acceptance = get(
      st,
      "acceptances",
      project.latest_amendment_acceptance_id || project.acceptance_id,
    );
    const dates = deriveDates(st.sample_clock, o(acceptance.terms_snapshot));
    updates = {
      ...updates,
      state: "active",
      committed_start_at: dates.start,
      committed_due_at: dates.due,
    };
    patch(st, "reservations", res, {
      state: "committed",
      committed_at: st.sample_clock,
      start_at: dates.start,
      due_at: dates.due,
    });
    for (const kind of ["start", "due"]) {
      const d = kind === "start" ? dates.start : dates.due;
      put(st, "calendar_events", `calendar_${projectId}_${kind}`, {
        project_id: projectId,
        title: `${s(project.title)} ${kind === "start" ? "starts" : "delivery due"}`,
        kind: kind === "start" ? "committed_start" : "committed_deadline",
        state: "committed",
        starts_at: d,
        ends_at: new Date(Date.parse(d) + 30 * 60000).toISOString(),
        timezone: "Asia/Jakarta",
        external_invitation_state: "not_requested",
        connection_id: "calendar",
        shared_with_buyer: true,
      });
    }
    for (const m of rows(st, "milestones").filter(
      (x) => x.project_id === projectId,
    ))
      patch(st, "milestones", m, { due_at: dates.due });
    event(
      st,
      "project.start_committed",
      "Deposit and required inputs are complete. The project start and deadline are now committed.",
      [project],
    );
  }
  patch(st, "projects", project, updates);
}
function updateInvoice(st: StoreState, invoice: Entity) {
  const total = invoiceTotal(st, invoice),
    paid = invoicePaid(st, invoice.id);
  const status =
    paid >= total
      ? "paid"
      : paid > 0
        ? "partially_paid"
        : invoice.issued_at
          ? "issued"
          : "draft";
  patch(st, "invoices", invoice, { state: status });
  for (const request of rows(st, "payment_requests").filter(
    (x) => x.invoice_id === invoice.id,
  ))
    patch(st, "payment_requests", request, {
      state:
        status === "paid"
          ? "confirmed"
          : status === "partially_paid"
            ? "pending"
            : request.state,
    });
  if (invoice.project_id) refreshProject(st, s(invoice.project_id));
}
function allocation(
  st: StoreState,
  receipt: Entity,
  invoice: Entity,
  amount: number,
  reason: string,
) {
  const gross = validateMoney(receipt.gross);
  need(
    invoice.currency === gross.currency,
    "Receipt and invoice currencies differ. Keep the receipt unmatched; no conversion was applied.",
    "CURRENCY_MISMATCH",
  );
  need(
    receipt.observation_state === "sample_confirmed",
    "This receipt is not confirmed.",
    "INVALID_STATE",
  );
  need(
    invoice.state !== "draft" && invoice.state !== "void",
    "Issue this invoice before allocating a receipt.",
    "INVALID_STATE",
  );
  const used = rows(st, "allocations")
    .filter((x) => x.receipt_id === receipt.id && x.state === "posted")
    .reduce((v, x) => v + n(o(x.amount).amount_minor), 0);
  need(
    Number.isSafeInteger(amount) &&
      amount > 0 &&
      amount <= gross.amount_minor - used &&
      amount <= invoiceOutstanding(st, invoice.id),
    "The allocation exceeds the unallocated receipt or invoice outstanding balance.",
    "ALLOCATION_EXCEEDS_AVAILABLE",
  );
  const rec = put(st, "allocations", identifier(st, "allocation"), {
    receipt_id: receipt.id,
    invoice_id: invoice.id,
    amount: { ...gross, amount_minor: amount },
    state: "posted",
    reason,
  });
  patch(st, "receipts", receipt, {
    reconciliation_state:
      used + amount === gross.amount_minor
        ? "reconciled"
        : "partially_allocated",
  });
  updateInvoice(st, invoice);
  return rec;
}
const editableTables = new Set([
  "clients",
  "contacts",
  "opportunities",
  "requirements",
  "profiles",
  "owners",
  "services",
  "portfolio_items",
  "policies",
  "preferences",
  "sources",
  "projects",
  "required_inputs",
  "milestones",
  "work_tasks",
  "calendar_events",
  "expenses",
  "private_notes",
  "attachments",
  "onboarding_sessions",
  "editor_drafts",
  "notification_states",
  "capability_preferences",
  "local_accounts",
  "recovery_grants",
  "change_requests",
  "conversations",
  "messages",
]);
function saveRecord(st: StoreState, t: string, input: Input): Entity {
  need(
    editableTables.has(t) && t !== "messages",
    "Use the specific reviewed action for this kind of record.",
  );
  const id = s(input.id) || identifier(st, t.replace(/s$/, "")),
    existing = table(st, t)[id];
  if (existing) expect(existing, input);
  const values = o(input.values);
  need(Object.keys(values).length > 0, "Add some information before saving.");
  const forbidden = [
    "id",
    "version",
    "workspace_id",
    "created_at",
    "accepted_version_id",
    "acceptance_id",
    "deposit_state",
    "committed_start_at",
    "committed_due_at",
    "reservation_id",
    "published_snapshot",
  ];
  for (const key of forbidden)
    need(
      !(key in values),
      `${key.replaceAll("_", " ")} is managed by its reviewed workflow.`,
    );
  const candidate = { ...existing, ...values };
  validateFields(st, t, candidate, id);
  if (t === "projects") {
    if (existing && values.state !== undefined)
      need(
        values.state === existing.state,
        "Use the explicit project lifecycle action.",
        "INVALID_STATE",
      );
    if (values.professional_delivery_state !== undefined)
      need(
        ["not_started", "in_progress"].includes(
          s(values.professional_delivery_state),
        ),
        "Use the explicit delivery acceptance workflow.",
        "INVALID_STATE",
      );
  }
  if (t === "projects" && existing?.acceptance_id) {
    for (const field of [
      "client_id",
      "offer_id",
      "accepted_version_id",
      "opportunity_id",
    ])
      if (field in values)
        need(
          values[field] === existing[field],
          "Accepted project relationships are immutable. Use an amendment workflow.",
          "INVALID_STATE",
        );
  }
  if (t === "projects" && existing?.acceptance_id)
    for (const field of ["title", "brief", "professional_delivery_state"]) {
      if (field in values && field === "professional_delivery_state")
        need(
          ["not_started", "in_progress"].includes(s(values[field])),
          "Use the explicit delivery or completion action.",
        );
    }
  if (t === "required_inputs")
    fail("INVALID_STATE", "Use the provide-input or request-changes action.");
  if (t === "calendar_events" && existing?.state === "committed")
    need(
      !("starts_at" in values || "ends_at" in values),
      "Use the approved reschedule action for committed dates.",
    );
  const record = put(st, t, id, values);
  if (["policies", "requirements"].includes(t)) staleAssessments(st);
  return record;
}
function manualOpportunity(st: StoreState, input: Input) {
  const values = o(input.values),
    id = s(input.id, s(input.opportunity_id)),
    existing = id ? get(st, "opportunities", id) : undefined;
  if (existing) expect(existing, input);
  need(
    s(values.title, s(existing?.title)).trim() &&
      s(values.request, s(existing?.request)).trim(),
    "Add a title and the factual client request.",
  );
  validateFields(st, "opportunities", values, id);
  let clientId = s(values.client_id, s(existing?.client_id));
  if (clientId && existing) {
    const c = get(st, "clients", clientId);
    if (values.name) patch(st, "clients", c, { name: values.name });
    const contact = table(st, "contacts")[
      s(existing.contact_id, s(a<string>(c.contact_ids)[0]))
    ];
    if (contact && values.email !== undefined)
      patch(st, "contacts", contact, { email: values.email });
  }
  if (!clientId) {
    need(s(values.name).trim(), "Add the client or organization name.");
    clientId = identifier(st, "client");
    const contactId = identifier(st, "contact");
    put(st, "contacts", contactId, {
      client_id: clientId,
      display_name: s(values.name),
      email: s(values.email),
      role_label: "Project contact",
      locale: "en",
    });
    put(st, "clients", clientId, {
      name: s(values.name),
      contact_ids: [contactId],
      status: "prospect",
      website: s(values.source_url),
      next_action: "Review this request",
      private_note_ids: [],
    });
  }
  get(st, "clients", clientId);
  const oppId = id || identifier(st, "opportunity"),
    sourceId = identifier(st, "source");
  put(st, "sources", sourceId, {
    kind: s(values.source_kind, "manual"),
    title: s(values.source_label, "Owner-recorded request"),
    label: s(values.source_label, "Owner-recorded request"),
    url: s(values.source_url) || null,
    excerpt: s(values.request),
    content: s(values.request),
    recorded_at: st.sample_clock,
    status: "available",
    availability: "available",
    audience: "owner",
  });
  const req = rows(st, "requirements").find((r) => r.opportunity_id === oppId);
  const reqId = req?.id || identifier(st, "requirements");
  let budget: unknown = values.budget ?? null;
  if (typeof budget === "number")
    budget = {
      amount_minor: budget,
      currency: s(values.currency, "USD"),
      scale: s(values.currency, "USD") === "USD" ? 2 : 0,
    };
  if (budget !== null) validateMoney(budget);
  put(st, "requirements", reqId, {
    opportunity_id: oppId,
    deliverables: [s(values.request)],
    budget,
    delivery_business_days: values.delivery_business_days || null,
    requested_scope: [
      { key: "request", label: s(values.request), quantity: 1 },
    ],
    requested_budget: budget,
    requested_delivery_business_days: values.delivery_business_days || null,
    unknowns: ["Final scope and inputs to confirm"],
    source_ids: [sourceId],
  });
  const opportunity = put(st, "opportunities", oppId, {
    ...values,
    title: s(values.title),
    client_id: clientId,
    source_id: sourceId,
    source_ids: [...a<string>(existing?.source_ids), sourceId],
    requirements_id: reqId,
    status: existing?.status || "new",
    next_action: "Assess this request",
    request: s(values.request),
  });
  if (existing) staleAssessments(st);
  else {
    const contactId = s(a<string>(get(st, "clients", clientId).contact_ids)[0]),
      convId = identifier(st, "conversation"),
      engId = identifier(st, "engagement"),
      grantId = identifier(st, "grant");
    put(st, "conversations", convId, {
      client_id: clientId,
      buyer_contact_id: contactId,
      status: "open",
      owner_review_requested: false,
      brief_requirements_id: reqId,
      latest_message_id: null,
    });
    put(st, "engagements", engId, {
      client_id: clientId,
      contact_id: contactId,
      opportunity_id: oppId,
      conversation_id: convId,
      offer_id: null,
      buyer_grant_id: grantId,
      project_id: null,
      stage: "clarification",
    });
    put(st, "buyer_grants", grantId, {
      audience: "buyer",
      engagement_id: engId,
      contact_id: contactId,
      conversation_id: convId,
      offer_id: null,
      project_id: null,
      state: "active",
      expires_at: new Date(
        Date.parse(st.sample_clock) + 30 * 86400000,
      ).toISOString(),
      token_kind: "local_demo_navigation_only",
    });
    patch(st, "opportunities", opportunity, {
      contact_id: contactId,
      conversation_id: convId,
    });
  }
  return table(st, "opportunities")[opportunity.id];
}
function offerDraft(st: StoreState, input: Input): Entity {
  let values = o(input.values);
  if (!Object.keys(values).length) values = { ...input };
  const oldId = s(input.id, s(input.offer_id));
  let offer = oldId ? get(st, "offers", oldId) : undefined;
  if (offer) expect(offer, input);
  const previous = offer
    ? get(st, "offer_versions", offer.current_version_id)
    : undefined;
  const clientId = s(values.client_id, s(offer?.client_id));
  need(clientId, "Choose a client.");
  get(st, "clients", clientId);
  const opportunityId = s(values.opportunity_id, s(offer?.opportunity_id));
  const opp = get(st, "opportunities", opportunityId);
  need(
    opp.client_id === clientId,
    "The chosen client and opportunity must belong together.",
    "VALIDATION_ERROR",
  );
  const req =
    rows(st, "requirements").find((x) => x.opportunity_id === opp.id) ||
    fail("NOT_FOUND", "The client brief is missing.");
  const offerId = offer?.id || identifier(st, "offer");
  const revision = previous ? n(previous.revision) + 1 : 1;
  const versionId = `${offerId}_v${revision}`;
  const allowed = [
    "title",
    "deliverables",
    "price",
    "terms",
    "buyer_note",
    "expires_at",
    "estimated_effort_minutes",
    "assessment_ids",
    "internal_notes",
    "amendment_reason",
  ];
  const fields: Input = {};
  for (const key of allowed) if (key in values) fields[key] = values[key];
  validateFields(st, "offer_versions", fields);
  if (previous && previous.state !== "accepted")
    patch(st, "offer_versions", previous, { state: "superseded" });
  if (offer)
    for (const approval of rows(st, "approvals").filter(
      (x) => o(x.subject_ref).id === previous?.id && x.state === "current",
    ))
      patch(st, "approvals", approval, { state: "superseded" });
  const terms = {
    delivery_business_days: 5,
    deposit_basis_points: 6000,
    reservation_hours: 48,
    start_basis:
      "next_business_day_after_confirmed_deposit_and_required_inputs",
    timezone: "Asia/Jakarta",
    workdays: [0, 1, 2, 3, 4],
    holidays: [],
    start_local_time: "09:00",
    due_local_time: "17:00",
    required_input_keys: ["brand_assets", "launch_message"],
    acceptance_disclosure:
      "Acceptance reserves capacity for 48 elapsed hours. A confirmed deposit and complete inputs commit the next business day; delivery is due on business day five. Late prerequisites require rescheduling.",
  };
  put(st, "offer_versions", versionId, {
    ...previous,
    revision,
    offer_id: offerId,
    title: s(values.title, s(previous?.title, "New service proposal")),
    deliverables: previous?.deliverables || [],
    price: previous?.price || null,
    terms: previous?.terms || terms,
    buyer_note: s(previous?.buyer_note),
    expires_at:
      previous?.expires_at ||
      new Date(Date.parse(st.sample_clock) + 7 * 86400000).toISOString(),
    ...fields,
    requirements_id: req.id,
    requirements_version: req.version,
    policy_version: get(st, "policies", "policy_business").version,
    assessment_ids: rows(st, "assessments")
      .filter((x) => x.opportunity_id === opp.id && x.status === "current")
      .map((x) => x.id),
    state: "draft",
    return_instruction: s(input.instruction, s(input.reason)),
    predecessor_id: previous?.id || null,
    immutable_after_acceptance: false,
  });
  offer = put(st, "offers", offerId, {
    client_id: clientId,
    opportunity_id: opp.id,
    current_version_id: versionId,
    status: "draft",
    accepted_version_id: offer?.accepted_version_id || null,
    shared_version_id: offer?.shared_version_id || null,
  });
  patch(st, "opportunities", opp, { offer_id: offer.id });
  for (const eng of rows(st, "engagements").filter(
    (x) => x.opportunity_id === opp.id,
  )) {
    patch(st, "engagements", eng, {
      offer_id: offer.id,
      stage: "offer_review",
    });
    if (eng.buyer_grant_id)
      patch(st, "buyer_grants", get(st, "buyer_grants", eng.buyer_grant_id), {
        offer_id: offer.id,
      });
  }
  return offer;
}
function acceptOffer(st: StoreState, input: Input): Result {
  const { offer, version: v } = exactOffer(st, input);
  const grant = granted(st, input);
  need(
    grant.offer_id === offer.id,
    "This invitation does not belong to the offer.",
    "NOT_AUTHORIZED",
  );
  need(
    input.confirmed === true || input.terms_acknowledged === true,
    "Read and acknowledge the offer terms before accepting.",
  );
  const existing = rows(st, "acceptances").find(
    (x) => x.offer_version_id === v.id,
  );
  if (existing) {
    const p = rows(st, "projects").find(
      (x) =>
        x.acceptance_id === existing.id ||
        x.latest_amendment_acceptance_id === existing.id ||
        x.id === existing.project_id,
    );
    const inv = existing.result_invoice_id
      ? table(st, "invoices")[s(existing.result_invoice_id)]
      : rows(st, "invoices").find(
          (x) => x.project_id === p?.id && x.kind === "deposit",
        );
    const req = existing.result_payment_request_id
      ? table(st, "payment_requests")[s(existing.result_payment_request_id)]
      : rows(st, "payment_requests").find((x) => x.invoice_id === inv?.id);
    return {
      ok: true,
      message: "This exact offer has already been accepted.",
      id: p?.id,
      ids: {
        acceptance_id: existing.id,
        project_id: p?.id || "",
        reservation_id: s(p?.reservation_id),
        invoice_id: inv?.id || "",
        payment_request_id: req?.id || "",
      },
      replayed: true,
    };
  }
  need(
    offer.status === "shared" &&
      offer.shared_version_id === v.id &&
      v.state === "shared",
    "Only the current shared offer can be accepted.",
    "INVALID_STATE",
  );
  need(
    !v.expires_at || Date.parse(s(v.expires_at)) > Date.parse(st.sample_clock),
    "This offer has expired. Ask the owner for an updated offer.",
    "OFFER_EXPIRED",
  );
  const share = rows(st, "share_records").find(
    (x) =>
      x.offer_version_id === v.id &&
      x.contact_id === grant.contact_id &&
      x.state === "sample_shared",
  );
  need(
    share && (!input.share_id || input.share_id === share.id),
    "This invitation has no eligible shared offer.",
    "NOT_AUTHORIZED",
  );
  const price = validateMoney(v.price, true),
    terms = o(v.terms),
    base = `${offer.id}_${n(v.revision)}`;
  if (offer.accepted_version_id && offer.accepted_version_id !== v.id) {
    const prior =
      rows(st, "acceptances").find(
        (x) => x.offer_version_id === offer.accepted_version_id,
      ) || fail("INVALID_STATE", "The original acceptance is missing.");
    const project =
      rows(st, "projects").find(
        (x) => x.offer_id === offer.id && !x.archived,
      ) ||
      fail(
        "INVALID_STATE",
        "The existing project is not available for amendment.",
      );
    need(
      !["cancelled", "completed"].includes(s(project.state)),
      "Reopen the project through its explicit owner workflow before accepting an amendment.",
      "INVALID_STATE",
    );
    const oldMoney = validateMoney(prior.price_snapshot),
      oldTerms = o(prior.terms_snapshot);
    need(
      price.currency === oldMoney.currency,
      "An existing engagement cannot change currency. Resolve a separate agreement without converting recorded money.",
      "CURRENCY_MISMATCH",
    );
    const priorDeposit = halfUp(
        oldMoney.amount_minor,
        n(oldTerms.deposit_basis_points),
        10000,
      ),
      newDeposit = halfUp(
        price.amount_minor,
        n(terms.deposit_basis_points),
        10000,
      );
    const paid = rows(st, "invoices")
      .filter(
        (x) =>
          x.project_id === project.id &&
          x.currency === price.currency &&
          x.state !== "void",
      )
      .reduce((v, x) => v + invoicePaid(st, x.id), 0);
    const authorizedDeposit = rows(st, "invoices")
      .filter(
        (x) =>
          x.project_id === project.id &&
          ["deposit", "amendment_deposit"].includes(s(x.kind)) &&
          x.state !== "void",
      )
      .reduce((v, x) => v + invoiceTotal(st, x), 0);
    need(
      price.amount_minor >= paid && newDeposit >= authorizedDeposit,
      "The amendment would reduce an existing invoiced or paid obligation. Resolve its credit/refund review explicitly; prior payments and terms remain effective.",
      "FINANCIAL_REVIEW_REQUIRED",
    );
    const reservation = get(st, "reservations", project.reservation_id),
      effort = n(v.estimated_effort_minutes, n(reservation.effort_minutes));
    const otherEffort = rows(st, "reservations")
      .filter(
        (x) =>
          x.id !== reservation.id &&
          ["provisional", "committed"].includes(s(x.state)) &&
          (x.state === "committed" ||
            Date.parse(s(x.expires_at)) > Date.parse(st.sample_clock)),
      )
      .reduce((sum, x) => sum + n(x.effort_minutes), 0);
    need(
      effort + otherEffort <=
        n(get(st, "policies", "policy_business").available_effort_minutes),
      "The amended effort exceeds the available capacity. Review capacity before accepting this amendment.",
      "CAPACITY_CONFLICT",
    );
    const scheduleKeys = [
      "delivery_business_days",
      "workdays",
      "holidays",
      "start_local_time",
      "due_local_time",
      "timezone",
      "proposed_start_at",
    ];
    const changedSchedule = scheduleKeys.some(
      (k) => stable(oldTerms[k]) !== stable(terms[k]),
    );
    const proposedStart = s(
      terms.proposed_start_at,
      s(project.committed_start_at),
    );
    let proposed: { start: string; due: string } | null = null;
    if (terms.proposed_start_at)
      need(
        Date.parse(s(terms.proposed_start_at)) >=
          Date.parse(deriveDates(st.sample_clock, terms).start),
        "Choose the next or a later configured business day for the new start.",
        "RESCHEDULING_REVIEW_REQUIRED",
      );
    if (changedSchedule && proposedStart) {
      proposed = amendmentSchedule(proposedStart, terms);
      need(
        Date.parse(proposed.due) > Date.parse(st.sample_clock),
        "The amended deadline would already have elapsed. Prepare a reviewed new start.",
        "RESCHEDULING_REVIEW_REQUIRED",
      );
    }
    if (
      changedSchedule &&
      !terms.proposed_start_at &&
      !project.committed_start_at &&
      Date.parse(s(reservation.expires_at)) <= Date.parse(st.sample_clock)
    )
      fail(
        "RESCHEDULING_REVIEW_REQUIRED",
        "The provisional reservation expired. Prepare a reviewed new start before accepting changed timing.",
      );
    const id = `acceptance_${base}`,
      delta = Math.max(0, newDeposit - authorizedDeposit);
    let invoiceId = "",
      requestId = "";
    put(st, "acceptances", id, {
      audience: "buyer",
      offer_id: offer.id,
      offer_version_id: v.id,
      contact_id: grant.contact_id,
      share_id: share?.id,
      accepted_at: st.sample_clock,
      terms_snapshot: clone(terms),
      price_snapshot: clone(price),
      title_snapshot: v.title,
      deliverables_snapshot: clone(v.deliverables),
      buyer_note_snapshot: v.buyer_note,
      amends_acceptance_id: prior.id,
      project_id: project.id,
      command_id: s(input.command_id, s(input.idempotency_key)),
    });
    if (delta > 0) {
      invoiceId = `invoice_${base}_adjustment`;
      requestId = `payment_request_${base}_adjustment`;
      const lineId = `line_${base}_adjustment`,
        due = new Date(
          Date.parse(st.sample_clock) +
            n(terms.reservation_hours, 48) * 3600000,
        ).toISOString();
      put(st, "invoice_lines", lineId, {
        audience: "buyer",
        invoice_id: invoiceId,
        description: `Additional upfront amount for accepted amendment — ${s(v.title)}`,
        quantity: 1,
        unit_amount: { ...price, amount_minor: delta },
        tax_basis_points: 0,
      });
      put(st, "invoices", invoiceId, {
        audience: "buyer",
        client_id: offer.client_id,
        project_id: project.id,
        offer_version_id: v.id,
        kind: "amendment_deposit",
        number: `SAMPLE-${String(rows(st, "invoices").length + 1).padStart(4, "0")}`,
        state: "draft",
        currency: price.currency,
        line_ids: [lineId],
        due_at: due,
        issued_at: null,
        void_reason: null,
        authorized_by_acceptance_id: id,
        adjustment_of_acceptance_id: prior.id,
      });
      put(st, "payment_requests", requestId, {
        audience: "buyer",
        invoice_id: invoiceId,
        expected: { ...price, amount_minor: delta },
        state: "created",
        mode: "sample",
        expires_at: due,
        attempt: 1,
        external_reference: null,
      });
    }
    put(st, "invoice_adjustments", identifier(st, "invoice_adjustment"), {
      project_id: project.id,
      acceptance_id: id,
      prior_acceptance_id: prior.id,
      currency: price.currency,
      contract_delta_minor: price.amount_minor - oldMoney.amount_minor,
      deposit_delta_minor: newDeposit - priorDeposit,
      invoice_id: invoiceId || null,
      state: "authorized",
      no_money_moved: true,
    });
    const keys = a<string>(terms.required_input_keys);
    for (const existingInput of rows(st, "required_inputs").filter(
      (x) => x.project_id === project.id,
    )) {
      if (existingInput.required !== keys.includes(s(existingInput.key)))
        patch(st, "required_inputs", existingInput, {
          required: keys.includes(s(existingInput.key)),
        });
    }
    for (const key of keys)
      if (
        !rows(st, "required_inputs").some(
          (x) => x.project_id === project.id && x.key === key,
        )
      )
        put(st, "required_inputs", identifier(st, "input"), {
          audience: "buyer",
          project_id: project.id,
          key,
          label: key.replaceAll("_", " "),
          required: true,
          state: "missing",
          answer: null,
          attachment_ids: [],
          provided_at: null,
        });
    const updated = patch(st, "projects", project, {
      accepted_version_id: v.id,
      latest_amendment_acceptance_id: id,
      title: v.title,
      amendment_deposit_required: { ...price, amount_minor: newDeposit },
      pending_amendment_schedule: proposed,
      amendment_schedule_state: proposed
        ? "awaiting_prerequisites"
        : project.amendment_schedule_state,
      required_input_ids: rows(st, "required_inputs")
        .filter((x) => x.project_id === project.id)
        .map((x) => x.id),
    });
    if (terms.proposed_start_at && changedSchedule) {
      put(st, "reservation_history", identifier(st, "reservation_history"), {
        reservation_id: reservation.id,
        project_id: project.id,
        acceptance_id: prior.id,
        state: reservation.state,
        expires_at: reservation.expires_at,
        start_at: reservation.start_at,
        due_at: reservation.due_at,
      });
      patch(st, "reservations", reservation, {
        state: reservation.state === "committed" ? "committed" : "provisional",
        effort_minutes: effort,
        expires_at: new Date(
          Date.parse(st.sample_clock) +
            n(terms.reservation_hours, 48) * 3600000,
        ).toISOString(),
        latest_amendment_acceptance_id: id,
      });
    } else if (effort !== n(reservation.effort_minutes) || changedSchedule)
      patch(st, "reservations", reservation, {
        effort_minutes: effort,
        latest_amendment_acceptance_id: id,
      });
    patch(st, "offers", offer, {
      status: "accepted",
      accepted_version_id: v.id,
    });
    patch(st, "offer_versions", v, {
      state: "accepted",
      immutable_after_acceptance: true,
    });
    patch(st, "buyer_grants", grant, { project_id: project.id });
    patch(st, "engagements", get(st, "engagements", grant.engagement_id), {
      project_id: project.id,
      stage: "project",
    });
    refreshProject(st, updated.id);
    const originalInvoice = rows(st, "invoices").find(
        (x) => x.project_id === project.id && x.kind === "deposit",
      ),
      originalRequest = rows(st, "payment_requests").find(
        (x) => x.invoice_id === originalInvoice?.id,
      );
    patch(st, "acceptances", get(st, "acceptances", id), {
      result_invoice_id: invoiceId || originalInvoice?.id || "",
      result_payment_request_id: requestId || originalRequest?.id || "",
    });
    return {
      ok: true,
      message:
        delta > 0
          ? "Amendment accepted on the existing project. Only the additional upfront amount has a new draft request; prior money and dates remain preserved until prerequisites are complete."
          : "Amendment accepted on the existing project. Reviewed term changes and validated internal dates are saved; payment history is preserved.",
      id: project.id,
      ids: {
        acceptance_id: id,
        project_id: project.id,
        reservation_id: s(project.reservation_id),
        invoice_id: invoiceId || originalInvoice?.id || "",
        payment_request_id: requestId || originalRequest?.id || "",
      },
    };
  }
  const ids = {
    acceptance_id: `acceptance_${base}`,
    project_id: `project_${base}`,
    reservation_id: `reservation_${base}`,
    invoice_id: `invoice_${base}_deposit`,
    payment_request_id: `payment_request_${base}`,
  };
  const expires = new Date(
    Date.parse(st.sample_clock) + n(terms.reservation_hours, 48) * 3600000,
  ).toISOString();
  put(st, "acceptances", ids.acceptance_id, {
    audience: "buyer",
    offer_id: offer.id,
    offer_version_id: v.id,
    contact_id: grant.contact_id,
    share_id: share?.id,
    accepted_at: st.sample_clock,
    terms_snapshot: clone(terms),
    price_snapshot: clone(price),
    title_snapshot: v.title,
    deliverables_snapshot: clone(v.deliverables),
    buyer_note_snapshot: v.buyer_note,
    command_id: s(input.command_id, s(input.idempotency_key)),
  });
  const inputIds = a<string>(terms.required_input_keys).map((key) => {
    const id = `input_${base}_${key}`;
    put(st, "required_inputs", id, {
      audience: "buyer",
      project_id: ids.project_id,
      key,
      label: key.replaceAll("_", " "),
      required: true,
      state: "missing",
      answer: null,
      attachment_ids: [],
      provided_at: null,
    });
    return id;
  });
  const milestoneId = `milestone_${base}_delivery`,
    taskId = `task_${base}_first`;
  put(st, "milestones", milestoneId, {
    project_id: ids.project_id,
    title: "Agreed delivery",
    state: "not_started",
    due_at: null,
    shared_with_buyer: true,
  });
  put(st, "work_tasks", taskId, {
    project_id: ids.project_id,
    title: "Prepare first working draft",
    task_kind: "professional",
    kind: "professional",
    assignee_kind: "owner",
    assignee_id: "owner_alya",
    state: "not_started",
    due_at: null,
    notes: "Professional work is performed by the owner.",
    shared_with_buyer: false,
  });
  put(st, "projects", ids.project_id, {
    client_id: offer.client_id,
    opportunity_id: offer.opportunity_id,
    offer_id: offer.id,
    accepted_version_id: v.id,
    acceptance_id: ids.acceptance_id,
    title: s(v.title),
    brief: s(v.buyer_note),
    state: "awaiting_prerequisites",
    professional_delivery_state: "not_started",
    deposit_state: "awaiting_payment",
    inputs_state: inputIds.length ? "awaiting_inputs" : "complete",
    committed_start_at: null,
    committed_due_at: null,
    reservation_id: ids.reservation_id,
    required_input_ids: inputIds,
    milestone_ids: [milestoneId],
    work_task_ids: [taskId],
    shared_attachment_ids: [],
  });
  put(st, "reservations", ids.reservation_id, {
    project_id: ids.project_id,
    acceptance_id: ids.acceptance_id,
    state: "provisional",
    effort_minutes: n(v.estimated_effort_minutes),
    expires_at: expires,
    committed_at: null,
    start_at: null,
    due_at: null,
  });
  const deposit = {
    ...price,
    amount_minor: halfUp(
      price.amount_minor,
      n(terms.deposit_basis_points),
      10000,
    ),
  };
  const lineId = `line_${base}_deposit`;
  put(st, "invoices", ids.invoice_id, {
    audience: "buyer",
    client_id: offer.client_id,
    project_id: ids.project_id,
    offer_version_id: v.id,
    kind: "deposit",
    number: `SAMPLE-${String(rows(st, "invoices").length + 1).padStart(4, "0")}`,
    state: "draft",
    currency: price.currency,
    line_ids: [lineId],
    due_at: expires,
    issued_at: null,
    void_reason: null,
    authorized_by_acceptance_id: ids.acceptance_id,
  });
  put(st, "invoice_lines", lineId, {
    audience: "buyer",
    invoice_id: ids.invoice_id,
    description: `${n(terms.deposit_basis_points) / 100}% deposit — ${s(v.title)}`,
    quantity: 1,
    unit_amount: deposit,
    tax_basis_points: 0,
  });
  put(st, "payment_requests", ids.payment_request_id, {
    audience: "buyer",
    invoice_id: ids.invoice_id,
    expected: deposit,
    state: "created",
    mode: "sample",
    expires_at: expires,
    attempt: 1,
    external_reference: null,
  });
  patch(st, "offers", offer, { status: "accepted", accepted_version_id: v.id });
  patch(st, "offer_versions", v, {
    state: "accepted",
    immutable_after_acceptance: true,
  });
  patch(st, "buyer_grants", grant, { project_id: ids.project_id });
  const engagement = get(st, "engagements", grant.engagement_id);
  patch(st, "engagements", engagement, {
    project_id: ids.project_id,
    stage: "project",
  });
  patch(st, "clients", get(st, "clients", offer.client_id), {
    status: "active",
    next_action: "Provide deposit and project inputs",
  });
  patch(st, "opportunities", get(st, "opportunities", offer.opportunity_id), {
    status: "won",
    next_action: "Complete project prerequisites",
  });
  return {
    ok: true,
    message:
      "Offer accepted. Your provisional reservation, project, and deposit request are ready.",
    id: ids.project_id,
    ids,
  };
}
function issueInvoice(st: StoreState, invoice: Entity) {
  need(
    invoice.state === "draft",
    "Only a draft invoice can be issued.",
    "INVALID_STATE",
  );
  need(
    invoiceTotal(st, invoice) > 0,
    "Add a positive invoice line before issue.",
  );
  for (const l of rows(st, "invoice_lines").filter(
    (x) => x.invoice_id === invoice.id,
  )) {
    validateFields(st, "invoice_lines", l);
    need(
      o(l.unit_amount).currency === invoice.currency,
      "Invoice line currencies must match.",
      "CURRENCY_MISMATCH",
    );
  }
  return patch(st, "invoices", invoice, {
    state: "issued",
    issued_at: st.sample_clock,
    issued_snapshot: {
      currency: invoice.currency,
      due_at: invoice.due_at,
      lines: clone(
        rows(st, "invoice_lines").filter((x) => x.invoice_id === invoice.id),
      ),
    },
  });
}
function runCommand(st: StoreState, type: string, input: Input): Result {
  const ok = (
    message: string,
    id?: string,
    ids?: Record<string, string>,
  ): Result => ({ ok: true, message, id, ids });
  const target = s(
    input.id,
    s(
      input.offer_id,
      s(
        input.project_id,
        s(
          input.run_id,
          s(
            input.invoice_id,
            s(input.payment_request_id, s(input.issue_id, s(input.input_id))),
          ),
        ),
      ),
    ),
  );
  switch (type) {
    case "session.set":
    case "session.enterDemo":
    case "session.signIn":
    case "session.signUp":
    case "session.signOut": {
      const auth =
        type === "session.signOut" ? false : input.authenticated !== false;
      st.session = auth;
      if (auth)
        put(st, "sample_sessions", "session_current", {
          mode: "sample",
          role: s(input.role, "owner"),
          owner_id: "owner_alya",
          grant_id: input.grant_id || null,
          expires_at: new Date(
            Date.parse(st.sample_clock) + 30 * 86400000,
          ).toISOString(),
        });
      else delete table(st, "sample_sessions").session_current;
      return ok(
        auth
          ? "Sample session opened."
          : "Signed out. Your local workspace is retained.",
      );
    }
    case "record.save": {
      const rec = saveRecord(st, s(input.table), input);
      return ok("Changes saved.", rec.id);
    }
    case "record.archive": {
      const t = s(input.table);
      need(editableTables.has(t), "This record cannot be archived directly.");
      const rec = get(st, t, target);
      expect(rec, input);
      if (t === "projects" && input.archived !== false)
        need(
          ["completed", "cancelled"].includes(s(rec.state)),
          "Complete or cancel this project before archiving.",
          "INVALID_STATE",
        );
      const extra: Input =
        t === "projects"
          ? {
              state:
                input.archived === false
                  ? s(rec.previous_state, "completed")
                  : "archived",
              previous_state:
                input.archived === false ? rec.previous_state : rec.state,
            }
          : {};
      patch(st, t, rec, {
        ...extra,
        archived: input.archived !== false,
        archived_at: input.archived === false ? null : st.sample_clock,
      });
      return ok(
        input.archived === false ? "Record restored." : "Record archived.",
        rec.id,
      );
    }
    case "opportunity.save":
    case "opportunity.create":
    case "opportunity.import":
    case "opportunity.update": {
      const rec = manualOpportunity(st, input);
      return ok("Client request saved for assessment.", rec.id);
    }
    case "opportunity.qualify":
    case "opportunity.decline":
    case "opportunity.archive":
    case "opportunity.restore": {
      const rec = get(st, "opportunities", target);
      expect(rec, input);
      const action = type.split(".")[1];
      patch(st, "opportunities", rec, {
        status:
          action === "qualify"
            ? "qualified"
            : action === "decline"
              ? "declined"
              : action === "archive"
                ? "archived"
                : s(rec.previous_status, "new"),
        previous_status:
          action === "archive" || action === "decline"
            ? rec.status
            : rec.previous_status,
        archived: action === "archive",
        decision_reason: s(input.reason),
      });
      return ok(
        `Opportunity ${action === "qualify" ? "qualified" : action === "restore" ? "restored" : action + "d"}.`,
        rec.id,
      );
    }
    case "source.refresh": {
      const source = get(st, "sources", target);
      expect(source, input);
      patch(st, "sources", source, {
        last_checked_at: st.sample_clock,
        refresh_note:
          "Sample source checked against saved content. No external scraping occurred.",
      });
      return ok(
        "Saved sample content checked. No external source was fetched.",
        source.id,
      );
    }
    case "offer.saveDraft":
    case "offer.returnRevision":
    case "offer.amend": {
      const offer = offerDraft(st, input);
      if (input.submit_for_review === true) {
        const version = get(st, "offer_versions", offer.current_version_id);
        completeOffer(st, version);
        reviewAssessments(st, version);
        patch(st, "offers", offer, { status: "awaiting_review" });
        patch(st, "offer_versions", version, { state: "awaiting_review" });
      }
      return ok(
        "New offer revision saved. Review and approve this exact version before sharing.",
        offer.id,
      );
    }
    case "offer.requestReview": {
      const { offer, version } = exactOffer(st, input);
      need(
        ["draft", "change_requested"].includes(s(offer.status)),
        "This offer is not an editable draft.",
        "INVALID_STATE",
      );
      completeOffer(st, version);
      reviewAssessments(st, version);
      patch(st, "offer_versions", version, { state: "awaiting_review" });
      patch(st, "offers", offer, { status: "awaiting_review" });
      return ok("Offer is ready for owner review.", offer.id);
    }
    case "offer.approve": {
      const { offer, version } = exactOffer(st, input);
      need(
        ["awaiting_review", "approved"].includes(s(offer.status)),
        "Request review before approving this offer.",
        "INVALID_STATE",
      );
      completeOffer(st, version);
      reviewAssessments(st, version);
      const dest = s(
        input.destination_contact_id,
        s(
          rows(st, "contacts").find((x) => x.client_id === offer.client_id)?.id,
        ),
      );
      const contact = get(st, "contacts", dest);
      need(
        contact.client_id === offer.client_id,
        "Choose a contact belonging to this offer’s client.",
      );
      for (const old of rows(st, "approvals").filter(
        (x) => o(x.subject_ref).id === version.id && x.state === "current",
      ))
        patch(st, "approvals", old, { state: "superseded" });
      const approved = patch(st, "offer_versions", version, {
        state: "approved",
      });
      put(st, "approvals", identifier(st, "approval"), {
        subject_ref: {
          table: "offer_versions",
          id: approved.id,
          version: approved.version,
        },
        action: "share_offer",
        approved_by: "owner_alya",
        destination_contact_id: dest,
        state: "current",
        approved_at: st.sample_clock,
      });
      patch(st, "offers", offer, { status: "approved" });
      return ok(
        "Exact offer approved. It is ready to share when you choose.",
        offer.id,
      );
    }
    case "offer.share": {
      const { offer, version } = exactOffer(st, input);
      need(
        offer.status === "approved",
        "Approve the current offer before sharing.",
        "APPROVAL_REQUIRED",
      );
      completeOffer(st, version);
      reviewAssessments(st, version);
      const approval =
        rows(st, "approvals").find(
          (x) =>
            o(x.subject_ref).id === version.id &&
            x.state === "current" &&
            x.action === "share_offer",
        ) ||
        fail(
          "APPROVAL_REQUIRED",
          "Approve this exact offer and destination first.",
        );
      const destination = s(
        input.destination_contact_id,
        s(approval.destination_contact_id),
      );
      need(
        destination === approval.destination_contact_id &&
          o(approval.subject_ref).version === version.version,
        "The content or destination changed after approval. Review again.",
        "APPROVAL_STALE",
      );
      if (input.channel !== "sample_link")
        capability(st, s(input.connection_id, "gmail"), "simulate_send");
      let engagement = rows(st, "engagements").find(
        (x) => x.offer_id === offer.id && x.contact_id === destination,
      );
      if (!engagement) {
        const contact = get(st, "contacts", destination),
          convId = identifier(st, "conversation"),
          engId = identifier(st, "engagement"),
          grantId = identifier(st, "grant");
        put(st, "conversations", convId, {
          audience: "buyer",
          client_id: offer.client_id,
          buyer_contact_id: destination,
          status: "open",
          owner_review_requested: false,
          brief_requirements_id: version.requirements_id,
          latest_message_id: null,
        });
        engagement = put(st, "engagements", engId, {
          client_id: contact.client_id,
          contact_id: destination,
          opportunity_id: offer.opportunity_id,
          conversation_id: convId,
          offer_id: offer.id,
          buyer_grant_id: grantId,
          project_id: null,
          stage: "offer_review",
        });
        put(st, "buyer_grants", grantId, {
          audience: "buyer",
          engagement_id: engId,
          contact_id: destination,
          conversation_id: convId,
          offer_id: offer.id,
          project_id: null,
          state: "active",
          expires_at: new Date(
            Date.parse(st.sample_clock) + 30 * 86400000,
          ).toISOString(),
          token_kind: "local_demo_navigation_only",
        });
      }
      const shareId = identifier(st, "share");
      put(st, "share_records", shareId, {
        audience: "buyer",
        offer_id: offer.id,
        offer_version_id: version.id,
        approval_id: approval.id,
        contact_id: destination,
        state: "sample_shared",
        shared_at: st.sample_clock,
        connection_id: s(input.connection_id, "gmail"),
        command_id: s(input.command_id, s(input.idempotency_key)),
      });
      patch(st, "offer_versions", version, { state: "shared" });
      patch(st, "offers", offer, {
        status: "shared",
        shared_version_id: version.id,
      });
      return ok(
        "Offer shared in the sample workspace. No real email was sent.",
        offer.id,
        { share_id: shareId },
      );
    }
    case "offer.requestChanges": {
      const grant = granted(st, input);
      const offer = get(st, "offers", target || grant.offer_id);
      expect(offer, input);
      const displayed = s(
        input.offer_version_id,
        s(offer.accepted_version_id, s(offer.current_version_id)),
      );
      const version = get(st, "offer_versions", displayed);
      const acceptedDisplay = displayed === offer.accepted_version_id;
      need(
        version.offer_id === offer.id &&
          (acceptedDisplay || displayed === offer.current_version_id),
        "This offer version is not available.",
        "OFFER_SUPERSEDED",
      );
      need(
        grant.offer_id === offer.id &&
          (acceptedDisplay || ["shared", "accepted"].includes(s(offer.status))),
        "Only this buyer’s shared or accepted offer can request changes.",
        "INVALID_STATE",
      );
      const reason = s(
        input.reason,
        s(input.requested_changes, s(input.content)),
      ).trim();
      need(reason.length >= 3, "Describe the changes you need.");
      if (acceptedDisplay) {
        put(st, "change_requests", identifier(st, "change_request"), {
          offer_id: offer.id,
          offer_version_id: version.id,
          engagement_id: grant.engagement_id,
          reason,
          state: "requested",
          kind: "amendment",
        });
      } else {
        const successor = offerDraft(st, {
          id: offer.id,
          expected_version: offer.version,
          reason,
          values: {},
        });
        patch(st, "offer_versions", get(st, "offer_versions", version.id), {
          state: "change_requested",
          requested_changes: reason,
        });
        patch(
          st,
          "offer_versions",
          get(st, "offer_versions", successor.current_version_id),
          { buyer_requested_changes: reason },
        );
        put(st, "change_requests", identifier(st, "change_request"), {
          offer_id: offer.id,
          offer_version_id: version.id,
          successor_version_id: successor.current_version_id,
          engagement_id: grant.engagement_id,
          reason,
          state: "requested",
          kind: "offer_revision",
        });
      }
      put(st, "messages", identifier(st, "message"), {
        audience: "buyer",
        conversation_id: grant.conversation_id,
        sender_kind: "buyer",
        sender_id: grant.contact_id,
        content: `Requested offer changes: ${reason}`,
        delivery_state: "sample_recorded",
        shared_with_buyer: true,
        attachment_ids: [],
      });
      return ok("Your requested changes are saved for the owner.", offer.id);
    }
    case "offer.accept":
      return acceptOffer(st, input);
    case "offer.withdraw": {
      const { offer, version } = exactOffer(st, input);
      need(
        offer.status !== "accepted",
        "Accepted terms remain part of the project history. Create an amendment instead.",
        "INVALID_STATE",
      );
      need(
        !["withdrawn", "expired"].includes(s(offer.status)),
        "This offer is no longer active.",
        "INVALID_STATE",
      );
      patch(st, "offer_versions", version, {
        state: "withdrawn",
        withdraw_reason: s(input.reason),
      });
      patch(st, "offers", offer, { status: "withdrawn" });
      return ok("Offer withdrawn. Its history is retained.", offer.id);
    }
    case "payment.startRequest": {
      const request = get(st, "payment_requests", target);
      expect(request, input);
      const invoice = get(st, "invoices", request.invoice_id);
      scope(st, input, "project_id", s(invoice.project_id));
      if (request.state === "confirmed")
        return ok("This deposit is already confirmed.", request.id);
      if (invoice.state === "draft") {
        need(
          invoice.authorized_by_acceptance_id,
          "This invoice needs owner review before issue.",
          "APPROVAL_REQUIRED",
        );
        issueInvoice(st, invoice);
      }
      need(
        invoice.state !== "void",
        "This invoice was voided. Ask the owner for a replacement.",
        "INVALID_STATE",
      );
      patch(st, "payment_requests", request, {
        state: "pending",
        started_at: st.sample_clock,
      });
      return ok(
        "Sample payment instructions opened. No money has moved.",
        request.id,
      );
    }
    case "payment.simulateReceipt": {
      const request = get(st, "payment_requests", target);
      const invoice = get(st, "invoices", request.invoice_id);
      scope(st, input, "project_id", s(invoice.project_id));
      const gross = validateMoney(input.gross, true),
        fee = validateMoney(input.fee ?? { ...gross, amount_minor: 0 });
      need(
        fee.currency === gross.currency &&
          fee.amount_minor <= gross.amount_minor,
        "The fee must use the receipt currency and cannot exceed its gross amount.",
      );
      const providerEvent = s(input.provider_event_id);
      need(
        providerEvent.trim(),
        "A stable sample provider event identifier is required.",
      );
      const received = s(
        input.observed_at,
        s(input.received_at, st.sample_clock),
      );
      validateDate(received);
      need(
        Date.parse(received) <= Date.parse(st.sample_clock),
        "A receipt cannot be observed in the future.",
      );
      const existing = rows(st, "receipts").find(
        (x) => x.provider_event_id === providerEvent,
      );
      if (existing) {
        need(
          stable(existing.gross) === stable(gross) &&
            stable(existing.fee) === stable(fee) &&
            existing.payment_request_id === request.id &&
            existing.received_at === received,
          "This provider event already exists with different content. No receipt was changed.",
          "DUPLICATE_PROVIDER_EVENT_CONFLICT",
        );
        return {
          ...ok("This receipt was already recorded.", existing.id),
          replayed: true,
        };
      }
      const receipt = put(st, "receipts", identifier(st, "receipt"), {
        payment_request_id: request.id,
        gross,
        fee,
        net: { ...gross, amount_minor: gross.amount_minor - fee.amount_minor },
        observation_state: "sample_confirmed",
        reconciliation_state: "unmatched",
        provider: "sample",
        provider_event_id: providerEvent,
        received_at: received,
        evidence_source_id: null,
      });
      let reason = "";
      if (invoice.currency !== gross.currency) reason = "wrong_currency";
      else if (invoice.state === "draft" || invoice.state === "void")
        reason = "invoice_not_issued";
      else {
        const remaining = invoiceOutstanding(st, invoice.id),
          amount = Math.min(gross.amount_minor, remaining);
        if (amount > 0)
          allocation(
            st,
            receipt,
            invoice,
            amount,
            "Identified sample request with exact matching currency",
          );
        if (gross.amount_minor < remaining) reason = "partial_receipt";
        else if (gross.amount_minor > remaining) reason = "excess_receipt";
      }
      if (reason)
        put(st, "finance_issues", identifier(st, "finance_issue"), {
          receipt_id: receipt.id,
          payment_request_id: request.id,
          invoice_id: invoice.id,
          kind: reason,
          status: "open",
          state: "open",
          title: reason.replaceAll("_", " "),
          summary:
            reason === "wrong_currency"
              ? "Receipt currency does not match the invoice. No amount was allocated."
              : reason === "excess_receipt"
                ? "Excess amount remains unapplied credit for review."
                : "Payment needs review; the outstanding balance remains visible.",
          action_history: [],
        });
      return ok(
        reason
          ? "Sample receipt recorded with a review item. Only checked gross allocations reduce the balance."
          : "Sample receipt recorded and reconciled to the invoice.",
        receipt.id,
      );
    }
    case "payment.replayReceipt": {
      const rec = get(st, "receipts", input.receipt_id);
      need(
        rec.payment_request_id === target,
        "The receipt does not belong to this request.",
        "NOT_AUTHORIZED",
      );
      return runCommand(st, "payment.simulateReceipt", {
        ...input,
        provider_event_id: rec.provider_event_id,
        gross: rec.gross,
        fee: rec.fee,
        observed_at: rec.received_at,
      });
    }
    case "payment.check": {
      const request = get(st, "payment_requests", target);
      patch(st, "payment_requests", request, {
        last_checked_at: st.sample_clock,
      });
      return ok(
        "Saved receipt observations checked. This action does not manufacture a payment.",
        request.id,
      );
    }
    case "finance.allocateReceipt": {
      const receipt = get(st, "receipts", input.receipt_id),
        invoice = get(st, "invoices", input.invoice_id);
      expect(receipt, { expected_version: input.expected_receipt_version });
      expect(invoice, { expected_version: input.expected_invoice_version });
      const amount = n(input.amount_minor, n(o(input.amount).amount_minor));
      if (input.amount)
        need(
          o(input.amount).currency === invoice.currency,
          "Allocation currency must match the invoice.",
          "CURRENCY_MISMATCH",
        );
      const rec = allocation(
        st,
        receipt,
        invoice,
        amount,
        s(input.reason, "Owner checked allocation"),
      );
      return ok("Receipt allocation saved.", rec.id);
    }
    case "finance.reverseAllocation": {
      const rec = get(st, "allocations", target);
      expect(rec, input);
      need(
        rec.state === "posted",
        "Only a posted allocation can be reversed.",
        "INVALID_STATE",
      );
      need(s(input.reason).trim(), "Explain why this allocation is reversed.");
      patch(st, "allocations", rec, {
        state: "reversed",
        reversal_reason: s(input.reason),
        reversed_at: st.sample_clock,
      });
      put(st, "allocation_reversals", identifier(st, "reversal"), {
        allocation_id: rec.id,
        reason: input.reason,
        amount: rec.amount,
      });
      updateInvoice(st, get(st, "invoices", rec.invoice_id));
      patch(st, "receipts", get(st, "receipts", rec.receipt_id), {
        reconciliation_state: "unmatched",
      });
      return ok("Allocation reversed with its history retained.", rec.id);
    }
    case "finance.resolveIssue": {
      const issue = get(st, "finance_issues", target);
      expect(issue, input);
      const action = s(input.action),
        note = s(input.note).trim();
      need(
        [
          "request_information",
          "attach_evidence",
          "allocate_checked_receipt",
          "dismiss_duplicate",
          "mark_not_a_match",
        ].includes(action),
        "Choose a supported resolution.",
      );
      need(note.length >= 3, "Add a useful note explaining this action.");
      let relatedId = "";
      if (action === "allocate_checked_receipt") {
        const receipt = get(
            st,
            "receipts",
            input.receipt_id ?? input.related_receipt_id ?? issue.receipt_id,
          ),
          inv = get(st, "invoices", input.invoice_id ?? issue.invoice_id);
        relatedId = allocation(
          st,
          receipt,
          inv,
          n(
            input.amount_minor,
            Math.min(
              invoiceOutstanding(st, inv.id),
              n(o(receipt.gross).amount_minor),
            ),
          ),
          note,
        ).id;
      }
      if (action === "attach_evidence") {
        need(
          a(input.evidence_ids).length > 0 || s(input.evidence_url).trim(),
          "Select an available attachment or add a secure evidence URL.",
        );
        if (input.evidence_url)
          validateFields(st, "sources", { url: input.evidence_url });
        for (const id of a<string>(input.evidence_ids)) {
          const attachment = get(st, "attachments", id);
          need(
            attachment.availability === "available",
            "This evidence file is unavailable. Reattach it first.",
            "FILE_UNAVAILABLE",
          );
        }
      }
      if (action === "dismiss_duplicate") {
        const original = get(
          st,
          "receipts",
          input.related_receipt_id ?? input.original_receipt_id,
        );
        const duplicate = get(st, "receipts", issue.receipt_id);
        need(
          original.id !== duplicate.id &&
            original.provider === duplicate.provider &&
            stable(original.gross) === stable(duplicate.gross) &&
            original.provider_event_id === duplicate.provider_event_id,
          "Link the original matching provider receipt; distinct receipts are not duplicates.",
        );
      }
      if (action === "request_information") {
        const invoice = get(st, "invoices", issue.invoice_id);
        const conv = rows(st, "conversations").find(
          (x) => x.client_id === invoice.client_id,
        );
        relatedId = put(st, "messages", identifier(st, "message"), {
          conversation_id: conv?.id,
          sender_kind: "owner",
          sender_id: "owner_alya",
          content: note,
          delivery_state: "draft",
          shared_with_buyer: false,
          attachment_ids: [],
          approved_content_version: null,
        }).id;
      }
      const actionRec = put(
        st,
        "issue_actions",
        identifier(st, "issue_action"),
        {
          issue_id: issue.id,
          action,
          note,
          evidence_ids: a(input.evidence_ids),
          evidence_url: s(input.evidence_url),
          related_record_id: relatedId || input.related_receipt_id || null,
        },
      );
      patch(st, "finance_issues", issue, {
        status:
          action === "allocate_checked_receipt" ||
          action === "dismiss_duplicate"
            ? "resolved"
            : action === "mark_not_a_match"
              ? "resolved"
              : "awaiting_information",
        state:
          action === "allocate_checked_receipt" ||
          action === "dismiss_duplicate" ||
          action === "mark_not_a_match"
            ? "resolved"
            : "open",
        resolution: action,
        resolution_action: action,
        resolution_note: note,
        action_history: [...a(issue.action_history), actionRec.id],
      });
      return ok(
        action === "request_information"
          ? "Information request saved as a draft for review."
          : "Issue action and evidence saved. Payment certainty remains based on actual allocations.",
        issue.id,
      );
    }
    case "project.provideInput": {
      const rec = get(st, "required_inputs", target);
      expect(rec, input);
      scope(st, input, "project_id", s(rec.project_id));
      const answer = s(input.answer).trim(),
        files = a<string>(input.attachment_ids);
      need(
        answer.length >= 3 || files.length > 0,
        "Provide a meaningful answer or attach an available file.",
      );
      need(files.length <= 5, "Attach no more than five files per action.");
      for (const id of files) {
        const f = get(st, "attachments", id);
        let allowed = attachmentMatchesProject(
          st,
          f,
          get(st, "projects", rec.project_id),
        );
        if (input.grant_id) {
          const grant = granted(st, input);
          allowed =
            allowed &&
            f.shared_with_buyer === true &&
            (f.project_id === rec.project_id ||
              f.engagement_id === grant.engagement_id ||
              f.conversation_id === grant.conversation_id);
        }
        need(
          f.availability === "available" && allowed,
          "This file is unavailable or belongs to another engagement.",
          "FILE_UNAVAILABLE",
        );
      }
      for (const id of files) {
        const f = get(st, "attachments", id);
        patch(st, "attachments", f, {
          project_id: rec.project_id,
          shared_with_buyer: true,
          audience: "buyer",
        });
      }
      patch(st, "required_inputs", rec, {
        state: "provided",
        answer,
        attachment_ids: files,
        provided_at: st.sample_clock,
        review_reason: null,
      });
      refreshProject(st, s(rec.project_id));
      return ok(
        "Project input saved. Prerequisites have been checked.",
        rec.id,
      );
    }
    case "project.requestInputChanges": {
      const rec = get(st, "required_inputs", target);
      expect(rec, input);
      need(s(input.reason).trim(), "Describe what needs to change.");
      patch(st, "required_inputs", rec, {
        state: "missing",
        review_reason: input.reason,
      });
      refreshProject(st, s(rec.project_id));
      return ok("Requested input changes recorded.", rec.id);
    }
    case "project.proposeReschedule": {
      const project = get(st, "projects", target);
      expect(project, input);
      need(
        project.acceptance_id,
        "A linked accepted agreement is required for a revised client schedule.",
      );
      need(
        !["completed", "cancelled", "archived"].includes(s(project.state)),
        "Reopen this project explicitly before proposing a new schedule.",
        "INVALID_STATE",
      );
      const reservation = get(st, "reservations", project.reservation_id);
      expect(reservation, {
        expected_version: input.expected_reservation_version,
      });
      const accepted = get(
          st,
          "acceptances",
          project.latest_amendment_acceptance_id || project.acceptance_id,
        ),
        terms = { ...o(accepted.terms_snapshot) };
      const start = s(input.proposed_start_at);
      validateDate(start);
      need(
        /T09:00:00\+07:00$/.test(start),
        "Choose 09:00 Asia/Jakarta for the proposed business-day start.",
      );
      need(
        Date.parse(start) >=
          Date.parse(deriveDates(st.sample_clock, terms).start),
        "Choose the next or a later configured business day.",
        "RESCHEDULING_REVIEW_REQUIRED",
      );
      const dates = amendmentSchedule(start, terms);
      need(
        s(input.reason).trim().length >= 3,
        "Explain why the schedule needs to change.",
      );
      const other = rows(st, "reservations")
        .filter(
          (x) =>
            x.id !== reservation.id &&
            ["committed", "provisional"].includes(s(x.state)) &&
            (x.state === "committed" ||
              Date.parse(s(x.expires_at)) > Date.parse(st.sample_clock)),
        )
        .reduce((v, x) => v + n(x.effort_minutes), 0);
      need(
        n(reservation.effort_minutes) + other <=
          n(get(st, "policies", "policy_business").available_effort_minutes),
        "Review capacity before proposing this new start.",
        "CAPACITY_CONFLICT",
      );
      const offer = get(st, "offers", project.offer_id),
        version = get(st, "offer_versions", accepted.offer_version_id);
      const draft = offerDraft(st, {
        id: offer.id,
        expected_version: offer.version,
        values: {
          title: version.title,
          deliverables: version.deliverables,
          price: accepted.price_snapshot,
          buyer_note: version.buyer_note,
          estimated_effort_minutes: reservation.effort_minutes,
          terms: { ...terms, proposed_start_at: start },
          amendment_reason: s(input.reason),
          expires_at: new Date(
            Date.parse(st.sample_clock) + 7 * 86400000,
          ).toISOString(),
        },
      });
      const proposal = put(
        st,
        "calendar_events",
        identifier(st, "calendar_proposal"),
        {
          project_id: project.id,
          title: `Proposed new start — ${s(project.title)}`,
          kind: "reschedule_proposal",
          state: "proposed",
          starts_at: dates.start,
          ends_at: new Date(Date.parse(dates.start) + 1800000).toISOString(),
          proposed_due_at: dates.due,
          timezone: "Asia/Jakarta",
          external_invitation_state: "not_requested",
          shared_with_buyer: false,
          offer_id: offer.id,
          offer_version_id: draft.current_version_id,
          reason: s(input.reason),
        },
      );
      patch(st, "projects", project, { reschedule_proposal_id: proposal.id });
      return ok(
        "Revised schedule saved as an offer amendment. Review, share, and obtain buyer acceptance before changing committed dates.",
        project.id,
        {
          offer_id: offer.id,
          offer_version_id: s(draft.current_version_id),
          proposal_id: proposal.id,
        },
      );
    }
    case "project.commitStart":
    case "project.reschedule": {
      const project = get(st, "projects", target);
      expect(project, input);
      const reservation = get(st, "reservations", project.reservation_id);
      expect(reservation, {
        expected_version: input.expected_reservation_version,
      });
      need(
        depositComplete(st, project) &&
          rows(st, "required_inputs")
            .filter((x) => x.project_id === project.id && x.required !== false)
            .every((x) => x.state === "provided"),
        "Confirm the full gross deposit and all required inputs first.",
        "PREREQUISITES_MISSING",
      );
      if (type === "project.reschedule") {
        const acceptance = get(
            st,
            "acceptances",
            project.latest_amendment_acceptance_id || project.acceptance_id,
          ),
          terms = o(acceptance.terms_snapshot);
        need(
          acceptance.amends_acceptance_id && terms.proposed_start_at,
          "Prepare a revised schedule amendment and obtain buyer acceptance first.",
          "APPROVAL_REQUIRED",
        );
        need(
          input.confirmed === true,
          "Review and confirm applying the exact buyer-accepted schedule.",
        );
        const dates = amendmentSchedule(s(terms.proposed_start_at), terms);
        if (
          project.committed_start_at === dates.start &&
          project.committed_due_at === dates.due &&
          project.amendment_schedule_state === "committed"
        )
          return ok("This accepted schedule is already applied.", project.id);
        const issue = amendmentScheduleIssue(st, project, dates);
        need(
          !issue,
          issue || "Review the schedule.",
          "RESCHEDULING_REVIEW_REQUIRED",
        );
        applyAmendmentSchedule(st, project, dates, acceptance.id);
        return ok(
          "The exact buyer-accepted schedule is applied to the existing reservation and internal calendar.",
          project.id,
        );
      }
      need(
        Date.parse(st.sample_clock) < Date.parse(s(reservation.expires_at)) ||
          reservation.state === "committed",
        "The reservation expired. Prepare a revised schedule amendment first.",
        "RESERVATION_EXPIRED",
      );
      refreshProject(st, project.id);
      return ok(
        "Eligible project dates checked against accepted terms. No external invitation was sent.",
        project.id,
      );
    }
    case "project.reportDelivery": {
      const rec = get(st, "projects", target);
      expect(rec, input);
      need(
        rec.state === "active" &&
          ["not_started", "in_progress"].includes(
            s(rec.professional_delivery_state),
          ),
        "Only an active project can report delivery.",
        "INVALID_STATE",
      );
      need(
        s(input.message).trim() || a(input.attachment_ids).length,
        "Add a delivery message or available files.",
      );
      for (const id of a<string>(input.attachment_ids)) {
        const attachment = get(st, "attachments", id);
        need(
          attachment.availability === "available" &&
            attachment.project_id === rec.id &&
            attachment.shared_with_buyer === true &&
            attachmentMatchesProject(st, attachment, rec),
          "Choose an available, explicitly shared file from this project.",
          "FILE_UNAVAILABLE",
        );
      }
      const engagement = rows(st, "engagements").find(
        (x) => x.project_id === rec.id,
      );
      const conv = engagement
        ? get(st, "conversations", engagement.conversation_id)
        : rows(st, "conversations").find((x) => x.client_id === rec.client_id);
      const delivery = conv
        ? put(st, "messages", identifier(st, "message"), {
            conversation_id: conv.id,
            project_id: rec.id,
            kind: "delivery",
            sender_kind: "owner",
            sender_id: "owner_alya",
            subject: `Delivery ready — ${s(rec.title)}`,
            content: s(
              input.message,
              "The agreed delivery is ready for your review.",
            ),
            delivery_state: "draft",
            shared_with_buyer: false,
            destination_contact_id: conv.buyer_contact_id,
            attachment_ids: a(input.attachment_ids),
            approved_content_version: null,
          })
        : undefined;
      patch(st, "projects", rec, {
        professional_delivery_state: "owner_reported_delivered",
        delivery_message_id: delivery?.id || null,
        delivery_message: s(input.message),
        shared_attachment_ids: [
          ...new Set([
            ...a<string>(rec.shared_attachment_ids),
            ...a<string>(input.attachment_ids),
          ]),
        ],
        delivery_reported_at: st.sample_clock,
      });
      return ok(
        "Delivery reported and an unsent client message prepared. Review the exact message before sending; buyer acceptance remains separate.",
        rec.id,
        delivery ? { message_id: delivery.id } : undefined,
      );
    }
    case "project.acceptDelivery": {
      const rec = get(st, "projects", target);
      expect(rec, input);
      const grant = granted(st, input);
      need(
        grant.project_id === rec.id,
        "This invitation belongs to another project.",
        "NOT_AUTHORIZED",
      );
      need(
        rec.professional_delivery_state === "owner_reported_delivered",
        "The owner has not reported delivery yet.",
        "INVALID_STATE",
      );
      patch(st, "projects", rec, {
        professional_delivery_state: "buyer_accepted",
        buyer_accepted_at: st.sample_clock,
      });
      return ok("Delivery acceptance saved.", rec.id);
    }
    case "project.complete":
    case "project.cancel":
    case "project.archive":
    case "project.reopen": {
      const rec = get(st, "projects", target);
      expect(rec, input);
      const action = type.split(".")[1];
      if (action === "complete") {
        need(
          rec.professional_delivery_state === "buyer_accepted",
          "Buyer delivery acceptance is required before owner completion.",
          "INVALID_STATE",
        );
        if (rec.reservation_id)
          patch(
            st,
            "reservations",
            get(st, "reservations", rec.reservation_id),
            { state: "released" },
          );
        for (const cal of rows(st, "calendar_events").filter(
          (x) =>
            x.project_id === rec.id &&
            Date.parse(s(x.ends_at)) > Date.parse(st.sample_clock),
        ))
          patch(st, "calendar_events", cal, { state: "completed" });
      }
      if (action === "archive")
        need(
          ["completed", "cancelled"].includes(s(rec.state)),
          "Complete or cancel this project before archiving.",
          "INVALID_STATE",
        );
      if (action === "cancel") {
        for (const task of rows(st, "work_tasks").filter(
          (x) =>
            x.project_id === rec.id &&
            !["completed", "owner_reported_delivered"].includes(s(x.state)),
        ))
          patch(st, "work_tasks", task, { state: "cancelled" });
        for (const cal of rows(st, "calendar_events").filter(
          (x) =>
            x.project_id === rec.id &&
            Date.parse(s(x.ends_at)) > Date.parse(st.sample_clock),
        ))
          patch(st, "calendar_events", cal, { state: "cancelled" });
        need(s(input.reason).trim(), "Add a cancellation reason.");
        if (rec.reservation_id)
          patch(
            st,
            "reservations",
            get(st, "reservations", rec.reservation_id),
            { state: "released" },
          );
      }
      if (action === "reopen")
        need(
          ["completed", "cancelled", "archived"].includes(s(rec.state)) ||
            rec.archived,
          "This project is already open.",
          "INVALID_STATE",
        );
      patch(
        st,
        "projects",
        rec,
        action === "archive"
          ? {
              archived: true,
              archived_at: st.sample_clock,
              previous_state: rec.state,
              state: "archived",
            }
          : {
              state:
                action === "complete"
                  ? "completed"
                  : action === "cancel"
                    ? "cancelled"
                    : "active",
              archived: false,
              cancellation_reason:
                action === "cancel" ? s(input.reason) : rec.cancellation_reason,
            },
      );
      return ok(
        `Project ${action === "complete" ? "completed" : action === "cancel" ? "cancelled" : action === "archive" ? "archived" : "reopened"}. Commercial and payment history is retained.`,
        rec.id,
      );
    }
    case "project.create":
    case "project.update": {
      const rec = saveRecord(st, "projects", {
        ...input,
        values: {
          ...(type === "project.create"
            ? {
                state: "active",
                professional_delivery_state: "not_started",
                inputs_state: "not_configured",
              }
            : {}),
          ...o(input.values),
        },
      });
      return ok("Project saved.", rec.id);
    }
    case "task.completeMany": {
      const ids = a<string>(input.ids);
      need(ids.length > 0, "Select tasks to complete.");
      for (const id of ids)
        runCommand(st, "task.complete", {
          id,
          expected_version: o(input.expected_versions)[id],
        });
      return ok("Selected tasks updated atomically.");
    }
    case "project.reviewInput": {
      const rec = get(st, "required_inputs", target);
      expect(rec, input);
      need(
        rec.state === "provided",
        "Only provided inputs can be marked reviewed.",
      );
      patch(st, "required_inputs", rec, {
        review_status: "reviewed",
        reviewed_at: st.sample_clock,
      });
      return ok(
        "Input marked reviewed. Prerequisite completeness is unchanged.",
        rec.id,
      );
    }
    case "project.updateTask":
    case "task.complete":
    case "task.reopen":
    case "task.archive": {
      const id = target || s(input.task_id);
      const rec = get(st, "work_tasks", id);
      expect(rec, input);
      const values =
        type === "task.complete"
          ? {
              state:
                rec.task_kind === "professional" ||
                (rec.kind !== "administrative" && rec.assignee_kind === "owner")
                  ? "owner_reported_delivered"
                  : "completed",
            }
          : type === "task.reopen"
            ? { state: "not_started" }
            : type === "task.archive"
              ? { archived: true }
              : o(input.values);
      need(
        !values.state ||
          [
            "not_started",
            "in_progress",
            "blocked",
            "completed",
            "owner_reported_delivered",
          ].includes(s(values.state)),
        "Choose a valid task state.",
      );
      patch(st, "work_tasks", rec, values);
      return ok("Task updated. Project delivery remains separate.", rec.id);
    }
    case "invoice.saveDraft":
    case "invoice.save": {
      const values = o(input.values),
        existing = target ? get(st, "invoices", target) : undefined;
      if (existing) {
        expect(existing, input);
        need(
          existing.state === "draft",
          "Issued invoices are immutable. Void and create a replacement.",
          "INVALID_STATE",
        );
      }
      const clientId = s(values.client_id, s(existing?.client_id));
      get(st, "clients", clientId);
      const currency = s(values.currency, s(existing?.currency, "USD"));
      need(["USD", "IDR"].includes(currency), "Choose USD or IDR.");
      const lines = a<Input>(values.lines);
      need(lines.length > 0, "Add at least one invoice line.");
      for (const line of lines) {
        validateFields(st, "invoice_lines", line);
        need(
          o(line.unit_amount).currency === currency,
          "All invoice lines must use the invoice currency.",
          "CURRENCY_MISMATCH",
        );
      }
      if (values.due_at) validateDate(values.due_at);
      const id = existing?.id || identifier(st, "invoice");
      const lineIds: string[] = [];
      for (const old of rows(st, "invoice_lines").filter(
        (x) => x.invoice_id === id,
      ))
        delete table(st, "invoice_lines")[old.id];
      lines.forEach((line, i) => {
        const lineId = `${id}_line_${i + 1}`;
        put(st, "invoice_lines", lineId, { ...line, invoice_id: id });
        lineIds.push(lineId);
      });
      const invoice = put(st, "invoices", id, {
        client_id: clientId,
        project_id: values.project_id || null,
        previous_invoice_id: values.previous_invoice_id || null,
        billing_contact_id: values.billing_contact_id || null,
        buyer_note: s(values.buyer_note),
        kind: s(values.kind, "manual"),
        number: s(
          existing?.number,
          s(
            values.number,
            `SAMPLE-${String(rows(st, "invoices").length + 1).padStart(4, "0")}`,
          ),
        ),
        state: "draft",
        currency,
        line_ids: lineIds,
        due_at: values.due_at || null,
        issued_at: null,
        void_reason: null,
        authorized_by_acceptance_id: null,
      });
      return ok("Invoice draft saved.", invoice.id);
    }
    case "invoice.issue": {
      const invoice = get(st, "invoices", target);
      expect(invoice, input);
      issueInvoice(st, invoice);
      const requests = rows(st, "payment_requests").filter(
        (x) => x.invoice_id === invoice.id,
      );
      if (!requests.length)
        put(st, "payment_requests", identifier(st, "payment_request"), {
          invoice_id: invoice.id,
          expected: {
            amount_minor: invoiceTotal(st, invoice),
            currency: invoice.currency,
            scale: invoice.currency === "USD" ? 2 : 0,
          },
          state: "created",
          mode: "sample",
          expires_at: invoice.due_at,
          attempt: 1,
          external_reference: null,
        });
      return ok(
        "Invoice issued in the sample workspace. The issued snapshot is preserved.",
        invoice.id,
      );
    }
    case "invoice.void": {
      const invoice = get(st, "invoices", target);
      expect(invoice, input);
      need(
        invoice.state !== "draft" && invoice.state !== "void",
        "Only an issued invoice may be voided.",
        "INVALID_STATE",
      );
      need(
        invoicePaid(st, invoice.id) === 0,
        "Reverse posted allocations explicitly before voiding this invoice.",
        "INVALID_STATE",
      );
      need(s(input.reason).trim(), "Add a reason for voiding.");
      patch(st, "invoices", invoice, {
        state: "void",
        void_reason: s(input.reason),
        voided_at: st.sample_clock,
      });
      for (const request of rows(st, "payment_requests").filter(
        (x) => x.invoice_id === invoice.id,
      ))
        patch(st, "payment_requests", request, { state: "cancelled" });
      return ok("Invoice voided with its history preserved.", invoice.id);
    }
    case "expense.save": {
      const rec = saveRecord(st, "expenses", input);
      return ok("Expense saved.", rec.id);
    }
    case "expense.archive": {
      const rec = get(st, "expenses", target);
      expect(rec, input);
      patch(st, "expenses", rec, { archived: input.archived !== false });
      return ok("Expense archive updated.", rec.id);
    }
    case "client.save":
    case "client.create":
    case "client.update": {
      const values = o(input.values);
      need(s(values.name).trim(), "Add the client name.");
      validateFields(st, "clients", values);
      const existing = target ? get(st, "clients", target) : undefined;
      if (existing) expect(existing, input);
      const id = existing?.id || identifier(st, "client");
      const contactIds = a<string>(existing?.contact_ids);
      if (values.email || values.contact_name) {
        const contactId = contactIds[0] || identifier(st, "contact");
        put(st, "contacts", contactId, {
          client_id: id,
          display_name: s(values.contact_name, s(values.name)),
          email: s(values.email),
          role_label: "Project contact",
          locale: "en",
        });
        if (!contactIds.includes(contactId)) contactIds.push(contactId);
      }
      if ("private_notes" in values) {
        const prior = rows(st, "private_notes").find((x) => x.client_id === id);
        const noteId = prior?.id || identifier(st, "note");
        put(st, "private_notes", noteId, {
          client_id: id,
          content: s(values.private_notes),
          body: s(values.private_notes),
        });
        values.private_note_ids = [noteId];
      }
      put(st, "clients", id, {
        ...values,
        contact_ids: contactIds,
        status: s(values.status, s(existing?.status, "prospect")),
        private_note_ids:
          values.private_note_ids || a(existing?.private_note_ids),
      });
      return ok("Client saved.", id);
    }
    case "message.saveDraft": {
      const existing = target ? get(st, "messages", target) : undefined;
      if (existing) {
        expect(existing, input);
        need(
          existing.delivery_state !== "sample_sent",
          "A sent message cannot be edited. Save a new draft.",
          "INVALID_STATE",
        );
      }
      const content = s(input.content, s(o(input.values).content)).trim();
      need(content, "Write a message.");
      const conv = get(
        st,
        "conversations",
        input.conversation_id ?? existing?.conversation_id,
      );
      for (const id of a<string>(input.attachment_ids)) {
        const f = get(st, "attachments", id);
        const engagement = rows(st, "engagements").find(
          (x) => x.conversation_id === conv.id,
        );
        need(
          f.availability === "available" &&
            (!f.client_id || f.client_id === conv.client_id) &&
            (!f.engagement_id || f.engagement_id === engagement?.id) &&
            (!f.conversation_id || f.conversation_id === conv.id) &&
            (!f.project_id ||
              get(st, "projects", f.project_id).client_id === conv.client_id),
          "Reattach an available file belonging to this client before saving.",
          "FILE_UNAVAILABLE",
        );
      }
      const rec = put(
        st,
        "messages",
        existing?.id || identifier(st, "message"),
        {
          conversation_id: conv.id,
          sender_kind: "owner",
          sender_id: "owner_alya",
          subject: s(input.subject),
          content,
          delivery_state: "draft",
          shared_with_buyer: false,
          destination_contact_id: s(
            input.destination_contact_id,
            s(conv.buyer_contact_id),
          ),
          attachment_ids: a(input.attachment_ids),
          approved_content_version: null,
        },
      );
      return ok("Message draft saved.", rec.id);
    }
    case "message.approve":
    case "message.send": {
      const rec = get(st, "messages", target);
      expect(rec, input);
      const dest = s(
        input.destination_contact_id,
        s(
          rec.destination_contact_id,
          s(get(st, "conversations", rec.conversation_id).buyer_contact_id),
        ),
      );
      need(s(rec.content).trim(), "Write a message first.");
      need(
        dest === get(st, "conversations", rec.conversation_id).buyer_contact_id,
        "The destination does not belong to this conversation.",
      );
      if (type === "message.approve") {
        need(
          rec.delivery_state === "draft",
          "Only a draft message can be approved.",
          "INVALID_STATE",
        );
        patch(st, "messages", rec, {
          delivery_state: "approved",
          approved_content_version: rec.version + 1,
          approved_content: rec.content,
          approved_subject: s(rec.subject),
          approved_attachments: stable(rec.attachment_ids),
          destination_contact_id: dest,
          approved_destination: dest,
          approved_email: get(st, "contacts", dest).email,
        });
        return ok("Exact message and destination approved.", rec.id);
      }
      need(
        rec.delivery_state === "approved" &&
          rec.approved_content_version === rec.version &&
          rec.approved_content === rec.content &&
          rec.approved_subject === s(rec.subject) &&
          rec.approved_attachments === stable(rec.attachment_ids) &&
          rec.approved_destination === dest &&
          rec.approved_email === get(st, "contacts", dest).email,
        "Approve this exact message and destination again.",
        "APPROVAL_STALE",
      );
      capability(st, "gmail", "simulate_send");
      for (const id of a<string>(rec.attachment_ids))
        patch(st, "attachments", get(st, "attachments", id), {
          shared_with_buyer: true,
          audience: "buyer",
          conversation_id: rec.conversation_id,
        });
      patch(st, "messages", rec, {
        delivery_state: "sample_sent",
        shared_with_buyer: true,
        sent_at: st.sample_clock,
      });
      patch(
        st,
        "conversations",
        get(st, "conversations", rec.conversation_id),
        { latest_message_id: rec.id },
      );
      return ok(
        "Message sent within this sample conversation. No real email was sent.",
        rec.id,
      );
    }
    case "conversation.send": {
      const conv = get(st, "conversations", target || s(input.conversation_id));
      expect(conv, input);
      const grant = granted(st, input);
      need(
        grant.conversation_id === conv.id,
        "This invitation does not allow that conversation.",
        "NOT_AUTHORIZED",
      );
      const content = s(input.content).trim();
      need(
        content.length > 0 && content.length <= 10000,
        "Write a message of up to 10,000 characters.",
      );
      const files = a<string>(input.attachment_ids);
      need(files.length <= 5, "Attach no more than five files.");
      for (const id of files) {
        const f = get(st, "attachments", id);
        need(
          f.availability === "available" &&
            (f.engagement_id === grant.engagement_id ||
              f.conversation_id === conv.id ||
              (!!grant.project_id && f.project_id === grant.project_id)),
          "The file is unavailable or belongs to another engagement.",
          "FILE_UNAVAILABLE",
        );
      }
      const rec = put(st, "messages", identifier(st, "message"), {
        audience: "buyer",
        conversation_id: conv.id,
        sender_kind: "buyer",
        sender_id: grant.contact_id,
        content,
        delivery_state: "sample_recorded",
        shared_with_buyer: true,
        attachment_ids: files,
      });
      const reply = put(st, "messages", identifier(st, "message"), {
        audience: "buyer",
        conversation_id: conv.id,
        sender_kind: "representative",
        sender_id: "sales",
        content:
          "Thanks — your message is saved for the freelancer. Please confirm any missing scope, budget, timing, or required inputs. This sample representative can organize your brief; the freelancer reviews every price, commitment, and deliverable.",
        delivery_state: "sample_recorded",
        shared_with_buyer: true,
        attachment_ids: [],
      });
      patch(st, "conversations", conv, {
        latest_message_id: reply.id,
        owner_review_requested: true,
      });
      return ok(
        "Message and sample clarification saved for owner review.",
        rec.id,
      );
    }
    case "conversation.requestOwner": {
      const conv = get(st, "conversations", target || s(input.conversation_id));
      scope(st, input, "conversation_id", conv.id);
      patch(st, "conversations", conv, {
        owner_review_requested: true,
        owner_review_reason: s(
          input.reason,
          "Buyer requested the owner’s help",
        ),
      });
      return ok(
        "Owner review requested. Your conversation is preserved.",
        conv.id,
      );
    }
    case "inquiry.updateBrief": {
      const rec = get(st, "requirements", target);
      expect(rec, input);
      const grant = granted(st, input);
      const conv = get(st, "conversations", grant.conversation_id);
      need(
        conv.brief_requirements_id === rec.id,
        "This brief belongs to another engagement.",
        "NOT_AUTHORIZED",
      );
      const vals = o(input.values),
        allowed: Input = {};
      for (const key of [
        "requested_scope",
        "requested_budget",
        "requested_delivery_business_days",
        "unknowns",
      ])
        if (key in vals) allowed[key] = vals[key];
      validateFields(st, "requirements", allowed);
      if (allowed.requested_scope)
        allowed.deliverables = a<unknown>(allowed.requested_scope).map((x) =>
          typeof x === "string" ? x : s(o(x).label),
        );
      if ("requested_budget" in allowed)
        allowed.budget = allowed.requested_budget;
      if ("requested_delivery_business_days" in allowed)
        allowed.delivery_business_days =
          allowed.requested_delivery_business_days;
      patch(st, "requirements", rec, allowed);
      staleAssessments(st);
      return ok(
        "Your brief is updated. Any previous assessment must be reviewed again.",
        rec.id,
      );
    }
    case "inquiry.submit": {
      const vals = o(input.values);
      need(
        vals.consent === true,
        "Please consent to sharing your request with this freelancer.",
      );
      need(
        s(vals.name).trim() && s(vals.request).trim().length >= 5,
        "Add your name and a useful project brief.",
      );
      validateFields(st, "contacts", { email: vals.email });
      need(s(vals.email), "Add a contact email.");
      const service = vals.service_id
        ? get(st, "services", vals.service_id)
        : undefined;
      if (service)
        need(
          service.published === true && !service.archived,
          "This service is not open for inquiries.",
          "NOT_FOUND",
        );
      else
        need(
          rows(st, "owners").some((x) => x.handle === s(vals.handle, "alya")) &&
            get(st, "profiles", "profile_alya").published,
          "This profile is not open for inquiries.",
          "NOT_FOUND",
        );
      const suffix = identifier(st, "inquiry"),
        clientId = `client_${suffix}`,
        contactId = `contact_${suffix}`,
        oppId = `opportunity_${suffix}`,
        reqId = `requirements_${suffix}`,
        convId = `conversation_${suffix}`,
        engId = `engagement_${suffix}`,
        grantId = `grant_${suffix}`;
      put(st, "clients", clientId, {
        name: s(vals.organization, s(vals.name)),
        contact_ids: [contactId],
        status: "prospect",
        next_action: "Review the inquiry",
        private_note_ids: [],
      });
      put(st, "contacts", contactId, {
        audience: "buyer",
        client_id: clientId,
        display_name: s(vals.name),
        email: s(vals.email),
        role_label: "Project contact",
        locale: "en",
      });
      put(st, "requirements", reqId, {
        opportunity_id: oppId,
        deliverables: [s(vals.request)],
        budget: vals.budget || null,
        delivery_business_days: vals.delivery_business_days || null,
        desired_timing: s(vals.desired_timing),
        requested_scope: [
          { key: "request", label: s(vals.request), quantity: 1 },
        ],
        requested_budget: vals.budget || null,
        requested_delivery_business_days: vals.delivery_business_days || null,
        unknowns: ["Scope, price and timing to confirm"],
        source_ids: [],
      });
      put(st, "opportunities", oppId, {
        client_id: clientId,
        title: `${s(service?.title, "Project")} inquiry`,
        requirements_id: reqId,
        status: "new",
        source_ids: [],
        next_action: "Clarify the client brief",
      });
      put(st, "conversations", convId, {
        audience: "buyer",
        client_id: clientId,
        buyer_contact_id: contactId,
        status: "open",
        owner_review_requested: false,
        brief_requirements_id: reqId,
        latest_message_id: null,
      });
      const message = put(st, "messages", `message_${suffix}`, {
        audience: "buyer",
        conversation_id: convId,
        sender_kind: "buyer",
        sender_id: contactId,
        content: s(vals.request),
        delivery_state: "sample_recorded",
        attachment_ids: [],
        shared_with_buyer: true,
      });
      patch(st, "conversations", get(st, "conversations", convId), {
        latest_message_id: message.id,
      });
      put(st, "engagements", engId, {
        client_id: clientId,
        contact_id: contactId,
        opportunity_id: oppId,
        conversation_id: convId,
        offer_id: null,
        buyer_grant_id: grantId,
        project_id: null,
        stage: "clarification",
      });
      put(st, "buyer_grants", grantId, {
        audience: "buyer",
        engagement_id: engId,
        contact_id: contactId,
        conversation_id: convId,
        offer_id: null,
        project_id: null,
        state: "active",
        expires_at: new Date(
          Date.parse(st.sample_clock) + 30 * 86400000,
        ).toISOString(),
        token_kind: "local_demo_navigation_only",
      });
      return ok(
        "Your inquiry has been saved. Continue in your sample conversation.",
        engId,
        { grant_id: grantId, engagement_id: engId },
      );
    }
    case "promotion.saveDraft": {
      const values = o(input.values),
        existing = target ? get(st, "promotions", target) : undefined;
      if (existing) expect(existing, input);
      const previous = existing
        ? get(st, "promotion_versions", existing.current_version_id)
        : undefined;
      const content = s(values.content, s(previous?.content)).trim();
      need(content, "Write some promotion copy.");
      const serviceId = s(values.service_id, s(existing?.service_id));
      get(st, "services", serviceId);
      const id = existing?.id || identifier(st, "promotion"),
        revision = n(previous?.revision) + 1,
        vid = `${id}_v${revision}`;
      put(st, "promotion_versions", vid, {
        promotion_id: id,
        revision,
        content,
        target_audience: s(
          values.target_audience,
          s(previous?.target_audience),
        ),
        destination_url: s(
          values.destination_url,
          s(previous?.destination_url),
        ),
        destination: s(
          values.destination,
          s(previous?.destination, "sample_professional_network"),
        ),
        public_claim_refs:
          values.public_claim_refs || previous?.public_claim_refs || [],
        source_ids: values.source_ids || [],
        state: "draft",
        approved_version: null,
        publication_evidence_id: null,
      });
      if (
        previous &&
        !["published", "published_confirmed"].includes(s(previous.state))
      )
        patch(st, "promotion_versions", previous, { state: "superseded" });
      put(st, "promotions", id, {
        service_id: serviceId,
        current_version_id: vid,
        status: "draft",
        published_version_id: existing?.published_version_id || null,
      });
      return ok("Promotion draft saved for review.", id);
    }
    case "promotion.approve":
    case "promotion.recordPublication":
    case "promotion.publish":
    case "promotion.pause": {
      const promo = get(st, "promotions", target);
      expect(promo, input);
      const version = get(st, "promotion_versions", promo.current_version_id);
      const dest = s(input.destination, s(version.destination));
      need(
        dest === version.destination,
        "The destination changed. Save a new draft and review it.",
        "APPROVAL_STALE",
      );
      if (type === "promotion.pause") {
        patch(st, "promotions", promo, { status: "paused" });
        return ok(
          "Promotion paused locally. Existing sample publication evidence remains.",
          promo.id,
        );
      }
      if (type === "promotion.approve") {
        need(
          version.state === "draft",
          "Only the current draft can be approved.",
          "INVALID_STATE",
        );
        for (const ref of a<Input>(version.public_claim_refs)) {
          const source = get(st, s(ref.table), ref.id);
          need(
            source.version === n(ref.version) && source.published === true,
            "One or more public claims changed or are unpublished. Update the draft.",
            "APPROVAL_STALE",
          );
        }
        patch(st, "promotion_versions", version, {
          state: "approved",
          approved_version: version.version + 1,
          approved_destination: dest,
          approved_content: version.content,
        });
        patch(st, "promotions", promo, { status: "approved" });
        return ok("Exact promotion copy and destination approved.", promo.id);
      }
      need(
        input.confirmed === true,
        "Confirm you want to record this sample publication.",
      );
      need(
        version.state === "approved" &&
          version.approved_version === version.version &&
          version.approved_content === version.content &&
          version.approved_destination === dest,
        "Review and approve this exact promotion first.",
        "APPROVAL_STALE",
      );
      const evidence = put(
        st,
        "publication_evidence",
        identifier(st, "publication"),
        {
          promotion_id: promo.id,
          promotion_version_id: version.id,
          destination: dest,
          content_snapshot: version.content,
          recorded_at: st.sample_clock,
          published_at: s(input.published_at, st.sample_clock),
          publication_reference: s(input.publication_reference),
          mode: "sample",
        },
      );
      patch(st, "promotion_versions", version, {
        state: "published_confirmed",
        publication_evidence_id: evidence.id,
      });
      patch(st, "promotions", promo, {
        status: "published_confirmed",
        published_version_id: version.id,
      });
      return ok(
        "Sample publication recorded. Nothing was posted to a real network.",
        promo.id,
      );
    }
    case "calendar.saveProposal": {
      const rec = saveRecord(st, "calendar_events", {
        ...input,
        values: {
          ...o(input.values),
          state: "proposed",
          external_invitation_state: "not_requested",
        },
      });
      return ok("Calendar proposal saved.", rec.id);
    }
    case "calendar.approve":
    case "calendar.invite": {
      const rec = get(st, "calendar_events", target);
      expect(rec, input);
      const recipients = a<string>(input.recipients).length
        ? a<string>(input.recipients)
        : a<string>(rec.recipients);
      need(recipients.length > 0, "Choose at least one intended recipient.");
      for (const email of recipients)
        need(
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
          "Each recipient needs a valid email address.",
        );
      const content = stable({
        title: rec.title,
        starts_at: rec.starts_at,
        ends_at: rec.ends_at,
        timezone: rec.timezone,
        recipients,
      });
      if (type === "calendar.approve") {
        patch(st, "calendar_events", rec, {
          state: rec.state === "committed" ? "committed" : "approved",
          recipients,
          approved_content: content,
          approved_version: rec.version + 1,
        });
        return ok("Exact calendar invitation approved.", rec.id);
      }
      need(
        rec.approved_content === content &&
          rec.approved_version === rec.version,
        "Approve this exact time and recipient list first.",
        "APPROVAL_STALE",
      );
      capability(st, "calendar", "simulate_invite");
      patch(st, "calendar_events", rec, {
        external_invitation_state: "sample_invited",
        invited_at: st.sample_clock,
      });
      return ok(
        "Sample calendar invitation recorded. No external invitation was sent.",
        rec.id,
      );
    }
    case "connection.change": {
      const conn = get(st, "connections", target || s(input.connection_id));
      expect(conn, input);
      const action = s(input.action);
      need(
        [
          "connect",
          "reconnect",
          "disconnect",
          "permissions",
          "refresh",
        ].includes(action),
        "Choose a supported connection action.",
      );
      const caps =
        input.approved_capabilities === undefined
          ? a<string>(conn.approved_capabilities)
          : a<string>(input.approved_capabilities);
      need(
        caps.every((x) => a<string>(conn.capabilities).includes(x)),
        "Only the listed sample permissions can be approved.",
      );
      patch(st, "connections", conn, {
        state:
          action === "refresh"
            ? conn.state
            : action === "disconnect"
              ? "disconnected"
              : action === "permissions" && caps.length === 0
                ? "limited_permissions"
                : "connected",
        approved_capabilities:
          action === "refresh"
            ? conn.approved_capabilities
            : action === "disconnect"
              ? []
              : caps,
        allowed_roles:
          action === "refresh"
            ? conn.allowed_roles
            : input.allowed_roles || conn.allowed_roles || [],
        last_checked_at: st.sample_clock,
        error_code: null,
      });
      if (action === "disconnect")
        for (const run of rows(st, "agent_runs").filter(
          (x) =>
            ["running", "queued"].includes(s(x.status)) &&
            a<string>(x.connection_ids).includes(conn.id),
        ))
          patch(st, "agent_runs", run, {
            status: "blocked",
            blocked_reason: `${s(conn.label)} disconnected. Reconnect and retry explicitly.`,
          });
      return ok(
        action === "disconnect"
          ? "Sample connection disconnected. Drafts are retained."
          : "Sample connection updated. Interrupted actions require a deliberate retry.",
        conn.id,
      );
    }
    case "profile.save":
    case "policy.save":
    case "preferences.save":
    case "service.save": {
      const map: Record<string, string> = {
        "profile.save": "profiles",
        "policy.save": "policies",
        "preferences.save": "preferences",
        "service.save": "services",
      };
      const rec = saveRecord(st, map[type], input);
      return ok(
        "Changes saved. Published snapshots and accepted commercial terms remain preserved.",
        rec.id,
      );
    }
    case "profile.publish":
    case "service.publish": {
      const t = type === "profile.publish" ? "profiles" : "services",
        rec = get(st, t, target);
      expect(rec, input);
      need(
        input.reviewed === true || input.confirmed === true,
        "Review the exact public fields before publishing.",
      );
      need(
        s(rec.public_name, s(rec.title)).trim(),
        "Add a public name or service title before publishing.",
      );
      validateFields(st, t, rec, rec.id);
      let reviewed = rec;
      if (t === "profiles" && Object.keys(o(input.service_versions)).length) {
        reviewed = patch(st, "profiles", rec, {
          approved_service_ids: Object.keys(o(input.service_versions)),
        });
      }
      const targets: [string, Entity][] = [[t, reviewed]];
      if (t === "profiles") {
        for (const [id, version] of Object.entries(o(input.service_versions))) {
          const service = get(st, "services", id);
          need(
            service.profile_id === rec.id && service.version === n(version),
            "A selected service changed. Review the current version.",
            "STALE_VERSION",
          );
          targets.push(["services", service]);
        }
        for (const p of rows(st, "portfolio_items").filter(
          (x) =>
            x.profile_id === rec.id &&
            x.published &&
            x.claim_status === "approved_sample" &&
            a<string>(rec.approved_portfolio_ids).includes(x.id),
        ))
          targets.push(["portfolio_items", p]);
      }
      for (const [name, r] of targets) {
        const published = patch(st, name, r, {
          published: true,
          public_revision: n(r.public_revision) + 1,
        });
        put(st, "publication_snapshots", `${name}_${r.id}`, {
          source_table: name,
          source_id: r.id,
          source_version: published.version,
          values: clone(published),
          published_at: st.sample_clock,
          approval: "owner_approved",
        });
      }
      return ok(
        "Reviewed public content published to the sample profile.",
        rec.id,
      );
    }
    case "knowledge.save": {
      const values = o(input.source).label ? o(input.source) : o(input.values),
        existing = target ? table(st, "sources")[target] : undefined;
      if (existing) expect(existing, input);
      validateFields(st, "sources", values);
      need(s(values.label, s(values.title)).trim(), "Add a source name.");
      const attachment = o(input.attachment);
      if (attachment.id) {
        const mime = s(attachment.mime_type, s(attachment.media_type)),
          size = n(attachment.size_bytes, n(attachment.byte_length));
        need(
          ["application/pdf", "image/png", "image/jpeg", "text/plain"].includes(
            mime,
          ) &&
            size > 0 &&
            size <= 10 * 1024 * 1024,
          "Use a PDF, PNG, JPEG, or TXT file up to 10 MiB.",
          "UPLOAD_REJECTED",
        );
        put(st, "attachments", s(attachment.id), {
          ...attachment,
          name: s(attachment.filename, s(attachment.name)),
          media_type: mime,
          byte_length: size,
          storage_kind: "indexeddb",
          storage_locator: s(attachment.content_ref),
          availability: "available",
        });
      }
      const rec = put(
        st,
        "sources",
        existing?.id || target || identifier(st, "source"),
        { ...values, audience: "owner" },
      );
      return ok("Knowledge source saved.", rec.id);
    }
    case "knowledge.remove": {
      const rec = get(st, "sources", target);
      expect(rec, input);
      patch(st, "sources", rec, { archived: true });
      staleAssessments(st);
      return ok("Source archived; its history is retained.", rec.id);
    }
    case "file.attach": {
      const vals = o(input.values),
        mime = s(vals.media_type, s(vals.mime_type)),
        size = n(vals.byte_length, n(vals.size_bytes));
      need(
        ["application/pdf", "image/png", "image/jpeg", "text/plain"].includes(
          mime,
        ) &&
          size > 0 &&
          size <= 10 * 1024 * 1024,
        "Use a PDF, PNG, JPEG, or TXT file up to 10 MiB.",
        "UPLOAD_REJECTED",
      );
      if (input.grant_id) {
        const grant = granted(st, input);
        if (vals.project_id) scope(st, input, "project_id", s(vals.project_id));
        else
          need(
            vals.conversation_id === grant.conversation_id ||
              vals.engagement_id === grant.engagement_id,
            "This file needs the current conversation or project scope.",
            "NOT_AUTHORIZED",
          );
      }
      const existing = target ? table(st, "attachments")[target] : undefined;
      if (existing) {
        expect(existing, input);
        if (input.grant_id) {
          const grant = granted(st, input);
          need(
            existing.engagement_id === grant.engagement_id ||
              (!!grant.project_id &&
                existing.project_id === grant.project_id) ||
              existing.conversation_id === grant.conversation_id,
            "This existing file belongs to another engagement.",
            "NOT_AUTHORIZED",
          );
        }
      }
      const rec = put(
        st,
        "attachments",
        target || identifier(st, "attachment"),
        {
          ...vals,
          name: s(vals.name, s(vals.filename)),
          media_type: mime,
          byte_length: size,
          availability: "available",
          shared_with_buyer:
            !!input.grant_id || vals.shared_with_buyer === true,
          audience: input.grant_id ? "buyer" : s(vals.audience, "owner"),
        },
      );
      return ok("File attached.", rec.id);
    }
    case "file.remove": {
      const rec = get(st, "attachments", target);
      expect(rec, input);
      if (input.grant_id) scope(st, input, "project_id", s(rec.project_id));
      patch(st, "attachments", rec, {
        availability: "removed",
        removed_at: st.sample_clock,
      });
      return ok("File removed. Its metadata is retained.", rec.id);
    }
    case "settings.availability": {
      const profile = get(st, "profiles", input.profile_id),
        policy = get(st, "policies", input.policy_id);
      expect(profile, { expected_version: input.profile_version });
      expect(policy, { expected_version: input.policy_version });
      saveRecord(st, "policies", {
        id: policy.id,
        expected_version: policy.version,
        values: o(input.policy_values),
      });
      saveRecord(st, "profiles", {
        id: profile.id,
        expected_version: profile.version,
        values: o(input.profile_values),
      });
      return ok(
        "Availability and future business defaults saved atomically.",
        profile.id,
      );
    }
    case "ui.set": {
      st.ui = { ...st.ui, ...o(input.values) };
      return ok("View preferences saved.");
    }
    case "setup.saveStep": {
      const onboarding = get(st, "onboarding_sessions", "onboarding_alya"),
        step = s(input.step, s(input.step_id, "business")),
        values = o(input.values);
      const draft = { ...o(onboarding.draft), ...values, lastStep: step };
      patch(st, "onboarding_sessions", onboarding, {
        draft,
        current_step: step,
        state: "in_progress",
        completed_steps: [
          ...new Set([...a<string>(onboarding.completed_steps), step]),
        ],
      });
      return ok("Setup progress saved.", "onboarding_alya");
    }
    case "setup.complete": {
      const onboarding = get(st, "onboarding_sessions", "onboarding_alya"),
        draft = o(onboarding.draft),
        basics = o(draft.basics ?? draft.business),
        availability = o(draft.availability ?? draft.schedule);
      const name = s(basics.name, s(basics.displayName)).trim(),
        profession = s(basics.profession).trim();
      need(
        name && profession,
        "Add your name and profession before completing setup.",
      );
      const owner = get(st, "owners", "owner_alya"),
        profile = get(st, "profiles", "profile_alya");
      patch(st, "owners", owner, {
        display_name: name,
        profession,
        locale: s(basics.locale, "en"),
      });
      patch(st, "profiles", profile, {
        public_name: name,
        headline: profession,
        public_availability: s(
          availability.public_availability,
          "open_to_inquiries",
        ),
        published: false,
      });
      const weekdays = a<number>(availability.days).length
        ? a<number>(availability.days)
        : [0, 1, 2, 3, 4];
      need(
        weekdays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6),
        "Select valid working days.",
      );
      if (availability.start && availability.end)
        need(
          s(availability.start) < s(availability.end),
          "Working hours must end after they start.",
        );
      const percent = n(availability.deposit_percent, 60);
      need(
        percent >= 0 && percent <= 100 && Number.isInteger(percent),
        "Set a deposit percentage from 0 to 100.",
      );
      patch(st, "policies", get(st, "policies", "policy_business"), {
        business_weekdays: weekdays,
        deposit_basis_points: percent * 100,
        working_start: s(availability.start, "09:00"),
        working_end: s(availability.end, "17:00"),
        timezone: s(basics.timezone, "Asia/Jakarta"),
      });
      for (const item of a<Input>(draft.services)) {
        need(
          s(item.title).trim() && s(item.description).trim(),
          "Complete each service title and description.",
        );
        const slug =
          s(item.slug) ||
          s(item.title)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
        validateFields(st, "services", { slug }, s(item.id));
        put(st, "services", s(item.id) || identifier(st, "service"), {
          profile_id: profile.id,
          title: item.title,
          description: item.description,
          slug,
          deliverables: a(item.deliverables),
          pricing_label: item.price
            ? typeof item.price === "object"
              ? `${s(o(item.price).currency, "USD")} ${(n(o(item.price).amount_minor) / (s(o(item.price).currency) === "IDR" ? 1 : 100)).toFixed(s(o(item.price).currency) === "IDR" ? 0 : 2)}`
              : `${s(item.currency, "USD")} ${s(item.price, String(item.price))}`
            : "Custom quote after a brief",
          published: false,
        });
      }
      patch(st, "preferences", get(st, "preferences", "preferences_alya"), {
        locale: s(basics.locale, "en"),
        timezone: s(basics.timezone, "Asia/Jakarta"),
      });
      patch(st, "onboarding_sessions", onboarding, {
        state: "completed",
        completed_at: st.sample_clock,
      });
      return ok(
        "Your sample workspace is ready. Publish your profile after reviewing it.",
      );
    }
    case "activity.markRead":
    case "activity.catchUp": {
      const latest = Math.max(
        0,
        ...rows(st, "events").map((x) => n(x.sequence)),
      );
      const requested = n(
        input.sequence,
        n(input.last_seen_event_sequence, latest),
      );
      need(
        requested >= 0 && requested <= latest,
        "The read marker must refer to an existing event.",
      );
      patch(st, "preferences", get(st, "preferences", "preferences_alya"), {
        last_seen_event_sequence: requested,
      });
      return ok("Activity read marker updated.");
    }
    case "agent.start": {
      const rawRole = s(input.role_id, "scout");
      const rawIntent = s(input.intent, s(input.task_kind));
      const role =
        rawRole === "auto"
          ? /promot/i.test(rawIntent)
            ? "promoter"
            : /offer/i.test(rawIntent)
              ? "sales"
              : /follow|client/i.test(rawIntent)
                ? "account_manager"
                : /invoice|money|deposit/i.test(rawIntent)
                  ? "finance"
                  : /plan|project|effort/i.test(rawIntent)
                    ? "operations"
                    : "scout"
          : rawRole;
      need(
        [
          "scout",
          "promoter",
          "sales",
          "account_manager",
          "operations",
          "finance",
        ].includes(role),
        "Choose one of the six teammates.",
      );
      const raw = s(input.intent, s(input.task_kind)).trim();
      const aliases: Record<string, string> = {
        "draft an offer": "draft_offer",
        "draft a promotion": "draft_promotion",
        "draft a follow-up": "draft_followup",
        "plan a project": "plan_project",
        "inspect an invoice": "inspect_invoice",
        "assess the northstar lead": "assess_opportunity",
        assess_lead: "assess_opportunity",
        draft_follow_up: "draft_followup",
        "prepare a promotion draft": "draft_promotion",
        "review my invoices": "inspect_invoice",
        "plan the northstar project": "plan_project",
        "draft a client follow-up": "draft_followup",
        "prepare the northstar offer": "draft_offer",
      };
      const intent = aliases[raw.toLowerCase()] || raw;
      const active = rows(st, "agent_runs").find(
        (x) =>
          x.role_id === role &&
          x.intent === intent &&
          x.opportunity_id ===
            s(input.opportunity_id, "opportunity_northstar") &&
          x.service_id === input.service_id &&
          ["queued", "running", "paused"].includes(s(x.status)),
      );
      if (active)
        return ok("This equivalent task is already active.", active.id);
      need(intent, "Describe a task or choose a sample action.");
      const known = [
        "assess_opportunity",
        "assess lead",
        "draft_offer",
        "draft offer",
        "draft_followup",
        "draft follow-up",
        "draft_promotion",
        "draft promotion",
        "plan_project",
        "plan project",
        "inspect_invoice",
        "inspect invoice",
        "assess",
        "follow_up",
        "promotion",
        "review_finances",
        "prepare_offer",
        "check_effort",
        "check_deposit",
      ];
      const supported = known.includes(intent.toLowerCase()) || !!input.curated;
      const request = put(st, "team_requests", identifier(st, "team_request"), {
        text: intent,
        context_refs: a(input.input_refs),
        status: supported ? "queued" : "unsupported",
        curated_intent: supported ? intent : null,
        clarification_answers: [],
        linked_run_ids: [],
        linked_draft_ids: [],
      });
      const capabilityPolicy = rows(st, "capability_preferences").find(
        (x) => x.role === role || x.role_id === role,
      );
      const blocked = capabilityPolicy?.allow_internal === false;
      const activeCount = rows(st, "agent_runs").filter(
        (x) =>
          x.role_id === role && ["queued", "running"].includes(s(x.status)),
      ).length;
      need(
        activeCount < n(capabilityPolicy?.max_concurrent, 10),
        "This teammate has reached its concurrent task limit. Finish or cancel an existing task.",
        "CAPACITY_LIMIT",
      );
      const run = put(st, "agent_runs", identifier(st, "run"), {
        role_id: role,
        task_kind: s(input.task_kind, intent),
        intent,
        title: s(input.title, `${role.replace("_", " ")} · ${intent}`),
        status: !supported ? "waiting_input" : blocked ? "blocked" : "queued",
        attempt: 1,
        previous_attempt_id: null,
        input_refs: a(input.input_refs).length
          ? input.input_refs
          : [
              {
                table: "policies",
                id: "policy_business",
                version: get(st, "policies", "policy_business").version,
              },
            ],
        opportunity_id: s(input.opportunity_id, "opportunity_northstar"),
        project_id: input.project_id || null,
        invoice_id: input.invoice_id || null,
        output_artifact_ids: [],
        blocked_reason: !supported
          ? "Choose a supported sample task or save a manual draft. No unrestricted AI execution is available."
          : blocked
            ? "This role is paused in your capability preferences."
            : null,
        error_code: null,
        progress_step: 0,
        progress_total: 3,
        control_version: 1,
        semantic_focus_target: `team.agent.${role}`,
        source_ids: a<string>(input.source_ids).filter(
          (id) => !!table(st, "sources")[id],
        ),
        team_request_id: request.id,
        service_id: input.service_id,
        destination: input.destination,
      });
      patch(st, "team_requests", request, { linked_run_ids: [run.id] });
      return ok(
        supported
          ? "Task queued. Run its next checkpoint to inspect actual saved progress."
          : "Request saved. Choose a supported task or prepare a manual draft.",
        run.id,
      );
    }
    case "agent.control": {
      const run = get(st, "agent_runs", target);
      expect(run, input);
      const control = input.control_version ?? input.expected_control_version;
      if (control !== undefined)
        need(
          n(control) === n(run.control_version),
          "This task control changed. Reload before continuing.",
          "STALE_VERSION",
        );
      const action = s(input.action);
      const terminal = ["completed", "cancelled"];
      if (action === "clarify") {
        need(
          run.status === "waiting_input",
          "This task is not waiting for clarification.",
          "INVALID_STATE",
        );
        const intent = s(input.intent, s(input.task_kind));
        const allowed = [
          "assess_opportunity",
          "assess_lead",
          "draft_offer",
          "draft_promotion",
          "draft_followup",
          "draft_follow_up",
          "plan_project",
          "inspect_invoice",
        ];
        need(
          allowed.includes(intent),
          "Choose a supported task.",
          "UNSUPPORTED_INTENT",
        );
        const role = intent.includes("promotion")
          ? "promoter"
          : intent.includes("follow")
            ? "account_manager"
            : intent.includes("offer")
              ? "sales"
              : intent.includes("project")
                ? "operations"
                : intent.includes("invoice")
                  ? "finance"
                  : "scout";
        patch(st, "agent_runs", run, {
          intent,
          task_kind: intent,
          role_id: role,
          semantic_focus_target: `team.agent.${role}`,
          status: "queued",
          progress_step: 0,
          control_version: n(run.control_version) + 1,
          blocked_reason: null,
        });
        if (run.team_request_id) {
          const req = get(st, "team_requests", run.team_request_id);
          patch(st, "team_requests", req, {
            status: "queued",
            curated_intent: intent,
            clarification_answers: [...a(req.clarification_answers), intent],
          });
        }
        return ok("Clarification saved. The supported task is queued.", run.id);
      }
      if (action === "pause") {
        need(
          ![...terminal, "paused", "failed"].includes(s(run.status)),
          "This task cannot be paused.",
          "INVALID_STATE",
        );
        patch(st, "agent_runs", run, {
          status: "paused",
          previous_status: run.status,
          control_version: n(run.control_version) + 1,
        });
        return ok(
          "Task paused. No future checkpoint will run until resumed.",
          run.id,
        );
      }
      if (action === "resume") {
        need(
          run.status === "paused",
          "This task is not paused.",
          "INVALID_STATE",
        );
        patch(st, "agent_runs", run, {
          status: s(run.previous_status, "running"),
          control_version: n(run.control_version) + 1,
        });
        return ok(
          "Task resumed. Continue its next checkpoint when ready.",
          run.id,
        );
      }
      if (action === "cancel") {
        need(
          !terminal.includes(s(run.status)),
          "This task has already ended.",
          "INVALID_STATE",
        );
        patch(st, "agent_runs", run, {
          status: "cancelled",
          control_version: n(run.control_version) + 1,
          cancelled_at: st.sample_clock,
        });
        return ok(
          "Task cancelled. Completed artifacts remain available.",
          run.id,
        );
      }
      if (action === "retry") {
        need(
          ["failed", "blocked"].includes(s(run.status)),
          "Retry is available for failed or blocked tasks.",
          "INVALID_STATE",
        );
        const retry = put(st, "agent_runs", identifier(st, "run"), {
          ...run,
          status: "queued",
          attempt: n(run.attempt) + 1,
          previous_attempt_id: run.id,
          progress_step: 0,
          control_version: 1,
          output_artifact_ids: [],
          error_code: null,
          blocked_reason: null,
        });
        return ok(
          "A new linked attempt is queued. The original attempt is retained.",
          retry.id,
        );
      }
      need(
        ["checkpoint", "continue", "step", "advance"].includes(action),
        "Choose a valid task control.",
      );
      need(
        ["queued", "running", "waiting_input"].includes(s(run.status)),
        "This task cannot progress in its current state.",
        "INVALID_STATE",
      );
      const request = run.team_request_id
        ? table(st, "team_requests")[s(run.team_request_id)]
        : undefined;
      need(
        request?.status !== "unsupported",
        "Choose a curated task or create a manual draft for this request.",
        "UNSUPPORTED_INTENT",
      );
      const rolePolicy = rows(st, "capability_preferences").find(
        (x) => x.role === run.role_id || x.role_id === run.role_id,
      );
      need(
        rolePolicy?.allow_internal !== false,
        "Internal work is paused for this teammate. Update the rule or cancel this task.",
        "POLICY_BLOCKED",
      );
      const next = n(run.progress_step) + 1;
      if (next < 3) {
        patch(st, "agent_runs", run, {
          status: "running",
          internal_start_approved_at: rolePolicy?.stricter_review
            ? st.sample_clock
            : run.internal_start_approved_at,
          progress_step: next,
          control_version: n(run.control_version) + 1,
          checkpoint_note:
            next === 1
              ? "Inputs loaded from the current sample records."
              : "Sources and current policy versions checked.",
        });
        return ok(
          next === 1
            ? "Inputs loaded. Continue to check the current policy."
            : "Current inputs checked. Continue to save the task output.",
          run.id,
        );
      }
      const role = s(run.role_id);
      const opp = table(st, "opportunities")[s(run.opportunity_id)];
      const req = opp
        ? rows(st, "requirements").find((x) => x.opportunity_id === opp.id)
        : undefined;
      const policy = get(st, "policies", "policy_business");
      let ref: Entity | undefined;
      let refTable = "";
      let title = "";
      let finalState = "completed";
      if (["scout", "operations", "finance"].includes(role)) {
        need(
          opp && req,
          "Choose a recorded opportunity with a brief.",
          "PREREQUISITES_MISSING",
        );
        const offer = rows(st, "offers").find(
          (x) => x.opportunity_id === opp?.id,
        );
        const version = offer
          ? get(st, "offer_versions", offer.current_version_id)
          : undefined;
        const price = version?.price ? validateMoney(version.price) : null;
        const findings = a<Input>(req?.requested_scope)
          .map((x) => s(x.label))
          .filter(Boolean)
          .concat(a<string>(req?.deliverables));
        let summary =
          role === "scout"
            ? "Recorded requirements summarized. Scope, budget and inputs still need owner judgment."
            : role === "operations"
              ? "Working-day policy checked. Dates remain uncommitted until project prerequisites are satisfied."
              : "Recorded invoice and deposit amounts checked. Actual provider costs remain unknown.";
        if (role === "finance" && price) {
          const dep = halfUp(
            price.amount_minor,
            n(o(version?.terms).deposit_basis_points, 6000),
            10000,
          );
          summary = `Gross deposit: ${dep} ${price.currency} minor units. Estimated fee: ${halfUp(dep, n(policy.fee_basis_points), 10000)}. This is a proposal calculation, not a receipt.`;
        }
        const assessmentId = `assessment_${role}_${opp?.id}`;
        ref = put(st, "assessments", assessmentId, {
          role_id: role,
          opportunity_id: opp?.id,
          requirements_version: req?.version,
          policy_version: policy.version,
          status: "current",
          summary,
          factual_findings: findings,
          assumptions:
            role === "operations"
              ? [
                  `${n(policy.available_effort_minutes)} minutes sample available effort`,
                ]
              : role === "finance"
                ? ["Fee and FX are sample assumptions"]
                : [],
          unknowns: a(req?.unknowns),
          proposed_effort_minutes:
            role === "operations"
              ? (version?.estimated_effort_minutes ?? null)
              : null,
          source_ids: a(opp?.source_ids),
          run_id: run.id,
        });
        refTable = "assessments";
        title =
          role === "scout"
            ? "Lead fit brief"
            : role === "operations"
              ? "Effort and timing review"
              : "Deposit and receipt review";
      } else if (role === "sales") {
        need(
          opp && req,
          "Choose a recorded opportunity first.",
          "PREREQUISITES_MISSING",
        );
        const offer = rows(st, "offers").find(
          (x) => x.opportunity_id === opp?.id,
        );
        if (offer && offer.status === "accepted") {
          ref = put(st, "team_notes", identifier(st, "note"), {
            title: "Accepted offer preserved",
            content:
              "The accepted terms are unchanged. Use an explicit amendment for commercial changes.",
            offer_id: offer.id,
          });
          refTable = "team_notes";
          title = "Accepted offer check";
        } else {
          const existing = offer
            ? get(st, "offer_versions", offer.current_version_id)
            : undefined;
          ref = offerDraft(st, {
            id: offer?.id,
            values: {
              client_id: opp?.client_id,
              opportunity_id: opp?.id,
              title: existing?.title || s(opp?.title),
              deliverables:
                existing?.deliverables || a<Input>(req?.requested_scope),
              price: existing?.price || null,
              buyer_note:
                existing?.buyer_note ||
                "Please confirm the proposed scope and remaining unknowns.",
            },
          });
          refTable = "offers";
          title = "Offer draft";
          finalState = "waiting_approval";
        }
      } else if (role === "promoter") {
        const service =
          rows(st, "services").find(
            (x) =>
              x.published === true &&
              !x.archived &&
              (!run.service_id || x.id === run.service_id),
          ) ||
          fail(
            "PREREQUISITES_MISSING",
            "Publish an approved service before drafting promotion copy.",
          );
        const id = identifier(st, "promotion"),
          vid = `${id}_v1`;
        put(st, "promotion_versions", vid, {
          promotion_id: id,
          revision: 1,
          destination: s(run.destination, "sample_professional_network"),
          content: `${s(service.title)}. ${s(service.description)} Get in touch to discuss your project.`,
          approved_version: null,
          public_claim_refs: [
            { table: "services", id: service.id, version: service.version },
          ],
          source_ids: [],
          state: "draft",
          publication_evidence_id: null,
        });
        ref = put(st, "promotions", id, {
          service_id: service.id,
          current_version_id: vid,
          status: "draft",
          published_version_id: null,
        });
        refTable = "promotions";
        title = "Service promotion draft";
        finalState = "waiting_approval";
      } else {
        need(opp, "Choose a client request first.", "PREREQUISITES_MISSING");
        const conv =
          rows(st, "conversations").find(
            (x) => x.client_id === opp?.client_id,
          ) || fail("NOT_FOUND", "This request has no conversation yet.");
        ref = put(st, "messages", identifier(st, "message"), {
          conversation_id: conv.id,
          sender_kind: "owner",
          sender_id: "owner_alya",
          content:
            "Hello — checking in on the project inputs. Please share any missing details or tell me what you need help with.",
          delivery_state: "draft",
          shared_with_buyer: false,
          attachment_ids: [],
          destination_contact_id: conv.buyer_contact_id,
          approved_content_version: null,
        });
        refTable = "messages";
        title = "Client follow-up draft";
        finalState = "waiting_approval";
      }
      const artifact = put(st, "artifacts", identifier(st, "artifact"), {
        kind: refTable,
        title,
        creator_run_id: run.id,
        role_id: role,
        record_ref: { table: refTable, id: ref.id, version: ref.version },
        input_refs: [
          ...(req
            ? [{ table: "requirements", id: req.id, version: req.version }]
            : []),
          { table: "policies", id: policy.id, version: policy.version },
        ],
        source_ids: opp ? a(opp.source_ids) : [],
        status: "current",
      });
      patch(st, "agent_runs", run, {
        status: finalState,
        progress_step: 3,
        control_version: n(run.control_version) + 1,
        output_artifact_ids: [...a(run.output_artifact_ids), artifact.id],
        blocked_reason: null,
        error_code: null,
      });
      if (request)
        patch(st, "team_requests", request, {
          status: finalState,
          linked_draft_ids: [ref.id],
        });
      return ok(
        finalState === "waiting_approval"
          ? "Useful draft saved. Review and approve before any sharing."
          : "Task output saved from current sample inputs.",
        run.id,
        { artifact_id: artifact.id, record_id: ref.id },
      );
    }
    case "project.requestRevision": {
      const project = get(st, "projects", target);
      expect(project, input);
      const grant = granted(st, input);
      need(
        grant.project_id === project.id,
        "This invitation belongs to another project.",
        "NOT_AUTHORIZED",
      );
      need(
        project.professional_delivery_state === "owner_reported_delivered",
        "The owner must report delivery before a revision can be requested.",
        "INVALID_STATE",
      );
      const reason = s(input.reason).trim();
      need(reason.length >= 3, "Describe the revision you need.");
      put(st, "messages", identifier(st, "message"), {
        audience: "buyer",
        conversation_id: grant.conversation_id,
        sender_kind: "buyer",
        sender_id: grant.contact_id,
        content: `Delivery revision requested: ${reason}`,
        delivery_state: "sample_recorded",
        shared_with_buyer: true,
        attachment_ids: [],
      });
      patch(st, "projects", project, {
        revision_requested: true,
        revision_reason: reason,
      });
      return ok(
        "Revision request saved for the owner. Accepted commercial terms remain unchanged.",
        project.id,
      );
    }
    case "invoice.send": {
      const invoice = get(st, "invoices", target);
      expect(invoice, input);
      need(
        ["issued", "partially_paid", "paid"].includes(s(invoice.state)),
        "Issue this invoice before sharing it.",
        "INVALID_STATE",
      );
      need(
        input.confirmed === true || input.approved === true,
        "Review the exact invoice and recipient before sample sending.",
      );
      const dest = s(input.destination_contact_id, s(input.contact_id));
      const contact = get(st, "contacts", dest);
      need(
        contact.client_id === invoice.client_id &&
          (!input.recipient || input.recipient === contact.email),
        "Choose this client’s current contact email.",
      );
      capability(st, "gmail", "simulate_send");
      patch(st, "invoices", invoice, {
        sent_at: st.sample_clock,
        sent_contact_id: dest,
        sent_content: s(input.content, "Please review your sample invoice."),
        sent_version: invoice.version,
      });
      return ok(
        "Issued invoice shared in the sample workspace. No real email was sent.",
        invoice.id,
      );
    }
    case "expense.correct": {
      const original = get(st, "expenses", target);
      expect(original, input);
      need(s(input.reason).trim(), "Explain this correction.");
      const currency = s(input.currency, s(o(original.amount).currency));
      need(
        currency === o(original.amount).currency,
        "Corrections must use the original currency.",
        "CURRENCY_MISMATCH",
      );
      const revised = n(
        input.revised_amount_minor,
        n(o(o(input.values).amount).amount_minor, -1),
      );
      need(
        Number.isSafeInteger(revised) && revised >= 0,
        "Enter the corrected amount.",
      );
      const prior = rows(st, "expense_corrections")
        .filter((x) => x.expense_id === original.id && x.state === "posted")
        .reduce((v, x) => v + n(x.delta_minor), 0);
      const rec = put(
        st,
        "expense_corrections",
        identifier(st, "expense_correction"),
        {
          expense_id: original.id,
          delta_minor: revised - n(o(original.amount).amount_minor) - prior,
          currency,
          state: "posted",
          reason: input.reason,
          original_version: original.version,
          expense_date: input.expense_date || original.expense_date,
        },
      );
      patch(st, "expenses", original, { latest_correction_id: rec.id });
      return ok(
        "Correction posted. The original expense and its history are preserved.",
        rec.id,
      );
    }
    default:
      return fail(
        "UNSUPPORTED_COMMAND",
        `The ${type} action is not supported by this local adapter.`,
      );
  }
}

function settleApprovedRuns(st: StoreState) {
  for (const run of rows(st, "agent_runs").filter(
    (x) => x.status === "waiting_approval",
  )) {
    const artifacts = a<string>(run.output_artifact_ids)
      .map((id) => table(st, "artifacts")[id])
      .filter(Boolean);
    if (!artifacts.length) continue;
    const approved = artifacts.every((artifact) => {
      const ref = o(artifact.record_ref),
        record = table(st, s(ref.table))[s(ref.id)];
      if (!record) return false;
      if (ref.table === "offers" || ref.table === "offer_versions")
        return ["approved", "shared", "accepted"].includes(
          s(record.state, s(record.status)),
        );
      if (ref.table === "promotions" || ref.table === "promotion_versions")
        return ["approved", "published_confirmed"].includes(
          s(record.state, s(record.status)),
        );
      if (ref.table === "messages")
        return ["approved", "sample_sent"].includes(s(record.delivery_state));
      return false;
    });
    if (approved) {
      patch(st, "agent_runs", run, {
        status: "completed",
        progress_step: n(run.progress_total, 3),
        completed_at: st.sample_clock,
        blocked_reason: null,
      });
      const request = table(st, "team_requests")[s(run.team_request_id)];
      if (request) patch(st, "team_requests", request, { status: "completed" });
    }
  }
}

/** Execute once against a cloned snapshot. Errors return the original state; receipts precede state checks. */
export function execute(
  state: StoreState,
  type: string,
  input: Input = {},
): { state: StoreState; result: Result } {
  try {
    need(
      !input.workspace_id || input.workspace_id === "workspace_alya",
      "Unknown workspace.",
      "NOT_AUTHORIZED",
    );
    const buyerCommands = new Set([
      "offer.accept",
      "offer.requestChanges",
      "conversation.send",
      "conversation.requestOwner",
      "inquiry.updateBrief",
      "project.provideInput",
      "project.acceptDelivery",
      "project.requestRevision",
      "payment.startRequest",
      "payment.simulateReceipt",
      "payment.replayReceipt",
      "file.attach",
      "file.remove",
    ]);
    if (input.grant_id || input.actor === "buyer")
      need(
        buyerCommands.has(type),
        "Buyer invitations cannot modify owner records.",
        "NOT_AUTHORIZED",
      );
    if (input.grant_id || input.actor === "buyer") granted(state, input);
    if (
      ["scenario.load", "sample.loadScenario", "sample.reset"].includes(type)
    ) {
      const id =
        type === "sample.reset"
          ? "review_ready"
          : s(input.id, s(input.scenario_id, "review_ready"));
      need(
        !state.dirty ||
          input.confirmed === true ||
          input.discard_edited_work_confirmed === true,
        "Confirm replacing your edited sample workspace before loading a scenario.",
        "CONFIRMATION_REQUIRED",
      );
      const fresh = createState(id);
      fresh.revision = state.revision + 1;
      return {
        state: fresh,
        result: { ok: true, message: "Sample scenario loaded.", id },
      };
    }
    const st = clone(state);
    const actor = s(input.grant_id, s(input.actor_id, "owner_alya"));
    const key = s(
      input.idempotency_key,
      s(input.command_id, `${state.revision}:${type}`),
    );
    const receiptId = `${actor}:${type}:${key}`;
    const normalized = { ...input };
    delete normalized.command_id;
    delete normalized.idempotency_key;
    const fingerprint = stable(normalized);
    const prior = table(st, "command_receipts")[receiptId];
    if (prior) {
      need(
        prior.fingerprint === fingerprint,
        "This action identifier was already used for different input. Retry as a new deliberate action.",
        "IDEMPOTENCY_CONFLICT",
      );
      return {
        state,
        result: { ...o(prior.result), ok: true, replayed: true } as Result,
      };
    }
    let result: Result;
    if (type === "clock.advance" || type === "sample.advanceClock") {
      const days = n(input.days);
      need(
        Number.isInteger(days) && days > 0 && days <= 365,
        "Advance the sample clock by 1 to 365 whole days.",
      );
      st.sample_clock = new Date(
        Date.parse(st.sample_clock) + days * 86400000,
      ).toISOString();
      for (const offer of rows(st, "offers")) {
        const version = get(st, "offer_versions", offer.current_version_id);
        if (
          !["accepted", "withdrawn", "expired"].includes(s(offer.status)) &&
          version.expires_at &&
          Date.parse(s(version.expires_at)) <= Date.parse(st.sample_clock)
        ) {
          patch(st, "offers", offer, { status: "expired" });
          patch(st, "offer_versions", version, { state: "expired" });
          event(st, "offer.expired", "An unaccepted offer expired.", [offer]);
        }
      }
      for (const project of rows(st, "projects").filter(
        (p) =>
          p.acceptance_id && !["completed", "cancelled"].includes(s(p.state)),
      ))
        refreshProject(st, project.id);
      result = {
        ok: true,
        message: `Sample clock advanced by ${days} day${days === 1 ? "" : "s"}. Expiry and prerequisites were checked.`,
      };
    } else result = runCommand(st, type, input);
    settleApprovedRuns(st);
    st.revision = state.revision + 1;
    st.dirty = true;
    if (!result.replayed) {
      const changed = Object.keys(st.tables)
        .filter((t) => !["events", "command_receipts"].includes(t))
        .flatMap((t) =>
          rows(st, t).filter(
            (r) =>
              !state.tables[t]?.[r.id] ||
              state.tables[t][r.id].version !== r.version,
          ),
        );
      const run = st.tables.agent_runs?.[s(result.id, s(input.id))];
      event(
        st,
        type,
        result.message,
        changed.slice(0, 12),
        s(input.role_id, s(run?.role_id)) || null,
        s(input.command_id, key),
      );
    }
    put(st, "command_receipts", receiptId, {
      kind: type,
      actor,
      fingerprint,
      result: clone(result),
      event_ids: rows(st, "events")
        .filter(
          (x) =>
            n(x.sequence) >
            Math.max(0, ...rows(state, "events").map((y) => n(y.sequence))),
        )
        .map((x) => x.id),
      committed_revision: st.revision,
    });
    return { state: st, result };
  } catch (error) {
    return {
      state,
      result: {
        ok: false,
        code: error instanceof DomainError ? error.code : "VALIDATION_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "This action could not be completed. Your changes are preserved.",
      },
    };
  }
}

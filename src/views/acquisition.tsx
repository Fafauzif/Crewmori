"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { UiText } from "@/components/ui-text";
import { BackendClient } from "@/lib/backend-client";
import { Entity, Input, a, b, date, label, money, optionLabel, n, o, s } from "@/lib/types";
import { downloadPdf } from "@/lib/downloads";
import { amendmentSchedule } from "@/lib/engine";
import { localDateTime, zonedDateTime } from "@/lib/business-time";
import { uiMessage } from "@/lib/i18n";
import { activeScoutRun, buyerInvitationIntent } from "@/lib/acquisition-ux";
import {
  PageHead,
  Panel,
  Button,
  LinkButton,
  Badge,
  Empty,
  Field,
  Form,
  Modal,
  Confirm,
  SearchBar,
  Tabs,
  useDirtyGuard,
} from "@/components/ui";
import "./acquisition.css";

const navigation = [
  { label: "Leads", href: "/app/opportunities" },
  { label: "Offers", href: "/app/offers" },
  { label: "Promotion", href: "/app/promotion" },
];
const statuses = [
  "new",
  "needs_information",
  "assessing",
  "qualified",
  "declined",
  "archived",
];
const offerStatuses = [
  "draft",
  "awaiting_review",
  "approved",
  "shared",
  "accepted",
  "change_requested",
  "withdrawn",
  "expired",
];
const safeUrl = (value: unknown) => {
  try {
    const u = new URL(s(value));
    return ["http:", "https:"].includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
};
const minor = (value: string, currency: string): number | null => {
  const raw = value.trim();
  if (!(currency === "IDR" ? /^\d+$/ : /^\d+(\.\d{1,2})?$/).test(raw))
    return null;
  const [whole, fraction = ""] = raw.split(".");
  const result =
    BigInt(whole) * BigInt(currency === "IDR" ? 1 : 100) +
    BigInt(currency === "IDR" ? 0 : fraction.padEnd(2, "0"));
  return result <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(result) : null;
};
const installment = (amount: number, basisPoints: number) =>
  Number(
    (BigInt(Math.trunc(amount)) * BigInt(Math.trunc(basisPoints)) +
      BigInt(5000)) /
      BigInt(10000),
  );
const priceString = (price: unknown) => {
  const p = o(price);
  return price
    ? String(n(p.amount_minor) / (s(p.currency) === "IDR" ? 1 : 100))
    : "";
};
const lines = (value: string) =>
  value
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
function useQuery() {
  const router = useRouter();
  const search = useSearchParams();
  return {
    search,
    set(values: Record<string, string | null>) {
      const q = new URLSearchParams(search.toString());
      for (const [key, value] of Object.entries(values)) {
        if (value === null || value === "") q.delete(key);
        else q.set(key, value);
      }
      router.replace(`${window.location.pathname}${q.size ? `?${q}` : ""}`, {
        scroll: false,
      });
    },
  };
}

function Notice({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (text) ref.current?.focus();
  }, [text]);
  return text ? (
    <p ref={ref} className="acq-error" role="alert" tabIndex={-1}>
      {text}
    </p>
  ) : null;
}
function Unknown({ kind }: { kind: string }) {
  return (
    <Empty
      title={`${kind} unavailable`}
      description="This record does not exist in the current workspace. Check the link or return to the list."
    >
      <LinkButton href="/app/opportunities">{"Back to opportunities"}</LinkButton>
    </Empty>
  );
}
function Status({ value }: { value: unknown }) {
  return <Badge>{label(value)}</Badge>;
}
function Choice({
  label: caption,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="acq-filter">
      <span className="sr-only">{caption}</span>
      <select
        aria-label={caption}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value=""><UiText>{"All"}</UiText> {caption.toLowerCase()}</option>
        {options.map((v) => (
          <option value={v} key={v}>
            {optionLabel(v)}
          </option>
        ))}
      </select>
    </label>
  );
}
function Pager({
  count,
  page,
  onChange,
}: {
  count: number;
  page: number;
  onChange: (page: number) => void;
}) {
  const total = Math.ceil(count / 8);
  return total > 1 ? (
    <nav className="actions acq-pagination" aria-label="List pagination">
      <Button
        variant="secondary"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >{"Previous"}
      </Button>
      <span aria-live="polite">
        Page {page} of {total}
      </span>
      <Button
        variant="secondary"
        disabled={page >= total}
        onClick={() => onChange(page + 1)}
      >{"Next"}
      </Button>
    </nav>
  ) : null;
}
function FormClose({
  dirty,
  onClose,
  children,
  pending = false,
}: {
  dirty: boolean;
  onClose: () => void;
  pending?: boolean;
  children: (close: () => void) => React.ReactNode;
}) {
  const [discard, setDiscard] = useState(false);
  useDirtyGuard(dirty);
  return (
    <>
      {children(() => { if (pending) return; if (dirty) setDiscard(true); else onClose(); })}
      {discard && (
        <Confirm
          title="Discard unsaved changes?"
          description="Your last saved version will remain unchanged."
          onClose={() => setDiscard(false)}
          onConfirm={onClose}
        />
      )}
    </>
  );
}

export default function Acquisition({ path }: { path: string }) {
  const section = path.startsWith("/app/offers")
    ? "offers"
    : path.startsWith("/app/promotion")
      ? "promotion"
      : "opportunities";
  const id = path.split("/")[3];
  return (
    <div className="acquisition">
      <Tabs items={navigation} />
      {section === "opportunities" ? (
        id ? (
          <LeadDetail key={id} id={id} />
        ) : (
          <LeadList />
        )
      ) : section === "offers" ? (
        id ? (
          <OfferDetail key={id} id={id} />
        ) : (
          <OfferList />
        )
      ) : (
        <PromotionList />
      )}
    </div>
  );
}

function LeadList() {
  const { rows, record, t } = useStore();
  const { search, set } = useQuery();
  const q = search.get("q") || "",
    status = search.get("status") || "",
    source = search.get("source") || "",
    sort = search.get("sort") || "newest";
  const all = rows("opportunities");
  const requestedPage = Math.max(1, Number(search.get("page")) || 1);
  const filtered = all
    .filter((lead) => {
      const src = a<string>(lead.source_ids)
        .map((id) => record("sources", id))
        .filter(Boolean);
      return (
        (!status || lead.status === status) &&
        (!source || src.some((x) => x?.kind === source)) &&
        `${lead.title} ${s(record("clients", s(lead.client_id))?.name)} ${src.map((x) => `${x?.label} ${x?.content}`).join(" ")}`
          .toLowerCase()
          .includes(q.toLowerCase())
      );
    })
    .sort(
      (x, y) =>
        (sort === "client"
          ? s(record("clients", s(x.client_id))?.name).localeCompare(
              s(record("clients", s(y.client_id))?.name),
            )
          : s(y.created_at).localeCompare(s(x.created_at))) ||
        x.id.localeCompare(y.id),
    );
  const page = Math.min(
    requestedPage,
    Math.max(1, Math.ceil(filtered.length / 8)),
  );
  return (
    <>
      <PageHead
        title={t("Good opportunities, thoughtfully chosen.")}
        description="Every request has a source, a next step, and room for your judgment."
        action={
          <>
            <Button variant="secondary" onClick={() => set({ import: "1" })}>{"Import request"}
            </Button>
            <Button onClick={() => set({ new: "1" })}>{"Add lead"}</Button>
          </>
        }
      />
      <div className="acq-toolbar">
        <SearchBar
          value={q}
          onChange={(v) => set({ q: v, page: null })}
          placeholder="Search leads"
        />
        <Choice
          label="Status"
          value={status}
          options={statuses}
          onChange={(v) => set({ status: v, page: null })}
        />
        <Choice
          label="Source"
          value={source}
          options={[...new Set(rows("sources").map((x) => s(x.kind)))]}
          onChange={(v) => set({ source: v, page: null })}
        />
        <select
          aria-label="Sort leads"
          value={sort}
          onChange={(e) => set({ sort: e.target.value })}
        >
          <option value="newest"><UiText>{"Newest first"}</UiText></option>
          <option value="client"><UiText>{"Client A–Z"}</UiText></option>
        </select>
        <Button
          variant="ghost"
          onClick={() =>
            set({ q: null, status: null, source: null, sort: null, page: null })
          }
        >{"Clear filters"}
        </Button>
      </div>
      <div className="row acq-list-meta">
        <span className="muted" aria-live="polite">
          {filtered.length}{" "}
          {filtered.length === 1 ? "opportunity" : "opportunities"}
        </span>
      </div>
      {!filtered.length ? (
        <Empty
          title={
            all.length
              ? "No leads match these filters"
              : "Your next opportunity starts here"
          }
          description={
            all.length
              ? "Try a broader search or clear the selected filters."
              : "Add a request or import source text for your crew to assess."
          }
        >
          <Button
            onClick={() =>
              all.length
                ? set({ q: null, status: null, source: null })
                : set({ new: "1" })
            }
          >
            {all.length ? "Clear filters" : "Add lead"}
          </Button>
        </Empty>
      ) : (
        <Panel className="opportunity-list">
          {filtered.slice((page - 1) * 8, page * 8).map((lead) => {
            const assessment = rows("assessments").find(
              (x) =>
                x.opportunity_id === lead.id &&
                x.role_id === "scout" &&
                x.status === "current",
            );
            const req = record("requirements", s(lead.requirements_id));
            return (
              <article className="opportunity-record" key={lead.id}>
                <div className="acq-lead-row">
                  <div className="acq-client-mark" aria-hidden="true">
                    {s(record("clients", s(lead.client_id))?.name).slice(0, 1)}
                  </div>
                  <div className="acq-lead-main">
                    <div className="row">
                      <span className="muted">
                        {s(
                          record("clients", s(lead.client_id))?.name,
                          "New client",
                        )}
                      </span>
                      <Status value={lead.status} />
                    </div>
                    <h2>
                      <Link
                        href={`/app/opportunities/${lead.id}?return=${encodeURIComponent(search.toString())}`}
                      >
                        {s(lead.title)}
                      </Link>
                    </h2>
                    <div className="acq-inline-meta">
                      <span>
                        {req?.budget
                          ? money(req.budget) + " requested budget"
                          : "Budget to clarify"}
                      </span>
                      <span>
                        {req?.delivery_business_days
                          ? `${n(req.delivery_business_days)} business days requested`
                          : "Timing to clarify"}
                      </span>
                    </div>
                    <p className="acq-fit">
                      {assessment
                        ? s(assessment.summary)
                        : a<string>(lead.unknowns).length
                          ? `To clarify: ${a<string>(lead.unknowns).map(label).join(", ")}.`
                          : "A new request, ready for a closer look."}
                    </p>
                  </div>
                  <LinkButton
                    href={`/app/opportunities/${lead.id}?return=${encodeURIComponent(search.toString())}`}
                    variant="ghost"
                  >{"Open lead →"}
                  </LinkButton>
                </div>
              </article>
            );
          })}
        </Panel>
      )}
      <Pager
        count={filtered.length}
        page={page}
        onChange={(p) => set({ page: String(p) })}
      />
      {search.get("new") === "1" && (
        <LeadEditor onClose={() => set({ new: null })} />
      )}
      {search.get("import") === "1" && (
        <ImportLeads onClose={() => set({ import: null })} />
      )}
    </>
  );
}

function LeadEditor({ lead, onClose }: { lead?: Entity; onClose: () => void }) {
  const { record, command, rows } = useStore();
  const router = useRouter();
  const req = record("requirements", s(lead?.requirements_id));
  const source = record(
    "sources",
    s(lead?.source_id, a<string>(lead?.source_ids).at(-1) || ""),
  );
  const initial = {
    name: s(record("clients", s(lead?.client_id))?.name),
    client_id: s(lead?.client_id),
    title: s(lead?.title),
    request: s(source?.content),
    source_kind: s(source?.kind, "manual_entry"),
    source_label: s(source?.label),
    source_url: safeUrl(source?.locator || source?.url),
    budget: priceString(req?.budget),
    currency: s(o(req?.budget).currency, "USD"),
    days: req?.delivery_business_days ? String(req.delivery_business_days) : "",
    email: s(record("contacts", s(lead?.contact_id))?.email),
  };
  const [form, setForm] = useState(initial),
    [error, setError] = useState("");
  const [expectedVersion] = useState(lead?.version);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const field = (key: keyof typeof initial, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.request.trim() || !form.title.trim())
      return setError("Add a client name, lead title and original request.");
    const amount = form.budget ? minor(form.budget, form.currency) : null;
    if (form.budget && amount === null)
      return setError("Enter a valid budget using the selected currency.");
    if (form.source_url && !safeUrl(form.source_url))
      return setError("Use an http or https source URL.");
    if (form.days && (!/^\d+$/.test(form.days) || +form.days < 1))
      return setError("Requested duration must be a positive whole number.");
    setSaving(true);
    try {
    const result = (await command("opportunity.save", {
      id: lead?.id,
      expected_version: expectedVersion,
      values: {
        ...form,
        budget:
          amount === null
            ? null
            : {
                amount_minor: amount,
                currency: form.currency,
                scale: form.currency === "IDR" ? 0 : 2,
              },
        delivery_business_days: form.days ? +form.days : null,
      },
    }));
    if (!result.ok) return setError(result.message);
    onClose();
    router.push(`/app/opportunities/${result.id || lead?.id}`);
    } finally { setSaving(false); }
  }
  return (
    <FormClose dirty={dirty} onClose={onClose} pending={saving}>
      {(close) => (
        <Modal title={lead ? "Edit lead" : "Add a lead"} onClose={close} closeDisabled={saving}>
          <Form className="stack" noValidate onSubmit={save}><fieldset className="acq-pending-fields" disabled={saving}>
            <Notice text={error} />
            {!lead && (
              <Field label="Link an existing client (optional)">
                <select
                  value={form.client_id}
                  onChange={(e) => {
                    const client = record("clients", e.target.value);
                    setForm((f) => ({
                      ...f,
                      client_id: e.target.value,
                      name: s(client?.name),
                    }));
                  }}
                >
                  <option value=""><UiText>{"Create a separate client"}</UiText></option>
                  {rows("clients").map((c) => (
                    <option key={c.id} value={c.id}>
                      {s(c.name)}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="grid2">
              <Field label="Client or lead name">
                <input
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(e) => field("name", e.target.value)}
                />
              </Field>
              <Field label="Contact email (optional)">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => field("email", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Lead title">
              <input
                required
                maxLength={180}
                value={form.title}
                onChange={(e) => field("title", e.target.value)}
              />
            </Field>
            <Field label="Original request">
              <textarea
                className="resize-none"
                required
                rows={5}
                maxLength={12000}
                value={form.request}
                onChange={(e) => field("request", e.target.value)}
              />
            </Field>
            <div className="grid3">
              <Field label="Requested budget (optional)">
                <input
                  inputMode="decimal"
                  value={form.budget}
                  onChange={(e) => field("budget", e.target.value)}
                />
              </Field>
              <Field label="Currency">
                <select
                  value={form.currency}
                  onChange={(e) => field("currency", e.target.value)}
                >
                  <option>USD</option>
                  <option>IDR</option>
                </select>
              </Field>
              <Field label="Requested business days">
                <input
                  inputMode="numeric"
                  value={form.days}
                  onChange={(e) => field("days", e.target.value)}
                />
              </Field>
            </div>
            <p className="muted">
              Requested timing and budget are source facts. They do not commit
              an offer or reserve your calendar.
            </p>
            <details>
              <summary><UiText>{"Source details"}</UiText></summary>
              <div className="stack">
                <Field label="Source type">
                  <select
                    value={form.source_kind}
                    onChange={(e) => field("source_kind", e.target.value)}
                  >
                    <option value="manual_entry"><UiText>{"Manual entry"}</UiText></option>
                    <option value="sample_message"><UiText>{"Sample message"}</UiText></option>
                    <option value="imported_text"><UiText>{"Imported text"}</UiText></option>
                  </select>
                </Field>
                <Field label="Source or reference title">
                  <input
                    value={form.source_label}
                    onChange={(e) => field("source_label", e.target.value)}
                  />
                </Field>
                <Field label="Source URL (metadata only)">
                  <input
                    type="url"
                    value={form.source_url}
                    onChange={(e) => field("source_url", e.target.value)}
                  />
                </Field>
              </div>
            </details>
            <div className="actions">
              <Button type="submit">{"Save lead"}</Button>
              <Button type="button" variant="secondary" onClick={close}>{"Cancel"}
              </Button>
            </div>
          </fieldset></Form>
        </Modal>
      )}
    </FormClose>
  );
}

function parseCsv(raw: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [],
    value = "",
    quoted = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') {
      if (quoted && raw[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && raw[i + 1] === "\n") i++;
      row.push(value.trim());
      if (row.some(Boolean)) result.push(row);
      row = [];
      value = "";
    } else value += ch;
  }
  row.push(value.trim());
  if (row.some(Boolean)) result.push(row);
  return result;
}
function ImportLeads({ onClose }: { onClose: () => void }) {
  const { command, notify } = useStore();
  const [text, setText] = useState(""),
    [preview, setPreview] = useState<string[][]>([]),
    [nameCol, setNameCol] = useState(0),
    [requestCol, setRequestCol] = useState(1),
    [error, setError] = useState("");
  function inspect() {
    if (!text.trim())
      return setError("Add request text or CSV rows before previewing.");
    const parsed = parseCsv(text);
    if (parsed[0]?.length < 2) {
      setPreview([
        ["Client", "Request"],
        ["", text.trim()],
      ]);
      setNameCol(0);
      setRequestCol(1);
      setError("");
      return;
    }
    if (parsed.length < 2)
      return setError(
        "Paste a CSV header and at least one request row, with separate name and request columns.",
      );
    if (parsed.length > 101)
      return setError("Import up to 100 request rows at a time.");
    setError("");
    setPreview(parsed);
    setNameCol(
      Math.max(
        0,
        parsed[0].findIndex((x) => /name|client/i.test(x)),
      ),
    );
    setRequestCol(
      Math.max(
        1,
        parsed[0].findIndex((x) => /request|brief/i.test(x)),
      ),
    );
  }
  async function save() {
    if (
      nameCol === requestCol ||
      preview.slice(1).some((row) => !row[nameCol] || !row[requestCol])
    )
      return setError(
        "Map different name and request columns with a value on every row.",
      );
    let count = 0;
    for (const row of preview.slice(1)) {
      const result = (await command("opportunity.save", {
        idempotency_key: `import:${text}:${count}`,
        values: {
          name: row[nameCol],
          title: row[requestCol].slice(0, 80),
          request: row[requestCol],
          source_kind: "imported_text",
          source_label: "Owner-imported request",
          currency: "USD",
        },
      }));
      if (!result.ok) {
        setError(
          `${count} rows were saved. The next row needs attention: ${result.message}`,
        );
        return;
      }
      count++;
    }
    notify(`${count} request${count === 1 ? "" : "s"} imported.`);
    onClose();
  }
  return (
    <FormClose dirty={!!text} onClose={onClose}>
      {(close) => (
        <Modal title="Import requests" onClose={close}>
          <div className="stack">
            <p>
              Paste CSV text with name and request columns, or load a plain TXT
              request. Review the mapping and client names before saving.
            </p>
            <Notice text={error} />
            <Field label="Import text file">
              <input
                type="file"
                accept=".txt,text/plain"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (
                    !file.name.toLowerCase().endsWith(".txt") ||
                    file.size > 10 * 1024 * 1024 ||
                    (file.type && file.type !== "text/plain")
                  ) {
                    setError(
                      "Choose a TXT file no larger than 10 MiB. For CSV files, paste the text below. PDF extraction is unavailable.",
                    );
                    return;
                  }
                  setText(await file.text());
                  setPreview([]);
                  setError("");
                }}
              />
            </Field>
            <Field label="Request or CSV text">
              <textarea
                className="resize-none"
                rows={6}
                placeholder={
                  'name,request\nAcme,"We need a discovery workshop"'
                }
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setPreview([]);
                }}
              />
            </Field>
            <div className="actions">
              <Button onClick={inspect}>{"Preview request rows"}</Button>
              {text && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setText("");
                    setPreview([]);
                    setError("");
                  }}
                >{"Remove import"}
                </Button>
              )}
            </div>
            {preview.length > 0 && (
              <>
                <div className="grid2">
                  <Field label="Client name column">
                    <select
                      value={nameCol}
                      onChange={(e) => setNameCol(+e.target.value)}
                    >
                      {preview[0].map((v, i) => (
                        <option key={i} value={i}>
                          {v || `Column ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Request column">
                    <select
                      value={requestCol}
                      onChange={(e) => setRequestCol(+e.target.value)}
                    >
                      {preview[0].map((v, i) => (
                        <option key={i} value={i}>
                          {v || `Column ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="acq-import-preview">
                  {preview.slice(1).map((row, i) => (
                    <div className="list-row" key={i}>
                      <Field label={`Client name · row ${i + 1}`}>
                        <input
                          value={row[nameCol] || ""}
                          onChange={(e) =>
                            setPreview((prior) =>
                              prior.map((r, rowIndex) =>
                                rowIndex === i + 1
                                  ? r.map((cell, colIndex) =>
                                      colIndex === nameCol
                                        ? e.target.value
                                        : cell,
                                    )
                                  : r,
                              ),
                            )
                          }
                        />
                      </Field>
                      <p>{row[requestCol] || "Missing request"}</p>
                    </div>
                  ))}
                </div>
                <Button onClick={save}>{"Save"} {preview.length - 1} lead{preview.length > 2 ? "s" : ""}
                </Button>
              </>
            )}
            <Button variant="secondary" onClick={close}>{"Cancel"}
            </Button>
          </div>
        </Modal>
      )}
    </FormClose>
  );
}

function LeadDetail({ id }: { id: string }) {
  const { record, rows, command, notify, t } = useStore();
  const { search, set } = useQuery();
  const lead = record("opportunities", id);
  const [error, setError] = useState(""),
    [reason, setReason] = useState(""),
    [question, setQuestion] = useState(""),
    [confirm, setConfirm] = useState("");
  if (!lead) return <Unknown kind="Lead" />;
  const client = record("clients", s(lead.client_id)),
    req = record("requirements", s(lead.requirements_id)),
    sources = a<string>(lead.source_ids)
      .map((x) => record("sources", x))
      .filter((x): x is Entity => !!x),
    assessments = rows("assessments").filter((x) => x.opportunity_id === id);
  const source = record("sources", s(lead.source_id)) || sources.at(-1);
  const activeRun = activeScoutRun(rows("agent_runs"), id, rows("artifacts"));
  const blocked = [
    "declined",
    "archived",
    "accepted",
    "won",
    "converted",
  ].includes(s(lead.status));
  const run = async (type: string, values: Input = {}) => {
    const result = (await command(type, {
      id,
      expected_version: lead.version,
      ...values,
    }));
    if (!result.ok) setError(result.message);
    else {
      setError("");
      notify(result.message);
    }
    return result;
  };
  return (
    <>
      <Link
        className="acq-back"
        href={`/app/opportunities${search.get("return") ? `?${search.get("return")}` : ""}`}
      >
        ← All leads
      </Link>
      <PageHead
        title={s(lead.title)}
        description={`${s(client?.name)} · ${label(lead.status)}`}
        action={
          lead.offer_id ? (
            <LinkButton href={`/app/offers/${lead.offer_id}`}>{"Open offer"}
            </LinkButton>
          ) : (
            <LinkButton href={`/app/offers?new=1&opportunity=${id}`}>{"Draft offer"}
            </LinkButton>
          )
        }
      />
      <Notice text={error} />
      <div className="acq-detail">
        <Panel>
          <div className="row acq-section-head">
            <h2><UiText>{"The original request"}</UiText></h2>
            <Button
              variant="secondary"
              onClick={() => set({ panel: "source" })}
            >{"View source"}
            </Button>
          </div>
          <p className="acq-request">
            {s(source?.content, "No original request has been saved.")}
          </p>
          <div className="acq-facts">
            <div>
              <span><UiText>{"Requested budget"}</UiText></span>
              <strong>
                {req?.budget ? money(req.budget) : "Not provided"}
              </strong>
            </div>
            <div>
              <span><UiText>{"Requested timing"}</UiText></span>
              <strong>
                {req?.delivery_business_days
                  ? `${n(req.delivery_business_days)} business days`
                  : "To clarify"}
              </strong>
            </div>
            <div>
              <span><UiText>{"Source"}</UiText></span>
              <strong>{source ? label(source.kind) : "Unavailable"}</strong>
            </div>
          </div>
          <Button variant="secondary" onClick={() => set({ edit: "1" })}>{"Edit lead"}
          </Button>
        </Panel>
        <Panel>
          <div className="row acq-section-head">
            <div>
              <span className="eyebrow"><UiText>{"Scout’s perspective"}</UiText></span>
              <h2><UiText>{"A closer look"}</UiText></h2>
            </div>
            <img
              className="acq-avatar"
              src="/assets/characters/scout.svg"
              alt="Scout"
            />
          </div>
          <p>
            {s(
              assessments.find(
                (x) => x.role_id === "scout" && x.status === "current",
              )?.summary,
              "Give Scout the request to get a sourced assessment of fit and the information still needed.",
            )}
          </p>
          {a<string>(lead.unknowns).length > 0 && (
            <p className="muted">
              Still to clarify: {a<string>(lead.unknowns).map(label).join(", ")}
              .
            </p>
          )}
          {activeRun && (
            <p className="acq-task-status" role="status">
              {uiMessage("acquisition.scout.status", s(record("preferences", "preferences_alya")?.locale, "en"), { status: t(activeRun.status === "completed" ? "Ready for review" : label(activeRun.status || activeRun.state)) })}
            </p>
          )}
          <div className="actions">
            <Button
              variant="secondary"
              disabled={!!activeRun}
              onClick={async () =>
                (await run("agent.start", {
                  role_id: "scout",
                  intent: "assess_opportunity",
                  opportunity_id: id,
                  input_refs: [{ table: "opportunities", id, version: lead.version }],
                }))
              }
            >{"Ask Scout to assess"}
            </Button>
            {activeRun && (
              <LinkButton
                variant="secondary"
                href={`/app/team?task=${activeRun.id}`}
              >{activeRun.status === "completed" ? "Review Scout result" : "Open Scout task →"}
              </LinkButton>
            )}
            {assessments.length > 0 && (
              <Button
                variant="secondary"
                onClick={() => set({ panel: "assessment" })}
              >{"Inspect assessment"}
              </Button>
            )}
          </div>
        </Panel>
      </div>
      <Panel>
        <h2><UiText>{"Your next step"}</UiText></h2>
        <div className="actions">
          {["new", "needs_information", "assessing"].includes(
            s(lead.status),
          ) && (
            <Button onClick={() => setConfirm("qualify")}>{"Qualify lead"}</Button>
          )}
          {!blocked && (
            <Button
              variant="secondary"
              onClick={() => {
                setQuestion(
                  `Could you clarify ${a<string>(lead.unknowns).map(label).join(", ") || "the scope, budget and preferred timing"}?`,
                );
                setConfirm("question");
              }}
            >{"Request missing information"}
            </Button>
          )}
          {!blocked && (
            <Button variant="danger" onClick={() => setConfirm("decline")}>{"Decline lead"}
            </Button>
          )}
          {["declined", "archived"].includes(s(lead.status)) && (
            <Button onClick={async () => (await run("opportunity.restore"))}>{"Restore lead"}
            </Button>
          )}
          <LinkButton
            href={`/app/clients/${lead.client_id}`}
            variant="secondary"
          >{"Open client"}
          </LinkButton>
        </div>
      </Panel>
      {search.get("edit") === "1" && (
        <LeadEditor lead={lead} onClose={() => set({ edit: null })} />
      )}
      {search.get("panel") === "source" && (
        <Modal title="Request source" onClose={() => set({ panel: null })}>
          <div className="stack">
            {sources.length ? (
              sources.map((src) => (
                <article key={src.id}>
                  <div className="row">
                    <h3>{s(src.label)}</h3>
                    <Badge>{"Version"} {src.version}</Badge>
                  </div>
                  <p className="acq-request">{s(src.content)}</p>
                  <p className="muted">
                    Observed {date(src.observed_at || src.recorded_at)} ·{" "}
                    {label(src.factual_status)}
                  </p>
                  {safeUrl(src.locator || src.url) ? (
                    <a
                      href={safeUrl(src.locator || src.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                    ><UiText>{"Open original link ↗"}</UiText>
                    </a>
                  ) : (
                    <p className="muted">
                      No external source link is available.
                    </p>
                  )}
                  <div className="actions">
                    <Button
                      variant="secondary"
                      disabled={!src.connection_id}
                      onClick={async () => {
                        const result = (await command("source.refresh", {
                          id: src.id,
                          expected_version: src.version,
                        }));
                        if (result.ok) notify(result.message);
                        else setError(result.message);
                      }}
                    >
                      Refresh sample source
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => set({ panel: null, edit: "1" })}
                    >{"Replace request source"}
                    </Button>
                  </div>
                  {!src.connection_id && (
                    <p className="muted">
                      Manual sources can be replaced by editing the request.
                    </p>
                  )}
                </article>
              ))
            ) : (
              <Empty
                title="No source attached"
                description="Add the original request to give your crew useful evidence."
              />
            )}
          </div>
        </Modal>
      )}
      {search.get("panel") === "assessment" && (
        <Modal
          title="Assessment & evidence"
          onClose={() => set({ panel: null })}
        >
          <div className="stack">
            {assessments.map((item) => (
              <section key={item.id} className="acq-assessment">
                <div className="row">
                  <h3>{label(item.role_id)}</h3>
                  <Status value={item.status} />
                </div>
                <p>{s(item.summary)}</p>
                {(["factual_findings", "assumptions", "unknowns"] as const).map(
                  (key) =>
                    a<string>(item[key]).length > 0 && (
                      <div key={key}>
                        <strong>{label(key)}</strong>
                        <ul>
                          {a<string>(item[key]).map((value, i) => (
                            <li key={i}>{value}</li>
                          ))}
                        </ul>
                      </div>
                    ),
                )}
                <p className="muted">
                  Requirements version {n(item.requirements_version)} · Policy
                  version {n(item.policy_version)}
                </p>
                <Link href={`/app/team?task=${s(item.run_id)}`}>
                  View task and sources →
                </Link>
              </section>
            ))}
          </div>
        </Modal>
      )}
      {confirm === "qualify" && (
        <Confirm
          title="Qualify this lead?"
          description={`Record your decision for ${s(client?.name)}. ${a<string>(lead.unknowns).length ? "The listed unknowns remain open and must be resolved where required before an offer is approved." : "This records a qualified lead; it does not create an agreement."}`}
          onClose={() => setConfirm("")}
          onConfirm={async () => {
            if ((await run("opportunity.qualify")).ok) setConfirm("");
          }}
        />
      )}
      {confirm === "decline" && (
        <Modal title="Decline this lead?" onClose={() => setConfirm("")}>
          <div className="stack">
            <p>
              {s(lead.title)} will leave the active list. You can restore it
              later. No buyer message will be sent.
            </p>
            <Field label="Decline reason (optional)">
              <textarea
                className="resize-none"
                rows={3}
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <div className="actions">
              <Button
                variant="danger"
                onClick={async () => {
                  if ((await run("opportunity.decline", { reason })).ok) setConfirm("");
                }}
              >{"Confirm decline"}
              </Button>
              <Button variant="secondary" onClick={() => setConfirm("")}>{"Keep lead"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {confirm === "question" && (
        <Modal
          title="Request missing information"
          onClose={() => setConfirm("")}
        >
          <div className="stack">
            <p>
              This creates a private question draft for review in the client
              workspace.
            </p>
            <Field label="Buyer-safe question">
              <textarea
                className="resize-none"
                rows={4}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </Field>
            <Button
              disabled={!question.trim()}
              onClick={async () => {
                const result = (await command("message.saveDraft", {
                  client_id: lead.client_id,
                  conversation_id: lead.conversation_id,
                  content: question,
                  destination_contact_id: lead.contact_id,
                }));
                if (result.ok) {
                  notify(result.message);
                  setConfirm("");
                } else setError(result.message);
              }}
            >{"Save question draft"}
            </Button>
            <LinkButton
              href={`/app/clients/${lead.client_id}?tab=messages`}
              variant="secondary"
            >{"Open client messages"}
            </LinkButton>
          </div>
        </Modal>
      )}
    </>
  );
}

function OfferList() {
  const { rows, record } = useStore();
  const { search, set } = useQuery();
  const q = search.get("q") || "",
    status = search.get("status") || "",
    sort = search.get("sort") || "newest";
  const all = rows("offers");
  const requestedPage = Math.max(1, Number(search.get("page")) || 1);
  const filtered = all
    .filter(
      (offer) =>
        (!status || offer.status === status) &&
        `${s(record("clients", s(offer.client_id))?.name)} ${s(record("offer_versions", s(offer.current_version_id))?.title)}`
          .toLowerCase()
          .includes(q.toLowerCase()),
    )
    .sort((x, y) => {
      const xv = record("offer_versions", s(x.current_version_id)),
        yv = record("offer_versions", s(y.current_version_id));
      return (
        (sort === "client"
          ? s(record("clients", s(x.client_id))?.name).localeCompare(
              s(record("clients", s(y.client_id))?.name),
            )
          : sort === "amount"
            ? s(o(xv?.price).currency).localeCompare(
                s(o(yv?.price).currency),
              ) || n(o(yv?.price).amount_minor) - n(o(xv?.price).amount_minor)
            : s(y.updated_at).localeCompare(s(x.updated_at))) ||
        x.id.localeCompare(y.id)
      );
    });
  const page = Math.min(
    requestedPage,
    Math.max(1, Math.ceil(filtered.length / 8)),
  );
  return (
    <>
      <PageHead
        title="Clear terms. A confident yes."
        description="Shape the right offer, review the details, and share when you are ready."
        action={<Button onClick={() => set({ new: "1" })}>{"Create offer"}</Button>}
      />
      <div className="acq-toolbar">
        <SearchBar
          value={q}
          onChange={(v) => set({ q: v, page: null })}
          placeholder="Search offers"
        />
        <Choice
          label="Offer status"
          value={status}
          options={offerStatuses}
          onChange={(v) => set({ status: v, page: null })}
        />
        <select
          aria-label="Sort offers"
          value={sort}
          onChange={(e) => set({ sort: e.target.value })}
        >
          <option value="newest"><UiText>{"Recently updated"}</UiText></option>
          <option value="client"><UiText>{"Client A–Z"}</UiText></option>
          <option value="amount">Amount by currency</option>
        </select>
        <Button
          variant="ghost"
          onClick={() => set({ q: null, status: null, sort: null })}
        >{"Clear filters"}
        </Button>
      </div>
      <p className="muted offer-list-count" aria-live="polite">
        {filtered.length} offer{filtered.length === 1 ? "" : "s"}
      </p>
      {filtered.length ? (
        <Panel>
          <div className="acq-offer-list">
            {filtered.slice((page - 1) * 8, page * 8).map((offer) => {
              const version = record(
                "offer_versions",
                s(offer.current_version_id),
              );
              return (
                <article className="acq-offer-row" key={offer.id}>
                  <div>
                    <span className="muted">
                      {s(record("clients", s(offer.client_id))?.name)}
                    </span>
                    <h3>
                      <Link
                        href={`/app/offers/${offer.id}?return=${encodeURIComponent(search.toString())}`}
                      >
                        {s(version?.title)}
                      </Link>
                    </h3>
                    <span className="muted"><UiText>{"Version"}</UiText> {n(version?.revision)} ·{" "}
                      {a(version?.deliverables).length} deliverables
                    </span>
                  </div>
                  <div>
                    <strong className="acq-amount">
                      {version?.price
                        ? money(version.price)
                        : "Price to confirm"}
                    </strong>
                    <Status value={offer.status} />
                  </div>
                  <LinkButton
                    href={`/app/offers/${offer.id}?return=${encodeURIComponent(search.toString())}`}
                    variant="secondary"
                  >
                    {offer.status === "awaiting_review"
                      ? "Review offer"
                      : "Open offer"}{" "}
                    →
                  </LinkButton>
                </article>
              );
            })}
          </div>
        </Panel>
      ) : (
        <Empty
          title={
            all.length ? "No offers match this view" : "Make your first offer"
          }
          description="A clear scope, price, and delivery basis helps everyone begin with confidence."
        >
          <Button
            onClick={() =>
              all.length ? set({ q: null, status: null }) : set({ new: "1" })
            }
          >
            {all.length ? "Clear filters" : "Create offer"}
          </Button>
        </Empty>
      )}
      <Pager
        count={filtered.length}
        page={page}
        onChange={(p) => set({ page: String(p) })}
      />
      {search.get("new") === "1" && (
        <OfferEditor
          opportunityId={search.get("opportunity") || undefined}
          onClose={() => set({ new: null, opportunity: null })}
        />
      )}
    </>
  );
}

function OfferTerms({
  version,
  buyer = false,
}: {
  version: Entity;
  buyer?: boolean;
}) {
  const { rows } = useStore();
  const terms = o(version.terms),
    price = o(version.price),
    deposit = installment(n(price.amount_minor), n(terms.deposit_basis_points));
  const project = rows("projects").find(
    (item) => item.offer_id === version.offer_id,
  );
  const proposal = rows("calendar_events").find(
    (item) =>
      item.offer_version_id === version.id &&
      item.kind === "reschedule_proposal",
  );
  const acceptance = rows("acceptances").find(
    (item) => item.offer_version_id === version.id,
  );
  const priorSchedule = rows("project_schedule_history").find(
    (item) => acceptance && item.acceptance_id === acceptance.id,
  );
  const proposedStart = s(terms.proposed_start_at, s(proposal?.starts_at));
  let proposedDue = s(terms.proposed_due_at, s(proposal?.proposed_due_at));
  if (proposedStart && !proposedDue) {
    try {
      proposedDue = amendmentSchedule(proposedStart, terms).due;
    } catch {
      /* Invalid dates remain explicitly unresolved below. */
    }
  }
  const previousStart = s(
    priorSchedule?.previous_start_at,
    s(project?.committed_start_at),
  );
  const previousDue = s(
    priorSchedule?.previous_due_at,
    s(project?.committed_due_at),
  );
  const scheduleDate = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? "To confirm"
      : new Intl.DateTimeFormat("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Jakarta",
        }).format(parsed);
  };
  return (
    <div className="stack">
      <div className="row acq-section-head">
        <div>
          <span className="eyebrow">
            {buyer ? "Your offer" : "Proposed terms"}
          </span>
          <h2>{s(version.title)}</h2>
        </div>
        <Badge>{"Version"} {n(version.revision)}</Badge>
      </div>
      <ul className="acq-deliverables">
        {a<Record<string, unknown>>(version.deliverables).map((item, i) => (
          <li key={s(item.key) || i}>
            <span className="acq-tick" aria-hidden="true">
              ✓
            </span>
            {s(item.label)}
            {n(item.quantity, 1) > 1 ? ` × ${n(item.quantity)}` : ""}
          </li>
        ))}
      </ul>
      <div className="acq-facts">
        <div>
          <span><UiText>{"Total fee"}</UiText></span>
          <strong className="acq-price">
            {version.price ? money(version.price) : "To confirm"}
          </strong>
        </div>
        <div>
          <span>Deposit · {n(terms.deposit_basis_points) / 100}%</span>
          <strong>
            {version.price && version.terms
              ? money({ ...price, amount_minor: deposit })
              : "To confirm"}
          </strong>
        </div>
        <div>
          <span><UiText>{"Delivery"}</UiText></span>
          <strong>
            {terms.delivery_business_days
              ? `${n(terms.delivery_business_days)} business days`
              : "To confirm"}
          </strong>
        </div>
      </div>
      {(proposedStart || proposedDue) && (
        <div className="acq-term-note">
          <strong>Proposed schedule · Asia/Jakarta</strong>
          <p>
            Start: {scheduleDate(proposedStart)}
            <br />
            Due: {scheduleDate(proposedDue)}
          </p>
          {(previousStart || previousDue) && (
            <p className="muted">
              Previously committed: {scheduleDate(previousStart)} to{" "}
              {scheduleDate(previousDue)}.
            </p>
          )}
          <p>
            This exact schedule is part of the amendment review. It becomes
            committed after buyer acceptance and the project prerequisites are
            satisfied.
          </p>
        </div>
      )}
      <p>{s(version.buyer_note)}</p>
      <div className="acq-term-note">
        <strong><UiText>{"When the work begins"}</UiText></strong>
        <p>
          {s(
            terms.acceptance_disclosure,
            "Delivery and start conditions will be agreed before this offer is approved.",
          )}
        </p>
        {a<string>(terms.required_input_keys).length > 0 && (
          <p>
            Required inputs:{" "}
            {a<string>(terms.required_input_keys).map(label).join(", ")}.
          </p>
        )}
        <p>
          {s(terms.timezone, "Asia/Jakarta")} ·{" "}
          {version.expires_at
            ? `Offer expires ${date(version.expires_at)}`
            : "Expiry to confirm"}
        </p>
      </div>
    </div>
  );
}

function OfferEditor({
  offer,
  opportunityId,
  onClose,
}: {
  offer?: Entity;
  opportunityId?: string;
  onClose: () => void;
}) {
  const { record, rows, command, state } = useStore();
  const router = useRouter();
  const current = record("offer_versions", s(offer?.current_version_id));
  const opportunity = record(
    "opportunities",
    opportunityId || s(offer?.opportunity_id),
  );
  const terms = o(current?.terms),
    price = o(current?.price),
    policy = rows("policies")[0];
  const businessTimezone = s(terms.timezone, s(policy?.timezone, "Asia/Jakarta"));
  const workingEnd = s(terms.due_local_time, s(policy?.due_local_time, "17:00"));
  const initial = {
    opportunity_id: s(opportunity?.id),
    client_id: s(offer?.client_id, s(opportunity?.client_id)),
    title: s(current?.title, s(opportunity?.title)),
    deliverables: a<Record<string, unknown>>(current?.deliverables)
      .map(
        (d) =>
          `${n(d.quantity, 1) > 1 ? `${n(d.quantity)} × ` : ""}${s(d.label)}`,
      )
      .join("\n"),
    amount: priceString(current?.price),
    currency: s(price.currency, "USD"),
    deposit: String(
      n(terms.deposit_basis_points, n(policy?.deposit_basis_points, 6000)) /
        100,
    ),
    days: terms.delivery_business_days
      ? String(terms.delivery_business_days)
      : "",
    inputs: a<string>(terms.required_input_keys).join("\n"),
    buyer_note: s(current?.buyer_note),
    notes: s(current?.internal_notes),
    effort: current?.estimated_effort_minutes
      ? String(current.estimated_effort_minutes)
      : "",
    expires: s(current?.expires_at).slice(0, 10),
    reason: "",
  };
  const [form, setForm] = useState(initial),
    [error, setError] = useState("");
  const [expectedVersion] = useState(offer?.version);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const change = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  const amount = minor(form.amount, form.currency),
    depositBp = minor(form.deposit, "USD");
  const amendment =
    !!offer?.accepted_version_id &&
    offer.accepted_version_id === offer.current_version_id;
  async function save(e: FormEvent, review = false) {
    e.preventDefault();
    if (savingRef.current) return;
    if (
      !form.client_id ||
      !form.opportunity_id ||
      !form.title.trim() ||
      !lines(form.deliverables).length
    )
      return setError(
        "Choose a client and linked opportunity, then add a title and at least one deliverable.",
      );
    if (form.amount && (amount === null || amount <= 0))
      return setError("Enter a positive exact price in the selected currency.");
    if (depositBp === null || depositBp > 10000)
      return setError("Deposit must be between 0 and 100 percent.");
    if (form.days && (!/^\d+$/.test(form.days) || +form.days < 1))
      return setError("Delivery must be a positive number of business days.");
    if (form.effort && (!/^\d+$/.test(form.effort) || +form.effort < 1))
      return setError("Effort must be a positive whole number of minutes.");
    if (
      form.expires &&
      new Date(zonedDateTime(form.expires, workingEnd, businessTimezone)) <= new Date(state.sample_clock)
    )
      return setError("Choose an expiry after the current workspace date.");
    if (amendment && !form.reason.trim())
      return setError(
        "Explain the proposed change before saving an amendment.",
      );
    if (review && (!amount || !form.days || !form.expires))
      return setError(
        "Price, delivery duration and expiry are required for review. You can save an incomplete draft.",
      );
    const values = {
      client_id: form.client_id,
      opportunity_id: form.opportunity_id || null,
      title: form.title,
      deliverables: lines(form.deliverables).map((text, i) => {
        const match = text.match(/^(\d+)\s*[x×]\s*(.+)$/i);
        return {
          key: `item_${i + 1}`,
          label: match ? match[2] : text,
          quantity: match ? +match[1] : 1,
        };
      }),
      price:
        amount === null
          ? null
          : {
              amount_minor: amount,
              currency: form.currency,
              scale: form.currency === "IDR" ? 0 : 2,
            },
      terms: form.days
        ? {
            ...terms,
            delivery_business_days: +form.days,
            deposit_basis_points: depositBp,
            reservation_hours: n(terms.reservation_hours, n(policy?.reservation_hours, 48)),
            start_basis:
              "next_business_day_after_confirmed_deposit_and_required_inputs",
            timezone: businessTimezone,
            workdays: terms.workdays || policy?.business_weekdays || [0, 1, 2, 3, 4],
            holidays: terms.holidays || policy?.holiday_dates || [],
            start_local_time: s(terms.start_local_time, s(policy?.start_local_time, "09:00")),
            due_local_time: workingEnd,
            required_input_keys: lines(form.inputs),
            acceptance_disclosure: `Acceptance creates a provisional reservation for ${n(terms.reservation_hours, n(policy?.reservation_hours, 48))} elapsed hours. Confirmed deposit and required inputs commit a start on the next business day. Delivery is due at ${workingEnd} ${businessTimezone} on business day ${form.days}, counting that start day as day one. Late prerequisites require rescheduling.`,
          }
        : null,
      buyer_note: form.buyer_note,
      internal_notes: form.notes,
      estimated_effort_minutes: form.effort ? +form.effort : null,
      expires_at: form.expires ? zonedDateTime(form.expires, workingEnd, businessTimezone) : null,
      amendment_reason: form.reason,
      assessment_ids: a(current?.assessment_ids),
    };
    savingRef.current = true;
    setSaving(true);
    try {
    const result = (await command(amendment ? "offer.amend" : "offer.saveDraft", {
      id: offer?.id,
      expected_version: expectedVersion,
      values,
      submit_for_review: review,
    }));
    if (!result.ok) return setError(result.message);
    onClose();
    router.push(`/app/offers/${result.id || offer?.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The offer could not be saved. Your draft is still here.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  return (
    <FormClose dirty={dirty} onClose={onClose} pending={saving}>
      {(close) => (
        <Modal
          title={
            amendment
              ? "Propose an amendment"
              : offer
                ? "Edit offer · new version"
                : "Create an offer"
          }
          onClose={close}
          closeDisabled={saving}
        >
          <Form className="stack" noValidate onSubmit={save}>
            <fieldset className="acq-pending-fields" disabled={saving}>
            <Notice text={error} />
            {amendment && (
              <p className="acq-term-note">
                The accepted agreement remains in force until the buyer accepts
                this separately reviewed amendment. Existing payment and
                delivery history will remain intact.
              </p>
            )}
            <div className="grid2">
              <Field label="Client">
                <select
                  value={form.client_id}
                  disabled={!!offer}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      client_id: e.target.value,
                      opportunity_id: "",
                    }))
                  }
                >
                  <option value=""><UiText>{"Choose a client"}</UiText></option>
                  {rows("clients").map((c) => (
                    <option key={c.id} value={c.id}>
                      {s(c.name)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Linked opportunity">
                <select
                  value={form.opportunity_id}
                  disabled={!!offer}
                  onChange={(e) => {
                    const lead = record("opportunities", e.target.value);
                    setForm((f) => ({
                      ...f,
                      opportunity_id: e.target.value,
                      client_id: s(lead?.client_id, f.client_id),
                    }));
                  }}
                >
                  <option value=""><UiText>{"Choose an opportunity"}</UiText></option>
                  {rows("opportunities")
                    .filter(
                      (x) => !form.client_id || x.client_id === form.client_id,
                    )
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {s(x.title)}
                      </option>
                    ))}
                </select>
              </Field>
            </div>
            <Field label="Offer title">
              <input
                value={form.title}
                maxLength={180}
                required
                onChange={(e) => change("title", e.target.value)}
              />
            </Field>
            <Field label="Deliverables · one per line, optional quantity × description">
              <textarea
                className="resize-none"
                rows={4}
                required
                value={form.deliverables}
                onChange={(e) => change("deliverables", e.target.value)}
              />
            </Field>
            <div className="grid3">
              <Field label="Total price">
                <input
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => change("amount", e.target.value)}
                />
              </Field>
              <Field label="Currency">
                <select
                  value={form.currency}
                  onChange={(e) => change("currency", e.target.value)}
                >
                  <option>USD</option>
                  <option>IDR</option>
                </select>
              </Field>
              <Field label="Deposit percentage">
                <input
                  inputMode="decimal"
                  value={form.deposit}
                  onChange={(e) => change("deposit", e.target.value)}
                />
              </Field>
            </div>
            {amount !== null && depositBp !== null && depositBp <= 10000 && (
              <p className="acq-term-note"><UiText>{"Deposit"}</UiText>{" "}
                {money({
                  amount_minor: installment(amount, depositBp),
                  currency: form.currency,
                })}{" "}
                · Balance{" "}
                {money({
                  amount_minor: amount - installment(amount, depositBp),
                  currency: form.currency,
                })}
                . Installments round half up to the smallest currency unit.
              </p>
            )}
            <div className="grid2">
              <Field label="Delivery business days">
                <input
                  inputMode="numeric"
                  value={form.days}
                  onChange={(e) => change("days", e.target.value)}
                />
              </Field>
              <Field label="Offer expires on">
                <input
                  type="date"
                  value={form.expires}
                  onChange={(e) => change("expires", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Required client inputs · one per line">
              <textarea
                className="resize-none"
                rows={2}
                value={form.inputs}
                onChange={(e) => change("inputs", e.target.value)}
              />
            </Field>
            <p className="muted">
              The next business day after confirmed deposit and required inputs
              is day one. Working days are Monday–Friday, Asia/Jakarta; due time
              17:00. This draft does not reserve dates.
            </p>
            <Field label="Buyer message and terms">
              <textarea
                className="resize-none"
                rows={3}
                value={form.buyer_note}
                onChange={(e) => change("buyer_note", e.target.value)}
              />
            </Field>
            {amendment && (
              <Field label="Amendment reason and effects on existing payments / dates">
                <textarea
                  className="resize-none"
                  required
                  rows={3}
                  value={form.reason}
                  onChange={(e) => change("reason", e.target.value)}
                />
              </Field>
            )}
            <details>
              <summary><UiText>{"Owner-private planning"}</UiText></summary>
              <div className="stack">
                <Field label="Estimated owner effort in minutes">
                  <input
                    inputMode="numeric"
                    value={form.effort}
                    onChange={(e) => change("effort", e.target.value)}
                  />
                </Field>
                <Field label="Internal notes · never shown to the buyer">
                  <textarea
                    className="resize-none"
                    value={form.notes}
                    onChange={(e) => change("notes", e.target.value)}
                  />
                </Field>
              </div>
            </details>
            <div className="actions">
              <Button type="submit" pending={saving} pendingLabel="Saving draft…">{"Save draft"}</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={async (e) => (await save(e, true))}
              >
                {amendment
                  ? "Submit amendment for review"
                  : "Submit for review"}
              </Button>
              <Button type="button" variant="secondary" onClick={close}>{"Cancel edits"}
              </Button>
            </div>
            </fieldset>
          </Form>
        </Modal>
      )}
    </FormClose>
  );
}

function OfferDetail({ id }: { id: string }) {
  const { record, rows, command, notify, state, connected } = useStore();
  const { search, set } = useQuery();
  const offer = record("offers", id);
  const [acting, setActing] = useState(false);
  const actionRef = useRef(false);
  const [error, setError] = useState(""),
    [destination, setDestination] = useState(""),
    [revision, setRevision] = useState(""),
    [confirm, setConfirm] = useState(""),
    [fallback, setFallback] = useState("");
  if (!offer) return <Unknown kind="Offer" />;
  const versions = rows("offer_versions")
    .filter((v) => v.offer_id === id)
    .sort((x, y) => n(y.revision) - n(x.revision));
  const current = record("offer_versions", s(offer.current_version_id));
  const requestedVersion = search.get("version");
  const version = requestedVersion
    ? versions.find((v) => v.id === requestedVersion)
    : current;
  if (!version || !current) return <Unknown kind="Offer version" />;
  const client = record("clients", s(offer.client_id)),
    contacts = rows("contacts").filter((x) => x.client_id === offer.client_id),
    engagement = rows("engagements").find(
      (x) =>
        x.offer_id === id &&
        (!offer.shared_version_id ||
          rows("share_records").some(
            (sh) =>
              sh.offer_version_id === offer.shared_version_id &&
              sh.contact_id === x.contact_id,
          )),
    ),
    project = rows("projects").find(
      (x) =>
        x.offer_version_id === offer.accepted_version_id ||
        x.accepted_offer_version_id === offer.accepted_version_id ||
        x.opportunity_id === offer.opportunity_id,
    ),
    historical = version.id !== current.id,
    expired =
      !!version.expires_at &&
      new Date(s(version.expires_at)) <= new Date(state.sample_clock) &&
      version.state !== "accepted";
  const activeStatus = expired ? "expired" : s(offer.status);
  const currentApproval = rows("approvals").find(
    (x) => o(x.subject_ref).id === current.id && x.state === "current",
  );
  const selectedDestination =
    destination ||
    s(currentApproval?.destination_contact_id, s(contacts[0]?.id));
  const dest = record("contacts", selectedDestination);
  const compare = versions.find((v) => v.id === search.get("compare"));
  const buyerGrant = engagement
    ? rows("buyer_grants").find(
        (g) =>
          g.engagement_id === engagement.id &&
          g.contact_id === engagement.contact_id &&
          g.state === "active" &&
          new Date(s(g.expires_at)) > new Date(state.sample_clock),
      )
    : undefined;
  const buyerHref =
    engagement && buyerGrant
      ? `/buyer/${engagement.id}/offer?grant=${encodeURIComponent(buyerGrant.id)}&version=${encodeURIComponent(s(offer.shared_version_id, s(offer.accepted_version_id)))}`
      : "";
  const run = async (type: string, values: Input = {}) => {
    if (actionRef.current) return { ok: false, message: "Wait for the current offer action to finish." };
    actionRef.current = true;
    setActing(true);
    try {
    const result = (await command(type, {
      id,
      expected_version: offer.version,
      offer_version_id: current.id,
      destination_contact_id: selectedDestination,
      ...values,
    }));
    if (!result.ok) setError(result.message);
    else {
      setError("");
      notify(result.message);
    }
    return result;
    } finally { actionRef.current = false; setActing(false); }
  };
  const pdf = () => {
    const terms = o(version.terms),
      price = o(version.price);
    downloadPdf(
      `Crewmori_Offer_v${n(version.revision)}.pdf`,
      `${connected ? "Offer" : "Sample offer"} — ${s(version.title)}`,
      [
        `Prepared by ${s(rows("profiles")[0]?.public_name, s(rows("owners")[0]?.name, "Freelancer"))}`,
        `Prepared for ${s(client?.name)}`,
        `Version ${n(version.revision)}`,
        ...a<Record<string, unknown>>(version.deliverables).map(
          (x) => `${n(x.quantity, 1)} × ${s(x.label)}`,
        ),
        `Total: ${money(price)}`,
        `Deposit: ${n(terms.deposit_basis_points) / 100}%`,
        `Delivery: ${n(terms.delivery_business_days)} business days`,
        s(terms.acceptance_disclosure),
        `Required inputs: ${a<string>(terms.required_input_keys).map(label).join(", ")}`,
        `Timezone: ${s(terms.timezone, "Asia/Jakarta")}`,
        `Expires: ${date(version.expires_at)}`,
        s(version.buyer_note),
      ],
    );
    notify("Buyer-safe offer PDF generated.");
  };
  const copyInvitation = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      notify("Buyer invitation copied. Share it with the intended buyer.");
    } catch {
      notify("Select and copy the invitation below.");
    }
  };
  const createInvitation = async () => {
    if (!connected || !engagement) return;
    setError("");
    try {
      const response = await new BackendClient().request<{ url: string }>("/api/buyer/invitations", { engagementId: engagement.id });
      // Invitation credentials remain in component memory only. Copying this URL again must never rotate access.
      setFallback(response.url);
      setConfirm("");
      await copyInvitation(response.url);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Invitation could not be created. Check the connection before trying again.");
      setConfirm("");
    }
  };
  const copyLink = async () => {
    if (connected) {
      if (fallback) await copyInvitation(fallback);
      else setConfirm("invitation");
      return;
    }
    if (!buyerHref) {
      setError("The buyer invitation is missing or expired. Prepare a fresh eligible share.");
      return;
    }
    const url = `${window.location.origin}${buyerHref}`;
    setFallback(url);
    await copyInvitation(url);
  };
  return (
    <>
      <fieldset className="acq-pending-fields" disabled={acting}>
      <Link
        className="acq-back"
        href={`/app/offers${search.get("return") ? `?${search.get("return")}` : ""}`}
      >
        ← All offers
      </Link>
      <PageHead
        title={s(client?.name, "Offer")}
        description={`${s(version.title)} · Version ${n(version.revision)}`}
        action={<Status value={historical ? version.state : activeStatus} />}
      />
      <Notice text={error} />
      {version.buyer_requested_changes || version.return_instruction ? (
        <div className="acq-banner">
          <strong>
            {version.buyer_requested_changes
              ? "Buyer requested changes"
              : "Revision requested"}
          </strong>
          <p>
            {s(version.buyer_requested_changes, s(version.return_instruction))}
          </p>
        </div>
      ) : null}
      {historical && (
        <div className="acq-banner">
          You are viewing a read-only historical version.{" "}
          <Button
            variant="secondary"
            onClick={() => set({ version: null, compare: null })}
          >{"Return to current version"}
          </Button>
        </div>
      )}
      {expired && (
        <div className="acq-banner">
          This offer has expired. Create a revised draft with a new expiry
          before review and sharing.
        </div>
      )}
      <div className="acq-detail">
        <Panel>
          <OfferTerms version={version} />
        </Panel>
        <Panel>
          <span className="eyebrow"><UiText>{"Your decision"}</UiText></span>
          <h2>
            {activeStatus === "awaiting_review"
              ? "Ready for your review"
              : activeStatus === "approved"
                ? "Ready to share"
                : activeStatus === "shared"
                  ? "With the buyer"
                  : activeStatus === "accepted"
                    ? "An agreement, in place"
                    : "Shape the next step"}
          </h2>
          <p className="muted">
            {activeStatus === "awaiting_review"
              ? "Your crew has prepared the terms. Check the exact version and destination before approving."
              : activeStatus === "approved"
                ? connected ? "Approval is saved. Preview the buyer’s document and share the reviewed terms." : "Approval is saved. Preview the buyer’s document and deliberately share it in the sample."
                : activeStatus === "shared"
                  ? connected ? "This exact offer is available to the buyer. Acceptance, payment, and delivery remain separate steps." : "This exact offer has been shared in the sample. Acceptance, payment, and delivery remain separate steps."
                  : activeStatus === "accepted"
                    ? "Accepted terms are preserved. Any change needs a separately reviewed amendment."
                    : "Save your scope, price, and timing. Only complete, current terms can be approved."}
          </p>
          <div className="stack">
            {!historical && activeStatus === "awaiting_review" && (
              <Button onClick={() => set({ review: "1" })}>{"Review & approve"}
              </Button>
            )}
            {!historical && activeStatus === "draft" && (
              <Button onClick={async () => (await run("offer.requestReview"))}>{"Submit for review"}
              </Button>
            )}
            {!historical && activeStatus === "approved" && (
              <Button onClick={() => set({ preview: "1" })}>{"Preview & share"}
              </Button>
            )}
            {!historical &&
              ["shared", "accepted"].includes(activeStatus) &&
              buyerHref && (
                <LinkButton href={buyerHref}>{"Open buyer offer"}</LinkButton>
              )}
            {!historical && (
              <Button variant="secondary" onClick={() => set({ edit: "1" })}>
                {activeStatus === "accepted"
                  ? "Propose amendment"
                  : ["withdrawn", "expired"].includes(activeStatus)
                    ? "Create revised draft"
                    : "Edit offer"}
              </Button>
            )}
            {["approved", "shared", "accepted"].includes(s(version.state)) && (
              <Button variant="secondary" onClick={pdf}>{"Download offer PDF"}
              </Button>
            )}
            {!historical && ["shared", "accepted"].includes(activeStatus) && (
              <Button variant="secondary" onClick={copyLink}>
                {connected ? fallback ? "Copy current invitation" : buyerInvitationIntent.label : "Copy buyer link"}
              </Button>
            )}
            {!historical &&
              !["accepted", "withdrawn", "expired"].includes(activeStatus) && (
                <Button variant="danger" onClick={() => setConfirm("withdraw")}>{"Withdraw offer"}
                </Button>
              )}
          </div>
          {fallback && (
            <div className="acq-invitation" role="region" aria-label="Buyer invitation">
              <p role="status">{connected ? "New invitation ready. Earlier links and buyer sessions have been revoked. This single-use link expires in two days." : "Buyer link ready to share."}</p>
              <Field label="Select and copy this invitation" help="Share privately with the intended buyer. Anyone holding this link can open the client space.">
                <input readOnly value={fallback} onFocus={(e) => e.target.select()} />
              </Field>
              {connected && <Button variant="ghost" onClick={() => setConfirm("invitation")}>{"Replace this invitation"}</Button>}
            </div>
          )}
          <div className="acq-small-links">
            <Link href={`/app/clients/${offer.client_id}`}><UiText>{"Open client →"}</UiText></Link>
            {!!offer.opportunity_id && (
              <Link href={`/app/opportunities/${offer.opportunity_id}`}>
                Original request →
              </Link>
            )}
            {!!offer.accepted_version_id && project && (
              <Link href={`/app/projects/${project.id}`}><UiText>{"Open project →"}</UiText></Link>
            )}
          </div>
        </Panel>
      </div>
      <Panel>
        <div className="actions">
          <Button
            variant="secondary"
            onClick={() => set({ panel: "evidence" })}
          >{"Why this offer?"}
          </Button>
          <Button variant="secondary" onClick={() => set({ panel: "history" })}>{"Version history"}
          </Button>
        </div>
        {s(version.internal_notes) && (
          <details>
            <summary><UiText>{"Internal notes · owner only"}</UiText></summary>
            <p>{s(version.internal_notes)}</p>
          </details>
        )}
      </Panel>
      {search.get("edit") === "1" && !historical && (
        <OfferEditor offer={offer} onClose={() => set({ edit: null })} />
      )}
      {search.get("panel") === "history" && (
        <Modal
          title="Offer version history"
          onClose={() => set({ panel: null })}
        >
          <div className="stack">
            {versions.map((v) => (
              <div className="list-row" key={v.id}>
                <div>
                  <strong><UiText>{"Version"}</UiText> {n(v.revision)} · {s(v.title)}
                  </strong>
                  <p className="muted">
                    {date(v.created_at)} ·{" "}
                    {v.price ? money(v.price) : "Price to confirm"} ·{" "}
                    {label(v.state)}
                  </p>
                  {v.id === offer.accepted_version_id && (
                    <Badge>Accepted · immutable</Badge>
                  )}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => set({ version: v.id, panel: null })}
                >{"View version"}
                </Button>
              </div>
            ))}
            <Field label="Compare current version with">
              <select
                value={search.get("compare") || ""}
                onChange={(e) => set({ compare: e.target.value })}
              >
                <option value=""><UiText>{"Choose a previous version"}</UiText></option>
                {versions
                  .filter((v) => v.id !== current.id)
                  .map((v) => (
                    <option key={v.id} value={v.id}><UiText>{"Version"}</UiText> {n(v.revision)}
                    </option>
                  ))}
              </select>
            </Field>
            {compare && <VersionComparison first={compare} second={current} />}
            {search.get("compare") && !compare && (
              <Notice text="That comparison version is unavailable for this offer." />
            )}
          </div>
        </Modal>
      )}
      {search.get("panel") === "evidence" && (
        <Modal title="Why this offer?" onClose={() => set({ panel: null })}>
          <div className="stack">
            {a<string>(version.assessment_ids)
              .map((aid) => record("assessments", aid))
              .filter((x): x is Entity => !!x)
              .map((item) => (
                <div className="acq-assessment" key={item.id}>
                  <div className="row">
                    <h3>{label(item.role_id)}</h3>
                    <Status value={item.status} />
                  </div>
                  <p>{s(item.summary)}</p>
                  {a<string>(item.assumptions).length > 0 && (
                    <p className="muted">
                      Assumptions: {a<string>(item.assumptions).join("; ")}.
                    </p>
                  )}
                  {a<string>(item.unknowns).length > 0 && (
                    <p className="muted">
                      Unknown: {a<string>(item.unknowns).join("; ")}.
                    </p>
                  )}
                  <Link href={`/app/team?task=${s(item.run_id)}`}>
                    Inspect task and source →
                  </Link>
                </div>
              ))}
            {!a(version.assessment_ids).length && (
              <Empty
                title="Assessment needed"
                description="This offer has no linked assessment yet. Review the request and ask the crew to check its requirements."
              />
            )}
          </div>
        </Modal>
      )}
      {search.get("review") === "1" && (
        <Modal
          title={`Review version ${n(current.revision)}`}
          onClose={() => set({ review: null })}
        >
          <div className="stack">
            <Notice text={error} />
            <OfferTerms version={current} buyer />
            <Field label="Buyer destination">
              <select
                value={selectedDestination}
                onChange={(e) => setDestination(e.target.value)}
              >
                {contacts.map((c) => (
                  <option value={c.id} key={c.id}>
                    {s(c.name, s(c.display_name))} · {s(c.email)}
                  </option>
                ))}
              </select>
            </Field>
            <p className="muted">
              Buyer link · approval is bound to this exact version and selected recipient.
            </p>
            <div className="actions">
              <Button
                disabled={!selectedDestination || expired}
                onClick={async () => {
                  if ((await run("offer.approve")).ok) set({ review: null });
                }}
              >{"Approve exact version"}
              </Button>
              <Button variant="secondary" onClick={() => set({ review: null })}>{"Cancel review"}
              </Button>
            </div>
            <details>
              <summary><UiText>{"Return for revision"}</UiText></summary>
              <div className="stack">
                <Field label="Revision instruction">
                  <textarea
                    className="resize-none"
                    value={revision}
                    onChange={(e) => setRevision(e.target.value)}
                    rows={3}
                  />
                </Field>
                <Button
                  disabled={!revision.trim()}
                  variant="secondary"
                  onClick={async () => {
                    if (
                      (await run("offer.returnRevision", {
                        reason: revision,
                        instruction: revision,
                      })).ok
                    )
                      set({ review: null });
                  }}
                >{"Request revision"}
                </Button>
              </div>
            </details>
          </div>
        </Modal>
      )}
      {search.get("preview") === "1" && (
        <Modal
          title="Buyer-safe offer preview"
          onClose={() => set({ preview: null })}
        >
          <div className="stack">
            <Notice text={error} />
            <p className="muted">
              Prepared for{" "}
              {s(dest?.name, s(dest?.display_name, s(client?.name)))} ·{" "}
              {s(dest?.email)}
            </p>
            <OfferTerms version={current} buyer />
            <div className="actions">
              <Button
                disabled={activeStatus !== "approved"}
                onClick={async () => {
                  if ((await run("offer.share", { channel: "sample_link" })).ok)
                    set({ preview: null });
                }}
              >
                {connected ? "Share offer with buyer" : "Share offer in sample"}
              </Button>
              <Button variant="secondary" onClick={pdf}>{"Download offer PDF"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => set({ preview: null, review: "1" })}
              >{"Change destination"}
              </Button>
            </div>
            <p className="muted">
              {connected ? "This makes the reviewed terms available in the buyer portal. Create a buyer invitation to give the buyer access." : "This records a sample share. No real email or external message is sent."}
            </p>
          </div>
        </Modal>
      )}
      {confirm === "invitation" && (
        <Confirm
          title={buyerInvitationIntent.title}
          description={buyerInvitationIntent.description}
          confirmLabel={buyerInvitationIntent.confirm}
          danger
          onClose={() => setConfirm("")}
          onConfirm={createInvitation}
        />
      )}
      {confirm === "withdraw" && (
        <Confirm
          title={`Withdraw version ${n(current.revision)}?`}
          description={`${s(current.title)} will no longer be available for buyer acceptance. Its terms and history remain saved. A revised offer will need fresh review and sharing.`}
          onClose={() => setConfirm("")}
          onConfirm={async () => {
            if ((await run("offer.withdraw")).ok) setConfirm("");
          }}
        />
      )}
      </fieldset>
    </>
  );
}

function VersionComparison({
  first,
  second,
}: {
  first: Entity;
  second: Entity;
}) {
  const comparison = [
    [
      "Scope",
      a<Record<string, unknown>>(first.deliverables)
        .map((x) => s(x.label))
        .join(", "),
      a<Record<string, unknown>>(second.deliverables)
        .map((x) => s(x.label))
        .join(", "),
    ],
    [
      "Price",
      first.price ? money(first.price) : "Unknown",
      second.price ? money(second.price) : "Unknown",
    ],
    [
      "Deposit",
      `${n(o(first.terms).deposit_basis_points) / 100}%`,
      `${n(o(second.terms).deposit_basis_points) / 100}%`,
    ],
    [
      "Delivery",
      `${n(o(first.terms).delivery_business_days)} business days`,
      `${n(o(second.terms).delivery_business_days)} business days`,
    ],
    ["Buyer note", s(first.buyer_note), s(second.buyer_note)],
    ["Expiry", date(first.expires_at), date(second.expires_at)],
  ];
  return (
    <div className="acq-compare">
      <table>
        <caption><UiText>{"Version"}</UiText> {n(first.revision)} compared with version {n(second.revision)}
        </caption>
        <thead>
          <tr>
            <th><UiText>{"Term"}</UiText></th>
            <th><UiText>{"Previous"}</UiText></th>
            <th><UiText>{"Current"}</UiText></th>
          </tr>
        </thead>
        <tbody>
          {comparison.map(([title, before, after]) => (
            <tr key={title}>
              <th>{title}</th>
              <td>{before}</td>
              <td>{before === after ? after : <strong>{after}</strong>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PromotionList() {
  const { rows, record } = useStore();
  const { search, set } = useQuery();
  const q = search.get("q") || "",
    status = search.get("status") || "",
    channel = search.get("channel") || "";
  const all = rows("promotions"),
    selected = search.get("draft");
  const filtered = all
    .filter((p) => {
      const savedStatus = p.archived ? "archived" : s(p.status);
      const version = record("promotion_versions", s(p.current_version_id));
      return (
        (status ? savedStatus === status : !p.archived) &&
        (!channel || version?.destination === channel) &&
        `${s(version?.content)} ${s(record("services", s(p.service_id))?.title)} ${s(version?.destination)}`
          .toLowerCase()
          .includes(q.toLowerCase())
      );
    })
    .sort(
      (x, y) =>
        s(y.updated_at).localeCompare(s(x.updated_at)) ||
        x.id.localeCompare(y.id),
    );
  return (
    <>
      <PageHead
        title="Put your good work out there."
        description="Thoughtful promotion, grounded in what you actually offer."
        action={
          <Button onClick={() => set({ draft: "new" })}>{"New promotion"}</Button>
        }
      />
      <div className="acq-toolbar">
        <SearchBar
          value={q}
          onChange={(v) => set({ q: v, page: null })}
          placeholder="Search drafts"
        />
        <Choice
          label="Status"
          value={status}
          options={[
            "draft",
            "awaiting_review",
            "approved",
            "ready_to_share",
            "published_confirmed",
            "paused",
            "archived",
          ]}
          onChange={(v) => set({ status: v, page: null })}
        />
        <Choice
          label="Channel"
          value={channel}
          options={[
            ...new Set(rows("promotion_versions").map((x) => s(x.destination))),
          ]}
          onChange={(v) => set({ channel: v })}
        />
        <Button
          variant="ghost"
          onClick={() => set({ q: null, status: null, channel: null })}
        >{"Clear filters"}
        </Button>
      </div>
      <p className="muted promotion-list-count" aria-live="polite">
        {filtered.length} promotion{filtered.length === 1 ? "" : "s"}
      </p>
      {filtered.length ? (
        <div className="grid2 promotion-list">
          {filtered.map((p) => {
            const version = record(
              "promotion_versions",
              s(p.current_version_id),
            );
            return (
              <Panel className="promotion-draft" key={p.id}>
                <div className="row acq-section-head">
                  <span className="eyebrow">{label(version?.destination)}</span>
                  <Status value={p.archived ? "archived" : p.status} />
                </div>
                <h2>
                  {s(record("services", s(p.service_id))?.title, "Promotion")}
                </h2>
                <p className="acq-promo-copy">{s(version?.content)}</p>
                <div className="row acq-section-head">
                  <span className="muted"><UiText>{"Version"}</UiText> {n(version?.revision)}</span>
                  <Button variant="ghost" onClick={() => set({ draft: p.id })}>{"Open draft →"}
                  </Button>
                </div>
              </Panel>
            );
          })}
        </div>
      ) : (
        <Empty
          title={
            all.length
              ? "No drafts match this view"
              : "Tell people what you can do"
          }
          description="Start with an approved service, shape a short message, and choose where it belongs."
        >
          <Button onClick={() => set({ draft: "new" })}>{"New promotion"}</Button>
        </Empty>
      )}
      {selected &&
        (selected === "new" || record("promotions", selected) ? (
          <PromotionEditor
            key={selected}
            promotion={
              selected === "new" ? undefined : record("promotions", selected)
            }
            onClose={() => set({ draft: null })}
          />
        ) : (
          <Modal
            title="Promotion unavailable"
            onClose={() => set({ draft: null })}
          >
            <Unknown kind="Promotion" />
          </Modal>
        ))}
    </>
  );
}

function PromotionEditor({
  promotion,
  onClose,
}: {
  promotion?: Entity;
  onClose: () => void;
}) {
  const { rows, record, command, notify, state, connected } = useStore();
  const publicationTimezone = s(rows("policies")[0]?.timezone, "Asia/Jakarta");
  const [expectedVersion, setExpectedVersion] = useState(promotion?.version);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const current = record(
    "promotion_versions",
    s(promotion?.current_version_id),
  );
  const initial = {
    service_id: s(promotion?.service_id),
    content: s(current?.content),
    destination: s(current?.destination, "sample_professional_network"),
    audience: s(current?.target_audience, "Prospective clients"),
    url: s(current?.destination_url),
  };
  const [form, setForm] = useState(initial),
    [error, setError] = useState(""),
    [mode, setMode] = useState(""),
    [evidence, setEvidence] = useState(""),
    [publishedAt, setPublishedAt] = useState(
      localDateTime(s(state.sample_clock), publicationTimezone).slice(0, 10),
    ),
    [copyFallback, setCopyFallback] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const activeStatus = promotion?.archived
    ? "archived"
    : s(promotion?.status, "draft");
  const approved =
    ["approved", "ready_to_share", "published_confirmed"].includes(
      activeStatus,
    ) && !dirty;
  const field = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  const act = async (type: string, values: Input = {}) => {
    if (savingRef.current) return { ok: false, message: "Wait for the current action to finish." };
    savingRef.current = true;
    setSaving(true);
    try {
    const result = (await command(type, {
      id: promotion?.id,
      expected_version: expectedVersion,
      destination: form.destination,
      ...values,
    }));
    if (!result.ok) setError(result.message);
    else {
      setError("");
      setExpectedVersion((v) => (v === undefined ? v : v + 1));
      notify(result.message);
    }
    return result;
    } finally { savingRef.current = false; setSaving(false); }
  };
  async function save(e?: FormEvent) {
    e?.preventDefault();
    const service = record("services", form.service_id);
    if (!service || !b(service.published))
      return setError(
        "Select a published service as the source of your claims.",
      );
    if (!form.content.trim())
      return setError("Write the promotion text before saving.");
    if (form.url && !safeUrl(form.url))
      return setError("Use a safe http or https destination URL.");
    const result = (await act("promotion.saveDraft", {
      values: {
        ...form,
        destination_url: form.url,
        target_audience: form.audience,
        public_claim_refs: [
          { table: "services", id: service.id, version: service.version },
        ],
      },
    }));
    if (result.ok) {
      setMode("");
      onClose();
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(s(current?.content));
      notify("Approved text copied. Publication is not recorded.");
    } catch {
      setCopyFallback(true);
    }
  }
  return (
    <FormClose dirty={dirty} onClose={onClose} pending={saving}>
      {(close) => (
        <Modal
          title={promotion ? "Promotion draft" : "Create a promotion"}
          onClose={close}
          closeDisabled={saving}
        >
          <div className="stack">
            <Notice text={error} />
            {promotion && (
              <div className="row">
                <Badge>{"Version"} {n(current?.revision)}</Badge>
                <Status value={activeStatus} />
              </div>
            )}
            <Form noValidate onSubmit={save} className="stack"><fieldset className="acq-pending-fields" disabled={saving}>
              <Field label="Approved service">
                <select
                  value={form.service_id}
                  onChange={(e) => field("service_id", e.target.value)}
                >
                  <option value=""><UiText>{"Choose a published service"}</UiText></option>
                  {rows("services")
                    .filter((x) => b(x.published))
                    .map((x) => (
                      <option value={x.id} key={x.id}>
                        {s(x.title)}
                      </option>
                    ))}
                </select>
              </Field>
              <div className="grid2">
                <Field label="Channel and destination">
                  <select
                    value={form.destination}
                    onChange={(e) => field("destination", e.target.value)}
                  >
                    <option value="sample_professional_network"><UiText>{connected ? "Professional network (manual publication)" : "Sample professional network"}</UiText>
                    </option>
                    <option value="sample_public_profile"><UiText>{connected ? "Public profile (manual publication)" : "Sample public profile"}</UiText>
                    </option>
                    <option value="sample_email_draft"><UiText>{connected ? "Email draft (manual delivery)" : "Sample email draft"}</UiText>
                    </option>
                  </select>
                </Field>
                <Field label="Audience">
                  <input
                    value={form.audience}
                    onChange={(e) => field("audience", e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Destination URL (optional)">
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => field("url", e.target.value)}
                />
              </Field>
              <Field label="Promotion text">
                <textarea
                  className="resize-none"
                  rows={6}
                  maxLength={3000}
                  value={form.content}
                  onChange={(e) => field("content", e.target.value)}
                />
              </Field>
              <p className="muted">
                Use only claims supported by the selected published service. A
                changed message or destination needs fresh approval.
              </p>
              <div className="actions">
                <Button type="submit">{"Save promotion draft"}</Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!form.service_id}
                  onClick={async () => {
                    const result = (await command("agent.start", {
                      role_id: "promoter",
                      intent: "draft_promotion",
                      service_id: form.service_id,
                      destination: form.destination,
                    }));
                    if (result.ok) notify(result.message);
                    else setError(result.message);
                  }}
                >
                  Ask Promoter for a draft
                </Button>
              </div>
            </fieldset></Form>
            {promotion &&
              !dirty &&
              ["draft", "awaiting_review"].includes(activeStatus) && (
                <Button onClick={() => setMode("review")}>{"Review promotion"}
                </Button>
              )}
            {approved && (
              <div className="actions">
                <Button variant="secondary" onClick={copy}>{"Copy approved text"}
                </Button>
                {safeUrl(current?.destination_url) && (
                  <a
                    className="btn secondary"
                    href={safeUrl(current?.destination_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open destination ↗
                  </a>
                )}
                {activeStatus !== "published_confirmed" && (
                  <Button onClick={() => setMode("publish")}>{connected ? "Record manual publication" : "Record sample publication"}
                  </Button>
                )}
              </div>
            )}
            {copyFallback && (
              <Field label="Select and copy the approved text">
                <textarea
                  className="resize-none"
                  readOnly
                  rows={4}
                  value={s(current?.content)}
                  onFocus={(e) => e.target.select()}
                />
              </Field>
            )}
            {mode === "review" && (
              <section className="acq-review-box">
                <h3><UiText>{"Review exact content & destination"}</UiText></h3>
                <p className="acq-promo-copy">{s(current?.content)}</p>
                <p>
                  {label(current?.destination)} ·{" "}
                  {s(current?.target_audience, "Prospective clients")}
                </p>
                <details>
                  <summary><UiText>{"Approved claim references"}</UiText></summary>
                  {a<Record<string, unknown>>(current?.public_claim_refs).map(
                    (ref, i) => (
                      <p key={i}>
                        {s(record(s(ref.table), s(ref.id))?.title)} · version{" "}
                        {n(ref.version)}
                        {record(s(ref.table), s(ref.id))?.version !==
                        n(ref.version)
                          ? " · source changed — refresh this draft"
                          : ""}
                      </p>
                    ),
                  )}
                </details>
                <div className="actions">
                  <Button
                    onClick={async () => {
                      if ((await act("promotion.approve")).ok) setMode("");
                    }}
                  >{"Approve exact promotion"}
                  </Button>
                  <Button variant="secondary" onClick={() => setMode("")}>{"Cancel review"}
                  </Button>
                </div>
              </section>
            )}
            {mode === "publish" && (
              <section className="acq-review-box">
                <h3><UiText>{connected ? "Record manual publication" : "Record sample publication"}</UiText></h3>
                <p>
                  {connected ? <UiText>{"Record the publication you completed outside Crewmori. This saves your report for this exact version; it does not publish or send the content for you."}</UiText> : <>This records an explicit sample outcome for version {n(current?.revision)} at {label(current?.destination)}. No real post is published.</>}
                </p>
                <p className="acq-promo-copy">{s(current?.content)}</p>
                <Field label="Publication reference (optional)">
                  <input
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                  />
                </Field>
                <Field label={connected ? `Publication date · ${publicationTimezone}` : "Sample publication date"}>
                  <input
                    type="date"
                    value={publishedAt}
                    onChange={(e) => setPublishedAt(e.target.value)}
                  />
                </Field>
                <div className="actions">
                  <Button
                    onClick={async () => {
                      if (
                        !publishedAt ||
                        Number.isNaN(new Date(publishedAt).getTime())
                      )
                        return setError("Choose a valid publication date.");
                      if (evidence.includes("://") && !safeUrl(evidence))
                        return setError(
                          "Use an http or https evidence URL, or a plain text reference.",
                        );
                      if (
                        (await act("promotion.recordPublication", {
                          confirmed: true,
                          evidence,
                          publication_reference: evidence,
                          published_at: zonedDateTime(publishedAt, "12:00", publicationTimezone),
                        })).ok
                      )
                        setMode("");
                    }}
                  >{connected ? "Confirm publication record" : "Confirm sample publication"}
                  </Button>
                  <Button variant="secondary" onClick={() => setMode("")}>{"Cancel confirmation"}
                  </Button>
                </div>
              </section>
            )}
            {activeStatus === "published_confirmed" && (
              <div className="acq-term-note">
                <strong><UiText>{connected ? "Publication recorded" : "Published in sample"}</UiText></strong>
                <p>
                  This version’s publication evidence remains saved. Editing
                  creates a separate version for a fresh review.
                </p>
                <p>
                  {s(
                    record(
                      "publication_evidence",
                      s(current?.publication_evidence_id),
                    )?.publication_reference,
                    connected ? "Owner-reported publication recorded." : "Sample confirmation recorded.",
                  )}
                </p>
                <Button
                  variant="secondary"
                  onClick={async () => (await act("promotion.pause"))}
                >{"Pause follow-up promotion"}
                </Button>
              </div>
            )}
            {promotion && (
              <details>
                <summary>Version and publication history</summary>
                <div className="stack">
                  {rows("promotion_versions")
                    .filter((v) => v.promotion_id === promotion.id)
                    .sort((x, y) => n(y.revision) - n(x.revision))
                    .map((v) => {
                      const proof = record(
                        "publication_evidence",
                        s(v.publication_evidence_id),
                      );
                      return (
                        <article className="acq-assessment" key={v.id}>
                          <div className="row">
                            <strong><UiText>{"Version"}</UiText> {n(v.revision)}</strong>
                            <Status value={v.state} />
                          </div>
                          <p>{s(v.content)}</p>
                          <p className="muted">
                            {label(v.destination)} · {date(v.created_at)}
                          </p>
                          {proof && (
                            <p className="muted">
                              <UiText>{connected ? "Publication reported on" : "Published in sample on"}</UiText>{" "}
                              {date(proof.published_at || proof.recorded_at)} ·{" "}
                              {s(
                                proof.publication_reference,
                                connected ? "Owner-reported publication" : "Explicit sample confirmation",
                              )}
                            </p>
                          )}
                        </article>
                      );
                    })}
                </div>
              </details>
            )}
            {promotion &&
              !["published_confirmed", "archived"].includes(activeStatus) && (
                <Button variant="danger" onClick={() => setMode("archive")}>{"Archive draft"}
                </Button>
              )}
            {promotion && activeStatus === "archived" && (
              <Button
                variant="secondary"
                onClick={async () =>
                  (await act("record.archive", {
                    table: "promotions",
                    archived: false,
                  }))
                }
              >{"Restore draft"}
              </Button>
            )}
            <Button variant="secondary" onClick={close}>{"Close draft"}
            </Button>
            {mode === "archive" && (
              <Confirm
                title="Archive this promotion?"
                description="The draft leaves your active work. Its versions and any publication evidence remain saved, and you can restore it."
                onClose={() => setMode("")}
                onConfirm={async () => {
                  if (
                    (await act("record.archive", {
                      table: "promotions",
                      archived: true,
                    })).ok
                  )
                    setMode("");
                }}
              />
            )}
          </div>
        </Modal>
      )}
    </FormClose>
  );
}

"use client";
import { sampleId } from "@/lib/local-crypto";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Download,
  Plus,
  ArrowUpRight,
  Paperclip,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Entity, b, date, label, money, n, o, s } from "@/lib/types";
import {
  Button,
  LinkButton,
  PageHead,
  Panel,
  Badge,
  Empty,
  Field,
  Modal,
  Confirm,
  Tabs,
  useDirtyGuard,
} from "@/components/ui";
import {
  attachmentBlob,
  displayAmount,
  downloadBlob,
  downloadCsv,
  downloadZip,
  hashBytes,
  makePdf,
  parseAmount,
  persistUpload,
  safeFilename,
  validateUpload,
} from "@/lib/downloads";
import "./money.css";

type Store = ReturnType<typeof useStore>;
type Money = { amount_minor: number; currency: string; scale: number };
const amount = (minor: number, currency: string): Money => ({
  amount_minor: minor,
  currency,
  scale: currency === "IDR" ? 0 : 2,
});
const statusTone = (state: unknown) =>
  ["paid", "received", "reconciled", "confirmed"].includes(s(state))
    ? "success"
    : ["overdue", "needs_review", "review_required", "unknown"].includes(
          s(state),
        )
      ? "warning"
      : ["failed"].includes(s(state))
        ? "error"
        : "neutral";
const category = (v: unknown) =>
  ({ Utilities: "services", Website: "other", Software: "software" })[s(v)] ||
  s(v, "other").toLowerCase();
const classification = (e: Entity) =>
  s(e.classification, b(e.paid) ? "recorded" : "estimated");
const recordName = (e?: Entity) =>
  e ? s(e.title, s(e.name, s(e.description, e.id))) : "Not linked";
function invoiceLines(store: Store, invoice: Entity): Entity[] {
  return store
    .rows("invoice_lines")
    .filter((line: Entity) => line.invoice_id === invoice.id);
}
function exactLineTotal(price: number, quantity: string): number {
  if (
    !Number.isSafeInteger(price) ||
    price < 0 ||
    !/^\d+(\.\d{1,2})?$/.test(quantity)
  )
    return 0;
  const [whole, fraction = ""] = quantity.split(".");
  const qty = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  const result = (BigInt(price) * qty + 50n) / 100n;
  return result <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(result) : 0;
}
function lineTotal(line: Entity): number {
  return exactLineTotal(
    n(o(line.unit_amount).amount_minor),
    String(n(line.quantity, 1)),
  );
}
function invoiceGross(store: Store, invoice: Entity): number {
  return invoiceLines(store, invoice).reduce(
    (total, line) => total + lineTotal(line),
    0,
  );
}
function allocations(
  store: Store,
  invoiceId?: string,
  receiptId?: string,
): Entity[] {
  return store
    .rows("allocations")
    .filter(
      (row: Entity) =>
        row.state === "posted" &&
        (!invoiceId || row.invoice_id === invoiceId) &&
        (!receiptId || row.receipt_id === receiptId),
    );
}
function invoiceBalance(store: Store, invoice: Entity): number {
  return Math.max(
    0,
    invoiceGross(store, invoice) -
      allocations(store, invoice.id).reduce(
        (sum, row) => sum + n(o(row.amount).amount_minor),
        0,
      ),
  );
}
function receiptRemaining(store: Store, receipt: Entity): number {
  return Math.max(
    0,
    n(o(receipt.gross).amount_minor) -
      allocations(store, undefined, receipt.id).reduce(
        (sum, row) => sum + n(o(row.amount).amount_minor),
        0,
      ),
  );
}
function receiptInvoice(store: Store, receipt: Entity): Entity | undefined {
  return store.record(
    "invoices",
    s(
      store.record("payment_requests", s(receipt.payment_request_id))
        ?.invoice_id,
    ),
  );
}
function clientName(store: Store, id: unknown) {
  return s(store.record("clients", s(id))?.name, "Client unavailable");
}
function invoiceSender(store: Store) {
  const owner = store.record("owners", "owner_alya");
  const published = o(
    store.record("publication_snapshots", "profiles_profile_alya")?.values,
  );
  return {
    name: s(
      published.public_name,
      s(owner?.display_name, "Independent professional"),
    ),
    profession: s(owner?.profession, "Independent professional"),
  };
}
function invoiceStatus(store: Store, invoice: Entity) {
  return ["issued", "partially_paid"].includes(s(invoice.state)) &&
    invoiceBalance(store, invoice) > 0 &&
    s(invoice.due_at) &&
    new Date(s(invoice.due_at)).getTime() <
      new Date(store.state.sample_clock).getTime()
    ? "overdue"
    : s(invoice.state);
}
function useQuery() {
  const router = useRouter();
  const query = useSearchParams();
  function patch(values: Record<string, string | null>) {
    const next = new URLSearchParams(query.toString());
    for (const [key, value] of Object.entries(values)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    router.push(
      `${window.location.pathname}${next.size ? "?" + next.toString() : ""}`,
      { scroll: false },
    );
  }
  return { query, patch, router };
}
function MoneyTabs() {
  return (
    <Tabs
      items={[
        { label: "Invoices", href: "/app/money/invoices" },
        { label: "Payments", href: "/app/money/payments" },
        { label: "Expenses", href: "/app/money/expenses" },
      ]}
    />
  );
}
function ErrorText({ value }: { value: string }) {
  return value ? (
    <p className="money-error" role="alert">
      {value}
    </p>
  ) : null;
}
function AmountGroups({
  values,
  caption,
}: {
  values: Money[];
  caption: string;
}) {
  const totals = values.reduce<Record<string, number>>(
    (result, value) => ({
      ...result,
      [value.currency]: (result[value.currency] || 0) + value.amount_minor,
    }),
    {},
  );
  return (
    <div className="money-summary">
      {Object.entries(totals).map(([currency, total]) => (
        <div key={currency}>
          <strong>{money(amount(total, currency))}</strong>
          <span>
            {caption} · {currency}
          </span>
        </div>
      ))}
      {!values.length && (
        <div>
          <strong>—</strong>
          <span>{caption}</span>
        </div>
      )}
    </div>
  );
}
function Pager({ count }: { count: number }) {
  const { query, patch } = useQuery();
  const pages = Math.max(1, Math.ceil(count / 10));
  const page = Math.max(1, Math.min(pages, Number(query.get("page")) || 1));
  return (
    <div className="money-pager">
      <span className="muted">
        {count} {count === 1 ? "record" : "records"}
      </span>
      <Field label="Page">
        <select value={page} onChange={(e) => patch({ page: e.target.value })}>
          {Array.from({ length: pages }, (_, i) => (
            <option key={i} value={i + 1}>
              {i + 1} of {pages}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}
function pageRows(rows: Entity[], page: string | null) {
  const current = Math.max(
    1,
    Math.min(Math.ceil(rows.length / 10) || 1, Number(page) || 1),
  );
  return rows.slice((current - 1) * 10, current * 10);
}
function Unknown({ kind }: { kind: string }) {
  return (
    <>
      <PageHead title={`${kind} unavailable`} />
      <Empty
        title={`We couldn't find this ${kind.toLowerCase()}.`}
        description="This link may belong to another sample scenario. No other record has been substituted."
      >
        <LinkButton href="/app/money/invoices">Back to Money</LinkButton>
      </Empty>
    </>
  );
}
function FilterField({
  label: name,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={name}>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([value, text]) => (
          <option value={value} key={value}>
            {text}
          </option>
        ))}
      </select>
    </Field>
  );
}
function History({ store, id }: { store: Store; id: string }) {
  const events = store
    .rows("events")
    .filter((e: Entity) => JSON.stringify(e).includes(id))
    .slice(-6)
    .reverse();
  return (
    <details>
      <summary>Record history</summary>
      {events.length ? (
        <ul className="money-history">
          {events.map((e: Entity) => (
            <li key={e.id}>
              {s(e.summary, s(e.type, s(e.event_type, "Record updated")))}
              <small>{date(e.created_at || e.occurred_at)}</small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No additional activity recorded.</p>
      )}
    </details>
  );
}
export default function MoneyViews({ path }: { path: string }) {
  const parts = path.split("/").filter(Boolean);
  const section = parts[2] || "invoices";
  const id = parts[3];
  if (section === "payments")
    return id ? <PaymentDetail key={id} id={id} /> : <PaymentsList />;
  if (section === "expenses") return <ExpensesList />;
  return id ? <InvoiceDetail key={id} id={id} /> : <InvoicesList />;
}
function InvoicesList() {
  const store = useStore();
  const { query, patch, router } = useQuery();
  const q = query.get("q") || "";
  const status = query.get("status") || "all";
  const currency = query.get("currency") || "all";
  const client = query.get("client") || "all";
  const sort = query.get("sort") || "recent";
  const invoices = store
    .rows("invoices")
    .filter(
      (row: Entity) =>
        (status === "all" || invoiceStatus(store, row) === status) &&
        (currency === "all" || row.currency === currency) &&
        (client === "all" || row.client_id === client) &&
        `${row.number || ""} ${clientName(store, row.client_id)} ${row.id}`
          .toLowerCase()
          .includes(q.trim().toLowerCase()),
    )
    .sort(
      (x: Entity, y: Entity) =>
        (sort === "reference"
          ? s(x.number).localeCompare(s(y.number))
          : sort === "due"
            ? s(x.due_at, "z").localeCompare(s(y.due_at, "z"))
            : s(y.updated_at).localeCompare(s(x.updated_at))) ||
        x.id.localeCompare(y.id),
    );
  return (
    <>
      <PageHead
        title="Invoices"
        description="Clear terms, a clear next step."
        action={
          <Button onClick={() => patch({ new: "1" })}>
            <Plus size={16} /> Create invoice
          </Button>
        }
      />
      <MoneyTabs />
      <AmountGroups
        caption="Outstanding on issued invoices"
        values={invoices
          .filter((i: Entity) =>
            ["issued", "partially_paid"].includes(s(i.state)),
          )
          .map((i: Entity) => amount(invoiceBalance(store, i), s(i.currency)))}
      />
      <Panel>
        <div className="money-filter">
          <Field label="Search invoices">
            <input
              value={q}
              maxLength={200}
              placeholder="Reference or client"
              onChange={(e) => patch({ q: e.target.value, page: null })}
            />
          </Field>
          <FilterField
            label="Status"
            value={status}
            options={[
              "all",
              "draft",
              "issued",
              "partially_paid",
              "paid",
              "overdue",
              "void",
            ].map((v) => [v, label(v)])}
            onChange={(v) => patch({ status: v, page: null })}
          />
          <FilterField
            label="Client"
            value={client}
            options={[
              ["all", "All clients"],
              ...store
                .rows("clients")
                .map((c: Entity): [string, string] => [c.id, s(c.name)]),
            ]}
            onChange={(v) => patch({ client: v, page: null })}
          />
          <FilterField
            label="Currency"
            value={currency}
            options={["all", "USD", "IDR"].map((v) => [
              v,
              v === "all" ? "All currencies" : v,
            ])}
            onChange={(v) => patch({ currency: v, page: null })}
          />
          <FilterField
            label="Sort"
            value={sort}
            options={[
              ["recent", "Recent"],
              ["due", "Due date"],
              ["reference", "Reference"],
            ]}
            onChange={(v) => patch({ sort: v })}
          />
          <Button
            variant="secondary"
            onClick={() => router.push("/app/money/invoices")}
          >
            Clear filters
          </Button>
        </div>
        {invoices.length ? (
          <div className="money-scroll">
            <table className="money-ledger">
              <thead>
                <tr>
                  <th>Invoice / client</th>
                  <th>Status</th>
                  <th className="optional-column">Due</th>
                  <th>Total</th>
                  <th>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {pageRows(invoices, query.get("page")).map((i) => (
                  <tr key={i.id}>
                    <td>
                      <Link
                        href={`/app/money/invoices/${i.id}?return=${encodeURIComponent(`/app/money/invoices${query.size ? `?${query}` : ""}`)}`}
                      >
                        {s(i.number, "Draft invoice")}
                      </Link>
                      <small>{clientName(store, i.client_id)}</small>
                    </td>
                    <td>
                      <Badge tone={statusTone(invoiceStatus(store, i))}>
                        {label(invoiceStatus(store, i))}
                      </Badge>
                    </td>
                    <td className="optional-column">{date(i.due_at)}</td>
                    <td className="money-number">
                      {money(amount(invoiceGross(store, i), s(i.currency)))}
                    </td>
                    <td className="money-number">
                      {money(
                        amount(
                          i.state === "void" ? 0 : invoiceBalance(store, i),
                          s(i.currency),
                        ),
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={
              store.rows("invoices").length
                ? "No invoices match these filters."
                : "Your next invoice starts here."
            }
            description={
              store.rows("invoices").length
                ? "Try another reference, status or currency."
                : "Create a draft, review the exact terms, then issue it when you are ready."
            }
          >
            <Button
              variant="secondary"
              onClick={() =>
                patch(
                  store.rows("invoices").length
                    ? { q: null, status: null, currency: null, client: null }
                    : { new: "1" },
                )
              }
            >
              {store.rows("invoices").length
                ? "Clear filters"
                : "Create a draft"}
            </Button>
          </Empty>
        )}
        <Pager count={invoices.length} />
      </Panel>
      {query.get("new") === "1" && (
        <InvoiceEditor onClose={() => patch({ new: null })} />
      )}
    </>
  );
}

type DraftLine = {
  key: string;
  description: string;
  quantity: string;
  price: string;
};
function InvoiceEditor({
  invoice,
  onClose,
}: {
  invoice?: Entity;
  onClose: () => void;
}) {
  const store = useStore();
  const router = useRouter();
  const initialCurrency = s(invoice?.currency, "USD");
  const [baseVersion] = useState(invoice?.version);
  const [operationId] = useState(() => sampleId("operation"));
  const [client, setClient] = useState(s(invoice?.client_id));
  const [contact, setContact] = useState(s(invoice?.billing_contact_id));
  const [project, setProject] = useState(s(invoice?.project_id));
  const [currency, setCurrency] = useState(initialCurrency);
  const initialDue = s(invoice?.due_at).slice(0, 10);
  const [note, setNote] = useState(s(invoice?.buyer_note));
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [changeCurrency, setChangeCurrency] = useState("");
  const [lines, setLines] = useState<DraftLine[]>(
    invoice
      ? invoiceLines(store, invoice).map((l) => ({
          key: l.id,
          description: s(l.description),
          quantity: String(n(l.quantity, 1)),
          price: displayAmount(
            n(o(l.unit_amount).amount_minor),
            initialCurrency,
          ),
        }))
      : [
          {
            key: sampleId("operation"),
            description: "",
            quantity: "1",
            price: "",
          },
        ],
  );
  const [removed, setRemoved] = useState<{
    line: DraftLine;
    index: number;
  } | null>(null);
  useDirtyGuard(dirty);
  const contacts = store
    .rows("contacts")
    .filter((c: Entity) => c.client_id === client);
  const projects = store
    .rows("projects")
    .filter((p: Entity) => p.client_id === client);
  function editLine(key: string, keyName: keyof DraftLine, value: string) {
    setDirty(true);
    setLines((previous) =>
      previous.map((l) => (l.key === key ? { ...l, [keyName]: value } : l)),
    );
  }
  function total(l: DraftLine): number {
    const price = parseAmount(l.price, currency);
    if (price === null || !/^\d+(\.\d{1,2})?$/.test(l.quantity)) return 0;
    return exactLineTotal(price, l.quantity);
  }
  const totalMinor = lines.reduce((sum, l) => sum + total(l), 0);
  const sampleDay = store.state.sample_clock.slice(0, 10);
  function close() {
    if (dirty) setDiscard(true);
    else onClose();
  }
  async function save(submittedDue: string) {
    if (!client || !store.record("clients", client))
      return setError("Choose an existing client.");
    if (project && !projects.some((p: Entity) => p.id === project))
      return setError("Choose a project belonging to this client.");
    if (
      submittedDue &&
      (submittedDue < sampleDay ||
        !/^\d{4}-\d{2}-\d{2}$/.test(submittedDue) ||
        Number.isNaN(new Date(submittedDue).getTime()))
    )
      return setError(`Due date must be on or after ${sampleDay}.`);
    if (
      !lines.length ||
      lines.length > 50 ||
      lines.some(
        (l) =>
          !l.description.trim() ||
          l.description.length > 500 ||
          parseAmount(l.price, currency) === null ||
          !/^\d+(\.\d{1,2})?$/.test(l.quantity) ||
          Number(l.quantity) <= 0 ||
          Number(l.quantity) > 10000,
      ) ||
      totalMinor <= 0 ||
      !Number.isSafeInteger(totalMinor)
    )
      return setError(
        "Every line needs a description, a positive quantity (up to 10,000, two decimals), and a nonnegative price. The invoice total must be positive.",
      );
    const result = (await store.command("invoice.saveDraft", {
      id: invoice?.id,
      idempotency_key: operationId,
      expected_version: baseVersion,
      values: {
        client_id: client,
        billing_contact_id: contact || contacts[0]?.id || null,
        project_id: project || null,
        currency,
        due_at: submittedDue ? `${submittedDue}T17:00:00+07:00` : null,
        buyer_note: note.trim(),
        lines: lines.map((l) => ({
          description: l.description.trim(),
          quantity: Number(l.quantity),
          unit_amount: amount(parseAmount(l.price, currency) || 0, currency),
          tax_basis_points: 0,
        })),
      },
    }));
    if (!result.ok) return setError(result.message);
    setDirty(false);
    store.notify(result.message);
    onClose();
    if (result.id) router.push(`/app/money/invoices/${result.id}`);
  }
  return (
    <>
      <Modal
        title={invoice ? "Edit invoice draft" : "Create invoice"}
        onClose={close}
      >
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            const submitted = new FormData(e.currentTarget).get("invoice_due");
            save(typeof submitted === "string" ? submitted : initialDue);
          }}
        >
          <p className="muted">
            Save a draft first. Issuing and sending are separate decisions.
          </p>
          <ErrorText value={error} />
          <div className="money-two-fields">
            <Field label="Client">
              <select
                required
                value={client}
                onChange={(e) => {
                  setClient(e.target.value);
                  setProject("");
                  setContact("");
                  setDirty(true);
                }}
              >
                <option value="">Choose client</option>
                {store.rows("clients").map((c: Entity) => (
                  <option key={c.id} value={c.id}>
                    {s(c.name)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Billing contact">
              <select
                value={contact || contacts[0]?.id || ""}
                onChange={(e) => {
                  setContact(e.target.value);
                  setDirty(true);
                }}
              >
                <option value="">Choose contact</option>
                {contacts.map((c: Entity) => (
                  <option key={c.id} value={c.id}>
                    {s(c.display_name)} · {s(c.email)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Related project">
              <select
                value={project}
                onChange={(e) => {
                  setProject(e.target.value);
                  setDirty(true);
                }}
              >
                <option value="">No project</option>
                {projects.map((p: Entity) => (
                  <option key={p.id} value={p.id}>
                    {s(p.title)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Currency">
              <select
                value={currency}
                onChange={(e) =>
                  lines.some((l) => l.price)
                    ? setChangeCurrency(e.target.value)
                    : setCurrency(e.target.value)
                }
              >
                <option>USD</option>
                <option>IDR</option>
              </select>
            </Field>
          </div>
          <div className="money-lines-editor">
            {lines.map((l, index) => (
              <div className="money-line-editor" key={l.key}>
                <Field label={`Line ${index + 1} description`}>
                  <input
                    value={l.description}
                    required
                    maxLength={500}
                    onChange={(e) =>
                      editLine(l.key, "description", e.target.value)
                    }
                  />
                </Field>
                <Field label="Quantity">
                  <input
                    inputMode="decimal"
                    value={l.quantity}
                    onChange={(e) =>
                      editLine(l.key, "quantity", e.target.value)
                    }
                  />
                </Field>
                <Field label={`Unit price (${currency})`}>
                  <input
                    inputMode="decimal"
                    value={l.price}
                    onChange={(e) => editLine(l.key, "price", e.target.value)}
                  />
                </Field>
                <Button
                  type="button"
                  variant="secondary"
                  aria-label={`Remove line item ${index + 1}`}
                  onClick={() => {
                    setRemoved({ line: l, index });
                    setLines((previous) =>
                      previous.filter((x) => x.key !== l.key),
                    );
                    setDirty(true);
                  }}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>
          <div className="actions">
            <Button
              type="button"
              variant="secondary"
              disabled={lines.length >= 50}
              onClick={() => {
                setLines((previous) => [
                  ...previous,
                  {
                    key: sampleId("operation"),
                    description: "",
                    quantity: "1",
                    price: "",
                  },
                ]);
                setDirty(true);
              }}
            >
              <Plus size={16} /> Add line item
            </Button>
            {removed && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setLines((previous) => [
                    ...previous.slice(0, removed.index),
                    removed.line,
                    ...previous.slice(removed.index),
                  ]);
                  setRemoved(null);
                }}
              >
                Undo line removal
              </Button>
            )}
          </div>
          <div className="money-review-term">
            <span>Draft total</span>
            <strong>{money(amount(totalMinor, currency))}</strong>
          </div>
          <Field label="Due date">
            <input
              type="date"
              name="invoice_due"
              defaultValue={initialDue}
              min={sampleDay}
              onInput={() => setDirty(true)}
              onChange={() => setDirty(true)}
            />
          </Field>
          <Field label="Buyer note">
            <textarea
              className="resize-none"
              maxLength={2000}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setDirty(true);
              }}
              rows={3}
            />
          </Field>
          <div className="actions money-form-footer">
            <Button type="submit">Save draft</Button>
            <Button type="button" variant="secondary" onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
      {discard && (
        <Confirm
          title="Discard invoice edits?"
          description="The saved invoice will stay unchanged. Your unsaved line edits will be discarded."
          onClose={() => setDiscard(false)}
          onConfirm={onClose}
        />
      )}
      {changeCurrency && (
        <Confirm
          title={`Change to ${changeCurrency}?`}
          description="All line prices will be cleared so you can enter the new currency amounts. No exchange-rate conversion will be applied."
          onClose={() => setChangeCurrency("")}
          onConfirm={() => {
            setCurrency(changeCurrency);
            setLines((previous) => previous.map((l) => ({ ...l, price: "" })));
            setDirty(true);
            setChangeCurrency("");
          }}
        />
      )}
    </>
  );
}
function invoicePdf(store: Store, invoice: Entity): Blob {
  const contact =
    store.record("contacts", s(invoice.billing_contact_id)) ||
    store
      .rows("contacts")
      .find((c: Entity) => c.client_id === invoice.client_id);
  return makePdf(
    `Invoice ${s(invoice.number, "DRAFT")}`,
    [
      ["From", invoiceSender(store).name],
      ["Bill to", clientName(store, invoice.client_id)],
      [
        "Billing contact",
        [s(contact?.display_name), s(contact?.email)]
          .filter(Boolean)
          .join(" · ") || "Not provided",
      ],
      ["Status", label(invoice.state)],
      [
        "Issue date",
        invoice.issued_at ? date(invoice.issued_at) : "Not issued",
      ],
      ["Due date", date(invoice.due_at)],
      ...invoiceLines(store, invoice).map((l): [string, string] => [
        `${n(l.quantity, 1)} × ${money(l.unit_amount)}`,
        `${s(l.description)} — ${money(amount(lineTotal(l), s(invoice.currency)))}`,
      ]),
      [
        "Invoice total",
        money(amount(invoiceGross(store, invoice), s(invoice.currency))),
      ],
      [
        "Allocated payments",
        money(
          amount(
            invoiceGross(store, invoice) - invoiceBalance(store, invoice),
            s(invoice.currency),
          ),
        ),
      ],
      [
        "Outstanding",
        money(
          amount(
            invoice.state === "void" ? 0 : invoiceBalance(store, invoice),
            s(invoice.currency),
          ),
        ),
      ],
      ["Buyer note", s(invoice.buyer_note, "—")],
    ],
    store.connected ? "Generated from the saved invoice and its recorded allocations." : "Sample invoice. Issuance, payment observations and sending are simulated.",
  );
}
function InvoiceDetail({ id }: { id: string }) {
  const store = useStore();
  const invoice = store.record("invoices", id);
  const { query, patch, router } = useQuery();
  const [error, setError] = useState("");
  const [pdf, setPdf] = useState<Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState(
    "Hi, please find the invoice for our agreed work. Thank you.",
  );
  const [reviewVersion, setReviewVersion] = useState<number | null>(null);
  useEffect(() => {
    if (!pdf) return;
    const url = URL.createObjectURL(pdf);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pdf]);
  if (!invoice) return <Unknown kind="Invoice" />;
  const lines = invoiceLines(store, invoice);
  const total = invoiceGross(store, invoice);
  const balance = invoiceBalance(store, invoice);
  const currency = s(invoice.currency);
  const isDraft = invoice.state === "draft";
  const contact =
    store.record("contacts", s(invoice.billing_contact_id)) ||
    store
      .rows("contacts")
      .find((c: Entity) => c.client_id === invoice.client_id);
  const allocationsCount = allocations(store, invoice.id).length;
  async function act(
    type: string,
    input: Record<string, unknown> = {},
    close?: Record<string, null>,
  ) {
    const result = (await store.command(type, {
      invoice_id: id,
      id,
      expected_version: invoice?.version,
      ...input,
    }));
    if (!result.ok) setError(result.message);
    else {
      setError("");
      store.notify(result.message);
      if (close) patch(close);
    }
    return result;
  }
  function download() {
    try {
      const blob = invoicePdf(store, invoice!);
      downloadBlob(blob, `${s(invoice?.number, id)}.pdf`);
      store.notify("Invoice PDF prepared.");
    } catch {
      setError("The PDF could not be generated. Try PDF again.");
    }
  }
  return (
    <>
      <PageHead
        title={s(invoice.number, "Draft invoice")}
        description={`${clientName(store, invoice.client_id)} · ${label(invoice.kind || "invoice")}`}
        action={
          <Button variant="secondary" onClick={download}>
            <Download size={16} /> Download PDF
          </Button>
        }
      />
      <Link
        href={
          query.get("return")?.startsWith("/app/money/invoices?")
            ? query.get("return")!
            : "/app/money/invoices"
        }
        className="money-muted-link"
      >
        ← All invoices
      </Link>
      <ErrorText value={error} />
      <div className="money-sheet">
        <Panel>
          <div className="money-invoice">
            <div className="money-invoice-heading">
              <div>
                <span className="eyebrow">INVOICE</span>
                <h2>{s(invoice.number, "Draft")}</h2>
                <Badge tone={statusTone(invoiceStatus(store, invoice))}>
                  {label(invoiceStatus(store, invoice))}
                </Badge>
              </div>
              <div>
                <strong>{invoiceSender(store).name}</strong>
                <p className="muted">
                  {invoiceSender(store).profession}
                  <br />
                  Prepared with Crewmori
                </p>
              </div>
            </div>
            <div className="money-details">
              <div>
                <dt>Bill to</dt>
                <dd>
                  <strong>{clientName(store, invoice.client_id)}</strong>
                  <br />
                  {s(contact?.display_name)}
                  <br />
                  {s(contact?.email)}
                </dd>
              </div>
              <div>
                <dt>Due date</dt>
                <dd>{date(invoice.due_at)}</dd>
                <dt style={{ marginTop: 16 }}>Issued</dt>
                <dd>
                  {invoice.issued_at
                    ? date(invoice.issued_at)
                    : "Not yet issued"}
                </dd>
              </div>
            </div>
            <div className="money-scroll">
              <table className="money-ledger">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Unit price</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id}>
                      <td>{s(l.description)}</td>
                      <td>{n(l.quantity, 1)}</td>
                      <td className="money-number">{money(l.unit_amount)}</td>
                      <td className="money-number">
                        {money(amount(lineTotal(l), currency))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="money-total">
              <div className="row">
                <span>Invoice total</span>
                <span>{money(amount(total, currency))}</span>
              </div>
              <div className="row">
                <span>Allocated gross</span>
                <span>{money(amount(total - balance, currency))}</span>
              </div>
              <div className="row">
                <span>
                  {invoice.state === "void" ? "Voided amount" : "Outstanding"}
                </span>
                <span>
                  {money(
                    amount(
                      invoice.state === "void" ? total : balance,
                      currency,
                    ),
                  )}
                </span>
              </div>
            </div>
            {s(invoice.buyer_note) && (
              <p className="money-note">{s(invoice.buyer_note)}</p>
            )}
            {invoice.kind === "deposit" && invoice.state === "paid" && (
              <p className="money-note">
                This deposit invoice is fully paid. The engagement’s remaining
                amount is separate from this invoice.
              </p>
            )}
            {invoice.state === "void" && (
              <p className="money-warning">
                Voided: {s(invoice.void_reason)}. The original invoice and
                history are preserved.
              </p>
            )}
          </div>
        </Panel>
        <div className="stack money-side">
          <Panel>
            <h3>Next step</h3>
            <div className="actions">
              {isDraft ? (
                <>
                  <Button
                    onClick={() => {
                      setReviewVersion(invoice.version);
                      patch({ review: "1" });
                    }}
                  >
                    {invoice.authorized_by_acceptance_id
                      ? "Issue deposit request"
                      : "Review invoice"}
                  </Button>
                  {!invoice.authorized_by_acceptance_id && (
                    <Button
                      variant="secondary"
                      onClick={() => patch({ edit: "1" })}
                    >
                      Edit draft
                    </Button>
                  )}
                </>
              ) : invoice.state !== "void" ? (
                <Button onClick={() => patch({ send: "1" })}>
                  Send invoice
                </Button>
              ) : (
                <Button
                  onClick={async () => {
                    const result = (await store.command("invoice.saveDraft", {
                      values: {
                        previous_invoice_id: invoice.id,
                        client_id: invoice.client_id,
                        project_id: invoice.project_id,
                        billing_contact_id: invoice.billing_contact_id,
                        currency: invoice.currency,
                        due_at:
                          store.state.sample_clock.slice(0, 10) +
                          "T17:00:00+07:00",
                        buyer_note: invoice.buyer_note,
                        lines: lines.map((l) => ({
                          description: l.description,
                          quantity: l.quantity,
                          unit_amount: l.unit_amount,
                          tax_basis_points: 0,
                        })),
                      },
                    }));
                    if (result.ok && result.id)
                      router.push(`/app/money/invoices/${result.id}?edit=1`);
                  }}
                >
                  Create replacement draft
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  setPdf(invoicePdf(store, invoice));
                  patch({ preview: "1" });
                }}
              >
                Preview invoice
              </Button>
              {!isDraft && invoice.state !== "void" && (
                <Button
                  variant="secondary"
                  onClick={() => patch({ action: "void" })}
                >
                  Void invoice
                </Button>
              )}
              {invoice.project_id ? (
                <LinkButton
                  href={`/app/projects/${s(invoice.project_id)}`}
                  variant="secondary"
                >
                  View project
                </LinkButton>
              ) : null}
            </div>
            {invoice.sent_at ? (
              <p className="money-subtitle">
                {store.connected ? "Email sent" : "Sample send recorded"} {date(invoice.sent_at)}.
              </p>
            ) : (
              <p className="money-subtitle">
                {isDraft
                  ? "The draft has not been issued or sent."
                  : "Issuing does not send an email."}
              </p>
            )}
          </Panel>
          <Panel>
            <History store={store} id={id} />
          </Panel>
        </div>
      </div>
      {query.get("edit") === "1" &&
        isDraft &&
        !invoice.authorized_by_acceptance_id && (
          <InvoiceEditor
            invoice={invoice}
            onClose={() => patch({ edit: null })}
          />
        )}
      {query.get("review") === "1" && (
        <Modal
          title="Review exact invoice"
          onClose={() => patch({ review: null })}
        >
          <div className="stack">
            <ErrorText value={error} />
            <p>
              You are issuing invoice version {reviewVersion ?? invoice.version}
              . This makes its commercial terms immutable.
            </p>
            <div className="money-review-term">
              <span>Client</span>
              <strong>{clientName(store, invoice.client_id)}</strong>
            </div>
            <div className="money-review-term">
              <span>Invoice gross</span>
              <strong>{money(amount(total, currency))}</strong>
            </div>
            <div className="money-review-term">
              <span>Due</span>
              <strong>{date(invoice.due_at)}</strong>
            </div>
            {lines.map((l) => (
              <p key={l.id}>
                {s(l.description)} · {money(amount(lineTotal(l), currency))}
              </p>
            ))}
            {!invoice.due_at && (
              <p className="money-error">Set a due date before issuing.</p>
            )}
            <div className="actions">
              <Button
                disabled={!invoice.due_at || !isDraft}
                onClick={async () =>
                  (await act(
                    "invoice.issue",
                    {
                      confirmed: true,
                      expected_version: reviewVersion ?? invoice.version,
                    },
                    { review: null },
                  ))
                }
              >
                {invoice.authorized_by_acceptance_id
                  ? "Issue deposit request"
                  : "Issue invoice"}
              </Button>
              {!invoice.authorized_by_acceptance_id && (
                <Button
                  variant="secondary"
                  onClick={() => patch({ review: null, edit: "1" })}
                >
                  Edit draft
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => patch({ review: null })}
              >
                Cancel review
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {query.get("send") === "1" && (
        <Modal
          title="Review invoice email"
          onClose={() => patch({ send: null })}
        >
          <div className="stack">
            <ErrorText value={error} />
            <p>
              <strong>To:</strong>{" "}
              {s(contact?.email, "No billing contact — add a contact first")}
            </p>
            <p>
              {s(invoice.number)} · {money(amount(total, currency))} · version{" "}
              {invoice.version}
            </p>
            <Field label="Email message">
              <textarea
                className="resize-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={3000}
                rows={5}
              />
            </Field>
            <p className="money-note">
              {store.connected ? "This sends the reviewed message to the selected billing contact through your configured email service." : "This approval records a sample dispatch. No real email is sent."}
            </p>
            <div className="actions">
              <Button
                disabled={
                  !contact?.email ||
                  !message.trim() ||
                  isDraft ||
                  invoice.state === "void"
                }
                onClick={async () =>
                  (await act(
                    "invoice.send",
                    {
                      content: message,
                      recipient: s(contact?.email),
                      contact_id: contact?.id,
                      confirmed: true,
                    },
                    { send: null },
                  ))
                }
              >
                {store.connected ? "Approve and send invoice email" : "Approve and send sample invoice"}
              </Button>
              <Button variant="secondary" onClick={() => patch({ send: null })}>
                Cancel
              </Button>
            </div>
            <Link href="/app/connections?connection=gmail">
              Manage Gmail connection
            </Link>
          </div>
        </Modal>
      )}
      {query.get("action") === "void" && (
        <Modal
          title="Void unpaid invoice"
          onClose={() => patch({ action: null })}
        >
          <div className="stack">
            <ErrorText value={error} />
            {allocationsCount ? (
              <p className="money-warning">
                This invoice has posted allocations. Simple voiding is blocked;
                a credit or refund workflow would be required.
              </p>
            ) : (
              <p>
                Void {s(invoice.number, "this draft")} for{" "}
                {money(amount(total, currency))}. Its number and history remain.
                This does not create a refund.
              </p>
            )}
            <Field label="Reason">
              <textarea
                className="resize-none"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={1000}
                rows={3}
              />
            </Field>
            <div className="actions">
              <Button
                variant="danger"
                disabled={allocationsCount > 0 || reason.trim().length < 3}
                onClick={async () =>
                  (await act(
                    "invoice.void",
                    { reason: reason.trim() },
                    { action: null },
                  ))
                }
              >
                Void unpaid invoice
              </Button>
              <Button
                variant="secondary"
                onClick={() => patch({ action: null })}
              >
                Keep invoice
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {query.get("preview") === "1" && (
        <Modal
          title="Invoice PDF preview"
          onClose={() => patch({ preview: null })}
        >
          <div className="stack">
            {pdfUrl ? (
              <iframe
                title="Invoice PDF"
                src={pdfUrl}
                className="money-preview"
              />
            ) : (
              <p>Generate the PDF to preview it.</p>
            )}
            <Button onClick={download}>Download invoice PDF</Button>
          </div>
        </Modal>
      )}
    </>
  );
}
function PaymentsList() {
  const store = useStore();
  const { query, patch, router } = useQuery();
  const q = query.get("q") || "";
  const state = query.get("state") || "all";
  const currency = query.get("currency") || "all";
  const sort = query.get("sort") || "recent";
  const records = [
    ...store
      .rows("payment_requests")
      .map((r: Entity) => ({ ...r, record_kind: "request" })),
    ...store
      .rows("receipts")
      .map((r: Entity) => ({ ...r, record_kind: "receipt" })),
  ] as Entity[];
  function invoiceFor(row: Entity) {
    return row.record_kind === "receipt"
      ? receiptInvoice(store, row)
      : store.record("invoices", s(row.invoice_id));
  }
  function stateFor(row: Entity) {
    return row.record_kind === "receipt"
      ? row.reconciliation_state === "review_required"
        ? "needs_review"
        : "received"
      : s(row.state);
  }
  const filtered = records
    .filter((row) => {
      const invoice = invoiceFor(row);
      return (
        `${row.id} ${s(invoice?.number)} ${clientName(store, invoice?.client_id)}`
          .toLowerCase()
          .includes(q.toLowerCase().trim()) &&
        (currency === "all" ||
          o(row.gross || row.expected).currency === currency) &&
        (state === "all" ||
          stateFor(row) === state ||
          (state === "received" && row.record_kind === "receipt"))
      );
    })
    .sort(
      (x, y) =>
        (sort === "amount"
          ? s(o(x.gross || x.expected).currency).localeCompare(
              s(o(y.gross || y.expected).currency),
            ) ||
            n(o(y.gross || y.expected).amount_minor) -
              n(o(x.gross || x.expected).amount_minor)
          : sort === "reference"
            ? x.id.localeCompare(y.id)
            : s(y.updated_at).localeCompare(s(x.updated_at))) ||
        x.id.localeCompare(y.id),
    );
  return (
    <>
      <PageHead
        title="Payments"
        description="Understand what arrived, and where it belongs."
        action={
          !store.connected && <LinkButton href="/app/money/payments?scenario=1" variant="secondary">
            Sample payment controls
          </LinkButton>
        }
      />
      <MoneyTabs />
      <AmountGroups
        caption="Observed gross receipts"
        values={filtered
          .filter((r) => r.record_kind === "receipt")
          .map((r) => o(r.gross) as Money)}
      />
      <Panel>
        <div className="money-filter">
          <Field label="Search payments">
            <input
              value={q}
              onChange={(e) => patch({ q: e.target.value, page: null })}
              maxLength={200}
              placeholder="Reference or client"
            />
          </Field>
          <FilterField
            label="Payment state"
            value={state}
            options={[
              "all",
              "created",
              "pending",
              "unknown",
              "failed",
              "cancelled",
              "received",
              "needs_review",
            ].map((v) => [v, v === "created" ? "Requested" : label(v)])}
            onChange={(v) => patch({ state: v, page: null })}
          />
          <FilterField
            label="Currency"
            value={currency}
            options={["all", "USD", "IDR"].map((v) => [
              v,
              v === "all" ? "All currencies" : v,
            ])}
            onChange={(v) => patch({ currency: v, page: null })}
          />
          <FilterField
            label="Sort"
            value={sort}
            options={[
              ["recent", "Recent"],
              ["amount", "Amount within currency"],
              ["reference", "Reference"],
            ]}
            onChange={(v) => patch({ sort: v })}
          />
          <Button
            variant="secondary"
            onClick={() => router.push("/app/money/payments")}
          >
            Clear filters
          </Button>
        </div>
        {filtered.length ? (
          <div className="money-scroll">
            <table className="money-ledger">
              <thead>
                <tr>
                  <th>Payment / client</th>
                  <th>State</th>
                  <th>Gross amount</th>
                  <th className="optional-column">Source</th>
                </tr>
              </thead>
              <tbody>
                {pageRows(filtered, query.get("page")).map((row) => {
                  const invoice = invoiceFor(row);
                  return (
                    <tr key={row.id}>
                      <td>
                        <Link
                          href={`/app/money/payments/${row.id}?return=${encodeURIComponent(`/app/money/payments${query.size ? `?${query}` : ""}`)}`}
                        >
                          {row.record_kind === "receipt"
                            ? "Receipt"
                            : "Payment request"}{" "}
                          · {s(invoice?.number, "Invoice")}
                        </Link>
                        <small>{clientName(store, invoice?.client_id)}</small>
                      </td>
                      <td>
                        <Badge tone={statusTone(stateFor(row))}>
                          {label(stateFor(row))}
                        </Badge>
                      </td>
                      <td className="money-number">
                        {money(row.gross || row.expected)}
                      </td>
                      <td className="optional-column">
                        {row.record_kind === "receipt"
                          ? "Sample observation"
                          : "Expected payment"}
                        <small>{date(row.received_at || row.created_at)}</small>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={
              records.length
                ? "No payments match these filters."
                : "Payments will appear here."
            }
            description={
              records.length
                ? "Clear the filters to see all requests and receipts."
                : "An issued invoice creates a payment request. A request is not received money."
            }
          >
            <LinkButton href="/app/money/invoices" variant="secondary">
              View invoices
            </LinkButton>
          </Empty>
        )}
        <Pager count={filtered.length} />
      </Panel>
    </>
  );
}
function PaymentDetail({ id }: { id: string }) {
  const store = useStore();
  const { query, patch } = useQuery();
  const receipt = store.record("receipts", id);
  const request = receipt
    ? store.record("payment_requests", s(receipt.payment_request_id))
    : store.record("payment_requests", id);
  const row = receipt || request;
  const invoice = receipt
    ? receiptInvoice(store, receipt)
    : store.record("invoices", s(request?.invoice_id));
  const [error, setError] = useState("");
  if (!row) return <Unknown kind="Payment" />;
  const issues = store
    .rows("finance_issues")
    .filter(
      (i: Entity) =>
        (receipt && i.receipt_id === receipt.id) ||
        i.invoice_id === invoice?.id,
    );
  const openIssues = issues.filter((i: Entity) => i.state === "open");
  const posted = receipt ? allocations(store, undefined, receipt.id) : [];
  function receiptDownload() {
    if (!receipt) return;
    const blob = makePdf(
      store.connected ? "Payment receipt" : "Sample payment receipt",
      [
        ["Receipt reference", receipt.id],
        ["Invoice", s(invoice?.number)],
        ["Client", clientName(store, invoice?.client_id)],
        ["Received", date(receipt.received_at)],
        ["Gross amount", money(receipt.gross)],
        ["Payment observation", label(receipt.observation_state)],
        [
          "Invoice allocation",
          money(
            amount(
              posted.reduce((sum, p) => sum + n(o(p.amount).amount_minor), 0),
              s(o(receipt.gross).currency),
            ),
          ),
        ],
      ],
      store.connected ? `Recorded provider: ${s(receipt.provider)}. Sandbox and Stripe test receipts do not represent live funds.` : "Sample receipt. This document is a local simulation, not evidence of real funds.",
    );
    downloadBlob(blob, `${receipt.id}.pdf`);
    store.notify("Receipt PDF prepared.");
  }
  return (
    <>
      <PageHead
        title={receipt ? "Payment receipt" : "Payment request"}
        description={`${clientName(store, invoice?.client_id)} · ${s(invoice?.number, "No invoice number")}`}
        action={
          receipt ? (
            <Button variant="secondary" onClick={receiptDownload}>
              <Download size={16} /> Download receipt
            </Button>
          ) : undefined
        }
      />
      <Link
        href={
          query.get("return")?.startsWith("/app/money/payments?")
            ? query.get("return")!
            : "/app/money/payments"
        }
        className="money-muted-link"
      >
        ← All payments
      </Link>
      <ErrorText value={error} />
      <div className="money-sheet">
        <div className="stack">
          <Panel>
            <span className="eyebrow">
              {receipt ? "OBSERVED GROSS" : "REQUESTED AMOUNT"}
            </span>
            <div className="money-hero-figure">
              {money(receipt?.gross || request?.expected)}
            </div>
            <Badge
              tone={statusTone(
                receipt ? receipt.reconciliation_state : request?.state,
              )}
            >
              {receipt
                ? label(receipt.reconciliation_state)
                : label(request?.state)}
            </Badge>
            <div className="money-details">
              {receipt ? (
                <>
                  <div>
                    <dt>Known fee</dt>
                    <dd>{receipt.fee ? money(receipt.fee) : "Unknown"}</dd>
                  </div>
                  <div>
                    <dt>Net cash</dt>
                    <dd>{receipt.net ? money(receipt.net) : "Unknown"}</dd>
                  </div>
                  <div>
                    <dt>Unallocated gross</dt>
                    <dd>
                      {money(
                        amount(
                          receiptRemaining(store, receipt),
                          s(o(receipt.gross).currency),
                        ),
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Received</dt>
                    <dd>{date(receipt.received_at)}</dd>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <dt>Request state</dt>
                    <dd>{label(request?.state)}</dd>
                  </div>
                  <div>
                    <dt>Expires</dt>
                    <dd>{date(request?.expires_at)}</dd>
                  </div>
                </>
              )}
            </div>
            <p className="money-note">
              {receipt
                ? "Invoices are settled using allocated gross. Processing fees and net cash do not reduce the gross amount owed."
                : "This is an expected payment request. No money is received or allocated by viewing or checking it."}
            </p>
          </Panel>
          {openIssues.map((issue: Entity) => (
            <Panel key={issue.id}>
              <div className="row">
                <AlertCircle size={20} />
                <h3>Payment needs a closer look</h3>
              </div>
              <p>{s(issue.summary)}</p>
              <Button onClick={() => patch({ issue: issue.id })}>
                Review payment issue
              </Button>
            </Panel>
          ))}
          <Panel>
            <h3>Invoice allocations</h3>
            {posted.length ? (
              posted.map((p) => (
                <div className="money-review-term" key={p.id}>
                  <Link href={`/app/money/invoices/${s(p.invoice_id)}`}>
                    {s(
                      store.record("invoices", s(p.invoice_id))?.number,
                      s(p.invoice_id),
                    )}
                  </Link>
                  <strong>{money(p.amount)}</strong>
                </div>
              ))
            ) : (
              <p className="muted">
                No gross amount has been allocated from this record.
              </p>
            )}
            {invoice && (
              <p>
                Invoice outstanding:{" "}
                <strong>
                  {money(
                    amount(invoiceBalance(store, invoice), s(invoice.currency)),
                  )}
                </strong>
              </p>
            )}
          </Panel>
        </div>
        <div className="stack money-side">
          <Panel>
            <h3>Next step</h3>
            <div className="actions">
              {receipt && receiptRemaining(store, receipt) > 0 && (
                <Button onClick={() => patch({ match: "1" })}>
                  Match receipt
                </Button>
              )}
              {!receipt &&
                ["pending", "unknown"].includes(s(request?.state)) && (
                  <Button
                    onClick={async () => {
                      const result = (await store.command("payment.check", {
                        id: request?.id,
                        expected_version: request?.version,
                      }));
                      if (result.ok) store.notify(result.message);
                      else setError(result.message);
                    }}
                  >
                    Check status
                  </Button>
                )}
              <Button
                variant="secondary"
                onClick={() => patch({ evidence: "1" })}
              >
                View evidence
              </Button>
              {invoice && (
                <LinkButton
                  href={`/app/money/invoices/${invoice.id}`}
                  variant="secondary"
                >
                  View invoice
                </LinkButton>
              )}
            </div>
          </Panel>
          <Panel>
            <History store={store} id={id} />
          </Panel>
        </div>
      </div>
      {query.get("evidence") === "1" && (
        <Modal
          title={store.connected ? "Payment evidence" : "Sample payment evidence"}
          onClose={() => patch({ evidence: null })}
        >
          <p>
            These are the stored source fields. Missing provider references
            remain unknown.
          </p>
          <div className="money-evidence">
            {JSON.stringify(
              {
                observation: receipt
                  ? {
                      provider: receipt.provider,
                      provider_event_id: receipt.provider_event_id,
                      received_at: receipt.received_at,
                      gross: receipt.gross,
                      fee: receipt.fee,
                      net: receipt.net,
                      evidence_source_id:
                        receipt.evidence_source_id || "Unknown",
                      state: receipt.observation_state,
                    }
                  : null,
                request: request
                  ? {
                      reference: request.id,
                      external_reference:
                        request.external_reference || "Unknown",
                      expected: request.expected,
                      state: request.state,
                      attempt: request.attempt,
                    }
                  : null,
              },
              null,
              2,
            )}
          </div>
        </Modal>
      )}
      {query.get("match") === "1" && receipt && (
        <MatchReceipt
          receipt={receipt}
          onClose={() => patch({ match: null })}
        />
      )}
      {query.get("issue") && (
        <IssueReview
          issue={
            store.record("finance_issues", query.get("issue") || "") ||
            openIssues[0]
          }
          receipt={receipt}
          invoice={invoice}
          onClose={() => patch({ issue: null })}
        />
      )}
    </>
  );
}
function MatchReceipt({
  receipt,
  onClose,
}: {
  receipt: Entity;
  onClose: () => void;
}) {
  const store = useStore();
  const sourceInvoice = receiptInvoice(store, receipt);
  const currency = s(o(receipt.gross).currency);
  const candidates = store
    .rows("invoices")
    .filter(
      (i: Entity) =>
        ["issued", "partially_paid"].includes(s(i.state)) &&
        i.client_id === sourceInvoice?.client_id &&
        i.currency === currency &&
        invoiceBalance(store, i) > 0,
    );
  const [selected, setSelected] = useState(candidates[0]?.id || "");
  const invoice = store.record("invoices", selected);
  const [value, setValue] = useState(
    displayAmount(
      Math.min(
        receiptRemaining(store, receipt),
        invoice ? invoiceBalance(store, invoice) : 0,
      ),
      currency,
    ),
  );
  const [operationId] = useState(() => sampleId("operation"));
  const [review, setReview] = useState<{
    amount: number;
    invoiceVersion: number;
    receiptVersion: number;
  } | null>(null);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  useDirtyGuard(dirty);
  function close() {
    if (dirty) setDiscard(true);
    else onClose();
  }
  function validate() {
    const minor = parseAmount(value, currency);
    if (
      !invoice ||
      minor === null ||
      minor <= 0 ||
      minor > receiptRemaining(store, receipt) ||
      minor > invoiceBalance(store, invoice)
    )
      return setError(
        "Choose an eligible invoice and a positive amount within both outstanding gross balances.",
      );
    setError("");
    setReview({
      amount: minor,
      invoiceVersion: invoice.version,
      receiptVersion: receipt.version,
    });
  }
  return (
    <>
      <Modal
        title={review ? "Confirm gross allocation" : "Match receipt"}
        onClose={close}
      >
        <div className="stack">
          <ErrorText value={error} />
          <p>
            Unallocated receipt:{" "}
            <strong>
              {money(amount(receiptRemaining(store, receipt), currency))}
            </strong>
          </p>
          {!candidates.length && (
            <p className="money-warning">
              No issued invoice matches this client and currency with a positive
              outstanding balance. This receipt cannot settle a different
              currency.
            </p>
          )}
          {review ? (
            <>
              <div className="money-review-term">
                <span>Invoice</span>
                <strong>{s(invoice?.number)}</strong>
              </div>
              <div className="money-review-term">
                <span>Allocate gross</span>
                <strong>{money(amount(review.amount, currency))}</strong>
              </div>
              <div className="money-review-term">
                <span>Invoice remaining</span>
                <strong>
                  {money(
                    amount(
                      invoiceBalance(store, invoice!) - review.amount,
                      currency,
                    ),
                  )}
                </strong>
              </div>
              <div className="money-review-term">
                <span>Receipt remaining</span>
                <strong>
                  {money(
                    amount(
                      receiptRemaining(store, receipt) - review.amount,
                      currency,
                    ),
                  )}
                </strong>
              </div>
              <p className="money-note">
                Known fee {receipt.fee ? money(receipt.fee) : "Unknown"}; net
                cash {receipt.net ? money(receipt.net) : "Unknown"}. Neither
                changes this gross allocation.
              </p>
              <div className="actions">
                <Button
                  onClick={async () => {
                    const result = (await store.command("finance.allocateReceipt", {
                      idempotency_key: operationId,
                      receipt_id: receipt.id,
                      invoice_id: selected,
                      amount_minor: review.amount,
                      expected_receipt_version: review.receiptVersion,
                      expected_invoice_version: review.invoiceVersion,
                      reason:
                        "Owner reviewed same-client and same-currency gross allocation",
                    }));
                    if (!result.ok) setError(result.message);
                    else {
                      store.notify(result.message);
                      onClose();
                    }
                  }}
                >
                  Confirm match
                </Button>
                <Button variant="secondary" onClick={() => setReview(null)}>
                  Edit match
                </Button>
              </div>
            </>
          ) : (
            <>
              <Field label="Invoice">
                <select
                  value={selected}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    setReview(null);
                    setDirty(true);
                  }}
                >
                  <option value="">Choose invoice</option>
                  {candidates.map((i: Entity) => (
                    <option key={i.id} value={i.id}>
                      {s(i.number)} ·{" "}
                      {money(amount(invoiceBalance(store, i), currency))}{" "}
                      outstanding
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={`Allocate gross amount (${currency})`}>
                <input
                  value={value}
                  inputMode="decimal"
                  onChange={(e) => {
                    setValue(e.target.value);
                    setDirty(true);
                  }}
                />
              </Field>
              <Button disabled={!candidates.length} onClick={validate}>
                Review match
              </Button>
            </>
          )}
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
        </div>
      </Modal>
      {discard && (
        <Confirm
          title="Discard allocation draft?"
          description="No amount has been allocated yet."
          onClose={() => setDiscard(false)}
          onConfirm={onClose}
        />
      )}
    </>
  );
}
function IssueReview({
  issue,
  receipt,
  invoice,
  onClose,
}: {
  issue?: Entity;
  receipt?: Entity;
  invoice?: Entity;
  onClose: () => void;
}) {
  const store = useStore();
  const router = useRouter();
  const [action, setAction] = useState("request_information");
  const [note, setNote] = useState("");
  const [url, setUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [original, setOriginal] = useState("");
  const [checked, setChecked] = useState(receipt?.id || "");
  if (!issue)
    return (
      <Modal title="Issue unavailable" onClose={onClose}>
        <p>No open issue belongs to this payment.</p>
      </Modal>
    );
  const candidates = store
    .rows("receipts")
    .filter(
      (r: Entity) =>
        ["sample_confirmed", "provider_confirmed"].includes(s(r.observation_state)) &&
        o(r.gross).currency === invoice?.currency &&
        receiptInvoice(store, r)?.client_id === invoice?.client_id &&
        receiptRemaining(store, r) > 0,
    );
  const originals = store
    .rows("receipts")
    .filter(
      (r: Entity) =>
        r.id !== receipt?.id &&
        r.provider_event_id &&
        r.provider_event_id === receipt?.provider_event_id &&
        r.provider === receipt?.provider &&
        JSON.stringify(r.gross) === JSON.stringify(receipt?.gross),
    );
  async function validate() {
    if (note.trim().length < 3)
      return setError("Add a resolution note of at least 3 characters.");
    if (action === "attach_evidence") {
      if (!files.length && !url.trim())
        return setError("Attach real supporting files or enter a source URL.");
      if (url && !/^https?:\/\/[^\s]+$/i.test(url))
        return setError("Use a valid http or https source URL.");
      for (const file of files) {
        const problem = await validateUpload(file);
        if (problem) return setError(problem);
      }
    }
    if (
      action === "dismiss_duplicate" &&
      !originals.some((r: Entity) => r.id === original)
    )
      return setError(
        "A proven original with the same provider event and content is required.",
      );
    if (
      action === "allocate_checked_receipt" &&
      !candidates.some((r: Entity) => r.id === checked)
    )
      return setError(
        "Choose a confirmed, unallocated receipt matching this client and currency.",
      );
    setError("");
    setReview(true);
  }
  async function confirm() {
    setBusy(true);
    try {
      if (action === "allocate_checked_receipt") {
        onClose();
        router.push(`/app/money/payments/${checked}?match=1`);
        return;
      }
      const evidenceIds: string[] = [];
      if (action === "attach_evidence") {
        for (const file of files) {
          const upload = await persistUpload(file);
          const saved = (await store.command("record.save", {
            table: "attachments",
            values: {
              original_filename: upload.name,
              filename: upload.name,
              media_type: upload.type,
              byte_size: upload.size,
              sha256: upload.sha256,
              storage_kind: "local_blob",
              storage_locator: upload.id,
              availability: "available",
              origin: "manual_attachment",
              audience: "owner",
            },
          }));
          if (!saved.ok || !saved.id) throw new Error(saved.message);
          evidenceIds.push(saved.id);
        }
      }
      const result = (await store.command("finance.resolveIssue", {
        id: issue!.id,
        expected_version: issue!.version,
        action,
        note: note.trim(),
        evidence_ids: evidenceIds,
        evidence_url: url || null,
        original_receipt_id: original || null,
      }));
      if (!result.ok) throw new Error(result.message);
      store.notify(result.message);
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The action failed. Your financial records were not marked paid.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Review payment issue" onClose={onClose}>
      <div className="stack">
        <ErrorText value={error} />
        <p>{s(issue.summary)}</p>
        <div className="money-review-term">
          <span>Expected invoice gross</span>
          <strong>
            {invoice
              ? money(amount(invoiceGross(store, invoice), s(invoice.currency)))
              : "Unknown"}
          </strong>
        </div>
        <div className="money-review-term">
          <span>Observed gross</span>
          <strong>{receipt ? money(receipt.gross) : "Unknown"}</strong>
        </div>
        <div className="money-review-term">
          <span>Outstanding invoice gross</span>
          <strong>
            {invoice
              ? money(
                  amount(invoiceBalance(store, invoice), s(invoice.currency)),
                )
              : "Unknown"}
          </strong>
        </div>
        {!review ? (
          <>
            <Field label="Resolution">
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                <option value="request_information">Prepare follow-up</option>
                <option value="attach_evidence">Attach evidence</option>
                <option value="allocate_checked_receipt">
                  Allocate checked receipt
                </option>
                <option value="dismiss_duplicate">Link proven duplicate</option>
                <option value="mark_not_a_match">Not a match</option>
              </select>
            </Field>
            <Field label="Resolution note">
              <textarea
                className="resize-none"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={1500}
                rows={3}
              />
            </Field>
            {action === "attach_evidence" && (
              <>
                <Field label="Evidence files">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.txt"
                    multiple
                    onChange={(e) => {
                      const next = Array.from(e.target.files || []);
                      if (next.length > 5) {
                        setFiles([]);
                        setError("Select no more than five files.");
                      } else {
                        setFiles(next);
                        setError("");
                      }
                    }}
                  />
                </Field>
                <Field label="Evidence source URL">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    maxLength={2000}
                    placeholder="https://"
                  />
                </Field>
              </>
            )}
            {action === "dismiss_duplicate" && (
              <Field label="Original receipt">
                <select
                  value={original}
                  onChange={(e) => setOriginal(e.target.value)}
                >
                  <option value="">Choose proven original</option>
                  {originals.map((r: Entity) => (
                    <option key={r.id} value={r.id}>
                      {r.id}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {action === "allocate_checked_receipt" && (
              <Field label="Checked receipt">
                <select
                  value={checked}
                  onChange={(e) => setChecked(e.target.value)}
                >
                  <option value="">Choose matching receipt</option>
                  {candidates.map((r: Entity) => (
                    <option key={r.id} value={r.id}>
                      {r.id} · {money(r.gross)}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Button onClick={async () => void (await validate())}>Review resolution</Button>
          </>
        ) : (
          <>
            <div className="money-note">
              <strong>{label(action)}</strong>
              <p>{note}</p>
              <p>
                {action === "request_information"
                  ? "Creates an unsent follow-up draft. The issue remains open and balances stay unchanged."
                  : action === "attach_evidence"
                    ? "Attaches supporting evidence. The issue remains open; no receipt or expense is invented."
                    : action === "allocate_checked_receipt"
                      ? "Opens the separate allocation review. Only confirming that allocation can settle an invoice."
                      : action === "dismiss_duplicate"
                        ? "Links the proven duplicate observation. No genuine money is deleted or reallocated."
                        : "Closes this mistaken match issue. The receipt remains unmatched and invoice debt remains unchanged."}
              </p>
            </div>
            <div className="actions">
              <Button disabled={busy} onClick={async () => void (await confirm())}>
                {busy ? "Saving…" : "Confirm resolution"}
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setReview(false)}
              >
                Edit resolution
              </Button>
            </div>
          </>
        )}
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          Keep issue open
        </Button>
      </div>
    </Modal>
  );
}
function effectiveExpenseDate(store: Store, expense: Entity): string {
  const correction = store.record(
    "expense_corrections",
    s(expense.latest_correction_id),
  );
  return s(correction?.expense_date, s(expense.expense_date, s(expense.date)));
}
function effectiveExpense(store: Store, expense: Entity): number {
  return (
    n(o(expense.amount).amount_minor) +
    store
      .rows("expense_corrections")
      .filter(
        (c: Entity) => c.expense_id === expense.id && c.state === "posted",
      )
      .reduce((sum: number, c: Entity) => sum + n(c.delta_minor), 0)
  );
}
function ExpensesList() {
  const store = useStore();
  const { query, patch, router } = useQuery();
  const q = query.get("q") || "";
  const cat = query.get("category") || "all";
  const state = query.get("state") || "all";
  const currency = query.get("currency") || "all";
  const from = query.get("from") || "";
  const to = query.get("to") || "";
  const [period, setPeriod] = useState(false);
  const [fromDraft, setFromDraft] = useState(from);
  const [toDraft, setToDraft] = useState(to);
  const [dateError, setDateError] = useState("");
  const [undo, setUndo] = useState<Entity | null>(null);
  const [error, setError] = useState("");
  const all = store.rows("expenses");
  const rows = all
    .filter(
      (e: Entity) =>
        `${s(e.description)} ${s(e.provider)} ${recordName(store.record("projects", s(e.project_id)))}`
          .toLowerCase()
          .includes(q.trim().toLowerCase()) &&
        (cat === "all" || category(e.category) === cat) &&
        (currency === "all" || o(e.amount).currency === currency) &&
        (state === "archived"
          ? !!e.archived_at
          : !e.archived_at &&
            (state === "all" || classification(e) === state)) &&
        (!from || effectiveExpenseDate(store, e) >= from) &&
        (!to || effectiveExpenseDate(store, e) <= to),
    )
    .sort(
      (x: Entity, y: Entity) =>
        effectiveExpenseDate(store, y).localeCompare(
          effectiveExpenseDate(store, x),
        ) || x.id.localeCompare(y.id),
    );
  const expenseId = query.get("expense");
  const selected = expenseId ? store.record("expenses", expenseId) : undefined;
  async function archive(expense: Entity) {
    const result = (await store.command("record.archive", {
      table: "expenses",
      id: expense.id,
      expected_version: expense.version,
    }));
    if (!result.ok) setError(result.message);
    else {
      setUndo({ ...expense, version: expense.version + 1 });
      store.notify("Expense archived. Its financial history is preserved.");
    }
  }
  return (
    <>
      <PageHead
        title="Expenses"
        description="Keep the cost of your business in view."
        action={
          <Button onClick={() => patch({ expense: "new" })}>
            <Plus size={16} /> Add expense
          </Button>
        }
      />
      <MoneyTabs />
      <div
        className="row"
        style={{
          justifyContent: "space-between",
          alignItems: "start",
          flexWrap: "wrap",
        }}
      >
        <AmountGroups
          caption="Recorded costs · filtered"
          values={rows
            .filter((e: Entity) => classification(e) === "recorded")
            .map((e: Entity) =>
              amount(effectiveExpense(store, e), s(o(e.amount).currency)),
            )}
        />
        <AmountGroups
          caption="Estimated costs · filtered"
          values={rows
            .filter((e: Entity) => classification(e) === "estimated")
            .map((e: Entity) =>
              amount(effectiveExpense(store, e), s(o(e.amount).currency)),
            )}
        />
      </div>
      <ErrorText value={error} />
      {undo && (
        <div className="money-receipt-row" role="status">
          <span>{s(undo.description)} archived.</span>
          <Button
            variant="secondary"
            onClick={async () => {
              const current = store.record("expenses", undo.id);
              if (current?.version !== undo.version) {
                setError(
                  "This expense changed after archiving. Open its current version before restoring it.",
                );
                return;
              }
              const result = (await store.command("record.save", {
                table: "expenses",
                id: undo.id,
                expected_version: current?.version,
                values: { archived_at: null, archived: false },
              }));
              if (!result.ok) setError(result.message);
              else {
                setUndo(null);
                store.notify("Archive undone.");
              }
            }}
          >
            Undo archive
          </Button>
        </div>
      )}
      <Panel>
        <div className="money-filter">
          <Field label="Search expenses">
            <input
              value={q}
              onChange={(e) => patch({ q: e.target.value, page: null })}
              maxLength={200}
              placeholder="Expense or project"
            />
          </Field>
          <FilterField
            label="Category"
            value={cat}
            options={["all", "software", "fees", "services", "other"].map(
              (v) => [v, label(v)],
            )}
            onChange={(v) => patch({ category: v, page: null })}
          />
          <FilterField
            label="Expense state"
            value={state}
            options={["all", "estimated", "recorded", "archived"].map((v) => [
              v,
              v === "all" ? "All active" : label(v),
            ])}
            onChange={(v) => patch({ state: v, page: null })}
          />
          <FilterField
            label="Currency"
            value={currency}
            options={["all", "USD", "IDR"].map((v) => [
              v,
              v === "all" ? "All currencies" : v,
            ])}
            onChange={(v) => patch({ currency: v, page: null })}
          />
          <Button
            variant="secondary"
            onClick={() => {
              setFromDraft(from);
              setToDraft(to);
              setPeriod(true);
            }}
          >
            {from || to ? "Edit date range" : "Date range"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push("/app/money/expenses")}
          >
            Clear filters
          </Button>
          <Button variant="secondary" onClick={() => patch({ export: "1" })}>
            <Download size={16} /> Export
          </Button>
        </div>
        {from || to ? (
          <p className="money-subtitle">
            {from ? date(from) : "Any start"} to {to ? date(to) : "Any end"}
          </p>
        ) : null}
        {rows.length ? (
          <div className="money-scroll">
            <table className="money-ledger">
              <thead>
                <tr>
                  <th>Expense</th>
                  <th>Type</th>
                  <th className="optional-column">Date</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows(rows, query.get("page")).map((e) => (
                  <tr key={e.id}>
                    <td>
                      <Link
                        href={`/app/money/expenses?${new URLSearchParams({ ...Object.fromEntries(query.entries()), expense: e.id }).toString()}`}
                      >
                        {s(e.description)}
                      </Link>
                      <small>
                        {label(category(e.category))}
                        {e.attachment_id ? " · Receipt linked" : ""}
                      </small>
                    </td>
                    <td>
                      <Badge>
                        {e.archived_at ? "Archived" : label(classification(e))}
                      </Badge>
                    </td>
                    <td className="optional-column">
                      {date(effectiveExpenseDate(store, e))}
                    </td>
                    <td className="money-number">
                      {money(
                        amount(
                          effectiveExpense(store, e),
                          s(o(e.amount).currency),
                        ),
                      )}
                    </td>
                    <td>
                      <div className="money-row-actions">
                        <Button
                          variant="secondary"
                          aria-label={`Open expense ${s(e.description)}`}
                          onClick={() => patch({ expense: e.id })}
                        >
                          <ArrowUpRight size={16} />
                        </Button>
                        {!e.archived_at && (
                          <Button
                            variant="secondary"
                            aria-label={`Archive expense ${s(e.description)}`}
                            onClick={() => archive(e)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={
              all.length
                ? "No expenses match these filters."
                : "A little clarity on business costs."
            }
            description={
              all.length
                ? "Try a wider date range or another category."
                : "Track estimates separately from manually recorded costs."
            }
          >
            <Button
              variant="secondary"
              onClick={() =>
                all.length
                  ? router.push("/app/money/expenses")
                  : patch({ expense: "new" })
              }
            >
              {all.length ? "Clear filters" : "Add expense"}
            </Button>
          </Empty>
        )}
        <Pager count={rows.length} />
      </Panel>
      {expenseId &&
        (expenseId === "new" || selected ? (
          <ExpenseEditor
            expense={selected}
            onClose={() =>
              patch({ expense: null, receipt: null, correction: null })
            }
          />
        ) : (
          <Modal
            title="Expense unavailable"
            onClose={() => patch({ expense: null })}
          >
            <p>No expense with that ID exists in this scenario.</p>
          </Modal>
        ))}
      {query.get("export") === "1" && (
        <ExpenseExport
          filtered={rows}
          onClose={() => patch({ export: null })}
        />
      )}
      {period && (
        <Modal title="Expense date range" onClose={() => setPeriod(false)}>
          <div className="stack">
            <ErrorText value={dateError} />
            <div className="money-date-range">
              <Field label="From">
                <input
                  type="date"
                  value={fromDraft}
                  onChange={(e) => setFromDraft(e.target.value)}
                />
              </Field>
              <Field label="To">
                <input
                  type="date"
                  value={toDraft}
                  onChange={(e) => setToDraft(e.target.value)}
                />
              </Field>
            </div>
            <div className="actions">
              <Button
                onClick={() => {
                  if (fromDraft && toDraft && fromDraft > toDraft)
                    setDateError(
                      "The start date must be on or before the end date.",
                    );
                  else {
                    patch({ from: fromDraft, to: toDraft, page: null });
                    setPeriod(false);
                    setDateError("");
                  }
                }}
              >
                Apply range
              </Button>
              <Button variant="secondary" onClick={() => setPeriod(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
function ExpenseEditor({
  expense,
  onClose,
}: {
  expense?: Entity;
  onClose: () => void;
}) {
  const store = useStore();
  const { query, patch } = useQuery();
  const [baseVersion] = useState(expense?.version);
  const [operationId] = useState(() => sampleId("operation"));
  const [name, setName] = useState(s(expense?.description));
  const [cat, setCat] = useState(category(expense?.category));
  const [type, setType] = useState(
    expense ? classification(expense) : "estimated",
  );
  const [currency, setCurrency] = useState(
    s(o(expense?.amount).currency, "USD"),
  );
  const [value, setValue] = useState(
    expense
      ? displayAmount(
          effectiveExpense(store, expense),
          s(o(expense.amount).currency),
        )
      : "",
  );
  const [day, setDay] = useState(
    expense
      ? effectiveExpenseDate(store, expense)
      : store.state.sample_clock.slice(0, 10),
  );
  const [project, setProject] = useState(s(expense?.project_id));
  const [basis, setBasis] = useState(s(expense?.basis));
  const [provider, setProvider] = useState(s(expense?.provider));
  const [reason, setReason] = useState("");
  const [reviewCorrection, setReviewCorrection] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [newCurrency, setNewCurrency] = useState("");
  useDirtyGuard(dirty);
  const recorded = !!expense && classification(expense) === "recorded";
  const correction = query.get("correction") === "1";
  const sampleDay = store.state.sample_clock.slice(0, 10);
  const attached = expense
    ? store.record("attachments", s(expense.attachment_id))
    : undefined;
  useDirtyGuard(dirty);
  function close() {
    if (dirty) setDiscard(true);
    else onClose();
  }
  function validate(): number | null {
    const minor = parseAmount(value, currency);
    if (!name.trim() || name.length > 160) {
      setError("Enter an expense name, up to 160 characters.");
      return null;
    }
    if (minor === null || minor <= 0) {
      setError(
        `Enter a positive ${currency} amount with ${currency === "USD" ? "at most two decimal places" : "no decimals"}.`,
      );
      return null;
    }
    if (
      !day ||
      Number.isNaN(new Date(day).getTime()) ||
      (type === "recorded" && day > sampleDay)
    ) {
      setError(
        "Recorded expenses need a valid date no later than the sample date. Use an estimate for future costs.",
      );
      return null;
    }
    if (type === "recorded" && !basis.trim() && !recorded) {
      setError("Add the evidence or note supporting this manual record.");
      return null;
    }
    if (correction && reason.trim().length < 3) {
      setError("Explain the correction in at least 3 characters.");
      return null;
    }
    setError("");
    return minor;
  }
  async function save() {
    const minor = validate();
    if (minor === null) return;
    if (correction && !reviewCorrection) {
      setReviewCorrection(true);
      return;
    }
    const result = correction
      ? (await store.command("expense.correct", {
          id: expense?.id,
          idempotency_key: operationId,
          expected_version: baseVersion,
          revised_amount_minor: minor,
          currency,
          reason: reason.trim(),
          expense_date: day,
        }))
      : (await store.command("record.save", {
          table: "expenses",
          id: expense?.id,
          idempotency_key: operationId,
          expected_version: baseVersion,
          values: {
            description: name.trim(),
            category: cat,
            classification: type,
            amount: recorded ? expense!.amount : amount(minor, currency),
            expense_date: recorded ? expense!.expense_date : day,
            project_id: project || null,
            provider: provider.trim(),
            basis: basis.trim(),
            paid: expense ? b(expense.paid) : false,
            source: expense?.source || "manual",
            attachment_id: expense?.attachment_id || null,
          },
        }));
    if (!result.ok) return setError(result.message);
    store.notify(result.message);
    setDirty(false);
    onClose();
  }
  function change(setter: (v: string) => void, v: string) {
    setter(v);
    setDirty(true);
    setReviewCorrection(false);
  }
  return (
    <>
      <Modal
        title={
          correction
            ? "Correct recorded expense"
            : expense
              ? "Expense details"
              : "Add expense"
        }
        onClose={close}
      >
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <ErrorText value={error} />
          {recorded && !correction && (
            <p className="money-note">
              This is a recorded cost. Its original amount and date stay in
              history; use a correcting entry to change them. Manual records are
              not bank verification.
            </p>
          )}
          {correction && expense && (
            <div className="money-readonly">
              Original effective amount:{" "}
              <strong>
                {money(amount(effectiveExpense(store, expense), currency))}
              </strong>
              <br />
              Original date: {date(expense.expense_date || expense.date)}
            </div>
          )}
          {reviewCorrection ? (
            <div className="money-warning">
              Reviewed correction:{" "}
              {money(amount(effectiveExpense(store, expense!), currency))} →{" "}
              {money(amount(parseAmount(value, currency) || 0, currency))}.
              Accounting delta:{" "}
              {money(
                amount(
                  (parseAmount(value, currency) || 0) -
                    effectiveExpense(store, expense!),
                  currency,
                ),
              )}
              . This changes the ledger only; no refund or payment occurs.
            </div>
          ) : null}
          <Field label="Expense name">
            <input
              value={name}
              onChange={(e) => change(setName, e.target.value)}
              maxLength={160}
              required
              readOnly={correction}
            />
          </Field>
          <div className="money-two-fields">
            <Field label="Category">
              <select
                value={cat}
                onChange={(e) => change(setCat, e.target.value)}
                disabled={correction}
              >
                {["software", "fees", "services", "other"].map((c) => (
                  <option value={c} key={c}>
                    {label(c)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Type">
              <select
                value={type}
                onChange={(e) => change(setType, e.target.value)}
                disabled={recorded}
              >
                <option value="estimated">Estimated cost</option>
                <option value="recorded">Recorded expense</option>
              </select>
            </Field>
            <Field label="Currency">
              <select
                value={currency}
                disabled={recorded}
                onChange={(e) =>
                  value
                    ? setNewCurrency(e.target.value)
                    : change(setCurrency, e.target.value)
                }
              >
                <option>USD</option>
                <option>IDR</option>
              </select>
            </Field>
            <Field
              label={
                correction
                  ? `Revised amount (${currency})`
                  : `Amount (${currency})`
              }
            >
              <input
                value={value}
                inputMode="decimal"
                onChange={(e) => change(setValue, e.target.value)}
                readOnly={recorded && !correction}
                required
              />
            </Field>
            <Field label="Expense date">
              <input
                value={day}
                type="date"
                max={type === "recorded" ? sampleDay : undefined}
                onChange={(e) => change(setDay, e.target.value)}
                readOnly={recorded && !correction}
                required
              />
            </Field>
            <Field label="Provider or merchant">
              <input
                value={provider}
                onChange={(e) => change(setProvider, e.target.value)}
                maxLength={160}
                readOnly={correction}
              />
            </Field>
          </div>
          <p className="money-upload-info">
            {type === "estimated"
              ? "Estimates are planned costs, shown separately from recorded expenses."
              : "This records your stated cost. It does not confirm a bank transfer."}
          </p>
          <Field label="Project">
            <select
              value={project}
              onChange={(e) => change(setProject, e.target.value)}
              disabled={correction}
            >
              <option value="">General business overhead</option>
              {store.rows("projects").map((p: Entity) => (
                <option value={p.id} key={p.id}>
                  {s(p.title)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Evidence or note">
            <textarea
              className="resize-none"
              value={basis}
              onChange={(e) => change(setBasis, e.target.value)}
              maxLength={2000}
              rows={3}
              readOnly={correction}
            />
          </Field>
          {correction && (
            <Field label="Correction reason">
              <textarea
                className="resize-none"
                value={reason}
                onChange={(e) => change(setReason, e.target.value)}
                maxLength={1500}
                rows={3}
                required
              />
            </Field>
          )}
          {expense && !correction && (
            <div className="money-receipt-row">
              <div>
                <strong>
                  {attached
                    ? s(
                        attached.original_filename,
                        s(attached.filename, "Receipt attachment"),
                      )
                    : "No receipt attached"}
                </strong>
                <p className="money-upload-info">
                  {attached
                    ? "Local evidence · availability checked on opening"
                    : "Add actual evidence when you have it."}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => patch({ receipt: "1" })}
              >
                <Paperclip size={16} />{" "}
                {attached ? "View receipt" : "Attach receipt"}
              </Button>
            </div>
          )}
          <div className="actions money-form-footer">
            <Button type="submit">
              {correction
                ? reviewCorrection
                  ? "Save correction"
                  : "Review correction"
                : "Save expense"}
            </Button>
            {recorded && !correction && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => patch({ correction: "1" })}
              >
                Create correction
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
      {query.get("receipt") === "1" && expense && (
        <ReceiptAttachment
          expense={expense}
          onClose={() => patch({ receipt: null })}
        />
      )}
      {discard && (
        <Confirm
          title="Discard expense edits?"
          description="The saved expense stays unchanged."
          onClose={() => setDiscard(false)}
          onConfirm={onClose}
        />
      )}
      {newCurrency && (
        <Confirm
          title={`Change to ${newCurrency}?`}
          description="The amount will be cleared so you can enter it in the selected currency. No conversion is applied."
          onClose={() => setNewCurrency("")}
          onConfirm={() => {
            setCurrency(newCurrency);
            setValue("");
            setDirty(true);
            setNewCurrency("");
          }}
        />
      )}
    </>
  );
}
function ReceiptAttachment({
  expense,
  onClose,
}: {
  expense: Entity;
  onClose: () => void;
}) {
  const store = useStore();
  const attachment = store.record("attachments", s(expense.attachment_id));
  const [file, setFile] = useState<File | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [detached, setDetached] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true);
    setBlob(null);
    if (attachment)
      attachmentBlob(attachment)
        .then((result) => {
          if (active) {
            setBlob(result);
            setLoading(false);
          }
        })
        .catch(() => {
          if (active) {
            setError("Could not read this receipt. Try opening it again.");
            setLoading(false);
          }
        });
    else setLoading(false);
    return () => {
      active = false;
    };
  }, [attachment]);
  useEffect(() => {
    if (!blob) {
      setUrl("");
      setText("");
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    if (blob.type === "text/plain") void blob.text().then(setText);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  async function choose(next: File | null) {
    setFile(next);
    setError("");
    if (next) {
      const problem = await validateUpload(next);
      if (problem) setError(problem);
    }
  }
  async function save() {
    if (!file) return;
    setBusy(true);
    try {
      const upload = await persistUpload(file);
      const saved = (await store.command("record.save", {
        table: "attachments",
        values: {
          original_filename: upload.name,
          filename: upload.name,
          media_type: upload.type,
          byte_size: upload.size,
          sha256: upload.sha256,
          storage_kind: "local_blob",
          storage_locator: upload.id,
          availability: "available",
          origin: "manual_attachment",
          audience: "owner",
          previous_attachment_id: expense.attachment_id || null,
        },
      }));
      if (!saved.ok || !saved.id) throw new Error(saved.message);
      const linked = (await store.command("record.save", {
        table: "expenses",
        id: expense.id,
        expected_version: expense.version,
        values: { attachment_id: saved.id },
      }));
      if (!linked.ok) throw new Error(linked.message);
      setFile(null);
      store.notify(
        "Actual receipt bytes saved locally. Expense settlement is unchanged.",
      );
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save the receipt. Retry with this file.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Expense receipt" onClose={onClose}>
      <div className="stack">
        <ErrorText value={error} />
        {attachment && (
          <>
            <h3>{s(attachment.original_filename, s(attachment.filename))}</h3>
            <p className="money-upload-info">
              Manual attachment · original bytes
            </p>
            {loading ? (
              <p>Reading local receipt…</p>
            ) : blob ? (
              <>
                {blob.type.startsWith("image/") ? (
                  <img
                    src={url}
                    alt="Expense receipt"
                    className="money-photo"
                  />
                ) : blob.type === "text/plain" ? (
                  <pre className="money-evidence">{text}</pre>
                ) : blob.type === "application/pdf" ? (
                  <iframe
                    title="Receipt PDF"
                    src={url}
                    className="money-preview"
                  />
                ) : (
                  <p>Preview unavailable. Download the original file.</p>
                )}
                <Button
                  variant="secondary"
                  onClick={() =>
                    downloadBlob(
                      blob,
                      s(
                        attachment.original_filename,
                        s(attachment.filename, "receipt"),
                      ),
                    )
                  }
                >
                  <Download size={16} /> Download receipt
                </Button>
              </>
            ) : (
              <p className="money-warning">
                Receipt metadata exists, but its bytes are unavailable in this
                browser. Replace it with the original file to enable download.
              </p>
            )}
            <Button
              variant="secondary"
              disabled={!!expense.historical_evidence_locked}
              onClick={async () => {
                const result = (await store.command("record.save", {
                  table: "expenses",
                  id: expense.id,
                  expected_version: expense.version,
                  values: { attachment_id: null },
                }));
                if (!result.ok) setError(result.message);
                else {
                  setDetached(attachment.id);
                  store.notify(
                    "Current attachment detached. Historical file versions remain.",
                  );
                }
              }}
            >
              Remove current attachment
            </Button>
          </>
        )}
        {detached && (
          <Button
            variant="secondary"
            onClick={async () => {
              const current = store.record("expenses", expense.id);
              const result = (await store.command("record.save", {
                table: "expenses",
                id: expense.id,
                expected_version: current?.version,
                values: { attachment_id: detached },
              }));
              if (!result.ok) setError(result.message);
              else {
                setDetached("");
                store.notify("Attachment restored.");
              }
            }}
          >
            Undo attachment removal
          </Button>
        )}
        <Field label={attachment ? "Replace receipt" : "Attach receipt"}>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.txt"
            onChange={async (e) => void (await choose(e.target.files?.[0] || null))}
          />
        </Field>
        <p className="money-upload-info">
          One PDF, PNG, JPEG or TXT, up to 10 MiB. Replacements keep earlier
          evidence versions. Attaching a file does not confirm a payment.
        </p>
        {file && (
          <p>
            {file.name} · {(file.size / 1024).toFixed(1)} KiB
          </p>
        )}
        <div className="actions">
          <Button
            disabled={!file || !!error || busy}
            onClick={async () => void (await save())}
          >
            {busy ? "Saving actual file…" : "Save receipt"}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
function ExpenseExport({
  filtered,
  onClose,
}: {
  filtered: Entity[];
  onClose: () => void;
}) {
  const store = useStore();
  const [scope, setScope] = useState("filtered");
  const [format, setFormat] = useState("csv");
  const [estimates, setEstimates] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [snapshot] = useState(
    filtered.map((e) => ({ id: e.id, version: e.version })),
  );
  const rows = useMemo(
    () =>
      (scope === "filtered" ? filtered : store.rows("expenses")).filter(
        (e: Entity) => estimates || classification(e) !== "estimated",
      ),
    [scope, filtered, store, estimates],
  );
  const [receiptCheck, setReceiptCheck] = useState<{
    included: number;
    missing: number;
  } | null>(null);
  useEffect(() => {
    if (format !== "zip") return;
    let active = true;
    setReceiptCheck(null);
    void Promise.all(
      rows.map(async (e: Entity) => {
        const meta = store.record("attachments", s(e.attachment_id));
        return meta ? !!(await attachmentBlob(meta)) : false;
      }),
    )
      .then((available) => {
        if (active)
          setReceiptCheck({
            included: available.filter(Boolean).length,
            missing: available.filter((v) => !v).length,
          });
      })
      .catch(() => {
        if (active)
          setError(
            "Could not inspect receipt availability. Close and reopen the export.",
          );
      });
    return () => {
      active = false;
    };
  }, [format, rows, store]);
  async function generate() {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      if (
        scope === "filtered" &&
        snapshot.some(
          (e) => store.record("expenses", e.id)?.version !== e.version,
        )
      )
        throw new Error(
          "A scoped expense changed. Close and reopen export to review a fresh scope.",
        );
      const day = store.state.sample_clock.slice(0, 10);
      if (format === "csv") {
        downloadCsv(
          `Crewmori_Expenses_${day}.csv`,
          [
            "date",
            "expense_id",
            "description",
            "category",
            "type",
            "currency",
            "amount_minor",
            "amount_display",
            "project_id",
            "archived_at",
            "receipt_status",
          ],
          rows.map((e: Entity) => [
            effectiveExpenseDate(store, e),
            e.id,
            s(e.description),
            category(e.category),
            classification(e),
            s(o(e.amount).currency),
            effectiveExpense(store, e),
            displayAmount(effectiveExpense(store, e), s(o(e.amount).currency)),
            s(e.project_id),
            s(e.archived_at),
            e.attachment_id
              ? "linked; availability not verified in CSV"
              : "no attachment",
          ]),
        );
        setStatus(
          `CSV prepared with ${rows.length} expenses. Exact minor units and classifications are included.`,
        );
      } else {
        const files: Record<string, Uint8Array | string> = {};
        const manifest: Array<Record<string, unknown>> = [];
        let missing = 0;
        let totalSize = 0;
        for (const e of rows) {
          const attachment = store.record("attachments", s(e.attachment_id));
          const blob = attachment ? await attachmentBlob(attachment) : null;
          if (blob) {
            totalSize += blob.size;
            if (totalSize > 100 * 1024 * 1024)
              throw new Error(
                "This archive exceeds 100 MiB. Export a smaller filtered range.",
              );
            const bytes = await blob.arrayBuffer();
            const filename = `${e.id}_${safeFilename(s(attachment?.original_filename, s(attachment?.filename, "receipt")))}`;
            files[filename] = new Uint8Array(bytes);
            manifest.push({
              expense_id: e.id,
              expense_version: e.version,
              attachment_id: attachment?.id,
              filename,
              sha256: await hashBytes(bytes),
              size: blob.size,
              status: "included",
            });
          } else {
            missing++;
            manifest.push({
              expense_id: e.id,
              expense_version: e.version,
              attachment_id: e.attachment_id || null,
              status: "missing",
              reason: attachment
                ? "Metadata exists but original bytes are unavailable"
                : "No receipt attached",
            });
          }
        }
        files["manifest.json"] = JSON.stringify(
          {
            title: missing ? "Partial receipt archive" : "Receipt archive",
            generated_sample_date: day,
            scope,
            count: rows.length,
            missing_receipts: missing,
            records: manifest,
          },
          null,
          2,
        );
        downloadZip(
          `Crewmori_${missing ? "Partial_" : ""}Receipts_${day}.zip`,
          files,
        );
        setStatus(
          `${missing ? "Partial receipt archive" : "Receipt archive"} prepared. ${rows.length - missing} files included; ${missing} missing receipts documented in manifest.json.`,
        );
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Export failed. Try generating the same scope again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Export expenses" onClose={onClose}>
      <div className="stack">
        <ErrorText value={error} />
        <Field label="Export scope">
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="filtered">Current filtered results</option>
            <option value="all">All expenses including archived</option>
          </select>
        </Field>
        <Field label="Format">
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="csv">Expenses CSV</option>
            <option value="zip">Receipt ZIP</option>
          </select>
        </Field>
        <label className="money-inline-checkbox">
          <input
            type="checkbox"
            checked={estimates}
            onChange={(e) => setEstimates(e.target.checked)}
          />
          Include estimates
        </label>
        <p>
          <strong>{rows.length} expenses</strong> in this scope.
        </p>
        <AmountGroups
          caption="Export scope"
          values={rows.map((e: Entity) =>
            amount(effectiveExpense(store, e), s(o(e.amount).currency)),
          )}
        />
        {format === "zip" && (
          <p className="money-note">
            {receiptCheck
              ? `${receiptCheck.included} receipts available; ${receiptCheck.missing} missing. ${receiptCheck.missing ? "This will be a partial receipt archive." : "All scoped receipt bytes are available."}`
              : "Checking original receipt bytes…"}{" "}
            The manifest records missing receipts and SHA-256 hashes.
          </p>
        )}
        {status && (
          <p className="money-note" role="status">
            {status}
          </p>
        )}
        <div className="actions">
          <Button
            disabled={busy || (format === "zip" && !receiptCheck)}
            onClick={async () => void (await generate())}
          >
            {busy
              ? "Generating…"
              : error
                ? "Try export again"
                : "Generate download"}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

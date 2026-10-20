"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { Entity, s, n, b, a, o, label, optionLabel, date } from "@/lib/types";
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
import {
  validateUpload,
  persistUpload,
  attachmentBlob,
  downloadBlob,
} from "@/lib/downloads";
import { amendmentSchedule } from "@/lib/engine";
import { localDateTime, zonedDateTime } from "@/lib/business-time";
import { calendarOverlapFingerprint } from "@/lib/work-commands";
import type { UploadedFile } from "@/lib/downloads";
import "./work.css";

const terminal = ["completed", "cancelled", "archived"];
const statuses = [
  "awaiting_prerequisites",
  "ready_to_start",
  "active",
  "blocked",
  "needs_rescheduling",
  "delivered",
  "completed",
  "cancelled",
  "archived",
];
const titleOf = (x?: Entity) =>
  x ? s(x.title, s(x.name, s(x.label, x.id))) : "Not linked";
const isoDay = (x: unknown) => s(x).slice(0, 10);
const active = (x: Entity) =>
  !b(x.archived) && s(x.state) !== "archived" && s(x.status) !== "archived";
const safeHref = (value: unknown) => {
  try {
    const u = new URL(s(value));
    return ["http:", "https:"].includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
};
const due = (x: Entity) => s(x.committed_due_at, s(x.due_at));
const projectTimezone = (rows: (table: string) => Entity[], project: Entity) => {
  const acceptance = rows("acceptances").find((item) => item.id === (project.latest_amendment_acceptance_id || project.acceptance_id));
  return s(o(acceptance?.terms_snapshot).timezone, s(rows("policies")[0]?.timezone, "Asia/Jakarta"));
};
const when = (x: unknown) => {
  const value = s(x);
  return value && Number.isFinite(Date.parse(value))
    ? `${date(value)} · ${localDateTime(value, "Asia/Jakarta").slice(11, 16)} WIB`
    : "Not scheduled";
};

function ErrorText({ message }: { message: string }) {
  return message ? (
    <div className="work-error" role="alert">
      {message}
    </div>
  ) : null;
}
function WorkNav({ path }: { path: string }) {
  return (
    <nav className="tabs" aria-label="Work sections">
      {[
        ["Projects", "/app/projects"],
        ["Clients", "/app/clients"],
        ["Calendar", "/app/calendar"],
      ].map(([name, href]) => (
        <Link
          key={href}
          href={href}
          aria-current={path.startsWith(href) ? "page" : undefined}
        >
          {name}
        </Link>
      ))}
    </nav>
  );
}
function Missing({ kind = "record" }: { kind?: string }) {
  return (
    <Empty
      title={`${kind[0].toUpperCase() + kind.slice(1)} not found`}
      description="This link does not match a record in your workspace."
    >
      <LinkButton href="/app/projects">Back to Work</LinkButton>
    </Empty>
  );
}
function Editor({
  title,
  onClose,
  children,
  onSave,
  saveLabel = "Save changes",
  error = "",
  busy = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  onSave: () => void | Promise<unknown>;
  saveLabel?: string;
  error?: string;
  busy?: boolean;
}) {
  const [dirty, setDirty] = useState(false),
    [discard, setDiscard] = useState(false),
    [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const pending = busy || saving;
  useDirtyGuard(dirty);
  const close = () => { if (!pending) { if (dirty) setDiscard(true); else onClose(); } };
  return (
    <>
      <Modal title={title} onClose={close}>
        <Form
          noValidate
          className="work-form"
          onChangeCapture={() => setDirty(true)}
          aria-busy={pending}
          onSubmit={async (e) => {
            e.preventDefault();
            if (savingRef.current || busy) return;
            savingRef.current = true;
            setSaving(true);
            try { await onSave(); } finally { savingRef.current = false; setSaving(false); }
          }}
        >
          <fieldset className="work-editor-fields" disabled={pending}>{children}</fieldset>
          <ErrorText message={error} />
          <div className="work-form-footer">
            <Button variant="secondary" type="button" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : saveLabel}
            </Button>
          </div>
        </Form>
      </Modal>
      {discard && (
        <Confirm
          title="Discard unsaved changes?"
          description="Your saved record will stay as it is. Changes in this editor will be discarded."
          onConfirm={onClose}
          onClose={() => setDiscard(false)}
        />
      )}
    </>
  );
}
function Paging({
  count,
  page,
  onChange,
}: {
  count: number;
  page: number;
  onChange: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(count / 12));
  return (
    <div className="work-pagination">
      <span className="muted">
        {count} record{count === 1 ? "" : "s"} · Page {page} of {pages}
      </span>
      <Button
        variant="secondary"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </Button>
      <Button
        variant="secondary"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}

function ProjectEditor({
  project,
  onClose,
  onSaved,
}: {
  project?: Entity;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const { rows, command } = useStore();
  const [name, setName] = useState(s(project?.title)),
    [client, setClient] = useState(s(project?.client_id)),
    [brief, setBrief] = useState(s(project?.brief)),
    [reference, setReference] = useState(s(project?.acceptance_reference)),
    [basis, setBasis] = useState("external"),
    [offer, setOffer] = useState(""),
    [error, setError] = useState(""),
    [newClient, setNewClient] = useState(false);
  const [expectedVersion] = useState(project?.version);
  const accepted = rows("offers").filter(
    (x) =>
      s(x.status, s(x.state)) === "accepted" &&
      !rows("projects").some((p) => p.offer_id === x.id),
  );
  async function save() {
    if (!name.trim() || name.trim().length > 120)
      return setError("Enter a project name of 1–120 characters.");
    if (!client) return setError("Choose a client.");
    if (!project && basis === "external" && reference.trim().length < 5)
      return setError(
        "Add the date and reference for the client’s prior acceptance.",
      );
    if (!project && basis === "offer" && !offer)
      return setError("Choose an accepted offer.");
    const result = (await command(project ? "project.update" : "project.create", {
      id: project?.id,
      expected_version: expectedVersion,
      values: {
        title: name.trim(),
        client_id: client,
        brief,
        acceptance_reference: reference,
        project_basis: basis,
        ...(!project
          ? {
              state: "awaiting_prerequisites",
              professional_delivery_state: "not_started",
              inputs_state: "awaiting_inputs",
              ...(basis === "offer" ? { offer_id: offer } : {}),
            }
          : {}),
      },
    }));
    if (result.ok && result.id) onSaved(result.id);
    else if (result.ok && project) onSaved(project.id);
    else setError(result.message);
  }
  return (
    <>
      <Editor
        title={project ? "Edit project" : "Add accepted work"}
        onClose={onClose}
        onSave={save}
        saveLabel="Save project"
        error={error}
      >
        <Field label="Project name">
          <input
          required
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Client">
          <select
            value={client}
            disabled={!!project?.accepted_version_id}
            onChange={(e) => setClient(e.target.value)}
          >
            <option value="">Choose a client</option>
            {rows("clients")
              .filter(active)
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {titleOf(x)}
                </option>
              ))}
          </select>
        </Field>
        {!project && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setNewClient(true)}
          >
            Create client
          </Button>
        )}
        {!project && (
          <>
            <Field label="Project basis">
              <select value={basis} onChange={(e) => setBasis(e.target.value)}>
                <option value="external">
                  Previously accepted outside Crewmori
                </option>
                <option value="offer">Accepted Crewmori offer</option>
              </select>
            </Field>
            {basis === "external" ? (
              <Field label="Acceptance reference">
                <textarea
                  className="resize-none"
                  rows={3}
                  value={reference}
                  maxLength={1000}
                  placeholder="e.g. Accepted by email on 15 October 2026"
                  onChange={(e) => setReference(e.target.value)}
                />
              </Field>
            ) : (
              <Field label="Accepted offer">
                <select
                  value={offer}
                  onChange={(e) => setOffer(e.target.value)}
                >
                  <option value="">Choose accepted offer</option>
                  {accepted.map((x) => (
                    <option key={x.id} value={x.id}>
                      {s(x.title, `Accepted offer · ${x.id}`)}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <p className="work-field-hint">
              Record an existing agreement. Creating a project does not confirm
              a payment or reserve a delivery date.
            </p>
          </>
        )}
        <Field label="Brief">
          <textarea
            className="resize-none"
            rows={5}
            value={brief}
            maxLength={5000}
            onChange={(e) => setBrief(e.target.value)}
          />
        </Field>
      </Editor>
      {newClient && (
        <ClientEditor
          onClose={() => setNewClient(false)}
          onSaved={(id) => {
            setClient(id);
            setNewClient(false);
          }}
        />
      )}
    </>
  );
}

function ProjectList() {
  const { rows, record } = useStore();
  const router = useRouter(),
    q = useSearchParams();
  const [create, setCreate] = useState(q.get("new") === "1");
  const search = q.get("q") || "",
    status = q.get("status") || "all",
    client = q.get("client") || "all",
    sort = q.get("sort") || "updated",
    view = q.get("view") || "list";
  const update = (key: string, value: string) => {
    const p = new URLSearchParams(q);
    if (value) p.set(key, value);
    else p.delete(key);
    if (key !== "page") p.delete("page");
    router.replace(`/app/projects?${p.toString()}`, { scroll: false });
  };
  const all = rows("projects");
  const filtered = all
    .filter(
      (x) =>
        (status === "all" ? active(x) : s(x.state) === status) &&
        (client === "all" || s(x.client_id) === client) &&
        `${titleOf(x)} ${titleOf(record("clients", s(x.client_id)))} ${x.id}`
          .toLowerCase()
          .includes(search.toLowerCase().trim()),
    )
    .sort(
      (x, y) =>
        (sort === "name"
          ? titleOf(x).localeCompare(titleOf(y))
          : sort === "due"
            ? due(x).localeCompare(due(y))
            : s(y.updated_at).localeCompare(s(x.updated_at))) ||
        x.id.localeCompare(y.id),
    );
  const page = Math.min(
      Math.max(1, Number(q.get("page")) || 1),
      Math.max(1, Math.ceil(filtered.length / 12)),
    ),
    shown = filtered.slice((page - 1) * 12, page * 12);
  const projectCard = (x: Entity) => (
    <>
      <p className="eyebrow">{titleOf(record("clients", s(x.client_id)))}</p>
      <h3>
        <Link className="work-record-link" href={`/app/projects/${x.id}`}>
          {titleOf(x)}
        </Link>
      </h3>
      <p className="muted">
        {due(x) ? `Due ${date(due(x))}` : "Dates await prerequisites"}
      </p>
      <Badge>{label(x.state)}</Badge>
    </>
  );
  return (
    <>
      <PageHead
        title="Good work, in motion."
        description="Your accepted projects, from first input to final handoff."
        action={<Button onClick={() => setCreate(true)}>Add project</Button>}
      />
      <Panel>
        <div className="work-toolbar">
          <SearchBar
            value={search}
            onChange={(v) => update("q", v)}
            placeholder="Search projects"
          />
          <label>
            Status
            <select
              value={status}
              onChange={(e) => update("status", e.target.value)}
            >
              <option value="all">All current projects</option>
              {statuses.map((x) => (
                <option key={x} value={x}>
                  {optionLabel(x)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Client
            <select
              value={client}
              onChange={(e) => update("client", e.target.value)}
            >
              <option value="all">All clients</option>
              {rows("clients").map((x) => (
                <option key={x.id} value={x.id}>
                  {titleOf(x)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sort
            <select
              value={sort}
              onChange={(e) => update("sort", e.target.value)}
            >
              <option value="updated">Recently updated</option>
              <option value="due">Due date</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>
        <div className="work-section-title">
          <span className="muted">
            {filtered.length} project{filtered.length === 1 ? "" : "s"}
          </span>
          <div className="actions">
            <Button
              aria-pressed={view === "list"}
              variant={view === "list" ? undefined : "secondary"}
              onClick={() => update("view", "list")}
            >
              List
            </Button>
            <Button
              aria-pressed={view === "board"}
              variant={view === "board" ? undefined : "secondary"}
              onClick={() => update("view", "board")}
            >
              Board
            </Button>
          </div>
        </div>
        {!filtered.length ? (
          <Empty
            title={
              all.length
                ? "No projects match these filters"
                : "Your next chapter starts here"
            }
            description={
              all.length
                ? "Try another search or clear your filters."
                : "Accepted work will appear here. Your crew can help prepare an offer while you focus on the work."
            }
          >
            {all.length ? (
              <Button
                variant="secondary"
                onClick={() => router.replace(`/app/projects?view=${view}`)}
              >
                Clear filters
              </Button>
            ) : (
              <LinkButton href="/app/offers">View offers</LinkButton>
            )}
          </Empty>
        ) : view === "board" ? (
          <div className="work-board">
            {[...new Set(shown.map((x) => s(x.state)))].map((state) => (
              <section className="work-board-column" key={state}>
                <h3>
                  {label(state)}{" "}
                  <span className="muted">
                    {shown.filter((x) => s(x.state) === state).length}
                  </span>
                </h3>
                {shown
                  .filter((x) => s(x.state) === state)
                  .map((x) => (
                    <article className="work-board-card" key={x.id}>
                      {projectCard(x)}
                    </article>
                  ))}
              </section>
            ))}
          </div>
        ) : (
          shown.map((x) => (
            <article className="work-record" key={x.id}>
              <div className="work-monogram">{titleOf(x).slice(0, 1)}</div>
              <div>
                <h3>
                  <Link
                    className="work-record-link"
                    href={`/app/projects/${x.id}`}
                  >
                    {titleOf(x)}
                  </Link>
                </h3>
                <p className="muted">
                  {titleOf(record("clients", s(x.client_id)))} ·{" "}
                  {due(x) ? `Due ${date(due(x))}` : "Dates await prerequisites"}
                </p>
              </div>
              <div className="work-record-actions">
                <Badge>{label(x.state)}</Badge>
                <LinkButton variant="secondary" href={`/app/projects/${x.id}`}>
                  Open project
                </LinkButton>
              </div>
            </article>
          ))
        )}
        {filtered.length > 12 && (
          <Paging
            count={filtered.length}
            page={page}
            onChange={(p) => update("page", String(p))}
          />
        )}
      </Panel>
      {create && (
        <ProjectEditor
          onClose={() => {
            setCreate(false);
            if (q.get("new")) update("new", "");
          }}
          onSaved={(id) => {
            setCreate(false);
            router.push(`/app/projects/${id}`);
          }}
        />
      )}
    </>
  );
}

function TaskEditor({
  project,
  task,
  onClose,
}: {
  project: Entity;
  task?: Entity;
  onClose: () => void;
}) {
  const { rows, command } = useStore();
  const ownerRecord = rows("owners")[0];
  const ownerId = ownerRecord?.id || "owner_alya";
  const ownerName = s(ownerRecord?.display_name, "You");
  const [name, setName] = useState(s(task?.title)),
    [notes, setNotes] = useState(s(task?.notes)),
    [kind, setKind] = useState(
      s(
        task?.kind,
        s(task?.assignee_kind) === "agent" ? "administrative" : "professional",
      ),
    ),
    [owner, setOwner] = useState(s(task?.assignee_id, ownerId)),
    [target, setTarget] = useState(isoDay(task?.due_at)),
    [milestone, setMilestone] = useState(s(task?.milestone_id)),
    [shared, setShared] = useState(b(task?.shared_with_buyer)),
    [error, setError] = useState("");
  const [expectedVersion] = useState(task?.version);
  async function save() {
    if (!name.trim()) return setError("Enter a task name.");
    if (kind === "professional" && owner !== ownerId)
      return setError("Professional work must be assigned to you.");
    const result = (await command("task.save", {
      id: task?.id,
      expected_version: expectedVersion,
      values: {
        project_id: project.id,
        title: name.trim(),
        notes,
        kind,
        assignee_id: owner,
        due_at: target ? zonedDateTime(target, "17:00", projectTimezone(rows, project)) : null,
        milestone_id: milestone || null,
        shared_with_buyer: shared,
      },
    }));
    if (result.ok) onClose();
    else setError(result.message);
  }
  return (
    <Editor
      title={task ? "Edit task" : "Add task"}
      onClose={onClose}
      onSave={save}
      saveLabel="Save task"
      error={error}
    >
      <Field label="Task name">
        <input
          value={name}
          required
          maxLength={160}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </Field>
      <Field label="Details">
        <textarea
          className="resize-none"
          value={notes}
          rows={4}
          maxLength={4000}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
      <div className="grid2">
        <Field label="Task type">
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              if (e.target.value === "professional") setOwner(ownerId);
            }}
          >
            <option value="professional">Professional deliverable</option>
            <option value="administrative">Administrative task</option>
          </select>
        </Field>
        <Field label="Responsible">
          <select
            value={owner}
            disabled={kind === "professional"}
            onChange={(e) => setOwner(e.target.value)}
          >
            <option value={ownerId}>{ownerName} — you</option>
            {[
              "scout",
              "promoter",
              "sales",
              "account_manager",
              "operations",
              "finance",
            ].map((x) => (
              <option key={x} value={x}>
                {optionLabel(x)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid2">
        <Field label="Due date">
          <input
            type="date"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </Field>
        <Field label="Milestone">
          <select
            value={milestone}
            onChange={(e) => setMilestone(e.target.value)}
          >
            <option value="">No milestone</option>
            {rows("milestones")
              .filter((x) => s(x.project_id) === project.id)
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {titleOf(x)}
                </option>
              ))}
          </select>
        </Field>
      </div>
      {target && due(project) && target > isoDay(due(project)) && (
        <p className="work-notice">
          This internal target is after the agreed delivery date. It does not
          change your agreement.
        </p>
      )}
      <Field label="Visibility">
        <select
          value={shared ? "buyer" : "owner"}
          onChange={(e) => setShared(e.target.value === "buyer")}
        >
          <option value="owner">Owner only</option>
          <option value="buyer">Shared with buyer</option>
        </select>
      </Field>
    </Editor>
  );
}

function MilestoneEditor({
  project,
  milestone,
  onClose,
}: {
  project: Entity;
  milestone?: Entity;
  onClose: () => void;
}) {
  const { rows, command } = useStore();
  const [name, setName] = useState(s(milestone?.title)),
    [target, setTarget] = useState(isoDay(milestone?.due_at)),
    [reason, setReason] = useState(""),
    [selected, setSelected] = useState<string[]>(
      rows("work_tasks")
        .filter((x) => s(x.milestone_id) === milestone?.id)
        .map((x) => x.id),
    ),
    [error, setError] = useState("");
  const contractual =
    !!milestone &&
    b(milestone.shared_with_buyer) &&
    s(milestone.due_at) === s(project.committed_due_at);
  const [expectedVersion] = useState(milestone?.version);
  const [taskVersions] = useState(() =>
    Object.fromEntries(
      rows("work_tasks")
        .filter((x) => s(x.project_id) === project.id)
        .map((x) => [x.id, x.version]),
    ),
  );
  async function save() {
    if (!name.trim() || !target)
      return setError("Add a milestone name and target date.");
    if (
      project.committed_start_at &&
      target < isoDay(project.committed_start_at)
    )
      return setError("The target must be on or after the committed start.");
    if (contractual && target !== isoDay(milestone?.due_at) && reason.trim().length < 5)
      return setError("Describe why the agreed target needs to change.");
    const result = await command(
      contractual && target !== isoDay(milestone?.due_at) ? "milestone.proposeChange" : "milestone.save",
      {
        id: milestone?.id,
        expected_version: expectedVersion,
        expected_task_versions: taskVersions,
        values: {
          project_id: project.id,
          title: name.trim(),
          due_at: milestone && target === isoDay(milestone.due_at) ? milestone.due_at : zonedDateTime(target, "17:00", projectTimezone(rows, project)),
          notes: reason,
          task_ids: selected,
        },
      },
    );
    if (!result.ok) return setError(result.message);
    onClose();
  }
  return (
    <Editor
      title={milestone ? "Edit milestone" : "Add milestone"}
      onClose={onClose}
      onSave={save}
      saveLabel={
        contractual && target !== isoDay(milestone?.due_at)
          ? "Prepare change proposal"
          : "Save milestone"
      }
      error={error}
    >
      <Field label="Milestone name">
        <input
          value={name}
          required
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </Field>
      <Field label="Target date">
        <input
          type="date"
          required
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
      </Field>
      {contractual && (
        <p className="work-notice">
          This target is part of your agreement. A new date creates a proposal
          for review; the accepted deadline stays in place.
        </p>
      )}
      <Field label="Reason for change">
        <textarea
          className="resize-none"
          value={reason}
          maxLength={1000}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
      </Field>
      <fieldset>
        <legend>Included tasks</legend>
        {rows("work_tasks")
          .filter((x) => s(x.project_id) === project.id)
          .map((x) => (
            <label key={x.id} className="work-check">
              <input
                type="checkbox"
                checked={selected.includes(x.id)}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, x.id]
                      : selected.filter((id) => id !== x.id),
                  )
                }
              />
              {titleOf(x)}
            </label>
          ))}
      </fieldset>
      {project.offer_id ? (
        <Link
          className="work-inline-link"
          href={`/app/offers/${s(project.offer_id)}?action=amend`}
        >
          Review agreement change
        </Link>
      ) : null}
    </Editor>
  );
}

function ProjectTasks({ project }: { project: Entity }) {
  const { rows, command } = useStore();
  const q = useSearchParams();
  const [edit, setEdit] = useState<string | null>(q.get("task")),
    [milestone, setMilestone] = useState<string | null>(q.get("milestone")),
    [selected, setSelected] = useState<string[]>([]),
    [confirm, setConfirm] = useState(false),
    [reviewTasks, setReviewTasks] = useState<Entity[]>([]),
    [error, setError] = useState(""),
    [showArchive, setShowArchive] = useState(false);
  const tasks = rows("work_tasks").filter(
      (x) => s(x.project_id) === project.id && (showArchive || active(x)),
    ),
    milestones = rows("milestones").filter(
      (x) => s(x.project_id) === project.id,
    );
  const enabled = !terminal.includes(s(project.state));
  const eligible = tasks.filter(
    (x) =>
      active(x) &&
      ["not_started", "in_progress", "blocked"].includes(s(x.state)),
  );
  async function transition(type: string, task: Entity) {
    const result = (await command(type, {
      id: task.id,
      expected_version: task.version,
    }));
    if (!result.ok) setError(result.message);
  }
  async function complete() {
    const chosen = reviewTasks;
    const result = (await command("task.completeMany", {
      ids: chosen.map((x) => x.id),
      expected_versions: Object.fromEntries(
        chosen.map((x) => [x.id, x.version]),
      ),
    }));
    if (!result.ok) {
      setError(result.message);
      setConfirm(false);
      return;
    }
    setSelected([]);
    setConfirm(false);
  }
  return (
    <div className="stack">
      <Panel>
        <div className="work-section-title">
          <h2>Milestones</h2>
          <Button
            variant="secondary"
            disabled={!enabled}
            onClick={() => setMilestone("new")}
          >
            Add milestone
          </Button>
        </div>
        {milestones.length ? (
          milestones.map((x) => {
            const included = tasks.filter((t) => s(t.milestone_id) === x.id),
              done = included.filter((t) =>
                ["completed", "owner_reported_delivered"].includes(s(t.state)),
              ).length;
            return (
              <div className="work-info-line" key={x.id}>
                <div>
                  <strong>{titleOf(x)}</strong>
                  <p className="muted">
                    {date(x.due_at)}
                    {b(x.shared_with_buyer)
                      ? " · Shared target"
                      : " · Internal target"}
                  </p>
                  {included.length > 0 && (
                    <p>
                      {done} of {included.length} tasks reported done
                    </p>
                  )}
                </div>
                <Button
                  variant="secondary"
                  disabled={!enabled}
                  onClick={() => setMilestone(x.id)}
                >
                  Edit
                </Button>
              </div>
            );
          })
        ) : (
          <p className="muted">Add milestones to organize the next steps.</p>
        )}
      </Panel>
      <Panel>
        <div className="work-section-title">
          <h2>Tasks</h2>
          <Button disabled={!enabled} onClick={() => setEdit("new")}>
            Add task
          </Button>
        </div>
        <div className="work-section-title">
          <label className="work-check">
            <input
              type="checkbox"
              checked={
                eligible.length > 0 && selected.length === eligible.length
              }
              onChange={(e) =>
                setSelected(e.target.checked ? eligible.map((x) => x.id) : [])
              }
            />
            Select visible tasks
          </label>
          <label className="work-check">
            <input
              type="checkbox"
              checked={showArchive}
              onChange={(e) => {
                setShowArchive(e.target.checked);
                setSelected([]);
              }}
            />
            Show archived
          </label>
        </div>
        {selected.length > 0 && (
          <div className="work-notice work-section-title">
            <span>{selected.length} selected</span>
            <div className="actions">
              <Button
                disabled={!enabled}
                onClick={() => {
                  setReviewTasks(tasks.filter((x) => selected.includes(x.id)));
                  setConfirm(true);
                }}
              >
                Mark complete
              </Button>
              <Button variant="secondary" onClick={() => setSelected([])}>
                Clear selection
              </Button>
            </div>
          </div>
        )}
        <ErrorText message={error} />
        {tasks.map((x) => (
          <div className="work-task-row" key={x.id}>
            <input
              type="checkbox"
              aria-label={`Select ${titleOf(x)}`}
              disabled={!enabled || !eligible.some((t) => t.id === x.id)}
              checked={selected.includes(x.id)}
              onChange={(e) =>
                setSelected(
                  e.target.checked
                    ? [...selected, x.id]
                    : selected.filter((id) => id !== x.id),
                )
              }
            />
            <div>
              <h3>{titleOf(x)}</h3>
              <p className="muted">
                {s(x.assignee_kind) === "owner"
                  ? `${s(rows("owners")[0]?.display_name, "You")} — professional work`
                  : label(x.assignee_id)}{" "}
                · {date(x.due_at)} ·{" "}
                {b(x.shared_with_buyer) ? "Shared with buyer" : "Owner only"}
              </p>
              <Badge>{label(x.state)}</Badge>
            </div>
            <div className="work-record-actions">
              <Button
                variant="secondary"
                disabled={
                  !enabled ||
                  !active(x) ||
                  (s(project.professional_delivery_state) ===
                    "buyer_accepted" &&
                    s(x.assignee_kind) === "owner")
                }
                onClick={() => setEdit(x.id)}
              >
                Edit
              </Button>
              {["completed", "owner_reported_delivered"].includes(
                s(x.state),
              ) ? (
                <Button
                  variant="secondary"
                  disabled={
                    s(project.professional_delivery_state) ===
                      "buyer_accepted" || !enabled
                  }
                  onClick={async () => (await transition("task.reopen", x))}
                >
                  Reopen
                </Button>
              ) : !active(x) ? (
                <Button
                  variant="secondary"
                  disabled={!enabled}
                  onClick={async () => {
                    const result = (await command("task.restore", {
                      id: x.id,
                      expected_version: x.version,
                    }));
                    if (!result.ok) setError(result.message);
                  }}
                >
                  Restore
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  disabled={!enabled}
                  onClick={async () => (await transition("task.archive", x))}
                >
                  Archive
                </Button>
              )}
            </div>
          </div>
        ))}
        {!tasks.length && (
          <Empty
            title="Room for your next step"
            description="Add a professional deliverable or an administrative task."
          />
        )}
      </Panel>
      {edit &&
        (edit === "new" || tasks.some((x) => x.id === edit) ? (
          <TaskEditor
            project={project}
            task={tasks.find((x) => x.id === edit)}
            onClose={() => setEdit(null)}
          />
        ) : (
          <Modal title="Task not found" onClose={() => setEdit(null)}>
            <p>This task does not belong to the project.</p>
          </Modal>
        ))}{" "}
      {milestone &&
        (milestone === "new" || milestones.some((x) => x.id === milestone) ? (
          <MilestoneEditor
            project={project}
            milestone={milestones.find((x) => x.id === milestone)}
            onClose={() => setMilestone(null)}
          />
        ) : (
          <Modal title="Milestone not found" onClose={() => setMilestone(null)}>
            <p>This milestone does not belong to the project.</p>
          </Modal>
        ))}{" "}
      {confirm && (
        <Confirm
          title={`Complete ${selected.length} selected task${selected.length === 1 ? "" : "s"}?`}
          description="Administrative tasks become completed. Professional deliverables become owner-reported delivered, and still require buyer acceptance."
          onConfirm={complete}
          onClose={() => setConfirm(false)}
        />
      )}
    </div>
  );
}

function FilePreview({ file, onClose }: { file: Entity; onClose: () => void }) {
  const [url, setUrl] = useState(""),
    [text, setText] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true,
      created = "";
    attachmentBlob(file)
      .then(async (blob) => {
        if (!blob) {
          if (alive)
            setError(
              "The original bytes are unavailable. Replace this file to make it downloadable.",
            );
          return;
        }
        if (blob.type === "text/plain") {
          const contents = await blob.text();
          if (alive) setText(contents);
        } else {
          created = URL.createObjectURL(blob);
          if (alive) setUrl(created);
        }
      })
      .catch(() => setError("The file could not be opened. Try again."));
    return () => {
      alive = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [file]);
  return (
    <Modal title={titleOf(file)} onClose={onClose}>
      <p className="muted">
        {b(file.shared_with_buyer) ? "Shared with buyer" : "Owner only"} ·{" "}
        {Math.round(n(file.byte_length) / 1024)} KB
      </p>
      <ErrorText message={error} />
      {text && (
        <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {text}
        </pre>
      )}
      {url &&
        (s(file.media_type).startsWith("image/") ? (
          <img className="work-file-preview" src={url} alt={titleOf(file)} />
        ) : (
          <iframe
            title={titleOf(file)}
            src={url}
            style={{ width: "100%", height: "55vh", border: 0 }}
          />
        ))}
    </Modal>
  );
}

function Files({ project, clientId }: { project?: Entity; clientId?: string }) {
  const { rows, command, notify, connected } = useStore();
  const uploaded = useRef(new WeakMap<File, UploadedFile>());
  const [uploadStatus, setUploadStatus] = useState("");
  const [adding, setAdding] = useState(false),
    [files, setFiles] = useState<File[]>([]),
    [link, setLink] = useState(""),
    [name, setName] = useState(""),
    [shared, setShared] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState<Entity | null>(null),
    [replace, setReplace] = useState<Entity | null>(null),
    [showArchive, setShowArchive] = useState(false);
  const projectIds = project
    ? [project.id]
    : rows("projects")
        .filter((x) => s(x.client_id) === clientId)
        .map((x) => x.id);
  const attachments = rows("attachments").filter(
    (x) =>
      (projectIds.includes(s(x.project_id)) ||
        (!project && s(x.client_id) === clientId)) &&
      (showArchive || active(x)),
  );
  const editable = project && !terminal.includes(s(project.state));
  async function save() {
    setError("");
    if (!files.length && !link.trim())
      return setError("Choose up to five files or add a file link.");
    if (files.length > 5)
      return setError("Choose no more than five files per action.");
    if (link && !safeHref(link))
      return setError("Use a valid http or https file link.");
    if (link && !name.trim())
      return setError("Give the external file a descriptive name.");
    if (replace && files.length !== 1)
      return setError("Select one replacement file.");
    setBusy(true);
    try {
      for (const file of files) {
        const validation = await validateUpload(file);
        if (validation) {
          setError(`${file.name}: ${validation}`);
          setBusy(false);
          return;
        }
      }
      for (const file of files) {
        setUploadStatus(`Adding ${file.name}…`);
        const saved = uploaded.current.get(file) || await persistUpload(file);
        uploaded.current.set(file, saved);
        const result = (await command("file.attach", {
          values: {
            name: file.name,
            project_id: project?.id,
            client_id: project?.client_id || clientId,
            media_type: saved.type,
            storage_kind: connected ? "private" : "local_blob",
            storage_locator: saved.id,
            byte_length: saved.size,
            sha256: saved.sha256,
            shared_with_buyer: shared,
            replaces_attachment_id: replace?.id || null,
          },
        }));
        if (!result.ok) throw Error(`${file.name}: ${result.message}`);
        setFiles((pending) => pending.filter((item) => item !== file));
      }
      if (link) {
        const result = (await command("file.link", {
          values: {
            name: name.trim(),
            project_id: project?.id,
            client_id: project?.client_id || clientId,
            media_type: "application/octet-stream",
            storage_kind: "external_link",
            storage_locator: safeHref(link),
            shared_with_buyer: shared,
            byte_length: 0,
          },
        }));
        if (!result.ok) throw Error(result.message);
      }
      setAdding(false);
      setFiles([]);
      setLink("");
      setName("");
      setReplace(null);
      notify(connected ? "Files saved to your project." : "Files saved to this browser’s demo workspace.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Files could not be saved. Your selection is still available for retry.",
      );
    } finally {
      setBusy(false);
      setUploadStatus("");
    }
  }
  async function download(file: Entity) {
    try {
      const blob = await attachmentBlob(file);
      if (!blob)
        return setError(
          "This file’s original bytes are unavailable. Replace the file to download it.",
        );
      downloadBlob(blob, titleOf(file));
    } catch {
      setError("Download could not be prepared. Try again.");
    }
  }
  return (
    <Panel>
      <div className="work-section-title">
        <h2>Files</h2>
        {editable && (
          <Button
            onClick={() => {
              setAdding(true);
              setShared(false);
            }}
          >
            Add files
          </Button>
        )}
      </div>
      <label className="work-check">
        <input
          type="checkbox"
          checked={showArchive}
          onChange={(e) => setShowArchive(e.target.checked)}
        />
        Show archived files
      </label>
      <ErrorText message={error} />
      {attachments.length ? (
        attachments.map((x) => (
          <article className="work-record" key={x.id}>
            <div className="work-monogram">↗</div>
            <div>
              <h3>{titleOf(x)}</h3>
              <p className="muted">
                {b(x.shared_with_buyer) ? "Shared with buyer" : "Owner only"} ·{" "}
                {s(x.storage_kind) === "external_link"
                  ? "External link"
                  : `${Math.round(n(x.byte_length) / 1024)} KB`}
                {x.replaces_attachment_id ? " · New version" : ""}
                {!active(x) ? " · Archived" : ""}
              </p>
            </div>
            <div className="work-record-actions">
              {s(x.storage_kind) === "external_link" ? (
                safeHref(x.storage_locator) ? (
                  <a
                    className="btn secondary"
                    href={safeHref(x.storage_locator)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open external link
                  </a>
                ) : (
                  <Badge>Unavailable</Badge>
                )
              ) : s(x.availability) === "available" ? (
                <>
                  <Button variant="secondary" onClick={() => setPreview(x)}>
                    Preview
                  </Button>
                  <Button variant="secondary" onClick={async () => void (await download(x))}>
                    Download
                  </Button>
                </>
              ) : (
                <Badge>File unavailable</Badge>
              )}
              {editable && (
                <details>
                  <summary className="btn secondary">File actions</summary>
                  <div className="stack">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setReplace(x);
                        setAdding(true);
                        setFiles([]);
                        setShared(b(x.shared_with_buyer));
                      }}
                    >
                      Replace file
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={
                        s(project?.professional_delivery_state) ===
                          "buyer_accepted" && b(x.shared_with_buyer)
                      }
                      onClick={async () => {
                        const result = (await command("file.archive", {
                          id: x.id,
                          expected_version: x.version,
                          archived: active(x),
                        }));
                        if (!result.ok) setError(result.message);
                      }}
                    >
                      {active(x) ? "Archive" : "Restore"}
                    </Button>
                  </div>
                </details>
              )}
            </div>
          </article>
        ))
      ) : (
        <Empty
          title="A home for the work"
          description="Keep working files private, then share the versions your client needs."
        />
      )}
      {adding && (
        <Editor
          title={replace ? `Replace ${titleOf(replace)}` : "Add project files"}
          onClose={() => {
            setAdding(false);
            setFiles([]);
            setReplace(null);
            setError("");
          }}
          onSave={save}
          saveLabel="Add files"
          error={error}
          busy={busy}
        >
          <Field label={replace ? "Replacement file" : "Upload files"}>
            <input
              type="file"
              multiple={!replace}
              accept=".pdf,.png,.jpg,.jpeg,.txt"
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
            />
          </Field>
          <p className="work-field-hint">
            PDF, PNG, JPEG or TXT. Up to 10 MiB per file and five files at a
            time. {connected ? "Files are stored privately in your account." : "Files stay in this browser’s demo workspace."}
          </p>
          {busy && <p role="status" className="muted">{uploadStatus || "Saving file references…"}</p>}
          {files.map((x) => (
            <p key={`${x.name}-${x.size}`}>
              {x.name} · {(x.size / 1024 / 1024).toFixed(2)} MiB
            </p>
          ))}
          {!replace && (
            <>
              <Field label="Or add an external file link">
                <input
                  type="url"
                  value={link}
                  maxLength={2000}
                  placeholder="https://…"
                  onChange={(e) => setLink(e.target.value)}
                />
              </Field>
              {link && (
                <Field label="File name">
                  <input
                    value={name}
                    maxLength={160}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
              )}
            </>
          )}
          <Field label="Visibility">
            <select
              value={shared ? "buyer" : "owner"}
              onChange={(e) => setShared(e.target.value === "buyer")}
            >
              <option value="owner">Owner only</option>
              <option value="buyer">Shared with buyer</option>
            </select>
          </Field>
          {shared && (
            <p className="work-notice">
              The buyer can access this exact file version from their project.
            </p>
          )}
          {replace && (
            <p className="work-field-hint">
              The previous version is preserved in the file history.
            </p>
          )}
        </Editor>
      )}
      {preview && (
        <FilePreview file={preview} onClose={() => setPreview(null)} />
      )}
    </Panel>
  );
}

function InputChecklist({
  project,
  onClose,
}: {
  project: Entity;
  onClose: () => void;
}) {
  const { rows, command } = useStore();
  const [change, setChange] = useState<Entity | null>(null),
    [reason, setReason] = useState(""),
    [error, setError] = useState("");
  const inputs = rows("required_inputs").filter(
    (x) => s(x.project_id) === project.id,
  );
  async function saveChanges() {
    if (!change) return;
    if (!reason.trim())
      return setError("Describe the correction the client needs to make.");
    const result = (await command("project.requestInputChanges", {
      id: change.id,
      reason: reason.trim(),
      expected_version: change.version,
    }));
    if (result.ok) {
      setChange(null);
      setReason("");
    } else setError(result.message);
  }
  return (
    <Modal title="Required inputs" onClose={onClose}>
      <p className="muted">
        Provided, usable inputs satisfy the checklist. Reviewing them is
        optional.
      </p>
      {inputs.length ? (
        inputs.map((x) => (
          <div className="work-info-line" key={x.id}>
            <div>
              <h3>{titleOf(x)}</h3>
              <Badge>{label(x.state)}</Badge>
              <p>{s(x.answer) || "Waiting for the client’s answer."}</p>
              {s(x.review_status) === "reviewed" && (
                <small className="muted">Reviewed by you</small>
              )}
            </div>
            <div className="stack">
              {s(x.state) === "provided" && (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    const r = (await command("project.reviewInput", {
                      id: x.id,
                      expected_version: x.version,
                    }));
                    if (!r.ok) setError(r.message);
                  }}
                >
                  Mark reviewed
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  setChange(x);
                  setReason("");
                }}
              >
                Request changes
              </Button>
            </div>
          </div>
        ))
      ) : (
        <p>No required inputs have been added.</p>
      )}
      <ErrorText message={error} />
      <LinkButton
        href={`/app/clients/${s(project.client_id)}?tab=messages&reminder=${project.id}`}
        variant="secondary"
      >
        Prepare reminder
      </LinkButton>
      {change && (
        <Editor
          title={`Request changes: ${titleOf(change)}`}
          onClose={() => setChange(null)}
          onSave={saveChanges}
          saveLabel="Save change request"
          error={error}
        >
          <Field label="What is needed?">
            <textarea
          required
              className="resize-none"
              rows={5}
              value={reason}
              maxLength={1500}
              onChange={(e) => setReason(e.target.value)}
              autoFocus
            />
          </Field>
          <p className="work-field-hint">
            This saves feedback and prepares an unsent client draft. Review the
            message before sending.
          </p>
        </Editor>
      )}
    </Modal>
  );
}

function Delivery({
  project,
  onClose,
}: {
  project: Entity;
  onClose: () => void;
}) {
  const { rows, record, command } = useStore();
  const [expectedVersion] = useState(project.version);
  const [selected, setSelected] = useState<string[]>([]),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [review, setReview] = useState(false),
    [preview, setPreview] = useState<Entity | null>(null);
  const files = rows("attachments").filter(
    (x) =>
      s(x.project_id) === project.id &&
      b(x.shared_with_buyer) &&
      active(x) &&
      s(x.availability) === "available",
  );
  async function save() {
    if (!selected.length)
      return setError(
        "Select at least one shared, available file as delivery evidence.",
      );
    if (!message.trim()) return setError("Add a short delivery note.");
    if (!review) {
      setReview(true);
      setError("");
      return;
    }
    const result = (await command("project.reportDelivery", {
      id: project.id,
      attachment_ids: selected,
      message,
      expected_version: expectedVersion,
    }));
    if (result.ok) onClose();
    else setError(result.message);
  }
  return (
    <Editor
      title={review ? "Preview delivery" : "Report your delivery"}
      onClose={onClose}
      onSave={save}
      saveLabel={review ? "Mark delivered" : "Preview delivery"}
      error={error}
    >
      {review ? (
        <>
          <p>
            <strong>To:</strong>{" "}
            {titleOf(record("clients", s(project.client_id)))}
          </p>
          <p style={{ whiteSpace: "pre-wrap" }}>{message}</p>
          <h3>Shared delivery evidence</h3>
          {selected.map((id) => (
            <Button
              variant="secondary"
              type="button"
              key={id}
              onClick={() => setPreview(record("attachments", id) || null)}
            >
              {titleOf(record("attachments", id))}
            </Button>
          ))}
          <p className="work-notice">
            This marks your professional work as reported delivered and saves an
            unsent client message. The buyer still needs to review and accept
            the work. Sending the message requires a separate exact-content
            review.
          </p>
          <Button
            variant="secondary"
            type="button"
            onClick={() => setReview(false)}
          >
            Edit delivery
          </Button>
        </>
      ) : (
        <>
          <p>
            You perform the professional work. This records your handoff for the
            buyer to review.
          </p>
          <fieldset>
            <legend>Shared delivery files</legend>
            {files.map((x) => (
              <label className="work-check work-attachment-option" key={x.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(x.id)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, x.id]
                        : selected.filter((id) => id !== x.id),
                    )
                  }
                />
                {titleOf(x)}
              </label>
            ))}
            {!files.length && (
              <p className="muted">
                Upload a file in the Files tab and select Shared with buyer
                first.
              </p>
            )}
          </fieldset>
          <Field label="Delivery note">
            <textarea
          required
              className="resize-none"
              rows={4}
              maxLength={3000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Field>
        </>
      )}
      {preview && (
        <FilePreview file={preview} onClose={() => setPreview(null)} />
      )}
    </Editor>
  );
}

function ProjectDetail({ id }: { id: string }) {
  const { record, rows, command } = useStore();
  const router = useRouter(),
    q = useSearchParams();
  const project = record("projects", id);
  const [edit, setEdit] = useState(q.get("edit") === "overview"),
    [inputs, setInputs] = useState(q.get("inputs") === "1"),
    [delivery, setDelivery] = useState(false),
    [action, setAction] = useState(""),
    [actionVersion, setActionVersion] = useState<number | undefined>(),
    [reason, setReason] = useState(""),
    [review, setReview] = useState(false),
    [error, setError] = useState("");
  if (!project) return <Missing kind="project" />;
  const client = record("clients", s(project.client_id)),
    tab = q.get("tab") || "overview";
  const tasks = rows("work_tasks").filter(
    (x) => s(x.project_id) === id && active(x),
  );
  const status = s(project.state);
  const completed = tasks.filter((x) =>
    ["completed", "owner_reported_delivered"].includes(s(x.state)),
  ).length;
  const canComplete =
    s(project.professional_delivery_state) === "buyer_accepted" &&
    !terminal.includes(status);
  const tabs = ["overview", "tasks", "files", "messages"];
  async function prepareUpdate(kind: "cancellation" | "delivery") {
    if (!project) return;
    const contact = rows("contacts").find(
      (x) => x.client_id === project.client_id,
    );
    if (!contact?.email)
      return setError(
        "Add a client contact email before preparing this update.",
      );
    let conversation = rows("conversations").find(
      (x) => x.client_id === project.client_id,
    );
    if (!conversation) {
      const made = (await command("record.save", {
        table: "conversations",
        values: {
          client_id: project.client_id,
          buyer_contact_id: contact.id,
          status: "open",
          audience: "buyer",
        },
      }));
      if (!made.ok || !made.id) return setError(made.message);
      conversation = { id: made.id, version: 1 };
    }
    const subject =
      kind === "cancellation"
        ? `An update on ${titleOf(project)}`
        : `Your delivery: ${titleOf(project)}`;
    const content =
      kind === "cancellation"
        ? `Hi ${s(contact.display_name, "there")},\n\n${titleOf(project)} is now cancelled. Your accepted terms and existing payment records remain available in the project portal. Please get in touch if you would like to discuss the next steps or any outstanding invoice.\n\nThank you,\n${s(rows("owners")[0]?.display_name, "Your project owner")}`
        : s(project.delivery_message);
    const previous =
      kind === "delivery" && project.delivery_message_id
        ? record("messages", s(project.delivery_message_id))
        : rows("messages").find(
            (x) =>
              x.conversation_id === conversation?.id &&
              ["draft", "approved"].includes(s(x.delivery_state)) &&
              x.subject === subject &&
              x.content === content &&
              active(x),
          );
    if (
      previous &&
      ["draft", "approved"].includes(s(previous.delivery_state))
    ) {
      router.push(`/app/projects/${id}?tab=messages&draft=${previous.id}`);
      return;
    }
    const result = (await command("message.saveDraft", {
      conversation_id: conversation.id,
      subject,
      content,
      destination_contact_id: contact.id,
      attachment_ids:
        kind === "delivery" ? a<string>(project.shared_attachment_ids) : [],
    }));
    if (result.ok && result.id)
      router.push(`/app/projects/${id}?tab=messages&draft=${result.id}`);
    else setError(result.message);
  }
  async function lifecycle() {
    if (!project) return;
    const result = (await command(`project.${action}`, {
      id: project.id,
      expected_version: actionVersion,
      reason,
    }));
    if (result.ok) {
      setAction("");
      setReview(false);
      setReason("");
    } else setError(result.message);
  }
  return (
    <>
      <Link href="/app/projects" className="work-return">
        ← All projects
      </Link>
      <PageHead
        title={titleOf(project)}
        description={
          <span>
            {titleOf(client)} · <Badge>{label(project.state)}</Badge>
          </span>
        }
        action={
          <Button
            variant="secondary"
            disabled={terminal.includes(status)}
            onClick={() => setEdit(true)}
          >
            Edit project
          </Button>
        }
      />
      <Tabs
        items={tabs.map((x) => ({
          label: label(x),
          href: `/app/projects/${id}?tab=${x}`,
        }))}
      />
      <ErrorText message={error} />
      {tab === "tasks" ? (
        <ProjectTasks project={project} />
      ) : tab === "files" ? (
        <Files project={project} />
      ) : tab === "messages" ? (
        <Messages clientId={s(project.client_id)} projectId={id} />
      ) : (
        <div className="stack">
          <Panel>
            <div className="work-section-title">
              <h2>At a glance</h2>
              {!terminal.includes(status) && (
                <Button
                  disabled={
                    !["in_progress", "not_started"].includes(
                      s(project.professional_delivery_state),
                    ) || status !== "active"
                  }
                  onClick={() => setDelivery(true)}
                >
                  Report delivery
                </Button>
              )}
            </div>
            <dl className="work-facts">
              <div>
                <dt>Start</dt>
                <dd>
                  {project.committed_start_at
                    ? date(project.committed_start_at)
                    : "Awaiting prerequisites"}
                </dd>
              </div>
              <div>
                <dt>Agreed delivery</dt>
                <dd>
                  {project.committed_due_at
                    ? date(project.committed_due_at)
                    : "Not committed yet"}
                </dd>
              </div>
              <div>
                <dt>Professional work</dt>
                <dd>{label(project.professional_delivery_state)}</dd>
              </div>
              <div>
                <dt>Deposit</dt>
                <dd>{label(project.deposit_state)}</dd>
              </div>
              <div>
                <dt>Required inputs</dt>
                <dd>{label(project.inputs_state)}</dd>
              </div>
              <div>
                <dt>Client</dt>
                <dd>
                  <Link href={`/app/clients/${s(project.client_id)}`}>
                    {titleOf(client)} →
                  </Link>
                </dd>
              </div>
            </dl>
            <div className="actions">
              <Button variant="secondary" onClick={() => setInputs(true)}>
                Required inputs
              </Button>
              {status === "cancelled" && (
                <Button
                  variant="secondary"
                  onClick={async () => (await prepareUpdate("cancellation"))}
                >
                  Draft client update
                </Button>
              )}
              {["owner_reported_delivered", "buyer_accepted"].includes(
                s(project.professional_delivery_state),
              ) && (
                <Button
                  variant="secondary"
                  onClick={async () => (await prepareUpdate("delivery"))}
                >
                  Review delivery message
                </Button>
              )}
              <LinkButton
                variant="secondary"
                href={`/app/money/invoices?project=${id}`}
              >
                View invoices
              </LinkButton>
              <LinkButton
                variant="secondary"
                href={`/app/calendar?project=${id}`}
              >
                View schedule
              </LinkButton>
            </div>
          </Panel>
          <div className="grid2">
            <Panel>
              <h2>The brief</h2>
              <p>
                {s(
                  project.brief,
                  "Your accepted offer holds the agreed scope and terms. Keep your operational notes here as the work develops.",
                )}
              </p>
              {project.offer_id ? (
                <LinkButton
                  variant="secondary"
                  href={`/app/offers/${s(project.offer_id)}?version=${s(project.accepted_version_id)}`}
                >
                  Accepted offer
                </LinkButton>
              ) : (
                <p className="muted">
                  External acceptance:{" "}
                  {s(project.acceptance_reference, "Recorded outside Crewmori")}
                </p>
              )}
            </Panel>
            <Panel>
              <h2>Next steps</h2>
              <div className="work-progress">
                <progress
                  value={completed}
                  max={Math.max(1, tasks.length)}
                  aria-label="Tasks reported done"
                />
                <span>
                  {completed} / {tasks.length}
                </span>
              </div>
              {tasks
                .filter(
                  (x) =>
                    !["completed", "owner_reported_delivered"].includes(
                      s(x.state),
                    ),
                )
                .slice(0, 2)
                .map((x) => (
                  <p key={x.id}>{titleOf(x)}</p>
                ))}
              <LinkButton
                variant="secondary"
                href={`/app/projects/${id}?tab=tasks`}
              >
                View tasks
              </LinkButton>
            </Panel>
          </div>
          <Panel>
            <details>
              <summary>Project actions</summary>
              <div className="stack">
                <p className="muted">
                  Lifecycle changes preserve accepted terms, delivery evidence
                  and financial history.
                </p>
                <div className="actions">
                  <Button
                    variant="secondary"
                    disabled={!canComplete}
                    onClick={() => {
                      setActionVersion(project.version);
                      setAction("complete");
                      setError("");
                    }}
                  >
                    Complete project
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={terminal.includes(status)}
                    onClick={() => {
                      setActionVersion(project.version);
                      setAction("cancel");
                      setError("");
                    }}
                  >
                    Cancel project
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={!["completed", "cancelled"].includes(status)}
                    onClick={() => {
                      setActionVersion(project.version);
                      setAction("archive");
                      setError("");
                    }}
                  >
                    Archive project
                  </Button>
                  {!active(project) && (
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        const r = (await command("record.archive", {
                          table: "projects",
                          id,
                          archived: false,
                          expected_version: project.version,
                        }));
                        if (!r.ok) setError(r.message);
                      }}
                    >
                      Restore project
                    </Button>
                  )}
                </div>
                {!canComplete && (
                  <p className="work-field-hint">
                    Completion becomes available after the buyer accepts your
                    reported delivery.
                  </p>
                )}
              </div>
            </details>
          </Panel>
        </div>
      )}
      {edit && (
        <ProjectEditor
          project={project}
          onClose={() => setEdit(false)}
          onSaved={() => setEdit(false)}
        />
      )}{" "}
      {inputs && (
        <InputChecklist
          project={project}
          onClose={() => {
            setInputs(false);
            if (q.get("inputs")) router.replace(`/app/projects/${id}`);
          }}
        />
      )}{" "}
      {delivery && (
        <Delivery project={project} onClose={() => setDelivery(false)} />
      )}{" "}
      {action === "cancel" && (
        <Editor
          title={review ? "Review project cancellation" : "Cancel project"}
          onClose={() => {
            setAction("");
            setReview(false);
          }}
          onSave={async () => {
            if (reason.trim().length < 5)
              return setError("Add a reason of at least five characters.");
            if (!review) setReview(true);
            else (await lifecycle());
          }}
          saveLabel={review ? "Confirm cancellation" : "Review cancellation"}
          error={error}
        >
          {!review ? (
            <Field label="Reason for cancelling — owner only">
              <textarea
          required
                className="resize-none"
                rows={4}
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                autoFocus
              />
            </Field>
          ) : (
            <>
              <p>
                {titleOf(project)} will be cancelled. Held future capacity will
                be released and unfinished tasks cancelled. Accepted terms,
                delivery evidence, invoices and receipts remain.
              </p>
              <p className="work-private-note">{reason}</p>
              <Button
                variant="secondary"
                type="button"
                onClick={() => setReview(false)}
              >
                Edit reason
              </Button>
            </>
          )}
          <p className="work-field-hint">
            No client message is sent. This does not settle money or cancel
            external invitations.
          </p>
        </Editor>
      )}{" "}
      {["complete", "archive"].includes(action) && (
        <Confirm
          title={`${label(action)} ${titleOf(project)}?`}
          description={
            action === "complete"
              ? "The buyer’s accepted delivery is kept. Remaining capacity is released; any outstanding invoices stay outstanding."
              : "This completed or cancelled project moves out of your current list. All commercial history is preserved."
          }
          confirmLabel={`${label(action)} project`}
          onConfirm={lifecycle}
          onClose={() => setAction("")}
        />
      )}
    </>
  );
}

function ClientEditor({
  client,
  onClose,
  onSaved,
}: {
  client?: Entity;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const { rows, command } = useStore();
  const contact = rows("contacts").find((x) => s(x.client_id) === client?.id);
  const note = rows("private_notes").find((x) => s(x.client_id) === client?.id);
  const [name, setName] = useState(s(client?.name)),
    [person, setPerson] = useState(s(contact?.display_name)),
    [email, setEmail] = useState(s(contact?.email)),
    [company, setCompany] = useState(s(client?.company)),
    [timezone, setTimezone] = useState(s(client?.timezone, "Unknown")),
    [notes, setNotes] = useState(s(note?.content, s(client?.private_notes))),
    [error, setError] = useState("");
  const [expectedVersion] = useState(client?.version);
  const [contactVersion] = useState(contact?.version);
  const duplicate = rows("contacts").find(
    (x) =>
      s(x.email).trim().toLowerCase() === email.trim().toLowerCase() &&
      s(x.client_id) !== client?.id,
  );
  async function save() {
    if (contact?.version !== contactVersion)
      return setError(
        "This contact changed while you were editing. Reopen the editor to compare the current details.",
      );
    if (!name.trim()) return setError("Enter the client’s name.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return setError(
        "Use a valid email address, for example name@company.com.",
      );
    if (duplicate)
      return setError(
        "This email already belongs to a client. Open that record or use a different address.",
      );
    const result = (await command("client.save", {
      id: client?.id,
      expected_version: expectedVersion,
      values: {
        name: name.trim(),
        contact_name: person.trim(),
        email: email.trim(),
        company: company.trim(),
        timezone,
        private_notes: notes,
        status: s(client?.status, "prospect"),
      },
    }));
    if (result.ok && result.id) onSaved(result.id);
    else setError(result.message);
  }
  return (
    <Editor
      title={client ? "Edit client" : "Add client"}
      onClose={onClose}
      onSave={save}
      saveLabel="Save client"
      error={error}
    >
      <Field label="Client name">
        <input
          required
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </Field>
      <div className="grid2">
        <Field label="Contact name">
          <input
            value={person}
            maxLength={120}
            onChange={(e) => setPerson(e.target.value)}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            maxLength={254}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
      </div>
      {duplicate && (
        <p className="work-notice">
          That email already belongs to{" "}
          <Link href={`/app/clients/${s(duplicate.client_id)}`}>
            an existing client
          </Link>
          .
        </p>
      )}
      <div className="grid2">
        <Field label="Company">
          <input
            value={company}
            maxLength={120}
            onChange={(e) => setCompany(e.target.value)}
          />
        </Field>
        <Field label="Client timezone">
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {[
              "Unknown",
              "Asia/Jakarta",
              "Asia/Singapore",
              "Asia/Tokyo",
              "Europe/London",
              "Europe/Paris",
              "America/New_York",
              "America/Los_Angeles",
              "Australia/Sydney",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Private notes">
        <textarea
          className="resize-none"
          value={notes}
          maxLength={5000}
          rows={5}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
      <p className="work-field-hint">
        Private notes are visible only to you. Changing an email requires a
        fresh review before a message is sent.
      </p>
    </Editor>
  );
}

function Messages({
  clientId,
  projectId,
}: {
  clientId: string;
  projectId?: string;
}) {
  const { rows, record, command, notify, connected } = useStore();
  const q = useSearchParams();
  const sendingRef = useRef(false);
  const [sending, setSending] = useState(false);
  const [draftBusy, setDraftBusy] = useState(false);
  const [errorCode, setErrorCode] = useState("");
  const contact = rows("contacts").find((x) => s(x.client_id) === clientId);
  const conversation = rows("conversations").find(
    (x) => s(x.client_id) === clientId,
  );
  const messages = rows("messages").filter(
    (x) => s(x.conversation_id) === conversation?.id,
  );
  const specified = messages.find((x) => x.id === q.get("draft"));
  const [draftId, setDraftId] = useState(specified?.id || ""),
    [draftVersion, setDraftVersion] = useState(specified?.version),
    [subject, setSubject] = useState(
      s(specified?.subject, q.get("reminder") ? "Inputs for your project" : ""),
    ),
    [body, setBody] = useState(() =>
      q.get("reminder")
        ? `Hi ${s(contact?.display_name, "there")},\n\nWhen you have a moment, please share ${
            rows("required_inputs")
              .filter(
                (x) =>
                  s(x.project_id) === q.get("reminder") &&
                  s(x.state) === "missing",
              )
              .map(titleOf)
              .join(" and ") || "the remaining required inputs"
          } through your project portal. This will help us prepare the next step.\n\nThank you,\n${s(rows("owners")[0]?.display_name, "Your project owner")}`
        : s(specified?.content),
    ),
    [selected, setSelected] = useState<string[]>(
      a<string>(specified?.attachment_ids),
    ),
    [review, setReview] = useState<Entity | null>(null),
    [error, setError] = useState(""),
    [composing, setComposing] = useState(!!specified || !!q.get("reminder")),
    [discard, setDiscard] = useState<Entity | null>(null);
  useDirtyGuard(
    composing &&
      (body !== s(record("messages", draftId)?.content) ||
        subject !== s(record("messages", draftId)?.subject)),
  );
  const files = rows("attachments").filter(
    (x) =>
      b(x.shared_with_buyer) &&
      active(x) &&
      s(x.availability) === "available" &&
      (s(x.client_id) === clientId ||
        (projectId && s(x.project_id) === projectId)),
  );
  const drafts = messages.filter(
    (x) => ["draft", "approved"].includes(s(x.delivery_state)) && active(x),
  );
  const visible = messages.filter(
    (x) =>
      !["draft", "approved", "archived"].includes(s(x.delivery_state)) &&
      active(x),
  );
  async function saveDraft(): Promise<Entity | undefined> {
    if (!contact?.email) {
      setError("Add a contact email before preparing a message.");
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setError("Add a subject and message before saving.");
      return;
    }
    let cid = conversation?.id;
    if (!cid) {
      const created = (await command("record.save", {
        table: "conversations",
        values: {
          client_id: clientId,
          buyer_contact_id: contact.id,
          status: "open",
          audience: "buyer",
        },
      }));
      if (!created.ok || !created.id) {
        setError(created.message);
        return;
      }
      cid = created.id;
    }
    const current = record("messages", draftId);
    const result = (await command("message.saveDraft", {
      id: draftId || undefined,
      expected_version: draftVersion,
      conversation_id: cid,
      client_id: clientId,
      content: body.trim(),
      subject: subject.trim(),
      attachment_ids: selected,
      destination_contact_id: contact.id,
    }));
    if (!result.ok) {
      setError(result.message);
      return;
    }
    const id = result.id || draftId;
    setDraftId(id);
    setDraftVersion(current ? current.version + 1 : 1);
    setError("");
    notify("Message draft saved.");
    return {
      id,
      version: current ? current.version + 1 : 1,
      conversation_id: cid,
      content: body.trim(),
      subject: subject.trim(),
      attachment_ids: selected,
      destination_contact_id: contact.id,
      destination_email: contact.email,
    };
  }
  async function send(channel = "email") {
    if (!review || !contact || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError("");
    setErrorCode("");
    try {
    const current = record("messages", review.id);
    if (!current)
      return setError(
        "The saved draft is unavailable. Save the message again.",
      );
    if (s(contact.email) !== s(review.destination_email))
      return setError(
        "The contact email changed. Close this review and check the new recipient.",
      );
    if (current.version !== review.version)
      return setError(
        "This draft changed. Close this review and review the latest version.",
      );
    if (s(current.delivery_state) === "draft") {
      const approval = (await command("message.approve", {
        id: current.id,
        expected_version: current.version,
        destination_contact_id: contact.id,
      }));
      if (!approval.ok) { setErrorCode(approval.code || ""); return setError(approval.message); }
      setReview({ ...review, version: current.version + 1 });
    }
    const result = (await command(connected && channel === "portal" ? "message.deliver" : "message.send", {
      id: current.id,
      destination_contact_id: contact.id,
    }));
    if (!result.ok) { setErrorCode(result.code || ""); return setError(result.message); }
    setReview(null);
    setBody("");
    setSubject("");
    setDraftId("");
    setDraftVersion(undefined);
    setSelected([]);
    setComposing(false);
    notify(result.message);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }
  return (
    <Panel>
      <div className="work-section-title">
        <h2>A clear conversation</h2>
        <Button
          onClick={() => {
            setComposing(true);
            setReview(null);
          }}
        >
          Draft message
        </Button>
      </div>
      {visible.length ? (
        visible.map((x) => (
          <article
            key={x.id}
            className={`work-message ${s(x.sender_kind) === "buyer" ? "" : "owner"}`}
          >
            <div className="work-message-meta">
              <strong>
                {s(x.sender_kind) === "buyer"
                  ? s(contact?.display_name, "Client")
                  : s(rows("owners")[0]?.display_name, "You")}
              </strong>
              <span>{date(x.created_at)}</span>
              <span>{label(x.delivery_state)}</span>
            </div>
            {x.subject ? <h3>{s(x.subject)}</h3> : null}
            <p>{s(x.content)}</p>
            {a<string>(x.attachment_ids).length > 0 && (
              <small>
                {a<string>(x.attachment_ids).length} shared attachment(s)
              </small>
            )}
          </article>
        ))
      ) : (
        <p className="muted">
          The conversation begins with your first reviewed message.
        </p>
      )}
      {drafts.length > 0 && (
        <details open={!composing}>
          <summary>
            {drafts.length} saved draft{drafts.length === 1 ? "" : "s"}
          </summary>
          {drafts.map((x) => (
            <div className="work-info-line" key={x.id}>
              <div>
                <strong>{s(x.subject, "Untitled draft")}</strong>
                <p className="muted">{s(x.content).slice(0, 100)}</p>
              </div>
              <div className="actions">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDraftId(x.id);
                    setDraftVersion(x.version);
                    setBody(s(x.content));
                    setSubject(s(x.subject));
                    setSelected(a<string>(x.attachment_ids));
                    setComposing(true);
                  }}
                >
                  Edit draft
                </Button>
                <Button variant="secondary" onClick={() => setDiscard(x)}>
                  Discard
                </Button>
              </div>
            </div>
          ))}
        </details>
      )}
      <ErrorText message={error} />
      {composing && (
        <Form noValidate className="work-form" onSubmit={async (event) => {
          event.preventDefault();
          const submitter = (event.nativeEvent as SubmitEvent).submitter;
          const reviewAfter = submitter instanceof HTMLButtonElement && submitter.value === "review";
          setDraftBusy(true);
          try { const saved = await saveDraft(); if (saved && reviewAfter) setReview(saved); }
          finally { setDraftBusy(false); }
        }}>
          <fieldset className="work-editor-fields" disabled={draftBusy}>
          <h3>Draft to {s(contact?.email, "client contact")}</h3>
          <Field label="Subject">
            <input required
              maxLength={200}
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setReview(null);
              }}
            />
          </Field>
          <Field label="Message">
            <textarea required
              className="resize-none"
              rows={7}
              value={body}
              maxLength={8000}
              onChange={(e) => {
                setBody(e.target.value);
                setReview(null);
              }}
            />
          </Field>
          {files.length > 0 && (
            <details>
              <summary>Shared attachments</summary>
              {files.map((x) => (
                <label key={x.id} className="work-check">
                  <input
                    type="checkbox"
                    checked={selected.includes(x.id)}
                    onChange={(e) => {
                      setSelected(
                        e.target.checked
                          ? [...selected, x.id]
                          : selected.filter((id) => id !== x.id),
                      );
                      setReview(null);
                    }}
                  />
                  {titleOf(x)}
                </label>
              ))}
            </details>
          )}
          <div className="actions">
            <Button type="submit" name="intent" value="review" pendingLabel="Saving draft…">
              Review message
            </Button>
            <Button type="submit" name="intent" value="save" variant="secondary">
              Save draft
            </Button>
          </div>
          <p className="work-field-hint">
            Review the exact recipient and content before sending.
          </p>
          </fieldset>
        </Form>
      )}
      {review && (
        <Modal title={connected ? "Review message" : "Review sample message"} onClose={() => { if (!sendingRef.current) setReview(null); }}>
          <div className="work-form">
            <p>
              <strong>To:</strong> {s(contact?.display_name)} &lt;
              {s(review.destination_email)}&gt;
            </p>
            <p>
              <strong>Subject:</strong> {s(review.subject)}
            </p>
            <p style={{ whiteSpace: "pre-wrap" }}>{s(review.content)}</p>
            {selected.length > 0 && (
              <div>
                <strong>Attachments</strong>
                {selected.map((id) => (
                  <p key={id}>{titleOf(record("attachments", id))}</p>
                ))}
              </div>
            )}
            <div className="work-notice">
              Approval applies to this exact draft and recipient. {connected ? "Choose portal delivery or external email." : "This records a sample message; no real email is sent."}
            </div>
            <ErrorText message={error} />
            <div className="actions">
              <Button disabled={sending} pendingLabel="Sending…" onClick={() => send("email")}>{connected ? "Approve and send email" : "Approve and send sample message"}</Button>
              {connected && <Button disabled={sending} pendingLabel="Delivering…" variant="secondary" onClick={() => send("portal")}>Approve and deliver to portal</Button>}
              <Button disabled={sending} variant="secondary" onClick={() => setReview(null)}>
                Back to editing
              </Button>
            </div>
            {["CONNECTION_REQUIRED", "CONNECTION_UNAVAILABLE", "CONNECTION_EXPIRED", "CAPABILITY_MISSING", "CONFIGURATION_REQUIRED"].includes(errorCode) && (
              <LinkButton
                variant="secondary"
                href="/app/connections?connection=gmail"
              >
                Reconnect Gmail
              </LinkButton>
            )}
          </div>
        </Modal>
      )}
      {discard && (
        <Confirm
          title="Discard this message draft?"
          description="The unsent draft will be archived. Sent messages are kept."
          confirmLabel="Discard draft"
          onConfirm={async () => {
            const result = (await command("record.archive", {
              table: "messages",
              id: discard.id,
              expected_version: discard.version,
              archived: true,
            }));
            if (result.ok) {
              if (draftId === discard.id) {
                setDraftId("");
                setDraftVersion(undefined);
                setBody("");
                setSubject("");
                setComposing(false);
              }
              setDiscard(null);
            } else setError(result.message);
          }}
          onClose={() => setDiscard(null)}
        />
      )}
    </Panel>
  );
}

function Clients() {
  const { rows } = useStore();
  const router = useRouter(),
    q = useSearchParams();
  const [create, setCreate] = useState(q.get("new") === "1");
  const search = q.get("q") || "",
    relationship = q.get("relationship") || "all",
    sort = q.get("sort") || "recent";
  const update = (key: string, value: string) => {
    const p = new URLSearchParams(q);
    if (value) p.set(key, value);
    else p.delete(key);
    if (key !== "page") p.delete("page");
    router.replace(`/app/clients?${p}`, { scroll: false });
  };
  const all = rows("clients");
  const relation = (client: Entity) => {
    if (!active(client)) return "archived";
    const projects = rows("projects").filter(
      (x) => s(x.client_id) === client.id,
    );
    return projects.some((x) => !terminal.includes(s(x.state)))
      ? "active"
      : projects.length
        ? "past"
        : "prospect";
  };
  const filtered = all
    .filter(
      (x) =>
        (relationship === "all" ? active(x) : relation(x) === relationship) &&
        `${titleOf(x)} ${s(x.company)} ${rows("contacts")
          .filter((c) => s(c.client_id) === x.id)
          .map((c) => `${s(c.display_name)} ${s(c.email)}`)
          .join(" ")}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
    )
    .sort(
      (x, y) =>
        (sort === "name"
          ? titleOf(x).localeCompare(titleOf(y))
          : sort === "next"
            ? s(x.next_action).localeCompare(s(y.next_action))
            : s(y.updated_at).localeCompare(s(x.updated_at))) ||
        x.id.localeCompare(y.id),
    );
  const page = Math.min(
    Math.max(1, Number(q.get("page")) || 1),
    Math.max(1, Math.ceil(filtered.length / 12)),
  );
  return (
    <>
      <PageHead
        title="People behind the projects."
        description="Keep the context. Make the next conversation easier."
        action={<Button onClick={() => setCreate(true)}>Add client</Button>}
      />
      <Panel>
        <div className="work-toolbar">
          <SearchBar
            value={search}
            onChange={(v) => update("q", v)}
            placeholder="Search clients"
          />
          <label>
            Relationship
            <select
              value={relationship}
              onChange={(e) => update("relationship", e.target.value)}
            >
              {["all", "prospect", "active", "past", "archived"].map((x) => (
                <option key={x} value={x}>
                  {x === "all" ? "All current clients" : optionLabel(x)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sort
            <select
              value={sort}
              onChange={(e) => update("sort", e.target.value)}
            >
              <option value="recent">Recent activity</option>
              <option value="name">Name</option>
              <option value="next">Next action</option>
            </select>
          </label>
        </div>
        <p className="work-filter-count" aria-live="polite">
          {filtered.length} client{filtered.length === 1 ? "" : "s"}
        </p>
        {filtered.slice((page - 1) * 12, page * 12).map((x) => {
          const contact = rows("contacts").find((c) => s(c.client_id) === x.id);
          return (
            <article className="work-record" key={x.id}>
              <div className="work-monogram">{titleOf(x).slice(0, 1)}</div>
              <div>
                <h3>
                  <Link
                    className="work-record-link"
                    href={`/app/clients/${x.id}`}
                  >
                    {titleOf(x)}
                  </Link>
                </h3>
                <p className="muted">
                  {s(contact?.display_name, "No contact yet")} ·{" "}
                  {s(contact?.email, "Add an email")}
                </p>
                <p>{s(x.next_action, "Ready for your next conversation")}</p>
              </div>
              <div className="work-record-actions">
                <Badge>{relation(x)}</Badge>
                <LinkButton variant="secondary" href={`/app/clients/${x.id}`}>
                  Open client
                </LinkButton>
              </div>
            </article>
          );
        })}
        {!filtered.length && (
          <Empty
            title={
              all.length
                ? "No clients match these filters"
                : "Make room for a new relationship"
            }
            description={
              all.length
                ? "Try another name, company or email."
                : "Add a client to keep their contacts and work together."
            }
          >
            {all.length ? (
              <Button
                variant="secondary"
                onClick={() => router.replace("/app/clients")}
              >
                Clear filters
              </Button>
            ) : (
              <Button onClick={() => setCreate(true)}>Add client</Button>
            )}
          </Empty>
        )}
        {filtered.length > 12 && (
          <Paging
            count={filtered.length}
            page={page}
            onChange={(p) => update("page", String(p))}
          />
        )}
      </Panel>
      {create && (
        <ClientEditor
          onClose={() => setCreate(false)}
          onSaved={(id) => {
            setCreate(false);
            router.push(`/app/clients/${id}`);
          }}
        />
      )}
    </>
  );
}

function ClientDetail({ id }: { id: string }) {
  const { record, rows, command } = useStore();
  const q = useSearchParams();
  const client = record("clients", id);
  const [edit, setEdit] = useState(q.get("edit") === "1"),
    [archive, setArchive] = useState(false),
    [error, setError] = useState("");
  if (!client) return <Missing kind="client" />;
  const contacts = rows("contacts").filter((x) => s(x.client_id) === id),
    projects = rows("projects").filter((x) => s(x.client_id) === id),
    offers = rows("offers").filter((x) => s(x.client_id) === id),
    invoices = rows("invoices").filter((x) => s(x.client_id) === id),
    notes = rows("private_notes").filter((x) => s(x.client_id) === id);
  const tab = q.get("tab") || "overview";
  const blocked = projects.some((x) => !terminal.includes(s(x.state)));
  return (
    <>
      <Link className="work-return" href="/app/clients">
        ← All clients
      </Link>
      <PageHead
        title={titleOf(client)}
        description={s(
          client.profession_context,
          "A relationship worth keeping close.",
        )}
        action={
          <Button variant="secondary" onClick={() => setEdit(true)}>
            Edit client
          </Button>
        }
      />
      <Tabs
        items={["overview", "messages", "files", "next"].map((x) => ({
          label: x === "next" ? "Next steps" : label(x),
          href: `/app/clients/${id}?tab=${x}`,
        }))}
      />
      <ErrorText message={error} />
      {tab === "messages" ? (
        <Messages clientId={id} />
      ) : tab === "files" ? (
        <Files clientId={id} />
      ) : tab === "next" ? (
        <Panel>
          <h2>Next steps</h2>
          <p>
            {s(
              client.next_action,
              "Review your linked projects and plan the next conversation.",
            )}
          </p>
          {projects.map((x) => (
            <div className="work-info-line" key={x.id}>
              <div>
                <strong>{titleOf(x)}</strong>
                <p>
                  {label(x.inputs_state)} · {label(x.state)}
                </p>
              </div>
              <LinkButton
                variant="secondary"
                href={`/app/projects/${x.id}?inputs=1`}
              >
                Review inputs
              </LinkButton>
            </div>
          ))}
        </Panel>
      ) : (
        <div className="stack">
          <Panel>
            <div className="work-intro">
              <div className="work-avatar-large">
                {titleOf(client).slice(0, 1)}
              </div>
              <div>
                <h2>In good company.</h2>
                <p className="muted">
                  {s(client.company, titleOf(client))} · Timezone:{" "}
                  {s(client.timezone, "Unknown")}
                </p>
              </div>
            </div>
            {contacts.map((x) => (
              <div className="work-info-line" key={x.id}>
                <div>
                  <strong>{s(x.display_name)}</strong>
                  <p>{s(x.email, "Email not added")}</p>
                </div>
                <span>{s(x.role_label, "Primary contact")}</span>
              </div>
            ))}
            {!contacts.length && (
              <p className="muted">
                Add a primary contact to prepare messages.
              </p>
            )}
          </Panel>
          <Panel>
            <h2>The work together</h2>
            {projects.map((x) => (
              <div className="work-info-line" key={x.id}>
                <div>
                  <strong>{titleOf(x)}</strong>
                  <p className="muted">Project · {label(x.state)}</p>
                </div>
                <LinkButton variant="secondary" href={`/app/projects/${x.id}`}>
                  View project
                </LinkButton>
              </div>
            ))}
            {offers.map((x) => (
              <div className="work-info-line" key={x.id}>
                <div>
                  <strong>
                    {titleOf(record("offer_versions", s(x.current_version_id)))}
                  </strong>
                  <p className="muted">Offer · {label(x.status)}</p>
                </div>
                <LinkButton variant="secondary" href={`/app/offers/${x.id}`}>
                  View offer
                </LinkButton>
              </div>
            ))}
            {invoices.map((x) => (
              <div className="work-info-line" key={x.id}>
                <div>
                  <strong>
                    {s(x.number, s(x.invoice_number, titleOf(x)))}
                  </strong>
                  <p className="muted">Invoice · {label(x.state)}</p>
                </div>
                <LinkButton
                  variant="secondary"
                  href={`/app/money/invoices/${x.id}`}
                >
                  View invoice
                </LinkButton>
              </div>
            ))}
            {!projects.length && !offers.length && !invoices.length && (
              <p className="muted">
                No linked projects, offers or invoices yet.
              </p>
            )}
          </Panel>
          <Panel>
            <h2>Private notes</h2>
            <p className="work-field-hint">Only visible in your workspace.</p>
            {notes.length ? (
              notes.map((x) => (
                <p className="work-private-note" key={x.id}>
                  {s(x.content)}
                </p>
              ))
            ) : client.private_notes ? (
              <p className="work-private-note">{s(client.private_notes)}</p>
            ) : (
              <p className="muted">
                Add useful context for your next conversation.
              </p>
            )}
          </Panel>
          <Panel>
            <details>
              <summary>Client actions</summary>
              <p className="muted">
                Archived clients keep their offers, project and financial
                history.
              </p>
              <Button
                variant="secondary"
                disabled={blocked}
                onClick={() => setArchive(true)}
              >
                {active(client) ? "Archive client" : "Restore client"}
              </Button>
              {blocked && (
                <p className="work-field-hint">
                  Finish or cancel accepted work before archiving this client.
                </p>
              )}
            </details>
          </Panel>
        </div>
      )}
      {edit && (
        <ClientEditor
          client={client}
          onClose={() => setEdit(false)}
          onSaved={() => setEdit(false)}
        />
      )}{" "}
      {archive && (
        <Confirm
          title={`${active(client) ? "Archive" : "Restore"} ${titleOf(client)}?`}
          description="The client’s linked records and financial history will be preserved."
          onClose={() => setArchive(false)}
          onConfirm={async () => {
            const r = (await command("record.archive", {
              table: "clients",
              id,
              expected_version: client.version,
              archived: active(client),
            }));
            if (r.ok) setArchive(false);
            else setError(r.message);
          }}
        />
      )}
    </>
  );
}

function EventEditor({
  event,
  onClose,
  onSaved,
}: {
  event?: Entity;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { rows, state, command } = useStore();
  const timezone = s(event?.timezone, s(rows("policies")[0]?.timezone, "Asia/Jakarta"));
  const [name, setName] = useState(s(event?.title)),
    [start, setStart] = useState(
      event?.starts_at ? localDateTime(s(event.starts_at), timezone) : `${localDateTime(state.sample_clock, timezone).slice(0, 10)}T09:00`,
    ),
    [end, setEnd] = useState(
      event?.ends_at ? localDateTime(s(event.ends_at), timezone) : `${localDateTime(state.sample_clock, timezone).slice(0, 10)}T10:00`,
    ),
    [kind, setKind] = useState(s(event?.kind, "internal_work")),
    [project, setProject] = useState(s(event?.project_id)),
    [contact, setContact] = useState(a<string>(event?.attendee_ids)[0] || ""),
    [error, setError] = useState(""),
    [acceptedOverlap, setAcceptedOverlap] = useState("");
  const [expectedVersion] = useState(event?.version);
  const locked =
    !!event &&
    ["committed_start", "committed_deadline", "provisional"].includes(
      s(event.kind),
    );
  const instant = (value: string) => {
    try { return Date.parse(zonedDateTime(value.slice(0, 10), value.slice(11), timezone)); }
    catch { return NaN; }
  };
  const overlap = rows("calendar_events").filter(
    (x) =>
      x.id !== event?.id &&
      active(x) &&
      !["cancelled", "completed"].includes(s(x.state)) &&
      Date.parse(s(x.starts_at)) < instant(end) &&
      Date.parse(s(x.ends_at)) > instant(start),
  );
  const overlapFingerprint = calendarOverlapFingerprint({ start, end, timezone, project, contact, kind }, overlap);
  const overlapAccepted = acceptedOverlap === overlapFingerprint;
  async function save() {
    if (!name.trim()) return setError("Enter an event name.");
    let startAt: string, endAt: string;
    try { startAt = zonedDateTime(start.slice(0, 10), start.slice(11), timezone); endAt = zonedDateTime(end.slice(0, 10), end.slice(11), timezone); }
    catch (error) { return setError(error instanceof Error ? error.message : "Choose valid event times."); }
    const from = new Date(startAt), to = new Date(endAt);
    if (
      !start ||
      !end ||
      !Number.isFinite(from.getTime()) ||
      !Number.isFinite(to.getTime()) ||
      to <= from
    )
      return setError("Choose a valid end time after the start.");
    if (to.getTime() - from.getTime() > 86400000)
      return setError("A work block can be no longer than 24 hours.");
    if (kind === "client_meeting" && !contact)
      return setError("Choose a known client attendee.");
    if (overlap.length && !overlapAccepted) {
      setAcceptedOverlap(overlapFingerprint);
      return setError(
        `This overlaps ${overlap.map(titleOf).join(", ")}. Save again to keep both blocks.`,
      );
    }
    const result = (await command("record.save", {
      table: "calendar_events",
      id: event?.id,
      expected_version: expectedVersion,
      values: {
        title: name.trim(),
        starts_at: startAt,
        ends_at: endAt,
        kind,
        project_id: project || null,
        attendee_ids: kind === "client_meeting" ? [contact] : [],
        timezone,
        state: kind === "client_meeting" ? "proposed" : "scheduled",
        external_invitation_state: "not_requested",
        shared_with_buyer: false,
        connection_id: null,
      },
    }));
    if (result.ok) onSaved();
    else setError(result.message);
  }
  if (locked)
    return (
      <Modal title={titleOf(event)} onClose={onClose}>
        <p>
          <Badge>{label(event.state)}</Badge> · {label(event.kind)}
        </p>
        <p>
          {when(event.starts_at)} — {when(event.ends_at)}
        </p>
        <p className="work-notice">
          This date is linked to an accepted commitment. Calendar edits cannot
          change it.
        </p>
        <LinkButton
          variant="secondary"
          href={`/app/projects/${s(event.project_id)}`}
        >
          View project
        </LinkButton>
      </Modal>
    );
  return (
    <Editor
      title={event ? "Edit calendar item" : "Make time for the work"}
      onClose={onClose}
      onSave={save}
      saveLabel={
        overlapAccepted ? "Save overlapping item" : "Save calendar item"
      }
      error={error}
    >
      <Field label="Event name">
        <input
          value={name}
          required
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </Field>
      <div className="grid2">
        <Field label={`Start — ${timezone}`}>
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              setAcceptedOverlap("");
            }}
          />
        </Field>
        <Field label={`End — ${timezone}`}>
          <input
            type="datetime-local"
            value={end}
            onChange={(e) => {
              setEnd(e.target.value);
              setAcceptedOverlap("");
            }}
          />
        </Field>
      </div>
      <Field label="Type">
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="internal_work">Internal work block</option>
          <option value="client_meeting">Client meeting proposal</option>
        </select>
      </Field>
      <Field label="Project">
        <select value={project} onChange={(e) => setProject(e.target.value)}>
          <option value="">No project</option>
          {rows("projects")
            .filter((x) => !terminal.includes(s(x.state)))
            .map((x) => (
              <option key={x.id} value={x.id}>
                {titleOf(x)}
              </option>
            ))}
        </select>
      </Field>
      {kind === "client_meeting" && (
        <Field label="Client attendee">
          <select value={contact} onChange={(e) => setContact(e.target.value)}>
            <option value="">Choose a contact</option>
            {rows("contacts").map((x) => (
              <option key={x.id} value={x.id}>
                {s(x.display_name)} — {s(x.email)}
              </option>
            ))}
          </select>
        </Field>
      )}
      <p className="work-field-hint">
        {kind === "client_meeting"
          ? state.mode === "connected" ? "This saves an unsent proposal. Review the exact invitation before sending." : "This saves an unsent proposal. Review the exact invitation before a demo send."
          : "An internal work block does not invite anyone or change accepted project dates."}
      </p>
    </Editor>
  );
}

function EventDetail({
  event,
  onClose,
  onEdit,
}: {
  event: Entity;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { record, command, connected } = useStore();
  const [review, setReview] = useState(false),
    [reviewVersion, setReviewVersion] = useState<number | undefined>(),
    [reviewRecipients, setReviewRecipients] = useState<string[]>([]),
    [error, setError] = useState(""),
    [archive, setArchive] = useState(false);
  const invitingRef = useRef(false);
  const [inviting, setInviting] = useState(false);
  const recipientIds = a<string>(event.attendee_ids);
  const recipients = recipientIds
    .map((id) => s(record("contacts", id)?.email))
    .filter(Boolean);
  const editable = ![
    "committed_start",
    "committed_deadline",
    "provisional",
  ].includes(s(event.kind));
  async function invite() {
    if (invitingRef.current) return;
    invitingRef.current = true;
    setInviting(true);
    try {
    if (
      event.version !== reviewVersion ||
      JSON.stringify(recipients) !== JSON.stringify(reviewRecipients)
    )
      return setError(
        "The time or attendee details changed. Close this review and review the current invitation.",
      );
    const r = (await command("calendar.approve", {
      id: event.id,
      expected_version: event.version,
      recipients,
    }));
    if (!r.ok) return setError(r.message);
    const sent = (await command("calendar.invite", { id: event.id, recipients }));
    if (sent.ok) {
      setReview(false);
      onClose();
    } else setError(sent.message);
    } finally { invitingRef.current = false; setInviting(false); }
  }
  return (
    <Modal title={titleOf(event)} onClose={() => { if (!invitingRef.current) onClose(); }}>
      <div className="stack">
        <p>
          <Badge>{label(event.state)}</Badge> · {label(event.kind)}
        </p>
        <dl>
          <dt>When</dt>
          <dd>
            {when(event.starts_at)} — {when(event.ends_at)}
          </dd>
          <dt>Timezone</dt>
          <dd>{s(event.timezone, "Asia/Jakarta")}</dd>
          <dt>Invitation</dt>
          <dd>{connected && event.external_invitation_state === "sample_invited" ? "Invitation sent" : label(event.external_invitation_state) || "Not requested"}</dd>
        </dl>
        {event.project_id ? (
          <LinkButton
            variant="secondary"
            href={`/app/projects/${s(event.project_id)}`}
          >
            View project
          </LinkButton>
        ) : null}
        {recipients.length > 0 && (
          <div>
            <h3>Attendees</h3>
            {recipientIds.map((id) => (
              <p key={id}>
                {s(record("contacts", id)?.display_name)} ·{" "}
                {s(record("contacts", id)?.email)} · Timezone{" "}
                {s(record("contacts", id)?.timezone, "Unknown")}
              </p>
            ))}
          </div>
        )}
        <ErrorText message={error} />
        {review ? (
          <>
            <div className="work-notice">
              {connected ? "Send this exact title, time, timezone and attendee list through Google Calendar. Attendance remains pending until the buyer responds." : "Send this exact title, time, timezone and attendee list as a sample invitation. Attendance remains pending until the buyer responds."}
            </div>
            <div className="actions">
              <Button disabled={inviting} pendingLabel="Sending invitation…" onClick={invite}>
                {connected ? "Approve and send invitation" : "Approve and send sample invitation"}
              </Button>
              <Button disabled={inviting} variant="secondary" onClick={() => setReview(false)}>
                Cancel review
              </Button>
            </div>
          </>
        ) : (
          <div className="actions">
            {editable && (
              <Button variant="secondary" onClick={onEdit}>
                Edit calendar item
              </Button>
            )}
            {s(event.kind) === "client_meeting" &&
              s(event.external_invitation_state) !== "sample_invited" && (
                <Button
                  onClick={() => {
                    setReviewVersion(event.version);
                    setReviewRecipients(recipients);
                    setReview(true);
                  }}
                >
                  Review invitation
                </Button>
              )}
            {editable && (
              <Button variant="secondary" onClick={() => setArchive(true)}>
                Archive item
              </Button>
            )}
          </div>
        )}
        {!editable && (
          <p className="work-field-hint">
            This event follows an accepted project commitment. Request a revised
            agreement to change it.
          </p>
        )}
        {archive && (
          <Confirm
            title="Archive calendar item?"
            description={
              s(event.external_invitation_state) === "sample_invited"
                ? "This preserves the sent invitation. A cancellation proposal will be saved for review; no external invitation is cancelled."
                : "This removes the internal block from the current calendar. You can restore it from archived items."
            }
            onClose={() => setArchive(false)}
            onConfirm={async () => {
              const result =
                s(event.external_invitation_state) === "sample_invited"
                  ? (await command("calendar.proposeCancellation", {
                      id: event.id,
                      expected_version: event.version,
                    }))
                  : (await command("record.archive", {
                      table: "calendar_events",
                      id: event.id,
                      expected_version: event.version,
                      archived: true,
                    }));
              if (result.ok) onClose();
              else setError(result.message);
            }}
          />
        )}
      </div>
    </Modal>
  );
}

function Reservation({
  reservation,
  onClose,
}: {
  reservation: Entity;
  onClose: () => void;
}) {
  const { record, rows, command } = useStore();
  const router = useRouter();
  const project = record("projects", s(reservation.project_id));
  const invoice = rows("invoices").find((x) => s(x.project_id) === project?.id);
  const [planning, setPlanning] = useState(false),
    [target, setTarget] = useState(""),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [discard, setDiscard] = useState(false),
    [applyReview, setApplyReview] = useState<{
      projectVersion: number;
      reservationVersion: number;
      acceptedVersion: string;
    } | null>(null);
  const [baseProjectVersion] = useState(project?.version),
    [baseReservationVersion] = useState(reservation.version);
  const accepted = record("offer_versions", s(project?.accepted_version_id)),
    terms = o(accepted?.terms),
    proposed = s(terms.proposed_start_at);
  const canReplan =
    !!project &&
    !terminal.includes(s(project.state)) &&
    (["expired", "released"].includes(s(reservation.state)) ||
      s(project.state) === "needs_rescheduling");
  let proposedDates: { start: string; due: string } | null = null;
  try {
    if (proposed) proposedDates = amendmentSchedule(proposed, terms);
  } catch {}
  const pendingOffer = record("offers", s(project?.offer_id));
  useDirtyGuard(planning && !!(target || reason));
  const close = () =>
    planning && (target || reason) ? setDiscard(true) : onClose();
  async function save() {
    if (!project) return setError("This reservation has no available project.");
    if (!target) return setError("Choose a valid start date.");
    if (reason.trim().length < 5)
      return setError(
        "Explain the schedule change in at least five characters.",
      );
    const result = (await command("project.proposeReschedule", {
      id: project.id,
      expected_version: baseProjectVersion,
      expected_reservation_version: baseReservationVersion,
      proposed_start_at: zonedDateTime(target, s(terms.start_local_time, "09:00"), s(terms.timezone, "Asia/Jakarta")),
      reason: reason.trim(),
    }));
    if (result.ok) {
      onClose();
      router.push(
        `/app/offers/${s(result.ids?.offer_id, s(project.offer_id))}`,
      );
    } else setError(result.message);
  }
  async function apply() {
    if (!project || !applyReview) return;
    if (project.accepted_version_id !== applyReview.acceptedVersion)
      return setError(
        "The accepted agreement changed. Close this review and inspect the latest schedule.",
      );
    const result = (await command("project.reschedule", {
      id: project.id,
      expected_version: applyReview.projectVersion,
      expected_reservation_version: applyReview.reservationVersion,
      confirmed: true,
    }));
    if (result.ok) onClose();
    else setError(result.message);
  }
  return (
    <>
      <Modal
        title={applyReview ? "Review accepted schedule" : "Project reservation"}
        onClose={close}
      >
        <div className="stack">
          <p>
            {titleOf(project)} · <Badge>{label(reservation.state)}</Badge>
          </p>
          <dl className="work-facts">
            <div>
              <dt>Previous held start</dt>
              <dd>{when(reservation.start_at)}</dd>
            </div>
            <div>
              <dt>Previous delivery due</dt>
              <dd>{when(reservation.due_at)}</dd>
            </div>
            <div>
              <dt>Provisional expiry</dt>
              <dd>{when(reservation.expires_at)}</dd>
            </div>
          </dl>
          <p>
            Deposit: {label(project?.deposit_state)} · Inputs:{" "}
            {label(project?.inputs_state)}
          </p>
          <div className="actions">
            {invoice && (
              <LinkButton
                variant="secondary"
                href={`/app/money/invoices/${invoice.id}`}
              >
                View deposit
              </LinkButton>
            )}
            {project && (
              <LinkButton
                variant="secondary"
                href={`/app/projects/${project.id}?inputs=1`}
              >
                Review inputs
              </LinkButton>
            )}
            {project?.offer_id ? (
              <LinkButton
                variant="secondary"
                href={`/app/offers/${s(project.offer_id)}`}
              >
                Review agreement
              </LinkButton>
            ) : null}
          </div>
          {applyReview && proposedDates ? (
            <>
              <h3>Buyer-accepted revised dates</h3>
              <dl>
                <dt>New start</dt>
                <dd>{when(proposedDates.start)}</dd>
                <dt>New delivery due</dt>
                <dd>{when(proposedDates.due)}</dd>
                <dt>Accepted version</dt>
                <dd>{applyReview.acceptedVersion}</dd>
              </dl>
              <p className="work-notice">
                Apply only this buyer-accepted schedule after all prerequisites
                are confirmed. Existing accepted scope, previous dates, payment
                records and external invitations remain in history.
              </p>
              <Button onClick={apply}>Apply accepted schedule</Button>
              <Button variant="secondary" onClick={() => setApplyReview(null)}>
                Keep current schedule
              </Button>
            </>
          ) : (
            <>
              {canReplan && (
                <Button
                  variant="secondary"
                  disabled={!project?.offer_id}
                  onClick={() => setPlanning(true)}
                >
                  Plan a new start
                </Button>
              )}
              {canReplan &&
                proposedDates &&
                project &&
                pendingOffer?.accepted_version_id ===
                  project.accepted_version_id && (
                  <Button
                    onClick={() =>
                      setApplyReview({
                        projectVersion: project.version,
                        reservationVersion: reservation.version,
                        acceptedVersion: s(project.accepted_version_id),
                      })
                    }
                  >
                    Review accepted schedule
                  </Button>
                )}
              {!canReplan && (
                <p className="work-field-hint">
                  A provisional hold lasts 48 elapsed hours. Complete
                  prerequisites commit dates using the accepted business-day
                  terms.
                </p>
              )}
              {canReplan && !project?.offer_id && (
                <p className="work-field-hint">
                  This external agreement needs a separately recorded client
                  agreement before new committed dates can be entered.
                </p>
              )}
              {planning && (
                <>
                  <Field label="Proposed start date">
                    <input
                      type="date"
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                    />
                  </Field>
                  <Field label="Reason for schedule change">
                    <textarea
                      className="resize-none"
                      maxLength={1000}
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </Field>
                  <p className="work-notice">
                    This saves a proposed calendar plan and a new offer
                    amendment. The buyer must accept the exact revised dates
                    before they become a commitment. Previous dates and accepted
                    terms stay intact.
                  </p>
                  <Button onClick={save}>Prepare revised schedule</Button>
                </>
              )}
            </>
          )}
          <ErrorText message={error} />
        </div>
      </Modal>
      {discard && (
        <Confirm
          title="Discard unsaved schedule proposal?"
          description="The current reservation and accepted dates will stay unchanged."
          onConfirm={onClose}
          onClose={() => setDiscard(false)}
        />
      )}
    </>
  );
}

function Calendar() {
  const { rows, record, state, command } = useStore();
  const q = useSearchParams(),
    router = useRouter();
  const anchor = q.get("date") || isoDay(state.sample_clock),
    view = q.get("view") || "week",
    project = q.get("project") || "all",
    source = q.get("source") || "all";
  const [editor, setEditor] = useState<string | null>(
      q.get("event") === "new" ? "new" : null,
    ),
    [detail, setDetail] = useState<string | null>(
      q.get("event") && q.get("event") !== "new" ? q.get("event") : null,
    ),
    [reservation, setReservation] = useState<string | null>(
      q.get("reservation"),
    ),
    [archived, setArchived] = useState(false);
  const update = (values: Record<string, string>) => {
    const p = new URLSearchParams(q);
    for (const [k, v] of Object.entries(values)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    router.replace(`/app/calendar?${p}`, { scroll: false });
  };
  const base = new Date(
    `${/^\d{4}-\d{2}-\d{2}$/.test(anchor) ? anchor : isoDay(state.sample_clock)}T00:00:00Z`,
  );
  const safeBase = Number.isFinite(base.getTime())
    ? base
    : new Date(`${isoDay(state.sample_clock)}T00:00:00Z`);
  const start = new Date(safeBase);
  if (view === "month" || view === "agenda") start.setUTCDate(1);
  const offset = (start.getUTCDay() + 6) % 7;
  if (view !== "agenda") start.setUTCDate(start.getUTCDate() - offset);
  const days = view === "week" ? 7 : view === "month" ? 42 : 31;
  const range = Array.from({ length: days }, (_, index) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + index);
    return d.toISOString().slice(0, 10);
  });
  const events = rows("calendar_events")
    .filter(
      (x) =>
        (archived || active(x)) &&
        (project === "all" || s(x.project_id) === project) &&
        (source === "all" ||
          (source === "commitments"
            ? ["committed_start", "committed_deadline"].includes(s(x.kind))
            : source === "internal"
              ? s(x.kind) === "internal_work"
              : s(x.kind) === "client_meeting")),
    )
    .sort(
      (x, y) =>
        s(x.starts_at).localeCompare(s(y.starts_at)) ||
        x.id.localeCompare(y.id),
    );
  const shown = events.filter((x) => range.includes(isoDay(x.starts_at)));
  const reservations = rows("reservations").filter(
    (x) => project === "all" || s(x.project_id) === project,
  );
  const move = (direction: number) => {
    const d = new Date(safeBase);
    if (view === "week") d.setUTCDate(d.getUTCDate() + 7 * direction);
    else d.setUTCMonth(d.getUTCMonth() + direction);
    update({ date: d.toISOString().slice(0, 10) });
  };
  const agenda = (
    <div>
      {shown.map((x) => (
        <article className="work-record" key={x.id}>
          <div className="work-monogram">{isoDay(x.starts_at).slice(8)}</div>
          <div>
            <h3>{titleOf(x)}</h3>
            <p className="muted">
              {when(x.starts_at)} · {label(x.kind)}
            </p>
            <Badge>{label(x.state)}</Badge>
          </div>
          <div className="work-record-actions">
            <Button variant="secondary" onClick={() => setDetail(x.id)}>
              View item
            </Button>
            {!active(x) && (
              <Button
                variant="secondary"
                onClick={async () =>
                  (await command("record.archive", {
                    table: "calendar_events",
                    id: x.id,
                    expected_version: x.version,
                    archived: false,
                  }))
                }
              >
                Restore
              </Button>
            )}
          </div>
        </article>
      ))}
      {!shown.length && (
        <Empty
          title="A little breathing room"
          description="No calendar items match this period and these filters."
        />
      )}
    </div>
  );
  return (
    <>
      <PageHead
        title="Make space for good work."
        description="Commitments, conversations and time to focus. Asia/Jakarta."
        action={
          <Button onClick={() => setEditor("new")}>Add calendar item</Button>
        }
      />
      <Panel>
        <div className="work-calendar-header">
          <div className="work-date-group">
            <Button
              variant="secondary"
              aria-label="Previous period"
              onClick={() => move(-1)}
            >
              ←
            </Button>
            <h2>
              {new Intl.DateTimeFormat("en-GB", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              }).format(safeBase)}
            </h2>
            <Button
              variant="secondary"
              aria-label="Next period"
              onClick={() => move(1)}
            >
              →
            </Button>
          </div>
          <div className="actions">
            <Button
              variant="secondary"
              onClick={() => update({ date: isoDay(state.sample_clock) })}
            >
              Today
            </Button>
            {["week", "month", "agenda"].map((x) => (
              <Button
                key={x}
                aria-pressed={view === x}
                variant={view === x ? undefined : "secondary"}
                onClick={() => update({ view: x })}
              >
                {x[0].toUpperCase() + x.slice(1)}
              </Button>
            ))}
          </div>
        </div>
        <div className="work-toolbar">
          <label>
            Go to date
            <input
              type="date"
              value={anchor}
              onChange={(e) => {
                if (e.target.value) update({ date: e.target.value });
              }}
            />
          </label>
          <label>
            Calendar source
            <select
              value={source}
              onChange={(e) => update({ source: e.target.value })}
            >
              <option value="all">All sources</option>
              <option value="commitments">Project commitments</option>
              <option value="internal">Internal work</option>
              <option value="meetings">Meeting proposals</option>
            </select>
          </label>
          <label>
            Project
            <select
              value={project}
              onChange={(e) => update({ project: e.target.value })}
            >
              <option value="all">All projects</option>
              {rows("projects").map((x) => (
                <option key={x.id} value={x.id}>
                  {titleOf(x)}
                </option>
              ))}
            </select>
          </label>
          {(project !== "all" || source !== "all") && (
            <Button
              variant="secondary"
              onClick={() => update({ source: "", project: "" })}
            >
              Clear filters
            </Button>
          )}
        </div>
        <label className="work-check">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />
          Show archived items
        </label>
        {view === "agenda" ? (
          agenda
        ) : (
          <>
            <div className="work-calendar-grid">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((x) => (
                <div className="work-calendar-weekday" key={x}>
                  {x}
                </div>
              ))}
              {range.map((day) => (
                <div
                  className={`work-calendar-day ${day === isoDay(state.sample_clock) ? "is-today" : ""}`}
                  key={day}
                >
                  <span>
                    {Number(day.slice(8))}
                    {day === isoDay(state.sample_clock) ? " · Today" : ""}
                  </span>
                  {shown
                    .filter((x) => isoDay(x.starts_at) === day)
                    .map((x) => (
                      <button
                        className="work-calendar-event"
                        key={x.id}
                        onClick={() => setDetail(x.id)}
                      >
                        {s(x.starts_at).slice(11, 16)}
                        <br />
                        {titleOf(x)}
                        <br />
                        <span>{label(x.state)}</span>
                      </button>
                    ))}
                </div>
              ))}
            </div>
            <div className="work-calendar-mobile">{agenda}</div>
          </>
        )}
      </Panel>
      {reservations.length > 0 && (
        <Panel>
          <h2>Project reservations</h2>
          {reservations.map((x) => (
            <div className="work-info-line" key={x.id}>
              <div>
                <strong>{titleOf(record("projects", s(x.project_id)))}</strong>
                <p className="muted">
                  {label(x.state)} · {date(x.start_at)} — {date(x.due_at)}
                </p>
              </div>
              <Button variant="secondary" onClick={() => setReservation(x.id)}>
                View reservation
              </Button>
            </div>
          ))}
        </Panel>
      )}
      {editor && (
        <EventEditor
          event={record("calendar_events", editor)}
          onClose={() => setEditor(null)}
          onSaved={() => setEditor(null)}
        />
      )}{" "}
      {detail &&
        (record("calendar_events", detail) ? (
          <EventDetail
            event={record("calendar_events", detail)!}
            onClose={() => setDetail(null)}
            onEdit={() => {
              setEditor(detail);
              setDetail(null);
            }}
          />
        ) : (
          <Modal
            title="Calendar item not found"
            onClose={() => setDetail(null)}
          >
            <p>This item is not available in your workspace.</p>
          </Modal>
        ))}{" "}
      {reservation &&
        (record("reservations", reservation) ? (
          <Reservation
            reservation={record("reservations", reservation)!}
            onClose={() => setReservation(null)}
          />
        ) : (
          <Modal
            title="Reservation not found"
            onClose={() => setReservation(null)}
          >
            <p>This link does not match a reservation.</p>
          </Modal>
        ))}
    </>
  );
}

export default function Work({ path }: { path: string }) {
  return (
    <>
      <WorkNav path={path} />
      {path.startsWith("/app/projects/") ? (
        <ProjectDetail key={path} id={path.split("/")[3]} />
      ) : path.startsWith("/app/clients/") ? (
        <ClientDetail key={path} id={path.split("/")[3]} />
      ) : path === "/app/clients" ? (
        <Clients />
      ) : path === "/app/calendar" ? (
        <Calendar />
      ) : path === "/app/projects" ? (
        <ProjectList />
      ) : (
        <Missing kind="page" />
      )}
    </>
  );
}

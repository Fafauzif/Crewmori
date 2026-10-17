import { a, b, n, o, primaryId, s, type Entity, type Input, type Result, type StoreState } from "./types";

/** Narrow owner workflows. They run inside execute's cloned transaction, never as generic record authority. */
export interface WorkCommandContext {
  get: (state: StoreState, table: string, id: unknown) => Entity;
  put: (state: StoreState, table: string, id: string, values: Input) => Entity;
  expect: (record: Entity, input: Input) => void;
  need: (value: unknown, message: string, code?: string) => void;
  identifier: (state: StoreState, prefix: string) => string;
}
const roles = ["scout", "promoter", "sales", "account_manager", "operations", "finance"];
const closed = ["completed", "cancelled", "archived"];

export function runWorkCommand(st: StoreState, type: string, input: Input, ctx: WorkCommandContext): Result | undefined {
  if (["file.attach", "file.remove"].includes(type)) ctx.need(!["offer_id", "project_id", "run_id", "invoice_id", "payment_request_id", "issue_id", "input_id"].some((key) => key in input), "Use the exact file identifier for this action.", "VALIDATION_ERROR");
  if (type === "file.attach" && input.grant_id) {
    const grant = st.tables.buyer_grants?.[s(input.grant_id)], values = o(input.values);
    const engagement = st.tables.engagements?.[s(grant?.engagement_id)];
    const canonical: Input = { project_id: grant?.project_id, conversation_id: grant?.conversation_id, engagement_id: grant?.engagement_id, client_id: engagement?.client_id };
    for (const field of Object.keys(canonical)) if (values[field] !== undefined && values[field] !== null && values[field] !== "") ctx.need(values[field] === canonical[field], "Every file reference must belong to your current client space.", "NOT_AUTHORIZED");
  }
  if (["record.save", "record.archive"].includes(type) && ["milestones", "work_tasks"].includes(s(input.table))) ctx.need(false, "Use the dedicated workflow for tasks and milestones.", "COMMAND_NOT_ALLOWED");
  if (["file.attach", "file.remove"].includes(type) && input.id) {
    const file = st.tables.attachments?.[s(input.id)];
    const project = st.tables.projects?.[s(file?.project_id)];
    if (file && input.grant_id) {
      const grant = st.tables.buyer_grants?.[s(input.grant_id)];
      ctx.need(file.uploaded_by_kind === "buyer" && file.uploaded_by_engagement_id === grant?.engagement_id && file.shared_with_buyer === true && file.audience === "buyer", "Only your own available buyer uploads can be changed. Ask the owner to review this file.", "NOT_AUTHORIZED");
    }
    if (file && project?.professional_delivery_state === "buyer_accepted" && file.shared_with_buyer) ctx.need(false, "Keep the accepted shared file unchanged. Add a new version instead.", "INVALID_STATE");
    if (file && type === "file.attach") ctx.need(o(input.values).storage_locator === file.storage_locator, "Add replacement bytes as a new file version so the original stays available.", "INVALID_STATE");
    if (file && type === "file.attach" && input.grant_id) {
      const values = o(input.values);
      // A message retry may reconcile a file already attached by the same buyer without editing it.
      if (file.availability === "available" && s(values.name, s(values.filename)) === file.name && s(values.media_type, s(values.mime_type)) === file.media_type && n(values.byte_length, n(values.size_bytes)) === file.byte_length) return { ok: true, id: file.id, replayed: true, message: "File already attached to this client space." };
    }
    if (file) {
      ctx.need(Number.isInteger(input.expected_version), "Reopen this file to review its latest version before changing it.", "STALE_VERSION");
      ctx.expect(file, input);
    }
  }
  if (!["task.save", "project.updateTask", "task.complete", "task.reopen", "task.archive", "task.restore", "milestone.save", "milestone.proposeChange", "calendar.proposeCancellation", "file.link", "file.archive", "file.attach"].includes(type)) return;
  // Buyer attachment scope remains in the existing grant-bound workflow.
  if (type === "file.attach" && (input.grant_id || input.actor === "buyer")) return;
  // Receipt/expense and client-level uploads use the existing owner-private attachment contract.
  if (type === "file.attach" && !o(input.values).project_id) return;
  const { get, put, expect, need, identifier } = ctx;
  need(!input.grant_id && input.actor !== "buyer", "This action requires the workspace owner.", "NOT_AUTHORIZED");
  const values = o(input.values);
  const keys = (allowed: string[]) => need(Object.keys(values).every((key) => allowed.includes(key)), "Some fields belong to a separate reviewed workflow.", "FIELD_NOT_EDITABLE");
  const existing = (table: string, allowNewId = false) => {
    if (!input.id) return;
    if (allowNewId && !st.tables[table]?.[s(input.id)]) return;
    const record = get(st, table, input.id);
    need(Number.isInteger(input.expected_version), "Reopen this record to review its latest version before saving.", "STALE_VERSION");
    expect(record, input);
    return record;
  };
  const projectFor = (projectId: unknown) => {
    const project = get(st, "projects", projectId);
    need(!closed.includes(s(project.state)) && !project.archived, "Reopen the project before changing its working records.", "INVALID_STATE");
    return project;
  };
  const date = (value: unknown, optional = false) => need((optional && !value) || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))), "Choose a valid date and time.");
  const result = (message: string, id: string): Result => ({ ok: true, message, id });

  if (type === "calendar.proposeCancellation") {
    const event = existing("calendar_events");
    need(event && event.external_invitation_state === "sample_invited", "Choose an invitation that was already sent.", "INVALID_STATE");
    if (!event) return;
    const id = identifier(st, "change_request");
    put(st, "change_requests", id, { calendar_event_id: event.id, calendar_event_version: event.version, project_id: event.project_id || null, type: "invitation_cancellation", state: "draft", audience: "owner" });
    return result("Cancellation note saved for review. The external invitation is unchanged; cancel it in the provider calendar when ready.", id);
  }

  if (["project.updateTask", "task.complete", "task.reopen", "task.archive", "task.restore"].includes(type)) {
    const task = get(st, "work_tasks", input.id || input.task_id);
    need(Number.isInteger(input.expected_version), "Reopen this task to review its latest version.", "STALE_VERSION");
    expect(task, input);
    const project = projectFor(task.project_id);
    need(!(project.professional_delivery_state === "buyer_accepted" && task.assignee_kind === "owner"), "Accepted professional delivery remains in the project history.", "INVALID_STATE");
    let changes: Input;
    if (type === "task.archive" || type === "task.restore") changes = { archived: type === "task.archive" };
    else {
      need(!task.archived && task.state !== "cancelled", "Restore the task before changing its progress.", "INVALID_STATE");
      if (type === "project.updateTask") {
        keys(["state"]);
        need(["not_started", "in_progress", "blocked"].includes(s(values.state)), "Use the dedicated completion action for finished work.", "INVALID_STATE");
        changes = { state: values.state };
      } else if (type === "task.reopen") {
        need(["completed", "owner_reported_delivered"].includes(s(task.state)), "Only a completed task can be reopened.", "INVALID_STATE");
        changes = { state: "not_started" };
      } else {
        need(["not_started", "in_progress", "blocked"].includes(s(task.state)), "This task is already complete.", "INVALID_STATE");
        changes = { state: task.task_kind === "professional" || (task.kind !== "administrative" && task.assignee_kind === "owner") ? "owner_reported_delivered" : "completed" };
      }
    }
    put(st, "work_tasks", task.id, changes);
    return result("Task updated. Project delivery remains separate.", task.id);
  }

  if (type === "task.save") {
    keys(["project_id", "title", "notes", "kind", "assignee_id", "due_at", "milestone_id", "shared_with_buyer"]);
    const prior = existing("work_tasks");
    const project = projectFor(values.project_id);
    need(!prior || prior.project_id === project.id, "Tasks cannot move to a different project.", "NOT_AUTHORIZED");
    need(!(prior?.assignee_kind === "owner" && project.professional_delivery_state === "buyer_accepted"), "Accepted professional delivery remains in the project history.", "INVALID_STATE");
    need(s(values.title).trim().length > 0 && s(values.title).length <= 160, "Enter a task name of up to 160 characters.");
    need(typeof values.notes === "string" && s(values.notes).length <= 4000, "Keep task details within 4,000 characters.");
    need(["professional", "administrative"].includes(s(values.kind)), "Choose professional or administrative work.");
    const ownerId = primaryId(st, "owners", "owner_alya");
    const responsible = s(values.assignee_id);
    need(responsible === ownerId || roles.includes(responsible), "Choose yourself or a known crew member.");
    need(values.kind !== "professional" || responsible === ownerId, "Professional work must be assigned to you.");
    need(typeof values.shared_with_buyer === "boolean", "Choose who can see this task.");
    date(values.due_at, true);
    if (values.milestone_id) {
      const milestone = get(st, "milestones", values.milestone_id);
      need(milestone.project_id === project.id && !milestone.archived, "Choose an active milestone from this project.", "NOT_AUTHORIZED");
    }
    const id = prior?.id || identifier(st, "work_task");
    put(st, "work_tasks", id, { project_id: project.id, title: s(values.title).trim(), notes: values.notes, kind: values.kind, task_kind: values.kind, assignee_id: responsible, assignee_kind: responsible === ownerId ? "owner" : "agent", due_at: values.due_at || null, milestone_id: values.milestone_id || null, shared_with_buyer: values.shared_with_buyer, audience: values.shared_with_buyer ? "buyer" : "owner", state: s(prior?.state, "not_started") });
    if (!prior) put(st, "projects", project.id, { work_task_ids: [...new Set([...a<string>(project.work_task_ids), id])] });
    return result("Task saved. Project delivery remains separate.", id);
  }

  if (type === "milestone.save" || type === "milestone.proposeChange") {
    keys(["project_id", "title", "due_at", "notes", "task_ids"]);
    const prior = existing("milestones"), project = projectFor(values.project_id);
    need(!prior || prior.project_id === project.id, "Milestones cannot move to a different project.", "NOT_AUTHORIZED");
    need(s(values.title).trim().length > 0 && s(values.title).length <= 120, "Enter a milestone name of up to 120 characters.");
    need(s(values.notes).length <= 1000, "Keep the reason within 1,000 characters.");
    date(values.due_at);
    need(!project.committed_start_at || Date.parse(s(values.due_at)) >= Date.parse(s(project.committed_start_at)), "The target must be on or after the committed start.");
    const contractual = !!prior && b(prior.shared_with_buyer) && prior.due_at === project.committed_due_at;
    if (type === "milestone.proposeChange") {
      need(contractual && prior?.due_at !== values.due_at, "Choose a different target for an agreed milestone.", "INVALID_STATE");
      need(s(values.notes).trim().length >= 5, "Describe why the agreed target needs to change.");
      const id = identifier(st, "change_request");
      put(st, "change_requests", id, { project_id: project.id, offer_id: project.offer_id || null, milestone_id: prior?.id, type: "schedule", proposed_due_at: values.due_at, reason: s(values.notes).trim(), state: "draft", audience: "owner" });
      return result("Change note saved for review. Accepted dates are unchanged; review the agreement amendment before sharing.", id);
    }
    need(!contractual || prior?.due_at === values.due_at, "This is an agreed date. Prepare a change proposal instead.", "AMENDMENT_REQUIRED");
    need(Array.isArray(values.task_ids) && a(values.task_ids).every((id) => typeof id === "string"), "Choose valid task assignments.");
    const selected = new Set(a<string>(values.task_ids));
    const tasks = Object.values(st.tables.work_tasks || {});
    for (const id of selected) {
      const task = get(st, "work_tasks", id);
      need(task.project_id === project.id && !task.archived, "A selected task is no longer active in this project.", "NOT_AUTHORIZED");
    }
    const affected = tasks.filter((task) => selected.has(task.id) || (!!prior && task.milestone_id === prior.id));
    for (const task of affected) {
      need(task.project_id === project.id, "A linked task belongs to a different project.", "NOT_AUTHORIZED");
      need(Number.isInteger(o(input.expected_task_versions)[task.id]), "A linked task changed. Reopen the milestone and compare its assignments.", "STALE_VERSION");
      expect(task, { expected_version: o(input.expected_task_versions)[task.id] });
    }
    const id = prior?.id || identifier(st, "milestone");
    put(st, "milestones", id, { project_id: project.id, title: s(values.title).trim(), due_at: values.due_at, notes: s(values.notes), state: s(prior?.state, "not_started"), shared_with_buyer: b(prior?.shared_with_buyer), audience: prior?.audience || "owner" });
    if (!prior) put(st, "projects", project.id, { milestone_ids: [...new Set([...a<string>(project.milestone_ids), id])] });
    for (const task of affected) {
      const milestoneId = selected.has(task.id) ? id : null;
      if (task.milestone_id !== milestoneId) put(st, "work_tasks", task.id, { milestone_id: milestoneId });
    }
    return result("Milestone and task assignments saved together.", id);
  }

  if (type === "file.archive") {
    const file = existing("attachments");
    need(file, "Choose a saved file.", "NOT_FOUND");
    if (!file) return;
    const project = projectFor(file.project_id);
    need(!(project.professional_delivery_state === "buyer_accepted" && file.shared_with_buyer), "Keep the accepted shared file in the project history.", "INVALID_STATE");
    put(st, "attachments", file.id, { archived: input.archived !== false });
    return result(input.archived === false ? "File restored." : "File archived; its history is retained.", file.id);
  }

  // Physical uploads and external references share explicit owner/project/visibility validation.
  keys(["name", "project_id", "client_id", "media_type", "mime_type", "storage_kind", "storage_locator", "byte_length", "size_bytes", "sha256", "shared_with_buyer", "replaces_attachment_id"]);
  const prior = existing("attachments", true), project = projectFor(values.project_id);
  need(!prior || prior.project_id === project.id, "Files cannot move to another project.", "NOT_AUTHORIZED");
  need(!values.client_id || values.client_id === project.client_id, "This file belongs to the project's client.", "NOT_AUTHORIZED");
  need(s(values.name).trim().length > 0 && s(values.name).length <= 160, "Give the file a descriptive name of up to 160 characters.");
  need(typeof values.shared_with_buyer === "boolean", "Choose who can see this file.");
  if (prior) need(!(project.professional_delivery_state === "buyer_accepted" && prior.shared_with_buyer), "Keep the accepted shared file unchanged. Add a new version instead.", "INVALID_STATE");
  if (values.replaces_attachment_id) {
    const replacement = get(st, "attachments", values.replaces_attachment_id);
    need(replacement.project_id === project.id, "Choose a replacement from this project.", "NOT_AUTHORIZED");
  }
  let fields: Input;
  if (type === "file.link") {
    let link: URL | undefined;
    try { link = new URL(s(values.storage_locator)); } catch { /* validated below */ }
    need(link && ["https:", "http:"].includes(link.protocol) && !link.username && !link.password, "Use an http or https file link without embedded credentials.");
    fields = { storage_kind: "external_link", storage_locator: link?.href, media_type: "application/octet-stream", byte_length: 0, availability: "external" };
  } else {
    const mime = s(values.media_type, s(values.mime_type)), size = n(values.byte_length, n(values.size_bytes));
    need(["application/pdf", "image/png", "image/jpeg", "text/plain"].includes(mime) && size > 0 && size <= 10 * 1024 * 1024, "Use a PDF, PNG, JPEG, or TXT file up to 10 MiB.", "UPLOAD_REJECTED");
    need(s(values.storage_locator), "Upload the file before attaching it.", "FILE_UNAVAILABLE");
    fields = { storage_kind: st.mode === "connected" ? "private" : "local_blob", storage_locator: values.storage_locator, media_type: mime, byte_length: size, sha256: values.sha256, availability: "available" };
  }
  const id = prior?.id || s(input.id) || identifier(st, "attachment");
  put(st, "attachments", id, { ...fields, name: s(values.name).trim(), project_id: project.id, client_id: project.client_id, shared_with_buyer: values.shared_with_buyer, audience: values.shared_with_buyer ? "buyer" : "owner", replaces_attachment_id: values.replaces_attachment_id || null, uploaded_by_kind: prior?.uploaded_by_kind || "owner", uploaded_by_engagement_id: prior?.uploaded_by_engagement_id || null });
  const sharedIds = a<string>(project.shared_attachment_ids).filter((fileId) => fileId !== id);
  if (values.shared_with_buyer) sharedIds.push(id);
  if (JSON.stringify(sharedIds) !== JSON.stringify(a(project.shared_attachment_ids))) put(st, "projects", project.id, { shared_attachment_ids: sharedIds });
  return result(type === "file.link" ? "File reference saved." : "File attached.", id);
}

/** Consent identifies the exact proposed block and the exact conflicting record versions. */
export function calendarOverlapFingerprint(proposal: { start: string; end: string; timezone: string; project: string; contact: string; kind: string }, overlaps: Entity[]): string {
  return JSON.stringify([proposal.start, proposal.end, proposal.timezone, proposal.project, proposal.contact, proposal.kind, overlaps.map((record) => [record.id, record.version, record.starts_at, record.ends_at]).sort((left, right) => String(left[0]).localeCompare(String(right[0])))]);
}

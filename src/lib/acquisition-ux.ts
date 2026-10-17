import { a, n, o, s, type Entity } from "./types";

const openStates = new Set(["queued", "running", "paused", "blocked", "waiting_input", "waiting_for_input"]);

/** Connected runs relate to records through typed references; IDs alone are not authority. */
export function runReferencesOpportunity(run: Entity, opportunityId: string): boolean {
  const references = a<unknown>(run.input_refs);
  if (references.some((value) => {
    const ref = o(value);
    return ref.table === "opportunities" && ref.id === opportunityId && Number.isInteger(ref.version) && n(ref.version) > 0;
  })) return true;
  // Browser-demo runs predate typed context and carry a direct relationship.
  return !references.some((value) => o(value).table === "opportunities") && run.opportunity_id === opportunityId;
}

export function activeScoutRun(runs: Entity[], opportunityId: string, artifacts: Entity[] = []): Entity | undefined {
  return runs.filter((run) => {
    const status = s(run.status, s(run.state));
    const reviewPending = status === "completed" && artifacts.some((artifact) =>
      (artifact.run_id === run.id || artifact.creator_run_id === run.id) && artifact.requires_owner_review === true && artifact.status === "awaiting_review",
    );
    return run.role_id === "scout" && (openStates.has(status) || reviewPending) && runReferencesOpportunity(run, opportunityId);
  }).sort((first, second) => s(second.created_at).localeCompare(s(first.created_at)))[0];
}

/** UI intent names the access replacement performed by the invitation endpoint. */
export const buyerInvitationIntent = {
  label: "Create new buyer invitation",
  title: "Replace buyer access with a new invitation?",
  confirm: "Replace access & create invitation",
  description: "Existing invitation links and signed-in buyer sessions for this engagement will stop working. Create a new single-use link, valid for two days, then share it with the intended buyer. No email is sent automatically.",
} as const;

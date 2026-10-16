import type { Entity, StoreState } from "./types";

/** Empty connected state. Customer records are never copied from the demo fixture. */
export function emptyState(): StoreState {
  return { mode: "connected", schema_version: "1.1.0", sample_clock: new Date().toISOString(), tables: {}, revision: 0, scenario: "connected", dirty: false, session: false, ui: {} };
}
export function workspaceState(workspace: { id: string; owner_id: string; name: string }, email = ""): StoreState {
  const state = emptyState();
  state.session = true;
  const add = (collection: string, id: string, fields: Record<string, unknown>) => {
    const record: Entity = { id, version: 1, workspace_id: workspace.id, audience: "owner", created_at: state.sample_clock, updated_at: state.sample_clock, ...fields };
    (state.tables[collection] ||= {})[id] = record;
  };
  add("workspaces", workspace.id, { ...workspace, timezone: "Asia/Jakarta", default_currency: "USD", reporting_currency: "IDR", locale: "en", sample: false });
  add("owners", workspace.owner_id, { display_name: "", email, handle: `studio-${workspace.id.slice(0, 8)}`, profession: "", locale: "en" });
  add("profiles", "profile_current", { owner_id: workspace.owner_id, handle: `studio-${workspace.id.slice(0, 8)}`, public_name: workspace.name, headline: "", biography: "", public_availability: "unavailable", published: false, location_label: "", public_contact_email: "", approved_service_ids: [], approved_portfolio_ids: [], public_revision: 0 });
  add("policies", "policy_business", { deposit_basis_points: 5000, fee_basis_points: 0, fx_idr_per_usd: "0", upfront_cost_assumption: { amount_minor: 0, currency: "IDR", scale: 0 }, available_effort_minutes: 2400, business_weekdays: [0, 1, 2, 3, 4], holiday_dates: [], start_local_time: "09:00", due_local_time: "17:00", reservation_hours: 48, require_deposit: true, required_input_keys: [], next_business_day_start: true, minimum_hourly_rate: null, sample_assumptions: false });
  add("preferences", "preferences_current", { owner_id: workspace.owner_id, locale: "en", timezone: "Asia/Jakarta", motion: "system", team_animation_paused: false, notification_email: false, notification_in_app: true, last_seen_event_sequence: 0 });
  add("onboarding_sessions", "onboarding_current", { owner_id: workspace.owner_id, state: "in_progress", current_step: "business", completed_steps: [], draft: {}, skipped_connection_ids: [] });
  return state;
}

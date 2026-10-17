import test from "node:test";
import assert from "node:assert/strict";
import { createState, execute } from "../src/lib/engine";
import { searchWorkspace } from "../src/lib/workspace-search";
import { isTeamUpdate } from "../src/lib/notifications";
import { a, type StoreState } from "../src/lib/types";

const events = (state: StoreState) => Object.values(state.tables.events || {}).filter(isTeamUpdate);

test("marking all updates read remains caught up after the saved preference round trip", () => {
  const state = createState();
  const read = events(state).map((event) => event.id);
  const marked = execute(state, "ui.set", { values: { read_events: read }, idempotency_key: "read-all" });
  assert.equal(marked.result.ok, true);
  assert.deepEqual(events(marked.state).map((event) => event.id), read);
  assert.equal(events(marked.state).filter((event) => !a<string>(marked.state.ui.read_events).includes(event.id)).length, 0);
  const replay = execute(marked.state, "ui.set", { values: { read_events: read }, idempotency_key: "read-all" });
  assert.equal(replay.result.replayed, true);
  assert.equal(events(replay.state).length, read.length);

  const client = replay.state.tables.clients.client_northstar;
  const changed = execute(replay.state, "client.save", { id: client.id, expected_version: client.version, values: { name: "Northstar revised" }, idempotency_key: "business-update" });
  assert.equal(changed.result.ok, true, changed.result.message);
  assert.equal(events(changed.state).filter((event) => !read.includes(event.id)).length, 1, "a genuine business change is still an unread update");
});

test("recap and focus preferences neither notify themselves nor hide real activity", () => {
  const state = createState();
  const before = events(state).length;
  const preference = state.tables.preferences.preferences_alya;
  const changed = execute(state, "record.save", { table: "preferences", id: preference.id, expected_version: preference.version, values: { focus_mode: "focus", last_seen_event_sequence: 300 }, idempotency_key: "view-prefs" });
  assert.equal(changed.result.ok, true, changed.result.message);
  assert.equal(events(changed.state).length, before);
  assert.equal(isTeamUpdate({ id: "old-ui", version: 1, kind: "ui.set" }), false);
  assert.equal(isTeamUpdate({ id: "old-pref", version: 1, kind: "record.save", record_refs: [{ table: "preferences", id: "preference" }] }), false);
  assert.equal(isTeamUpdate({ id: "business", version: 1, kind: "offer.shared" }), true);
});

test("workspace search ranks exact titles before body matches and requires all query terms", () => {
  const state = createState();
  state.tables.projects = {
    body: { id: "body", version: 1, title: "Other work", summary: "The launch brief is saved here", updated_at: "2026-10-18" },
    exact: { id: "exact", version: 1, title: "Launch brief", updated_at: "2026-10-01" },
    prefix: { id: "prefix", version: 1, title: "Launch brief for a client" },
    partial: { id: "partial", version: 1, title: "Launch only" },
  };
  const results = searchWorkspace(state, "  Launch brief  ", "projects");
  assert.deepEqual(results.map((row) => row.e.id), ["exact", "prefix", "body"]);
  assert.equal(searchWorkspace(state, "not present", "projects").length, 0);
});

test("workspace search returns a full count beyond the UI page limit and canonical offer titles", () => {
  const state = createState();
  state.tables.projects = Object.fromEntries(Array.from({ length: 42 }, (_, index) => [`project-${index}`, { id: `project-${index}`, version: 1, title: `Portfolio record ${index}` }]));
  assert.equal(searchWorkspace(state, "Portfolio record", "projects").length, 42);
  const offer = Object.values(state.tables.offers)[0];
  const version = state.tables.offer_versions[String(offer.current_version_id)];
  version.title = "Canonical commercial title";
  assert.ok(searchWorkspace(state, "Canonical commercial", "offers").some((result) => result.e.id === offer.id));
  assert.equal(searchWorkspace(state, "", "unknown_table").length, 0);
});


test("read updates merge across concurrent stale view snapshots", () => {
  const state = createState();
  const [first, second] = events(state);
  assert.ok(first && second);
  const aRead = execute(state, "ui.set", { values: { read_events: [first.id] }, idempotency_key: "first-view" });
  const bRead = execute(aRead.state, "ui.set", { values: { read_events: [second.id] }, idempotency_key: "second-view" });
  assert.equal(bRead.result.ok, true);
  assert.deepEqual(new Set(a<string>(bRead.state.ui.read_events)), new Set([first.id, second.id]));
});

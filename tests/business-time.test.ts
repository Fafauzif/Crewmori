import test from "node:test";
import assert from "node:assert/strict";
import { localDateTime, zonedDateTime } from "../src/lib/business-time";
import { amendmentSchedule } from "../src/lib/engine";

test("working dates retain local hours across a daylight saving boundary", () => {
  const terms = { timezone: "America/New_York", workdays: [0, 1, 2, 3, 4], holidays: [], delivery_business_days: 2, due_local_time: "16:30" };
  const start = zonedDateTime("2026-10-30", "08:30", terms.timezone);
  assert.equal(start, "2026-10-30T08:30:00-04:00");
  const schedule = amendmentSchedule(start, terms);
  assert.equal(schedule.due, "2026-11-02T16:30:00-05:00");
  assert.equal(localDateTime(schedule.due, terms.timezone), "2026-11-02T16:30");
});
test("local time conversion handles calendar boundaries and rejects nonexistent dates and DST times", () => {
  assert.equal(localDateTime("2026-10-16T18:30:00Z", "Asia/Singapore"), "2026-10-17T02:30");
  assert.equal(zonedDateTime("2026-10-17", "09:00", "Asia/Jakarta"), "2026-10-17T09:00:00+07:00");
  assert.equal(zonedDateTime("2026-10-17", "09:00", "UTC"), "2026-10-17T09:00:00+00:00");
  assert.throws(() => zonedDateTime("2026-02-30", "09:00", "UTC"));
  assert.throws(() => zonedDateTime("2026-03-08", "02:30", "America/New_York"), /does not exist/);
});

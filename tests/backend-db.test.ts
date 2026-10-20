import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";
import { transaction } from "../src/server/db";

function fakePool(failRollback: boolean) {
  const released: unknown[] = [];
  const client = {
    async query(sql: string) {
      if (sql === "ROLLBACK" && failRollback) throw Error("connection terminated");
      return { rows: [], rowCount: 0 };
    },
    release(error?: unknown) { released.push(error); },
  };
  return { pool: { connect: async () => client } as unknown as Pool, released };
}

test("a failed ROLLBACK keeps the original error and destroys the connection", async () => {
  const { pool, released } = fakePool(true);
  await assert.rejects(transaction(async () => { throw Error("original failure"); }, pool), /original failure/);
  assert.equal(released.length, 1);
  assert.match(String(released[0]), /connection terminated/);
});

test("a clean rollback returns the connection to the pool", async () => {
  const { pool, released } = fakePool(false);
  await assert.rejects(transaction(async () => { throw Error("work failed"); }, pool), /work failed/);
  assert.deepEqual(released, [undefined]);
});

test("file locators only reach the uuid key when they are UUIDs", async () => {
  const { uuidOrNull } = await import("../src/server/repository");
  assert.equal(uuidOrNull("6f1c2b8e-3a4d-4e5f-8a9b-0c1d2e3f4a5b"), "6f1c2b8e-3a4d-4e5f-8a9b-0c1d2e3f4a5b");
  assert.equal(uuidOrNull("https://example.com/brief"), null);
  assert.equal(uuidOrNull(undefined), null);
});

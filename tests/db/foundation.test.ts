import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { database, transaction, closeDatabase } from "../../src/server/db";

const ownerA = "00000000-0000-4000-8000-000000000001";
const ownerB = "00000000-0000-4000-8000-000000000002";
let workspaceA: string, workspaceB: string;
before(async () => {
  assert.equal(process.env.CREWMORI_DB_TEST, "disposable", "Use npm run test:db; this suite requires its disposable cluster.");
  await database().query(`create role anon nologin; create role authenticated nologin;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
  await database().query(await readFile(new URL("../../supabase/migrations/202610160001_backend_foundation.sql", import.meta.url), "utf8"));
  const result = await database().query("insert into crewmori.workspaces(owner_id,name) values($1,'A'),($2,'B') returning id", [ownerA, ownerB]);
  [workspaceA, workspaceB] = result.rows.map((row) => row.id);
  await database().query("insert into crewmori.records(workspace_id,collection,id,version,data) values($1,'clients','private-a',1,'{}'),($2,'clients','private-b',1,'{}')", [workspaceA, workspaceB]);
});
after(closeDatabase);

test("RLS excludes another owner's records even with its exact workspace ID", async () => {
  await transaction(async (client) => {
    await client.query("SET LOCAL ROLE authenticated");
    await client.query("select set_config('request.jwt.claim.sub',$1,true)", [ownerA]);
    const all = await client.query("select id from crewmori.records");
    assert.deepEqual(all.rows.map((row) => row.id), ["private-a"]);
    assert.equal((await client.query("select * from crewmori.records where workspace_id=$1", [workspaceB])).rowCount, 0);
  });
});
test("authenticated browser roles cannot read tokens or write domain records", async () => {
  for (const query of ["select * from crewmori.connections", "select * from crewmori.buyer_grants", "delete from crewmori.records"]) {
    await assert.rejects(transaction(async (client) => {
      await client.query("SET LOCAL ROLE authenticated");
      await client.query("select set_config('request.jwt.claim.sub',$1,true)", [ownerA]);
      await client.query(query);
    }), /permission denied/);
  }
});
test("anonymous database role has no application schema access", async () => {
  await assert.rejects(transaction(async (client) => {
    await client.query("SET LOCAL ROLE anon");
    await client.query("select * from crewmori.workspaces");
  }), /permission denied/);
});
test("failed multi-record writes roll back their earlier mutation", async () => {
  await assert.rejects(transaction(async (client) => {
    await client.query("update crewmori.records set version=2 where workspace_id=$1", [workspaceA]);
    await client.query("insert into crewmori.records(workspace_id,collection,id,version,data) values($1,'clients','private-a',1,'{}')", [workspaceA]);
  }), /duplicate key/);
  const result = await database().query("select version from crewmori.records where workspace_id=$1", [workspaceA]);
  assert.equal(result.rows[0].version, 1);
});

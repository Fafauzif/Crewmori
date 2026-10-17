import { transaction } from "./db";
import { initializeWorkspace } from "./domain-state";

// Each account owns one workspace; repeated calls return it without reseeding records.
export async function ensureOwnerWorkspace(userId: string, email = "", name = "My studio") {
  return transaction(async (client) => {
    await client.query("insert into crewmori.workspaces(owner_id,name) values($1,$2) on conflict(owner_id) do nothing", [userId, name]);
    const row = (await client.query("select * from crewmori.workspaces where owner_id=$1 for update", [userId])).rows[0];
    await initializeWorkspace(client, row, email);
    const onboarded = await client.query("select 1 from crewmori.records where workspace_id=$1 and collection='onboarding_sessions' and data->>'state'='completed'", [row.id]);
    return { id: row.id as string, name: row.name as string, revision: Number(row.revision), onboarded: !!onboarded.rowCount };
  });
}

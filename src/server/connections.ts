import { createHash } from "node:crypto";
import type { OwnerActor } from "./contracts";
import { database, transaction } from "./db";
import { requireConfiguration } from "./config";
import { assertService } from "./errors";
import { decryptSecret, encryptSecret, hashToken, randomToken } from "./security";
import { appendEvent, lockWorkspace } from "./repository";
import { exchangeGoogleCode, googleAuthorizationUrl, googleScopes, refreshGoogleToken, GoogleAdapter, type GoogleCapability, type GoogleToken } from "./providers/google";

type SavedGoogleToken = GoogleToken & { expiresAt: number };
export async function beginGoogleConnection(actor: OwnerActor, capabilities: GoogleCapability[]) {
  const { TOKEN_ENCRYPTION_KEY } = requireConfiguration(["TOKEN_ENCRYPTION_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]);
  const state = randomToken(), verifier = randomToken();
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  await transaction(async (client) => {
    await lockWorkspace(client, actor);
    await client.query("delete from crewmori.oauth_states where workspace_id=$1 or expires_at < now()", [actor.workspaceId]);
    await client.query("insert into crewmori.oauth_states(state_hash,workspace_id,owner_id,verifier_ciphertext,scopes,expires_at) values($1,$2,$3,$4,$5,now()+interval '10 minutes')", [hashToken(state), actor.workspaceId, actor.userId, encryptSecret(verifier, TOKEN_ENCRYPTION_KEY, `${actor.workspaceId}:oauth`), capabilities.map((capability) => googleScopes[capability])]);
  });
  return { url: googleAuthorizationUrl(state, challenge, capabilities) };
}
export async function completeGoogleConnection(userId: string, state: string, code: string) {
  const { TOKEN_ENCRYPTION_KEY } = requireConfiguration(["TOKEN_ENCRYPTION_KEY"]);
  const saved = await transaction(async (client) => {
    const result = await client.query("update crewmori.oauth_states set consumed_at=now() where state_hash=$1 and owner_id=$2 and expires_at>now() and consumed_at is null returning *", [hashToken(state), userId]);
    assertService(result.rowCount === 1, "INVALID_OAUTH_STATE", "Connection consent expired or was already used.", 401);
    return result.rows[0];
  });
  const token = await exchangeGoogleCode(code, decryptSecret(saved.verifier_ciphertext, TOKEN_ENCRYPTION_KEY, `${saved.workspace_id}:oauth`));
  const granted = token.scope.split(" ");
  assertService(saved.scopes.every((scope: string) => granted.includes(scope)), "CAPABILITY_MISSING", "Google did not grant all requested capabilities.", 403);
  assertService(token.refresh_token, "REFRESH_TOKEN_MISSING", "Reconnect Google and grant offline access.", 422);
  const actor: OwnerActor = { kind: "owner", userId, workspaceId: saved.workspace_id };
  await transaction(async (client) => {
    await lockWorkspace(client, actor);
    const secret = encryptSecret(JSON.stringify({ ...token, expiresAt: Date.now() + token.expires_in * 1000 }), TOKEN_ENCRYPTION_KEY, `${actor.workspaceId}:google`);
    await client.query("insert into crewmori.connections(workspace_id,provider,credential_ciphertext,scopes,state) values($1,'google',$2,$3,'active') on conflict(workspace_id,provider) do update set credential_ciphertext=$2,scopes=$3,state='active',version=crewmori.connections.version+1,updated_at=now()", [actor.workspaceId, secret, granted]);
    await appendEvent(client, actor.workspaceId, "connection.connected", "Google consent saved. Pending actions still require deliberate dispatch.");
  });
}
export async function googleForWorkspace(workspaceId: string) {
  const { TOKEN_ENCRYPTION_KEY } = requireConfiguration(["TOKEN_ENCRYPTION_KEY"]);
  const result = await database().query("select * from crewmori.connections where workspace_id=$1 and provider='google' and state='active'", [workspaceId]);
  assertService(result.rowCount, "CONNECTION_REVOKED", "Connect Google before using this capability.", 403);
  const saved = result.rows[0];
  let token = JSON.parse(decryptSecret(saved.credential_ciphertext, TOKEN_ENCRYPTION_KEY, `${workspaceId}:google`)) as SavedGoogleToken;
  if (token.expiresAt < Date.now() + 60000) {
    assertService(token.refresh_token, "CONNECTION_REVOKED", "Reconnect Google to renew consent.", 403);
    try {
      const renewed = await refreshGoogleToken(token.refresh_token);
      token = { ...renewed, refresh_token: renewed.refresh_token || token.refresh_token, expiresAt: Date.now() + renewed.expires_in * 1000 };
      const update = await database().query("update crewmori.connections set credential_ciphertext=$1,scopes=$2,version=version+1,updated_at=now() where workspace_id=$3 and provider='google' and version=$4 and state='active' returning version", [encryptSecret(JSON.stringify(token), TOKEN_ENCRYPTION_KEY, `${workspaceId}:google`), token.scope.split(" "), workspaceId, saved.version]);
      assertService(update.rowCount, "CONNECTION_CHANGED", "Connection changed during refresh. Retry the read.", 409);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "CONNECTION_REVOKED") await database().query("update crewmori.connections set state='revoked',version=version+1 where workspace_id=$1 and provider='google' and version=$2", [workspaceId, saved.version]);
      throw error;
    }
  }
  return new GoogleAdapter(token.access_token, token.scope.split(" "));
}
export async function revokeGoogleConnection(actor: OwnerActor) {
  await transaction(async (client) => {
    await lockWorkspace(client, actor);
    await client.query("update crewmori.connections set state='revoked',credential_ciphertext='',version=version+1,updated_at=now() where workspace_id=$1 and provider='google'", [actor.workspaceId]);
    await appendEvent(client, actor.workspaceId, "connection.revoked", "Google access disabled and local credentials removed.");
  });
}

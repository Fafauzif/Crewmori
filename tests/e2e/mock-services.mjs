import { createServer } from "node:http";
import { createHmac, randomUUID } from "node:crypto";

/** Test process only: no application auth bypass. Supabase/Claude/Gemini SDKs use HTTP. */
export async function mockServices() {
  const users = new Map(), tokens = new Map(), objects = new Map();
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    const bytes = Buffer.concat(chunks);
    let body = {}; try { body = JSON.parse(bytes.toString()); } catch {}
    const json = (data, status = 200) => { response.writeHead(status, { "content-type": "application/json" }); response.end(JSON.stringify(data)); };
    const userForToken = () => tokens.get((request.headers.authorization || "").replace(/^Bearer /, ""));
    const login = (user) => {
      const now = Math.floor(Date.now() / 1000);
      const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
      const payload = Buffer.from(JSON.stringify({ sub: user.id, email: user.email, aud: "authenticated", role: "authenticated", iat: now, exp: now + 3600, iss: "crewmori-disposable-test" })).toString("base64url");
      const signature = createHmac("sha256", "disposable-test-only").update(`${header}.${payload}`).digest("base64url");
      const token = `${header}.${payload}.${signature}`, refresh = randomUUID();
      tokens.set(token, user); tokens.set(refresh, user);
      return { access_token: token, refresh_token: refresh, expires_in: 3600, expires_at: now + 3600, token_type: "bearer", user };
    };
    if (url.pathname === "/auth/v1/signup" || url.pathname === "/auth/v1/token") {
      if (url.searchParams.get("grant_type") === "refresh_token") { const user = tokens.get(body.refresh_token); return user ? json(login(user)) : json({ msg: "Invalid refresh token" }, 400); }
      let user = users.get(body.email);
      if (url.pathname.endsWith("signup")) {
        if (user) return json({ msg: "Account already exists" }, 400);
        user = { id: randomUUID(), email: body.email, aud: "authenticated", role: "authenticated", app_metadata: { provider: "email" }, user_metadata: {}, created_at: new Date().toISOString(), email_confirmed_at: new Date().toISOString(), password: body.password };
        users.set(body.email, user);
      }
      if (!user || user.password !== body.password) return json({ msg: "Invalid credentials" }, 400);
      const publicUser = { ...user }; delete publicUser.password;
      return json(login(publicUser));
    }
    if (url.pathname === "/auth/v1/user") {
      const user = userForToken(); if (!user) return json({ msg: "Not authenticated" }, 401);
      return json(user);
    }
    if (url.pathname === "/auth/v1/logout") { tokens.delete((request.headers.authorization || "").replace(/^Bearer /, "")); response.writeHead(204); return response.end(); }
    if (url.pathname === "/auth/v1/recover") return json({});
    if (url.pathname.startsWith("/storage/v1/bucket/")) return json({ id: "crewmori-private", name: "crewmori-private", public: false });
    if (url.pathname.startsWith("/storage/v1/object/sign/") && request.method === "POST") return json({ signedURL: url.pathname.replace("/storage/v1", "") + "?token=disposable-test" });
    const objectPath = url.pathname.replace(/^\/storage\/v1\/object\/(authenticated\/|sign\/)?/, "");
    if (url.pathname.startsWith("/storage/v1/object/") && request.method === "POST") { objects.set(objectPath, { bytes, type: request.headers["content-type"] || "application/octet-stream" }); return json({ Key: objectPath }); }
    if (url.pathname.startsWith("/storage/v1/object/") && request.method === "GET") { const file = objects.get(objectPath); if (!file) return json({ message: "Not found" }, 404); response.writeHead(200, { "content-type": file.type }); return response.end(file.bytes); }
    if (url.pathname.endsWith("/messages")) {
      const evidence = JSON.parse(body.messages[0].content).evidence;
      return json({ id: `msg_${randomUUID()}`, type: "message", role: "assistant", model: "controlled-claude", content: [{ type: "tool_use", id: "tool_test", name: "save_role_artifact", input: { title: "Reviewed design request", summary: "Prepare the requested product design with the owner confirming scope and effort.", facts: evidence.length ? [{ text: "The saved request is available for review.", sourceId: evidence[0].id }] : [], unknowns: ["Final effort requires owner review."], recommendations: ["Review the deliverables before sharing an offer."], requiresOwnerReview: true } }], stop_reason: "tool_use", stop_sequence: null, usage: { input_tokens: 100, output_tokens: 100 } });
    }
    if (url.pathname.includes("embedContent") || url.pathname.includes("batchEmbedContents")) return json({ embedding: { values: Array(768).fill(0.01) }, embeddings: [{ values: Array(768).fill(0.01) }] });
    return json({ error: "Unknown test provider endpoint", path: url.pathname }, 404);
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  return { origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }) };
}

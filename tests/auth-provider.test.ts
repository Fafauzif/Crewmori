import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { createGoogleProviderCheck } from "../src/server/auth-provider";

const configuration = () => ({ SUPABASE_URL: "https://project.test", SUPABASE_PUBLISHABLE_KEY: "test-publishable" });

test("Google provider settings use the configured project and cache explicit availability for one minute", async () => {
  let clock = 0, calls = 0;
  const check = createGoogleProviderCheck(configuration, async (url, options) => {
    calls++;
    assert.equal(String(url), "https://project.test/auth/v1/settings");
    assert.deepEqual(options?.headers, { apikey: "test-publishable" });
    assert.equal(options?.cache, "no-store");
    assert.ok(options?.signal instanceof AbortSignal);
    return Response.json({ external: { google: calls > 1 } });
  }, () => clock);
  assert.equal(await check(), false);
  clock = 59_999;
  assert.equal(await check(), false);
  assert.equal(calls, 1);
  clock = 60_000;
  assert.equal(await check(), true);
  assert.equal(await check(), true);
  assert.equal(calls, 2);
});

test("provider availability from one project or key never blocks another configuration", async () => {
  let config = configuration(), calls = 0;
  const check = createGoogleProviderCheck(() => config, async () => {
    calls++;
    return Response.json({ external: { google: calls > 1 } });
  });
  assert.equal(await check(), false);
  config = { ...config, SUPABASE_URL: "https://another-project.test" };
  assert.equal(await check(), true);
  config = { ...config, SUPABASE_PUBLISHABLE_KEY: "another-test-key" };
  assert.equal(await check(), true);
  assert.equal(calls, 3);
});

test("non-success settings responses do not cache disabled-provider recovery", async () => {
  for (const status of [401, 429, 503]) {
    let calls = 0;
    const check = createGoogleProviderCheck(configuration, async () => {
      calls++;
      return Response.json({ external: { google: false } }, { status });
    });
    assert.equal(await check(), true);
    assert.equal(await check(), true);
    assert.equal(calls, 2);
  }
});

test("missing, malformed and wrongly typed settings leave OAuth available without caching the guess", async () => {
  for (const body of [{}, null, { external: { google: "false" } }, { external: { google: 0 } }, "unexpected"]) {
    let calls = 0;
    const check = createGoogleProviderCheck(configuration, async () => {
      calls++;
      return Response.json(body);
    });
    assert.equal(await check(), true);
    assert.equal(await check(), true);
    assert.equal(calls, 2);
  }
  const html = createGoogleProviderCheck(configuration, async () => new Response("<html>Proxy error</html>"));
  assert.equal(await html(), true);
});

test("network and timeout failures allow the existing OAuth path and retry the next preflight", async () => {
  for (const error of [new TypeError("Network unavailable"), new DOMException("Timed out", "TimeoutError")]) {
    let calls = 0;
    const check = createGoogleProviderCheck(configuration, async () => { calls++; throw error; });
    assert.equal(await check(), true);
    assert.equal(await check(), true);
    assert.equal(calls, 2);
  }
});

test("missing auth configuration retains the application's configuration recovery", async () => {
  const error = new Error("Missing test configuration");
  const check = createGoogleProviderCheck(() => { throw error; }, async () => assert.fail("No request without configuration"));
  await assert.rejects(check, error);
});

test("the controlled OAuth service advertises the provider setting added by the friend", async () => {
  const { mockServices } = await import("./e2e/mock-services.mjs");
  const services = await mockServices();
  try {
    const response = await fetch(`${services.origin}/auth/v1/settings`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { external: { google: true, email: false } });
    const check = createGoogleProviderCheck(() => ({ ...configuration(), SUPABASE_URL: services.origin }));
    assert.equal(await check(), true);
  } finally { await services.close(); }
});

test("disabled Google sign-in returns readable in-app recovery and preserves the workspace destination", async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ external: { google: false } }));
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const keys = ["CREWMORI_BACKEND_ENABLED", "APP_URL", "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"] as const;
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    Object.assign(process.env, {
      CREWMORI_BACKEND_ENABLED: "true", APP_URL: "http://localhost:4173",
      SUPABASE_URL: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
      SUPABASE_PUBLISHABLE_KEY: "test-publishable",
    });
    const { GET } = await import("../src/app/api/auth/[action]/route");
    const destination = "/app/connections?connection=drive";
    const response = await GET(new Request(`http://localhost:4173/api/auth/google?returnTo=${encodeURIComponent(destination)}`), { params: Promise.resolve({ action: "google" }) });
    assert.equal(response.status, 303);
    const recovery = new URL(response.headers.get("location")!);
    assert.equal(recovery.pathname, "/auth/sign-in");
    assert.equal(recovery.searchParams.get("error"), "unavailable");
    assert.equal(recovery.searchParams.get("returnTo"), destination);
    assert.equal(response.headers.get("cache-control"), "no-store");
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

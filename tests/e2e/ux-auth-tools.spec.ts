import { test, expect } from "@playwright/test";
import { workspaceState } from "../../src/lib/workspace-state";
const requestId = "d34f8222-3ae3-4f90-8a77-11e5bbeb99e7";
test.beforeEach(() => { expect(process.env.CREWMORI_UX_TEST === "true" || process.env.CREWMORI_DB_TEST === "disposable").toBe(true); });

test("sign-in handoff gives visible failure recovery without pretending success", async ({ page }) => {
  await page.route("**/api/auth/complete", (route) => route.fulfill({ status: 503, json: { error: { code: "TEMPORARY", message: "Your workspace is temporarily unavailable. Try again." } } }));
  await page.goto("/auth/verify?phase=workspace&returnTo=%2Fapp%2Fconnections%3Fconnection%3Ddrive");
  await expect(page.getByRole("heading", { name: "We couldn’t finish signing you in" })).toBeVisible();
  await expect(page.locator(".auth-panel").getByRole("alert")).toContainText("temporarily unavailable");
  await expect(page.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", /returnTo=%2Fapp%2Fconnections%3Fconnection%3Ddrive/);
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("invalid payment links do not call the status endpoint or display success", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/payments/status**", (route) => { calls++; return route.fulfill({ json: { state: "confirmed", engagementId: "not-authority" } }); });
  await page.goto("/payment/return?request=invalid");
  await expect(page.getByRole("heading", { name: "This payment link is incomplete" })).toBeVisible();
  expect(calls).toBe(0);
  await expect(page.getByRole("heading", { name: "Payment confirmed", exact: true })).toHaveCount(0);
});

test("confirmed payment stops checking; unknown state asks for provider review", async ({ page }) => {
  let calls = 0;
  await page.clock.install();
  await page.route("**/api/payments/status**", (route) => { calls++; return route.fulfill({ json: { state: "confirmed", engagementId: "project-test" } }); });
  await page.goto(`/payment/return?request=${requestId}`);
  await expect(page.getByRole("heading", { name: "Payment confirmed", exact: true })).toBeVisible();
  await page.clock.runFor(130000);
  expect(calls).toBe(1);
  await page.unroute("**/api/payments/status**");
  await page.route("**/api/payments/status**", (route) => route.fulfill({ json: { state: "unknown", engagementId: "project-test" } }));
  await page.goto(`/payment/return?request=${requestId}`);
  await expect(page.getByRole("heading", { name: "Payment needs a status check" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Check status again" })).toBeVisible();
});

test("unconfirmed payment checks back off and eventually offer a manual status check", async ({ page }) => {
  let calls = 0;
  await page.clock.install();
  await page.route("**/api/payments/status**", (route) => { calls++; return route.fulfill({ json: { state: "pending", engagementId: "project-test" } }); });
  await page.goto(`/payment/return?request=${requestId}`);
  await expect(page.getByRole("heading", { name: "Waiting for payment confirmation" })).toBeVisible();
  // Each fast-forward resolves the read before the next backoff is advanced.
  for (const [index, delay] of [4000, 6000, 10000, 15000, 20000, 30000, 30000].entries()) {
    await page.clock.runFor(delay);
    await expect.poll(() => calls).toBe(index + 2);
    await expect(page.getByText("Checking the verified payment record…", { exact: true })).toHaveCount(0);
  }
  await expect(page.getByText("Automatic checks have paused.", { exact: false })).toBeVisible();
  const pausedCalls = calls;
  await page.clock.runFor(120000);
  expect(calls).toBe(pausedCalls);
  expect(calls).toBe(8);
});

test("tool permissions start empty and disconnected actions are gated", async ({ page }) => {
  const state = workspaceState({ id: "11c52a63-e7bd-4b27-9dc8-518683588ccd", owner_id: "ed7b8156-4221-42b5-b159-8a04ac64c8dc", name: "UX test studio" });
  await page.route("**/api/workspace/state", (route) => route.fulfill({ json: { state } }));
  await page.goto("/app/connections");
  await expect(page.getByRole("button", { name: "Choose files from Drive", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Check availability", exact: true })).toBeDisabled();
  await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Connect Google", exact: true })).toBeDisabled();
  await page.getByRole("checkbox", { name: "Read calendar availability", exact: true }).check();
  await expect(page.getByRole("button", { name: "Connect Google", exact: true })).toBeEnabled();
  await expect(page.getByRole("checkbox", { name: "Send approved calendar invitations", exact: true })).not.toBeChecked();
});


test("knowledge search explains empty and error results rather than leaving blank space", async ({ page }) => {
  const state = workspaceState({ id: "11c52a63-e7bd-4b27-9dc8-518683588ccd", owner_id: "ed7b8156-4221-42b5-b159-8a04ac64c8dc", name: "UX test studio" });
  await page.route("**/api/workspace/state", (route) => route.fulfill({ json: { state } }));
  await page.route("**/api/knowledge/search", (route) => route.fulfill({ json: { results: [] } }));
  await page.goto("/app/settings/knowledge");
  const search = page.locator("section.panel").filter({ has: page.getByRole("heading", { name: "Search your knowledge", exact: true }) });
  await page.getByRole("searchbox", { name: "What do you need to find?", exact: true }).fill("client documents");
  await search.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText("No matches for “client documents”.", { exact: false })).toBeVisible();
  await page.unroute("**/api/knowledge/search");
  await page.route("**/api/knowledge/search", (route) => route.fulfill({ status: 503, json: { error: { code: "SEARCH_UNAVAILABLE", message: "Search is unavailable. Try again." } } }));
  await search.getByRole("button", { name: "Search", exact: true }).click();
  await expect(search.getByRole("alert")).toContainText("Search is unavailable");
  await search.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(page.getByRole("searchbox", { name: "What do you need to find?", exact: true })).toHaveValue("");
  await expect(search.getByRole("alert")).toHaveCount(0);
});


test("cancelled OAuth callbacks return readable recovery with workspace context", async ({ request }) => {
  const auth = await request.get("/api/auth/callback?error=access_denied&returnTo=%2Fapp%2Fconnections%3Fconnection%3Ddrive", { maxRedirects: 0 });
  expect(auth.status()).toBe(303);
  const authTarget = new URL(auth.headers().location);
  expect(authTarget.pathname).toBe("/auth/sign-in");
  expect(authTarget.searchParams.get("error")).toBe("cancelled");
  expect(authTarget.searchParams.get("returnTo")).toBe("/app/connections?connection=drive");
  const tools = await request.get("/api/connections/google/callback?error=access_denied", { maxRedirects: 0 });
  expect(tools.status()).toBe(303);
  expect(new URL(tools.headers().location).searchParams.get("connectionError")).toBe("cancelled");
});

test("a delayed knowledge search can be cleared and replaced without obsolete results", async ({ page }) => {
  const state = workspaceState({ id: "11c52a63-e7bd-4b27-9dc8-518683588ccd", owner_id: "ed7b8156-4221-42b5-b159-8a04ac64c8dc", name: "UX test studio" });
  await page.route("**/api/workspace/state", (route) => route.fulfill({ json: { state } }));
  let releaseOld: () => void = () => {}, finishOld: () => void = () => {}, oldStarted = false;
  const oldFinished = new Promise<void>((resolve) => { finishOld = resolve; });
  await page.route("**/api/knowledge/search", async (route) => {
    const body = route.request().postDataJSON() as { query: string };
    if (body.query === "old search") {
      oldStarted = true;
      await new Promise<void>((resolve) => { releaseOld = resolve; });
      try { await route.fulfill({ json: { results: [{ sourceId: "old-source", title: "Obsolete result", text: "This old response must be ignored." }] } }); }
      catch { /* The client deliberately cancelled this obsolete request. */ }
      finally { finishOld(); }
    } else await route.fulfill({ json: { results: [{ sourceId: "new-source", title: "Current result", text: "The replacement query completed." }] } });
  });
  try {
    await page.goto("/app/settings/knowledge");
    const search = page.locator("section.panel").filter({ has: page.getByRole("heading", { name: "Search your knowledge", exact: true }) });
    const input = search.getByRole("searchbox", { name: "What do you need to find?", exact: true });
    await input.fill("old search");
    await search.getByRole("button", { name: "Search", exact: true }).click();
    await expect.poll(() => oldStarted).toBe(true);
    await expect(search.getByRole("button", { name: "Clear search", exact: true })).toBeEnabled();
    await search.getByRole("button", { name: "Clear search", exact: true }).click();
    await expect(input).toHaveValue("");
    await expect(input).toBeFocused();
    await input.fill("new search");
    await search.getByRole("button", { name: "Search", exact: true }).click();
    await expect(search.getByRole("link", { name: "Current result", exact: true })).toBeVisible();
    releaseOld(); await oldFinished;
    await expect(search.getByRole("link", { name: "Obsolete result", exact: true })).toHaveCount(0);
    await expect(search.getByRole("alert")).toHaveCount(0);
    await expect(search.getByRole("link", { name: "Current result", exact: true })).toBeVisible();
  } finally { releaseOld(); }
});

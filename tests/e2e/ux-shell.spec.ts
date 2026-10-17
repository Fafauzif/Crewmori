import { mkdir } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import { workspaceState } from "../../src/lib/workspace-state";
import { execute } from "../../src/lib/engine";
import { o, s } from "../../src/lib/types";

const syntheticWorkspace = () => {
  const state = workspaceState({ id: "ux-workspace-fixture", owner_id: "ux-owner-fixture", name: "UX Test Studio" }, "ux-fixture@example.test");
  state.tables.owners["ux-owner-fixture"].display_name = "Morgan";
  state.tables.owners["ux-owner-fixture"].profession = "Independent researcher and designer";
  state.tables.onboarding_sessions.onboarding_current.state = "completed";
  state.tables.events = {
    first: { id: "first", version: 1, sequence: 1, kind: "client.created", summary: "A synthetic client request was saved.", occurred_at: "2026-10-18T02:00:00.000Z", record_refs: [] },
    second: { id: "second", version: 1, sequence: 2, kind: "project.created", summary: "A synthetic project was prepared.", occurred_at: "2026-10-18T03:00:00.000Z", record_refs: [] },
  };
  return state;
};

/** All API data in this suite is synthetic and intercepted in this browser page. */
async function fixtureApi(page: Page, initial = syntheticWorkspace()) {
  let state = initial;
  const commandTypes: string[] = [];
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/workspace/state") return route.fulfill({ json: { state } });
    if (url.pathname === "/api/auth/user") return route.fulfill({ json: { user: { id: "ux-owner-fixture", email: "ux-fixture@example.test" } } });
    if (url.pathname === "/api/commands") {
      const body = o(route.request().postDataJSON());
      const type = s(body.type); commandTypes.push(type);
      const execution = execute(state, type, { ...o(body.input), idempotency_key: s(body.idempotencyKey) });
      if (execution.result.ok) state = execution.state;
      return route.fulfill({ status: execution.result.ok ? 200 : 422, json: { result: execution.result } });
    }
    return route.fulfill({ status: 501, json: { error: { code: "TEST_UNHANDLED_API", message: `Unexpected fixture API: ${url.pathname}` } } });
  });
  return { state: () => state, commandTypes };
}

async function openOwner(page: Page, path = "/app/home") {
  await page.goto(path);
  await expect(page.locator(".sidebar")).toBeAttached();
  await expect(page.locator("#main-content h1").first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
async function hasNoPageOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(dimensions.document, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport + 1);
}
async function headerTargetsAreComfortable(page: Page) {
  const boxes = await page.locator(".topbar button").evaluateAll((buttons) => buttons.map((button) => {
    const box = button.getBoundingClientRect();
    return { name: button.getAttribute("aria-label") || button.textContent?.trim(), width: box.width, height: box.height };
  }).filter((box) => box.width > 0 && box.height > 0));
  expect(boxes.length).toBeGreaterThanOrEqual(2);
  for (const box of boxes) {
    expect(box.width, `${box.name}: target width`).toBeGreaterThanOrEqual(43.9);
    expect(box.height, `${box.name}: target height`).toBeGreaterThanOrEqual(43.9);
  }
}

test.beforeEach(async () => {
  test.skip(process.env.CREWMORI_UX_TEST !== "true", "Run through npm run test:ux with the isolated production UI fixture runner.");
});

test("owner navigation retains one mounted shell and Expenses has one Ask action", async ({ page }) => {
  await fixtureApi(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openOwner(page);
  const originalSidebar = await page.locator(".sidebar").elementHandle();
  expect(originalSidebar).not.toBeNull();
  await page.locator(".sidebar .primary-nav").getByRole("link", { name: "Team", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/team$/);
  await expect(page.locator("#main-content h1").first()).toBeVisible();
  expect(await originalSidebar!.evaluate((node) => node.isConnected && node === document.querySelector(".sidebar"))).toBe(true);
  await page.locator(".sidebar .primary-nav").getByRole("link", { name: "Money", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/money\/invoices$/);
  await expect(page.locator("#main-content h1").first()).toBeVisible();
  expect(await originalSidebar!.evaluate((node) => node.isConnected && node === document.querySelector(".sidebar"))).toBe(true);
  await page.getByRole("link", { name: "Expenses", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/money\/expenses$/);
  await expect(page.getByRole("button", { name: "Ask your team", exact: true })).toHaveCount(1);
  await headerTargetsAreComfortable(page);
});

test("phone navigation uses a modal drawer, contains focus and restores its trigger", async ({ page }) => {
  await fixtureApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openOwner(page, "/app/money/expenses");
  const trigger = page.getByRole("button", { name: "Open navigation menu", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Navigation", exact: true });
  await expect(dialog).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await page.keyboard.press("Shift+Tab");
  expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
  await expect(page.locator(".bottom-nav").getByRole("link", { name: "Money", exact: true })).toHaveAttribute("aria-current", "page");
  await headerTargetsAreComfortable(page);
  await hasNoPageOverflow(page);
});

test("global search discloses every result beyond its initial 30 and clears immediately", async ({ page }) => {
  const state = syntheticWorkspace();
  state.tables.projects = Object.fromEntries(Array.from({ length: 42 }, (_, index) => [`search-${index}`, { id: `search-${index}`, version: 1, title: `Portfolio project ${index}`, state: "active", updated_at: state.sample_clock }]));
  await fixtureApi(page, state);
  await openOwner(page, "/app/money/expenses");
  await page.getByRole("button", { name: "Search workspace", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Search your workspace", exact: true });
  await dialog.getByRole("searchbox", { name: "Search saved records", exact: true }).fill("Portfolio project");
  await expect(dialog.getByRole("status")).toContainText("Showing 30 of 42");
  await expect(dialog.locator(".shell-search-results .record-link")).toHaveCount(30);
  await dialog.getByRole("button", { name: "Show more results", exact: true }).click();
  await expect(dialog.getByRole("status")).toContainText("Showing 42 of 42");
  await expect(dialog.locator(".shell-search-results .record-link")).toHaveCount(42);
  await dialog.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(dialog.getByRole("searchbox", { name: "Search saved records", exact: true })).toHaveValue("");
  await expect(dialog.getByRole("searchbox", { name: "Search saved records", exact: true })).toBeFocused();
});

test("mark all updates read remains caught up after a canonical refresh and reload", async ({ page }) => {
  const fixture = await fixtureApi(page);
  await openOwner(page, "/app/money/expenses");
  await page.getByRole("button", { name: "Notifications, 2 unread", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Your team’s updates", exact: true });
  await dialog.getByRole("button", { name: "Mark all as read", exact: true }).click();
  await expect(page.getByRole("button", { name: "Notifications, 0 unread", exact: true })).toBeAttached();
  await expect(dialog.getByRole("button", { name: "Mark all as read", exact: true })).toBeDisabled();
  expect(fixture.commandTypes).toEqual(["ui.set"]);
  expect(Object.values(fixture.state().tables.events)).toHaveLength(2);
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Notifications, 0 unread", exact: true })).toBeVisible();
});

const viewports = [{ width: 1440, height: 1000 }, { width: 1280, height: 900 }, { width: 1024, height: 900 }, { width: 390, height: 844 }];
for (const viewport of viewports) {
  test(`Home, Team and Money reflow at ${viewport.width}px`, async ({ page }) => {
    await fixtureApi(page);
    await page.setViewportSize(viewport);
    await mkdir("/tmp/crewmori-ux-visuals", { recursive: true });
    for (const [name, path] of [["home", "/app/home"], ["team", "/app/team"], ["money", "/app/money/expenses"]]) {
      await openOwner(page, path);
      await headerTargetsAreComfortable(page);
      await hasNoPageOverflow(page);
      await page.screenshot({ path: `/tmp/crewmori-ux-visuals/${name}-${viewport.width}.png`, fullPage: true, animations: "disabled" });
    }
  });
}

test("200% equivalent CSS viewport preserves Money reflow", async ({ page }) => {
  // 1280x900 at 200% yields approximately 640x450 CSS pixels. This checks reflow,
  // not actual browser zoom, text-only scaling, device rendering or conformance.
  // CSS zoom is deliberately avoided because it does not change media queries.
  await fixtureApi(page);
  await page.setViewportSize({ width: 640, height: 450 });
  await openOwner(page, "/app/money/expenses");
  await expect(page.locator("#main-content h1").first()).toBeVisible();
  await hasNoPageOverflow(page);
  const menu = page.getByRole("button", { name: "Open navigation menu", exact: true });
  await menu.click();
  const dialog = page.getByRole("dialog", { name: "Navigation", exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("link", { name: "Manage connections", exact: true }).scrollIntoViewIfNeeded();
  await expect(dialog.getByRole("link", { name: "Manage connections", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
});

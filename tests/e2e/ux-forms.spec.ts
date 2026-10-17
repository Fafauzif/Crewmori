import { test, expect, type Page } from "@playwright/test";
import { workspaceState } from "../../src/lib/workspace-state";
import type { StoreState } from "../../src/lib/types";

test.use({ viewport: { width: 1440, height: 1000 } });
test.beforeEach(() => {
  test.skip(process.env.CREWMORI_UX_TEST !== "true", "Request-controlled UI fixtures require the local UX runner; never use a live account.");
});

const workspaceA = "10000000-0000-4000-8000-000000000001";
const workspaceB = "10000000-0000-4000-8000-000000000002";
function ownerState(id = workspaceA, name = "First owner") {
  const state = workspaceState({ id, owner_id: `owner-${id}`, name: `${name}'s studio` }, `${id}@example.test`);
  state.sample_clock = "2026-10-18T00:00:00.000Z";
  Object.values(state.tables.owners)[0].display_name = name;
  return state;
}
type CapturedCommand = { type: string; input: Record<string, unknown>; idempotencyKey: string; workspace: string | undefined };
async function mockOwner(page: Page, commandResponse?: (command: CapturedCommand) => Promise<{ status: number; json: unknown }>) {
  let state: StoreState = ownerState();
  const commands: CapturedCommand[] = [], requests: string[] = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request(), path = new URL(request.url()).pathname;
    requests.push(path);
    if (path === "/api/workspace/state") return route.fulfill({ json: { state } });
    if (path === "/api/auth/user") return route.fulfill({ json: { user: { id: Object.keys(state.tables.owners)[0], email: Object.values(state.tables.owners)[0].email } } });
    if (path === "/api/commands") {
      const body = request.postDataJSON() as Omit<CapturedCommand, "workspace">;
      const command = { ...body, workspace: request.headers()["x-workspace-id"] };
      commands.push(command);
      const response = commandResponse ? await commandResponse(command) : { status: 422, json: { error: { code: "CONTROLLED_TEST_REJECTION", message: "This test does not commit records." } } };
      return route.fulfill(response);
    }
    return route.fulfill({ status: 500, json: { error: { code: "UNEXPECTED_TEST_REQUEST", message: `Unexpected fixture request: ${path}` } } });
  });
  return { commands, requests, replaceState: (next: StoreState) => { state = next; } };
}
async function openExpense(page: Page) {
  await page.goto("/app/money/expenses");
  await expect(page.getByRole("heading", { name: "Expenses", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add expense", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Add expense", exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}

test("expense form owns required validation, links field errors, and focuses the first invalid field", async ({ page }) => {
  const fixture = await mockOwner(page);
  const dialog = await openExpense(page);
  const name = dialog.getByLabel("Expense name", { exact: true });
  const amount = dialog.getByLabel("Amount (USD)", { exact: true });
  const date = dialog.getByLabel("Expense date", { exact: true });
  await date.fill("");
  await dialog.getByRole("button", { name: "Save expense", exact: true }).click();
  const summary = dialog.locator(".form-error-summary");
  await expect(summary).toHaveAttribute("role", "alert");
  await expect(summary).toContainText("Check the highlighted fields.");
  await expect(summary.getByRole("link")).toHaveCount(3);
  for (const field of [name, amount, date]) {
    await expect(field).toHaveAttribute("aria-invalid", "true");
    const description = await field.getAttribute("aria-describedby");
    expect(description).toBeTruthy();
    await expect(page.locator(`[id="${description}"]`)).toHaveText("Complete this field.");
  }
  await expect(name).toBeFocused();
  expect(fixture.commands).toHaveLength(0);
  await name.fill("Monthly design software");
  await expect(name).toHaveAttribute("aria-invalid", "false");
  await expect(summary.getByRole("link")).toHaveCount(2);
});

test("expense save locks controls and closing, retains button width, blocks repeated Enter, and preserves a rejected draft", async ({ page }) => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const failure = "This save could not finish. Your draft has been kept.";
  const fixture = await mockOwner(page, async () => {
    await gate;
    return { status: 422, json: { error: { code: "CONTROLLED_TEST_REJECTION", message: failure } } };
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const dialog = await openExpense(page);
    const name = dialog.getByLabel("Expense name", { exact: true });
    const amount = dialog.getByLabel("Amount (USD)", { exact: true });
    const date = dialog.getByLabel("Expense date", { exact: true });
    await name.fill("Monthly design software");
    await amount.fill("29.00");
    await date.fill("2026-10-18");
    const submit = dialog.locator('button[type="submit"]');
    const idleBounds = await submit.boundingBox();
    expect(idleBounds).not.toBeNull();
    await submit.click();
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveAttribute("aria-busy", "true");
    await expect(submit).toHaveAccessibleName("Saving expense…");
    await expect(dialog.locator("form")).toHaveAttribute("aria-busy", "true");
    await expect(dialog.locator("fieldset.form-controls")).toHaveAttribute("disabled", "");
    for (const field of [name, amount, date]) await expect(field).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeDisabled();
    const busyBounds = await submit.boundingBox();
    expect(busyBounds).not.toBeNull();
    expect(Math.abs(busyBounds!.width - idleBounds!.width)).toBeLessThanOrEqual(1);
    for (let press = 0; press < 5; press++) await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    expect(fixture.commands.filter((command) => command.type === "expense.save")).toHaveLength(1);
    const command = fixture.commands.find((item) => item.type === "expense.save")!;
    expect(command.workspace).toBe(workspaceA);
    expect(command.input.values).toMatchObject({ description: "Monthly design software", amount: { amount_minor: 2900, currency: "USD", scale: 2 }, expense_date: "2026-10-18", classification: "estimated" });
    release();
    await expect(dialog.locator(".money-error")).toHaveText(failure);
    await expect(dialog.locator(".money-error")).toBeVisible();
    const toast = dialog.locator(".toast");
    await expect(toast).toHaveAttribute("role", "status");
    await expect(toast).toContainText(failure);
    await expect(toast.getByRole("button", { name: "Dismiss notification", exact: true })).toBeEnabled();
    await toast.getByRole("button", { name: "Dismiss notification", exact: true }).click();
    await expect(toast).toHaveCount(0);
    await expect(dialog.locator(".money-error")).toBeVisible();
    await expect(submit).toBeEnabled();
    await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeEnabled();
    await expect(name).toHaveValue("Monthly design software");
    await expect(amount).toHaveValue("29.00");
    await expect(date).toHaveValue("2026-10-18");
    expect(fixture.commands.filter((item) => item.type === "expense.save")).toHaveLength(1);
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("marketing and sign-in remain usable without loading owner workspace state", async ({ page }) => {
  const ownerReads: string[] = [], sessionReads: string[] = [];
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/user") { sessionReads.push(path); return route.fulfill({ status: 401, json: { error: { code: "UNAUTHENTICATED", message: "Sign in to continue." } } }); }
    if (["/api/workspace/state", "/api/workspaces"].includes(path)) ownerReads.push(path);
    return route.fulfill({ status: 503, json: { error: { code: "CONTROLLED_UNAVAILABLE", message: "Owner state is unavailable in this test." } } });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your business, with good company.", exact: true })).toBeVisible();
  await expect.poll(() => sessionReads.length).toBeGreaterThanOrEqual(1);
  await page.goto("/auth/sign-in");
  await expect(page.getByRole("heading", { name: "Welcome back", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue with Google", exact: true })).toBeVisible();
  await expect.poll(() => sessionReads.length).toBeGreaterThanOrEqual(2);
  expect(ownerReads).toEqual([]);
});

test("an authenticated owner identity change remounts private form drafts instead of exposing them to another account", async ({ page }) => {
  const fixture = await mockOwner(page);
  const dialog = await openExpense(page);
  await dialog.getByLabel("Expense name", { exact: true }).fill("FIRST_ACCOUNT_PRIVATE_DRAFT");
  await expect(page.locator(".sidebar").getByText("First owner", { exact: true })).toBeVisible();
  fixture.replaceState(ownerState(workspaceB, "Second owner"));
  // Focus is a real provider revalidation trigger; only the intercepted server projection changes.
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.locator(".sidebar").getByText("Second owner", { exact: true })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Add expense", exact: true }).getByLabel("Expense name", { exact: true })).toHaveValue("");
  expect(await page.locator("input").evaluateAll(inputs => inputs.some(input => (input as HTMLInputElement).value === "FIRST_ACCOUNT_PRIVATE_DRAFT"))).toBe(false);
  expect(fixture.commands).toHaveLength(0);
});

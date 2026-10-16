import { test, expect, type BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import type { StoreState } from "../../src/lib/types";
const origin = process.env.CREWMORI_E2E_ORIGIN!;
async function post(context: BrowserContext, path: string, input: unknown) {
  const response = await context.request.post(path, { headers: { origin }, data: input });
  const body = await response.json();
  expect(response.ok(), JSON.stringify(body)).toBeTruthy();
  return body;
}
async function state(context: BrowserContext): Promise<StoreState> { const response = await context.request.get("/api/workspace/state"); expect(response.ok()).toBeTruthy(); return (await response.json()).state; }
const command = (context: BrowserContext, type: string, input: unknown) => post(context, "/api/commands", { type, input, idempotencyKey: randomUUID() });

test("connected owner and buyer complete an AI-reviewed commercial workflow", async ({ browser }) => {
  expect(process.env.CREWMORI_DB_TEST).toBe("disposable");
  const owner = await browser.newContext({ baseURL: origin }), buyer = await browser.newContext({ baseURL: origin }), outsider = await browser.newContext({ baseURL: origin });
  const page = await owner.newPage(), client = await buyer.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message)); client.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/auth/sign-up");
  await page.getByLabel("Email", { exact: true }).fill("owner@browser.test");
  await page.getByLabel("Password", { exact: true }).fill("test-password-strong");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("Business / display name").fill("Browser Studio");
  await page.getByLabel("What do you do?").fill("Product designer");
  await page.getByRole("button", { name: "Continue →", exact: true }).click();
  await page.getByLabel("Service name").fill("Product design");
  await page.getByLabel("What is included?").fill("One carefully reviewed product page");
  await page.getByRole("button", { name: "Continue →", exact: true }).click();
  await expect(page).toHaveURL(/step=availability/);
  await page.getByRole("button", { name: "Continue →", exact: true }).click();
  await page.getByRole("button", { name: "Open my workspace" }).click();
  await expect(page).toHaveURL(/\/app\/home/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  let workspace = await state(owner);
  expect(Object.keys(workspace.tables.clients || {})).toHaveLength(0);
  expect(await page.evaluate(() => localStorage.getItem("crewmori.workspace.v1"))).toBeNull();
  for (const path of ["/app/team", "/app/team/activity", "/app/opportunities", "/app/offers", "/app/promotion", "/app/projects", "/app/clients", "/app/calendar", "/app/money/invoices", "/app/money/payments", "/app/money/expenses", "/app/settings/profile", "/app/settings/rules", "/app/settings/preferences", "/app/settings/knowledge", "/app/connections"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Workspace unavailable", exact: true })).toHaveCount(0);
  }
  const profile = Object.values(workspace.tables.profiles)[0], service = Object.values(workspace.tables.services)[0];
  await command(owner, "record.save", { table: "profiles", id: profile.id, expected_version: profile.version, values: { handle: "browser-studio", biography: "Design for independent teams", public_availability: "open_to_inquiries" } });
  await command(owner, "profile.publish", { id: profile.id, confirmed: true, service_versions: { [service.id]: service.version } });
  await client.goto("/u/browser-studio");
  await expect(client.getByRole("heading", { name: "Browser Studio", exact: true })).toBeVisible();
  await client.getByRole("button", { name: /Start an inquiry/ }).click();
  await client.getByLabel("Your name", { exact: true }).fill("Browser Buyer");
  await client.getByLabel("Email", { exact: true }).fill("buyer@browser.test");
  await client.getByLabel("What do you need?").fill("Design one accessible product page for our launch");
  await client.getByLabel("Budget (optional)").fill("1000");
  await client.getByRole("button", { name: "Send inquiry", exact: true }).click();
  await expect(client).toHaveURL(/\/inquiry\//);
  const engagementId = new URL(client.url()).pathname.split("/")[2];
  const buyerResponse = await buyer.request.get(`/api/buyer/state?engagement=${engagementId}`);
  const safe = await buyerResponse.json();
  expect(safe.inquiry.contact.email).toBe("buyer@browser.test");
  expect(JSON.stringify(safe)).not.toContain("owner@browser.test");
  expect((await outsider.request.get(`/api/buyer/state?engagement=${engagementId}`)).status()).toBe(401);
  workspace = await state(owner);
  const opportunity = workspace.tables.opportunities[String(workspace.tables.engagements[engagementId].opportunity_id)];
  for (const role of ["scout", "operations", "finance"]) {
    const task = await post(owner, "/api/tasks", { role, instruction: "Review the saved product design requirements", references: [{ table: "opportunities", id: opportunity.id, version: opportunity.version }], idempotencyKey: randomUUID() });
    await expect.poll(async () => (await (await owner.request.get(`/api/runs/${task.id}`)).json()).state, { timeout: 20000 }).toBe("completed");
    await page.goto(`/app/team?artifact=artifact_${task.id}`);
    await expect(page.getByRole("heading", { name: "Reviewed design request" })).toBeVisible();
    await page.getByRole("button", { name: "Save reviewed business draft" }).click();
    await expect.poll(async () => Object.values((await state(owner)).tables.assessments || {}).filter((item) => item.opportunity_id === opportunity.id && item.role_id === role).length).toBe(1);
  }
  const engagement = workspace.tables.engagements[engagementId];
  const draft = await command(owner, "offer.saveDraft", { values: { client_id: engagement.client_id, opportunity_id: opportunity.id, title: "Product page design", deliverables: [{ key: "page", label: "One product page", quantity: 1 }], price: { amount_minor: 100000, currency: "USD", scale: 2 }, estimated_effort_minutes: 120, terms: { delivery_business_days: 5, deposit_basis_points: 5000, reservation_hours: 48, timezone: "Asia/Jakarta", workdays: [0, 1, 2, 3, 4], holidays: [], start_local_time: "09:00", due_local_time: "17:00", required_input_keys: [], acceptance_disclosure: "A 50% confirmed deposit starts work. Delivery in five business days." } } });
  await page.goto(`/app/offers/${draft.result.id}`);
  await page.getByRole("button", { name: "Submit for review", exact: true }).click();
  await page.getByRole("button", { name: "Review & approve", exact: true }).click();
  await page.getByRole("button", { name: "Approve exact version" }).click();
  await page.getByRole("button", { name: "Preview & share", exact: true }).click();
  await page.getByRole("button", { name: "Share offer with buyer" }).click();
  await client.goto(`/buyer/${engagementId}/offer`);
  await client.getByRole("button", { name: "Review acceptance" }).click();
  await client.getByRole("checkbox").check();
  await client.getByRole("button", { name: "Accept offer", exact: true }).click();
  await client.getByRole("link", { name: "Continue to project →", exact: true }).click();
  await expect(client).toHaveURL(new RegExp(`/buyer/${engagementId}\\?`));
  await client.getByRole("link", { name: "Payment", exact: true }).click();
  await client.getByRole("button", { name: "Open payment", exact: true }).click();
  await client.getByRole("button", { name: "Confirm test payment", exact: true }).click();
  await expect(client.getByRole("heading", { name: "Payment received", exact: true })).toBeVisible();
  workspace = await state(owner);
  expect(Object.values(workspace.tables.projects)).toHaveLength(1);
  expect(Object.values(workspace.tables.invoices)[0].state).toBe("paid");
  expect(Object.values(workspace.tables.projects)[0].committed_start_at).toBeTruthy();
  // Real browser upload traverses private Storage and the durable ingestion worker.
  await page.goto("/app/settings/knowledge");
  await page.getByLabel("Upload source", { exact: true }).setInputFiles({ name: "capabilities.txt", mimeType: "text/plain", buffer: Buffer.from("We design accessible product websites using a reusable design system.") });
  await expect.poll(async () => Object.values((await state(owner)).tables.sources || {}).find((source) => source.label === "capabilities.txt")?.extraction_status, { timeout: 20000 }).toBe("indexed");
  await page.getByLabel("What do you need to find?").fill("accessible design");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("link", { name: "capabilities.txt", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
  await owner.close(); await buyer.close(); await outsider.close();
});

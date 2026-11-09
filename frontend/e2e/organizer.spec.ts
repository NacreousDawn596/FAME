import { expect, test } from "@playwright/test";

/**
 * End-to-end smoke test for the organizer dashboard.
 *
 * Prerequisites:
 *   - A running FAME stack (docker compose up -d)
 *   - An organizer account. Set credentials via env:
 *       FAME_ORGANIZER_USERNAME (default: admin)
 *       FAME_ORGANIZER_PASSWORD
 */
const USERNAME = process.env.FAME_ORGANIZER_USERNAME ?? "admin";
const PASSWORD = process.env.FAME_ORGANIZER_PASSWORD ?? "";

test("organizer can sign in and view the dashboard", async ({ page }) => {
  test.skip(!PASSWORD, "FAME_ORGANIZER_PASSWORD not set");

  await page.goto("/organizer");
  await expect(page.getByText("FAME Organizer")).toBeVisible();

  await page.getByPlaceholder("Username").fill(USERNAME);
  await page.getByPlaceholder("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Dashboard overview loads.
  await expect(page.getByText("Overview")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Registered")).toBeVisible();
});

test("organizer can browse filières", async ({ page }) => {
  test.skip(!PASSWORD, "FAME_ORGANIZER_PASSWORD not set");

  await page.goto("/organizer");
  await page.getByPlaceholder("Username").fill(USERNAME);
  await page.getByPlaceholder("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Overview")).toBeVisible({ timeout: 10_000 });

  await page.getByRole("link", { name: "Filières" }).click();
  await expect(page.getByText("Attribute candidates per filière.")).toBeVisible();
});

test("organizer can search candidates", async ({ page }) => {
  test.skip(!PASSWORD, "FAME_ORGANIZER_PASSWORD not set");

  await page.goto("/organizer");
  await page.getByPlaceholder("Username").fill(USERNAME);
  await page.getByPlaceholder("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Overview")).toBeVisible({ timeout: 10_000 });

  await page.getByRole("link", { name: "Candidates" }).click();
  await expect(page.getByPlaceholder("Search name, ENSAM code, filière…")).toBeVisible();
});

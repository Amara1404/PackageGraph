import { test, expect } from "playwright/test";
import { login, ADMIN, searchPackage } from "./helpers.js";

test.beforeEach(async ({ page }) => {
  await login(page, ADMIN);
});

test("debug explodes to 1 dependency (ms) and implodes to 6 packages", async ({ page }) => {
  await searchPackage(page, "debug");
  await page.getByText(/^debug@/).first().click();

  await expect(page.getByText("Depends on (1)")).toBeVisible();
  await expect(page.getByText(/^ms@/)).toBeVisible();

  await page.getByRole("button", { name: "Show impact" }).click();
  await expect(page.getByText("Depended on by (6)")).toBeVisible();

  const expected = ["body-parser", "express", "finalhandler", "router", "send", "serve-static"];
  for (const name of expected) {
    await expect(page.getByText(new RegExp(`^${name}@`))).toBeVisible();
  }
});

test("invalid package name format is rejected with 400 on fetch", async ({ page }) => {
  await searchPackage(page, "Invalid Name!!");
  await expect(page.getByRole("button", { name: /fetch from npm/i })).toBeVisible();

  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/packages/crawl")),
    page.getByRole("button", { name: /fetch from npm/i }).click(),
  ]);

  expect(response.status()).toBe(400);
  await expect(page.getByText(/invalid package name/i)).toBeVisible();
});

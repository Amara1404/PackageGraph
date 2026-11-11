import { test, expect } from "playwright/test";
import { login, ADMIN, searchPackage } from "./helpers.js";

test("flagging a real OSV advisory populates impact counts, and resolving flips the status badge", async ({ page }) => {
  await login(page, ADMIN);

  await searchPackage(page, "debug");
  await page.getByText(/^debug@/).first().click();

  await page.getByPlaceholder(/OSV id/i).fill("GHSA-gxpj-cx7g-858c");
  await page.getByRole("button", { name: /^flag debug$/i }).click();

  await expect(page.getByText(/Impact report: 6 packages/)).toBeVisible({ timeout: 15_000 });

  await page.goto("/dashboard/vulnerabilities");
  const row = page.getByRole("row", { name: /GHSA-gxpj-cx7g-858c/ });
  await expect(row).toBeVisible();
  await expect(row.getByText("open", { exact: true })).toBeVisible();

  await row.getByRole("button", { name: /resolve/i }).click();
  await expect(row.getByText("resolved", { exact: true })).toBeVisible();
});

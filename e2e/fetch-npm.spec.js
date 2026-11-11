import { test, expect } from "playwright/test";
import { login, ADMIN, searchPackage } from "./helpers.js";

// Uses a small, dependency-free real npm package. If a previous run already
// cached it, delete it first (admin-only) so the fetch path is exercised
// deterministically instead of being skipped.
const PACKAGE = "kleur";

test("fetch-from-npm caches a previously-uncached package", async ({ page }) => {
  await login(page, ADMIN);

  await searchPackage(page, PACKAGE);
  const existing = page.getByText(new RegExp(`^${PACKAGE}@`));
  if (await existing.count()) {
    await existing.first().click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: /delete package/i }).click();
    await expect(page.getByText(`Not in the catalog yet ("${PACKAGE}")`)).toBeVisible();
  }

  await searchPackage(page, PACKAGE);
  await expect(page.getByText(`Not in the catalog yet ("${PACKAGE}")`)).toBeVisible();

  await page.getByRole("button", { name: /fetch from npm/i }).click();
  await expect(page.getByText(new RegExp(`^${PACKAGE}@`))).toBeVisible({ timeout: 20_000 });
});

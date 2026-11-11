import { test, expect } from "playwright/test";
import { login, ADMIN, DEV } from "./helpers.js";

test("developer login hides the Vulnerabilities nav and flag panel", async ({ page }) => {
  await login(page, DEV);
  await expect(page.getByRole("link", { name: "Vulnerabilities" })).toHaveCount(0);

  await page.goto("/dashboard/vulnerabilities");
  await expect(page.getByRole("link", { name: "Vulnerabilities" })).toHaveCount(0);
});

test("security_admin login shows the Vulnerabilities nav and flag panel", async ({ page }) => {
  await login(page, ADMIN);
  await expect(page.getByRole("link", { name: "Vulnerabilities" })).toBeVisible();

  await page.goto("/dashboard/packages");
  await page.getByPlaceholder("npm package name, e.g. express").fill("debug");
  await page.getByRole("button", { name: /^search$/i }).click();
  await page.getByText("debug", { exact: false }).first().click();
  await expect(page.getByText("Flag vulnerability")).toBeVisible();
});

import { expect } from "playwright/test";

export const ADMIN = { username: process.env.ADMIN_USERNAME || "admin", password: process.env.ADMIN_PASSWORD || "admin123" };
export const DEV = { username: process.env.DEV_USERNAME || "dev", password: process.env.DEV_PASSWORD || "dev123" };

export async function login(page, { username, password }) {
  await page.goto("/");
  await page.getByPlaceholder("Username").fill(username);
  await page.getByPlaceholder("Password").fill(password);
  await expect(page.getByRole("button", { name: /sign in/i })).toBeEnabled();
  await Promise.all([
    page.waitForURL("**/dashboard/packages"),
    page.getByRole("button", { name: /sign in/i }).click(),
  ]);
}

export async function searchPackage(page, name) {
  await page.getByPlaceholder("npm package name, e.g. express").fill(name);
  await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/packages?q=")),
    page.getByRole("button", { name: /^search$/i }).click(),
  ]);
}

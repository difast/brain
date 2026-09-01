import { expect, test } from "@playwright/test";

import { API_URL } from "../playwright.config";
import { SEED_EMAIL, SEED_PASSWORD, signIn, waitForCode } from "./helpers";

/**
 * The panels added alongside the account-page split: the organization, API
 * keys, and deleting your own account.
 *
 * The deletion test deliberately stops short of confirming — this suite shares
 * one database with every other spec, and actually deleting the seed account
 * would take the organization, its devices and the rest of the run with it.
 */

test.describe("organization", () => {
  test.beforeEach(async ({ page, request }) => {
    await signIn(page, request);
    await page.goto("/account#profile");
  });

  function panel(page: import("@playwright/test").Page) {
    // Filter on the heading, not the text: the profile table also has an
    // "Организация" row, which would match two panels.
    return page.locator(".panel").filter({
      has: page.getByRole("heading", { name: /^(Организация|Organization)$/ }),
    });
  }

  test("shows the organization and can rename it", async ({ page, request }) => {
    const org = panel(page);
    await expect(org).toBeVisible();
    await expect(org).toContainText("Mevratek");

    await org.getByRole("button", { name: /Переименовать|Rename/ }).click();
    await org.locator("#org-name").fill("Тестовый парк");
    await org.getByRole("button", { name: /Сохранить|Save/ }).click();

    await expect(org).toContainText("Тестовый парк");

    // The real check: it persisted, rather than only changing on screen.
    const detail = await (
      await request.get(`${API_URL}/organization`, {
        headers: {
          Authorization: `Bearer ${await page.evaluate(() =>
            localStorage.getItem("mevratek.token"),
          )}`,
        },
      })
    ).json();
    expect(detail.name).toBe("Тестовый парк");

    // Put the name back for the other specs.
    await org.getByRole("button", { name: /Переименовать|Rename/ }).click();
    await org.locator("#org-name").fill("Mevratek");
    await org.getByRole("button", { name: /Сохранить|Save/ }).click();
    await expect(org).toContainText("Mevratek");
  });

  test("reports the member count and creation date", async ({ page }) => {
    const org = panel(page);
    await expect(org).toContainText(/Участников|People/);
    await expect(org).toContainText(/Создана|Created/);
  });
});

test.describe("API keys", () => {
  test.beforeEach(async ({ page, request }) => {
    await signIn(page, request);
    await page.goto("/account#developer");
  });

  function panel(page: import("@playwright/test").Page) {
    return page.locator(".panel").filter({ hasText: /Ключи API|API keys/ });
  }

  test("creates a key, shows the secret once, then revokes it", async ({
    page,
  }) => {
    const keys = panel(page);
    await expect(keys).toBeVisible();

    await keys.locator("#apikey-name").fill("e2e-key");
    await keys.getByRole("button", { name: /Создать ключ|Create key/ }).click();

    // The secret is shown exactly once, and it is a real organization key.
    await expect(keys).toContainText(/показывается один раз|shown once/i);
    await expect(keys.locator("pre")).toContainText("cbk_");
    await expect(keys).toContainText("e2e-key");

    // Reloading loses the secret for good — only the prefix remains.
    await page.reload();
    const after = panel(page);
    await expect(after).not.toContainText(/показывается один раз|shown once/i);
    await expect(after).toContainText("e2e-key");

    page.once("dialog", (d) => d.accept());
    await after.getByRole("button", { name: /Отозвать|Revoke/ }).first().click();
    await page.getByRole("button", { name: /Отозвать|Revoke/ }).last().click();
    await expect(after).not.toContainText("e2e-key");
  });
});

test.describe("deleting your account", () => {
  test.beforeEach(async ({ page, request }) => {
    await signIn(page, request);
    await page.goto("/account#security");
  });

  function panel(page: import("@playwright/test").Page) {
    return page.locator(".panel").filter({ hasText: /Удаление аккаунта|Delete account/ });
  }

  test("warns the sole member that the organization goes too", async ({ page }) => {
    const danger = panel(page);
    await expect(danger).toBeVisible();
    // The seed account is alone in its organization, so it must say so.
    await expect(danger).toContainText(
      /единственный человек|only person in this organization/i,
    );
  });

  test("asks for the password and the confirmation word", async ({ page }) => {
    const danger = panel(page);
    await danger.getByRole("button", { name: /Удалить мой аккаунт|Delete my account/ }).click();

    await expect(danger.locator("#danger-password")).toBeVisible();
    // The sole member also has to type the word out.
    await expect(danger.locator("#danger-word")).toBeVisible();

    const submit = danger.locator('button[type="submit"]');
    await expect(submit).toBeDisabled();

    // The password alone is not enough while the word is missing.
    await danger.locator("#danger-password").fill(SEED_PASSWORD);
    await expect(submit).toBeDisabled();

    await danger.locator("#danger-word").fill("не то слово");
    await expect(submit).toBeDisabled();

    await danger.locator("#danger-word").fill("УДАЛИТЬ");
    await expect(submit).toBeEnabled();
  });

  test("a wrong password is refused, and the account survives", async ({
    page,
  }) => {
    const danger = panel(page);
    await danger.getByRole("button", { name: /Удалить мой аккаунт|Delete my account/ }).click();

    await danger.locator("#danger-password").fill("not-my-password");
    await danger.locator("#danger-word").fill("УДАЛИТЬ");
    await danger.locator('button[type="submit"]').click();

    await expect(danger.locator(".error-box")).toBeVisible();

    // Still signed in, and the account is still there.
    await page.reload();
    await expect(page.locator("nav")).toContainText(SEED_EMAIL);
  });

  test("the confirmation code is emailed before anything is deleted", async ({
    page,
    request,
  }) => {
    const danger = panel(page);
    await danger.getByRole("button", { name: /Удалить мой аккаунт|Delete my account/ }).click();

    await danger.locator("#danger-password").fill(SEED_PASSWORD);
    await danger.locator("#danger-word").fill("УДАЛИТЬ");
    // The first press only asks for a code — it does not delete.
    await danger.locator('button[type="submit"]').click();

    await expect(danger.locator("#danger-code")).toBeVisible();
    const code = await waitForCode(request, { to: SEED_EMAIL, match: /удален/i });
    expect(code).toMatch(/^\d{5}$/);

    // Stop here on purpose: confirming would delete the organization every
    // other spec in this run depends on.
    await page.reload();
    await expect(page.locator("nav")).toContainText(SEED_EMAIL);
  });
});

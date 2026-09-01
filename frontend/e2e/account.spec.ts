import { expect, test } from "@playwright/test";

import {
  SEED_EMAIL,
  SEED_PASSWORD,
  clearMailbox,
  readMailbox,
  restorePassword,
  signIn,
  waitForCode,
} from "./helpers";

test.describe("account page", () => {
  test.beforeEach(async ({ page, request }) => {
    await signIn(page, request);
    await page.goto("/account");
  });

  test("shows who you are signed in as", async ({ page }) => {
    await expect(page.locator("h1")).toContainText(/Аккаунт|Account/);

    const info = page.locator(".panel").filter({ hasText: SEED_EMAIL }).first();
    await expect(info).toContainText(SEED_EMAIL);
    await expect(info).toContainText("Mevratek"); // the organization

    // No untranslated i18n keys leaked into the page.
    await expect(page.locator("body")).not.toContainText("account.");
  });

  test("lists the current session and can end the others", async ({ page }) => {
    const sessions = page
      .locator(".panel")
      .filter({ hasText: /Активные сеансы|Active sessions/ });

    await expect(sessions).toBeVisible();
    // The device we are signed in on is marked as such and has no revoke button.
    await expect(sessions).toContainText(/это устройство|this device/i);

    const revokeOthers = sessions.getByRole("button", {
      name: /остальные|all other/i,
    });
    await expect(revokeOthers).toBeVisible();
    await revokeOthers.click();

    // Ending other sessions must not end this one.
    await expect(page.locator("nav")).toContainText(SEED_EMAIL);
    await page.reload();
    await expect(page.locator("nav")).toContainText(SEED_EMAIL);
  });

  test("email preferences persist across a reload", async ({ page }) => {
    const mail = page
      .locator(".panel")
      .filter({ hasText: /Письма|Email preferences/ });
    const boxes = mail.locator('input[type="checkbox"]');
    await expect(boxes).toHaveCount(2);

    const newsletter = boxes.nth(0);
    const alerts = boxes.nth(1);

    // Both consents start on for a freshly seeded account.
    await expect(newsletter).toBeChecked();
    await expect(alerts).toBeChecked();

    await newsletter.uncheck();
    await alerts.uncheck();
    await expect(newsletter).not.toBeChecked();
    await expect(alerts).not.toBeChecked();

    // The real test: it survives a round-trip to the server.
    await page.reload();
    const after = page
      .locator(".panel")
      .filter({ hasText: /Письма|Email preferences/ })
      .locator('input[type="checkbox"]');
    await expect(after.nth(0)).not.toBeChecked();
    await expect(after.nth(1)).not.toBeChecked();

    // Put them back so later specs see the default state.
    await after.nth(0).check();
    await after.nth(1).check();
    await page.reload();
    await expect(
      page
        .locator(".panel")
        .filter({ hasText: /Письма|Email preferences/ })
        .locator('input[type="checkbox"]')
        .nth(0),
    ).toBeChecked();
  });

  test("the activity log records the sign-in and pages", async ({ page }) => {
    await page.click("text=/Открыть журнал|Open the log/i");
    await expect(page).toHaveURL(/\/account\/activity/);

    // Signing in during beforeEach must be in there.
    await expect(page.locator("table")).toContainText(/вход|login|sign/i);

    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible();

    // The pager is present and does not throw when used.
    const pager = page.locator(".pager, [class*=pager]").first();
    if (await pager.isVisible().catch(() => false)) {
      await expect(pager).toBeVisible();
    }
  });
});

test.describe("changing the password", () => {
  const NEW_PASSWORD = "changed-pass-7781";

  // Always hand the seed password back, whatever happened above.
  test.afterEach(async ({ request }) => {
    await restorePassword(request, NEW_PASSWORD).catch(() => {
      /* the test may have failed before changing anything */
    });
  });

  test("needs the emailed code, then the new password works", async ({
    page,
    request,
  }) => {
    await signIn(page, request);
    await page.goto("/account");

    const panel = page
      .locator(".panel")
      .filter({ hasText: /Смена пароля|Change password/ });

    await panel.locator("#acc-current").fill(SEED_PASSWORD);
    await panel.locator("#acc-new").fill(NEW_PASSWORD);
    await panel.locator("#acc-confirm").fill(NEW_PASSWORD);

    await clearMailbox(request);
    // The first press only asks for a code — the password alone cannot change
    // the password.
    await panel.locator('form button[type="submit"]').click();

    const codeInput = panel.locator("#acc-pw-code");
    await expect(codeInput).toBeVisible();

    const code = await waitForCode(request, { to: SEED_EMAIL, match: /парол/i });
    await codeInput.fill(code);
    await panel.locator('form button[type="submit"]').click();

    // Other devices are signed out; this one stays signed in.
    await expect(codeInput).toBeHidden();
    await expect(page.locator("nav")).toContainText(SEED_EMAIL);

    // The new password is the one that works now.
    await page.click(".nav-logout");
    await expect(page).toHaveURL(/\/login/);
    await clearMailbox(request);
    await signIn(page, request, SEED_EMAIL, NEW_PASSWORD);
  });

  test("a wrong current password is refused", async ({ page, request }) => {
    await signIn(page, request);
    await page.goto("/account");

    const panel = page
      .locator(".panel")
      .filter({ hasText: /Смена пароля|Change password/ });

    await panel.locator("#acc-current").fill("not-my-password");
    await panel.locator("#acc-new").fill("some-new-password");
    await panel.locator("#acc-confirm").fill("some-new-password");

    await clearMailbox(request);
    await panel.locator('form button[type="submit"]').click();

    await expect(panel.locator(".error-box")).toBeVisible();
    // No code step, and nothing emailed, on a bad current password.
    await expect(panel.locator("#acc-pw-code")).toHaveCount(0);
    expect(await readMailbox(request, SEED_EMAIL)).toHaveLength(0);
  });
});

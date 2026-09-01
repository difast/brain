import { expect, test } from "@playwright/test";

import {
  SEED_EMAIL,
  SEED_PASSWORD,
  clearMailbox,
  readMailbox,
  restorePassword,
  signIn,
  signOut,
  waitForCode,
} from "./helpers";

test.describe("sign-in", () => {
  test.beforeEach(async ({ request, context }) => {
    await clearMailbox(request);
    await context.clearCookies();
  });

  test("password then emailed code lets you in", async ({ page, request }) => {
    await page.goto("/login");

    await page.fill("#email", SEED_EMAIL);
    await page.fill("#password", SEED_PASSWORD);
    await page.click('form button[type="submit"]');

    // The password alone must not be enough: the code step has to appear.
    await expect(page.locator("#code")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);

    const messages = await readMailbox(request, SEED_EMAIL);
    expect(messages.length, "a code should have been emailed").toBeGreaterThan(0);

    const code = await waitForCode(request, { to: SEED_EMAIL });
    expect(code).toMatch(/^\d{5}$/);

    await page.fill("#code", code);
    await page.click('form button[type="submit"]');

    await expect(page).toHaveURL(/\/$|\/robots/);
    await expect(page.locator("nav")).toContainText(SEED_EMAIL);
  });

  test("a wrong password is refused and sends no code", async ({
    page,
    request,
  }) => {
    await page.goto("/login");
    await page.fill("#email", SEED_EMAIL);
    await page.fill("#password", "definitely-not-the-password");
    await page.click('form button[type="submit"]');

    await expect(page.locator(".error-box")).toBeVisible();
    await expect(page.locator("#code")).toHaveCount(0);
    await expect(page).toHaveURL(/\/login/);

    expect(
      await readMailbox(request, SEED_EMAIL),
      "a failed password must not trigger a code",
    ).toHaveLength(0);
  });

  test("a wrong code is refused, and the right one still works", async ({
    page,
    request,
  }) => {
    await page.goto("/login");
    await page.fill("#email", SEED_EMAIL);
    await page.fill("#password", SEED_PASSWORD);
    await page.click('form button[type="submit"]');
    await expect(page.locator("#code")).toBeVisible();

    const code = await waitForCode(request, { to: SEED_EMAIL });
    const wrong = code === "00000" ? "11111" : "00000";

    await page.fill("#code", wrong);
    await page.click('form button[type="submit"]');
    await expect(page.locator(".error-box")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);

    // A spent attempt must not invalidate the real code.
    await page.fill("#code", code);
    await page.click('form button[type="submit"]');
    await expect(page).toHaveURL(/\/$|\/robots/);
  });

  test("the session survives a reload, and signing out ends it", async ({
    page,
    request,
  }) => {
    await signIn(page, request);

    await page.reload();
    await expect(page.locator("nav")).toContainText(SEED_EMAIL);

    await signOut(page);

    // The dashboard must not be reachable again without signing in.
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("the dashboard is closed to anonymous visitors", async ({ page }) => {
    for (const path of ["/", "/logs", "/account", "/tasks"]) {
      await page.goto(path);
      await expect(page, `${path} should require sign-in`).toHaveURL(/\/login/);
    }
  });
});

test.describe("password recovery", () => {
  const NEW_PASSWORD = "recovered-pass-9134";

  test.beforeEach(async ({ request }) => {
    await clearMailbox(request);
  });

  // Whatever the test leaves behind, the seed password has to work again.
  test.afterEach(async ({ request }) => {
    await restorePassword(request, NEW_PASSWORD).catch(() => {
      /* the test may have failed before changing anything */
    });
  });

  test("a forgotten password can be reset with an emailed code", async ({
    page,
    request,
  }) => {
    await page.goto("/login");
    await page.click("text=/Забыли пароль|Forgot/i");

    await page.fill("#reset-email", SEED_EMAIL);
    await page.click('form button[type="submit"]');

    await expect(page.locator("#reset-code")).toBeVisible();
    const code = await waitForCode(request, { to: SEED_EMAIL });

    await page.fill("#reset-code", code);
    await page.fill("#reset-password", NEW_PASSWORD);
    await page.click('form button[type="submit"]');

    // Back at sign-in, and the new password is the one that works.
    await expect(page.locator("#email")).toBeVisible();

    await clearMailbox(request);
    await signIn(page, request, SEED_EMAIL, NEW_PASSWORD);

    // ...and the old one no longer does.
    await signOut(page);
    await clearMailbox(request);
    await page.fill("#email", SEED_EMAIL);
    await page.fill("#password", SEED_PASSWORD);
    await page.click('form button[type="submit"]');
    await expect(page.locator(".error-box")).toBeVisible();
  });

  test("recovery does not reveal whether an address is registered", async ({
    page,
    request,
  }) => {
    await page.goto("/login");
    await page.click("text=/Забыли пароль|Forgot/i");

    await page.fill("#reset-email", "nobody-here@example.com");
    await page.click('form button[type="submit"]');

    // The same "check your mail" step as for a real address...
    await expect(page.locator("#reset-code")).toBeVisible();
    // ...but nothing is actually sent.
    await page.waitForTimeout(1_000);
    expect(await readMailbox(request, "nobody-here@example.com")).toHaveLength(0);
  });
});

// Login throttling is deliberately *not* exercised here: tripping it would
// lock this IP for an hour and poison every later spec. It is covered at the
// backend level in tests/test_sessions_and_throttle.py, where each test gets
// its own database.

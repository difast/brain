import { expect, test } from "@playwright/test";

import { SEED_EMAIL, clearMailbox, readMailbox, signIn } from "./helpers";

/**
 * Team management on /account.
 *
 * Each test cleans up the invite it created: the specs share one database, and
 * a stray pending invite would change what the next one sees.
 */
test.describe("team", () => {
  test.beforeEach(async ({ page, request }) => {
    await signIn(page, request);
    await page.goto("/account");
  });

  function panel(page: import("@playwright/test").Page) {
    return page.locator(".panel").filter({ hasText: /Команда|Team/ });
  }

  test("lists the signed-in administrator", async ({ page }) => {
    const team = panel(page);
    await expect(team).toBeVisible();
    await expect(team).toContainText(SEED_EMAIL);
    // The row for yourself is marked, and offers no "remove" button.
    await expect(team).toContainText(/вы|you/);
    await expect(team.getByRole("button", { name: /Удалить|Remove/ })).toHaveCount(0);
  });

  test("inviting a colleague emails them and lists the invite", async ({
    page,
    request,
  }) => {
    const team = panel(page);
    await clearMailbox(request);

    await team.locator("#team-email").fill("colleague@example.com");
    await team.locator('button[type="submit"]').click();

    await expect(team).toContainText("colleague@example.com");
    await expect(team).toContainText(/Ожидают приглашения|Pending invites/);

    const mail = await readMailbox(request, "colleague@example.com");
    expect(mail.length, "the colleague should be emailed").toBeGreaterThan(0);
    expect(mail[0].subject).toMatch(/приглашение|invitation/i);
    // The link is the credential, so it has to be in the message.
    expect(mail[0].text).toContain("/invite/");

    // Clean up.
    page.once("dialog", (d) => d.accept());
    await team.getByRole("button", { name: /Отозвать|Revoke/ }).click();
    await page.getByRole("button", { name: /Отозвать|Revoke/ }).last().click();
    await expect(team).not.toContainText("colleague@example.com");
  });

  test("a revoked invite disappears after a reload", async ({ page, request }) => {
    const team = panel(page);
    await clearMailbox(request);

    await team.locator("#team-email").fill("temporary@example.com");
    await team.locator('button[type="submit"]').click();
    await expect(team).toContainText("temporary@example.com");

    page.once("dialog", (d) => d.accept());
    await team.getByRole("button", { name: /Отозвать|Revoke/ }).click();
    await page.getByRole("button", { name: /Отозвать|Revoke/ }).last().click();

    // The real check: it is gone on the server, not just in local state.
    await page.reload();
    await expect(panel(page)).not.toContainText("temporary@example.com");
  });

  test("inviting an address that already has an account is refused", async ({
    page,
  }) => {
    const team = panel(page);
    await team.locator("#team-email").fill(SEED_EMAIL);
    await team.locator('button[type="submit"]').click();

    // A toast reports the conflict, and no invite is created.
    await expect(page.locator("body")).toContainText(/уже существует|already exists/i);
    await page.reload();
    await expect(panel(page)).not.toContainText(/Ожидают приглашения|Pending invites/);
  });

  test("the invite expiry reads as a future date, not a negative age", async ({
    page,
    request,
  }) => {
    const team = panel(page);
    await clearMailbox(request);

    await team.locator("#team-email").fill("expiry@example.com");
    await team.locator('button[type="submit"]').click();
    await expect(team).toContainText("expiry@example.com");

    // Guards a real bug: timeAgo() on a future timestamp rendered "-259200s ago".
    await expect(team).not.toContainText("-");
    await expect(team).toContainText(/in \d+[dhm]/);

    page.once("dialog", (d) => d.accept());
    await team.getByRole("button", { name: /Отозвать|Revoke/ }).click();
    await page.getByRole("button", { name: /Отозвать|Revoke/ }).last().click();
  });
});

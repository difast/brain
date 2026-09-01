import { expect, type Page, type APIRequestContext } from "@playwright/test";

import { API_URL, MAILBOX_URL } from "../playwright.config";

/** The account the API seeds on first start. */
export const SEED_EMAIL = "info@mevratek.ru";
export const SEED_PASSWORD = "11111111";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  codes: string[];
  code: string | null;
}

/** Forget every message, so the next `waitForCode` cannot read a stale one. */
export async function clearMailbox(request: APIRequestContext): Promise<void> {
  const response = await request.delete(`${MAILBOX_URL}/messages`);
  expect(response.ok(), "the mail sink should be reachable").toBeTruthy();
}

export async function readMailbox(
  request: APIRequestContext,
  to?: string,
): Promise<MailMessage[]> {
  const url = to
    ? `${MAILBOX_URL}/messages?to=${encodeURIComponent(to)}`
    : `${MAILBOX_URL}/messages`;
  const response = await request.get(url);
  expect(response.ok(), "the mail sink should be reachable").toBeTruthy();
  return (await response.json()) as MailMessage[];
}

/**
 * Wait for a message to arrive and return the code in it.
 *
 * Mail goes out on a background task, so it lands slightly after the request
 * that triggered it — hence the poll rather than a single read. `match` picks
 * the right message when several are in flight (a code and a welcome, say).
 */
export async function waitForCode(
  request: APIRequestContext,
  options: { to?: string; match?: RegExp; timeoutMs?: number } = {},
): Promise<string> {
  const { to, match, timeoutMs = 15_000 } = options;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const messages = await readMailbox(request, to);
    const candidates = match
      ? messages.filter((m) => match.test(m.subject))
      : messages;
    const withCode = candidates.reverse().find((m) => m.code);
    if (withCode?.code) return withCode.code;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const seen = await readMailbox(request, to);
  throw new Error(
    `No code arrived within ${timeoutMs}ms. Mailbox held: ${JSON.stringify(
      seen.map((m) => m.subject),
    )}`,
  );
}

/**
 * Sign in through the UI, all the way to the dashboard.
 *
 * This is the flow under test in auth.spec.ts; other specs call it to get
 * themselves authenticated before exercising something else.
 */
export async function signIn(
  page: Page,
  request: APIRequestContext,
  email = SEED_EMAIL,
  password = SEED_PASSWORD,
): Promise<void> {
  await clearMailbox(request);
  await page.goto("/login");

  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('form button[type="submit"]');

  // Password accepted → the code step appears.
  await expect(page.locator("#code")).toBeVisible();

  const code = await waitForCode(request, { to: email });
  await page.fill("#code", code);
  await page.click('form button[type="submit"]');

  await expect(page).toHaveURL(/\/$|\/robots/);
  await expect(page.locator("nav")).toContainText(email);
}

/** Sign out through the header control. */
export async function signOut(page: Page): Promise<void> {
  await page.click(".nav-logout");
  await expect(page).toHaveURL(/\/login/);
}

/**
 * Restore the seed password directly through the API.
 *
 * A spec that changes the password has to put it back, or every later spec
 * fails. Doing it over the API keeps the cleanup off the UI under test.
 */
export async function restorePassword(
  request: APIRequestContext,
  currentPassword: string,
): Promise<void> {
  if (currentPassword === SEED_PASSWORD) return;

  const login = await request.post(`${API_URL}/auth/login`, {
    data: { email: SEED_EMAIL, password: currentPassword },
  });
  const started = await login.json();

  let token: string | undefined = started.token;
  if (started.code_required) {
    const code = await waitForCode(request, { to: SEED_EMAIL });
    const done = await request.post(`${API_URL}/auth/login/verify`, {
      data: { challenge: started.challenge, code },
    });
    token = (await done.json()).token;
  }
  expect(token, "cleanup needs a session token").toBeTruthy();

  const headers = { Authorization: `Bearer ${token}` };
  const requested = await request.post(`${API_URL}/auth/password/request`, {
    headers,
    data: { current_password: currentPassword },
  });
  expect(requested.ok()).toBeTruthy();

  const code = await waitForCode(request, { to: SEED_EMAIL, match: /парол/i });
  const changed = await request.patch(`${API_URL}/auth/password`, {
    headers,
    data: {
      current_password: currentPassword,
      new_password: SEED_PASSWORD,
      code,
    },
  });
  expect(changed.ok(), await changed.text()).toBeTruthy();
}

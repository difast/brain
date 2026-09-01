import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests for the dashboard.
 *
 * Sign-in became a multi-step flow — password, then a code emailed to the
 * account — with recovery and revocable sessions alongside it. `tsc` and a
 * successful build say nothing about whether any of that still works, so these
 * drive the real browser against a real backend.
 *
 * Three processes are started for the run:
 *   - a mail sink, so the test can read the emailed codes (e2e/mailsink.py)
 *   - the API on SQLite, with mail pointed at that sink
 *   - the dashboard, built against that API
 *
 * Everything binds to 127.0.0.1 on ports of its own, so a run never collides
 * with a dev server on the usual ones.
 */

const API_PORT = 8025;
const WEB_PORT = 3025;
const SMTP_PORT = 1025;
const MAIL_HTTP_PORT = 8026;

export const API_URL = `http://127.0.0.1:${API_PORT}/api/v1`;
export const WEB_URL = `http://127.0.0.1:${WEB_PORT}`;
export const MAILBOX_URL = `http://127.0.0.1:${MAIL_HTTP_PORT}`;

/** A fresh database per run, so tests never inherit yesterday's state. */
const DB_PATH = "/tmp/mevratek-e2e.db";

const backendEnv = {
  DATABASE_URL: `sqlite+aiosqlite:///${DB_PATH}`,
  CORS_ORIGINS: WEB_URL,
  DEMO_MODE: "false",
  ALERTS_ENABLED: "false",
  // Mail on, pointed at the sink: this is what makes the code steps testable.
  SMTP_HOST: "127.0.0.1",
  SMTP_PORT: String(SMTP_PORT),
  SMTP_USER: "e2e@mevratek.ru",
  SMTP_PASSWORD: "e2e",
  SMTP_ENCRYPTION: "none",
  // No captcha: the widget calls out to Yandex, which a test run cannot reach.
  YANDEX_CAPTCHA_SERVER_KEY: "",
  YANDEX_CAPTCHA_SITE_KEY: "",
};

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,
  // Each spec signs in and changes account state, so they must not interleave.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],

  use: {
    baseURL: WEB_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 15_000,
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // CI runs `playwright install chromium` and needs no override. Set
        // PLAYWRIGHT_CHROMIUM_PATH when a sandbox already ships a browser
        // whose build number does not match this Playwright version.
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : {},
      },
    },
  ],

  webServer: [
    {
      command: `python3 e2e/mailsink.py --smtp-port ${SMTP_PORT} --http-port ${MAIL_HTTP_PORT}`,
      url: `${MAILBOX_URL}/health`,
      reuseExistingServer: !process.env.CI,
      stdout: "ignore",
      stderr: "pipe",
      timeout: 30_000,
    },
    {
      // A fresh database each run; the API re-seeds the admin on start-up.
      command:
        `rm -f ${DB_PATH} && ` +
        `python -m uvicorn app.main:app --host 127.0.0.1 --port ${API_PORT}`,
      cwd: "../backend",
      url: `http://127.0.0.1:${API_PORT}/api/v1/health`,
      env: backendEnv,
      reuseExistingServer: !process.env.CI,
      stdout: "ignore",
      stderr: "pipe",
      timeout: 120_000,
    },
    {
      // NEXT_PUBLIC_* is baked at build time, so the build has to happen here
      // with the test API's address.
      //
      // The build is `output: "standalone"` (that is what the container runs),
      // so serve it the way the Dockerfile does — static assets copied in, then
      // server.js — rather than with `next start`, which warns and is not what
      // ships.
      command:
        "npm run build && " +
        "cp -r .next/static .next/standalone/.next/static && " +
        "cp -r public .next/standalone/public 2>/dev/null; " +
        "node .next/standalone/server.js",
      url: WEB_URL,
      env: {
        NEXT_PUBLIC_API_BASE_URL: API_URL,
        NEXT_TELEMETRY_DISABLED: "1",
        PORT: String(WEB_PORT),
        HOSTNAME: "127.0.0.1",
      },
      reuseExistingServer: !process.env.CI,
      stdout: "ignore",
      stderr: "pipe",
      timeout: 240_000,
    },
  ],
});

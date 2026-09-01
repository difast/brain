import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { API_URL } from "../playwright.config";
import { signIn } from "./helpers";

/**
 * The /metrics page.
 *
 * Seeds a small fleet through the public API, then checks the page reports it —
 * including the fallback share, which is the one number that says whether the
 * model is really deciding or the platform is improvising.
 */

/** Register devices and drive a few decisions through them. */
async function seedFleet(page: Page, request: APIRequestContext) {
  const token = await page.evaluate(() => localStorage.getItem("mevratek.token"));
  const headers = { Authorization: `Bearer ${token}` };

  const key = await (
    await request.post(`${API_URL}/api-keys`, {
      headers,
      data: { name: `metrics-e2e-${Date.now()}` },
    })
  ).json();

  for (const [name, rounds] of [
    ["metrics-alpha", 2],
    ["metrics-beta", 1],
  ] as const) {
    const registration = await (
      await request.post(`${API_URL}/robots/register`, {
        headers: { Authorization: `Bearer ${key.key}` },
        data: {
          name,
          robot_type: "rover",
          capabilities: [{ type: "move_forward" }, { type: "stop" }],
        },
      })
    ).json();
    const device = { Authorization: `Bearer ${registration.token}` };

    await request.post(`${API_URL}/robots/heartbeat`, {
      headers: device,
      data: { status: "online" },
    });

    for (let i = 0; i < rounds; i++) {
      const decision = await (
        await request.post(`${API_URL}/brain/decision`, {
          headers: device,
          data: { task: "доехать до точки", state: { battery: 80 } },
        })
      ).json();

      const action = decision.actions?.[0];
      if (!action) continue;

      // One deliberate failure, so the failures table has something real in it.
      const failed = name === "metrics-beta";
      await request.post(`${API_URL}/executions`, {
        headers: device,
        data: {
          action_id: action.action_id,
          status: failed ? "failed" : "success",
          duration_ms: 120,
          error: failed ? "колесо заклинило" : null,
          action_type: action.type,
        },
      });
    }
  }
}

test.describe("metrics", () => {
  test.beforeEach(async ({ page, request }) => {
    await signIn(page, request);
    await seedFleet(page, request);
    await page.goto("/metrics");
  });

  test("reports the fleet and translates every label", async ({ page }) => {
    await expect(page.locator("h1")).toContainText(/Метрики|Metrics/);
    await expect(page.locator(".kpi-strip").first()).toBeVisible();
    // No untranslated i18n keys leaked into the page.
    await expect(page.locator("body")).not.toContainText("metrics.");
  });

  test("lists the devices that made decisions", async ({ page }) => {
    const byDevice = page.locator(".panel").filter({ hasText: /По устройствам|By device/ });
    await expect(byDevice).toContainText("metrics-alpha");
    await expect(byDevice).toContainText("metrics-beta");
  });

  test("surfaces failed commands with the device and the error", async ({ page }) => {
    const failures = page
      .locator(".panel")
      .filter({ hasText: /Невыполненные команды|Failed commands/ });
    await expect(failures).toContainText("metrics-beta");
    await expect(failures).toContainText("колесо заклинило");
  });

  test("warns when decisions came from the fallback rather than the model", async ({
    page,
  }) => {
    // The test stack has no LLM provider, so every decision is a fallback —
    // exactly the state an operator must not mistake for a working brain.
    const byModel = page.locator(".panel").filter({ hasText: /По моделям|By model/ });
    await expect(byModel).toContainText(/fallback|mock/);
    await expect(page.locator(".error-box")).toContainText(
      /Не все решения приняла модель|The model did not make every decision/,
    );
  });

  test("switching the window keeps the page working", async ({ page }) => {
    for (const label of [/7 дней|7 days/, /30 дней|30 days/, /24 часа|24 hours/]) {
      await page.getByRole("button", { name: label }).click();
      await expect(page.locator(".kpi-strip").first()).toBeVisible();
      await expect(page.locator("body")).not.toContainText("metrics.");
    }
  });

  test("is closed to anonymous visitors", async ({ page, context }) => {
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto("/metrics");
    await expect(page).toHaveURL(/\/login/);
  });
});

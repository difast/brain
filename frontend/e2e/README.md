# End-to-end tests

Browser tests for the dashboard's sign-in and account flows.

`tsc` and a successful build say nothing about whether signing in still works.
Sign-in is the riskiest path in the product — password, then a code emailed to
the account, plus recovery and revocable sessions — and a break there locks
every user out of the whole dashboard. These drive a real browser against a real
backend so that break is caught in CI instead of by a customer.

## Running them

```bash
cd frontend
npm ci
npx playwright install chromium   # once
npm run test:e2e
```

`npm run test:e2e:ui` opens the interactive runner, which is the fastest way to
debug a failure.

Playwright starts everything the run needs and stops it afterwards:

| Process | Port | What it is for |
|---|---|---|
| `e2e/mailsink.py` | SMTP 1025, HTTP 8026 | Captures the emailed codes so a test can read them |
| the API | 8025 | A fresh SQLite database each run, mail pointed at the sink |
| the dashboard | 3025 | The `output: standalone` build, served the way the container serves it |

Ports are deliberately not the usual ones, so a run never collides with a dev
server you have open.

## The mail sink

The code steps are untestable without seeing the mail, so `mailsink.py` is a
throwaway SMTP server that keeps messages in memory and serves them as JSON.
Standard library only — CI installs nothing for it.

```
GET    /messages          every message, newest last
GET    /messages?to=x     only those addressed to x
DELETE /messages          forget everything
```

Each message carries a `code` field, already pulled out of the body, so tests
ask for a code rather than re-parsing mail.

## Writing a test

`helpers.ts` has what most tests need:

```ts
await signIn(page, request);              // full password + code flow
const code = await waitForCode(request, { to: SEED_EMAIL });
await clearMailbox(request);              // before an assertion about what was sent
```

Two rules keep the suite honest:

- **Put state back.** The specs share one database and run in a fixed order with
  a single worker. A test that changes the password or a consent toggle has to
  restore it — see `restorePassword` and the `afterEach` hooks.
- **Assert on what the user sees**, not on implementation details. Prefer the
  stable `id`s the forms already carry (`#email`, `#code`, `#acc-current`) over
  positional selectors, which break the moment a field is added.

## What is deliberately not here

Login throttling. Tripping it would lock the runner's IP for an hour and poison
every later spec, so it is covered at the backend level in
`backend/tests/test_sessions_and_throttle.py`, where each test gets its own
database.

## In a sandbox with a preinstalled browser

If the environment already ships a Chromium whose build number does not match
this Playwright version, point at it instead of downloading another:

```bash
PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium-*/chrome-linux/chrome npm run test:e2e
```

CI does not need this — it runs `playwright install chromium`.

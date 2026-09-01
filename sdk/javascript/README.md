# Mevratek SDK (JavaScript / TypeScript)

Official JavaScript SDK for the **Mevratek for Robots** API. Connect any device
in a few lines instead of hand-building HTTP requests.

Zero dependencies — it uses the platform `fetch`, so it runs on Node 18+, Deno,
Bun and in the browser. Ships with TypeScript types.

## Install

```bash
npm install "https://gitpkg.now.sh/difast/brain/sdk/javascript"
```

From a local checkout:

```bash
npm install ./sdk/javascript
```

## Quick start

Registration needs an **organization API key** (`cbk_...`), issued from the
dashboard under *API keys*. It says which organization the new device belongs
to; registration swaps it for a device token, so the key itself never has to
live on the device.

```js
import { BrainClient } from "@mevratek/sdk";

// 1. Register once — returns an authenticated client (save bot.token to reuse).
const bot = await BrainClient.register("https://your-api/api/v1", {
  apiKey: "cbk_...",        // organization key, from the dashboard
  name: "rover-01",
  robotType: "rover",
  capabilities: [
    { type: "move_forward", value: { type: "number", min: 0, max: 1 } },
    { type: "turn_left", value: { type: "number", min: 0, max: 180 } },
    { type: "stop" },
  ],
});
console.log("token:", bot.token); // persist this

// 2. Report liveness + telemetry.
await bot.heartbeat();
await bot.sendTelemetry({ battery: 82, speed: 0, x: 0, y: 0 });

// 3. Ask the brain what to do.
const decision = await bot.decide({
  task: "find and approach the bottle",
  state: { battery: 82, obstacle_distance_m: 1.4 },
});
for (const action of decision.actions) {
  console.log("execute", action.type, action.value);
}
```

## Reusing an existing token

```js
const bot = new BrainClient("https://your-api/api/v1", "eyJ...");
```

## Sending a camera frame

Pass raw bytes and the SDK base64-encodes them for you:

```js
import { readFile } from "node:fs/promises";

const decision = await bot.decide({
  task: "avoid the obstacle",
  imageBytes: await readFile("frame.jpg"),
  imageMediaType: "image/jpeg",
});
```

## Task Engine

```js
const task = await bot.nextTask(); // null when the queue is empty
if (task) {
  const decision = await bot.decide({ task: task.description, taskId: task.id });
  // ... execute the actions ...
  await bot.reportTaskResult(task.id, { status: "completed", result: "done" });
}
```

## Reporting execution results

Telling the platform how a command actually went feeds the memory layer, so the
next decision accounts for it:

```js
await bot.reportExecution(action.action_id, {
  status: "failed",
  durationMs: 340,
  error: "wheel stalled",
});
```

## API reference

| Method | Description |
|---|---|
| `BrainClient.register(url, { apiKey, name, robotType, capabilities, meta })` | Register and return a client |
| `new BrainClient(url, token)` | Construct from an existing token |
| `.heartbeat(status = "online")` | Report liveness |
| `.decide({ task, state, imageBytes/imageB64, frameUrl, taskId })` | Get a decision |
| `.sendTelemetry({ battery, speed, x, y, z, errors, extra })` | Send telemetry |
| `.nextTask()` | Pull the next queued task (or `null`) |
| `.reportTaskResult(taskId, { status, result })` | Report task outcome |
| `.profile(robotId?)` | Capabilities + universal actions |
| `.reportExecution(actionId, { status, durationMs, error })` | DAL feedback |

Options accepted by the constructor and by `register`: `timeoutMs` (default
30 000) and `fetch` (swap in your own implementation).

Failed requests throw `BrainError`, which carries `.statusCode`:

```js
import { BrainError } from "@mevratek/sdk";

try {
  await bot.heartbeat();
} catch (err) {
  if (err instanceof BrainError && err.statusCode === 401) {
    // token expired — re-register or refresh
  }
}
```

## Development

```bash
npm install
npm test      # builds, then runs the suite against a local stub server
```

/**
 * Exercises the client against a real HTTP server, so the request shape the
 * platform actually receives is what gets asserted.
 */

import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { after, before } from "node:test";

import { BrainClient, BrainError } from "../dist/index.js";

/** Requests the stub server saw, in order. */
const seen = [];
/** Replies queued by the test that is running. */
let reply = () => ({ status: 200, body: {} });

const server = createServer((req, res) => {
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    const body = raw ? JSON.parse(raw) : null;
    seen.push({
      method: req.method,
      path: req.url,
      auth: req.headers.authorization ?? null,
      body,
    });
    const { status, body: out } = reply({ method: req.method, path: req.url, body });
    if (status === 204) {
      res.writeHead(204).end();
      return;
    }
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(out));
  });
});

let base;

before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
});

after(() => server.close());

function reset() {
  seen.length = 0;
  reply = () => ({ status: 200, body: {} });
}

test("register posts the device and keeps the token", async () => {
  reset();
  reply = () => ({
    status: 200,
    body: { token: "tok-1", api_key: "key-1", robot: { id: "r1", name: "rover-01" } },
  });

  const bot = await BrainClient.register(base, {
    apiKey: "cbk_test-key",
    name: "rover-01",
    robotType: "rover",
    capabilities: [{ type: "stop" }],
  });

  assert.equal(bot.token, "tok-1");
  assert.equal(bot.apiKey, "key-1");
  assert.equal(bot.robot.id, "r1");
  assert.deepEqual(seen[0].body, {
    name: "rover-01",
    robot_type: "rover",
    capabilities: [{ type: "stop" }],
    meta: {},
  });
  assert.equal(seen[0].path, "/api/v1/robots/register");
  // The org key authenticates registration...
  assert.equal(seen[0].auth, "Bearer cbk_test-key");
  // ...and is replaced by the device token for every later call.
  await bot.heartbeat();
  assert.equal(seen[1].auth, "Bearer tok-1");
});

test("a trailing slash on the base url does not double up", async () => {
  reset();
  const bot = new BrainClient(`${base}/`, "tok");
  await bot.heartbeat();
  assert.equal(seen[0].path, "/api/v1/robots/heartbeat");
});

test("every authenticated call carries the bearer token", async () => {
  reset();
  const bot = new BrainClient(base, "tok-2");
  await bot.heartbeat();
  assert.equal(seen[0].auth, "Bearer tok-2");
  assert.deepEqual(seen[0].body, { status: "online" });
});

test("telemetry sends nulls for what the caller omitted", async () => {
  reset();
  const bot = new BrainClient(base, "tok");
  await bot.sendTelemetry({ battery: 82, speed: 0.5 });
  assert.deepEqual(seen[0].body, {
    battery: 82,
    speed: 0.5,
    x: null,
    y: null,
    z: null,
    errors: [],
    extra: {},
  });
});

test("decide encodes raw image bytes as base64", async () => {
  reset();
  reply = () => ({ status: 200, body: { goal: "go", confidence: 0.9, actions: [] } });
  const bot = new BrainClient(base, "tok");

  const decision = await bot.decide({
    task: "approach the bottle",
    state: { battery: 80 },
    imageBytes: new Uint8Array([1, 2, 3]),
  });

  assert.equal(decision.goal, "go");
  assert.equal(seen[0].body.image_b64, Buffer.from([1, 2, 3]).toString("base64"));
  assert.equal(seen[0].body.image_media_type, "image/jpeg");
});

test("decide omits image fields when there is no frame", async () => {
  reset();
  reply = () => ({ status: 200, body: { goal: "go", confidence: 1, actions: [] } });
  const bot = new BrainClient(base, "tok");
  await bot.decide({ task: "stop" });
  assert.ok(!("image_b64" in seen[0].body));
  assert.ok(!("frame_url" in seen[0].body));
});

test("nextTask returns null on 204 and the task otherwise", async () => {
  reset();
  reply = () => ({ status: 204 });
  const bot = new BrainClient(base, "tok");
  assert.equal(await bot.nextTask(), null);

  reply = () => ({ status: 200, body: { id: "t1", description: "drive", status: "queued" } });
  const task = await bot.nextTask();
  assert.equal(task.id, "t1");
});

test("profile falls back to the registered robot id", async () => {
  reset();
  reply = ({ path }) =>
    path.endsWith("/register")
      ? { status: 200, body: { token: "t", api_key: "k", robot: { id: "rid-9" } } }
      : { status: 200, body: { capabilities: [] } };

  const bot = await BrainClient.register(base, {
    apiKey: "cbk_k",
    name: "n",
    robotType: "rover",
  });
  await bot.profile();
  assert.equal(seen[1].path, "/api/v1/robots/rid-9/profile");
});

test("profile without an id and without registering is rejected locally", async () => {
  reset();
  const bot = new BrainClient(base, "tok");
  await assert.rejects(() => bot.profile(), /No robot id/);
  assert.equal(seen.length, 0, "should not reach the network");
});

test("an API error becomes a BrainError carrying the status", async () => {
  reset();
  reply = () => ({ status: 401, body: { message: "Invalid token." } });
  const bot = new BrainClient(base, "bad");

  await assert.rejects(
    () => bot.heartbeat(),
    (err) => {
      assert.ok(err instanceof BrainError);
      assert.equal(err.statusCode, 401);
      assert.match(err.message, /Invalid token/);
      return true;
    },
  );
});

test("a non-JSON error body is still reported", async () => {
  reset();
  reply = () => ({ status: 502, body: "upstream is down" });
  const bot = new BrainClient(base, "tok");
  await assert.rejects(() => bot.heartbeat(), (err) => err.statusCode === 502);
});

test("reportExecution sends the DAL feedback shape", async () => {
  reset();
  const bot = new BrainClient(base, "tok");
  await bot.reportExecution("a1", { status: "failed", durationMs: 120, error: "stalled" });
  assert.deepEqual(seen[0].body, {
    action_id: "a1",
    status: "failed",
    duration_ms: 120,
    error: "stalled",
    decision_id: null,
    action_type: null,
  });
});

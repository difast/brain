"use client";

import { useState } from "react";
import { API_BASE } from "@/lib/api";
import { useT } from "@/lib/i18n";

type LangId = "python" | "javascript" | "go" | "cpp" | "c";

const LANGS: { id: LangId; label: string }[] = [
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "go", label: "Go" },
  { id: "cpp", label: "C++" },
  { id: "c", label: "C" },
];

const REPO = "https://github.com/difast/brain";

const INSTALL: Record<LangId, string> = {
  python: `pip install "mevratek-sdk @ git+${REPO}#subdirectory=sdk/python"`,
  javascript: `npm install "https://gitpkg.now.sh/difast/brain/sdk/javascript"`,
  go: `go get github.com/difast/brain/sdk/go/mevratek`,
  cpp: `# CMake — the C SDK is pulled in automatically
add_subdirectory(sdk/cpp)
target_link_libraries(my_robot PRIVATE mevratek::cpp)`,
  c: `cmake -S sdk/c -B build && cmake --build build
cmake --install build --prefix /usr/local   # libmevratek.a + mevratek.h`,
};

const PY = `from mevratek import BrainClient

# 1. Register once (save bot.token to reuse next time)
bot = BrainClient.register(
    "${API_BASE}",
    api_key="cbk_...",          # organization key, from /api
    name="rover-01",
    robot_type="rover",
    capabilities=[
        {"type": "move_forward", "value": {"type": "number", "min": 0, "max": 1}},
        {"type": "turn_left", "value": {"type": "number", "min": 0, "max": 180}},
        {"type": "stop"},
    ],
)
print("token:", bot.token)

# 2. Liveness + telemetry
bot.heartbeat()
bot.send_telemetry(battery=82, speed=0.0, x=0, y=0)

# 3. Ask the brain what to do
decision = bot.decide(
    task="find and approach the bottle",
    state={"battery": 82, "obstacle_distance_m": 1.4},
)
for action in decision["actions"]:
    print("execute", action["type"], action["value"])

# Reuse an existing token later:
# bot = BrainClient("${API_BASE}", token="eyJ...")`;

const JS = `import { BrainClient } from "@mevratek/sdk";

// 1. Register once (save bot.token to reuse next time)
const bot = await BrainClient.register("${API_BASE}", {
  apiKey: "cbk_...",        // organization key, from /api
  name: "rover-01",
  robotType: "rover",
  capabilities: [
    { type: "move_forward", value: { type: "number", min: 0, max: 1 } },
    { type: "turn_left", value: { type: "number", min: 0, max: 180 } },
    { type: "stop" },
  ],
});
console.log("token:", bot.token);

// 2. Liveness + telemetry
await bot.heartbeat();
await bot.sendTelemetry({ battery: 82, speed: 0, x: 0, y: 0 });

// 3. Ask the brain what to do
const decision = await bot.decide({
  task: "find and approach the bottle",
  state: { battery: 82, obstacle_distance_m: 1.4 },
});
for (const action of decision.actions) {
  console.log("execute", action.type, action.value);
}

// Reuse an existing token later:
// const bot = new BrainClient("${API_BASE}", "eyJ...");`;

const GO = `package main

import (
	"context"
	"log"

	"github.com/difast/brain/sdk/go/mevratek"
)

func main() {
	ctx := context.Background()

	// 1. Register once (save bot.Token to reuse next time)
	bot, err := mevratek.Register(ctx, "${API_BASE}", mevratek.RegisterRequest{
		APIKey:    "cbk_...", // organization key, from /api
		Name:      "rover-01",
		RobotType: "rover",
		Capabilities: []mevratek.Capability{
			{Type: "move_forward", Value: map[string]any{"type": "number", "min": 0, "max": 1}},
			{Type: "stop"},
		},
	})
	if err != nil {
		log.Fatal(err)
	}
	log.Println("token:", bot.Token)

	// 2. Liveness + telemetry
	bot.Heartbeat(ctx, "")
	bot.SendTelemetry(ctx, mevratek.Telemetry{Battery: mevratek.Float(82)})

	// 3. Ask the brain what to do
	decision, err := bot.Decide(ctx, mevratek.DecideRequest{
		Task:  "find and approach the bottle",
		State: map[string]any{"battery": 82},
	})
	if err != nil {
		log.Fatal(err)
	}
	for _, action := range decision.Actions {
		log.Println("execute", action.Type, action.Value)
	}
}

// Reuse an existing token later:
// bot := mevratek.New("${API_BASE}", "eyJ...")`;

const CPP = `#include <mevratek/client.hpp>
#include <iostream>

int main() {
  mevratek::Runtime runtime;  // libcurl global init/cleanup

  // 1. Register once (save bot.token() to reuse next time)
  auto bot = mevratek::Client::registerDevice("${API_BASE}", {
      "cbk_...",   // organization key, from /api
      "rover-01",
      "rover",
      {
          {"move_forward", R"({"type":"number","min":0,"max":1})"},
          {"stop", ""},
      },
      "",
  });
  std::cout << "token: " << bot.token() << "\\n";

  // 2. Liveness + telemetry
  bot.heartbeat();
  mevratek::Telemetry telemetry;
  telemetry.battery = 82;
  bot.sendTelemetry(telemetry);

  // 3. Ask the brain what to do
  mevratek::DecideRequest request;
  request.task = "find and approach the bottle";
  request.stateJson = R"({"battery":82})";

  const auto decision = bot.decide(request);
  for (const auto& action : decision.at("actions").items()) {
    std::cout << "execute " << action.stringOr("type") << "\\n";
  }
}

// Reuse an existing token later:
// mevratek::Client bot("${API_BASE}", "eyJ...");`;

const C = `#include <mevratek.h>
#include <stdio.h>

int main(void) {
  mv_error err = {0};

  /* 1. Register once (save mv_client_token(bot) to reuse next time) */
  mv_client *bot = mv_register(
      "${API_BASE}", "cbk_...", "rover-01", "rover",
      "[{\\"type\\":\\"move_forward\\"},{\\"type\\":\\"stop\\"}]", NULL, &err);
  if (!bot) {
    fprintf(stderr, "register failed: %s\\n", err.message);
    mv_error_reset(&err);
    return 1;
  }
  printf("token: %s\\n", mv_client_token(bot));

  /* 2. Liveness + telemetry */
  mv_heartbeat(bot, NULL, &err);

  mv_telemetry telemetry = mv_telemetry_init();
  telemetry.has_battery = 1;
  telemetry.battery = 82;
  mv_send_telemetry(bot, &telemetry, &err);

  /* 3. Ask the brain what to do */
  mv_decide_request request = mv_decide_request_init();
  request.task = "find and approach the bottle";
  request.state_json = "{\\"battery\\":82}";

  char *decision = mv_decide(bot, &request, &err);
  char *actions = mv_json_raw(decision, "actions");
  for (int i = 0; i < mv_json_array_length(actions); i++) {
    char *action = mv_json_array_at(actions, i);
    char *type = mv_json_string(action, "type");
    printf("execute %s\\n", type);
    mv_free(type);
    mv_free(action);
  }

  mv_free(actions);
  mv_free(decision);
  mv_client_free(bot);
  return 0;
}

/* Reuse an existing token later:
   mv_client *bot = mv_client_new("${API_BASE}", "eyJ..."); */`;

const SNIPPETS: Record<LangId, string> = {
  python: PY,
  javascript: JS,
  go: GO,
  cpp: CPP,
  c: C,
};

const TASK_ENGINE: Record<LangId, string> = {
  python: `task = bot.next_task()                 # pull next queued task (or None)
if task:
    decision = bot.decide(task=task["description"], task_id=task["id"])
    # ... execute actions ...
    bot.report_task_result(task["id"], status="completed", result="done")`,
  javascript: `const task = await bot.nextTask();      // null when the queue is empty
if (task) {
  const decision = await bot.decide({ task: task.description, taskId: task.id });
  // ... execute actions ...
  await bot.reportTaskResult(task.id, { status: "completed", result: "done" });
}`,
  go: `task, err := bot.NextTask(ctx)          // (nil, nil) when the queue is empty
if err == nil && task != nil {
	decision, _ := bot.Decide(ctx, mevratek.DecideRequest{
		Task: task.Description, TaskID: task.ID,
	})
	_ = decision // ... execute actions ...
	bot.ReportTaskResult(ctx, task.ID, "completed", "done")
}`,
  cpp: `if (auto task = bot.nextTask()) {       // nullopt when the queue is empty
  const auto id = task->stringOr("id");
  // ... execute actions ...
  bot.reportTaskResult(id, "completed", "done");
}`,
  c: `char *task = NULL;                     /* NULL when the queue is empty */
if (mv_next_task(bot, &task, &err) == 0 && task) {
  char *id = mv_json_string(task, "id");
  /* ... execute actions ... */
  mv_report_task_result(bot, id, "completed", "done", &err);
  mv_free(id);
  mv_free(task);
}`,
};

/** The same surface in each language's own spelling. */
const METHODS: Record<LangId, string[]> = {
  python: [
    "BrainClient.register(url, name, robot_type, capabilities, meta)",
    "BrainClient(url, token=...)",
    ".heartbeat(status)",
    ".decide(task, state, image_bytes/image_b64, frame_url, task_id)",
    ".send_telemetry(battery, speed, x, y, z, errors, extra)",
    ".next_task()",
    ".report_task_result(task_id, status, result)",
    ".profile(robot_id)",
    ".report_execution(action_id, status, duration_ms, error)",
  ],
  javascript: [
    "BrainClient.register(url, { name, robotType, capabilities, meta })",
    "new BrainClient(url, token)",
    ".heartbeat(status)",
    ".decide({ task, state, imageBytes/imageB64, frameUrl, taskId })",
    ".sendTelemetry({ battery, speed, x, y, z, errors, extra })",
    ".nextTask()",
    ".reportTaskResult(taskId, { status, result })",
    ".profile(robotId)",
    ".reportExecution(actionId, { status, durationMs, error })",
  ],
  go: [
    "mevratek.Register(ctx, url, RegisterRequest)",
    "mevratek.New(url, token)",
    "(*Client).Heartbeat(ctx, status)",
    "(*Client).Decide(ctx, DecideRequest)",
    "(*Client).SendTelemetry(ctx, Telemetry)",
    "(*Client).NextTask(ctx)",
    "(*Client).ReportTaskResult(ctx, taskID, status, result)",
    "(*Client).Profile(ctx, robotID)",
    "(*Client).ReportExecution(ctx, Execution)",
  ],
  cpp: [
    "Client::registerDevice(url, RegisterRequest)",
    "Client(url, token)",
    ".heartbeat(status)",
    ".decide(DecideRequest)",
    ".sendTelemetry(Telemetry)",
    ".nextTask()",
    ".reportTaskResult(taskId, status, result)",
    ".profile(robotId)",
    ".reportExecution(Execution)",
  ],
  c: [
    "mv_register(url, name, type, capabilities_json, meta_json, &err)",
    "mv_client_new(url, token)",
    "mv_heartbeat(client, status, &err)",
    "mv_decide(client, &request, &err)",
    "mv_send_telemetry(client, &telemetry, &err)",
    "mv_next_task(client, &out_json, &err)",
    "mv_report_task_result(client, id, status, result, &err)",
    "mv_profile(client, robot_id, &err)",
    "mv_report_execution(client, &execution, &err)",
  ],
};

/** Descriptions line up with METHODS row for row. */
const METHOD_KEYS = [
  "sdk.m.register",
  "sdk.m.construct",
  "sdk.m.heartbeat",
  "sdk.m.decide",
  "sdk.m.telemetry",
  "sdk.m.nextTask",
  "sdk.m.reportTask",
  "sdk.m.profile",
  "sdk.m.reportExecution",
] as const;

const SOURCE: Record<LangId, string> = {
  python: `${REPO}/tree/main/sdk/python`,
  javascript: `${REPO}/tree/main/sdk/javascript`,
  go: `${REPO}/tree/main/sdk/go`,
  cpp: `${REPO}/tree/main/sdk/cpp`,
  c: `${REPO}/tree/main/sdk/c`,
};

export default function SdkPage() {
  const { t } = useT();
  const [lang, setLang] = useState<LangId>("python");
  const label = LANGS.find((l) => l.id === lang)?.label ?? "";

  return (
    <main className="container">
      <h1>SDK</h1>
      <p className="sub">{t("sdk.sub")}</p>

      {/* Language sub-tabs */}
      <div
        className="lang-switch"
        style={{ display: "inline-flex", marginBottom: 16, flexWrap: "wrap" }}
      >
        {LANGS.map((l) => (
          <button
            key={l.id}
            className={lang === l.id ? "active" : ""}
            onClick={() => setLang(l.id)}
            style={{ fontSize: 13, padding: "6px 14px" }}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>{t("sdk.install")}</h2>
        <pre className="mono">{INSTALL[lang]}</pre>
        <p className="sub" style={{ margin: "12px 0 0" }}>
          {t("sdk.keyNote")} <a href="/api">{t("nav.api")}</a>.
        </p>
        <p className="sub" style={{ margin: "6px 0 0" }}>
          {t("sdk.source")}{" "}
          <a href={SOURCE[lang]} target="_blank" rel="noreferrer">
            sdk/{lang === "javascript" ? "javascript" : lang}
          </a>
          .
        </p>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>
          {t("sdk.connect")} — {label}
        </h2>
        <pre className="mono">{SNIPPETS[lang]}</pre>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>{t("sdk.taskEngine")}</h2>
        <pre className="mono">{TASK_ENGINE[lang]}</pre>
      </div>

      <div className="panel">
        <h2>
          {t("sdk.methods")} — {label}
        </h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("sdk.colMethod")}</th>
                <th>{t("sdk.colDesc")}</th>
              </tr>
            </thead>
            <tbody>
              {METHODS[lang].map((signature, i) => (
                <tr key={signature}>
                  <td className="mono">{signature}</td>
                  <td>{t(METHOD_KEYS[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="sub" style={{ marginTop: 16 }}>
        {t("sdk.ref.a")} <a href="/docs">{t("nav.docs")}</a> {t("sdk.ref.b")}{" "}
        <a href={API_BASE.replace(/\/api\/v1$/, "/docs")}>OpenAPI / Swagger</a>
        {t("sdk.ref.c")}
      </p>
    </main>
  );
}

"use client";

import { useState } from "react";
import { API_BASE } from "@/lib/api";
import { useT } from "@/lib/i18n";

type LangId = "python" | "cpp" | "c" | "go" | "javascript";

const LANGS: { id: LangId; label: string }[] = [
  { id: "python", label: "Python" },
  { id: "cpp", label: "C++" },
  { id: "c", label: "C" },
  { id: "go", label: "Go" },
  { id: "javascript", label: "JavaScript" },
];

const PY = `# pip install "mevratek-sdk @ git+https://github.com/difast/brain#subdirectory=sdk/python"
from mevratek import BrainClient

# 1. Register once (save bot.token to reuse next time)
bot = BrainClient.register(
    "${API_BASE}",
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

const JS = `// Node 18+ / browser — plain fetch, no dependencies.
const API = "${API_BASE}";

// 1. Register (save token to reuse next time)
let res = await fetch(\`\${API}/robots/register\`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "rover-01",
    robot_type: "rover",
    capabilities: [
      { type: "move_forward", value: { type: "number", min: 0, max: 1 } },
      { type: "stop" },
    ],
  }),
});
const { token, api_key, robot } = await res.json();

// 2. Report liveness
await fetch(\`\${API}/robots/heartbeat\`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: \`Bearer \${token}\` },
  body: JSON.stringify({ status: "online" }),
});

// 3. Ask the brain what to do
res = await fetch(\`\${API}/brain/decision\`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: \`Bearer \${token}\` },
  body: JSON.stringify({ task: "approach the bottle", state: { battery: 82 } }),
});
const decision = await res.json();
console.log(decision.actions);`;

const GO = `// go run main.go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

const API = "${API_BASE}"

func postJSON(url, bearer string, payload any) map[string]any {
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", url, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if bearer != "" {
		req.Header.Set("Authorization", "Bearer "+bearer)
	}
	res, _ := http.DefaultClient.Do(req)
	defer res.Body.Close()
	var out map[string]any
	json.NewDecoder(res.Body).Decode(&out)
	return out
}

func main() {
	// 1. Register
	reg := postJSON(API+"/robots/register", "", map[string]any{
		"name": "rover-01", "robot_type": "rover",
		"capabilities": []map[string]any{{"type": "move_forward"}, {"type": "stop"}},
	})
	token := reg["token"].(string)

	// 2. Ask the brain what to do
	decision := postJSON(API+"/brain/decision", token, map[string]any{
		"task": "approach the bottle", "state": map[string]any{"battery": 82},
	})
	fmt.Println(decision["actions"])
}`;

const CPP = `// g++ main.cpp -lcurl   (JSON parsing: use nlohmann/json or similar)
#include <curl/curl.h>
#include <string>

static size_t sink(char* p, size_t s, size_t n, void* out) {
  ((std::string*)out)->append(p, s * n);
  return s * n;
}

std::string postJSON(const std::string& url, const std::string& body,
                     const std::string& bearer = "") {
  CURL* c = curl_easy_init();
  std::string resp;
  curl_slist* h = nullptr;
  h = curl_slist_append(h, "Content-Type: application/json");
  if (!bearer.empty())
    h = curl_slist_append(h, ("Authorization: Bearer " + bearer).c_str());
  curl_easy_setopt(c, CURLOPT_URL, url.c_str());
  curl_easy_setopt(c, CURLOPT_HTTPHEADER, h);
  curl_easy_setopt(c, CURLOPT_POSTFIELDS, body.c_str());
  curl_easy_setopt(c, CURLOPT_WRITEFUNCTION, sink);
  curl_easy_setopt(c, CURLOPT_WRITEDATA, &resp);
  curl_easy_perform(c);
  curl_easy_cleanup(c);
  return resp;
}

int main() {
  const std::string API = "${API_BASE}";
  // 1. Register -> response JSON contains "token"; parse it out.
  std::string reg = postJSON(API + "/robots/register",
    R"({"name":"rover-01","robot_type":"rover",)"
    R"("capabilities":[{"type":"move_forward"},{"type":"stop"}]})");
  std::string token = /* parse "token" from reg */ "";

  // 2. Ask the brain what to do (send the bearer token).
  std::string decision = postJSON(API + "/brain/decision",
    R"({"task":"approach the bottle","state":{"battery":82}})", token);
  // parse decision["actions"] and execute them
}`;

const C = `/* cc main.c -lcurl   (JSON parsing: use cJSON or similar) */
#include <curl/curl.h>

int main(void) {
  const char *API = "${API_BASE}";
  CURL *c = curl_easy_init();
  struct curl_slist *h = NULL;
  h = curl_slist_append(h, "Content-Type: application/json");

  /* 1. Register — response body contains "token"; parse it (e.g. cJSON). */
  curl_easy_setopt(c, CURLOPT_URL, "${API_BASE}/robots/register");
  curl_easy_setopt(c, CURLOPT_HTTPHEADER, h);
  curl_easy_setopt(c, CURLOPT_POSTFIELDS,
      "{\\"name\\":\\"rover-01\\",\\"robot_type\\":\\"rover\\","
      "\\"capabilities\\":[{\\"type\\":\\"move_forward\\"},{\\"type\\":\\"stop\\"}]}");
  curl_easy_perform(c);

  /* 2. Ask the brain: POST /brain/decision with an extra header
        "Authorization: Bearer <token>" and body {"task":...,"state":...},
        then parse "actions" from the response and execute them. */
  curl_easy_cleanup(c);
  return 0;
}`;

const SNIPPETS: Record<LangId, string> = {
  python: PY,
  javascript: JS,
  go: GO,
  cpp: CPP,
  c: C,
};

export default function SdkPage() {
  const { t } = useT();
  const [lang, setLang] = useState<LangId>("python");

  return (
    <main className="container">
      <h1>SDK</h1>
      <p className="sub">{t("sdk.sub")}</p>

      {/* Language sub-tabs */}
      <div
        className="lang-switch"
        style={{ display: "inline-flex", marginBottom: 16 }}
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

      {lang === "python" && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h2>{t("sdk.install")}</h2>
          <pre className="mono">
{`pip install "mevratek-sdk @ git+https://github.com/difast/brain#subdirectory=sdk/python"`}
          </pre>
        </div>
      )}

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2>
          {t("sdk.connect")} — {LANGS.find((l) => l.id === lang)?.label}
        </h2>
        <pre className="mono">{SNIPPETS[lang]}</pre>
        {lang !== "python" && (
          <p className="sub" style={{ margin: "12px 0 0" }}>
            {t("sdk.note.a")}
            <span className="mono"> heartbeat → decide → execute → report</span>
            {t("sdk.note.b")} <a href="/connect">{t("nav.connect")}</a>{" "}
            {t("sdk.note.c")}{" "}
            <span className="mono">POST /robots/register</span> {t("sdk.note.d")}
          </p>
        )}
      </div>

      {lang === "python" && (
        <>
          <div className="panel" style={{ marginBottom: 16 }}>
            <h2>{t("sdk.taskEngine")}</h2>
            <pre className="mono">
{`task = bot.next_task()                 # pull next queued task (or None)
if task:
    decision = bot.decide(task=task["description"], state={...})
    # ... execute actions ...
    bot.report_task_result(task["id"], status="completed", result="done")`}
            </pre>
          </div>

          <div className="panel">
            <h2>{t("sdk.methods")}</h2>
            <table>
              <thead>
                <tr>
                  <th>{t("sdk.colMethod")}</th>
                  <th>{t("sdk.colDesc")}</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="mono">BrainClient.register(url, name, robot_type, capabilities, meta)</td><td>{t("sdk.m.register")}</td></tr>
                <tr><td className="mono">BrainClient(url, token=...)</td><td>{t("sdk.m.construct")}</td></tr>
                <tr><td className="mono">.heartbeat(status)</td><td>{t("sdk.m.heartbeat")}</td></tr>
                <tr><td className="mono">.decide(task, state, image_bytes/image_b64, frame_url, task_id)</td><td>{t("sdk.m.decide")}</td></tr>
                <tr><td className="mono">.send_telemetry(battery, speed, x, y, z, errors, extra)</td><td>{t("sdk.m.telemetry")}</td></tr>
                <tr><td className="mono">.next_task()</td><td>{t("sdk.m.nextTask")}</td></tr>
                <tr><td className="mono">.report_task_result(task_id, status, result)</td><td>{t("sdk.m.reportTask")}</td></tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="sub" style={{ marginTop: 16 }}>
        {t("sdk.ref.a")} <a href="/docs">{t("nav.docs")}</a> {t("sdk.ref.b")}{" "}
        <a href={API_BASE.replace(/\/api\/v1$/, "/docs")}>OpenAPI / Swagger</a>
        {t("sdk.ref.c")}
      </p>
    </main>
  );
}

# Mevratek SDK (C)

Official C SDK for the **Mevratek for Robots** API — for firmware and embedded
controllers that talk to the platform directly.

libcurl is the only dependency. JSON is handled by a small reader bundled with
the library, so you do not have to pull a general-purpose JSON dependency into a
constrained target.

## Build

```bash
cmake -S sdk/c -B build
cmake --build build
ctest --test-dir build --output-on-failure
```

Installs a static `libmevratek.a` and `mevratek.h`:

```bash
cmake --install build --prefix /usr/local
```

Or drop the three files straight into an existing build:
`src/mevratek.c`, `src/mv_json.c`, `include/mevratek.h` (with `src/` on the
include path).

## Quick start

```c
#include <mevratek.h>
#include <stdio.h>

int main(void) {
    mv_error err = {0};

    /* 1. Register once — persist mv_client_token() and reuse it later with
     *    mv_client_new(base_url, saved_token). */
    /* "cbk_..." is an organization API key from the dashboard: it says which
     * organization the device belongs to, and is swapped for a device token. */
    mv_client *bot = mv_register(
        "https://your-api/api/v1", "cbk_...", "rover-01", "rover",
        "[{\"type\":\"move_forward\"},{\"type\":\"stop\"}]", NULL, &err);
    if (!bot) {
        fprintf(stderr, "register failed: %s\n", err.message);
        mv_error_reset(&err);
        return 1;
    }

    /* 2. Report liveness + telemetry. */
    mv_heartbeat(bot, NULL, &err);

    mv_telemetry telemetry = mv_telemetry_init();
    telemetry.has_battery = 1; telemetry.battery = 82;
    mv_send_telemetry(bot, &telemetry, &err);

    /* 3. Ask the brain what to do. */
    mv_decide_request request = mv_decide_request_init();
    request.task = "find and approach the bottle";
    request.state_json = "{\"battery\":82}";

    char *decision = mv_decide(bot, &request, &err);
    char *actions = mv_json_raw(decision, "actions");

    for (int i = 0; i < mv_json_array_length(actions); i++) {
        char *action = mv_json_array_at(actions, i);
        char *type = mv_json_string(action, "type");
        printf("execute %s\n", type);
        mv_free(type);
        mv_free(action);
    }

    mv_free(actions);
    mv_free(decision);
    mv_client_free(bot);
    return 0;
}
```

A complete integration, including reporting execution results, is in
[`examples/rover.c`](examples/rover.c).

## Memory ownership

One rule: **every `char *` the library returns is yours — release it with
`mv_free()`.** Anything returned as `const char *` (the `mv_client_*` accessors)
belongs to the client and dies with `mv_client_free()`.

`mv_error.message` is also yours; `mv_error_reset()` frees it and zeroes the
struct, and is safe to call on an already-clean error.

The suite runs clean under AddressSanitizer, UndefinedBehaviorSanitizer and
LeakSanitizer — please keep it that way.

## Sending a camera frame

Point at the raw bytes and the SDK base64-encodes them:

```c
mv_decide_request request = mv_decide_request_init();
request.task = "avoid the obstacle";
request.image = frame_bytes;
request.image_len = frame_length;
request.image_media_type = "image/jpeg";   /* optional, this is the default */
```

## Task Engine

```c
char *task = NULL;
if (mv_next_task(bot, &task, &err) == 0 && task) {
    char *id = mv_json_string(task, "id");
    /* ... execute ... */
    mv_report_task_result(bot, id, "completed", "done", &err);
    mv_free(id);
    mv_free(task);
}
```

`mv_next_task` returns 0 with `task == NULL` when the queue is empty — that is
success, not an error.

## API reference

| Function | Description |
|---|---|
| `mv_register(url, api_key, name, type, capabilities_json, meta_json, &err)` | Register and return a client |
| `mv_client_new(url, token)` | Construct from an existing token |
| `mv_client_set_timeout(client, seconds)` | Bound each request (default 30) |
| `mv_heartbeat(client, status, &err)` | Report liveness (`NULL` means `online`) |
| `mv_decide(client, &request, &err)` | Get a decision as JSON |
| `mv_send_telemetry(client, &telemetry, &err)` | Send telemetry |
| `mv_next_task(client, &out_json, &err)` | Pull the next queued task |
| `mv_report_task_result(client, id, status, result, &err)` | Report task outcome |
| `mv_profile(client, robot_id, &err)` | Capabilities + universal actions |
| `mv_report_execution(client, &execution, &err)` | DAL feedback |

Reading responses:

| Function | Description |
|---|---|
| `mv_json_string(json, key)` | String value (unescaped), caller frees |
| `mv_json_number(json, key, &out)` | Number value |
| `mv_json_bool(json, key, &out)` | Boolean value |
| `mv_json_raw(json, key)` | Raw sub-value — descend into objects/arrays |
| `mv_json_array_length(json_array)` | Element count |
| `mv_json_array_at(json_array, index)` | Element by index, caller frees |

The reader looks up keys on the **top level** of one object, so a key nested in
a sub-object never matches by accident — use `mv_json_raw` to descend. All of
them tolerate `NULL` and malformed input, returning `NULL` / `-1` rather than
crashing.

## Threads

libcurl needs a one-time global init when several threads use it. Call
`mv_global_init()` at start-up and `mv_global_cleanup()` before exit.
Single-threaded programs can skip both. An `mv_client` is not thread-safe —
give each thread its own, or serialise access.

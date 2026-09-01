# Mevratek SDK (C++)

Official C++ SDK for the **Mevratek for Robots** API. C++17, RAII, exceptions —
a facade over the [C SDK](../c), so both share one transport and one JSON reader.

libcurl is the only external dependency.

## Build

```bash
cmake -S sdk/cpp -B build
cmake --build build
ctest --test-dir build --output-on-failure
```

The C SDK is pulled in automatically as a subdirectory — you do not have to
build it separately.

In your own CMake project:

```cmake
add_subdirectory(path/to/sdk/cpp)
target_link_libraries(my_robot PRIVATE mevratek::cpp)
```

## Quick start

```cpp
#include <mevratek/client.hpp>
#include <iostream>

int main() {
    mevratek::Runtime runtime;  // libcurl global init/cleanup

    // 1. Register once — persist bot.token() and reuse it later with
    //    mevratek::Client(baseUrl, savedToken).
    auto bot = mevratek::Client::registerDevice("https://your-api/api/v1", {
        "cbk_...",   // organization key, from the dashboard
        "rover-01",
        "rover",
        {
            {"move_forward", R"({"type":"number","min":0,"max":1})"},
            {"stop", ""},
        },
        "",
    });

    // 2. Report liveness + telemetry.
    bot.heartbeat();

    mevratek::Telemetry telemetry;
    telemetry.battery = 82;
    bot.sendTelemetry(telemetry);

    // 3. Ask the brain what to do.
    mevratek::DecideRequest request;
    request.task = "find and approach the bottle";
    request.stateJson = R"({"battery":82})";

    const auto decision = bot.decide(request);
    std::cout << decision.stringOr("goal") << "\n";

    for (const auto& action : decision.at("actions").items()) {
        std::cout << "execute " << action.stringOr("type") << "\n";
    }
}
```

A complete integration, including reporting execution results, is in
[`examples/rover.cpp`](examples/rover.cpp).

## Reading responses

Every call hands back a `mevratek::Json` — a read-only view over the response
that owns its buffer, so there is nothing to free:

```cpp
decision.string("goal");             // std::optional<std::string>
decision.number("confidence");       // std::optional<double>
decision.boolean("paused");          // std::optional<bool>
decision.stringOr("goal", "unknown") // with a fallback
decision.at("actions")               // descend into an object or array
decision.at("actions").size()        // element count
decision.at("actions")[0]            // element by index
decision.at("actions").items()       // std::vector<Json>, for range-for
```

Lookups address the **top level** of one object, so a key nested inside a
sub-object never matches by accident — descend with `at()`. Reading an absent
key returns `std::nullopt` (or an empty `Json`), never an exception.

## Errors

Anything that fails throws `mevratek::BrainError`:

```cpp
try {
    bot.heartbeat();
} catch (const mevratek::BrainError& err) {
    if (err.statusCode() == 401) {
        // token expired — re-register or refresh
    }
    std::cerr << err.detail() << "\n";
}
```

`statusCode()` is the HTTP status, or `0` when the request never reached the
server (DNS, TLS, timeout).

The one call that does *not* throw on an empty result is `nextTask()`: an empty
queue is `std::nullopt`, which is success.

## Sending a camera frame

Hand over the bytes and the SDK base64-encodes them:

```cpp
mevratek::DecideRequest request;
request.task = "avoid the obstacle";
request.image = std::vector<std::uint8_t>(frame.begin(), frame.end());
request.imageMediaType = "image/jpeg";  // optional, this is the default
```

## Task Engine

```cpp
if (auto task = bot.nextTask()) {
    const auto id = task->stringOr("id");
    // ... execute ...
    bot.reportTaskResult(id, "completed", "done");
}
```

## API reference

| Member | Description |
|---|---|
| `Client::registerDevice(url, RegisterRequest)` | Register and return a client (`apiKey` = organization key) |
| `Client(url, token)` | Construct from an existing token |
| `.setTimeout(seconds)` | Bound each request (default 30) |
| `.token()` · `.apiKey()` · `.robotId()` | Credentials from registration |
| `.heartbeat(status = "")` | Report liveness (empty means `online`) |
| `.decide(DecideRequest)` | Get a decision |
| `.sendTelemetry(Telemetry)` | Send telemetry |
| `.nextTask()` | Pull the next queued task (or `std::nullopt`) |
| `.reportTaskResult(taskId, status, result)` | Report task outcome |
| `.profile(robotId = "")` | Capabilities + universal actions |
| `.reportExecution(Execution)` | DAL feedback |

`Client` is move-only — it owns its connection state. It is not thread-safe:
give each thread its own, or serialise access. Declare one `mevratek::Runtime`
in `main()` when several threads use the SDK.

The suite runs clean under AddressSanitizer, UndefinedBehaviorSanitizer and
LeakSanitizer — please keep it that way.

// Mevratek SDK for C++ — official client for the Mevratek device-control API.
//
// A C++17 layer over the C SDK: RAII instead of manual frees, std::string and
// std::optional instead of NULL sentinels, and exceptions instead of error
// structs. Links against libmevratek and libcurl.
//
//     mevratek::Client bot = mevratek::Client::registerDevice(
//         "https://your-api/api/v1",
//         {"rover-01", "rover", {{"move_forward"}, {"stop"}}});
//     bot.heartbeat();
//     auto decision = bot.decide({.task = "approach the bottle"});

#ifndef MEVRATEK_CLIENT_HPP
#define MEVRATEK_CLIENT_HPP

#include <cstdint>
#include <optional>
#include <stdexcept>
#include <string>
#include <string_view>
#include <vector>

struct mv_client;

namespace mevratek {

/// Thrown when the API answers with a non-2xx status, or a request never lands.
/// `statusCode()` is the HTTP status, or 0 when the request never reached the
/// server (DNS, TLS, timeout).
class BrainError : public std::runtime_error {
public:
    BrainError(int statusCode, const std::string& message)
        : std::runtime_error("mevratek: [" + std::to_string(statusCode) + "] " + message),
          statusCode_(statusCode),
          detail_(message) {}

    /// The HTTP status, or 0 for a transport failure.
    int statusCode() const noexcept { return statusCode_; }
    /// The server's message, without the status prefix.
    const std::string& detail() const noexcept { return detail_; }

private:
    int statusCode_;
    std::string detail_;
};

/// A JSON document you can read but not mutate — what every call hands back.
///
/// Lookups address the *top level* of one object, so a key nested inside a
/// sub-object never matches by accident: descend with `at()` instead.
class Json {
public:
    Json() = default;
    explicit Json(std::string raw) : raw_(std::move(raw)) {}

    /// The document exactly as it arrived.
    const std::string& raw() const noexcept { return raw_; }
    bool empty() const noexcept { return raw_.empty(); }

    /// String value of `key`, unescaped. `std::nullopt` when absent or not a string.
    std::optional<std::string> string(std::string_view key) const;
    /// Number value of `key`. `std::nullopt` when absent or not a number.
    std::optional<double> number(std::string_view key) const;
    /// Boolean value of `key`. `std::nullopt` when absent or not a bool.
    std::optional<bool> boolean(std::string_view key) const;

    /// The sub-value at `key` — an object, array or scalar — as a Json.
    /// An empty Json when the key is absent.
    Json at(std::string_view key) const;

    /// Element count when this is an array; 0 otherwise.
    std::size_t size() const;
    /// Element `index` when this is an array; an empty Json when out of range.
    Json operator[](std::size_t index) const;

    /// Every element of an array, for range-for.
    std::vector<Json> items() const;

    /// Convenience readers with a fallback, for the common "I know it's there" case.
    std::string stringOr(std::string_view key, std::string fallback = {}) const;
    double numberOr(std::string_view key, double fallback = 0.0) const;

private:
    std::string raw_;
};

/// One low-level command the device knows how to execute.
struct Capability {
    std::string type;
    /// A JSON object constraining the value, e.g. R"({"type":"number","min":0,"max":1})".
    /// Empty means the command takes no argument.
    std::string valueJson;
};

/// What to send when enrolling a device.
struct RegisterRequest {
    /// An organization API key ("cbk_...") issued from the dashboard: it says
    /// which organization the new device belongs to. Registration swaps it for
    /// a device token, so the key never has to live on the device.
    std::string apiKey;
    std::string name;
    std::string robotType;
    std::vector<Capability> capabilities;
    /// A JSON object of free-form metadata. Empty means {}.
    std::string metaJson;
};

/// One telemetry reading. Unset fields are reported as null.
struct Telemetry {
    std::optional<double> battery;
    std::optional<double> speed;
    std::optional<double> x;
    std::optional<double> y;
    std::optional<double> z;
    /// A JSON array of errors. Empty means [].
    std::string errorsJson;
    /// A JSON object of extra fields. Empty means {}.
    std::string extraJson;
};

/// What to ask the brain. Only `task` is required.
struct DecideRequest {
    std::string task;
    /// A JSON object describing the device state. Empty means {}.
    std::string stateJson;
    /// A camera frame as raw bytes — base64-encoded for you.
    std::vector<std::uint8_t> image;
    /// ...or one you already encoded. Takes precedence over `image`.
    std::string imageB64;
    /// Defaults to "image/jpeg" when a frame is present.
    std::string imageMediaType;
    std::string frameUrl;
    std::string taskId;
};

/// How executing one action actually went.
struct Execution {
    std::string actionId;
    /// Empty means "success".
    std::string status;
    std::optional<int> durationMs;
    std::string error;
    std::string decisionId;
    std::string actionType;
};

/// Talks to one Mevratek deployment as one device.
///
/// Move-only: a Client owns the underlying connection state.
class Client {
public:
    /// Build a client from a token you saved earlier. `baseUrl` should include
    /// the API prefix, e.g. "https://your-api/api/v1".
    Client(const std::string& baseUrl, const std::string& token);

    /// Enroll a new device and return an authenticated client.
    /// Persist `token()`: it is how the device signs in afterwards.
    static Client registerDevice(const std::string& baseUrl, const RegisterRequest& request);

    ~Client();
    Client(Client&& other) noexcept;
    Client& operator=(Client&& other) noexcept;
    Client(const Client&) = delete;
    Client& operator=(const Client&) = delete;

    /// Bound each request. Default 30 seconds.
    void setTimeout(long seconds);

    std::string token() const;
    std::string apiKey() const;
    std::string robotId() const;

    /// Report liveness; empty means "online". A device with no recent
    /// heartbeat reads as offline.
    void heartbeat(const std::string& status = {});

    /// Record one telemetry reading.
    void sendTelemetry(const Telemetry& telemetry);

    /// Ask the brain what to do next.
    Json decide(const DecideRequest& request);

    /// Pull the next queued task. `std::nullopt` when the queue is empty —
    /// that is success, not an error.
    std::optional<Json> nextTask();

    /// Close out a task. Empty `status` means "completed".
    void reportTaskResult(const std::string& taskId,
                          const std::string& status = {},
                          const std::string& result = {});

    /// Capabilities plus the universal actions the brain may use for this
    /// device. Empty `robotId` uses the device this client registered.
    Json profile(const std::string& robotId = {});

    /// Report the outcome of one command (DAL feedback).
    void reportExecution(const Execution& execution);

private:
    explicit Client(mv_client* handle) noexcept : handle_(handle) {}

    mv_client* handle_ = nullptr;
};

/// Base64-encode a buffer. Exposed because camera frames often need it.
std::string base64Encode(const std::uint8_t* data, std::size_t length);

/// Call once at start-up when several threads use the SDK, and the cleanup
/// before exit. Single-threaded programs can skip both.
void globalInit();
void globalCleanup();

/// RAII for the pair above — declare one in main().
class Runtime {
public:
    Runtime() { globalInit(); }
    ~Runtime() { globalCleanup(); }
    Runtime(const Runtime&) = delete;
    Runtime& operator=(const Runtime&) = delete;
};

}  // namespace mevratek

#endif  // MEVRATEK_CLIENT_HPP

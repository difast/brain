// Implementation of the C++ facade over the Mevratek C SDK.
//
// Every C call that can fail goes through `check`/`take`, which turn an
// mv_error into a BrainError and make sure the C-allocated message is released
// exactly once — including on the throwing path.

#include "mevratek/client.hpp"

#include <mevratek.h>

#include <utility>

namespace mevratek {
namespace {

/// Owns an mv_error for the duration of one call and turns it into an exception.
class Guard {
public:
    Guard() = default;
    ~Guard() { mv_error_reset(&error_); }
    Guard(const Guard&) = delete;
    Guard& operator=(const Guard&) = delete;

    mv_error* get() noexcept { return &error_; }

    /// Throw if the call reported failure.
    [[noreturn]] void raise() const {
        throw BrainError(error_.status_code,
                         error_.message ? error_.message : "request failed");
    }

    void check(bool ok) const {
        if (!ok) raise();
    }

private:
    mv_error error_{0, nullptr};
};

/// Adopt a C-allocated string into a std::string, freeing the original.
std::string adopt(char* owned) {
    if (!owned) return {};
    std::string out(owned);
    mv_free(owned);
    return out;
}

/// Serialise capabilities into the JSON array the C layer expects.
std::string capabilitiesJson(const std::vector<Capability>& capabilities) {
    std::string out = "[";
    for (std::size_t i = 0; i < capabilities.size(); ++i) {
        if (i) out += ',';
        out += R"({"type":")";
        // Capability types are identifiers from the device description, so a
        // minimal escape keeps a stray quote from breaking the document.
        for (char c : capabilities[i].type) {
            if (c == '"' || c == '\\') out += '\\';
            out += c;
        }
        out += '"';
        if (!capabilities[i].valueJson.empty()) {
            out += R"(,"value":)";
            out += capabilities[i].valueJson;
        }
        out += '}';
    }
    out += ']';
    return out;
}

/// nullptr for an empty string, so the C layer applies its own default.
const char* orNull(const std::string& value) {
    return value.empty() ? nullptr : value.c_str();
}

}  // namespace

// ------------------------------------------------------------------- Json --

std::optional<std::string> Json::string(std::string_view key) const {
    const std::string owned(key);
    char* value = mv_json_string(raw_.c_str(), owned.c_str());
    if (!value) return std::nullopt;
    return adopt(value);
}

std::optional<double> Json::number(std::string_view key) const {
    const std::string owned(key);
    double out = 0;
    if (mv_json_number(raw_.c_str(), owned.c_str(), &out) != 0) return std::nullopt;
    return out;
}

std::optional<bool> Json::boolean(std::string_view key) const {
    const std::string owned(key);
    int out = 0;
    if (mv_json_bool(raw_.c_str(), owned.c_str(), &out) != 0) return std::nullopt;
    return out != 0;
}

Json Json::at(std::string_view key) const {
    const std::string owned(key);
    return Json(adopt(mv_json_raw(raw_.c_str(), owned.c_str())));
}

std::size_t Json::size() const {
    const int length = mv_json_array_length(raw_.c_str());
    return length < 0 ? 0 : static_cast<std::size_t>(length);
}

Json Json::operator[](std::size_t index) const {
    return Json(adopt(mv_json_array_at(raw_.c_str(), static_cast<int>(index))));
}

std::vector<Json> Json::items() const {
    std::vector<Json> out;
    const std::size_t count = size();
    out.reserve(count);
    for (std::size_t i = 0; i < count; ++i) out.push_back((*this)[i]);
    return out;
}

std::string Json::stringOr(std::string_view key, std::string fallback) const {
    auto value = string(key);
    return value ? *value : std::move(fallback);
}

double Json::numberOr(std::string_view key, double fallback) const {
    auto value = number(key);
    return value ? *value : fallback;
}

// ----------------------------------------------------------------- Client --

Client::Client(const std::string& baseUrl, const std::string& token)
    : handle_(mv_client_new(baseUrl.c_str(), token.empty() ? nullptr : token.c_str())) {
    if (!handle_) throw BrainError(0, "could not create the client");
}

Client Client::registerDevice(const std::string& baseUrl, const RegisterRequest& request) {
    Guard guard;
    const std::string capabilities = capabilitiesJson(request.capabilities);

    mv_client* handle = mv_register(baseUrl.c_str(),
                                    orNull(request.apiKey),
                                    request.name.c_str(),
                                    request.robotType.c_str(),
                                    capabilities.c_str(),
                                    orNull(request.metaJson),
                                    guard.get());
    if (!handle) guard.raise();
    return Client(handle);
}

Client::~Client() { mv_client_free(handle_); }

Client::Client(Client&& other) noexcept : handle_(std::exchange(other.handle_, nullptr)) {}

Client& Client::operator=(Client&& other) noexcept {
    if (this != &other) {
        mv_client_free(handle_);
        handle_ = std::exchange(other.handle_, nullptr);
    }
    return *this;
}

void Client::setTimeout(long seconds) { mv_client_set_timeout(handle_, seconds); }

std::string Client::token() const {
    const char* value = mv_client_token(handle_);
    return value ? value : std::string();
}

std::string Client::apiKey() const {
    const char* value = mv_client_api_key(handle_);
    return value ? value : std::string();
}

std::string Client::robotId() const {
    const char* value = mv_client_robot_id(handle_);
    return value ? value : std::string();
}

void Client::heartbeat(const std::string& status) {
    Guard guard;
    guard.check(mv_heartbeat(handle_, orNull(status), guard.get()) == 0);
}

void Client::sendTelemetry(const Telemetry& telemetry) {
    mv_telemetry raw = mv_telemetry_init();
    if (telemetry.battery) { raw.has_battery = 1; raw.battery = *telemetry.battery; }
    if (telemetry.speed)   { raw.has_speed = 1;   raw.speed = *telemetry.speed; }
    if (telemetry.x)       { raw.has_x = 1;       raw.x = *telemetry.x; }
    if (telemetry.y)       { raw.has_y = 1;       raw.y = *telemetry.y; }
    if (telemetry.z)       { raw.has_z = 1;       raw.z = *telemetry.z; }
    raw.errors_json = orNull(telemetry.errorsJson);
    raw.extra_json = orNull(telemetry.extraJson);

    Guard guard;
    guard.check(mv_send_telemetry(handle_, &raw, guard.get()) == 0);
}

Json Client::decide(const DecideRequest& request) {
    mv_decide_request raw = mv_decide_request_init();
    raw.task = request.task.c_str();
    raw.state_json = orNull(request.stateJson);
    if (!request.image.empty()) {
        raw.image = request.image.data();
        raw.image_len = request.image.size();
    }
    raw.image_b64 = orNull(request.imageB64);
    raw.image_media_type = orNull(request.imageMediaType);
    raw.frame_url = orNull(request.frameUrl);
    raw.task_id = orNull(request.taskId);

    Guard guard;
    char* response = mv_decide(handle_, &raw, guard.get());
    if (!response) guard.raise();
    return Json(adopt(response));
}

std::optional<Json> Client::nextTask() {
    Guard guard;
    char* response = nullptr;
    guard.check(mv_next_task(handle_, &response, guard.get()) == 0);
    if (!response) return std::nullopt;
    return Json(adopt(response));
}

void Client::reportTaskResult(const std::string& taskId,
                              const std::string& status,
                              const std::string& result) {
    Guard guard;
    guard.check(mv_report_task_result(handle_, taskId.c_str(), orNull(status),
                                      orNull(result), guard.get()) == 0);
}

Json Client::profile(const std::string& robotId) {
    Guard guard;
    char* response = mv_profile(handle_, orNull(robotId), guard.get());
    if (!response) guard.raise();
    return Json(adopt(response));
}

void Client::reportExecution(const Execution& execution) {
    mv_execution raw = mv_execution_init();
    raw.action_id = execution.actionId.c_str();
    raw.status = orNull(execution.status);
    if (execution.durationMs) {
        raw.has_duration_ms = 1;
        raw.duration_ms = *execution.durationMs;
    }
    raw.error = orNull(execution.error);
    raw.decision_id = orNull(execution.decisionId);
    raw.action_type = orNull(execution.actionType);

    Guard guard;
    guard.check(mv_report_execution(handle_, &raw, guard.get()) == 0);
}

// ------------------------------------------------------------------ misc --

std::string base64Encode(const std::uint8_t* data, std::size_t length) {
    return adopt(mv_base64_encode(data, length));
}

void globalInit() { mv_global_init(); }
void globalCleanup() { mv_global_cleanup(); }

}  // namespace mevratek

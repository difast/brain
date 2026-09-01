// Tests for the Mevratek C++ SDK.
//
// Exercised against a throwaway HTTP server on a background thread, so what the
// platform would actually receive is what gets asserted.

#include "mevratek/client.hpp"

#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>

#include <atomic>
#include <cstdio>
#include <cstring>
#include <iostream>
#include <string>
#include <thread>

namespace {

int checks = 0;
int failures = 0;

void report(bool ok, const char* file, int line, const std::string& what) {
    ++checks;
    if (ok) return;
    ++failures;
    std::cerr << "FAIL " << file << ":" << line << ": " << what << "\n";
}

#define CHECK(condition, what) report((condition), __FILE__, __LINE__, (what))

#define CHECK_EQ(actual, expected)                                             \
    do {                                                                       \
        const auto a_ = (actual);                                              \
        const auto e_ = (expected);                                            \
        report(a_ == e_, __FILE__, __LINE__,                                   \
               "expected \"" + std::string(e_) + "\", got \"" +                \
                   std::string(a_) + "\"");                                    \
    } while (0)

/// A one-connection-at-a-time HTTP server that records what it was sent.
class StubServer {
public:
    StubServer() {
        listenFd_ = ::socket(AF_INET, SOCK_STREAM, 0);
        int reuse = 1;
        ::setsockopt(listenFd_, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof reuse);

        sockaddr_in addr{};
        addr.sin_family = AF_INET;
        addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
        addr.sin_port = 0;  // let the kernel pick
        ::bind(listenFd_, reinterpret_cast<sockaddr*>(&addr), sizeof addr);
        ::listen(listenFd_, 8);

        socklen_t size = sizeof addr;
        ::getsockname(listenFd_, reinterpret_cast<sockaddr*>(&addr), &size);
        port_ = ntohs(addr.sin_port);

        thread_ = std::thread([this] { serve(); });
    }

    ~StubServer() {
        stop_ = true;
        ::shutdown(listenFd_, SHUT_RDWR);
        ::close(listenFd_);
        thread_.join();
    }

    std::string baseUrl() const { return "http://127.0.0.1:" + std::to_string(port_) + "/api/v1"; }

    void replyWith(int status, std::string body) {
        status_ = status;
        body_ = std::move(body);
    }

    // What the last request carried.
    std::string method, path, auth, body;
    std::atomic<int> requests{0};

private:
    void serve() {
        while (!stop_) {
            int fd = ::accept(listenFd_, nullptr, nullptr);
            if (fd < 0) break;

            std::string raw;
            char chunk[4096];
            ssize_t got;
            while ((got = ::recv(fd, chunk, sizeof chunk, 0)) > 0) {
                raw.append(chunk, static_cast<std::size_t>(got));

                const auto headerEnd = raw.find("\r\n\r\n");
                if (headerEnd == std::string::npos) continue;

                std::size_t contentLength = 0;
                const auto cl = raw.find("Content-Length:");
                if (cl != std::string::npos) {
                    contentLength = static_cast<std::size_t>(std::stol(raw.substr(cl + 15)));
                }
                if (raw.size() >= headerEnd + 4 + contentLength) break;
            }

            parse(raw);
            ++requests;

            std::string response;
            if (status_ == 204) {
                response = "HTTP/1.1 204 No Content\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
            } else {
                response = "HTTP/1.1 " + std::to_string(status_) +
                           " X\r\nContent-Type: application/json\r\nContent-Length: " +
                           std::to_string(body_.size()) + "\r\nConnection: close\r\n\r\n" + body_;
            }
            ::send(fd, response.data(), response.size(), 0);
            ::close(fd);
        }
    }

    void parse(const std::string& raw) {
        method.clear();
        path.clear();
        auth.clear();
        body.clear();

        const auto firstSpace = raw.find(' ');
        const auto secondSpace = raw.find(' ', firstSpace + 1);
        if (firstSpace != std::string::npos && secondSpace != std::string::npos) {
            method = raw.substr(0, firstSpace);
            path = raw.substr(firstSpace + 1, secondSpace - firstSpace - 1);
        }

        const auto authAt = raw.find("Authorization:");
        if (authAt != std::string::npos) {
            const auto start = raw.find_first_not_of(' ', authAt + 14);
            const auto end = raw.find("\r\n", start);
            auth = raw.substr(start, end - start);
        }

        const auto headerEnd = raw.find("\r\n\r\n");
        if (headerEnd != std::string::npos) body = raw.substr(headerEnd + 4);
    }

    int listenFd_ = -1;
    int port_ = 0;
    int status_ = 200;
    std::string body_ = "{}";
    std::atomic<bool> stop_{false};
    std::thread thread_;
};

bool contains(const std::string& haystack, const std::string& needle) {
    return haystack.find(needle) != std::string::npos;
}

// ------------------------------------------------------------------ tests --

void testJsonReader() {
    mevratek::Json doc(R"({"name":"rover-01","battery":82.5,"paused":false,)"
                       R"("robot":{"id":"r1"},)"
                       R"("actions":[{"type":"move"},{"type":"stop"}]})");

    CHECK(doc.string("name") == std::optional<std::string>("rover-01"), "name");
    CHECK(doc.number("battery").value_or(0) > 82.4, "battery");
    CHECK(doc.boolean("paused") == std::optional<bool>(false), "paused");
    CHECK(!doc.string("absent").has_value(), "an absent key is nullopt");
    CHECK(!doc.number("name").has_value(), "a string is not a number");

    // A key that only exists in a sub-object must not match at the top level.
    CHECK(!doc.string("id").has_value(), "nested keys do not leak upward");
    CHECK_EQ(doc.at("robot").stringOr("id"), "r1");

    const auto actions = doc.at("actions");
    CHECK(actions.size() == 2, "two actions");
    CHECK_EQ(actions[0].stringOr("type"), "move");
    CHECK_EQ(actions[1].stringOr("type"), "stop");
    CHECK(actions[9].empty(), "out of range yields an empty Json");

    const auto items = actions.items();
    CHECK(items.size() == 2, "items() walks the array");

    // Fallbacks and empty documents behave.
    CHECK_EQ(doc.stringOr("absent", "fallback"), "fallback");
    CHECK(doc.numberOr("absent", 7.0) == 7.0, "numberOr fallback");
    CHECK(mevratek::Json().empty(), "a default Json is empty");
    CHECK(!mevratek::Json().string("a").has_value(), "reading an empty Json is safe");
}

void testBase64() {
    const std::uint8_t data[] = {'f', 'o', 'o'};
    CHECK_EQ(mevratek::base64Encode(data, sizeof data), "Zm9v");
    CHECK_EQ(mevratek::base64Encode(nullptr, 0), "");
}

void testRegister(StubServer& server) {
    server.replyWith(200, R"({"token":"tok-1","api_key":"key-1","robot":{"id":"r1"}})");

    auto bot = mevratek::Client::registerDevice(
        server.baseUrl(),
        {"cbk_test-key", "rover-01", "rover",
         {{"move_forward", R"({"type":"number","min":0,"max":1})"}, {"stop", ""}}, ""});

    CHECK_EQ(bot.token(), "tok-1");
    CHECK_EQ(bot.apiKey(), "key-1");
    CHECK_EQ(bot.robotId(), "r1");
    CHECK_EQ(server.path, "/api/v1/robots/register");
    CHECK(contains(server.body, R"("robot_type":"rover")"), "robot_type: " + server.body);
    CHECK(contains(server.body, R"({"type":"move_forward","value":{"type":"number","min":0,"max":1}})"),
          "capability with a value: " + server.body);
    CHECK(contains(server.body, R"({"type":"stop"})"), "capability without a value");
    CHECK_EQ(server.auth, "Bearer cbk_test-key");
}

void testHeartbeatAndAuth(StubServer& server) {
    server.replyWith(200, "{}");
    mevratek::Client bot(server.baseUrl(), "tok-2");
    bot.heartbeat();

    CHECK_EQ(server.path, "/api/v1/robots/heartbeat");
    CHECK_EQ(server.auth, "Bearer tok-2");
    CHECK(contains(server.body, R"("status":"online")"), "status defaults to online");

    bot.heartbeat("error");
    CHECK(contains(server.body, R"("status":"error")"), "an explicit status is sent");
}

void testTelemetry(StubServer& server) {
    server.replyWith(200, "{}");
    mevratek::Client bot(server.baseUrl(), "tok");

    mevratek::Telemetry telemetry;
    telemetry.battery = 82;
    telemetry.speed = 0.5;
    bot.sendTelemetry(telemetry);

    CHECK(contains(server.body, R"("battery":82)"), "battery: " + server.body);
    CHECK(contains(server.body, R"("x":null)"), "unset fields are null: " + server.body);
    CHECK(contains(server.body, R"("errors":[])"), "errors defaults to []");
}

void testDecide(StubServer& server) {
    server.replyWith(200, R"({"goal":"go","confidence":0.9,)"
                          R"("actions":[{"action_id":"a1","type":"move_forward"}]})");
    mevratek::Client bot(server.baseUrl(), "tok");

    mevratek::DecideRequest request;
    request.task = "approach the bottle";
    request.stateJson = R"({"battery":80})";
    request.image = {'f', 'o', 'o'};

    const auto decision = bot.decide(request);
    CHECK(contains(server.body, R"("image_b64":"Zm9v")"), "frame encoded: " + server.body);
    CHECK(contains(server.body, R"("image_media_type":"image/jpeg")"), "media type defaults");
    CHECK_EQ(decision.stringOr("goal"), "go");

    const auto actions = decision.at("actions");
    CHECK(actions.size() == 1, "one action");
    CHECK_EQ(actions[0].stringOr("type"), "move_forward");
}

void testDecideWithoutAFrame(StubServer& server) {
    server.replyWith(200, R"({"goal":"stop","confidence":1,"actions":[]})");
    mevratek::Client bot(server.baseUrl(), "tok");

    bot.decide({"stop", "", {}, "", "", "", ""});
    CHECK(!contains(server.body, "image_b64"), "no image field: " + server.body);
    CHECK(contains(server.body, R"("state":{})"), "state defaults to {}");
}

void testNextTask(StubServer& server) {
    mevratek::Client bot(server.baseUrl(), "tok");

    server.replyWith(204, "");
    CHECK(!bot.nextTask().has_value(), "an empty queue is nullopt, not an error");

    server.replyWith(200, R"({"id":"t1","description":"drive"})");
    const auto task = bot.nextTask();
    CHECK(task.has_value(), "a queued task comes back");
    if (task) CHECK_EQ(task->stringOr("id"), "t1");
}

void testErrorsBecomeExceptions(StubServer& server) {
    server.replyWith(401, R"({"message":"Invalid token."})");
    mevratek::Client bot(server.baseUrl(), "bad");

    bool threw = false;
    try {
        bot.heartbeat();
    } catch (const mevratek::BrainError& err) {
        threw = true;
        CHECK(err.statusCode() == 401, "status = " + std::to_string(err.statusCode()));
        CHECK_EQ(err.detail(), "Invalid token.");
        CHECK(contains(err.what(), "401"), "what() mentions the status");
    }
    CHECK(threw, "a 401 must throw");

    // A failing decide throws rather than returning an empty document.
    server.replyWith(500, R"({"message":"boom"})");
    threw = false;
    try {
        bot.decide({"anything", "", {}, "", "", "", ""});
    } catch (const mevratek::BrainError& err) {
        threw = true;
        CHECK(err.statusCode() == 500, "decide status");
    }
    CHECK(threw, "a 500 on decide must throw");
}

void testProfileNeedsAnId(StubServer& server) {
    server.replyWith(200, "{}");
    mevratek::Client bot(server.baseUrl(), "tok");
    const int before = server.requests;

    bool threw = false;
    try {
        bot.profile();
    } catch (const mevratek::BrainError&) {
        threw = true;
    }
    CHECK(threw, "no robot id must throw");
    CHECK(server.requests == before, "and must not reach the network");

    bot.profile("rid-9");
    CHECK_EQ(server.path, "/api/v1/robots/rid-9/profile");
}

void testReportExecution(StubServer& server) {
    server.replyWith(200, "{}");
    mevratek::Client bot(server.baseUrl(), "tok");

    mevratek::Execution execution;
    execution.actionId = "a1";
    execution.status = "failed";
    execution.durationMs = 120;
    execution.error = "wheel stalled";
    bot.reportExecution(execution);

    CHECK(contains(server.body, R"("action_id":"a1")"), "action id: " + server.body);
    CHECK(contains(server.body, R"("duration_ms":120)"), "duration");
    CHECK(contains(server.body, R"("decision_id":null)"), "unset fields are null");
}

void testTaskResultDefaults(StubServer& server) {
    server.replyWith(200, "{}");
    mevratek::Client bot(server.baseUrl(), "tok");

    bot.reportTaskResult("t1", "", "done");
    CHECK_EQ(server.path, "/api/v1/tasks/t1/result");
    CHECK(contains(server.body, R"("status":"completed")"), "status defaults: " + server.body);
}

void testMoveSemantics(StubServer& server) {
    server.replyWith(200, "{}");
    mevratek::Client bot(server.baseUrl(), "tok-move");

    mevratek::Client moved(std::move(bot));
    CHECK_EQ(moved.token(), "tok-move");
    moved.heartbeat();
    CHECK_EQ(server.auth, "Bearer tok-move");

    // Move-assignment must release the old handle without double-freeing.
    mevratek::Client other(server.baseUrl(), "tok-other");
    other = std::move(moved);
    CHECK_EQ(other.token(), "tok-move");
}

}  // namespace

int main() {
    mevratek::Runtime runtime;
    StubServer server;

    testJsonReader();
    testBase64();
    testRegister(server);
    testHeartbeatAndAuth(server);
    testTelemetry(server);
    testDecide(server);
    testDecideWithoutAFrame(server);
    testNextTask(server);
    testErrorsBecomeExceptions(server);
    testProfileNeedsAnId(server);
    testReportExecution(server);
    testTaskResultDefaults(server);
    testMoveSemantics(server);

    std::printf("%d checks, %d failures\n", checks, failures);
    return failures == 0 ? 0 : 1;
}

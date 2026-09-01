/*
 * Tests for the Mevratek C SDK.
 *
 * The JSON layer is exercised directly; the client is exercised against a
 * throwaway HTTP server on a background thread, so the bytes the platform would
 * receive are what gets asserted.
 */

#include "mevratek.h"

#include <arpa/inet.h>
#include <netinet/in.h>
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <unistd.h>

static int failures = 0;
static int checks = 0;

#define CHECK(condition, ...)                                                  \
    do {                                                                       \
        checks++;                                                              \
        if (!(condition)) {                                                    \
            failures++;                                                        \
            fprintf(stderr, "FAIL %s:%d: ", __FILE__, __LINE__);               \
            fprintf(stderr, __VA_ARGS__);                                      \
            fputc('\n', stderr);                                               \
        }                                                                      \
    } while (0)

#define CHECK_STR(actual, expected)                                            \
    do {                                                                       \
        const char *a_ = (actual);                                             \
        const char *e_ = (expected);                                           \
        CHECK(a_ && strcmp(a_, e_) == 0, "expected \"%s\", got \"%s\"",        \
              e_, a_ ? a_ : "(null)");                                         \
    } while (0)

/* ------------------------------------------------------------ stub server -- */

/* What the server should answer with, and what it last received. */
static struct {
    int   listen_fd;
    int   port;
    int   status;             /* status code to reply with */
    const char *reply_body;   /* body to reply with (NULL for none) */
    int   requests;           /* how many requests were served */
    char  last_method[16];
    char  last_path[256];
    char  last_auth[512];
    char  last_body[4096];
    pthread_t thread;
    int   stop;
} server;

static void reply_with(int status, const char *body)
{
    server.status = status;
    server.reply_body = body;
}

/* Serve requests until told to stop. One connection at a time is plenty. */
static void *serve(void *unused)
{
    (void)unused;
    while (!server.stop) {
        int fd = accept(server.listen_fd, NULL, NULL);
        if (fd < 0) break;

        char raw[8192];
        size_t total = 0;
        ssize_t got;

        /* Read until the headers are complete, then until the body is in. */
        while (total < sizeof raw - 1 &&
               (got = recv(fd, raw + total, sizeof raw - 1 - total, 0)) > 0) {
            total += (size_t)got;
            raw[total] = '\0';

            char *header_end = strstr(raw, "\r\n\r\n");
            if (!header_end) continue;

            size_t header_len = (size_t)(header_end - raw) + 4;
            long content_length = 0;
            const char *cl = strcasestr(raw, "Content-Length:");
            if (cl) content_length = strtol(cl + 15, NULL, 10);
            if (total >= header_len + (size_t)content_length) break;
        }
        raw[total] = '\0';

        /* Method and path from the request line. */
        server.last_method[0] = server.last_path[0] = '\0';
        sscanf(raw, "%15s %255s", server.last_method, server.last_path);

        /* Authorization header, if any. */
        server.last_auth[0] = '\0';
        const char *auth = strcasestr(raw, "\r\nAuthorization:");
        if (auth) {
            auth += strlen("\r\nAuthorization:");
            while (*auth == ' ') auth++;
            const char *end = strstr(auth, "\r\n");
            size_t length = end ? (size_t)(end - auth) : strlen(auth);
            if (length >= sizeof server.last_auth) length = sizeof server.last_auth - 1;
            memcpy(server.last_auth, auth, length);
            server.last_auth[length] = '\0';
        }

        /* Body, if any. */
        server.last_body[0] = '\0';
        char *body = strstr(raw, "\r\n\r\n");
        if (body) {
            body += 4;
            size_t length = strlen(body);
            if (length >= sizeof server.last_body) length = sizeof server.last_body - 1;
            memcpy(server.last_body, body, length);
            server.last_body[length] = '\0';
        }
        server.requests++;

        char response[8192];
        int length = 0;
        if (server.status == 204) {
            length = snprintf(response, sizeof response,
                              "HTTP/1.1 204 No Content\r\nContent-Length: 0\r\n"
                              "Connection: close\r\n\r\n");
        } else {
            const char *payload = server.reply_body ? server.reply_body : "{}";
            length = snprintf(response, sizeof response,
                              "HTTP/1.1 %d X\r\nContent-Type: application/json\r\n"
                              "Content-Length: %zu\r\nConnection: close\r\n\r\n%s",
                              server.status, strlen(payload), payload);
        }
        send(fd, response, (size_t)length, 0);
        close(fd);
    }
    return NULL;
}

static int start_server(void)
{
    memset(&server, 0, sizeof server);
    server.status = 200;

    server.listen_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server.listen_fd < 0) return -1;

    int reuse = 1;
    setsockopt(server.listen_fd, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof reuse);

    struct sockaddr_in addr;
    memset(&addr, 0, sizeof addr);
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
    addr.sin_port = 0;                      /* let the kernel pick */

    if (bind(server.listen_fd, (struct sockaddr *)&addr, sizeof addr) != 0) return -1;
    if (listen(server.listen_fd, 8) != 0) return -1;

    socklen_t size = sizeof addr;
    if (getsockname(server.listen_fd, (struct sockaddr *)&addr, &size) != 0) return -1;
    server.port = ntohs(addr.sin_port);

    return pthread_create(&server.thread, NULL, serve, NULL);
}

static void stop_server(void)
{
    server.stop = 1;
    shutdown(server.listen_fd, SHUT_RDWR);
    close(server.listen_fd);
    pthread_join(server.thread, NULL);
}

static void base_url(char *out, size_t size)
{
    snprintf(out, size, "http://127.0.0.1:%d/api/v1", server.port);
}

/* ------------------------------------------------------------ JSON tests -- */

static void test_json_reader(void)
{
    const char *doc =
        "{\"name\":\"rover-01\",\"battery\":82.5,\"paused\":false,"
        "\"robot\":{\"id\":\"r1\",\"name\":\"nested\"},"
        "\"actions\":[{\"type\":\"move\"},{\"type\":\"stop\"}],"
        "\"note\":\"line\\nbreak \\\"quoted\\\"\",\"missing\":null}";

    char *name = mv_json_string(doc, "name");
    CHECK_STR(name, "rover-01");
    mv_free(name);

    double battery = 0;
    CHECK(mv_json_number(doc, "battery", &battery) == 0, "battery should parse");
    CHECK(battery > 82.4 && battery < 82.6, "battery = %f", battery);

    int paused = 1;
    CHECK(mv_json_bool(doc, "paused", &paused) == 0, "paused should parse");
    CHECK(paused == 0, "paused = %d", paused);

    /* A key that only exists inside a nested object must not match. */
    CHECK(mv_json_string(doc, "id") == NULL, "nested keys must not match at top level");

    char *robot = mv_json_raw(doc, "robot");
    CHECK(robot != NULL, "robot should be extractable");
    if (robot) {
        char *id = mv_json_string(robot, "id");
        CHECK_STR(id, "r1");
        mv_free(id);
        /* The nested object has its own "name" — reading it must not leak upward. */
        char *nested_name = mv_json_string(robot, "name");
        CHECK_STR(nested_name, "nested");
        mv_free(nested_name);
        mv_free(robot);
    }

    char *actions = mv_json_raw(doc, "actions");
    CHECK(actions != NULL, "actions should be extractable");
    if (actions) {
        CHECK(mv_json_array_length(actions) == 2, "array length = %d",
              mv_json_array_length(actions));
        char *first = mv_json_array_at(actions, 0);
        char *second = mv_json_array_at(actions, 1);
        char *out_of_range = mv_json_array_at(actions, 2);
        CHECK(first && second, "elements should be extractable");
        if (first) {
            char *type = mv_json_string(first, "type");
            CHECK_STR(type, "move");
            mv_free(type);
        }
        if (second) {
            char *type = mv_json_string(second, "type");
            CHECK_STR(type, "stop");
            mv_free(type);
        }
        CHECK(out_of_range == NULL, "index past the end should be NULL");
        mv_free(first);
        mv_free(second);
        mv_free(out_of_range);
        mv_free(actions);
    }

    char *note = mv_json_string(doc, "note");
    CHECK_STR(note, "line\nbreak \"quoted\"");
    mv_free(note);

    /* Absent keys and wrong types report failure rather than guessing. */
    double ignored = 0;
    CHECK(mv_json_string(doc, "nope") == NULL, "absent key should be NULL");
    CHECK(mv_json_number(doc, "name", &ignored) == -1, "a string is not a number");
    CHECK(mv_json_number(doc, "missing", &ignored) == -1, "null is not a number");

    /* Malformed and empty input must not crash. */
    CHECK(mv_json_string("{\"a\":", "a") == NULL, "truncated input");
    CHECK(mv_json_string("not json", "a") == NULL, "non-object input");
    CHECK(mv_json_string(NULL, "a") == NULL, "NULL input");
    CHECK(mv_json_array_length("{}") == -1, "an object is not an array");
    CHECK(mv_json_array_length("[]") == 0, "empty array");

    /* A brace inside a string must not confuse the scanner. */
    const char *tricky = "{\"a\":\"}{[\",\"b\":7}";
    double b = 0;
    CHECK(mv_json_number(tricky, "b", &b) == 0 && b == 7, "braces inside strings");
}

static void test_base64(void)
{
    char *empty = mv_base64_encode((const unsigned char *)"", 0);
    CHECK_STR(empty, "");
    mv_free(empty);

    struct { const char *in; const char *out; } cases[] = {
        {"f", "Zg=="}, {"fo", "Zm8="}, {"foo", "Zm9v"},
        {"foob", "Zm9vYg=="}, {"fooba", "Zm9vYmE="}, {"foobar", "Zm9vYmFy"},
    };
    for (size_t i = 0; i < sizeof cases / sizeof cases[0]; i++) {
        char *encoded = mv_base64_encode((const unsigned char *)cases[i].in,
                                         strlen(cases[i].in));
        CHECK_STR(encoded, cases[i].out);
        mv_free(encoded);
    }
}

/* ---------------------------------------------------------- client tests -- */

static void test_register_and_accessors(void)
{
    char url[128];
    base_url(url, sizeof url);
    reply_with(200, "{\"token\":\"tok-1\",\"api_key\":\"key-1\","
                    "\"robot\":{\"id\":\"r1\",\"name\":\"rover-01\"}}");

    mv_error err = {0};
    mv_client *bot = mv_register(url, "cbk_test-key", "rover-01", "rover",
                                 "[{\"type\":\"stop\"}]", NULL, &err);
    CHECK(bot != NULL, "register failed: %s", err.message ? err.message : "?");
    if (!bot) { mv_error_reset(&err); return; }

    CHECK_STR(mv_client_token(bot), "tok-1");
    CHECK_STR(mv_client_api_key(bot), "key-1");
    CHECK_STR(mv_client_robot_id(bot), "r1");
    CHECK_STR(server.last_path, "/api/v1/robots/register");
    CHECK_STR(server.last_method, "POST");
    CHECK(strstr(server.last_body, "\"robot_type\":\"rover\"") != NULL,
          "body = %s", server.last_body);
    CHECK(strstr(server.last_body, "\"capabilities\":[{\"type\":\"stop\"}]") != NULL,
          "capabilities passed through: %s", server.last_body);
    CHECK(strstr(server.last_body, "\"meta\":{}") != NULL, "meta defaults to {}");
    CHECK_STR(server.last_auth, "Bearer cbk_test-key");

    mv_client_free(bot);
    mv_error_reset(&err);
}

static void test_trailing_slash_and_auth(void)
{
    char url[128];
    snprintf(url, sizeof url, "http://127.0.0.1:%d/api/v1///", server.port);
    reply_with(200, "{}");

    mv_error err = {0};
    mv_client *bot = mv_client_new(url, "tok-2");
    CHECK(mv_heartbeat(bot, NULL, &err) == 0, "heartbeat failed: %s",
          err.message ? err.message : "?");
    CHECK_STR(server.last_path, "/api/v1/robots/heartbeat");
    CHECK_STR(server.last_auth, "Bearer tok-2");
    CHECK(strstr(server.last_body, "\"status\":\"online\"") != NULL,
          "status defaults to online: %s", server.last_body);

    mv_client_free(bot);
    mv_error_reset(&err);
}

static void test_telemetry_nulls_omitted_fields(void)
{
    char url[128];
    base_url(url, sizeof url);
    reply_with(200, "{}");

    mv_error err = {0};
    mv_client *bot = mv_client_new(url, "tok");

    mv_telemetry telemetry = mv_telemetry_init();
    telemetry.has_battery = 1;
    telemetry.battery = 82;
    telemetry.has_speed = 1;
    telemetry.speed = 0.5;

    CHECK(mv_send_telemetry(bot, &telemetry, &err) == 0, "telemetry failed: %s",
          err.message ? err.message : "?");
    CHECK(strstr(server.last_body, "\"battery\":82") != NULL, "body = %s", server.last_body);
    CHECK(strstr(server.last_body, "\"x\":null") != NULL, "x should be null: %s",
          server.last_body);
    CHECK(strstr(server.last_body, "\"errors\":[]") != NULL, "errors defaults to []");
    CHECK(strstr(server.last_body, "\"extra\":{}") != NULL, "extra defaults to {}");

    mv_client_free(bot);
    mv_error_reset(&err);
}

static void test_decide_encodes_the_frame(void)
{
    char url[128];
    base_url(url, sizeof url);
    reply_with(200, "{\"goal\":\"go\",\"confidence\":0.9,"
                    "\"actions\":[{\"action_id\":\"a1\",\"type\":\"move_forward\"}]}");

    mv_error err = {0};
    mv_client *bot = mv_client_new(url, "tok");

    const unsigned char frame[] = {'f', 'o', 'o'};
    mv_decide_request request = mv_decide_request_init();
    request.task = "approach the bottle";
    request.state_json = "{\"battery\":80}";
    request.image = frame;
    request.image_len = sizeof frame;

    char *decision = mv_decide(bot, &request, &err);
    CHECK(decision != NULL, "decide failed: %s", err.message ? err.message : "?");
    CHECK(strstr(server.last_body, "\"image_b64\":\"Zm9v\"") != NULL,
          "frame should be base64: %s", server.last_body);
    CHECK(strstr(server.last_body, "\"image_media_type\":\"image/jpeg\"") != NULL,
          "media type should default");

    if (decision) {
        char *goal = mv_json_string(decision, "goal");
        CHECK_STR(goal, "go");
        mv_free(goal);

        char *actions = mv_json_raw(decision, "actions");
        CHECK(mv_json_array_length(actions) == 1, "one action expected");
        char *first = mv_json_array_at(actions, 0);
        char *type = mv_json_string(first, "type");
        CHECK_STR(type, "move_forward");
        mv_free(type);
        mv_free(first);
        mv_free(actions);
        mv_free(decision);
    }

    mv_client_free(bot);
    mv_error_reset(&err);
}

static void test_decide_without_a_frame_omits_image_fields(void)
{
    char url[128];
    base_url(url, sizeof url);
    reply_with(200, "{\"goal\":\"stop\",\"confidence\":1,\"actions\":[]}");

    mv_error err = {0};
    mv_client *bot = mv_client_new(url, "tok");

    mv_decide_request request = mv_decide_request_init();
    request.task = "stop";

    char *decision = mv_decide(bot, &request, &err);
    CHECK(decision != NULL, "decide failed");
    CHECK(strstr(server.last_body, "image_b64") == NULL, "no image field expected");
    CHECK(strstr(server.last_body, "frame_url") == NULL, "no frame_url expected");
    CHECK(strstr(server.last_body, "\"state\":{}") != NULL, "state defaults to {}");

    mv_free(decision);
    mv_client_free(bot);
    mv_error_reset(&err);
}

static void test_next_task_empty_and_present(void)
{
    char url[128];
    base_url(url, sizeof url);

    mv_error err = {0};
    mv_client *bot = mv_client_new(url, "tok");

    reply_with(204, NULL);
    char *task = (char *)0x1;   /* poisoned: the call must overwrite it */
    CHECK(mv_next_task(bot, &task, &err) == 0, "204 is not an error");
    CHECK(task == NULL, "an empty queue yields NULL");

    reply_with(200, "{\"id\":\"t1\",\"description\":\"drive\",\"status\":\"queued\"}");
    CHECK(mv_next_task(bot, &task, &err) == 0, "next task failed");
    CHECK(task != NULL, "a queued task should come back");
    if (task) {
        char *id = mv_json_string(task, "id");
        CHECK_STR(id, "t1");
        mv_free(id);
        mv_free(task);
    }

    mv_client_free(bot);
    mv_error_reset(&err);
}

static void test_error_carries_status_and_message(void)
{
    char url[128];
    base_url(url, sizeof url);
    reply_with(401, "{\"message\":\"Invalid token.\"}");

    mv_error err = {0};
    mv_client *bot = mv_client_new(url, "bad");

    CHECK(mv_heartbeat(bot, NULL, &err) == -1, "a 401 should fail");
    CHECK(err.status_code == 401, "status = %d", err.status_code);
    CHECK_STR(err.message, "Invalid token.");

    mv_error_reset(&err);
    CHECK(err.message == NULL && err.status_code == 0, "reset should clear the error");

    mv_client_free(bot);
}

static void test_profile_needs_an_id(void)
{
    char url[128];
    base_url(url, sizeof url);
    reply_with(200, "{}");
    int before = server.requests;

    mv_error err = {0};
    mv_client *bot = mv_client_new(url, "tok");

    CHECK(mv_profile(bot, NULL, &err) == NULL, "no id should fail locally");
    CHECK(server.requests == before, "should not have reached the network");
    mv_error_reset(&err);

    char *profile = mv_profile(bot, "rid-9", &err);
    CHECK(profile != NULL, "explicit id should work");
    CHECK_STR(server.last_path, "/api/v1/robots/rid-9/profile");
    mv_free(profile);

    mv_client_free(bot);
    mv_error_reset(&err);
}

static void test_report_execution_shape(void)
{
    char url[128];
    base_url(url, sizeof url);
    reply_with(200, "{}");

    mv_error err = {0};
    mv_client *bot = mv_client_new(url, "tok");

    mv_execution execution = mv_execution_init();
    execution.action_id = "a1";
    execution.status = "failed";
    execution.has_duration_ms = 1;
    execution.duration_ms = 120;
    execution.error = "wheel \"stalled\"";

    CHECK(mv_report_execution(bot, &execution, &err) == 0, "report failed: %s",
          err.message ? err.message : "?");
    CHECK(strstr(server.last_body, "\"action_id\":\"a1\"") != NULL, "body = %s",
          server.last_body);
    CHECK(strstr(server.last_body, "\"duration_ms\":120") != NULL, "duration passed");
    CHECK(strstr(server.last_body, "\"decision_id\":null") != NULL, "unset fields are null");
    CHECK(strstr(server.last_body, "wheel \\\"stalled\\\"") != NULL,
          "quotes must be escaped: %s", server.last_body);

    mv_client_free(bot);
    mv_error_reset(&err);
}

static void test_report_task_result_defaults(void)
{
    char url[128];
    base_url(url, sizeof url);
    reply_with(200, "{}");

    mv_error err = {0};
    mv_client *bot = mv_client_new(url, "tok");

    CHECK(mv_report_task_result(bot, "t1", NULL, "done", &err) == 0, "report failed");
    CHECK_STR(server.last_path, "/api/v1/tasks/t1/result");
    CHECK(strstr(server.last_body, "\"status\":\"completed\"") != NULL,
          "status should default to completed: %s", server.last_body);

    CHECK(mv_report_task_result(bot, "t2", "failed", NULL, &err) == 0, "report failed");
    CHECK(strstr(server.last_body, "\"result\":null") != NULL, "absent result is null");

    mv_client_free(bot);
    mv_error_reset(&err);
}

static void test_null_inputs_do_not_crash(void)
{
    mv_error err = {0};
    CHECK(mv_client_new(NULL, NULL) == NULL, "NULL base url");
    CHECK(mv_heartbeat(NULL, NULL, &err) == -1, "NULL client");
    mv_error_reset(&err);
    CHECK(mv_client_token(NULL) == NULL, "NULL client accessor");
    mv_client_free(NULL);
    mv_free(NULL);
    mv_error_reset(NULL);
}

int main(void)
{
    mv_global_init();

    if (start_server() != 0) {
        fprintf(stderr, "could not start the stub server\n");
        return 1;
    }

    test_json_reader();
    test_base64();
    test_register_and_accessors();
    test_trailing_slash_and_auth();
    test_telemetry_nulls_omitted_fields();
    test_decide_encodes_the_frame();
    test_decide_without_a_frame_omits_image_fields();
    test_next_task_empty_and_present();
    test_error_carries_status_and_message();
    test_profile_needs_an_id();
    test_report_execution_shape();
    test_report_task_result_defaults();
    test_null_inputs_do_not_crash();

    stop_server();
    mv_global_cleanup();

    printf("%d checks, %d failures\n", checks, failures);
    return failures == 0 ? 0 : 1;
}

/*
 * A complete device integration in one file.
 *
 *     cmake -S . -B build -DMEVRATEK_BUILD_EXAMPLES=ON && cmake --build build
 *     ./build/rover https://your-api/api/v1
 */

#include "mevratek.h"

#include <stdio.h>
#include <stdlib.h>

/* Pretend to drive the robot. A real integration talks to the motor controller. */
static void execute(const char *type, const char *raw_action)
{
    printf("  execute %s  (%s)\n", type ? type : "?", raw_action);
}

int main(int argc, char **argv)
{
    const char *base_url = (argc > 1) ? argv[1] : "http://127.0.0.1:8000/api/v1";
    /* An organization API key from the dashboard — it says which organization
     * the new device belongs to. Registration swaps it for a device token. */
    const char *api_key = (argc > 2) ? argv[2] : getenv("MEVRATEK_API_KEY");
    mv_error err = {0};

    if (!api_key) {
        fprintf(stderr, "usage: rover <base-url> <api-key>"
                        "   (or set MEVRATEK_API_KEY)\n");
        return 2;
    }

    mv_global_init();

    /* 1. Register once. In production, save the token and reuse it with
     *    mv_client_new(base_url, saved_token) instead of registering again. */
    mv_client *bot = mv_register(
        base_url, api_key, "rover-01", "rover",
        "[{\"type\":\"move_forward\",\"value\":{\"type\":\"number\",\"min\":0,\"max\":1}},"
        " {\"type\":\"turn_left\",\"value\":{\"type\":\"number\",\"min\":0,\"max\":180}},"
        " {\"type\":\"stop\"}]",
        NULL, &err);

    if (!bot) {
        fprintf(stderr, "register failed: %s\n", err.message);
        mv_error_reset(&err);
        mv_global_cleanup();
        return 1;
    }
    printf("token: %s\n", mv_client_token(bot));
    printf("robot: %s\n", mv_client_robot_id(bot));

    /* 2. Report liveness and telemetry. */
    if (mv_heartbeat(bot, NULL, &err) != 0) {
        fprintf(stderr, "heartbeat failed: %s\n", err.message);
        mv_error_reset(&err);
    }

    mv_telemetry telemetry = mv_telemetry_init();
    telemetry.has_battery = 1; telemetry.battery = 82;
    telemetry.has_speed = 1;   telemetry.speed = 0;
    if (mv_send_telemetry(bot, &telemetry, &err) != 0) {
        fprintf(stderr, "telemetry failed: %s\n", err.message);
        mv_error_reset(&err);
    }

    /* 3. Ask the brain what to do and walk the actions it returns. */
    mv_decide_request request = mv_decide_request_init();
    request.task = "find and approach the bottle";
    request.state_json = "{\"battery\":82,\"obstacle_distance_m\":1.4}";

    char *decision = mv_decide(bot, &request, &err);
    if (!decision) {
        fprintf(stderr, "decide failed: %s\n", err.message);
        mv_error_reset(&err);
        mv_client_free(bot);
        mv_global_cleanup();
        return 1;
    }

    char *goal = mv_json_string(decision, "goal");
    double confidence = 0;
    mv_json_number(decision, "confidence", &confidence);
    printf("goal: %s (confidence %.2f)\n", goal ? goal : "?", confidence);
    mv_free(goal);

    char *actions = mv_json_raw(decision, "actions");
    int count = mv_json_array_length(actions);
    for (int i = 0; i < count; i++) {
        char *action = mv_json_array_at(actions, i);
        char *type = mv_json_string(action, "type");
        char *action_id = mv_json_string(action, "action_id");

        execute(type, action);

        /* 4. Tell the platform how it went — this feeds the memory layer. */
        mv_execution execution = mv_execution_init();
        execution.action_id = action_id;
        execution.status = "success";
        execution.has_duration_ms = 1;
        execution.duration_ms = 250;
        execution.action_type = type;
        if (action_id && mv_report_execution(bot, &execution, &err) != 0) {
            fprintf(stderr, "  report failed: %s\n", err.message);
            mv_error_reset(&err);
        }

        mv_free(type);
        mv_free(action_id);
        mv_free(action);
    }

    mv_free(actions);
    mv_free(decision);
    mv_client_free(bot);
    mv_global_cleanup();
    return 0;
}

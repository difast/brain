// A complete device integration in one file.
//
//     cmake -S . -B build -DMEVRATEK_CPP_BUILD_EXAMPLES=ON && cmake --build build
//     ./build/rover_cpp https://your-api/api/v1

#include "mevratek/client.hpp"

#include <cstdlib>
#include <iostream>

int main(int argc, char** argv) {
    const std::string baseUrl = (argc > 1) ? argv[1] : "http://127.0.0.1:8000/api/v1";
    // An organization API key from the dashboard — it says which organization
    // the new device belongs to. Registration swaps it for a device token.
    const char* fromEnv = std::getenv("MEVRATEK_API_KEY");
    const std::string apiKey = (argc > 2) ? argv[2] : (fromEnv ? fromEnv : "");
    if (apiKey.empty()) {
        std::cerr << "usage: rover_cpp <base-url> <api-key>"
                     "   (or set MEVRATEK_API_KEY)\n";
        return 2;
    }

    mevratek::Runtime runtime;  // libcurl global init/cleanup

    try {
        // 1. Register once. In production, save the token and reuse it with
        //    mevratek::Client(baseUrl, savedToken) instead of registering again.
        auto bot = mevratek::Client::registerDevice(baseUrl, {
            apiKey,
            "rover-01",
            "rover",
            {
                {"move_forward", R"({"type":"number","min":0,"max":1})"},
                {"turn_left", R"({"type":"number","min":0,"max":180})"},
                {"stop", ""},
            },
            "",
        });
        std::cout << "token: " << bot.token() << "\n"
                  << "robot: " << bot.robotId() << "\n";

        // 2. Report liveness and telemetry.
        bot.heartbeat();

        mevratek::Telemetry telemetry;
        telemetry.battery = 82;
        telemetry.speed = 0;
        bot.sendTelemetry(telemetry);

        // 3. Ask the brain what to do and walk the actions it returns.
        mevratek::DecideRequest request;
        request.task = "find and approach the bottle";
        request.stateJson = R"({"battery":82,"obstacle_distance_m":1.4})";

        const auto decision = bot.decide(request);
        std::cout << "goal: " << decision.stringOr("goal", "?")
                  << " (confidence " << decision.numberOr("confidence") << ")\n";

        for (const auto& action : decision.at("actions").items()) {
            const auto type = action.stringOr("type", "?");
            std::cout << "  execute " << type << "\n";

            // 4. Tell the platform how it went — this feeds the memory layer.
            mevratek::Execution execution;
            execution.actionId = action.stringOr("action_id");
            execution.status = "success";
            execution.durationMs = 250;
            execution.actionType = type;
            if (!execution.actionId.empty()) bot.reportExecution(execution);
        }
    } catch (const mevratek::BrainError& err) {
        std::cerr << "failed (status " << err.statusCode() << "): " << err.detail() << "\n";
        return 1;
    }

    return 0;
}

"""Cloud Brain for Robots — Python SDK.

Example
-------
    from cloudbrain import BrainClient

    bot = BrainClient.register(
        "https://your-api/api/v1",
        name="rover-01",
        robot_type="rover",
        capabilities=[{"type": "move_forward"}, {"type": "stop"}],
    )
    bot.heartbeat()
    decision = bot.decide(task="approach the bottle", state={"battery": 80})
    for action in decision["actions"]:
        ...  # execute on the robot
"""

from cloudbrain.client import BrainClient, BrainError

__all__ = ["BrainClient", "BrainError"]
__version__ = "0.1.0"

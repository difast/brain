"""The tools an MCP client may call, and what each one actually does.

Every handler goes through the same services the dashboard uses, and passes
the caller's ``organization_id`` into each of them. That is deliberate: the
isolation guarantee lives in one place rather than being re-implemented here,
so a tool cannot accidentally become the one query that forgot to filter by
tenant. Telemetry and decision rows carry no ``organization_id`` of their own
— they are reachable only through a robot — which is exactly why they are
fetched through services that join on it rather than by direct query.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BrainError
from app.core.logging import get_logger
from app.models.robot import RobotStatus
from app.schemas.robot import HeartbeatRequest, RobotRegisterRequest
from app.schemas.task import TaskCreate
from app.services.memory_service import MemoryService
from app.services.registry_service import RegistryService
from app.services.task_service import TaskService
from app.services.telemetry_service import TelemetryService

logger = get_logger("mcp.tools")

MAX_LIMIT = 100


@dataclass(frozen=True)
class McpContext:
    """Who is calling. Resolved from the access token, never from arguments."""

    user_id: str
    organization_id: str
    role: str
    session_id: str


class ToolError(Exception):
    """A failure the model should see and can act on."""


def _iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    return (value if value.tzinfo else value.replace(tzinfo=UTC)).isoformat()


def _clamp(value: Any, default: int, maximum: int = MAX_LIMIT) -> int:
    try:
        n = int(value)
    except (TypeError, ValueError):
        return default
    return max(1, min(n, maximum))


# --- handlers --------------------------------------------------------------


async def get_devices(
    session: AsyncSession, ctx: McpContext, args: dict
) -> dict[str, Any]:
    robots, total = await RegistryService(session).list_with_presence(
        organization_id=ctx.organization_id,
        limit=_clamp(args.get("limit"), 50),
    )
    return {
        "total": total,
        "devices": [
            {
                "id": r.id,
                "name": r.name,
                "type": r.robot_type,
                "status": str(r.status),
                "paused": r.paused,
                "last_seen": _iso(r.last_seen_at),
            }
            for r in robots
        ],
    }


async def send_task(
    session: AsyncSession, ctx: McpContext, args: dict
) -> dict[str, Any]:
    device_id = args.get("device_id")
    description = (args.get("task_description") or "").strip()
    if not device_id:
        raise ToolError("device_id is required.")
    if not description:
        raise ToolError("task_description must not be empty.")

    priority = args.get("priority")
    priority = 0 if priority is None else max(0, min(int(priority), 100))

    # TaskService.create refuses a robot belonging to another organization,
    # so a guessed device_id cannot reach across tenants.
    try:
        task = await TaskService(session).create(
            TaskCreate(
                robot_id=str(device_id), description=description, priority=priority
            ),
            organization_id=ctx.organization_id,
        )
    except BrainError as exc:
        raise ToolError(f"No such device in your organization: {device_id}") from exc
    logger.info(
        "mcp_task_created",
        task_id=task.id,
        robot_id=task.robot_id,
        organization_id=ctx.organization_id,
    )
    return {
        "task_id": task.id,
        "device_id": task.robot_id,
        "status": str(task.status),
        "priority": task.priority,
        "created_at": _iso(task.created_at),
    }


async def get_telemetry(
    session: AsyncSession, ctx: McpContext, args: dict
) -> dict[str, Any]:
    device_id = args.get("device_id")
    if not device_id:
        raise ToolError("device_id is required.")
    rows, total = await TelemetryService(session).list(
        organization_id=ctx.organization_id,
        robot_id=str(device_id),
        limit=_clamp(args.get("limit"), 10),
    )
    return {
        "device_id": device_id,
        "total": total,
        "readings": [
            {
                "recorded_at": _iso(t.created_at),
                "battery": t.battery,
                "speed": t.speed,
                "position": {"x": t.x, "y": t.y, "z": t.z},
                "errors": t.errors,
                "extra": t.extra,
            }
            for t in rows
        ],
    }


async def get_decision_logs(
    session: AsyncSession, ctx: McpContext, args: dict
) -> dict[str, Any]:
    device_id = args.get("device_id")
    rows, total = await MemoryService(session).list_decisions(
        organization_id=ctx.organization_id,
        robot_id=str(device_id) if device_id else None,
        limit=_clamp(args.get("limit"), 20),
    )
    return {
        "total": total,
        "logs": [
            {
                "timestamp": _iso(d.created_at),
                "device_id": d.robot_id,
                "task": d.goal,
                # The provider is the one field worth surfacing unprompted: a
                # ":fallback" suffix means the deterministic placeholder
                # answered, not the model, and from every other angle the
                # decision looks entirely normal.
                "decision": {
                    "thought": d.thought,
                    "actions": d.actions,
                    "confidence": d.confidence,
                    "provider": d.provider,
                    "model": d.model,
                    "latency_ms": d.latency_ms,
                    "used_fallback": bool(d.provider and ":fallback" in d.provider),
                },
                "result": d.state,
            }
            for d in rows
        ],
    }


async def get_device_status(
    session: AsyncSession, ctx: McpContext, args: dict
) -> dict[str, Any]:
    device_id = args.get("device_id")
    if not device_id:
        raise ToolError("device_id is required.")

    registry = RegistryService(session)
    try:
        robot = await registry.get(str(device_id), organization_id=ctx.organization_id)
    except BrainError as exc:
        # A device in another organization is reported as simply not found —
        # the service deliberately does not distinguish, so one tenant cannot
        # probe another's ids, and this must not leak the difference either.
        raise ToolError(f"No such device in your organization: {device_id}") from exc

    latest, _ = await TelemetryService(session).list(
        organization_id=ctx.organization_id, robot_id=robot.id, limit=1
    )
    reading = latest[0] if latest else None
    return {
        "id": robot.id,
        "name": robot.name,
        "type": robot.robot_type,
        "status": str(robot.status),
        "paused": robot.paused,
        "last_seen": _iso(robot.last_seen_at),
        "capabilities": [c.get("type") for c in (robot.capabilities or [])],
        "battery": reading.battery if reading else None,
        "position": (
            {"x": reading.x, "y": reading.y, "z": reading.z} if reading else None
        ),
        "errors": reading.errors if reading else [],
        "telemetry_at": _iso(reading.created_at) if reading else None,
    }


async def run_simulator(
    session: AsyncSession, ctx: McpContext, args: dict
) -> dict[str, Any]:
    """Stand up a virtual device and queue a scenario against it.

    The same thing the in-dashboard simulator does, minus the browser: it
    registers a device in the caller's organization, marks it online and
    queues the scenario as its first task. Nothing physical is touched, which
    is why this is not flagged destructive — but it *does* create rows the
    user will see in their fleet, so it is not read-only either.
    """
    scenario = (args.get("scenario_description") or "").strip()
    if not scenario:
        raise ToolError("scenario_description must not be empty.")
    device_type = (args.get("device_type") or "rover").strip() or "rover"

    stamp = datetime.now(UTC).strftime("%m%d-%H%M%S")
    registry = RegistryService(session)
    # The api key and bearer token are deliberately dropped on the floor: a
    # device credential returned through a tool response would land in the
    # model's context and in the client's logs, and nothing here needs to
    # drive the device — the platform does that when it polls.
    robot, _api_key, _token = await registry.register(
        RobotRegisterRequest(
            name=f"sim-{device_type}-{stamp}",
            robot_type=device_type,
            capabilities=[],
            meta={"simulated": True, "created_via": "mcp"},
        ),
        organization_id=ctx.organization_id,
    )
    await registry.heartbeat(robot.id, HeartbeatRequest(status=RobotStatus.online))
    task = await TaskService(session).create(
        TaskCreate(robot_id=robot.id, description=scenario, priority=50),
        organization_id=ctx.organization_id,
    )
    logger.info(
        "mcp_simulator_started",
        robot_id=robot.id,
        organization_id=ctx.organization_id,
    )
    return {
        "session_id": robot.id,
        "device_id": robot.id,
        "device_name": robot.name,
        "device_type": robot.robot_type,
        "status": str(RobotStatus.online),
        "task_id": task.id,
        "task_status": str(task.status),
        "scenario": scenario,
    }


# --- tool catalogue --------------------------------------------------------

# Annotations are hints to the client about what a call will do, so it can
# decide what to confirm with the person. They are advisory by contract —
# the server still enforces everything itself.
_READ_ONLY = {
    "readOnlyHint": True,
    "destructiveHint": False,
    "idempotentHint": True,
    "openWorldHint": False,
}
_WRITES = {
    "readOnlyHint": False,
    "destructiveHint": False,
    "idempotentHint": False,
    "openWorldHint": False,
}

_DEVICE_ID = {
    "type": "string",
    "description": "Device identifier, as returned by get_devices.",
}

TOOLS: list[dict[str, Any]] = [
    {
        "name": "get_devices",
        "title": "Получить список устройств",
        "description": (
            "List every device registered to the caller's organization, with "
            "its current online/offline status and when it was last seen."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "limit": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": MAX_LIMIT,
                    "default": 50,
                    "description": "How many devices to return.",
                }
            },
            "additionalProperties": False,
        },
        "annotations": {"title": "Получить список устройств", **_READ_ONLY},
        "handler": get_devices,
    },
    {
        "name": "send_task",
        "title": "Отправить задачу устройству",
        "description": (
            "Queue a task for a device through the Task Engine. The device "
            "picks it up on its next poll; this does not move anything by "
            "itself."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "device_id": _DEVICE_ID,
                "task_description": {
                    "type": "string",
                    "minLength": 1,
                    "description": "What the device should try to do.",
                },
                "priority": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 100,
                    "default": 0,
                    "description": "Higher runs first. 0 is normal.",
                },
            },
            "required": ["device_id", "task_description"],
            "additionalProperties": False,
        },
        "annotations": {"title": "Отправить задачу устройству", **_WRITES},
        "handler": send_task,
    },
    {
        "name": "get_telemetry",
        "title": "Получить телеметрию устройства",
        "description": (
            "Recent telemetry for one device: battery, speed, position and "
            "any reported errors, newest first."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "device_id": _DEVICE_ID,
                "limit": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": MAX_LIMIT,
                    "default": 10,
                    "description": "How many readings to return.",
                },
            },
            "required": ["device_id"],
            "additionalProperties": False,
        },
        "annotations": {"title": "Получить телеметрию устройства", **_READ_ONLY},
        "handler": get_telemetry,
    },
    {
        "name": "get_decision_logs",
        "title": "Посмотреть логи решений",
        "description": (
            "The decision journal: what each device was asked to do, what the "
            "AI engine decided, and which provider answered. A provider ending "
            "in ':fallback' means the deterministic placeholder answered "
            "instead of the model."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "device_id": {
                    **_DEVICE_ID,
                    "description": "Optional. Omit for the whole fleet.",
                },
                "limit": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": MAX_LIMIT,
                    "default": 20,
                    "description": "How many log entries to return.",
                },
            },
            "additionalProperties": False,
        },
        "annotations": {"title": "Посмотреть логи решений", **_READ_ONLY},
        "handler": get_decision_logs,
    },
    {
        "name": "get_device_status",
        "title": "Получить статус устройства",
        "description": (
            "Current state of one device: status, capabilities, and its most "
            "recent battery, position and errors."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {"device_id": _DEVICE_ID},
            "required": ["device_id"],
            "additionalProperties": False,
        },
        "annotations": {"title": "Получить статус устройства", **_READ_ONLY},
        "handler": get_device_status,
    },
    {
        "name": "run_simulator",
        "title": "Запустить симулятор",
        "description": (
            "Register a virtual device in the organization and queue a "
            "scenario against it. Nothing physical is touched, but the device "
            "and its task appear in the fleet."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "scenario_description": {
                    "type": "string",
                    "minLength": 1,
                    "description": "What the simulated device should attempt.",
                },
                "device_type": {
                    "type": "string",
                    "default": "rover",
                    "description": "Device type to simulate, e.g. rover or arm.",
                },
            },
            "required": ["scenario_description"],
            "additionalProperties": False,
        },
        "annotations": {"title": "Запустить симулятор", **_WRITES},
        "handler": run_simulator,
    },
]

# Name -> definition, for dispatch.
BY_NAME = {tool["name"]: tool for tool in TOOLS}


def public_catalogue() -> list[dict[str, Any]]:
    """The tool list as it goes over the wire — without the handlers."""
    return [
        {k: v for k, v in tool.items() if k != "handler"}
        for tool in TOOLS
    ]


async def call_tool(
    session: AsyncSession, ctx: McpContext, name: str, args: dict | None
) -> dict[str, Any]:
    """Run one tool and return an MCP ``tools/call`` result.

    A tool that raises is reported as ``isError`` inside a successful
    JSON-RPC response rather than as a protocol error: the distinction in MCP
    is that a protocol error means the call could not be made at all, while a
    tool that ran and failed is something the model should see and reason
    about.
    """
    tool = BY_NAME.get(name)
    if tool is None:
        raise ToolError(f"Unknown tool: {name}")

    payload = await tool["handler"](session, ctx, args or {})
    text = json.dumps(payload, ensure_ascii=False, indent=2, default=str)
    return {
        "content": [{"type": "text", "text": text}],
        # Clients that understand structured output get the parsed object and
        # do not have to re-parse the text block.
        "structuredContent": payload,
        "isError": False,
    }

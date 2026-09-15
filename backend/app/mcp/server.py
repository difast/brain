"""JSON-RPC 2.0 dispatch for the MCP endpoint.

Kept separate from the HTTP route so the protocol can be tested without a
transport, and so the transport can be swapped without touching the methods.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app import __version__
from app.core.logging import get_logger
from app.mcp.tools import McpContext, ToolError, call_tool, public_catalogue

logger = get_logger("mcp")

# The revision of the MCP spec this server implements. A client that asks for
# something else is answered with this one and decides whether it can live
# with it — that is how the spec says to negotiate.
PROTOCOL_VERSION = "2025-06-18"
SUPPORTED_PROTOCOL_VERSIONS = ("2025-06-18", "2025-03-26", "2024-11-05")

SERVER_INFO = {"name": "mevratek", "title": "Mevratek", "version": __version__}

INSTRUCTIONS = (
    "Mevratek is a robotics control platform. Devices are thin clients: they "
    "report telemetry and receive structured action commands decided by an AI "
    "engine. Use get_devices first to discover device ids — every other tool "
    "takes one. All data is scoped to the signed-in user's organization.\n\n"
    "When reading decision logs, pay attention to the provider field: a value "
    "ending in ':fallback' means the deterministic placeholder answered rather "
    "than the configured model, which is invisible to the device itself."
)

# JSON-RPC 2.0 error codes.
PARSE_ERROR = -32700
INVALID_REQUEST = -32600
METHOD_NOT_FOUND = -32601
INVALID_PARAMS = -32602


def error(request_id: Any, code: int, message: str, data: Any = None) -> dict:
    body: dict[str, Any] = {"code": code, "message": message}
    if data is not None:
        body["data"] = data
    return {"jsonrpc": "2.0", "id": request_id, "error": body}


def result(request_id: Any, payload: dict) -> dict:
    return {"jsonrpc": "2.0", "id": request_id, "result": payload}


async def handle_message(
    session: AsyncSession, ctx: McpContext, message: dict
) -> dict | None:
    """Handle one JSON-RPC message. Returns None for notifications.

    A notification (no ``id``) gets no reply by JSON-RPC rule — the transport
    answers 202 Accepted instead.
    """
    if message.get("jsonrpc") != "2.0":
        return error(message.get("id"), INVALID_REQUEST, "Expected jsonrpc 2.0.")

    method = message.get("method")
    if not isinstance(method, str):
        return error(message.get("id"), INVALID_REQUEST, "Missing method.")

    request_id = message.get("id")
    is_notification = "id" not in message
    params = message.get("params") or {}

    # Notifications carry no id, and JSON-RPC forbids replying to them —
    # whatever they are. The transport answers 202 instead.
    if is_notification:
        return None

    if method == "initialize":
        asked = params.get("protocolVersion")
        agreed = (
            asked if asked in SUPPORTED_PROTOCOL_VERSIONS else PROTOCOL_VERSION
        )
        logger.info("mcp_initialize", client=params.get("clientInfo"), asked=asked)
        return result(
            request_id,
            {
                "protocolVersion": agreed,
                "capabilities": {
                    # listChanged is false: the catalogue is static, so
                    # promising change notifications would be a lie.
                    "tools": {"listChanged": False}
                },
                "serverInfo": SERVER_INFO,
                "instructions": INSTRUCTIONS,
            },
        )

    if method == "ping":
        return result(request_id, {})

    if method == "tools/list":
        return result(request_id, {"tools": public_catalogue()})

    if method == "tools/call":
        name = params.get("name")
        if not isinstance(name, str):
            return error(request_id, INVALID_PARAMS, "params.name is required.")
        arguments = params.get("arguments")
        if arguments is not None and not isinstance(arguments, dict):
            return error(
                request_id, INVALID_PARAMS, "params.arguments must be an object."
            )
        try:
            payload = await call_tool(session, ctx, name, arguments)
        except ToolError as exc:
            # A tool that ran and refused is a result, not a protocol failure:
            # the model is supposed to read this and try something else.
            logger.info("mcp_tool_refused", tool=name, reason=str(exc))
            return result(
                request_id,
                {
                    "content": [{"type": "text", "text": str(exc)}],
                    "isError": True,
                },
            )
        except Exception as exc:  # noqa: BLE001 - surfaced, not swallowed
            logger.exception("mcp_tool_failed", tool=name)
            return result(
                request_id,
                {
                    "content": [
                        {
                            "type": "text",
                            "text": f"Tool failed: {exc.__class__.__name__}",
                        }
                    ],
                    "isError": True,
                },
            )
        logger.info(
            "mcp_tool_called",
            tool=name,
            organization_id=ctx.organization_id,
            user_id=ctx.user_id,
        )
        return result(request_id, payload)

    # Everything the server does not implement, including resources/* and
    # prompts/*, which are not advertised in capabilities.
    return error(request_id, METHOD_NOT_FOUND, f"Method not found: {method}")

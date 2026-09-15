"""The /mcp endpoint — MCP over Streamable HTTP.

The server is stateless: it assigns no ``Mcp-Session-Id``, because every
request already carries an OAuth access token that identifies the user, the
organization and the revocable session behind it. The spec permits this, and
it means there is no server-side conversation state to lose when Timeweb
restarts a container mid-conversation.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from typing import Any, TypeVar

from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse

from app.api.deps import SessionDep, resolve_mcp_context
from app.core.config import settings
from app.core.exceptions import AuthError
from app.core.logging import get_logger
from app.mcp.server import (
    INVALID_REQUEST,
    PARSE_ERROR,
    PROTOCOL_VERSION,
    error,
    handle_message,
)
from app.mcp.tools import McpContext

# Preserves the concrete response type through the header helper, so a
# JSONResponse stays a JSONResponse to the type checker.
_R = TypeVar("_R", bound=Response)

logger = get_logger("mcp.http")

router = APIRouter(tags=["mcp"])

# Nothing here renders markup or loads a resource — the endpoint speaks JSON
# to a program. The policy says exactly that: no scripts, no frames, no
# anything, so a browser that is tricked into treating a response as a
# document can do nothing with it.
CSP = (
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; "
    "form-action 'none'; sandbox"
)

# How long an idle SSE stream is held before the client is asked to reconnect.
SSE_MAX_SECONDS = 300
SSE_KEEPALIVE_SECONDS = 15


def _security_headers(response: _R) -> _R:
    response.headers["Content-Security-Policy"] = CSP
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = "no-store"
    return response


def _bearer(request: Request) -> str | None:
    header = request.headers.get("authorization") or ""
    scheme, _, value = header.partition(" ")
    if scheme.lower() != "bearer":
        return None
    return value.strip() or None


def _unauthorized(request: Request, detail: str) -> JSONResponse:
    """A 401 that tells the client where to go and get a token.

    RFC 9728: without this header a fresh MCP client has no way to discover
    the authorization server, and simply fails to connect.
    """
    from app.api.routes.oauth import public_base

    base = public_base(request)
    response = JSONResponse(
        status_code=401,
        content={"error": "unauthorized", "error_description": detail},
        headers={
            "WWW-Authenticate": (
                'Bearer realm="mevratek", '
                f'resource_metadata="{base}/.well-known/oauth-protected-resource"'
            )
        },
    )
    return _security_headers(response)


async def _context(request: Request, session: SessionDep) -> McpContext:
    return await resolve_mcp_context(_bearer(request), session)


@router.post("/mcp")
async def mcp_post(request: Request, session: SessionDep) -> Response:
    """Handle one JSON-RPC message, or a batch of them."""
    if not settings.mcp_enabled:
        return _security_headers(
            JSONResponse(status_code=404, content={"error": "not_found"})
        )

    try:
        ctx = await _context(request, session)
    except AuthError as exc:
        return _unauthorized(request, exc.message)

    try:
        body = await request.json()
    except Exception:  # noqa: BLE001 - malformed JSON is a client error
        return _security_headers(
            JSONResponse(
                status_code=400, content=error(None, PARSE_ERROR, "Invalid JSON.")
            )
        )

    # A batch is a JSON array; a single call is an object. Both are valid
    # JSON-RPC and clients use both.
    messages = body if isinstance(body, list) else [body]
    if not messages or not all(isinstance(m, dict) for m in messages):
        return _security_headers(
            JSONResponse(
                status_code=400,
                content=error(None, INVALID_REQUEST, "Expected a JSON-RPC message."),
            )
        )

    replies: list[dict[str, Any]] = []
    for message in messages:
        reply = await handle_message(session, ctx, message)
        if reply is not None:
            replies.append(reply)

    # Tools that wrote (send_task, run_simulator) must survive: get_session
    # rolls back on any later exception, so the commit belongs here, after
    # every message in the batch has been handled.
    await session.commit()

    if not replies:
        # Everything was a notification. JSON-RPC says answer nothing, and
        # Streamable HTTP says say so with 202.
        return _security_headers(Response(status_code=202))

    payload = replies if isinstance(body, list) else replies[0]
    response = JSONResponse(status_code=200, content=payload)
    response.headers["MCP-Protocol-Version"] = PROTOCOL_VERSION
    return _security_headers(response)


@router.get("/mcp")
async def mcp_get(request: Request, session: SessionDep) -> Response:
    """Open the server-to-client SSE stream.

    This server never initiates a message — it has no subscriptions, no
    sampling and no long-running jobs to report on — so the stream carries
    only keepalives and closes itself after a while, which keeps a worker
    from being pinned by an idle client. Clients reconnect; the spec expects
    them to.
    """
    if not settings.mcp_enabled:
        return _security_headers(
            JSONResponse(status_code=404, content={"error": "not_found"})
        )

    try:
        await _context(request, session)
    except AuthError as exc:
        return _unauthorized(request, exc.message)

    async def stream() -> AsyncIterator[bytes]:
        # An SSE comment. Clients ignore it; proxies see traffic and keep the
        # connection open.
        yield b": connected\n\n"
        waited = 0
        while waited < SSE_MAX_SECONDS:
            await asyncio.sleep(SSE_KEEPALIVE_SECONDS)
            waited += SSE_KEEPALIVE_SECONDS
            yield b": keepalive\n\n"

    response = StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-store",
            # Nginx buffers by default, which would hold the keepalives back
            # and defeat the point of sending them.
            "X-Accel-Buffering": "no",
            "MCP-Protocol-Version": PROTOCOL_VERSION,
        },
    )
    response.headers["Content-Security-Policy"] = CSP
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@router.delete("/mcp", include_in_schema=False)
async def mcp_delete() -> Response:
    """Session termination. There is no session id to terminate."""
    return _security_headers(
        JSONResponse(
            status_code=405,
            content={
                "error": "method_not_allowed",
                "error_description": (
                    "This server is stateless and assigns no Mcp-Session-Id. "
                    "Revoke the OAuth token instead."
                ),
            },
        )
    )

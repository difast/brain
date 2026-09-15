"""OAuth 2.0 endpoints for MCP connectors.

The consent screen is not served here. The dashboard keeps its session token
in ``localStorage`` on its own origin, and this API lives on another — so the
API cannot tell whether the person hitting ``/oauth/authorize`` is signed in.
The authorize endpoint therefore validates the request and hands the browser
to the dashboard, which owns the token, renders the consent UI, and calls
back here with the session token attached. The security decision still
happens server-side: the approval endpoint below is the only thing that mints
a code, and it requires a real dashboard session.
"""

from __future__ import annotations

from typing import Annotated, Any
from urllib.parse import urlencode

from fastapi import APIRouter, Form, Request
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.core.logging import get_logger
from app.core.security import MCP_SCOPE, MCP_TOKEN_TTL_HOURS, create_mcp_token
from app.services.oauth_service import OAuthError, OAuthService
from app.services.session_service import SessionService

logger = get_logger("oauth.routes")

router = APIRouter(tags=["oauth"])


def public_base(request: Request) -> str:
    """The externally visible base URL of this API, without trailing slash."""
    if settings.public_api_url:
        return settings.public_api_url.rstrip("/")
    return str(request.base_url).rstrip("/")


def _oauth_error(exc: OAuthError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.error, "error_description": exc.description},
    )


# --- discovery -------------------------------------------------------------


@router.get("/.well-known/oauth-authorization-server", include_in_schema=False)
async def authorization_server_metadata(request: Request) -> dict[str, Any]:
    """RFC 8414. How a client learns where to send people and tokens."""
    base = public_base(request)
    return {
        "issuer": base,
        "authorization_endpoint": f"{base}/oauth/authorize",
        "token_endpoint": f"{base}/oauth/token",
        "revocation_endpoint": f"{base}/oauth/revoke",
        "registration_endpoint": f"{base}/oauth/register",
        "scopes_supported": [MCP_SCOPE],
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code"],
        "token_endpoint_auth_methods_supported": ["none"],
        # S256 only. "plain" is listed by many servers and protects nothing.
        "code_challenge_methods_supported": ["S256"],
        "revocation_endpoint_auth_methods_supported": ["none"],
        "service_documentation": "https://mevratek.ru/mcp-docs.md",
    }


@router.get("/.well-known/oauth-protected-resource", include_in_schema=False)
async def protected_resource_metadata(request: Request) -> dict[str, Any]:
    """RFC 9728. What the 401 from /mcp points at."""
    base = public_base(request)
    return {
        "resource": f"{base}/mcp",
        "authorization_servers": [base],
        "scopes_supported": [MCP_SCOPE],
        "bearer_methods_supported": ["header"],
        "resource_documentation": "https://mevratek.ru/mcp-docs.md",
    }


# --- dynamic client registration ------------------------------------------


@router.post("/oauth/register", status_code=201, include_in_schema=False)
async def register_client(request: Request, session: SessionDep) -> Any:
    """RFC 7591. MCP clients register themselves on first connect."""
    try:
        body = await request.json()
    except Exception:  # noqa: BLE001 - a malformed body is a client error
        return _oauth_error(
            OAuthError("invalid_client_metadata", "Body must be JSON.")
        )
    if not isinstance(body, dict):
        return _oauth_error(
            OAuthError("invalid_client_metadata", "Body must be a JSON object.")
        )
    try:
        client = await OAuthService(session).register_client(body)
    except OAuthError as exc:
        return _oauth_error(exc)

    # The client must survive even though nothing else in this request wrote:
    # get_session rolls back on any later exception, and a client that was
    # handed an id it cannot use would be worse than a failed registration.
    await session.commit()
    return {
        "client_id": client.id,
        "client_name": client.client_name,
        "redirect_uris": client.redirect_uris,
        "grant_types": client.grant_types,
        "response_types": client.response_types,
        "scope": client.scope,
        "token_endpoint_auth_method": "none",
        # 0 means "does not expire" per RFC 7591.
        "client_id_issued_at": int(client.created_at.timestamp()),
        "client_secret_expires_at": 0,
    }


# --- authorization ---------------------------------------------------------


@router.get("/oauth/authorize", include_in_schema=False)
async def authorize(
    request: Request,
    session: SessionDep,
    client_id: str = "",
    redirect_uri: str = "",
    response_type: str = "code",
    scope: str = MCP_SCOPE,
    state: str = "",
    code_challenge: str = "",
    code_challenge_method: str = "S256",
    resource: str = "",
) -> Any:
    """Validate the request, then hand the browser to the dashboard.

    Validation happens *before* the redirect so a malformed request fails
    here with a readable error instead of bouncing the person through a login
    only to fail afterwards.
    """
    service = OAuthService(session)
    try:
        if response_type != "code":
            raise OAuthError(
                "unsupported_response_type", "Only response_type=code is supported."
            )
        if not code_challenge:
            raise OAuthError("invalid_request", "code_challenge is required (PKCE).")
        if code_challenge_method != "S256":
            raise OAuthError(
                "invalid_request", "Only code_challenge_method=S256 is supported."
            )
        client = await service.get_client(client_id)
        if redirect_uri not in client.redirect_uris:
            raise OAuthError(
                "invalid_request", "redirect_uri does not match the registration."
            )
    except OAuthError as exc:
        return _oauth_error(exc)

    # Everything the dashboard needs to render consent and call back.
    query = urlencode(
        {
            "client_id": client_id,
            "client_name": client.client_name,
            "redirect_uri": redirect_uri,
            "scope": scope or MCP_SCOPE,
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": code_challenge_method,
            "resource": resource,
        }
    )
    target = f"{settings.dashboard_url.rstrip('/')}/oauth/authorize?{query}"
    return RedirectResponse(target, status_code=302)


class ApprovalRequest(BaseModel):
    client_id: str
    redirect_uri: str
    scope: str = MCP_SCOPE
    state: str = ""
    code_challenge: str
    code_challenge_method: str = "S256"
    resource: str = ""


@router.post("/oauth/authorize", include_in_schema=False)
async def approve(
    payload: ApprovalRequest, user: CurrentUser, session: SessionDep
) -> Any:
    """Mint the code for a signed-in user who approved the connector.

    Requires a live dashboard session — this is the point at which a human
    agreed, and the only place a code is created.
    """
    service = OAuthService(session)
    try:
        client = await service.get_client(payload.client_id)
        code = await service.issue_code(
            client=client,
            user=user,
            redirect_uri=payload.redirect_uri,
            scope=payload.scope,
            code_challenge=payload.code_challenge,
            code_challenge_method=payload.code_challenge_method,
            resource=payload.resource or None,
            state=payload.state or None,
        )
    except OAuthError as exc:
        return _oauth_error(exc)

    await session.commit()
    params = {"code": code}
    if payload.state:
        params["state"] = payload.state
    separator = "&" if "?" in payload.redirect_uri else "?"
    return {"redirect_to": f"{payload.redirect_uri}{separator}{urlencode(params)}"}


# --- token -----------------------------------------------------------------


@router.post("/oauth/token", include_in_schema=False)
async def token(
    request: Request,
    session: SessionDep,
    grant_type: Annotated[str, Form()] = "",
    code: Annotated[str, Form()] = "",
    redirect_uri: Annotated[str, Form()] = "",
    client_id: Annotated[str, Form()] = "",
    code_verifier: Annotated[str, Form()] = "",
) -> Any:
    """Exchange an authorization code for an access token.

    The token issued here is a dashboard session token with ``type="mcp"``
    and a narrowed scope, bound to a fresh ``user_sessions`` row — which is
    what makes the connection visible and revocable in the account page.
    """
    if grant_type != "authorization_code":
        return _oauth_error(
            OAuthError(
                "unsupported_grant_type",
                "Only grant_type=authorization_code is supported.",
            )
        )

    service = OAuthService(session)
    try:
        row = await service.redeem_code(
            code=code,
            client_id=client_id,
            redirect_uri=redirect_uri,
            code_verifier=code_verifier,
        )
    except OAuthError as exc:
        # The code was consumed (or the replay was recorded) before this
        # raised; committing keeps that, because get_session would otherwise
        # roll it back and leave a burnt code redeemable.
        await session.commit()
        return _oauth_error(exc)

    from app.models.user import User

    user = await session.get(User, row.user_id)
    if user is None:
        await session.commit()
        return _oauth_error(
            OAuthError("invalid_grant", "The account no longer exists.")
        )

    user_agent = request.headers.get("user-agent")
    client = await service.get_client(row.client_id)
    session_row = await SessionService(session).create(
        user,
        ip=request.client.host if request.client else None,
        # Names the connector in the account's session list, so "Claude" is
        # distinguishable from a browser the person signed in from.
        user_agent=f"MCP: {client.client_name} — {user_agent or 'unknown'}",
    )
    row.issued_session_id = session_row.id

    access_token = create_mcp_token(
        user_id=user.id,
        organization_id=user.organization_id,
        role=str(user.role),
        session_id=session_row.id,
        scope=row.scope or MCP_SCOPE,
        resource=row.resource,
    )
    await session.commit()
    logger.info(
        "oauth_token_issued",
        client_id=client.id,
        user_id=user.id,
        session_id=session_row.id,
    )
    return {
        "access_token": access_token,
        "token_type": "Bearer",
        "expires_in": MCP_TOKEN_TTL_HOURS * 3600,
        "scope": row.scope or MCP_SCOPE,
    }


@router.post("/oauth/revoke", include_in_schema=False)
async def revoke(
    session: SessionDep,
    token: Annotated[str, Form()] = "",
    token_type_hint: Annotated[str, Form()] = "",
) -> Any:
    """RFC 7009. Revoking is always reported as success.

    The spec requires 200 even for an unknown token — telling a caller that a
    token it presented was not recognised is itself an oracle.
    """
    from app.core.security import decode_mcp_token

    if token:
        try:
            payload = decode_mcp_token(token)
            session_id = str(payload.get("sid") or "")
            user_id = str(payload.get("sub") or "")
            if session_id and user_id:
                await SessionService(session).revoke(user_id, session_id)
                await session.commit()
                logger.info("oauth_token_revoked", session_id=session_id)
        except Exception:  # noqa: BLE001 - see docstring
            pass
    return JSONResponse(status_code=200, content={})

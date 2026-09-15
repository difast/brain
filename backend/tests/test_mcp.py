"""MCP endpoint, its tools, and the OAuth flow in front of them.

The point of most of these tests is one property: a connector authorized by
one organization must not be able to read or touch another's fleet, even when
it knows the exact ids. Telemetry and decision rows have no organization
column of their own — they hang off a robot — so that is precisely where a
missing join would leak, and precisely what is checked here.
"""

from __future__ import annotations

import base64
import hashlib
from datetime import UTC, datetime, timedelta

import jwt as pyjwt
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.core.security import create_mcp_token, create_user_token, hash_password
from app.models.decision import Decision
from app.models.organization import Organization
from app.models.robot import Robot, RobotStatus
from app.models.telemetry import Telemetry
from app.models.user import User, UserRole
from app.models.user_session import UserSession
from app.services.seed_service import SEED_ADMIN_ID, SEED_ORG_ID
from app.services.session_service import SessionService

OTHER_ORG_ID = "0" * 31 + "9"
OTHER_USER_ID = "0" * 31 + "8"


def rpc(method: str, params: dict | None = None, request_id: int = 1) -> dict:
    body: dict = {"jsonrpc": "2.0", "id": request_id, "method": method}
    if params is not None:
        body["params"] = params
    return body


def pkce() -> tuple[str, str]:
    """A verifier and its S256 challenge."""
    verifier = "a" * 64
    digest = hashlib.sha256(verifier.encode()).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    return verifier, challenge


@pytest_asyncio.fixture
async def mcp_token(session_factory) -> str:
    """An MCP access token for the seeded admin, bound to a live session."""
    async with session_factory() as s:
        now = datetime.now(UTC)
        row = UserSession(
            user_id=SEED_ADMIN_ID,
            last_seen_at=now,
            expires_at=now + timedelta(hours=8),
        )
        s.add(row)
        await s.commit()
        session_id = row.id
    return create_mcp_token(SEED_ADMIN_ID, SEED_ORG_ID, "admin", session_id)


@pytest_asyncio.fixture
async def other_org(session_factory) -> dict:
    """A second tenant with a device, telemetry and a decision of its own."""
    async with session_factory() as s:
        s.add(Organization(id=OTHER_ORG_ID, name="Другая компания"))
        await s.flush()
        s.add(
            User(
                id=OTHER_USER_ID,
                email="rival@example.com",
                password=hash_password("11111111"),
                organization_id=OTHER_ORG_ID,
                role=UserRole.admin,
            )
        )
        robot = Robot(
            organization_id=OTHER_ORG_ID,
            name="secret-rover",
            robot_type="rover",
            api_key_hash="x",
            status=RobotStatus.online,
        )
        s.add(robot)
        await s.flush()
        s.add(Telemetry(robot_id=robot.id, battery=42.0, speed=1.0))
        s.add(
            Decision(
                robot_id=robot.id,
                goal="секретная задача",
                thought="секретная мысль",
                confidence=0.9,
            )
        )
        await s.commit()
        return {"org_id": OTHER_ORG_ID, "robot_id": robot.id}


@pytest_asyncio.fixture
async def mcp_client(app, mcp_token) -> AsyncClient:
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Authorization": f"Bearer {mcp_token}"},
    ) as ac:
        yield ac


async def call(client: AsyncClient, name: str, args: dict | None = None) -> dict:
    """tools/call, returning the parsed structured result."""
    res = await client.post(
        "/mcp", json=rpc("tools/call", {"name": name, "arguments": args or {}})
    )
    assert res.status_code == 200, res.text
    return res.json()["result"]


# --- authentication --------------------------------------------------------


@pytest.mark.asyncio
async def test_mcp_requires_a_token(anon_client):
    res = await anon_client.post("/mcp", json=rpc("tools/list"))
    assert res.status_code == 401
    # Without this header a fresh client cannot discover where to authorize.
    assert "resource_metadata" in res.headers.get("www-authenticate", "")


@pytest.mark.asyncio
async def test_dashboard_token_is_not_accepted_by_mcp(app):
    """A session token must not double as a connector token.

    Were both accepted, a leaked MCP token would open the whole dashboard
    API — the narrowed scope would be decorative.
    """
    token = create_user_token(SEED_ADMIN_ID, SEED_ORG_ID, "admin")
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Authorization": f"Bearer {token}"},
    ) as ac:
        res = await ac.post("/mcp", json=rpc("tools/list"))
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_mcp_token_is_rejected_by_the_dashboard_api(app, mcp_token):
    """And the reverse: a connector token cannot call the dashboard."""
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Authorization": f"Bearer {mcp_token}"},
    ) as ac:
        res = await ac.get("/api/v1/robots")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_revoking_the_session_cuts_the_connector_off(
    app, mcp_token, session_factory
):
    payload = pyjwt.decode(
        mcp_token, settings.secret_key, algorithms=[settings.jwt_algorithm]
    )
    async with session_factory() as s:
        await SessionService(s).revoke(SEED_ADMIN_ID, payload["sid"])
        await s.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Authorization": f"Bearer {mcp_token}"},
    ) as ac:
        res = await ac.post("/mcp", json=rpc("tools/list"))
    assert res.status_code == 401


# --- protocol --------------------------------------------------------------


@pytest.mark.asyncio
async def test_initialize_returns_capabilities(mcp_client):
    res = await mcp_client.post(
        "/mcp", json=rpc("initialize", {"protocolVersion": "2025-06-18"})
    )
    assert res.status_code == 200
    result = res.json()["result"]
    assert result["protocolVersion"] == "2025-06-18"
    assert "tools" in result["capabilities"]
    assert result["serverInfo"]["name"] == "mevratek"


@pytest.mark.asyncio
async def test_tools_list_carries_annotations(mcp_client):
    result = (await mcp_client.post("/mcp", json=rpc("tools/list"))).json()["result"]
    names = {t["name"] for t in result["tools"]}
    assert names == {
        "get_devices",
        "send_task",
        "get_telemetry",
        "get_decision_logs",
        "get_device_status",
        "run_simulator",
    }
    by_name = {t["name"]: t for t in result["tools"]}
    assert by_name["get_devices"]["annotations"]["readOnlyHint"] is True
    assert by_name["send_task"]["annotations"]["readOnlyHint"] is False
    assert by_name["send_task"]["annotations"]["destructiveHint"] is False
    assert by_name["run_simulator"]["annotations"]["destructiveHint"] is False
    # The handler must never go over the wire.
    assert all("handler" not in t for t in result["tools"])


@pytest.mark.asyncio
async def test_notification_gets_no_body(mcp_client):
    res = await mcp_client.post(
        "/mcp", json={"jsonrpc": "2.0", "method": "notifications/initialized"}
    )
    assert res.status_code == 202


@pytest.mark.asyncio
async def test_unknown_method_is_a_jsonrpc_error(mcp_client):
    res = await mcp_client.post("/mcp", json=rpc("resources/list"))
    assert res.status_code == 200
    assert res.json()["error"]["code"] == -32601


@pytest.mark.asyncio
async def test_batch_is_answered_in_order(mcp_client):
    res = await mcp_client.post(
        "/mcp", json=[rpc("ping", None, 1), rpc("tools/list", None, 2)]
    )
    assert res.status_code == 200
    body = res.json()
    assert [m["id"] for m in body] == [1, 2]


@pytest.mark.asyncio
async def test_security_headers_are_set(mcp_client):
    res = await mcp_client.post("/mcp", json=rpc("ping"))
    assert res.headers["content-security-policy"].startswith("default-src 'none'")
    assert res.headers["x-content-type-options"] == "nosniff"


@pytest.mark.asyncio
async def test_sse_stream_opens(mcp_client):
    async with mcp_client.stream("GET", "/mcp") as res:
        assert res.status_code == 200
        assert res.headers["content-type"].startswith("text/event-stream")


# --- tools -----------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_devices_lists_only_our_fleet(mcp_client, other_org, client):
    await client.post(
        "/api/v1/robots/register",
        json={"name": "ours", "robot_type": "rover", "capabilities": []},
    )
    result = await call(mcp_client, "get_devices")
    names = {d["name"] for d in result["structuredContent"]["devices"]}
    assert "ours" in names
    assert "secret-rover" not in names


@pytest.mark.asyncio
async def test_send_task_creates_a_task(mcp_client, client):
    registered = (
        await client.post(
            "/api/v1/robots/register",
            json={"name": "task-target", "robot_type": "rover", "capabilities": []},
        )
    ).json()
    result = await call(
        mcp_client,
        "send_task",
        {"device_id": registered["robot"]["id"], "task_description": "ехать вперёд"},
    )
    assert result["isError"] is False
    assert result["structuredContent"]["status"] == "pending"


@pytest.mark.asyncio
async def test_send_task_refuses_another_orgs_device(mcp_client, other_org):
    result = await call(
        mcp_client,
        "send_task",
        {"device_id": other_org["robot_id"], "task_description": "захватить"},
    )
    assert result["isError"] is True


@pytest.mark.asyncio
async def test_get_telemetry_is_empty_for_another_orgs_device(
    mcp_client, other_org
):
    """The row exists and the id is correct — the join is what hides it."""
    result = await call(
        mcp_client, "get_telemetry", {"device_id": other_org["robot_id"]}
    )
    assert result["structuredContent"]["readings"] == []


@pytest.mark.asyncio
async def test_get_decision_logs_excludes_other_orgs(mcp_client, other_org):
    result = await call(mcp_client, "get_decision_logs")
    goals = [log["task"] for log in result["structuredContent"]["logs"]]
    assert "секретная задача" not in goals


@pytest.mark.asyncio
async def test_get_device_status_hides_another_orgs_device(mcp_client, other_org):
    result = await call(
        mcp_client, "get_device_status", {"device_id": other_org["robot_id"]}
    )
    assert result["isError"] is True
    # Reported as absent, not as forbidden: confirming existence would let one
    # tenant enumerate another's ids.
    assert "No such device" in result["content"][0]["text"]


@pytest.mark.asyncio
async def test_get_device_status_returns_state(mcp_client, client):
    registered = (
        await client.post(
            "/api/v1/robots/register",
            json={"name": "status-target", "robot_type": "rover", "capabilities": []},
        )
    ).json()
    robot_id = registered["robot"]["id"]
    await client.post(
        "/api/v1/telemetry",
        json={"battery": 77.0, "speed": 0.5, "x": 1.0, "y": 2.0, "z": 0.0},
        headers={"Authorization": f"Bearer {registered['token']}"},
    )
    result = await call(mcp_client, "get_device_status", {"device_id": robot_id})
    payload = result["structuredContent"]
    assert payload["name"] == "status-target"
    assert payload["battery"] == 77.0


@pytest.mark.asyncio
async def test_run_simulator_creates_a_device_in_our_org(mcp_client):
    result = await call(
        mcp_client,
        "run_simulator",
        {"scenario_description": "объехать препятствие", "device_type": "rover"},
    )
    payload = result["structuredContent"]
    assert payload["session_id"]
    assert payload["status"] == "online"

    # It really landed in the fleet, and in ours.
    listed = await call(mcp_client, "get_devices")
    ids = {d["id"] for d in listed["structuredContent"]["devices"]}
    assert payload["device_id"] in ids


@pytest.mark.asyncio
async def test_tool_validation_errors_are_results_not_failures(mcp_client):
    result = await call(
        mcp_client, "send_task", {"device_id": "", "task_description": ""}
    )
    assert result["isError"] is True


@pytest.mark.asyncio
async def test_unknown_tool_is_reported_as_an_error_result(mcp_client):
    result = await call(mcp_client, "definitely_not_a_tool")
    assert result["isError"] is True


# --- OAuth -----------------------------------------------------------------


@pytest.mark.asyncio
async def test_discovery_documents(anon_client):
    meta = (
        await anon_client.get("/.well-known/oauth-authorization-server")
    ).json()
    assert meta["code_challenge_methods_supported"] == ["S256"]
    assert meta["authorization_endpoint"].endswith("/oauth/authorize")

    resource = (
        await anon_client.get("/.well-known/oauth-protected-resource")
    ).json()
    assert resource["resource"].endswith("/mcp")


@pytest.mark.asyncio
async def test_full_oauth_flow(anon_client, client):
    """Register → authorize → approve → token → call a tool with it."""
    registration = await anon_client.post(
        "/oauth/register",
        json={
            "client_name": "Claude",
            "redirect_uris": ["https://claude.ai/api/mcp/auth_callback"],
        },
    )
    assert registration.status_code == 201
    client_id = registration.json()["client_id"]

    verifier, challenge = pkce()
    params = {
        "client_id": client_id,
        "redirect_uri": "https://claude.ai/api/mcp/auth_callback",
        "response_type": "code",
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "state": "xyz",
    }
    # The authorize endpoint hands the browser to the dashboard's consent page.
    redirect = await anon_client.get(
        "/oauth/authorize", params=params, follow_redirects=False
    )
    assert redirect.status_code == 302
    assert "/oauth/authorize" in redirect.headers["location"]

    # The dashboard approves with the user's session token attached.
    approval = await client.post(
        "/oauth/authorize",
        json={
            "client_id": client_id,
            "redirect_uri": "https://claude.ai/api/mcp/auth_callback",
            "scope": "mcp",
            "state": "xyz",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        },
    )
    assert approval.status_code == 200, approval.text
    redirect_to = approval.json()["redirect_to"]
    code = redirect_to.split("code=")[1].split("&")[0]

    exchanged = await anon_client.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": "https://claude.ai/api/mcp/auth_callback",
            "client_id": client_id,
            "code_verifier": verifier,
        },
    )
    assert exchanged.status_code == 200, exchanged.text
    body = exchanged.json()
    assert body["token_type"] == "Bearer"
    assert body["scope"] == "mcp"

    # And the token actually works against /mcp.
    used = await anon_client.post(
        "/mcp",
        json=rpc("tools/list"),
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )
    assert used.status_code == 200
    assert len(used.json()["result"]["tools"]) == 6


@pytest.mark.asyncio
async def test_authorize_rejects_an_unregistered_redirect(anon_client):
    registration = await anon_client.post(
        "/oauth/register",
        json={"client_name": "X", "redirect_uris": ["https://ok.example/cb"]},
    )
    client_id = registration.json()["client_id"]
    _, challenge = pkce()
    res = await anon_client.get(
        "/oauth/authorize",
        params={
            "client_id": client_id,
            "redirect_uri": "https://evil.example/cb",
            "response_type": "code",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        },
        follow_redirects=False,
    )
    assert res.status_code == 400
    assert res.json()["error"] == "invalid_request"


@pytest.mark.asyncio
async def test_registration_rejects_a_plain_http_redirect(anon_client):
    res = await anon_client.post(
        "/oauth/register",
        json={"client_name": "X", "redirect_uris": ["http://evil.example/cb"]},
    )
    assert res.status_code == 400
    assert res.json()["error"] == "invalid_redirect_uri"


@pytest.mark.asyncio
async def test_authorize_requires_pkce(anon_client):
    registration = await anon_client.post(
        "/oauth/register",
        json={"client_name": "X", "redirect_uris": ["https://ok.example/cb"]},
    )
    client_id = registration.json()["client_id"]
    res = await anon_client.get(
        "/oauth/authorize",
        params={
            "client_id": client_id,
            "redirect_uri": "https://ok.example/cb",
            "response_type": "code",
        },
        follow_redirects=False,
    )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_token_rejects_a_wrong_verifier(anon_client, client):
    registration = await anon_client.post(
        "/oauth/register",
        json={"client_name": "X", "redirect_uris": ["https://ok.example/cb"]},
    )
    client_id = registration.json()["client_id"]
    _, challenge = pkce()
    approval = await client.post(
        "/oauth/authorize",
        json={
            "client_id": client_id,
            "redirect_uri": "https://ok.example/cb",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        },
    )
    code = approval.json()["redirect_to"].split("code=")[1].split("&")[0]
    res = await anon_client.post(
        "/oauth/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": "https://ok.example/cb",
            "client_id": client_id,
            "code_verifier": "b" * 64,
        },
    )
    assert res.status_code == 400
    assert res.json()["error"] == "invalid_grant"


@pytest.mark.asyncio
async def test_a_code_cannot_be_redeemed_twice(anon_client, client):
    registration = await anon_client.post(
        "/oauth/register",
        json={"client_name": "X", "redirect_uris": ["https://ok.example/cb"]},
    )
    client_id = registration.json()["client_id"]
    verifier, challenge = pkce()
    approval = await client.post(
        "/oauth/authorize",
        json={
            "client_id": client_id,
            "redirect_uri": "https://ok.example/cb",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        },
    )
    code = approval.json()["redirect_to"].split("code=")[1].split("&")[0]
    form = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": "https://ok.example/cb",
        "client_id": client_id,
        "code_verifier": verifier,
    }
    assert (await anon_client.post("/oauth/token", data=form)).status_code == 200
    replay = await anon_client.post("/oauth/token", data=form)
    assert replay.status_code == 400
    assert replay.json()["error"] == "invalid_grant"


@pytest.mark.asyncio
async def test_approve_requires_a_signed_in_user(anon_client):
    registration = await anon_client.post(
        "/oauth/register",
        json={"client_name": "X", "redirect_uris": ["https://ok.example/cb"]},
    )
    client_id = registration.json()["client_id"]
    _, challenge = pkce()
    res = await anon_client.post(
        "/oauth/authorize",
        json={
            "client_id": client_id,
            "redirect_uri": "https://ok.example/cb",
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        },
    )
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_revoke_always_reports_success(anon_client, mcp_token):
    res = await anon_client.post("/oauth/revoke", data={"token": mcp_token})
    assert res.status_code == 200
    res = await anon_client.post("/oauth/revoke", data={"token": "nonsense"})
    assert res.status_code == 200

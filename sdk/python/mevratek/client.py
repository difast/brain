"""Synchronous client for the Mevratek API.

Wraps the raw HTTP endpoints so a robot integration is a few method calls
instead of hand-built requests. Requires only ``httpx``.
"""

from __future__ import annotations

import base64
from typing import Any

import httpx


class BrainError(Exception):
    """Raised when the API returns an error response."""

    def __init__(self, status_code: int, message: str) -> None:
        self.status_code = status_code
        super().__init__(f"[{status_code}] {message}")


class BrainClient:
    """A thin, typed-ish wrapper around the Mevratek API.

    Authenticate either by registering a new robot (:meth:`register`) or by
    constructing with an existing bearer ``token``.
    """

    def __init__(
        self,
        base_url: str,
        token: str | None = None,
        *,
        timeout: float = 30.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.token = token
        self._http = httpx.Client(base_url=self.base_url, timeout=timeout)

    # -- construction ----------------------------------------------------

    @classmethod
    def register(
        cls,
        base_url: str,
        *,
        name: str,
        robot_type: str,
        capabilities: list[dict[str, Any]] | None = None,
        meta: dict[str, Any] | None = None,
        timeout: float = 30.0,
    ) -> BrainClient:
        """Register a new robot and return an authenticated client."""
        client = cls(base_url, timeout=timeout)
        data = client._request(
            "POST",
            "/robots/register",
            json={
                "name": name,
                "robot_type": robot_type,
                "capabilities": capabilities or [],
                "meta": meta or {},
            },
        )
        client.token = data["token"]
        client.robot = data["robot"]
        client.api_key = data["api_key"]
        return client

    # -- robot lifecycle -------------------------------------------------

    def heartbeat(self, status: str = "online") -> dict[str, Any]:
        return self._request("POST", "/robots/heartbeat", json={"status": status})

    def decide(
        self,
        *,
        task: str,
        state: dict[str, Any] | None = None,
        image_b64: str | None = None,
        image_bytes: bytes | None = None,
        image_media_type: str = "image/jpeg",
        frame_url: str | None = None,
        task_id: str | None = None,
    ) -> dict[str, Any]:
        """Request the next decision. Returns ``{goal, confidence, actions, ...}``."""
        if image_bytes is not None and image_b64 is None:
            image_b64 = base64.b64encode(image_bytes).decode()
        body: dict[str, Any] = {"task": task, "state": state or {}}
        if image_b64:
            body["image_b64"] = image_b64
            body["image_media_type"] = image_media_type
        if frame_url:
            body["frame_url"] = frame_url
        if task_id:
            body["task_id"] = task_id
        return self._request("POST", "/brain/decision", json=body)

    def send_telemetry(
        self,
        *,
        battery: float | None = None,
        speed: float | None = None,
        x: float | None = None,
        y: float | None = None,
        z: float | None = None,
        errors: list[Any] | None = None,
        extra: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return self._request(
            "POST",
            "/telemetry",
            json={
                "battery": battery,
                "speed": speed,
                "x": x,
                "y": y,
                "z": z,
                "errors": errors or [],
                "extra": extra or {},
            },
        )

    # -- task engine -----------------------------------------------------

    def next_task(self) -> dict[str, Any] | None:
        """Pull the next queued task for this robot, or ``None`` if empty."""
        resp = self._http.request(
            "GET", "/tasks/next", headers=self._auth_headers()
        )
        if resp.status_code == 204:
            return None
        return self._handle(resp)

    def report_task_result(
        self, task_id: str, *, status: str = "completed", result: str | None = None
    ) -> dict[str, Any]:
        return self._request(
            "POST",
            f"/tasks/{task_id}/result",
            json={"status": status, "result": result},
        )

    # -- device abstraction layer ---------------------------------------

    def profile(self, robot_id: str | None = None) -> dict[str, Any]:
        """Fetch the device profile (capabilities + supported universal actions)."""
        rid = robot_id or getattr(self, "robot", {}).get("id")
        return self._request("GET", f"/robots/{rid}/profile")

    def report_execution(
        self,
        action_id: str,
        *,
        status: str = "success",
        duration_ms: int | None = None,
        error: str | None = None,
        decision_id: str | None = None,
        action_type: str | None = None,
    ) -> dict[str, Any]:
        """Report the outcome of executing a device command (DAL feedback)."""
        return self._request(
            "POST",
            "/executions",
            json={
                "action_id": action_id,
                "status": status,
                "duration_ms": duration_ms,
                "error": error,
                "decision_id": decision_id,
                "action_type": action_type,
            },
        )

    # -- internals -------------------------------------------------------

    def _auth_headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    def _request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        resp = self._http.request(
            method, path, headers=self._auth_headers(), **kwargs
        )
        return self._handle(resp)

    @staticmethod
    def _handle(resp: httpx.Response) -> dict[str, Any]:
        if resp.is_success:
            return resp.json() if resp.content else {}
        try:
            message = resp.json().get("message", resp.text)
        except Exception:  # noqa: BLE001
            message = resp.text
        raise BrainError(resp.status_code, message)

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> BrainClient:
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

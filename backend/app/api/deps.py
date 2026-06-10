"""FastAPI dependencies: shared singletons and robot authentication."""

from __future__ import annotations

from typing import Annotated

import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.exceptions import AuthError
from app.core.security import decode_robot_token
from app.services.decision_engine import DecisionEngine
from app.services.storage import FrameStorage

_bearer = HTTPBearer(auto_error=False)


def get_brain(request: Request) -> DecisionEngine:
    return request.app.state.brain


def get_storage(request: Request) -> FrameStorage:
    return request.app.state.storage


async def get_current_robot_id(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> str:
    """Authenticate the calling robot from its bearer token.

    Returns the ``robot_id`` (token subject). A robot can therefore only act
    as itself — the id is never taken from the request body.
    """
    if credentials is None or not credentials.credentials:
        raise AuthError("Missing bearer token.")
    try:
        payload = decode_robot_token(credentials.credentials)
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("Token expired.") from exc
    except jwt.PyJWTError as exc:
        raise AuthError("Invalid token.") from exc
    robot_id = payload.get("sub")
    if not robot_id:
        raise AuthError("Token missing subject.")
    return robot_id


CurrentRobotId = Annotated[str, Depends(get_current_robot_id)]

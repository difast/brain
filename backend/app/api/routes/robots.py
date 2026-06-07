"""Robot registry endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentRobotId, get_presence
from app.core.database import get_session
from app.models.robot import RobotStatus
from app.schemas.common import Page
from app.schemas.robot import (
    HeartbeatRequest,
    HeartbeatResponse,
    RobotRegisterRequest,
    RobotRegisterResponse,
    RobotResponse,
)
from app.services.cache import PresenceCache
from app.services.registry_service import RegistryService

router = APIRouter(tags=["robots"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]
PresenceDep = Annotated[PresenceCache, Depends(get_presence)]


@router.post(
    "/robots/register",
    response_model=RobotRegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new robot",
)
async def register_robot(
    payload: RobotRegisterRequest,
    session: SessionDep,
    presence: PresenceDep,
) -> RobotRegisterResponse:
    service = RegistryService(session, presence)
    robot, api_key, token = await service.register(payload)
    return RobotRegisterResponse(
        robot=RobotResponse.model_validate(robot),
        api_key=api_key,
        token=token,
    )


@router.post(
    "/robots/heartbeat",
    response_model=HeartbeatResponse,
    summary="Report liveness (authenticated as the robot)",
)
async def heartbeat(
    payload: HeartbeatRequest,
    robot_id: CurrentRobotId,
    session: SessionDep,
    presence: PresenceDep,
) -> HeartbeatResponse:
    service = RegistryService(session, presence)
    _, ack = await service.heartbeat(robot_id, payload)
    return HeartbeatResponse(
        robot_id=robot_id, status=payload.status, acknowledged_at=ack
    )


@router.get(
    "/robots",
    response_model=Page[RobotResponse],
    summary="List robots",
)
async def list_robots(
    session: SessionDep,
    presence: PresenceDep,
    status_filter: Annotated[RobotStatus | None, Query(alias="status")] = None,
    robot_type: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> Page[RobotResponse]:
    service = RegistryService(session, presence)
    robots, total = await service.list_with_presence(
        status=status_filter, robot_type=robot_type, limit=limit, offset=offset
    )
    return Page(
        items=[RobotResponse.model_validate(r) for r in robots],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/robots/{robot_id}",
    response_model=RobotResponse,
    summary="Get a robot by id",
)
async def get_robot(
    robot_id: str,
    session: SessionDep,
    presence: PresenceDep,
) -> RobotResponse:
    service = RegistryService(session, presence)
    robot = await service.get(robot_id)
    return RobotResponse.model_validate(robot)

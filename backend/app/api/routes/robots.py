"""Robot registry endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentRobotId, CurrentUser, OrgPrincipal
from app.core.database import get_session
from app.dal.translator import ActionTranslator
from app.models.robot import RobotStatus
from app.schemas.common import Page
from app.schemas.robot import (
    DeviceProfile,
    HeartbeatRequest,
    HeartbeatResponse,
    RobotRegisterRequest,
    RobotRegisterResponse,
    RobotResponse,
    RobotUpdateRequest,
)
from app.services.registry_service import RegistryService

router = APIRouter(tags=["robots"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.post(
    "/robots/register",
    response_model=RobotRegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new robot",
)
async def register_robot(
    payload: RobotRegisterRequest,
    organization_id: OrgPrincipal,
    session: SessionDep,
) -> RobotRegisterResponse:
    service = RegistryService(session)
    robot, api_key, token = await service.register(payload, organization_id)
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
) -> HeartbeatResponse:
    service = RegistryService(session)
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
    current_user: CurrentUser,
    session: SessionDep,
    status_filter: Annotated[RobotStatus | None, Query(alias="status")] = None,
    robot_type: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> Page[RobotResponse]:
    service = RegistryService(session)
    robots, total = await service.list_with_presence(
        organization_id=current_user.organization_id,
        status=status_filter,
        robot_type=robot_type,
        limit=limit,
        offset=offset,
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
    current_user: CurrentUser,
    session: SessionDep,
) -> RobotResponse:
    service = RegistryService(session)
    robot = await service.get(robot_id, organization_id=current_user.organization_id)
    return RobotResponse.model_validate(robot)


@router.patch(
    "/robots/{robot_id}",
    response_model=RobotResponse,
    summary="Update a device (rename)",
)
async def update_robot(
    robot_id: str,
    payload: RobotUpdateRequest,
    current_user: CurrentUser,
    session: SessionDep,
) -> RobotResponse:
    service = RegistryService(session)
    robot = await service.rename(
        robot_id, payload.name, organization_id=current_user.organization_id
    )
    return RobotResponse.model_validate(robot)


@router.post(
    "/robots/{robot_id}/pause",
    response_model=RobotResponse,
    summary="Pause a device (stops decisions + demo activity)",
)
async def pause_robot(
    robot_id: str, current_user: CurrentUser, session: SessionDep
) -> RobotResponse:
    service = RegistryService(session)
    robot = await service.set_paused(
        robot_id, True, organization_id=current_user.organization_id
    )
    return RobotResponse.model_validate(robot)


@router.post(
    "/robots/{robot_id}/resume",
    response_model=RobotResponse,
    summary="Resume a paused device",
)
async def resume_robot(
    robot_id: str, current_user: CurrentUser, session: SessionDep
) -> RobotResponse:
    service = RegistryService(session)
    robot = await service.set_paused(
        robot_id, False, organization_id=current_user.organization_id
    )
    return RobotResponse.model_validate(robot)


@router.get(
    "/robots/{robot_id}/profile",
    response_model=DeviceProfile,
    summary="Device profile (DAL): capabilities + supported universal actions",
)
async def device_profile(
    robot_id: str,
    current_user: CurrentUser,
    session: SessionDep,
) -> DeviceProfile:
    service = RegistryService(session)
    robot = await service.get(robot_id, organization_id=current_user.organization_id)
    return DeviceProfile(
        robot_id=robot.id,
        robot_type=robot.robot_type,
        protocol_version=robot.protocol_version,
        firmware_version=robot.firmware_version,
        capabilities=robot.capabilities,
        supported_commands=sorted(robot.command_types()),
        supported_actions=ActionTranslator.available_universal(robot.capabilities),
    )

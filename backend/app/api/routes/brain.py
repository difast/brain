"""Brain decision endpoint — the core of the platform."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentRobotId, get_brain, get_storage
from app.core.database import get_session
from app.schemas.decision import DecisionRequest, DecisionResponse
from app.services.brain_service import BrainService
from app.services.decision_engine import DecisionEngine
from app.services.storage import FrameStorage

router = APIRouter(tags=["brain"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.post(
    "/brain/decision",
    response_model=DecisionResponse,
    summary="Get the next decision for the authenticated robot",
)
async def make_decision(
    payload: DecisionRequest,
    robot_id: CurrentRobotId,
    session: SessionDep,
    brain: Annotated[DecisionEngine, Depends(get_brain)],
    storage: Annotated[FrameStorage, Depends(get_storage)],
) -> DecisionResponse:
    service = BrainService(session, brain, storage)
    decision = await service.decide(robot_id, payload)
    return DecisionResponse.model_validate(decision)

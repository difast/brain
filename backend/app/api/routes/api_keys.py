"""API key endpoints — per-user credential management."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.schemas.api_key import ApiKeyCreate, ApiKeyCreated, ApiKeyResponse
from app.services.api_key_service import ApiKeyService

router = APIRouter(tags=["api-keys"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.post(
    "/api-keys",
    response_model=ApiKeyCreated,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a new API key (the secret is shown once)",
)
async def create_api_key(
    payload: ApiKeyCreate, session: SessionDep
) -> ApiKeyCreated:
    service = ApiKeyService(session)
    api_key, raw = await service.create(payload.name)
    data = ApiKeyResponse.model_validate(api_key).model_dump()
    return ApiKeyCreated(**data, key=raw)


@router.get(
    "/api-keys",
    response_model=list[ApiKeyResponse],
    summary="List API keys (secrets are never returned)",
)
async def list_api_keys(session: SessionDep) -> list[ApiKeyResponse]:
    service = ApiKeyService(session)
    keys = await service.list()
    return [ApiKeyResponse.model_validate(k) for k in keys]


@router.delete(
    "/api-keys/{api_key_id}",
    response_model=ApiKeyResponse,
    summary="Revoke an API key",
)
async def revoke_api_key(
    api_key_id: str, session: SessionDep
) -> ApiKeyResponse:
    service = ApiKeyService(session)
    api_key = await service.revoke(api_key_id)
    return ApiKeyResponse.model_validate(api_key)

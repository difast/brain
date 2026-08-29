"""API key endpoints — per-user credential management."""

from __future__ import annotations

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, SessionDep
from app.schemas.api_key import ApiKeyCreate, ApiKeyCreated, ApiKeyResponse
from app.services.api_key_service import ApiKeyService

router = APIRouter(tags=["api-keys"])


@router.post(
    "/api-keys",
    response_model=ApiKeyCreated,
    status_code=status.HTTP_201_CREATED,
    summary="Generate a new API key (the secret is shown once)",
)
async def create_api_key(
    payload: ApiKeyCreate, current_user: CurrentUser, session: SessionDep
) -> ApiKeyCreated:
    service = ApiKeyService(session)
    api_key, raw = await service.create(payload.name, current_user.organization_id)
    data = ApiKeyResponse.model_validate(api_key).model_dump()
    return ApiKeyCreated(**data, key=raw)


@router.get(
    "/api-keys",
    response_model=list[ApiKeyResponse],
    summary="List API keys (secrets are never returned)",
)
async def list_api_keys(
    current_user: CurrentUser, session: SessionDep
) -> list[ApiKeyResponse]:
    service = ApiKeyService(session)
    keys = await service.list(organization_id=current_user.organization_id)
    return [ApiKeyResponse.model_validate(k) for k in keys]


@router.delete(
    "/api-keys/{api_key_id}",
    response_model=ApiKeyResponse,
    summary="Revoke an API key",
)
async def revoke_api_key(
    api_key_id: str, current_user: CurrentUser, session: SessionDep
) -> ApiKeyResponse:
    service = ApiKeyService(session)
    api_key = await service.revoke(
        api_key_id, organization_id=current_user.organization_id
    )
    return ApiKeyResponse.model_validate(api_key)

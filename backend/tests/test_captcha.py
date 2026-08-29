import pytest

from app.core.config import settings
from app.services.captcha_service import verify_captcha


@pytest.mark.asyncio
async def test_captcha_disabled_allows_any(monkeypatch):
    # No server key configured → captcha is disabled, any (or no) token passes.
    monkeypatch.setattr(settings, "yandex_captcha_server_key", "", raising=False)
    assert await verify_captcha(None) is True
    assert await verify_captcha("anything") is True


@pytest.mark.asyncio
async def test_captcha_enabled_requires_token(monkeypatch):
    # With a server key set, a missing token is rejected without a network call.
    monkeypatch.setattr(
        settings, "yandex_captcha_server_key", "secret-key", raising=False
    )
    assert await verify_captcha(None) is False
    assert await verify_captcha("") is False


@pytest.mark.asyncio
async def test_login_unaffected_when_captcha_disabled(client):
    # The default test config has no captcha key, so login needs no token.
    from tests.conftest import API, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD

    resp = await client.post(
        f"{API}/auth/login",
        json={"email": SEED_ADMIN_EMAIL, "password": SEED_ADMIN_PASSWORD},
    )
    assert resp.status_code == 200

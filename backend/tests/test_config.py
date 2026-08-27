import pytest

from app.core.config import _DEFAULT_SECRET_KEY, Settings


def test_production_rejects_default_secret_key():
    with pytest.raises(ValueError, match="SECRET_KEY"):
        Settings(environment="production", secret_key=_DEFAULT_SECRET_KEY)


def test_production_accepts_custom_secret_key():
    s = Settings(environment="production", secret_key="a-long-random-secret-value")
    assert s.secret_key == "a-long-random-secret-value"


def test_development_allows_default_secret_key():
    s = Settings(environment="development", secret_key=_DEFAULT_SECRET_KEY)
    assert s.secret_key == _DEFAULT_SECRET_KEY


def test_mock_when_nothing_configured():
    s = Settings(anthropic_api_key="", anthropic_base_url=None)
    assert s.use_claude_mock is True


def test_real_mode_with_direct_api_key():
    s = Settings(anthropic_api_key="sk-ant-xxx", anthropic_base_url=None)
    assert s.use_claude_mock is False


def test_real_mode_with_tunnel_only():
    # A tunnel endpoint alone (no key) must still hit the real client.
    s = Settings(anthropic_api_key="", anthropic_base_url="https://tunnel.example")
    assert s.use_claude_mock is False


def test_mock_disabled_forces_real_mode():
    s = Settings(anthropic_api_key="", anthropic_base_url=None, claude_allow_mock=False)
    assert s.use_claude_mock is False

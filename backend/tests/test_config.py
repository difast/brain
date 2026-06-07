from app.core.config import Settings


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

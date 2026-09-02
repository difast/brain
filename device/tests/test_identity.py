"""Remembering the device token between runs."""

from __future__ import annotations

from mevratek_device.identity import Identity, IdentityStore


def store(tmp_path) -> IdentityStore:
    return IdentityStore(tmp_path / "state.json")


def test_a_saved_identity_comes_back(tmp_path):
    s = store(tmp_path)
    s.save(Identity(robot_id="r1", token="t1", name="rover", api="http://a/api/v1"))

    loaded = s.load("rover", "http://a/api/v1")
    assert loaded is not None
    assert (loaded.robot_id, loaded.token) == ("r1", "t1")


def test_the_same_name_on_a_different_server_is_a_different_device(tmp_path):
    """A laptop is pointed at localhost and at production by turns."""
    s = store(tmp_path)
    s.save(Identity(robot_id="local", token="t-local", name="rover", api="http://local"))
    s.save(Identity(robot_id="prod", token="t-prod", name="rover", api="https://prod"))

    assert s.load("rover", "http://local").robot_id == "local"
    assert s.load("rover", "https://prod").robot_id == "prod"


def test_an_unknown_device_is_simply_absent(tmp_path):
    assert store(tmp_path).load("rover", "http://a") is None


def test_forgetting_makes_the_next_run_register_again(tmp_path):
    s = store(tmp_path)
    s.save(Identity(robot_id="r1", token="t1", name="rover", api="http://a"))
    s.forget("rover", "http://a")
    assert s.load("rover", "http://a") is None


def test_forgetting_something_unknown_is_harmless(tmp_path):
    store(tmp_path).forget("nobody", "http://a")


def test_a_corrupt_state_file_does_not_stop_the_device(tmp_path):
    """Registering again is a far better failure than refusing to start."""
    path = tmp_path / "state.json"
    path.write_text("{ this is not json", encoding="utf-8")

    s = IdentityStore(path)
    assert s.load("rover", "http://a") is None

    # And it recovers: the next save replaces the rubbish.
    s.save(Identity(robot_id="r1", token="t1", name="rover", api="http://a"))
    assert s.load("rover", "http://a").robot_id == "r1"


def test_a_half_written_entry_is_treated_as_absent(tmp_path):
    path = tmp_path / "state.json"
    path.write_text('{"rover@http://a": {"robot_id": "r1"}}', encoding="utf-8")
    assert IdentityStore(path).load("rover", "http://a") is None


def test_the_token_file_is_not_world_readable(tmp_path):
    """It is a credential."""
    s = store(tmp_path)
    s.save(Identity(robot_id="r1", token="t1", name="rover", api="http://a"))
    assert s.path.stat().st_mode & 0o077 == 0

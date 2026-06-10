from app.dal.translator import ActionTranslator

ARM_CAPS = [
    {"type": "arm_grasp"},
    {"type": "arm_release"},
    {"type": "camera_capture"},
    {"type": "move_forward"},
]


def test_available_universal_actions_for_arm():
    available = {a["type"] for a in ActionTranslator.available_universal(ARM_CAPS)}
    assert {"grasp", "release", "inspect", "capture", "move_forward"} <= available
    # No light capability -> light actions not offered.
    assert "light_on" not in available


def test_translate_universal_to_device_commands():
    result = ActionTranslator.translate(
        [{"type": "grasp"}, {"type": "inspect"}, {"type": "release"}], ARM_CAPS
    )
    types = [a.type for a in result.actions]
    assert types == ["arm_grasp", "camera_capture", "arm_release"]
    # Each gets a unique action_id; universal name preserved.
    assert all(a.action_id for a in result.actions)
    assert result.actions[0].universal == "grasp"
    assert not result.dropped


def test_inspect_falls_back_to_zoom_when_no_capture():
    caps = [{"type": "camera_zoom"}]
    result = ActionTranslator.translate([{"type": "inspect"}], caps)
    assert result.actions[0].type == "camera_zoom"


def test_unsupported_action_is_dropped():
    result = ActionTranslator.translate(
        [{"type": "grasp"}, {"type": "fly"}], [{"type": "arm_grasp"}]
    )
    assert [a.type for a in result.actions] == ["arm_grasp"]
    assert result.dropped == [{"type": "fly", "reason": "unsupported_by_device"}]


def test_direct_device_command_passthrough():
    result = ActionTranslator.translate(
        [{"type": "move_forward", "value": 0.5}], [{"type": "move_forward"}]
    )
    assert result.actions[0].type == "move_forward"
    assert result.actions[0].value == 0.5

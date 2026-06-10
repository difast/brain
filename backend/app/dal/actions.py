"""Universal action catalog and the device-command translation table.

The LLM only ever emits *universal* actions (e.g. ``grasp``, ``inspect``). The
Action Translator maps each to one of the candidate low-level device commands
the target device actually supports (its ``capabilities``).
"""

from __future__ import annotations

# Known low-level device commands (the vocabulary devices declare in their
# capabilities). Used for documentation and for direct pass-through.
DEVICE_COMMANDS: dict[str, str] = {
    "move_forward": "Drive forward",
    "move_backward": "Drive backward",
    "turn_left": "Turn left",
    "turn_right": "Turn right",
    "stop": "Stop all motion",
    "arm_grasp": "Close the gripper / grasp",
    "arm_release": "Open the gripper / release",
    "arm_rotate": "Rotate the arm",
    "camera_zoom": "Zoom the camera",
    "camera_capture": "Capture an image",
    "camera_pan": "Pan the camera",
    "speaker_say": "Speak via the speaker",
    "light_on": "Turn the light on",
    "light_off": "Turn the light off",
}

# Universal action -> ordered candidate device commands. The translator picks
# the first candidate the device supports.
UNIVERSAL_ACTIONS: dict[str, dict] = {
    "move_forward": {
        "description": "Move forward",
        "candidates": ["move_forward"],
    },
    "move_backward": {
        "description": "Move backward",
        "candidates": ["move_backward"],
    },
    "turn_left": {"description": "Turn left", "candidates": ["turn_left"]},
    "turn_right": {"description": "Turn right", "candidates": ["turn_right"]},
    "stop": {"description": "Stop", "candidates": ["stop"]},
    "grasp": {
        "description": "Grasp / pick up an object",
        "candidates": ["arm_grasp"],
    },
    "release": {
        "description": "Release / drop the held object",
        "candidates": ["arm_release"],
    },
    "rotate_arm": {"description": "Rotate the arm", "candidates": ["arm_rotate"]},
    "inspect": {
        "description": "Inspect an object (capture / zoom in)",
        "candidates": ["camera_capture", "camera_zoom"],
    },
    "capture": {
        "description": "Capture an image",
        "candidates": ["camera_capture"],
    },
    "zoom": {"description": "Zoom the camera", "candidates": ["camera_zoom"]},
    "look_around": {
        "description": "Pan the camera to look around",
        "candidates": ["camera_pan"],
    },
    "say": {
        "description": "Say something out loud",
        "candidates": ["speaker_say"],
    },
    "light_on": {"description": "Turn the light on", "candidates": ["light_on"]},
    "light_off": {
        "description": "Turn the light off",
        "candidates": ["light_off"],
    },
}

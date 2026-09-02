"""Where the frame comes from.

Three sources, chosen by name, all answering the same question: give me the
current JPEG, or say there isn't one.

`none` is not a degraded mode — plenty of real devices have no camera, and a
decision from telemetry alone is a first-class case. The platform's
`image_b64` field is optional precisely for that.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path


class Camera(ABC):
    @abstractmethod
    def frame(self) -> bytes | None:
        """Current JPEG bytes, or None when this device has no eyes."""

    def describe(self) -> str:
        return type(self).__name__

    def close(self) -> None:  # noqa: B027 - only a real camera holds a handle
        """Release the device. Nothing to do unless there is real hardware."""


class NoCamera(Camera):
    """For devices that see nothing — a delivery cart, a robot arm."""

    def frame(self) -> bytes | None:
        return None

    def describe(self) -> str:
        return "нет (решения по датчикам)"


class FileCamera(Camera):
    """One picture from disk, re-read every time.

    Re-read rather than cached on purpose: it makes the scene editable while
    the agent runs. Swap the file, and the next decision sees the new image —
    which is how you test "does the model actually look" without a webcam.
    """

    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)
        if not self.path.is_file():
            raise FileNotFoundError(f"кадр не найден: {self.path}")

    def frame(self) -> bytes | None:
        return self.path.read_bytes()

    def describe(self) -> str:
        return f"файл {self.path.name}"


class WebcamCamera(Camera):
    """The laptop's own camera. This is what makes the demo a demo.

    OpenCV is imported here rather than at module level so the whole agent does
    not require a 60 MB dependency to run without a camera.
    """

    def __init__(self, index: int = 0, *, quality: int = 80) -> None:
        try:
            import cv2  # noqa: PLC0415
        except ImportError as exc:  # pragma: no cover - depends on the install
            raise SystemExit(
                "Для веб-камеры нужен opencv:\n"
                "    pip install opencv-python\n"
                "Или запустите с --camera none"
            ) from exc

        self._cv2 = cv2
        self._quality = quality
        self._capture = cv2.VideoCapture(index)
        if not self._capture.isOpened():
            raise SystemExit(
                f"Камера {index} не открылась. Занята другим приложением? "
                "Попробуйте --camera none."
            )
        self._index = index

    def frame(self) -> bytes | None:
        ok, image = self._capture.read()
        if not ok:
            return None
        # Re-encoded to JPEG at a modest quality: a 4K raw frame would be a
        # multi-megabyte request for no gain in what the model can tell us.
        ok, buffer = self._cv2.imencode(
            ".jpg", image, [int(self._cv2.IMWRITE_JPEG_QUALITY), self._quality]
        )
        return buffer.tobytes() if ok else None

    def describe(self) -> str:
        return f"веб-камера #{self._index}"

    def close(self) -> None:
        self._capture.release()


def build(source: str, *, path: str | None = None, index: int = 0) -> Camera:
    """`none` | `file` | `webcam` -> a camera."""
    if source == "none":
        return NoCamera()
    if source == "file":
        if not path:
            raise SystemExit("--camera file требует --frame <путь к картинке>")
        return FileCamera(path)
    if source == "webcam":
        return WebcamCamera(index)
    raise SystemExit(f"неизвестный источник кадра: {source} (none|file|webcam)")

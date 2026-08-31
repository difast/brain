"""Domain-level exceptions and their HTTP mappings."""

from __future__ import annotations

from fastapi import status


class BrainError(Exception):
    """Base class for all application errors."""

    status_code: int = status.HTTP_400_BAD_REQUEST
    code: str = "brain_error"

    def __init__(self, message: str | None = None) -> None:
        self.message = message or self.__class__.__doc__ or "Error"
        super().__init__(self.message)


class NotFoundError(BrainError):
    """Requested resource was not found."""

    status_code = status.HTTP_404_NOT_FOUND
    code = "not_found"


class RobotNotFoundError(NotFoundError):
    """Robot with the given id does not exist."""

    code = "robot_not_found"


class AuthError(BrainError):
    """Authentication failed."""

    status_code = status.HTTP_401_UNAUTHORIZED
    code = "auth_error"


class ForbiddenError(BrainError):
    """Caller is not allowed to access this resource."""

    status_code = status.HTTP_403_FORBIDDEN
    code = "forbidden"


class ConflictError(BrainError):
    """Resource already exists or state conflict."""

    status_code = status.HTTP_409_CONFLICT
    code = "conflict"


class TooManyRequestsError(BrainError):
    """Rate limit hit — too many attempts, or asked again too soon."""

    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    code = "too_many_requests"


class ServiceUnavailableError(BrainError):
    """A dependency the request needs (e.g. the mail server) is unreachable."""

    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    code = "service_unavailable"


class BrainDecisionError(BrainError):
    """The brain failed to produce a valid decision."""

    status_code = status.HTTP_502_BAD_GATEWAY
    code = "brain_decision_error"


class InvalidCommandError(BrainError):
    """The decision references a command not supported by the robot type."""

    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    code = "invalid_command"

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class AppError(Exception):
    """Base class for expected, client-reportable errors."""

    status_code = 500
    code = "internal_error"
    message = "Something went wrong."

    def __init__(self, message: str | None = None):
        super().__init__(message or self.message)
        self.message = message or self.message


class CameraError(AppError):
    status_code = 503
    code = "camera_unavailable"
    message = "Webcam not available - check camera permission and CAMERA_INDEX."


class DetectionError(AppError):
    status_code = 500
    code = "detection_failed"
    message = "Part detection failed."


class StorageError(AppError):
    status_code = 502
    code = "storage_failed"
    message = "Could not save to the database."


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"
    message = "Resource not found."


class AuthError(AppError):
    status_code = 401
    code = "unauthorized"
    message = "Authentication required."


def _error_body(code: str, message: str, details=None) -> dict:
    body = {"error": {"code": code, "message": message}}
    if details is not None:
        body["error"]["details"] = details
    return body


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError):
        logger.warning("%s %s -> %s: %s", request.method, request.url.path, exc.code, exc.message)
        headers = {"WWW-Authenticate": "Bearer"} if isinstance(exc, AuthError) else None
        return JSONResponse(_error_body(exc.code, exc.message), status_code=exc.status_code, headers=headers)

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError):
        details = [{"field": ".".join(str(p) for p in e["loc"]), "message": e["msg"]} for e in exc.errors()]
        return JSONResponse(_error_body("validation_error", "Invalid request.", details), status_code=422)

    @app.exception_handler(Exception)
    async def handle_unexpected(request: Request, exc: Exception):
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(_error_body("internal_error", "Internal server error."), status_code=500)

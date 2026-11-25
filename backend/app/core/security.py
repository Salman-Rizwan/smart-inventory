from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth

from app.core.exceptions import AuthError

_bearer = HTTPBearer(auto_error=False)


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> dict:
    """Verify the Firebase ID token sent by the browser; returns the decoded claims."""
    if credentials is None:
        raise AuthError()
    try:
        return auth.verify_id_token(credentials.credentials)
    except Exception as exc:  # expired, revoked, malformed or wrong project
        raise AuthError("Invalid or expired token.") from exc

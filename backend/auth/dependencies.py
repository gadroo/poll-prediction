from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from models import get_db, User
from .auth import decode_token

security = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Get current user from JWT token.
    Returns None if no token or invalid token (allows anonymous access).
    """
    if not credentials:
        return None
    
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload is None:
        return None
    
    user_id: str = payload.get("sub")
    if user_id is None:
        return None
    
    try:
        user = db.query(User).filter(User.id == UUID(user_id)).first()
        return user
    except:
        return None

async def get_current_user_required(
    current_user: Optional[User] = Depends(get_current_user)
) -> User:
    """
    Require authentication. Raises 401 if not authenticated.
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return current_user

async def get_client_session_id(
    x_session_id: Optional[str] = Header(None)
) -> Optional[str]:
    """
    Extract client session ID from headers.
    """
    return x_session_id


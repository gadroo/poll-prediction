from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from .database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    # User deletion behavior:
    # - polls: CASCADE deleted (user's polls are removed)
    # - bookmarks: CASCADE deleted (user's bookmarks are removed)
    # - votes: SET NULL (votes preserved as anonymous)
    # - comments: SET NULL (comments preserved as anonymous)
    # - password_reset_tokens: CASCADE deleted (tokens are removed)
    polls = relationship("Poll", back_populates="creator")
    votes = relationship("Vote", back_populates="user")
    bookmarks = relationship("Bookmark", back_populates="user")
    comments = relationship("Comment", back_populates="user")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user")


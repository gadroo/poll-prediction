from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from .database import Base

class Bookmark(Base):
    __tablename__ = "bookmarks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    poll_id = Column(UUID(as_uuid=True), ForeignKey("polls.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    client_session_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    poll = relationship("Poll", back_populates="bookmarks")
    user = relationship("User", back_populates="bookmarks")
    
    # Constraints: Either user_id or client_session_id must be set
    __table_args__ = (
        UniqueConstraint('poll_id', 'user_id', name='unique_user_bookmark'),
        UniqueConstraint('poll_id', 'client_session_id', name='unique_session_bookmark'),
        CheckConstraint('(user_id IS NOT NULL) OR (client_session_id IS NOT NULL)', name='user_or_session_required_bookmark'),
    )

# Keep Like class for backward compatibility (alias to Bookmark)
Like = Bookmark


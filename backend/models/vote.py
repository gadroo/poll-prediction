from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
from .database import Base

class Vote(Base):
    __tablename__ = "votes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    poll_id = Column(UUID(as_uuid=True), ForeignKey("polls.id", ondelete="CASCADE"), nullable=False)
    option_id = Column(UUID(as_uuid=True), ForeignKey("options.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    client_session_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    poll = relationship("Poll", back_populates="votes")
    option = relationship("Option", back_populates="votes")
    user = relationship("User", back_populates="votes")
    
    # Constraints: Either user_id or client_session_id must be set
    __table_args__ = (
        UniqueConstraint('poll_id', 'user_id', name='unique_user_vote'),
        UniqueConstraint('poll_id', 'client_session_id', name='unique_session_vote'),
        CheckConstraint('(user_id IS NOT NULL) OR (client_session_id IS NOT NULL)', name='user_or_session_required'),
    )


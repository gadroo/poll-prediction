from sqlalchemy import Column, String, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone, timedelta
import uuid
from .database import Base

class OTP(Base):
    __tablename__ = "otps"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    email = Column(String, nullable=False, index=True)
    code = Column(String(6), nullable=False)  # 6-digit OTP code
    purpose = Column(String, nullable=False)  # 'password_reset', 'email_verification', etc.
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    attempts = Column(Integer, default=0)  # Track failed attempts
    max_attempts = Column(Integer, default=3)  # Max attempts before code expires
    used = Column(String, default=False)  # Track if OTP has been used
    
    # Relationships
    user = relationship("User", back_populates="otps")
    
    def is_expired(self):
        return datetime.now(timezone.utc) > self.expires_at
    
    def is_valid(self):
        return not self.used and not self.is_expired() and self.attempts < self.max_attempts
    
    def increment_attempts(self):
        self.attempts += 1
        return self.attempts >= self.max_attempts  # Returns True if max attempts reached

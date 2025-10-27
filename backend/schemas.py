from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

# User schemas
class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50, pattern=r'^[a-zA-Z0-9_-]+$')
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)

class UserResponse(BaseModel):
    id: UUID
    email: str
    username: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Tag schemas
class TagCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=200)

class TagResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

# Option schemas
class OptionCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)

class OptionResponse(BaseModel):
    id: UUID
    text: str
    vote_count: int
    
    class Config:
        from_attributes = True

# Poll schemas
class PollCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    options: List[OptionCreate] = Field(..., min_items=2)
    expires_at: Optional[datetime] = None
    tag_ids: Optional[List[UUID]] = None

class PollResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    creator_id: Optional[UUID]
    expires_at: Optional[datetime]
    created_at: datetime
    options: List[OptionResponse]
    bookmark_count: int
    total_votes: int
    user_has_voted: bool = False
    user_has_bookmarked: bool = False
    tags: List[TagResponse] = []
    
    class Config:
        from_attributes = True

class PollListResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    creator_id: Optional[UUID]
    created_at: datetime
    expires_at: Optional[datetime]
    total_votes: int
    bookmark_count: int
    option_count: int
    options: Optional[List[OptionResponse]] = None
    user_has_bookmarked: bool = False
    tags: List[TagResponse] = []
    
    class Config:
        from_attributes = True

# Vote schemas
class VoteCreate(BaseModel):
    option_id: UUID

class VoteResponse(BaseModel):
    id: UUID
    poll_id: UUID
    option_id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True

# Bookmark schemas
class BookmarkResponse(BaseModel):
    poll_id: UUID
    bookmark_count: int
    user_has_bookmarked: bool

# Legacy alias for backward compatibility
LikeResponse = BookmarkResponse

# Comment schemas
class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    parent_id: Optional[UUID] = None  # For threaded replies

class CommentUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)

class CommentResponse(BaseModel):
    id: UUID
    poll_id: UUID
    user_id: Optional[UUID]
    content: str
    parent_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime
    user_email: Optional[str] = None  # For display purposes (deprecated)
    username: Optional[str] = None  # Display username instead of email
    reply_count: int = 0
    
    class Config:
        from_attributes = True


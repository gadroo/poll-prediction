from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID

from models import get_db, User, Poll, Comment
from schemas import CommentCreate, CommentUpdate, CommentResponse
from auth.dependencies import get_current_user, get_client_session_id
from websocket.manager import manager

router = APIRouter(prefix="/api/polls", tags=["comments"])

@router.get("/{poll_id}/comments", response_model=List[CommentResponse])
async def get_comments(
    poll_id: UUID,
    db: Session = Depends(get_db),
    parent_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100
):
    """Get comments for a poll (optionally filtered by parent_id for replies)"""
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    query = db.query(Comment).filter(Comment.poll_id == poll_id)
    
    if parent_id:
        # Get replies to a specific comment
        query = query.filter(Comment.parent_id == parent_id)
    else:
        # Get top-level comments only
        query = query.filter(Comment.parent_id.is_(None))
    
    comments = query.order_by(Comment.created_at.desc()).offset(skip).limit(limit).all()
    
    # Build response with user info and reply counts
    result = []
    for comment in comments:
        reply_count = db.query(func.count(Comment.id)).filter(
            Comment.parent_id == comment.id
        ).scalar()
        
        user_email = comment.user.email if comment.user else "Anonymous"
        username = comment.user.username if comment.user else "Anonymous"
        
        result.append(CommentResponse(
            id=comment.id,
            poll_id=comment.poll_id,
            user_id=comment.user_id,
            content=comment.content,
            parent_id=comment.parent_id,
            created_at=comment.created_at,
            updated_at=comment.updated_at,
            user_email=user_email,
            username=username,
            reply_count=reply_count or 0
        ))
    
    return result

@router.post("/{poll_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    poll_id: UUID,
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
    session_id: Optional[str] = Depends(get_client_session_id)
):
    """Create a new comment on a poll"""
    # Verify poll exists
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    # Verify parent comment exists if replying
    if comment_data.parent_id:
        parent = db.query(Comment).filter(
            Comment.id == comment_data.parent_id,
            Comment.poll_id == poll_id
        ).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")
    
    # Create comment
    new_comment = Comment(
        poll_id=poll_id,
        user_id=current_user.id if current_user else None,
        client_session_id=session_id if not current_user else None,
        content=comment_data.content,
        parent_id=comment_data.parent_id
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    
    user_email = new_comment.user.email if new_comment.user else "Anonymous"
    username = new_comment.user.username if new_comment.user else "Anonymous"
    
    # Broadcast new comment via WebSocket
    await manager.broadcast_to_poll(
        str(poll_id),
        {
            "type": "comment_added",
            "poll_id": str(poll_id),
            "comment": {
                "id": str(new_comment.id),
                "content": new_comment.content,
                "user_email": user_email,
                "username": username,
                "created_at": new_comment.created_at.isoformat()
            }
        }
    )
    
    return CommentResponse(
        id=new_comment.id,
        poll_id=new_comment.poll_id,
        user_id=new_comment.user_id,
        content=new_comment.content,
        parent_id=new_comment.parent_id,
        created_at=new_comment.created_at,
        updated_at=new_comment.updated_at,
        user_email=user_email,
        username=username,
        reply_count=0
    )

@router.put("/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: UUID,
    comment_data: CommentUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
    session_id: Optional[str] = Depends(get_client_session_id)
):
    """Update a comment (only by the creator)"""
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Check authorization
    if current_user:
        if comment.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to update this comment")
    elif session_id:
        if comment.client_session_id != session_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this comment")
    else:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Update comment
    comment.content = comment_data.content
    db.commit()
    db.refresh(comment)
    
    user_email = comment.user.email if comment.user else "Anonymous"
    username = comment.user.username if comment.user else "Anonymous"
    reply_count = db.query(func.count(Comment.id)).filter(
        Comment.parent_id == comment.id
    ).scalar()
    
    return CommentResponse(
        id=comment.id,
        poll_id=comment.poll_id,
        user_id=comment.user_id,
        content=comment.content,
        parent_id=comment.parent_id,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        user_email=user_email,
        username=username,
        reply_count=reply_count or 0
    )

@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
    session_id: Optional[str] = Depends(get_client_session_id)
):
    """Delete a comment (only by the creator)"""
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Check authorization
    if current_user:
        if comment.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
    elif session_id:
        if comment.client_session_id != session_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
    else:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    poll_id = comment.poll_id
    db.delete(comment)
    db.commit()
    
    # Broadcast deletion via WebSocket
    await manager.broadcast_to_poll(
        str(poll_id),
        {
            "type": "comment_deleted",
            "poll_id": str(poll_id),
            "comment_id": str(comment_id)
        }
    )
    
    return None


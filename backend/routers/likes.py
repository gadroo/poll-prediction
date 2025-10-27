from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from uuid import UUID

from models import get_db, User, Poll, Bookmark, Vote, Tag
from schemas import BookmarkResponse, PollListResponse, OptionResponse, TagResponse
from auth.dependencies import get_current_user, get_client_session_id
from websocket.manager import manager

router = APIRouter(prefix="/api/polls", tags=["bookmarks"])

@router.get("/bookmarks", response_model=List[PollListResponse])
async def get_user_bookmarks(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
    session_id: Optional[str] = Depends(get_client_session_id),
    skip: int = 0,
    limit: int = 100
):
    """Get all polls bookmarked by the current user"""
    # Get bookmarked poll IDs
    if current_user:
        bookmarks = db.query(Bookmark).filter(
            Bookmark.user_id == current_user.id
        ).all()
    elif session_id:
        bookmarks = db.query(Bookmark).filter(
            Bookmark.client_session_id == session_id
        ).all()
    else:
        return []
    
    if not bookmarks:
        return []
    
    # Get poll IDs from bookmarks
    poll_ids = [bookmark.poll_id for bookmark in bookmarks]
    
    # Fetch polls
    polls = db.query(Poll).filter(
        Poll.id.in_(poll_ids)
    ).order_by(Poll.created_at.desc()).offset(skip).limit(limit).all()
    
    # Build response
    result = []
    for poll in polls:
        total_votes = db.query(func.count(Vote.id)).filter(Vote.poll_id == poll.id).scalar()
        bookmark_count = db.query(func.count(Bookmark.id)).filter(Bookmark.poll_id == poll.id).scalar()
        option_count = len(poll.options)
        
        # Include options with vote counts for visual display
        options_response = [
            OptionResponse(
                id=option.id,
                text=option.text,
                vote_count=option.vote_count
            )
            for option in poll.options
        ]
        
        result.append(PollListResponse(
            id=poll.id,
            title=poll.title,
            description=poll.description,
            creator_id=poll.creator_id,
            created_at=poll.created_at,
            expires_at=poll.expires_at,
            total_votes=total_votes or 0,
            bookmark_count=bookmark_count or 0,
            option_count=option_count,
            options=options_response,
            user_has_bookmarked=True,  # Always true in bookmarks view
            tags=[
                TagResponse(
                    id=tag.id,
                    name=tag.name,
                    slug=tag.slug,
                    description=tag.description,
                    created_at=tag.created_at
                )
                for tag in poll.tags
            ]
        ))
    
    return result

@router.post("/{poll_id}/bookmark", response_model=BookmarkResponse)
async def toggle_bookmark(
    poll_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
    session_id: Optional[str] = Depends(get_client_session_id)
):
    """Toggle bookmark on a poll"""
    # Verify poll exists
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    # Check if user already bookmarked
    existing_bookmark = None
    if current_user:
        existing_bookmark = db.query(Bookmark).filter(
            Bookmark.poll_id == poll_id,
            Bookmark.user_id == current_user.id
        ).first()
    elif session_id:
        existing_bookmark = db.query(Bookmark).filter(
            Bookmark.poll_id == poll_id,
            Bookmark.client_session_id == session_id
        ).first()
    else:
        raise HTTPException(status_code=400, detail="User identification required")
    
    user_has_bookmarked = False
    if existing_bookmark:
        # Remove bookmark
        db.delete(existing_bookmark)
        user_has_bookmarked = False
    else:
        # Add bookmark
        new_bookmark = Bookmark(
            poll_id=poll_id,
            user_id=current_user.id if current_user else None,
            client_session_id=session_id if not current_user else None
        )
        db.add(new_bookmark)
        user_has_bookmarked = True
    
    db.commit()
    
    # Get updated bookmark count
    bookmark_count = db.query(func.count(Bookmark.id)).filter(Bookmark.poll_id == poll_id).scalar()
    
    # Broadcast bookmark update via WebSocket
    await manager.broadcast_to_poll(
        str(poll_id),
        {
            "type": "bookmark_update",
            "poll_id": str(poll_id),
            "bookmark_count": bookmark_count or 0
        }
    )
    
    return BookmarkResponse(
        poll_id=poll_id,
        bookmark_count=bookmark_count or 0,
        user_has_bookmarked=user_has_bookmarked
    )

@router.get("/{poll_id}/bookmarks", response_model=BookmarkResponse)
async def get_bookmarks(
    poll_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
    session_id: Optional[str] = Depends(get_client_session_id)
):
    """Get bookmark count and user's bookmark status for a poll"""
    # Verify poll exists
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    # Get bookmark count
    bookmark_count = db.query(func.count(Bookmark.id)).filter(Bookmark.poll_id == poll_id).scalar()
    
    # Check if user has bookmarked
    user_has_bookmarked = False
    if current_user:
        bookmark = db.query(Bookmark).filter(
            Bookmark.poll_id == poll_id,
            Bookmark.user_id == current_user.id
        ).first()
        user_has_bookmarked = bookmark is not None
    elif session_id:
        bookmark = db.query(Bookmark).filter(
            Bookmark.poll_id == poll_id,
            Bookmark.client_session_id == session_id
        ).first()
        user_has_bookmarked = bookmark is not None
    
    return BookmarkResponse(
        poll_id=poll_id,
        bookmark_count=bookmark_count or 0,
        user_has_bookmarked=user_has_bookmarked
    )

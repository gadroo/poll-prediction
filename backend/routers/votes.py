from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone

from models import get_db, User, Poll, Option, Vote
from schemas import VoteCreate, VoteResponse, OptionResponse
from auth.dependencies import get_current_user, get_client_session_id
from websocket.manager import manager

router = APIRouter(prefix="/api/polls", tags=["votes"])

@router.post("/{poll_id}/vote", response_model=VoteResponse)
async def submit_vote(
    poll_id: UUID,
    vote_data: VoteCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
    session_id: Optional[str] = Depends(get_client_session_id)
):
    """Submit a vote for a poll"""
    # Verify poll exists
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    # Check if poll is expired
    if poll.expires_at and poll.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Poll has expired")
    
    # Verify option belongs to poll
    option = db.query(Option).filter(
        Option.id == vote_data.option_id,
        Option.poll_id == poll_id
    ).first()
    if not option:
        raise HTTPException(status_code=404, detail="Option not found in this poll")
    
    # Check if user already voted
    if current_user:
        existing_vote = db.query(Vote).filter(
            Vote.poll_id == poll_id,
            Vote.user_id == current_user.id
        ).first()
        if existing_vote:
            raise HTTPException(status_code=400, detail="You have already voted on this poll")
    elif session_id:
        existing_vote = db.query(Vote).filter(
            Vote.poll_id == poll_id,
            Vote.client_session_id == session_id
        ).first()
        if existing_vote:
            raise HTTPException(status_code=400, detail="You have already voted on this poll")
    else:
        raise HTTPException(status_code=400, detail="User identification required")
    
    # Create vote
    new_vote = Vote(
        poll_id=poll_id,
        option_id=vote_data.option_id,
        user_id=current_user.id if current_user else None,
        client_session_id=session_id if not current_user else None
    )
    
    try:
        db.add(new_vote)
        
        # Increment vote count on option
        option.vote_count += 1
        
        db.commit()
        db.refresh(new_vote)
        
        # Broadcast vote update via WebSocket
        options_data = [
            {"id": str(opt.id), "text": opt.text, "vote_count": opt.vote_count}
            for opt in poll.options
        ]
        await manager.broadcast_to_poll(
            str(poll_id),
            {
                "type": "vote_update",
                "poll_id": str(poll_id),
                "options": options_data
            }
        )
        
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="You have already voted on this poll")
    
    return VoteResponse(
        id=new_vote.id,
        poll_id=new_vote.poll_id,
        option_id=new_vote.option_id,
        created_at=new_vote.created_at
    )

@router.get("/{poll_id}/user-vote")
async def get_user_vote(
    poll_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
    session_id: Optional[str] = Depends(get_client_session_id)
):
    """Check if user has voted and which option they chose"""
    vote = None
    
    if current_user:
        vote = db.query(Vote).filter(
            Vote.poll_id == poll_id,
            Vote.user_id == current_user.id
        ).first()
    elif session_id:
        vote = db.query(Vote).filter(
            Vote.poll_id == poll_id,
            Vote.client_session_id == session_id
        ).first()
    
    if not vote:
        return {"has_voted": False, "option_id": None}
    
    return {"has_voted": True, "option_id": str(vote.option_id)}


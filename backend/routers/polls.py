from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID
from datetime import datetime, timezone, timedelta

from models import get_db, User, Poll, Option, Vote, Bookmark, Tag
from schemas import PollCreate, PollResponse, PollListResponse, OptionResponse, TagResponse
from auth.dependencies import get_current_user, get_current_user_required, get_client_session_id
from websocket.manager import manager

router = APIRouter(prefix="/api/polls", tags=["polls"])

_timeseries_cache: Dict[Tuple[str, int, str, Optional[str], Optional[str]], Tuple[float, Dict[str, Any]]] = {}

def _apply_moving_average(values: List[float], window: int) -> List[float]:
    if window <= 1 or not values:
        return values
    half = window // 2
    smoothed: List[float] = []
    for i in range(len(values)):
        start = max(0, i - half)
        end = min(len(values), i + half + 1)
        segment = values[start:end]
        smoothed.append(sum(segment) / len(segment))
    return smoothed

def _apply_ema(values: List[float], window: int) -> List[float]:
    if window <= 1 or not values:
        return values
    alpha = 2 / (window + 1)
    result: List[float] = []
    prev = values[0]
    for v in values:
        prev = alpha * v + (1 - alpha) * prev
        result.append(prev)
    return result

@router.get("/{poll_id}/timeseries")
async def get_poll_timeseries(
    poll_id: UUID,
    db: Session = Depends(get_db),
    points: int = Query(120, ge=10, le=200),
    metric: str = Query("percent", pattern="^(percent|count)$"),
    from_ts: Optional[str] = Query(None, alias="from"),
    to_ts: Optional[str] = Query(None, alias="to"),
    smooth: Optional[str] = Query(None, pattern="^(ma|ema)$"),
    window: int = Query(3, ge=2, le=25),
):
    """Return sampled timeseries for a poll options: each option's count/percent over time.
    Response shape:
      { "series": [{ id, label, data: [{x,y}] }], "meta": { optionIdToLabel, optionIdToColor } }
    """
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")

    # Determine time range
    def _parse_ts(value: str) -> datetime:
        # Support ISO strings with trailing 'Z' and ensure tz-aware UTC
        try:
            cleaned = value.replace('Z', '+00:00')
            dt = datetime.fromisoformat(cleaned)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid timestamp format; use ISO 8601")
    start_time = poll.created_at
    if from_ts:
        start_time = _parse_ts(from_ts)
    end_time = datetime.now(timezone.utc)
    if poll.expires_at and poll.expires_at < end_time:
        end_time = poll.expires_at
    if to_ts:
        end_time = min(end_time, _parse_ts(to_ts))
    if not (start_time and end_time) or start_time >= end_time:
        # Degenerate range; return flat zeros
        start_time = end_time - timedelta(seconds=points - 1)

    # Cache key
    cache_key = (str(poll_id), points, metric, from_ts, to_ts)
    now_epoch = datetime.now(timezone.utc).timestamp()
    cached = _timeseries_cache.get(cache_key)
    if cached and now_epoch - cached[0] < 5:
        return cached[1]

    # Prepare options
    options = poll.options
    option_ids = [str(opt.id) for opt in options]
    id_to_label = {str(opt.id): opt.text for opt in options}

    # Fetch votes ordered by time
    votes = db.query(Vote).filter(Vote.poll_id == poll_id).order_by(Vote.created_at.asc()).all()

    # Build sample timestamps
    total_seconds = (end_time - start_time).total_seconds()
    step = total_seconds / (points - 1) if points > 1 else total_seconds
    ts_list: List[datetime] = [start_time + timedelta(seconds=step * i) for i in range(points)]

    # Cumulative counts per option at each sample
    counts = {opt_id: 0 for opt_id in option_ids}
    series_counts: Dict[str, List[int]] = {opt_id: [0] * points for opt_id in option_ids}
    vote_idx = 0
    for i, t in enumerate(ts_list):
        while vote_idx < len(votes) and votes[vote_idx].created_at <= t:
            counts[str(votes[vote_idx].option_id)] = counts.get(str(votes[vote_idx].option_id), 0) + 1
            vote_idx += 1
        for opt_id in option_ids:
            series_counts[opt_id][i] = counts.get(opt_id, 0)

    # Convert to metric
    series_data: List[Dict[str, Any]] = []
    for opt_id in option_ids:
        values = [float(v) for v in series_counts[opt_id]]
        if metric == "percent":
            totals = [sum(series_counts[oid][i] for oid in option_ids) for i in range(points)]
            percents = [ (values[i] / totals[i] * 100.0) if totals[i] > 0 else 0.0 for i in range(points) ]
            values = percents
        # Smoothing
        if smooth == "ma":
            values = _apply_moving_average(values, window)
        elif smooth == "ema":
            values = _apply_ema(values, window)
        series_data.append({
            "id": id_to_label.get(opt_id, opt_id),
            "label": id_to_label.get(opt_id, opt_id),
            "data": [{"x": ts_list[i].isoformat(), "y": round(values[i], 4)} for i in range(points)]
        })

    response = {
        "series": series_data,
        "meta": {
            "optionIdToLabel": id_to_label,
        }
    }
    _timeseries_cache[cache_key] = (now_epoch, response)
    return response

@router.get("/mine", response_model=List[PollListResponse])
async def list_my_polls(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required),
    skip: int = 0,
    limit: int = 100
):
    """List polls created by the current authenticated user"""
    polls = db.query(Poll).filter(Poll.creator_id == current_user.id).order_by(Poll.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for poll in polls:
        total_votes = db.query(func.count(Vote.id)).filter(Vote.poll_id == poll.id).scalar()
        bookmark_count = db.query(func.count(Bookmark.id)).filter(Bookmark.poll_id == poll.id).scalar()
        option_count = len(poll.options)

        # Check if current user has bookmarked this poll
        user_has_bookmarked = db.query(Bookmark).filter(
            Bookmark.poll_id == poll.id,
            Bookmark.user_id == current_user.id
        ).first() is not None

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
            user_has_bookmarked=user_has_bookmarked,
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

# backend/routers/polls.py
@router.get("", response_model=List[PollListResponse])
async def list_polls(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    status: Optional[str] = None,  # 'active', 'closed', or None for all
    tag: Optional[str] = None,  # Filter by tag slug
    sort: Optional[str] = None  # 'newest', 'oldest', 'most_voted', 'trending'
):
    """List all polls with optional search, filter, and sort"""
    query = db.query(Poll)
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Poll.title.ilike(search_term)) | 
            (Poll.description.ilike(search_term))
        )
    
    # Apply status filter
    if status == 'active':
        query = query.filter(
            (Poll.expires_at.is_(None)) | 
            (Poll.expires_at > datetime.now(timezone.utc))
        )
    elif status == 'closed':
        query = query.filter(
            (Poll.expires_at.isnot(None)) & 
            (Poll.expires_at <= datetime.now(timezone.utc))
        )
    
    # Apply tag filter
    if tag:
        query = query.join(Poll.tags).filter(Tag.slug == tag)
    
    # Apply sorting
    if sort == 'oldest':
        query = query.order_by(Poll.created_at.asc())
    elif sort == 'most_voted':
        # Subquery to count votes per poll
        vote_count_subq = db.query(
            Vote.poll_id,
            func.count(Vote.id).label('vote_count')
        ).group_by(Vote.poll_id).subquery()
        
        query = query.outerjoin(
            vote_count_subq, 
            Poll.id == vote_count_subq.c.poll_id
        ).order_by(func.coalesce(vote_count_subq.c.vote_count, 0).desc())
    elif sort == 'trending':
        # Trending: most votes in last 24 hours
        recent_time = datetime.now(timezone.utc) - timedelta(hours=24)
        vote_count_subq = db.query(
            Vote.poll_id,
            func.count(Vote.id).label('recent_vote_count')
        ).filter(Vote.created_at >= recent_time).group_by(Vote.poll_id).subquery()
        
        query = query.outerjoin(
            vote_count_subq,
            Poll.id == vote_count_subq.c.poll_id
        ).order_by(func.coalesce(vote_count_subq.c.recent_vote_count, 0).desc())
    else:  # Default: newest
        query = query.order_by(Poll.created_at.desc())
    
    polls = query.offset(skip).limit(limit).all()
    
    result = []
    for poll in polls:
        total_votes = db.query(func.count(Vote.id)).filter(Vote.poll_id == poll.id).scalar()
        bookmark_count = db.query(func.count(Bookmark.id)).filter(Bookmark.poll_id == poll.id).scalar()
        option_count = len(poll.options)
        
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

@router.get("/{poll_id}", response_model=PollResponse)
async def get_poll(
    poll_id: UUID,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
    session_id: Optional[str] = Depends(get_client_session_id)
):
    """Get poll details with options and vote counts"""
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    # Check if poll is expired
    if poll.expires_at and poll.expires_at < datetime.now(timezone.utc):
        is_expired = True
    else:
        is_expired = False
    
    # Get vote counts for options
    options_response = [
        OptionResponse(
            id=option.id,
            text=option.text,
            vote_count=option.vote_count
        )
        for option in poll.options
    ]
    
    # Check if user has voted
    user_has_voted = False
    if current_user:
        vote = db.query(Vote).filter(
            Vote.poll_id == poll_id,
            Vote.user_id == current_user.id
        ).first()
        user_has_voted = vote is not None
    elif session_id:
        vote = db.query(Vote).filter(
            Vote.poll_id == poll_id,
            Vote.client_session_id == session_id
        ).first()
        user_has_voted = vote is not None
    
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
    
    # Get bookmark count and total votes
    bookmark_count = db.query(func.count(Bookmark.id)).filter(Bookmark.poll_id == poll_id).scalar()
    total_votes = db.query(func.count(Vote.id)).filter(Vote.poll_id == poll_id).scalar()
    
    return PollResponse(
        id=poll.id,
        title=poll.title,
        description=poll.description,
        creator_id=poll.creator_id,
        expires_at=poll.expires_at,
        created_at=poll.created_at,
        options=options_response,
        bookmark_count=bookmark_count or 0,
        total_votes=total_votes or 0,
        user_has_voted=user_has_voted,
        user_has_bookmarked=user_has_bookmarked,
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
    )

@router.post("", response_model=PollResponse, status_code=status.HTTP_201_CREATED)
async def create_poll(
    poll_data: PollCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """Create a new poll (authenticated users only)"""
    # Create poll
    new_poll = Poll(
        title=poll_data.title,
        description=poll_data.description,
        creator_id=current_user.id,
        expires_at=poll_data.expires_at
    )
    db.add(new_poll)
    db.flush()  # Get poll ID without committing
    
    # Create options
    for option_data in poll_data.options:
        option = Option(
            poll_id=new_poll.id,
            text=option_data.text,
            vote_count=0
        )
        db.add(option)
    
    # Add tags if provided
    if poll_data.tag_ids:
        tags = db.query(Tag).filter(Tag.id.in_(poll_data.tag_ids)).all()
        new_poll.tags = tags
    
    db.commit()
    db.refresh(new_poll)
    
    # Return poll response
    return PollResponse(
        id=new_poll.id,
        title=new_poll.title,
        description=new_poll.description,
        creator_id=new_poll.creator_id,
        expires_at=new_poll.expires_at,
        created_at=new_poll.created_at,
        options=[
            OptionResponse(id=opt.id, text=opt.text, vote_count=opt.vote_count)
            for opt in new_poll.options
        ],
        bookmark_count=0,
        total_votes=0,
        user_has_voted=False,
        user_has_bookmarked=False,
        tags=[
            TagResponse(
                id=tag.id,
                name=tag.name,
                slug=tag.slug,
                description=tag.description,
                created_at=tag.created_at
            )
            for tag in new_poll.tags
        ]
    )

@router.delete("/{poll_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_poll(
    poll_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """Delete a poll (owner only)"""
    poll = db.query(Poll).filter(Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    if poll.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this poll"
        )
    
    db.delete(poll)
    db.commit()
    # Broadcast deletion to specific poll channel and global list channel
    await manager.broadcast_to_poll(str(poll_id), {"type": "poll_deleted", "poll_id": str(poll_id)})
    return None


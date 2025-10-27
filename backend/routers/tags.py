from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
import re

from models import get_db, Tag
from schemas import TagCreate, TagResponse
from auth.dependencies import get_current_user_required

router = APIRouter(prefix="/api/tags", tags=["tags"])

def slugify(text: str) -> str:
    """Convert text to URL-friendly slug"""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text

@router.get("", response_model=List[TagResponse])
async def list_tags(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """List all available tags"""
    tags = db.query(Tag).order_by(Tag.name).offset(skip).limit(limit).all()
    return tags

@router.get("/{tag_id}", response_model=TagResponse)
async def get_tag(
    tag_id: UUID,
    db: Session = Depends(get_db)
):
    """Get a specific tag by ID"""
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag

@router.get("/slug/{slug}", response_model=TagResponse)
async def get_tag_by_slug(
    slug: str,
    db: Session = Depends(get_db)
):
    """Get a specific tag by slug"""
    tag = db.query(Tag).filter(Tag.slug == slug).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag

@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    tag_data: TagCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_required)
):
    """Create a new tag (authenticated users only)"""
    # Generate slug from name
    slug = slugify(tag_data.name)
    
    # Check if tag with same name or slug already exists
    existing_tag = db.query(Tag).filter(
        (Tag.name == tag_data.name) | (Tag.slug == slug)
    ).first()
    
    if existing_tag:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tag with this name already exists"
        )
    
    # Create new tag
    new_tag = Tag(
        name=tag_data.name,
        slug=slug,
        description=tag_data.description
    )
    db.add(new_tag)
    db.commit()
    db.refresh(new_tag)
    
    return new_tag

@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_required)
):
    """Delete a tag (authenticated users only)"""
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    db.delete(tag)
    db.commit()
    return None


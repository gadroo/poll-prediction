from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from uuid import UUID

from models import get_db, Poll
from .manager import manager

router = APIRouter()

@router.websocket("/ws/{poll_id}")
async def websocket_endpoint(websocket: WebSocket, poll_id: str, db: Session = Depends(get_db)):
    """WebSocket endpoint for real-time poll updates"""
    # Allow a global channel 'all' for list pages; otherwise verify poll exists
    if poll_id != 'all':
        try:
            poll_uuid = UUID(poll_id)
            poll = db.query(Poll).filter(Poll.id == poll_uuid).first()
            if not poll:
                await websocket.close(code=1008, reason="Poll not found")
                return
        except ValueError:
            await websocket.close(code=1008, reason="Invalid poll ID")
            return
    
    # Connect client
    await manager.connect(websocket, poll_id)
    
    try:
        # Keep connection alive and listen for messages
        while True:
            # Receive messages (ping/pong for keep-alive)
            data = await websocket.receive_text()
            # Echo back to confirm connection is alive
            await websocket.send_json({"type": "pong", "message": "Connection alive"})
    except WebSocketDisconnect:
        manager.disconnect(websocket, poll_id)
    except Exception as e:
        manager.disconnect(websocket, poll_id)


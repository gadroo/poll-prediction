from typing import Dict, Set
from fastapi import WebSocket
import json

class ConnectionManager:
    def __init__(self):
        # Map poll_id to set of active WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, poll_id: str):
        """Connect a client to a specific poll's WebSocket"""
        await websocket.accept()
        if poll_id not in self.active_connections:
            self.active_connections[poll_id] = set()
        self.active_connections[poll_id].add(websocket)
    
    def disconnect(self, websocket: WebSocket, poll_id: str):
        """Disconnect a client from a poll's WebSocket"""
        if poll_id in self.active_connections:
            self.active_connections[poll_id].discard(websocket)
            if not self.active_connections[poll_id]:
                del self.active_connections[poll_id]
    
    async def broadcast_to_poll(self, poll_id: str, message: dict):
        """Broadcast a message to all clients connected to a specific poll"""
        if poll_id in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[poll_id]:
                try:
                    await connection.send_json(message)
                except:
                    disconnected.add(connection)
            for connection in disconnected:
                self.active_connections[poll_id].discard(connection)

        # Also broadcast to global listeners (list pages)
        if 'all' in self.active_connections:
            disconnected = set()
            for connection in self.active_connections['all']:
                try:
                    await connection.send_json(message)
                except:
                    disconnected.add(connection)
            for connection in disconnected:
                self.active_connections['all'].discard(connection)

# Global connection manager instance
manager = ConnectionManager()


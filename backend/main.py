from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from models import init_db
from routers import auth, polls, votes, likes, tags, comments
from websocket import handler as ws_handler

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database
    try:
        print("Starting database initialization...")
        init_db()
        print("Database initialization completed successfully")
    except Exception as e:
        print(f"Database initialization failed: {e}")
        print("Continuing without database...")
    yield
    # Shutdown: cleanup if needed

app = FastAPI(
    title="QuickPoll API",
    description="Real-time opinion polling platform",
    version="1.0.0",
    lifespan=lifespan
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers (order matters: register specific routes before generic /{poll_id})
app.include_router(auth.router)
app.include_router(tags.router)
app.include_router(comments.router)  # /api/polls/{poll_id}/comments
app.include_router(likes.router)  # /api/polls/bookmarks, /{poll_id}/bookmark, etc.
app.include_router(polls.router)  # /api/polls and /api/polls/{poll_id}
app.include_router(votes.router)
app.include_router(ws_handler.router)

@app.get("/")
async def root():
    print("Root endpoint called")
    return {
        "message": "QuickPoll API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    print("Health check endpoint called")
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


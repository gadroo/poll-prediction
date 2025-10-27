"""
Optional Redis caching layer
The application works fine without Redis, but will use caching if Redis is available
"""

import json
from typing import Optional, Any
import os

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

class CacheManager:
    """Optional Redis cache manager that gracefully degrades if Redis is not available"""
    
    def __init__(self):
        self.redis_client = None
        self.enabled = False
        
        if REDIS_AVAILABLE:
            redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
            try:
                self.redis_client = redis.from_url(redis_url, decode_responses=True)
                # Test connection
                self.redis_client.ping()
                self.enabled = True
                print("✓ Redis cache enabled")
            except Exception as e:
                print(f"⚠ Redis not available: {e}. Running without cache.")
                self.enabled = False
        else:
            print("⚠ Redis package not installed. Running without cache.")
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.enabled:
            return None
        
        try:
            value = self.redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            print(f"Cache get error: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        """Set value in cache with TTL in seconds (default 5 minutes)"""
        if not self.enabled:
            return False
        
        try:
            serialized = json.dumps(value)
            self.redis_client.setex(key, ttl, serialized)
            return True
        except Exception as e:
            print(f"Cache set error: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if not self.enabled:
            return False
        
        try:
            self.redis_client.delete(key)
            return True
        except Exception as e:
            print(f"Cache delete error: {e}")
            return False
    
    def delete_pattern(self, pattern: str) -> bool:
        """Delete all keys matching pattern"""
        if not self.enabled:
            return False
        
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
            return True
        except Exception as e:
            print(f"Cache delete pattern error: {e}")
            return False

# Global cache instance
cache = CacheManager()

# Cache key generators
def poll_cache_key(poll_id: str) -> str:
    return f"poll:{poll_id}"

def polls_list_cache_key(skip: int = 0, limit: int = 100, **filters) -> str:
    filter_str = "_".join(f"{k}:{v}" for k, v in sorted(filters.items()) if v)
    return f"polls:list:{skip}:{limit}:{filter_str}"

def poll_comments_cache_key(poll_id: str, parent_id: Optional[str] = None) -> str:
    parent_str = parent_id or "top"
    return f"comments:poll:{poll_id}:parent:{parent_str}"

def tags_cache_key() -> str:
    return "tags:all"

# Cache invalidation helpers
def invalidate_poll_caches(poll_id: str):
    """Invalidate all caches related to a poll"""
    cache.delete(poll_cache_key(poll_id))
    cache.delete_pattern(f"polls:list:*")  # Invalidate list caches
    cache.delete_pattern(f"comments:poll:{poll_id}:*")  # Invalidate comment caches


"""
Database optimization script - Adds indexes to improve query performance
Run this once after setting up the database
"""

from models import Base, Poll, Option, Vote, Bookmark, Comment, Tag
from models.database import engine
from sqlalchemy import text

def add_indexes():
    """Add indexes to improve query performance"""
    with engine.connect() as conn:
        # Indexes are already defined in models for most foreign keys
        # SQLAlchemy auto-creates indexes for foreign keys and unique constraints
        
        # Additional composite indexes for common queries
        try:
            # Index for filtering active/closed polls
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_polls_expires_at_created_at 
                ON polls(expires_at, created_at DESC);
            """))
            print("✓ Created index on polls(expires_at, created_at)")
            
            # Index for vote counting queries
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_votes_poll_created 
                ON votes(poll_id, created_at);
            """))
            print("✓ Created index on votes(poll_id, created_at)")
            
            # Index for bookmark queries
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_bookmarks_user_poll 
                ON bookmarks(user_id, poll_id);
            """))
            print("✓ Created index on bookmarks(user_id, poll_id)")
            
            # Index for comment queries with parent filtering
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_comments_poll_parent 
                ON comments(poll_id, parent_id, created_at DESC);
            """))
            print("✓ Created index on comments(poll_id, parent_id, created_at)")
            
            # Index for tag-based poll filtering
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_poll_tags_tag 
                ON poll_tags(tag_id, poll_id);
            """))
            print("✓ Created index on poll_tags(tag_id, poll_id)")
            
            # Index for full-text search on polls (PostgreSQL specific)
            # Note: This uses PostgreSQL's GIN index for full-text search
            try:
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_polls_title_description_search 
                    ON polls USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
                """))
                print("✓ Created full-text search index on polls")
            except Exception as e:
                print(f"⚠ Could not create full-text search index (PostgreSQL only): {e}")
            
            conn.commit()
            print("\n✅ All indexes created successfully!")
            
        except Exception as e:
            print(f"❌ Error creating indexes: {e}")
            conn.rollback()

if __name__ == "__main__":
    print("Adding database indexes for optimization...\n")
    add_indexes()


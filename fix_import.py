#!/usr/bin/env python3
"""
Fix and import data to Railway PostgreSQL with proper UUID handling
"""
import os
import sys

# Set the Railway DATABASE_URL
os.environ['DATABASE_URL'] = 'postgresql://postgres:gkXvxtIhxeEsGMSdwLOimxNxJdCjYWhn@hopper.proxy.rlwy.net:38674/railway'

try:
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import sessionmaker
    
    # Create engine
    engine = create_engine(os.environ['DATABASE_URL'])
    SessionLocal = sessionmaker(bind=engine)
    
    print("Connected to Railway PostgreSQL successfully!")
    
    # Import and initialize database
    sys.path.append('backend')
    from models.database import init_db
    
    print("Creating database tables...")
    init_db()
    print("Database tables created successfully!")
    
    # Now import the data with proper UUID handling
    print("Importing data with proper UUID handling...")
    
    with engine.connect() as conn:
        # Import users data FIRST (required for foreign keys)
        print("Importing users...")
        conn.execute(text("""
            INSERT INTO users (id, email, hashed_password, created_at, username) 
            VALUES (
                'dd817b8d-7a13-44e9-875e-323233b7fe45'::uuid,
                'gadrooaryan@gmail.com',
                '$2b$12$/4M5Pe9PC.ErqSP.itIm/uUCaT5RGCWU/9rk1GMfHCr9hXjh/4Bke',
                '2025-10-27 05:33:01.878864+05:30'::timestamp,
                'FireTiger704'
            )
        """))
        conn.commit()
        print("Users imported!")
        
        # Import polls data
        print("Importing polls...")
        conn.execute(text("""
            INSERT INTO polls (id, title, description, creator_id, expires_at, created_at) 
            VALUES (
                'd914b7b0-122d-4142-b5ad-978d871e4e21'::uuid,
                'who will win the premier league?',
                'pl winner 2025',
                'dd817b8d-7a13-44e9-875e-323233b7fe45'::uuid,
                '2025-11-03 06:34:15.598000+05:30'::timestamp,
                '2025-10-27 06:34:15.769394+05:30'::timestamp
            )
        """))
        conn.commit()
        print("Polls imported!")
        
        # Import options data
        print("Importing options...")
        options_data = [
            ('d11545e1-f2cd-4f76-b226-52f8d7133bb8', 'd914b7b0-122d-4142-b5ad-978d871e4e21', 'liverpool', 0),
            ('5a93b51a-6892-46db-96d9-d300bd8f1728', 'd914b7b0-122d-4142-b5ad-978d871e4e21', 'chelsea', 0),
            ('32957fa6-f19f-4134-ad83-f578ad2d6ac7', 'd914b7b0-122d-4142-b5ad-978d871e4e21', 'man city', 0),
            ('ef459935-ff62-40c6-81a8-cf89ec5a3e50', 'd914b7b0-122d-4142-b5ad-978d871e4e21', 'man utd', 0),
            ('e14db020-9e6f-41f4-b6f3-35855188cdd0', 'd914b7b0-122d-4142-b5ad-978d871e4e21', 'arsenal', 1)
        ]
        
        for option_id, poll_id, option_text, vote_count in options_data:
            conn.execute(text(f"""
                INSERT INTO options (id, poll_id, text, vote_count) 
                VALUES ('{option_id}'::uuid, '{poll_id}'::uuid, '{option_text}', {vote_count})
            """))
        conn.commit()
        print("Options imported!")
        
        
        # Import votes data
        print("Importing votes...")
        conn.execute(text("""
            INSERT INTO votes (id, poll_id, option_id, user_id, comment, created_at) 
            VALUES (
                'b15b477e-edb3-4862-9a3a-ece8113205be'::uuid,
                'd914b7b0-122d-4142-b5ad-978d871e4e21'::uuid,
                'e14db020-9e6f-41f4-b6f3-35855188cdd0'::uuid,
                'dd817b8d-7a13-44e9-875e-323233b7fe45'::uuid,
                NULL,
                '2025-10-27 06:34:18.418313+05:30'::timestamp
            )
        """))
        conn.commit()
        print("Votes imported!")
        
        # Import bookmarks data
        print("Importing bookmarks...")
        conn.execute(text("""
            INSERT INTO bookmarks (id, poll_id, user_id, comment, created_at) 
            VALUES (
                '0b4e7b39-76a9-4251-8ea7-f86ef4695f22'::uuid,
                'd914b7b0-122d-4142-b5ad-978d871e4e21'::uuid,
                'dd817b8d-7a13-44e9-875e-323233b7fe45'::uuid,
                NULL,
                '2025-10-27 06:54:41.594340+05:30'::timestamp
            )
        """))
        conn.commit()
        print("Bookmarks imported!")
    
    print("✅ All data imported successfully to Railway PostgreSQL!")
    
    # Verify the data
    with engine.connect() as conn:
        result = conn.execute(text("SELECT COUNT(*) FROM polls"))
        polls_count = result.fetchone()[0]
        print(f"Polls in Railway DB: {polls_count}")
        
        result = conn.execute(text("SELECT COUNT(*) FROM options"))
        options_count = result.fetchone()[0]
        print(f"Options in Railway DB: {options_count}")
        
        result = conn.execute(text("SELECT COUNT(*) FROM users"))
        users_count = result.fetchone()[0]
        print(f"Users in Railway DB: {users_count}")
        
        result = conn.execute(text("SELECT COUNT(*) FROM votes"))
        votes_count = result.fetchone()[0]
        print(f"Votes in Railway DB: {votes_count}")
        
        result = conn.execute(text("SELECT COUNT(*) FROM bookmarks"))
        bookmarks_count = result.fetchone()[0]
        print(f"Bookmarks in Railway DB: {bookmarks_count}")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

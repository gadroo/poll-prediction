import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import random
import string

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def generate_username(email: str, existing_usernames: set) -> str:
    """Generate a unique username from email"""
    # Try email prefix first
    base_username = email.split('@')[0]
    # Remove non-alphanumeric characters
    base_username = ''.join(c for c in base_username if c.isalnum() or c in '_-')
    
    if base_username and base_username not in existing_usernames:
        return base_username
    
    # If taken, add random numbers
    for _ in range(100):
        suffix = ''.join(random.choices(string.digits, k=4))
        username = f"{base_username}{suffix}"
        if username not in existing_usernames:
            return username
    
    # Fallback to completely random username
    return 'user_' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))

def add_username_column():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        try:
            # Check if column already exists
            check_query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='users' AND column_name='username';
            """)
            result = connection.execute(check_query)
            if result.fetchone():
                print("Username column already exists.")
                return
            
            # Add username column (nullable first)
            print("Adding username column...")
            connection.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR(50);"))
            connection.commit()
            
            # Fetch all users
            print("Fetching existing users...")
            users = connection.execute(text("SELECT id, email FROM users;")).fetchall()
            
            if not users:
                print("No existing users found.")
            else:
                existing_usernames = set()
                
                # Generate usernames for existing users
                print(f"Generating usernames for {len(users)} users...")
                for user_id, email in users:
                    username = generate_username(email, existing_usernames)
                    existing_usernames.add(username)
                    
                    connection.execute(
                        text("UPDATE users SET username = :username WHERE id = :user_id"),
                        {"username": username, "user_id": user_id}
                    )
                    print(f"  {email} -> {username}")
                
                connection.commit()
            
            # Now make it NOT NULL and add unique constraint
            print("Adding NOT NULL constraint and unique index...")
            connection.execute(text("ALTER TABLE users ALTER COLUMN username SET NOT NULL;"))
            connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username);"))
            connection.commit()
            
            print("✅ Username column added successfully!")
            
        except Exception as e:
            print(f"Error adding username column: {e}")
            connection.rollback()

if __name__ == "__main__":
    add_username_column()


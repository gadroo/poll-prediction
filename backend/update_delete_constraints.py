import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://quickpoll_user:quickpoll_pass@localhost/quickpoll")

def update_delete_constraints():
    """
    Update foreign key constraints to properly handle user deletion:
    - polls.creator_id: CASCADE (delete polls when user is deleted)
    - bookmarks.user_id: CASCADE (delete bookmarks when user is deleted)
    - votes.user_id: SET NULL (keep votes as anonymous)
    - comments.user_id: SET NULL (keep comments as anonymous)
    """
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        try:
            print("Updating foreign key constraints for user deletion...")
            
            # Update polls.creator_id to CASCADE
            print("\n1. Updating polls.creator_id constraint...")
            connection.execute(text("""
                ALTER TABLE polls 
                DROP CONSTRAINT IF EXISTS polls_creator_id_fkey;
            """))
            connection.execute(text("""
                ALTER TABLE polls 
                ADD CONSTRAINT polls_creator_id_fkey 
                FOREIGN KEY (creator_id) 
                REFERENCES users(id) 
                ON DELETE CASCADE;
            """))
            print("   ✓ Polls will be CASCADE deleted when user is deleted")
            
            # Update bookmarks.user_id to CASCADE
            print("\n2. Updating bookmarks.user_id constraint...")
            connection.execute(text("""
                ALTER TABLE bookmarks 
                DROP CONSTRAINT IF EXISTS bookmarks_user_id_fkey;
            """))
            connection.execute(text("""
                ALTER TABLE bookmarks 
                ADD CONSTRAINT bookmarks_user_id_fkey 
                FOREIGN KEY (user_id) 
                REFERENCES users(id) 
                ON DELETE CASCADE;
            """))
            print("   ✓ Bookmarks will be CASCADE deleted when user is deleted")
            
            # Verify votes.user_id is SET NULL (should already be correct)
            print("\n3. Verifying votes.user_id constraint...")
            connection.execute(text("""
                ALTER TABLE votes 
                DROP CONSTRAINT IF EXISTS votes_user_id_fkey;
            """))
            connection.execute(text("""
                ALTER TABLE votes 
                ADD CONSTRAINT votes_user_id_fkey 
                FOREIGN KEY (user_id) 
                REFERENCES users(id) 
                ON DELETE SET NULL;
            """))
            print("   ✓ Votes will be preserved as anonymous (SET NULL)")
            
            # Verify comments.user_id is SET NULL (should already be correct)
            print("\n4. Verifying comments.user_id constraint...")
            connection.execute(text("""
                ALTER TABLE comments 
                DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
            """))
            connection.execute(text("""
                ALTER TABLE comments 
                ADD CONSTRAINT comments_user_id_fkey 
                FOREIGN KEY (user_id) 
                REFERENCES users(id) 
                ON DELETE SET NULL;
            """))
            print("   ✓ Comments will be preserved as anonymous (SET NULL)")
            
            connection.commit()
            print("\n✅ All foreign key constraints updated successfully!")
            print("\nSummary when user deletes account:")
            print("  - Their polls: DELETED")
            print("  - Their bookmarks: DELETED")
            print("  - Their votes: PRESERVED (as anonymous)")
            print("  - Their comments: PRESERVED (as anonymous)")
            
        except Exception as e:
            print(f"\n❌ Error updating constraints: {e}")
            connection.rollback()
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    update_delete_constraints()


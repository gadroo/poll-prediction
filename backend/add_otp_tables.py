#!/usr/bin/env python3
"""
Add OTP and PasswordResetToken tables to the database
"""

import os
import sys
sys.path.append('backend')

from models.database import engine, Base
from models.otp import OTP
from models.password_reset import PasswordResetToken

def add_new_tables():
    """Add the new tables to the database"""
    try:
        print("Creating new tables...")
        
        # Create the new tables
        OTP.__table__.create(engine, checkfirst=True)
        PasswordResetToken.__table__.create(engine, checkfirst=True)
        
        print("✅ Successfully created OTP and PasswordResetToken tables")
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("Adding OTP and PasswordResetToken tables to database...")
    success = add_new_tables()
    
    if success:
        print("✅ Migration completed successfully!")
    else:
        print("❌ Migration failed!")
        sys.exit(1)

#!/usr/bin/env python3
"""
Simple test script to verify FastAPI server can start
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

try:
    print("Testing FastAPI app import...")
    from backend.main import app
    print("✅ FastAPI app imported successfully")
    
    print("Testing database initialization...")
    from backend.models.database import init_db
    init_db()
    print("✅ Database initialization successful")
    
    print("Testing uvicorn startup...")
    import uvicorn
    print("✅ Uvicorn imported successfully")
    
    print("All tests passed! Server should start successfully.")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

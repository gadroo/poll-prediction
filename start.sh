#!/bin/bash
cd backend
export PYTHONPATH=/app/backend:$PYTHONPATH
uvicorn main:app --host 0.0.0.0 --port $PORT

#!/bin/bash

echo "🚀 Starting QuickPoll..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Start PostgreSQL
echo "📦 Starting PostgreSQL..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Check if database is ready
until docker exec quickpoll-db pg_isready -U quickpoll_user -d quickpoll > /dev/null 2>&1; do
    echo "   Still waiting for database..."
    sleep 2
done

echo "✅ PostgreSQL is ready!"
echo ""

# Start backend in a new terminal
echo "🔧 Starting backend on http://localhost:8000"
echo "   (Check backend terminal for logs)"
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    osascript -e 'tell app "Terminal" to do script "cd '"$PWD"'/backend && source venv/bin/activate && python main.py"'
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    gnome-terminal -- bash -c "cd $PWD/backend && source venv/bin/activate && python main.py; exec bash"
fi

# Wait a bit for backend to start
sleep 3

# Start frontend in a new terminal
echo "🎨 Starting frontend on http://localhost:3000"
echo "   (Check frontend terminal for logs)"
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    osascript -e 'tell app "Terminal" to do script "cd '"$PWD"'/frontend && npm run dev"'
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    gnome-terminal -- bash -c "cd $PWD/frontend && npm run dev; exec bash"
fi

echo ""
echo "✨ QuickPoll is starting up!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "⚙️  Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "To stop everything:"
echo "  - Close the backend and frontend terminal windows"
echo "  - Run: docker-compose down"
echo ""


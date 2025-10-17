#!/bin/bash

echo "🚀 Starting Full Stack Test Environment"
echo "======================================"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend server
echo "📡 Starting backend server..."
cd /home/vsumup/pain-db
node index.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend server
echo "🎨 Starting frontend server..."
cd /home/vsumup/pain-db/frontend
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 5

echo ""
echo "✅ Servers started successfully!"
echo "📡 Backend: http://localhost:3000"
echo "🎨 Frontend: http://localhost:5173"
echo ""
echo "🔗 You can now test registration at: http://localhost:5173/register"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user to stop
wait
#!/bin/bash

echo "🚀 Starting Full Stack Pain Management Platform"
echo "=============================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to cleanup background processes
cleanup() {
    echo -e "\n${GREEN}Shutting down servers...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend server
echo -e "${BLUE}📦 Starting Backend Server...${NC}"
node index.js &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend server
echo -e "${BLUE}🎨 Starting Frontend Server...${NC}"
cd frontend && npm run dev &
FRONTEND_PID=$!

echo -e "${GREEN}✅ Both servers started!${NC}"
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for background processes
wait
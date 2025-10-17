#!/bin/bash

# Pain Management Platform - Server Startup Script
# This script starts both the backend API server and frontend development server

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        print_warning "Killing existing process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
        sleep 2
    fi
}

# Function to cleanup on exit
cleanup() {
    print_warning "Shutting down servers..."
    # Kill background processes
    jobs -p | xargs -r kill 2>/dev/null || true
    exit 0
}

# Set up cleanup trap
trap cleanup SIGINT SIGTERM

print_status "🚀 Starting Pain Management Platform Servers..."
echo

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "frontend" ]; then
    print_error "Please run this script from the pain-db root directory"
    exit 1
fi

# Check for required files
if [ ! -f ".env.local" ]; then
    print_warning "No .env.local file found. Make sure environment variables are set."
fi

# Backend server setup
print_status "Setting up backend server..."

# Check if backend dependencies are installed
if [ ! -d "node_modules" ]; then
    print_status "Installing backend dependencies..."
    npm install
fi

# Check backend port (default: 3000)
BACKEND_PORT=${PORT:-3000}
if check_port $BACKEND_PORT; then
    print_warning "Port $BACKEND_PORT is already in use"
    read -p "Kill existing process and continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill_port $BACKEND_PORT
    else
        print_error "Cannot start backend server. Port $BACKEND_PORT is in use."
        exit 1
    fi
fi

# Frontend server setup
print_status "Setting up frontend server..."

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    print_status "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Check frontend port (default: 5173 for Vite)
FRONTEND_PORT=5173
if check_port $FRONTEND_PORT; then
    print_warning "Port $FRONTEND_PORT is already in use"
    read -p "Kill existing process and continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill_port $FRONTEND_PORT
    else
        print_error "Cannot start frontend server. Port $FRONTEND_PORT is in use."
        exit 1
    fi
fi

# Database setup
print_status "Checking database setup..."
if command -v npx >/dev/null 2>&1; then
    print_status "Generating Prisma client..."
    npx prisma generate
    
    print_status "Running database migrations..."
    npx prisma migrate dev --name init 2>/dev/null || print_warning "Migrations may have already been applied"
else
    print_warning "npx not found. Skipping database setup."
fi

echo
print_success "🎯 Starting servers..."
echo

# Start backend server in background
print_status "Starting backend server on port $BACKEND_PORT..."
npm run dev > backend.log 2>&1 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    print_error "Backend server failed to start. Check backend.log for details."
    cat backend.log
    exit 1
fi

# Start frontend server in background
print_status "Starting frontend server on port $FRONTEND_PORT..."
cd frontend && npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait a moment for frontend to start
sleep 3

# Check if frontend started successfully
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    print_error "Frontend server failed to start. Check frontend.log for details."
    cat frontend.log
    exit 1
fi

echo
print_success "✅ All servers are running!"
echo
echo "📊 Server Information:"
echo "  🔧 Backend API:  http://localhost:$BACKEND_PORT"
echo "  🎨 Frontend UI:  http://localhost:$FRONTEND_PORT"
echo
echo "📝 Logs:"
echo "  Backend:  tail -f backend.log"
echo "  Frontend: tail -f frontend.log"
echo
echo "🛑 To stop servers: Press Ctrl+C"
echo

# Wait for user to stop servers
wait
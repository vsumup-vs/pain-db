#!/bin/bash

echo "🚀 Starting authentication test sequence..."

# Start the backend server in background
echo "📡 Starting backend server..."
node index.js &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Run the authentication tests
echo "🧪 Running authentication tests..."
node test-auth-setup-and-run.js

# Kill the server
echo "🛑 Stopping server..."
kill $SERVER_PID 2>/dev/null

echo "✅ Test sequence completed!"
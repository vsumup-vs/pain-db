#!/bin/bash

echo "🚀 Starting backend server and testing API..."

# Start the server in the background
echo "Starting server..."
npm run dev &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 5

# Test if server is running
echo "Testing server connection..."
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Server is running!"
else
    echo "⏳ Server still starting, waiting a bit more..."
    sleep 3
fi

# Test the API endpoint
echo "🔍 Testing template API..."
curl -s http://localhost:3001/api/assessment-templates-v2/28f334ab-5f36-452f-9f9c-df7558a31878 | jq '.' || curl http://localhost:3001/api/assessment-templates-v2/28f334ab-5f36-452f-9f9c-df7558a31878

# Keep server running
echo "✅ Test complete. Server is running on PID $SERVER_PID"
echo "Press Ctrl+C to stop the server"
wait $SERVER_PID
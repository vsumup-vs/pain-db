#!/bin/bash

# Performance Monitoring Script
# Run this periodically to track performance as data grows

echo "🔍 Starting Performance Monitoring..."

# Check if server is running, start if needed
if ! curl -s http://localhost:3000/api > /dev/null; then
    echo "🚀 Starting server..."
    npm run dev > server.log 2>&1 &
    sleep 5
fi

# Run performance test
node performance-monitor.js test

echo "✅ Performance monitoring complete!"
echo "📊 View history with: node performance-monitor.js history"
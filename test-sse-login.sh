#!/bin/bash

# Test SSE login and connection
echo "🧪 Testing SSE Authentication & Connection..."
echo ""

# Create JSON payload file to avoid bash escaping issues
cat > /tmp/login-payload.json << 'JSONEOF'
{
  "email": "sse-test@example.com",
  "password": "TestPassword123!"
}
JSONEOF

# Step 1: Login
echo "Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d @/tmp/login-payload.json)

# Extract token using grep
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo "Response: $LOGIN_RESPONSE"
  rm /tmp/login-payload.json
  exit 1
fi

echo "✅ Login successful! Token: ${TOKEN:0:20}..."
echo ""

# Step 2: Test SSE connection
echo "Step 2: Connecting to SSE endpoint..."
echo "⏳ Waiting for connection confirmation (5 seconds)..."
echo ""

timeout 5 curl -N "http://localhost:3000/api/sse/alerts?token=$TOKEN" 2>&1 | head -n 5

echo ""
echo "✅ SSE connection test complete!"
echo ""

# Cleanup
rm /tmp/login-payload.json

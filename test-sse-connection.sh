#!/bin/bash

# SSE Connection Test Script
# This script helps you test the real-time alert system

echo "🧪 Testing SSE Connection..."
echo ""

# Step 1: Login and get token
echo "Step 1: Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sse-test@example.com","password":"TestPassword123!"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Please check credentials."
  exit 1
fi

echo "✅ Login successful! Token: ${TOKEN:0:20}..."
echo ""

# Step 2: Get existing patients and alert rules
echo "Step 2: Fetching test data..."
PATIENTS=$(curl -s -X GET http://localhost:3000/api/patients \
  -H "Authorization: Bearer $TOKEN")

PATIENT_ID=$(echo $PATIENTS | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

ALERT_RULES=$(curl -s -X GET http://localhost:3000/api/alert-rules \
  -H "Authorization: Bearer $TOKEN")

RULE_ID=$(echo $ALERT_RULES | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

echo "Patient ID: $PATIENT_ID"
echo "Alert Rule ID: $RULE_ID"
echo ""

# Step 3: Create test alert
echo "Step 3: Creating test alert..."
echo "⏳ Watch the Triage Queue UI - you should see a toast notification appear!"
echo ""

ALERT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/alerts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"patientId\": \"$PATIENT_ID\",
    \"ruleId\": \"$RULE_ID\",
    \"severity\": \"HIGH\",
    \"priority\": 8,
    \"message\": \"🧪 TEST ALERT - Created via SSE test script at $(date)\",
    \"details\": {}
  }")

ALERT_ID=$(echo $ALERT_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$ALERT_ID" ]; then
  echo "❌ Failed to create alert"
  echo "Response: $ALERT_RESPONSE"
  exit 1
fi

echo "✅ Test alert created! Alert ID: $ALERT_ID"
echo ""
echo "📊 Expected UI behavior:"
echo "   1. Toast notification appears (top-right)"
echo "   2. Alert appears in triage queue instantly"
echo "   3. Summary cards update"
echo ""
echo "Press Enter to clean up test alert..."
read

# Step 4: Clean up - delete test alert
echo "Cleaning up test alert..."
curl -s -X DELETE http://localhost:3000/api/alerts/$ALERT_ID \
  -H "Authorization: Bearer $TOKEN" > /dev/null

echo "✅ Test complete!"

#!/bin/bash

# Test Auto-Start/Stop Timer Functionality
# This script tests the complete timer workflow via API

# Configuration
API_BASE="http://localhost:3000/api"
TOKEN_FILE="$HOME/.pain-db-token"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "======================================"
echo "Timer Functionality End-to-End Test"
echo "======================================"
echo ""

# Check if token exists
if [ ! -f "$TOKEN_FILE" ]; then
    echo -e "${RED}❌ Error: Token file not found at $TOKEN_FILE${NC}"
    echo "Please login first using:"
    echo "curl -X POST $API_BASE/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"clinician@testclinic.com\",\"password\":\"clinician123\"}' | jq -r '.tokens.accessToken' > $TOKEN_FILE"
    exit 1
fi

TOKEN=$(cat "$TOKEN_FILE")

# Test patient ID from persistent test data
PATIENT_ID="cmgx5a4wf00017k0uuocitsrm"  # John Smith

echo -e "${YELLOW}Step 1: Get or create an alert rule${NC}"
# We'll use the first alert rule that exists
RULE_ID=$(curl -s -X GET "$API_BASE/alert-rules" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.data[0].id')

if [ -z "$RULE_ID" ] || [ "$RULE_ID" == "null" ]; then
    echo -e "${RED}❌ No alert rules found. Creating a test rule...${NC}"

    # Create a test alert rule
    RULE_RESPONSE=$(curl -s -X POST "$API_BASE/alert-rules" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "Test High Blood Pressure Alert",
        "description": "Test alert for timer functionality",
        "conditions": {"threshold": 140, "operator": ">"},
        "actions": ["NOTIFY_CLINICIAN"],
        "severity": "HIGH",
        "category": "Cardiovascular"
      }')

    RULE_ID=$(echo "$RULE_RESPONSE" | jq -r '.data.id')
fi

echo -e "${GREEN}✓ Using alert rule ID: $RULE_ID${NC}"
echo ""

echo -e "${YELLOW}Step 2: Create a test alert${NC}"
ALERT_RESPONSE=$(curl -s -X POST "$API_BASE/alerts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"patientId\": \"$PATIENT_ID\",
    \"ruleId\": \"$RULE_ID\",
    \"message\": \"Test alert for timer functionality - Blood pressure 145/95\",
    \"severity\": \"HIGH\",
    \"priorityRank\": 8,
    \"details\": {\"systolic\": 145, \"diastolic\": 95}
  }")

ALERT_ID=$(echo "$ALERT_RESPONSE" | jq -r '.alert.id')

if [ -z "$ALERT_ID" ] || [ "$ALERT_ID" == "null" ]; then
    echo -e "${RED}❌ Failed to create alert${NC}"
    echo "$ALERT_RESPONSE" | jq '.'
    exit 1
fi

echo -e "${GREEN}✓ Created alert ID: $ALERT_ID${NC}"
echo ""

echo -e "${YELLOW}Step 3: Start timer for patient${NC}"
TIMER_START_RESPONSE=$(curl -s -X POST "$API_BASE/time-tracking/start" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"patientId\": \"$PATIENT_ID\",
    \"activity\": \"Patient engagement\",
    \"source\": \"alert\",
    \"sourceId\": \"$ALERT_ID\"
  }")

echo "$TIMER_START_RESPONSE" | jq '.'

if [ "$(echo "$TIMER_START_RESPONSE" | jq -r '.success')" != "true" ]; then
    echo -e "${RED}❌ Failed to start timer${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Timer started successfully${NC}"
echo ""

echo -e "${YELLOW}Step 4: Verify timer is active${NC}"
ACTIVE_TIMER_RESPONSE=$(curl -s -X GET "$API_BASE/time-tracking/active?patientId=$PATIENT_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "$ACTIVE_TIMER_RESPONSE" | jq '.'

if [ "$(echo "$ACTIVE_TIMER_RESPONSE" | jq -r '.data.active')" != "true" ]; then
    echo -e "${RED}❌ Timer is not active${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Timer is active${NC}"
echo ""

echo -e "${YELLOW}Step 5: Wait for 3 seconds (simulating work time)...${NC}"
sleep 3
echo ""

echo -e "${YELLOW}Step 6: Stop timer and create time log${NC}"
TIMER_STOP_RESPONSE=$(curl -s -X POST "$API_BASE/time-tracking/stop" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"patientId\": \"$PATIENT_ID\",
    \"notes\": \"Reviewed blood pressure readings, advised patient to monitor closely\",
    \"cptCode\": \"99457\",
    \"billable\": true
  }")

echo "$TIMER_STOP_RESPONSE" | jq '.'

if [ "$(echo "$TIMER_STOP_RESPONSE" | jq -r '.success')" != "true" ]; then
    echo -e "${RED}❌ Failed to stop timer${NC}"
    exit 1
fi

TIME_LOG_ID=$(echo "$TIMER_STOP_RESPONSE" | jq -r '.data.timeLog.id')
DURATION=$(echo "$TIMER_STOP_RESPONSE" | jq -r '.data.timeLog.duration')

echo -e "${GREEN}✓ Timer stopped successfully${NC}"
echo -e "${GREEN}✓ Time log created (ID: $TIME_LOG_ID, Duration: $DURATION minutes)${NC}"
echo ""

echo -e "${YELLOW}Step 7: Verify timer is no longer active${NC}"
INACTIVE_TIMER_RESPONSE=$(curl -s -X GET "$API_BASE/time-tracking/active?patientId=$PATIENT_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "$INACTIVE_TIMER_RESPONSE" | jq '.'

if [ "$(echo "$INACTIVE_TIMER_RESPONSE" | jq -r '.data.active')" == "true" ]; then
    echo -e "${RED}❌ Timer is still active (should be stopped)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Timer is no longer active${NC}"
echo ""

echo "======================================"
echo -e "${GREEN}✅ All timer functionality tests passed!${NC}"
echo "======================================"
echo ""
echo "Summary:"
echo "- Alert created: $ALERT_ID"
echo "- Timer started and stopped successfully"
echo "- Time log created: $TIME_LOG_ID"
echo "- Duration tracked: $DURATION minutes"

#!/bin/bash

# Test script for Alert Snooze & Suppress functionality
# This script tests the backend API endpoints directly

echo "======================================"
echo "Alert Snooze & Suppress API Test"
echo "======================================"
echo ""

# Configuration
API_BASE="http://localhost:3000/api"
AUTH_TOKEN=$(cat ~/.pain-db-token 2>/dev/null || echo "")

# Check if we have an auth token
if [ -z "$AUTH_TOKEN" ]; then
  echo "❌ No auth token found. Please login first."
  echo "   You can save your token to ~/.pain-db-token"
  exit 1
fi

echo "✅ Using auth token: ${AUTH_TOKEN:0:20}..."
echo ""

# Function to make API call
api_call() {
  local method=$1
  local endpoint=$2
  local data=$3

  if [ -z "$data" ]; then
    curl -s -X $method \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -H "Content-Type: application/json" \
      "$API_BASE$endpoint"
  else
    curl -s -X $method \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$API_BASE$endpoint"
  fi
}

# Step 1: Get list of alerts
echo "Step 1: Fetching pending alerts..."
ALERTS_RESPONSE=$(api_call GET "/alerts?status=PENDING&limit=5")
echo "$ALERTS_RESPONSE" | jq '.' > /tmp/alerts.json

# Extract first alert ID
ALERT_ID=$(echo "$ALERTS_RESPONSE" | jq -r '.alerts[0].id // empty')

if [ -z "$ALERT_ID" ]; then
  echo "❌ No pending alerts found. Creating a test alert first..."

  # Get first patient
  PATIENT_RESPONSE=$(api_call GET "/patients?limit=1")
  PATIENT_ID=$(echo "$PATIENT_RESPONSE" | jq -r '.patients[0].id // empty')

  if [ -z "$PATIENT_ID" ]; then
    echo "❌ No patients found. Cannot create test alert."
    exit 1
  fi

  # Get first alert rule
  RULE_RESPONSE=$(api_call GET "/alert-rules?limit=1")
  RULE_ID=$(echo "$RULE_RESPONSE" | jq -r '.alertRules[0].id // empty')

  if [ -z "$RULE_ID" ]; then
    echo "❌ No alert rules found. Cannot create test alert."
    exit 1
  fi

  # Create test alert
  CREATE_ALERT_DATA='{
    "patientId": "'$PATIENT_ID'",
    "ruleId": "'$RULE_ID'",
    "severity": "MEDIUM",
    "priority": 5,
    "message": "Test alert for snooze/suppress functionality",
    "details": {}
  }'

  CREATE_RESPONSE=$(api_call POST "/alerts" "$CREATE_ALERT_DATA")
  ALERT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.alert.id // empty')

  if [ -z "$ALERT_ID" ]; then
    echo "❌ Failed to create test alert."
    echo "$CREATE_RESPONSE" | jq '.'
    exit 1
  fi

  echo "✅ Created test alert: $ALERT_ID"
else
  echo "✅ Using existing alert: $ALERT_ID"
fi

echo ""

# Step 2: Test Snooze Alert
echo "======================================"
echo "Step 2: Testing SNOOZE functionality"
echo "======================================"
echo ""

SNOOZE_DATA='{
  "snoozeMinutes": 60
}'

echo "Request: POST /alerts/$ALERT_ID/snooze"
echo "Data: $SNOOZE_DATA"
echo ""

SNOOZE_RESPONSE=$(api_call POST "/alerts/$ALERT_ID/snooze" "$SNOOZE_DATA")
echo "$SNOOZE_RESPONSE" | jq '.' > /tmp/snooze_response.json

# Check if snooze was successful
SNOOZE_SUCCESS=$(echo "$SNOOZE_RESPONSE" | jq -r '.success // false')
SNOOZED_UNTIL=$(echo "$SNOOZE_RESPONSE" | jq -r '.alert.snoozedUntil // "null"')

if [ "$SNOOZE_SUCCESS" = "true" ] && [ "$SNOOZED_UNTIL" != "null" ]; then
  echo "✅ Snooze successful!"
  echo "   Alert will be hidden until: $SNOOZED_UNTIL"
else
  echo "❌ Snooze failed!"
  echo "$SNOOZE_RESPONSE" | jq '.'
fi

echo ""

# Step 3: Verify alert is snoozed
echo "Step 3: Verifying alert is snoozed..."
ALERT_DETAIL=$(api_call GET "/alerts/$ALERT_ID")
echo "$ALERT_DETAIL" | jq '.' > /tmp/alert_after_snooze.json

SNOOZED_UNTIL_VERIFY=$(echo "$ALERT_DETAIL" | jq -r '.alert.snoozedUntil // "null"')
if [ "$SNOOZED_UNTIL_VERIFY" != "null" ]; then
  echo "✅ Alert is snoozed until: $SNOOZED_UNTIL_VERIFY"
else
  echo "❌ Alert is not marked as snoozed"
fi

echo ""

# Step 4: Create another test alert for suppress test
echo "======================================"
echo "Step 4: Creating second alert for SUPPRESS test"
echo "======================================"
echo ""

CREATE_ALERT_DATA2='{
  "patientId": "'$PATIENT_ID'",
  "ruleId": "'$RULE_ID'",
  "severity": "LOW",
  "priority": 2,
  "message": "Test alert for suppress functionality",
  "details": {}
}'

CREATE_RESPONSE2=$(api_call POST "/alerts" "$CREATE_ALERT_DATA2")
ALERT_ID2=$(echo "$CREATE_RESPONSE2" | jq -r '.alert.id // empty')

if [ -z "$ALERT_ID2" ]; then
  echo "❌ Failed to create second test alert."
  exit 1
fi

echo "✅ Created second test alert: $ALERT_ID2"
echo ""

# Step 5: Test Suppress Alert
echo "======================================"
echo "Step 5: Testing SUPPRESS functionality"
echo "======================================"
echo ""

SUPPRESS_DATA='{
  "suppressReason": "FALSE_POSITIVE",
  "suppressNotes": "Testing suppress functionality with FALSE_POSITIVE reason"
}'

echo "Request: POST /alerts/$ALERT_ID2/suppress"
echo "Data: $SUPPRESS_DATA"
echo ""

SUPPRESS_RESPONSE=$(api_call POST "/alerts/$ALERT_ID2/suppress" "$SUPPRESS_DATA")
echo "$SUPPRESS_RESPONSE" | jq '.' > /tmp/suppress_response.json

# Check if suppress was successful
SUPPRESS_SUCCESS=$(echo "$SUPPRESS_RESPONSE" | jq -r '.success // false')
IS_SUPPRESSED=$(echo "$SUPPRESS_RESPONSE" | jq -r '.alert.isSuppressed // false')
ALERT_STATUS=$(echo "$SUPPRESS_RESPONSE" | jq -r '.alert.status // "null"')

if [ "$SUPPRESS_SUCCESS" = "true" ] && [ "$IS_SUPPRESSED" = "true" ] && [ "$ALERT_STATUS" = "DISMISSED" ]; then
  echo "✅ Suppress successful!"
  echo "   Alert is suppressed with status: $ALERT_STATUS"
else
  echo "❌ Suppress failed!"
  echo "$SUPPRESS_RESPONSE" | jq '.'
fi

echo ""

# Step 6: Verify alert is suppressed
echo "Step 6: Verifying alert is suppressed..."
ALERT_DETAIL2=$(api_call GET "/alerts/$ALERT_ID2")
echo "$ALERT_DETAIL2" | jq '.' > /tmp/alert_after_suppress.json

IS_SUPPRESSED_VERIFY=$(echo "$ALERT_DETAIL2" | jq -r '.alert.isSuppressed // false')
STATUS_VERIFY=$(echo "$ALERT_DETAIL2" | jq -r '.alert.status // "null"')

if [ "$IS_SUPPRESSED_VERIFY" = "true" ] && [ "$STATUS_VERIFY" = "DISMISSED" ]; then
  echo "✅ Alert is suppressed with status DISMISSED"
else
  echo "❌ Alert is not marked as suppressed or status is wrong"
fi

echo ""

# Step 7: Test validation - invalid snooze duration
echo "======================================"
echo "Step 7: Testing validation (invalid snooze duration)"
echo "======================================"
echo ""

# Create third test alert
CREATE_RESPONSE3=$(api_call POST "/alerts" "$CREATE_ALERT_DATA")
ALERT_ID3=$(echo "$CREATE_RESPONSE3" | jq -r '.alert.id // empty')

INVALID_SNOOZE_DATA='{
  "snoozeMinutes": 20000
}'

echo "Request: POST /alerts/$ALERT_ID3/snooze"
echo "Data: $INVALID_SNOOZE_DATA (exceeds max 10080)"
echo ""

INVALID_SNOOZE_RESPONSE=$(api_call POST "/alerts/$ALERT_ID3/snooze" "$INVALID_SNOOZE_DATA")

ERROR_MSG=$(echo "$INVALID_SNOOZE_RESPONSE" | jq -r '.error // "null"')
if [ "$ERROR_MSG" != "null" ]; then
  echo "✅ Validation works! Error message: $ERROR_MSG"
else
  echo "❌ Validation failed - should have rejected invalid duration"
fi

echo ""

# Step 8: Test validation - suppress OTHER without notes
echo "======================================"
echo "Step 8: Testing validation (OTHER reason without notes)"
echo "======================================"
echo ""

# Create fourth test alert
CREATE_RESPONSE4=$(api_call POST "/alerts" "$CREATE_ALERT_DATA")
ALERT_ID4=$(echo "$CREATE_RESPONSE4" | jq -r '.alert.id // empty')

INVALID_SUPPRESS_DATA='{
  "suppressReason": "OTHER",
  "suppressNotes": ""
}'

echo "Request: POST /alerts/$ALERT_ID4/suppress"
echo "Data: $INVALID_SUPPRESS_DATA (OTHER reason without notes)"
echo ""

INVALID_SUPPRESS_RESPONSE=$(api_call POST "/alerts/$ALERT_ID4/suppress" "$INVALID_SUPPRESS_DATA")

ERROR_MSG2=$(echo "$INVALID_SUPPRESS_RESPONSE" | jq -r '.error // "null"')
if [ "$ERROR_MSG2" != "null" ]; then
  echo "✅ Validation works! Error message: $ERROR_MSG2"
else
  echo "❌ Validation failed - should have required notes for OTHER reason"
fi

echo ""

# Summary
echo "======================================"
echo "TEST SUMMARY"
echo "======================================"
echo ""
echo "Results saved to:"
echo "  - /tmp/alerts.json"
echo "  - /tmp/snooze_response.json"
echo "  - /tmp/alert_after_snooze.json"
echo "  - /tmp/suppress_response.json"
echo "  - /tmp/alert_after_suppress.json"
echo ""
echo "Test alerts created:"
echo "  - Snoozed alert: $ALERT_ID"
echo "  - Suppressed alert: $ALERT_ID2"
echo "  - Validation test alerts: $ALERT_ID3, $ALERT_ID4"
echo ""
echo "✅ End-to-end API testing complete!"

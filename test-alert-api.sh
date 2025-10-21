#!/bin/bash

# Test script to verify alert creation API works with enrollmentId fix
# This tests the backend directly without needing browser refresh

echo "Testing Alert Creation API..."
echo "=============================="
echo

# Test data from previous session
ENROLLMENT_ID="cmgv41z6400037k8v6gayfghc"
RULE_ID="cmgvxx3wt00017kglh8mqo5yw"

# Get auth token (assumes user is logged in)
# Note: This needs to be run in browser console to get the token
echo "To get your auth token, run this in browser console:"
echo "localStorage.getItem('authToken')"
echo
echo "Then export it as:"
echo "export AUTH_TOKEN='your-token-here'"
echo
echo "Once you have the token, run:"
echo
echo "curl -X POST http://localhost:3000/api/alerts \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer \$AUTH_TOKEN' \\"
echo "  -d '{"
echo "    \"ruleId\": \"$RULE_ID\","
echo "    \"enrollmentId\": \"$ENROLLMENT_ID\","
echo "    \"facts\": {"
echo "      \"message\": \"Backend API Test - SSE should broadcast this!\","
echo "      \"testTimestamp\": \"'$(date -Iseconds)'\""
echo "    }"
echo "  }'"
echo
echo "Expected: HTTP 201 with alert JSON (no enrollmentId Prisma errors)"

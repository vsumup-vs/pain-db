#!/bin/bash

# Test Billing API with Authentication
echo "=================================================="
echo "Testing Billing API Endpoints with Authentication"
echo "=================================================="
echo ""

# Step 1: Login and get token
echo "Step 1: Logging in as test@test.com..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "password"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"//')

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Response:"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful. Token obtained."
echo ""

# Get organization ID from login response
ORG_ID=$(echo $LOGIN_RESPONSE | grep -o '"organizationId":"[^"]*"' | sed 's/"organizationId":"//;s/"//')

if [ -z "$ORG_ID" ]; then
  echo "⚠️ No organization ID in response. Using default."
  ORG_ID="cmglnf17w00007kz77y0c8ahs"
fi

echo "Organization ID: $ORG_ID"
echo ""

# Test 1: Get all billing programs
echo "=================================================="
echo "Test 1: GET /api/billing/programs"
echo "Expected: List of 3 CMS billing programs"
echo "=================================================="
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/billing/programs | python3 -m json.tool 2>/dev/null || curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/billing/programs
echo ""
echo ""

# Test 2: Get specific billing program by code
echo "=================================================="
echo "Test 2: GET /api/billing/programs/CMS_RPM_2025"
echo "Expected: CMS RPM 2025 with CPT codes and eligibility rules"
echo "=================================================="
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/billing/programs/CMS_RPM_2025 | python3 -m json.tool 2>/dev/null || curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/billing/programs/CMS_RPM_2025
echo ""
echo ""

# Test 3: Get organization billing programs
echo "=================================================="
echo "Test 3: GET /api/billing/programs/organization/$ORG_ID"
echo "Expected: Billing programs for organization's region"
echo "=================================================="
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/billing/programs/organization/$ORG_ID | python3 -m json.tool 2>/dev/null || curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/billing/programs/organization/$ORG_ID
echo ""
echo ""

# Test 4: Get organization billing summary (will be empty - no enrollments)
BILLING_MONTH="2025-10"
echo "=================================================="
echo "Test 4: GET /api/billing/summary/$ORG_ID/$BILLING_MONTH"
echo "Expected: Empty summary (no enrollments exist yet)"
echo "=================================================="
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/billing/summary/$ORG_ID/$BILLING_MONTH | python3 -m json.tool 2>/dev/null || curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/billing/summary/$ORG_ID/$BILLING_MONTH
echo ""
echo ""

# Test 5: Test invalid billing month format
echo "=================================================="
echo "Test 5: GET /api/billing/summary/$ORG_ID/2025-13 (invalid month)"
echo "Expected: 400 Bad Request"
echo "=================================================="
curl -s -w "\nHTTP Status: %{http_code}\n" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/billing/summary/$ORG_ID/2025-13
echo ""
echo ""

# Test 6: Test another invalid format
echo "=================================================="
echo "Test 6: GET /api/billing/summary/$ORG_ID/10-2025 (wrong format)"
echo "Expected: 400 Bad Request"
echo "=================================================="
curl -s -w "\nHTTP Status: %{http_code}\n" -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/billing/summary/$ORG_ID/10-2025
echo ""
echo ""

echo "=================================================="
echo "✅ All endpoint tests completed!"
echo "=================================================="
echo ""
echo "Summary:"
echo "- Authentication: ✅ Working"
echo "- GET /api/billing/programs: Tested"
echo "- GET /api/billing/programs/:code: Tested"
echo "- GET /api/billing/programs/organization/:orgId: Tested"
echo "- GET /api/billing/summary/:orgId/:month: Tested"
echo "- Validation: Tested (invalid month formats)"
echo ""
echo "Note: Enrollment-specific endpoints cannot be tested"
echo "      because no enrollments exist in the database yet."
echo "=================================================="

#!/bin/bash

# Platform Admin API Testing Script
# Tests all platform organization management endpoints

set -e  # Exit on error

echo "================================================"
echo "Platform Admin API Testing"
echo "================================================"
echo ""

# Base URL
BASE_URL="http://localhost:3000/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print test result
print_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: $2"
    ((PASSED_TESTS++))
  else
    echo -e "${RED}✗ FAIL${NC}: $2"
    echo -e "${YELLOW}Response:${NC} $3"
    ((FAILED_TESTS++))
  fi
  ((TOTAL_TESTS++))
  echo ""
}

# Function to make API request
api_request() {
  local method=$1
  local endpoint=$2
  local data=$3
  local token=$4

  if [ -z "$token" ]; then
    curl -s -X "$method" "${BASE_URL}${endpoint}" \
      -H "Content-Type: application/json" \
      -w "\n%{http_code}" \
      ${data:+-d "$data"}
  else
    curl -s -X "$method" "${BASE_URL}${endpoint}" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $token" \
      -w "\n%{http_code}" \
      ${data:+-d "$data"}
  fi
}

echo "Step 1: Authentication Tests"
echo "================================================"
echo ""

# Test 1: Login as platform admin (you'll need to replace credentials)
echo "Test 1.1: Login as platform admin..."
RESPONSE=$(api_request POST "/auth/login" '{
  "email": "platform-admin@clinmetrics.com",
  "password": "SecurePassword123!"
}')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" == "200" ]] && echo "$BODY" | grep -q '"token"'; then
  PLATFORM_TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  IS_PLATFORM_ADMIN=$(echo "$BODY" | grep -o '"isPlatformAdmin":[^,]*' | cut -d':' -f2)

  if [[ "$IS_PLATFORM_ADMIN" == "true" ]]; then
    print_result 0 "Login as platform admin successful"
    echo "Platform Token: ${PLATFORM_TOKEN:0:50}..."
    echo "isPlatformAdmin: $IS_PLATFORM_ADMIN"
  else
    print_result 1 "User is not platform admin" "$BODY"
    echo "Note: This test requires a user with isPlatformAdmin = true"
    exit 1
  fi
else
  print_result 1 "Login failed (HTTP $HTTP_CODE)" "$BODY"
  echo ""
  echo "Setup Required:"
  echo "1. Create a platform admin user with:"
  echo "   - email: platform-admin@clinmetrics.com"
  echo "   - password: SecurePassword123!"
  echo "   - isPlatformAdmin: true"
  echo ""
  echo "2. Or modify this script with your existing platform admin credentials"
  exit 1
fi

echo ""
echo "Step 2: Platform Admin Access Tests"
echo "================================================"
echo ""

# Test 2.1: List organizations without token (should fail)
echo "Test 2.1: List organizations without authentication..."
RESPONSE=$(api_request GET "/platform/organizations")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" == "401" ]]; then
  print_result 0 "Correctly denied access without token"
else
  print_result 1 "Should have returned 401, got $HTTP_CODE" "$BODY"
fi

# Test 2.2: List organizations with platform admin token (should succeed)
echo "Test 2.2: List organizations with platform admin token..."
RESPONSE=$(api_request GET "/platform/organizations" "" "$PLATFORM_TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" == "200" ]] && echo "$BODY" | grep -q '"organizations"'; then
  ORG_COUNT=$(echo "$BODY" | grep -o '"total":[0-9]*' | cut -d':' -f2)
  print_result 0 "Successfully retrieved organizations (Total: $ORG_COUNT)"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  print_result 1 "Failed to retrieve organizations (HTTP $HTTP_CODE)" "$BODY"
fi

echo ""
echo "Step 3: Organization CRUD Tests"
echo "================================================"
echo ""

# Test 3.1: Create organization
echo "Test 3.1: Create new organization..."
CREATE_DATA='{
  "name": "Test Clinic API",
  "email": "admin@testclinic-api.com",
  "phone": "555-999-8888",
  "address": "789 Test API Street, City, State 12345",
  "domain": "testclinic-api",
  "website": "https://testclinic-api.com",
  "type": "CLINIC",
  "subscriptionTier": "BASIC",
  "subscriptionStatus": "TRIAL",
  "subscriptionStartDate": "2025-10-20T00:00:00Z",
  "maxUsers": 15,
  "maxPatients": 150,
  "maxClinicians": 10,
  "billingContact": {
    "name": "Jane Billing",
    "email": "billing@testclinic-api.com",
    "phone": "555-333-4444"
  }
}'

RESPONSE=$(api_request POST "/platform/organizations" "$CREATE_DATA" "$PLATFORM_TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" == "201" ]] && echo "$BODY" | grep -q '"id"'; then
  NEW_ORG_ID=$(echo "$BODY" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  print_result 0 "Successfully created organization (ID: $NEW_ORG_ID)"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  print_result 1 "Failed to create organization (HTTP $HTTP_CODE)" "$BODY"
  NEW_ORG_ID=""
fi

# Test 3.2: Get organization by ID
if [ -n "$NEW_ORG_ID" ]; then
  echo "Test 3.2: Get organization by ID..."
  RESPONSE=$(api_request GET "/platform/organizations/$NEW_ORG_ID" "" "$PLATFORM_TOKEN")
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [[ "$HTTP_CODE" == "200" ]] && echo "$BODY" | grep -q "$NEW_ORG_ID"; then
    print_result 0 "Successfully retrieved organization"
    echo "$BODY" | jq '.organization | {name, email, subscriptionTier, subscriptionStatus}' 2>/dev/null || echo "$BODY"
  else
    print_result 1 "Failed to retrieve organization (HTTP $HTTP_CODE)" "$BODY"
  fi
fi

# Test 3.3: Update organization
if [ -n "$NEW_ORG_ID" ]; then
  echo "Test 3.3: Update organization..."
  UPDATE_DATA='{
    "subscriptionTier": "PRO",
    "subscriptionStatus": "ACTIVE",
    "maxUsers": 50,
    "maxPatients": 500,
    "maxClinicians": 25
  }'

  RESPONSE=$(api_request PUT "/platform/organizations/$NEW_ORG_ID" "$UPDATE_DATA" "$PLATFORM_TOKEN")
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [[ "$HTTP_CODE" == "200" ]] && echo "$BODY" | grep -q '"subscriptionTier":"PRO"'; then
    print_result 0 "Successfully updated organization"
    echo "$BODY" | jq '.organization | {subscriptionTier, subscriptionStatus, maxUsers}' 2>/dev/null || echo "$BODY"
  else
    print_result 1 "Failed to update organization (HTTP $HTTP_CODE)" "$BODY"
  fi
fi

# Test 3.4: Get organization usage
if [ -n "$NEW_ORG_ID" ]; then
  echo "Test 3.4: Get organization usage..."
  RESPONSE=$(api_request GET "/platform/organizations/$NEW_ORG_ID/usage" "" "$PLATFORM_TOKEN")
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [[ "$HTTP_CODE" == "200" ]]; then
    print_result 0 "Successfully retrieved organization usage"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  else
    print_result 1 "Failed to retrieve organization usage (HTTP $HTTP_CODE)" "$BODY"
  fi
fi

# Test 3.5: Delete organization
if [ -n "$NEW_ORG_ID" ]; then
  echo "Test 3.5: Delete organization (soft delete)..."
  RESPONSE=$(api_request DELETE "/platform/organizations/$NEW_ORG_ID" "" "$PLATFORM_TOKEN")
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [[ "$HTTP_CODE" == "200" ]]; then
    print_result 0 "Successfully deleted organization"
  else
    print_result 1 "Failed to delete organization (HTTP $HTTP_CODE)" "$BODY"
  fi
fi

echo ""
echo "Step 4: Validation Tests"
echo "================================================"
echo ""

# Test 4.1: Create organization with missing required fields
echo "Test 4.1: Create organization with missing required fields..."
INVALID_DATA='{
  "name": "Incomplete Clinic"
}'

RESPONSE=$(api_request POST "/platform/organizations" "$INVALID_DATA" "$PLATFORM_TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" == "400" ]]; then
  print_result 0 "Correctly rejected invalid data (missing required fields)"
else
  print_result 1 "Should have returned 400, got $HTTP_CODE" "$BODY"
fi

# Test 4.2: Create organization with invalid email
echo "Test 4.2: Create organization with invalid email..."
INVALID_EMAIL='{
  "name": "Invalid Email Clinic",
  "email": "not-an-email",
  "type": "CLINIC",
  "subscriptionTier": "BASIC",
  "subscriptionStatus": "TRIAL",
  "maxUsers": 10,
  "maxPatients": 100,
  "maxClinicians": 5
}'

RESPONSE=$(api_request POST "/platform/organizations" "$INVALID_EMAIL" "$PLATFORM_TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" == "400" ]]; then
  print_result 0 "Correctly rejected invalid email format"
else
  print_result 1 "Should have returned 400 for invalid email, got $HTTP_CODE" "$BODY"
fi

echo ""
echo "Step 5: Pagination and Filtering Tests"
echo "================================================"
echo ""

# Test 5.1: Pagination
echo "Test 5.1: List organizations with pagination..."
RESPONSE=$(api_request GET "/platform/organizations?page=1&limit=5" "" "$PLATFORM_TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" == "200" ]]; then
  PAGE=$(echo "$BODY" | grep -o '"page":[0-9]*' | cut -d':' -f2 | head -1)
  LIMIT=$(echo "$BODY" | grep -o '"limit":[0-9]*' | cut -d':' -f2 | head -1)
  TOTAL=$(echo "$BODY" | grep -o '"total":[0-9]*' | cut -d':' -f2 | head -1)

  print_result 0 "Successfully retrieved paginated results (Page: $PAGE, Limit: $LIMIT, Total: $TOTAL)"
else
  print_result 1 "Failed to retrieve paginated results (HTTP $HTTP_CODE)" "$BODY"
fi

# Test 5.2: Filtering by subscription tier
echo "Test 5.2: Filter organizations by subscription tier..."
RESPONSE=$(api_request GET "/platform/organizations?subscriptionTier=PRO" "" "$PLATFORM_TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" == "200" ]]; then
  COUNT=$(echo "$BODY" | grep -o '"total":[0-9]*' | cut -d':' -f2)
  print_result 0 "Successfully filtered by subscription tier (PRO organizations: $COUNT)"
else
  print_result 1 "Failed to filter by subscription tier (HTTP $HTTP_CODE)" "$BODY"
fi

# Test 5.3: Search organizations
echo "Test 5.3: Search organizations..."
RESPONSE=$(api_request GET "/platform/organizations?search=clinic" "" "$PLATFORM_TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [[ "$HTTP_CODE" == "200" ]]; then
  COUNT=$(echo "$BODY" | grep -o '"total":[0-9]*' | cut -d':' -f2)
  print_result 0 "Successfully searched organizations (Results: $COUNT)"
else
  print_result 1 "Failed to search organizations (HTTP $HTTP_CODE)" "$BODY"
fi

echo ""
echo "================================================"
echo "Test Results Summary"
echo "================================================"
echo ""
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}All tests passed! ✓${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed. Please review the output above.${NC}"
  exit 1
fi

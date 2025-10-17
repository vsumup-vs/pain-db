#!/bin/bash

# Test Billing Endpoints
# This script tests the new billing API endpoints

echo "=================================================="
echo "Testing Billing API Endpoints"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Get all billing programs
echo -e "${YELLOW}Test 1: GET /api/billing/programs${NC}"
echo "Expected: List of 3 CMS billing programs"
response=$(curl -s http://localhost:3000/api/billing/programs)
echo "$response" | jq '.'
echo ""

# Test 2: Get billing program by code
echo -e "${YELLOW}Test 2: GET /api/billing/programs/CMS_RPM_2025${NC}"
echo "Expected: CMS RPM 2025 program details with CPT codes"
response=$(curl -s http://localhost:3000/api/billing/programs/CMS_RPM_2025)
echo "$response" | jq '.'
echo ""

# Test 3: Get organization billing programs (should require auth)
ORG_ID="cmglnf17w00007kz77y0c8ahs"
echo -e "${YELLOW}Test 3: GET /api/billing/programs/organization/$ORG_ID${NC}"
echo "Expected: 401 Unauthorized (no auth token)"
response=$(curl -s -w "\nHTTP Status: %{http_code}" http://localhost:3000/api/billing/programs/organization/$ORG_ID)
echo "$response"
echo ""

# Test 4: Get organization billing summary (should require auth)
BILLING_MONTH="2025-10"
echo -e "${YELLOW}Test 4: GET /api/billing/summary/$ORG_ID/$BILLING_MONTH${NC}"
echo "Expected: 401 Unauthorized (no auth token)"
response=$(curl -s -w "\nHTTP Status: %{http_code}" http://localhost:3000/api/billing/summary/$ORG_ID/$BILLING_MONTH)
echo "$response"
echo ""

# Test 5: Invalid billing month format
INVALID_MONTH="2025-13"
echo -e "${YELLOW}Test 5: GET /api/billing/summary/$ORG_ID/$INVALID_MONTH (invalid month)${NC}"
echo "Expected: 401 Unauthorized or 400 Bad Request"
response=$(curl -s -w "\nHTTP Status: %{http_code}" http://localhost:3000/api/billing/summary/$ORG_ID/$INVALID_MONTH)
echo "$response"
echo ""

echo "=================================================="
echo "Summary:"
echo "- Tests 1-2 should return data (no auth required)"
echo "- Tests 3-5 should return 401 Unauthorized"
echo "- To test authenticated endpoints, need to:"
echo "  1. Login and get auth token"
echo "  2. Pass token in Authorization header"
echo "=================================================="

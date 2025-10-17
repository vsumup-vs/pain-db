#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWd0a3I3NGUwMDA4N2ttdjcydjdpbm1yIiwiZW1haWwiOiJiaWxsaW5nLXRlc3RAdGVzdC5jb20iLCJpc1BsYXRmb3JtQWRtaW4iOmZhbHNlLCJvcmdhbml6YXRpb25zIjpbeyJvcmdhbml6YXRpb25JZCI6ImNtZ2xuZjE3dzAwMDA3a3o3N3kwYzhhaHMiLCJuYW1lIjoiRGVmYXVsdCBIZWFsdGhjYXJlIE9yZ2FuaXphdGlvbiIsImlzQWN0aXZlIjp0cnVlLCJyb2xlIjoiUEFUSUVOVCIsInBlcm1pc3Npb25zIjpbIlVTRVJfUkVBRCJdLCJhdmFpbGFibGVQcm9ncmFtcyI6W3siaWQiOiJjbWdzeGpjbDIwMDAxN2tmYmZ1amc1N3RnIiwibmFtZSI6IlBhaW4gTWFuYWdlbWVudCIsInR5cGUiOiJQQUlOX01BTkFHRU1FTlQifV19XSwiY3VycmVudE9yZ2FuaXphdGlvbiI6ImNtZ2xuZjE3dzAwMDA3a3o3N3kwYzhhaHMiLCJyb2xlIjoiUEFUSUVOVCIsInBlcm1pc3Npb25zIjpbIlVTRVJfUkVBRCJdLCJwcm9ncmFtQWNjZXNzIjpbImNtZ3N4amNsMjAwMDE3a2ZiZnVqZzU3dGciXSwiY3VycmVudFByb2dyYW0iOnsiaWQiOiJjbWdzeGpjbDIwMDAxN2tmYmZ1amc1N3RnIiwibmFtZSI6IlBhaW4gTWFuYWdlbWVudCIsInR5cGUiOiJQQUlOX01BTkFHRU1FTlQifSwiYmlsbGluZ0NvbnRleHQiOm51bGwsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NjA2Mjg1MDcsImV4cCI6MTc2MDcxNDkwNywiYXVkIjoiaGVhbHRoY2FyZS11c2VycyIsImlzcyI6InBhaW4tbWFuYWdlbWVudC1wbGF0Zm9ybSJ9.1t2E_bTLMP3gQi85Dc28E3B1FlPq2B06iXl_GPijoNM"
ORG_ID="cmglnf17w00007kz77y0c8ahs"

echo "============================================"
echo "Billing API Endpoint Tests"
echo "============================================"
echo ""

echo "Test 1: GET /api/billing/programs"
echo "-------------------------------------------"
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/billing/programs
echo ""
echo ""

echo "Test 2: GET /api/billing/programs/CMS_RPM_2025"
echo "-------------------------------------------"
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/billing/programs/CMS_RPM_2025
echo ""
echo ""

echo "Test 3: GET /api/billing/programs/organization/$ORG_ID"
echo "-------------------------------------------"
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/billing/programs/organization/$ORG_ID"
echo ""
echo ""

echo "Test 4: GET /api/billing/summary/$ORG_ID/2025-10"
echo "-------------------------------------------"
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/billing/summary/$ORG_ID/2025-10"
echo ""
echo ""

echo "Test 5: Invalid month - GET /api/billing/summary/$ORG_ID/2025-13"
echo "-------------------------------------------"
curl -s -w "\nHTTP Status: %{http_code}" -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/billing/summary/$ORG_ID/2025-13"
echo ""
echo ""

echo "============================================"
echo "✅ All tests completed"
echo "============================================"

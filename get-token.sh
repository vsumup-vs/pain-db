#!/bin/bash

curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' > /tmp/login_response.json

cat /tmp/login_response.json | jq '.'

TOKEN=$(cat /tmp/login_response.json | jq -r '.token // .accessToken // empty')

if [ -n "$TOKEN" ]; then
  echo "$TOKEN" > ~/.pain-db-token
  echo ""
  echo "✅ Token saved to ~/.pain-db-token"
else
  echo ""
  echo "❌ Failed to get token"
  exit 1
fi

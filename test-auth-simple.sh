#!/bin/bash

echo "🚀 Simple Authentication Service Test"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Set test environment
export NODE_ENV=test
export JWT_SECRET=test-jwt-secret-key-for-authentication-testing
export JWT_EXPIRES_IN=1h
export JWT_REFRESH_EXPIRES_IN=7d

echo "📦 Testing JWT Service..."
node quick-auth-test.js
if [ $? -eq 0 ]; then
    print_status "JWT Service test passed"
else
    print_error "JWT Service test failed"
    exit 1
fi

echo ""
echo "🧪 Testing Authentication Routes..."
# Test if auth routes can be loaded
node -e "
try {
  const authRoutes = require('./src/routes/authRoutes');
  console.log('✅ Authentication routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load auth routes:', error.message);
  process.exit(1);
}
"

if [ $? -eq 0 ]; then
    print_status "Authentication routes test passed"
else
    print_error "Authentication routes test failed"
    exit 1
fi

echo ""
echo "🔐 Testing Social Auth Service..."
node -e "
try {
  const socialAuth = require('./src/services/socialAuthService');
  console.log('✅ Social authentication service loaded successfully');
} catch (error) {
  console.error('❌ Failed to load social auth service:', error.message);
  process.exit(1);
}
"

if [ $? -eq 0 ]; then
    print_status "Social authentication service test passed"
else
    print_error "Social authentication service test failed"
    exit 1
fi

echo ""
print_status "🎉 All authentication service tests passed!"
echo "📋 Summary:"
echo "   ✅ JWT token generation and verification"
echo "   ✅ Authentication routes loading"
echo "   ✅ Social authentication service loading"
echo ""
echo "🚀 Authentication service is ready for deployment!"
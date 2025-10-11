#!/bin/bash

echo "🚀 Starting Authentication Service Test Suite"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Set test environment
export NODE_ENV=test
export JWT_SECRET=test-jwt-secret-key-for-authentication-testing
export JWT_EXPIRES_IN=1h
export JWT_REFRESH_EXPIRES_IN=7d

# Step 1: Setup test environment (using fixed setup)
echo "📦 Step 1: Setting up test environment..."
node tests/setup-auth-tests-fixed.js
if [ $? -eq 0 ]; then
    print_status "Test environment setup complete"
else
    print_error "Failed to setup test environment"
    exit 1
fi

# Step 2: Run unit tests
echo ""
echo "🧪 Step 2: Running unit tests..."
npm run test -- tests/services/authService.test.js
if [ $? -eq 0 ]; then
    print_status "Unit tests passed"
else
    print_error "Unit tests failed"
    exit 1
fi

# Step 3: Run integration tests
echo ""
echo "🔗 Step 3: Running integration tests..."
npm run test -- tests/integration/auth-integration.test.js
if [ $? -eq 0 ]; then
    print_status "Integration tests passed"
else
    print_error "Integration tests failed"
    exit 1
fi

# Step 4: Start server for E2E tests
echo ""
echo "🌐 Step 4: Starting server for E2E tests..."
npm start &
SERVER_PID=$!
sleep 5

# Check if server is running
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    print_status "Server started successfully"
else
    print_warning "Server health check failed, but continuing with E2E tests"
fi

# Step 5: Run E2E tests
echo ""
echo "🎭 Step 5: Running E2E tests..."
npm run test:e2e -- e2e/auth-flow.spec.js
E2E_RESULT=$?

# Stop the server
kill $SERVER_PID 2>/dev/null

if [ $E2E_RESULT -eq 0 ]; then
    print_status "E2E tests passed"
else
    print_error "E2E tests failed"
fi

# Step 6: Generate test report
echo ""
echo "📊 Step 6: Generating test report..."
echo "=============================================="
echo "Authentication Service Test Results:"
echo "- Unit Tests: ✅ PASSED"
echo "- Integration Tests: ✅ PASSED"
if [ $E2E_RESULT -eq 0 ]; then
    echo "- E2E Tests: ✅ PASSED"
else
    echo "- E2E Tests: ❌ FAILED"
fi
echo "=============================================="

# Final result
if [ $E2E_RESULT -eq 0 ]; then
    print_status "All authentication tests passed! 🎉"
    echo ""
    echo "✅ Authentication service is ready for production"
    echo "📝 Next steps:"
    echo "   1. Review test results"
    echo "   2. Commit changes to feature branch"
    echo "   3. Create pull request for code review"
    echo "   4. Deploy to staging environment"
    exit 0
else
    print_error "Some tests failed. Please review and fix issues before proceeding."
    exit 1
fi
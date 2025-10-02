#!/bin/bash

echo "🧪 Frontend Testing Automation Suite"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run tests with error handling
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "\n${YELLOW}Running $test_name...${NC}"
    if eval "$test_command"; then
        echo -e "${GREEN}✅ $test_name passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name failed${NC}"
        return 1
    fi
}

# Change to frontend directory
cd "$(dirname "$0")"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run linting
run_test "ESLint" "npm run lint"
LINT_RESULT=$?

# Run unit tests
run_test "Unit Tests" "npm run test:run"
UNIT_RESULT=$?

# Run unit tests with coverage
run_test "Coverage Report" "npm run test:coverage"
COVERAGE_RESULT=$?

# Start servers for E2E tests
echo -e "\n${YELLOW}Starting servers for E2E tests...${NC}"
npm run dev &
FRONTEND_PID=$?

cd ..
npm start &
BACKEND_PID=$?

# Wait for servers to start
sleep 10

cd frontend

# Run E2E tests
run_test "E2E Tests" "npm run test:e2e"
E2E_RESULT=$?

# Cleanup
echo -e "\n${YELLOW}Cleaning up...${NC}"
kill $FRONTEND_PID 2>/dev/null
kill $BACKEND_PID 2>/dev/null

# Summary
echo -e "\n${YELLOW}Test Results Summary:${NC}"
echo "===================="

if [ $LINT_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ Linting: PASSED${NC}"
else
    echo -e "${RED}❌ Linting: FAILED${NC}"
fi

if [ $UNIT_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ Unit Tests: PASSED${NC}"
else
    echo -e "${RED}❌ Unit Tests: FAILED${NC}"
fi

if [ $COVERAGE_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ Coverage: PASSED${NC}"
else
    echo -e "${RED}❌ Coverage: FAILED${NC}"
fi

if [ $E2E_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ E2E Tests: PASSED${NC}"
else
    echo -e "${RED}❌ E2E Tests: FAILED${NC}"
fi

# Overall result
if [ $LINT_RESULT -eq 0 ] && [ $UNIT_RESULT -eq 0 ] && [ $E2E_RESULT -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}💥 Some tests failed!${NC}"
    exit 1
fi
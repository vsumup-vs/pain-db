#!/bin/bash

# Performance Test Runner
# Runs all performance test scripts and generates summary report

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                                                                   ║"
echo "║              PERFORMANCE TEST SUITE RUNNER                        ║"
echo "║                                                                   ║"
echo "║  Running all performance tests for recent optimizations          ║"
echo "║                                                                   ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must be run from project root directory${NC}"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Create test results directory
RESULTS_DIR="test-results"
mkdir -p "$RESULTS_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "\n${BOLD}Test Results Directory:${NC} ${CYAN}$RESULTS_DIR${NC}\n"

# Test 1: Database Index Performance
echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Test 1: Database Index Performance${NC}"
echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════════${NC}\n"

node scripts/test-database-index-performance.js 2>&1 | tee "$RESULTS_DIR/index-performance-$TIMESTAMP.log"
TEST1_EXIT=$?

if [ $TEST1_EXIT -eq 0 ]; then
    echo -e "\n${GREEN}✓ Database Index Performance Tests: PASSED${NC}\n"
else
    echo -e "\n${RED}✗ Database Index Performance Tests: FAILED${NC}\n"
fi

# Test 2: Observation Review API
echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}Test 2: Observation Review API Performance${NC}"
echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════════${NC}\n"

node scripts/test-observation-review-api.js 2>&1 | tee "$RESULTS_DIR/observation-review-$TIMESTAMP.log"
TEST2_EXIT=$?

if [ $TEST2_EXIT -eq 0 ]; then
    echo -e "\n${GREEN}✓ Observation Review API Tests: PASSED${NC}\n"
else
    echo -e "\n${RED}✗ Observation Review API Tests: FAILED${NC}\n"
fi

# Generate Summary Report
echo -e "\n${BOLD}${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${BLUE}              TEST SUITE SUMMARY REPORT                              ${NC}"
echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════════════════${NC}\n"

echo -e "${BOLD}Date:${NC} $(date)"
echo -e "${BOLD}Test Results Saved To:${NC} ${CYAN}$RESULTS_DIR/${NC}\n"

echo -e "${BOLD}Test Results:${NC}"
if [ $TEST1_EXIT -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} Database Index Performance"
else
    echo -e "  ${RED}✗${NC} Database Index Performance"
fi

if [ $TEST2_EXIT -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} Observation Review API"
else
    echo -e "  ${RED}✗${NC} Observation Review API"
fi

# Overall status
if [ $TEST1_EXIT -eq 0 ] && [ $TEST2_EXIT -eq 0 ]; then
    echo -e "\n${BOLD}${GREEN}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${GREEN}           ALL TESTS PASSED SUCCESSFULLY ✓                          ${NC}"
    echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════════════════════${NC}\n"
    exit 0
else
    echo -e "\n${BOLD}${RED}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${RED}           SOME TESTS FAILED - CHECK LOGS                           ${NC}"
    echo -e "${BOLD}${RED}═══════════════════════════════════════════════════════════════════${NC}\n"
    exit 1
fi

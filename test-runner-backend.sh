#!/bin/bash

# Backend Test Automation Runner
# Usage: ./test-runner-backend.sh [command] [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if database is running
check_database() {
    print_status "Checking database connection..."
    
    if ! pg_isready -h localhost -p 5432 -U pain_test_user -d pain_db_test >/dev/null 2>&1; then
        print_error "Test database is not accessible"
        print_status "Please ensure PostgreSQL is running and test database exists"
        exit 1
    fi
    
    print_success "Database connection verified"
}

# Function to setup test environment
setup_test_env() {
    print_status "Setting up test environment..."
    
    # Ensure test database exists
    if ! psql -h localhost -U pain_test_user -d pain_db_test -c "SELECT 1;" >/dev/null 2>&1; then
        print_warning "Creating test database..."
        createdb -h localhost -U pain_test_user pain_db_test || true
    fi
    
    # Run migrations
    print_status "Running database migrations..."
    npm run prisma:migrate >/dev/null 2>&1 || true
    
    print_success "Test environment ready"
}

# Function to run all tests
run_all_tests() {
    print_status "Running all backend tests..."
    
    npm run test:coverage
    
    print_success "All tests completed"
}

# Function to run specific controller tests
run_controller_tests() {
    local controller=$1
    
    if [ -z "$controller" ]; then
        print_error "Controller name required"
        echo "Usage: ./test-runner-backend.sh controller <controller-name>"
        exit 1
    fi
    
    print_status "Running tests for $controller controller..."
    
    npm test -- --testNamePattern="$controller"
    
    print_success "$controller controller tests completed"
}

# Function to run integration tests
run_integration_tests() {
    print_status "Running integration tests..."
    
    npm test -- tests/integration/
    
    print_success "Integration tests completed"
}

# Function to run tests with watch mode
run_watch_tests() {
    print_status "Starting test watch mode..."
    
    npm run test:watch
}

# Function to generate test coverage report
generate_coverage() {
    print_status "Generating test coverage report..."
    
    npm run test:coverage
    
    if [ -d "coverage" ]; then
        print_success "Coverage report generated in ./coverage/"
        
        if command -v open >/dev/null 2>&1; then
            open coverage/lcov-report/index.html
        elif command -v xdg-open >/dev/null 2>&1; then
            xdg-open coverage/lcov-report/index.html
        fi
    fi
}

# Function to run performance tests
run_performance_tests() {
    print_status "Running performance tests..."
    
    # Run tests with timing
    time npm test
    
    print_success "Performance tests completed"
}

# Function to validate test setup
validate_setup() {
    print_status "Validating test setup..."
    
    # Check if all required test files exist
    local required_tests=(
        "tests/controllers/clinicianController.test.js"
        "tests/controllers/patientController.test.js"
        "tests/controllers/enrollmentController.test.js"
        "tests/controllers/observationController.test.js"
    )
    
    for test_file in "${required_tests[@]}"; do
        if [ ! -f "$test_file" ]; then
            print_warning "Missing test file: $test_file"
        else
            print_success "Found: $test_file"
        fi
    done
    
    # Check test configuration
    if [ ! -f "jest.config.js" ]; then
        print_error "Missing jest.config.js"
        exit 1
    fi
    
    print_success "Test setup validation completed"
}

# Function to clean test data
clean_test_data() {
    print_status "Cleaning test data..."
    
    node -e "
        const { PrismaClient } = require('./generated/prisma');
        const prisma = new PrismaClient();
        
        async function cleanup() {
            try {
                await prisma.observation.deleteMany();
                await prisma.enrollment.deleteMany();
                await prisma.patient.deleteMany();
                await prisma.clinician.deleteMany();
                await prisma.metricDefinition.deleteMany();
                await prisma.alert.deleteMany();
                console.log('Test data cleaned successfully');
            } catch (error) {
                console.error('Error cleaning test data:', error.message);
            } finally {
                await prisma.\$disconnect();
            }
        }
        
        cleanup();
    "
    
    print_success "Test data cleaned"
}

# Main script logic
case "$1" in
    "all")
        check_database
        setup_test_env
        run_all_tests
        ;;
    "controller")
        check_database
        setup_test_env
        run_controller_tests "$2"
        ;;
    "integration")
        check_database
        setup_test_env
        run_integration_tests
        ;;
    "watch")
        check_database
        setup_test_env
        run_watch_tests
        ;;
    "coverage")
        check_database
        setup_test_env
        generate_coverage
        ;;
    "performance")
        check_database
        setup_test_env
        run_performance_tests
        ;;
    "validate")
        validate_setup
        ;;
    "clean")
        clean_test_data
        ;;
    "setup")
        setup_test_env
        ;;
    *)
        echo "Backend Test Automation Runner"
        echo ""
        echo "Usage: $0 {command} [options]"
        echo ""
        echo "Commands:"
        echo "  all                    - Run all tests with coverage"
        echo "  controller <name>      - Run specific controller tests"
        echo "  integration           - Run integration tests"
        echo "  watch                 - Run tests in watch mode"
        echo "  coverage              - Generate coverage report"
        echo "  performance           - Run performance tests"
        echo "  validate              - Validate test setup"
        echo "  clean                 - Clean test data"
        echo "  setup                 - Setup test environment"
        echo ""
        echo "Examples:"
        echo "  $0 all"
        echo "  $0 controller clinician"
        echo "  $0 coverage"
        ;;
esac
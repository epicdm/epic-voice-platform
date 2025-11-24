#!/bin/bash
# Test runner script for call outcomes tests
#
# Usage:
#   ./run_tests.sh              # Run all tests
#   ./run_tests.sh unit         # Run unit tests only
#   ./run_tests.sh integration  # Run integration tests only
#   ./run_tests.sh coverage     # Run with coverage report

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
TEST_DIR="backend/tests/call_outcomes"
PROJECT_ROOT="/opt/livekit1"

# Change to project root
cd "$PROJECT_ROOT"

# Ensure test database URL is set
if [ -z "$TEST_DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  TEST_DATABASE_URL not set, using default${NC}"
    export TEST_DATABASE_URL="postgresql://postgres:nXrRje4emjejjeKI009p@localhost:5432/epic_voice_test_db"
fi

# Function to check dependencies
check_dependencies() {
    echo -e "${YELLOW}Checking dependencies...${NC}"

    if ! python3 -c "import pytest" 2>/dev/null; then
        echo -e "${YELLOW}Installing pytest...${NC}"
        pip3 install pytest pytest-cov
    fi

    if ! python3 -c "import sqlalchemy" 2>/dev/null; then
        echo -e "${RED}❌ SQLAlchemy not installed${NC}"
        echo "Install with: pip3 install sqlalchemy psycopg2-binary"
        exit 1
    fi

    echo -e "${GREEN}✅ Dependencies OK${NC}"
}

# Function to run tests
run_tests() {
    local test_type=$1

    echo -e "${YELLOW}Running $test_type tests...${NC}"

    case $test_type in
        unit)
            python3 -m pytest -v -m unit "$TEST_DIR"
            ;;
        integration)
            python3 -m pytest -v -m integration "$TEST_DIR"
            ;;
        idempotency)
            python3 -m pytest -v -m idempotency "$TEST_DIR"
            ;;
        multitenant)
            python3 -m pytest -v -m multitenant "$TEST_DIR"
            ;;
        coverage)
            python3 -m pytest --cov=backend/call_outcomes --cov-report=html --cov-report=term "$TEST_DIR"
            echo -e "${GREEN}✅ Coverage report generated in htmlcov/index.html${NC}"
            ;;
        *)
            python3 -m pytest -v "$TEST_DIR"
            ;;
    esac
}

# Main execution
echo "=========================================="
echo "Call Outcomes Test Suite"
echo "=========================================="
echo ""

# Check dependencies
check_dependencies

# Run tests
TEST_TYPE=${1:-all}
run_tests "$TEST_TYPE"

# Summary
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi

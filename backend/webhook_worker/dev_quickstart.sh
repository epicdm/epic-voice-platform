#!/bin/bash
# Webhook Worker - Development Quick Start
# Run this script to test the worker in development mode

set -e

echo "=========================================="
echo "Webhook Worker - Development Quick Start"
echo "=========================================="
echo ""

# Check Python version
echo "🔍 Checking Python version..."
python3 --version || { echo "❌ Python 3 not found"; exit 1; }

# Check database connection
echo ""
echo "🔍 Checking database connection..."
if command -v psql &> /dev/null; then
    PGPASSWORD="${PGPASSWORD:-nXrRje4emjejjeKI009p}" psql -U postgres -d epic_voice_db -c "\dt webhook*" &> /dev/null && \
        echo "✅ Database tables exist" || \
        echo "⚠️  Database tables not found - run DATABASE_SCHEMA.sql first"
else
    echo "⚠️  psql not found - skipping database check"
fi

# Check Python dependencies
echo ""
echo "🔍 Checking Python dependencies..."
python3 -c "import sqlalchemy, requests" 2>/dev/null && \
    echo "✅ Required Python packages installed" || \
    { echo "❌ Missing packages. Install with: pip install sqlalchemy psycopg2-binary requests"; exit 1; }

# Run basic tests
echo ""
echo "🧪 Running basic tests..."
python3 test_basic.py || { echo "❌ Tests failed"; exit 1; }

# Setup environment
echo ""
echo "⚙️  Setting up environment..."
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:nXrRje4emjejjeKI009p@localhost:5432/epic_voice_db}"
export WORKER_POLL_INTERVAL="${WORKER_POLL_INTERVAL:-5}"
export WORKER_BATCH_SIZE="${WORKER_BATCH_SIZE:-10}"
export LOG_LEVEL="${LOG_LEVEL:-INFO}"

echo "  DATABASE_URL: ${DATABASE_URL}"
echo "  WORKER_POLL_INTERVAL: ${WORKER_POLL_INTERVAL}s"
echo "  WORKER_BATCH_SIZE: ${WORKER_BATCH_SIZE}"
echo "  LOG_LEVEL: ${LOG_LEVEL}"

# Check if worker is already running
echo ""
echo "🔍 Checking for running workers..."
if pgrep -f "webhook_worker/worker.py" > /dev/null; then
    echo "⚠️  Worker already running:"
    ps aux | grep "webhook_worker/worker.py" | grep -v grep
    echo ""
    read -p "Kill existing workers and start new one? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pkill -f "webhook_worker/worker.py" || true
        sleep 1
    else
        echo "Exiting..."
        exit 0
    fi
fi

# Start worker
echo ""
echo "🚀 Starting webhook worker (instance 1)..."
echo "   Press Ctrl+C to stop"
echo ""

python3 worker.py --instance 1 --debug

echo ""
echo "✅ Worker stopped successfully"

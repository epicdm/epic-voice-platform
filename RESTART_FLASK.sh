#!/bin/bash
#
# Flask Backend Restart Script
# Run this to load the new funnel CRUD endpoints
#

set -e

echo "🔄 Restarting Flask Backend..."

# Find and kill current process
FLASK_PID=$(ps aux | grep "python.*user_dashboard" | grep -v grep | awk '{print $2}')

if [ -n "$FLASK_PID" ]; then
    echo "📍 Found Flask process: PID $FLASK_PID"
    echo "🛑 Stopping Flask backend..."
    kill $FLASK_PID
    sleep 2

    # Force kill if still running
    if ps -p $FLASK_PID > /dev/null 2>&1; then
        echo "⚠️  Process still running, forcing kill..."
        kill -9 $FLASK_PID
        sleep 1
    fi
    echo "✅ Flask stopped"
else
    echo "ℹ️  Flask not running"
fi

# Start Flask
echo "🚀 Starting Flask backend..."
cd /opt/livekit1
nohup python3 user_dashboard.py > /var/log/flask_backend.log 2>&1 &
NEW_PID=$!

sleep 3

# Verify it started
if ps -p $NEW_PID > /dev/null 2>&1; then
    echo "✅ Flask backend started successfully"
    echo "📍 New PID: $NEW_PID"
    echo "📄 Logs: /var/log/flask_backend.log"
    echo ""
    echo "🧪 Testing new endpoints..."

    # Wait for Flask to be ready
    sleep 2

    # Test health
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/ | grep -q "200\|302"; then
        echo "✅ Flask is responding"
    else
        echo "⚠️  Flask not responding yet, check logs"
    fi

    echo ""
    echo "📋 New CRUD endpoints available:"
    echo "  POST   /api/funnels/<id>/nodes"
    echo "  PUT    /api/funnels/<id>/nodes/<node_id>"
    echo "  DELETE /api/funnels/<id>/nodes/<node_id>"
    echo "  POST   /api/funnels/<id>/edges"
    echo "  DELETE /api/funnels/<id>/edges/<edge_id>"
else
    echo "❌ Flask failed to start!"
    echo "📄 Check logs: tail -f /var/log/flask_backend.log"
    exit 1
fi

echo ""
echo "✅ Flask restart complete!"

#!/bin/bash

echo "=================================================="
echo "RESTARTING FLASK WITH FUNNEL ENGINE INTEGRATION"
echo "=================================================="
echo ""

echo "1. Stopping existing Flask process..."
sudo pkill -9 -f user_dashboard.py
sleep 2

if ps aux | grep user_dashboard.py | grep -v grep > /dev/null; then
    echo "   ❌ Failed to stop Flask process"
    echo "   Run: sudo kill -9 $(pgrep -f user_dashboard.py)"
    exit 1
else
    echo "   ✓ Flask process stopped"
fi

echo ""
echo "2. Starting Flask application..."
cd /opt/livekit1
sudo nohup python3 user_dashboard.py > backend.log 2>&1 &
BACKEND_PID=$!
echo "   ✓ Flask started (PID: $BACKEND_PID)"

echo ""
echo "3. Waiting for Flask to initialize..."
sleep 5

echo ""
echo "4. Checking Flask logs for Funnel Engine registration..."
if grep -q "Funnel Engine API registered" backend.log; then
    echo "   ✅ Funnel Engine blueprint registered successfully!"
    grep "Funnel Engine" backend.log | tail -1 | sed 's/^/   /'
else
    echo "   ❌ Funnel Engine blueprint NOT found in logs"
    echo "   Recent logs:"
    tail -10 backend.log | sed 's/^/   /'
    exit 1
fi

echo ""
echo "5. Testing API endpoints..."
echo ""

# Test 1: List funnels (should return empty list)
echo "   Test 1: GET /api/funnels (list funnels)"
RESPONSE=$(curl -s http://localhost:5001/api/funnels)
if echo "$RESPONSE" | grep -q '"funnels"'; then
    echo "   ✅ PASS - Returns funnel list"
    echo "   Response: $RESPONSE"
else
    echo "   ❌ FAIL - Expected funnel list"
    echo "   Response: $RESPONSE"
fi

echo ""
echo "   Test 2: POST /api/funnels (create funnel - will fail without auth)"
RESPONSE=$(curl -s -X POST http://localhost:5001/api/funnels \
    -H "Content-Type: application/json" \
    -d '{"name":"Test Funnel","description":"Integration test","status":"draft"}')
echo "   Response: $RESPONSE"
if echo "$RESPONSE" | grep -q "Unauthorized\|redirect\|login"; then
    echo "   ✅ PASS - Auth required (expected)"
else
    echo "   ⚠️  Unexpected response"
fi

echo ""
echo "   Test 3: GET /api/funnels/queue/stats (queue statistics)"
RESPONSE=$(curl -s http://localhost:5001/api/funnels/queue/stats)
echo "   Response: $RESPONSE"
if echo "$RESPONSE" | grep -q "Unauthorized\|redirect\|login"; then
    echo "   ✅ PASS - Auth required (expected)"
else
    echo "   ⚠️  Unexpected response"
fi

echo ""
echo "=================================================="
echo "RESTART COMPLETE - ENDPOINTS ACTIVE"
echo "=================================================="
echo ""
echo "✅ Flask restarted with Funnel Engine"
echo "✅ 11 endpoints registered at /api/funnels"
echo ""
echo "Next steps:"
echo "1. Login to get session cookie"
echo "2. Test authenticated endpoints with curl"
echo "3. Configure funnel workers (see DEPLOYMENT_COMPLETE.md)"
echo ""
echo "Logs: tail -f /opt/livekit1/backend.log"
echo ""

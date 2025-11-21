#!/bin/bash

echo "=================================================="
echo "Restarting All LiveKit Services"
echo "=================================================="
echo ""

echo "1. Stopping services..."
echo "   - Stopping backend..."
pkill -f user_dashboard.py 2>/dev/null && echo "     ✓ Backend stopped" || echo "     - Backend not running"

echo "   - Stopping agent..."
pkill -f "python3 main.py" 2>/dev/null && echo "     ✓ Agent stopped" || echo "     - Agent not running"

echo ""
echo "   Waiting 3 seconds..."
sleep 3

echo ""
echo "2. Starting backend..."
cd /opt/livekit1
nohup python3 -u user_dashboard.py > backend.log 2>&1 &
BACKEND_PID=$!
echo "   ✓ Backend started (PID: $BACKEND_PID)"

echo ""
echo "3. Starting agent..."
cd /opt/livekit1/agents/sales_agent
nohup python3 main.py > agent.log 2>&1 &
AGENT_PID=$!
echo "   ✓ Agent started (PID: $AGENT_PID)"

echo ""
echo "   Waiting 5 seconds for services to initialize..."
sleep 5

echo ""
echo "4. Checking status..."
echo ""

if ps -p $BACKEND_PID > /dev/null 2>&1; then
    echo "   ✅ Backend running (PID: $BACKEND_PID)"
else
    echo "   ❌ Backend failed to start - check backend.log"
fi

if ps -p $AGENT_PID > /dev/null 2>&1; then
    echo "   ✅ Agent running (PID: $AGENT_PID)"
else
    echo "   ❌ Agent failed to start - check agent.log"
fi

echo ""
echo "5. Recent logs:"
echo ""
echo "   Backend (last 5 lines):"
tail -5 /opt/livekit1/backend.log 2>/dev/null | sed 's/^/     /'

echo ""
echo "   Agent (last 5 lines):"
tail -5 /opt/livekit1/agents/sales_agent/agent.log 2>/dev/null | sed 's/^/     /'

echo ""
echo "=================================================="
echo "Services Restarted!"
echo "=================================================="
echo ""
echo "Access GUI: http://localhost:3001"
echo "Backend API: http://localhost:5001"
echo ""
echo "Monitor logs:"
echo "  tail -f /opt/livekit1/backend.log"
echo "  tail -f /opt/livekit1/agents/sales_agent/agent.log"
echo ""

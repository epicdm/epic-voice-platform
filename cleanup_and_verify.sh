#!/bin/bash

echo "=========================================="
echo "LiveKit Agent Cleanup & Verification"
echo "=========================================="
echo ""

# Step 1: Kill all orphaned agent processes
echo "Step 1: Cleaning up orphaned agent processes..."
pkill -9 -f "agents/.*/main.py" 2>/dev/null
sleep 2

REMAINING=$(ps aux | grep -E "agents/.*/main.py" | grep -v grep | wc -l)
if [ $REMAINING -eq 0 ]; then
    echo "✅ All agent processes terminated"
else
    echo "⚠️  $REMAINING agent processes still running"
    ps aux | grep -E "agents/.*/main.py" | grep -v grep
fi
echo ""

# Step 2: Reset database status
echo "Step 2: Resetting agent status in database..."
python3 << 'PYTHON_EOF'
import sqlite3
conn = sqlite3.connect('/opt/livekit1/voice_agents.db')
cursor = conn.cursor()

# Reset all agents to 'created' status
cursor.execute("UPDATE agent_configs SET status = 'created' WHERE status != 'created'")
affected = cursor.rowcount
conn.commit()

print(f"✅ Reset {affected} agent(s) to 'created' status")

# Show current status
cursor.execute('SELECT name, status FROM agent_configs ORDER BY name')
print("\nCurrent Agent Status:")
print("-" * 50)
for name, status in cursor.fetchall():
    print(f"  {name}: {status}")

conn.close()
PYTHON_EOF
echo ""

# Step 3: Verify LiveKit Cloud status
echo "Step 3: Checking LiveKit Cloud status..."
cd /opt/livekit1
echo "Rooms:"
lk room list | tail -n +3
echo ""
echo "Agent Workers:"
lk agent list | tail -n +2 || echo "No agents registered"
echo ""

# Step 4: Verify no local processes
echo "Step 4: Verifying no agent processes running locally..."
LOCAL_PROCS=$(ps aux | grep python | grep -E "agents/|main.py" | grep -v grep | wc -l)
if [ $LOCAL_PROCS -eq 0 ]; then
    echo "✅ No local agent processes running"
else
    echo "⚠️  Found $LOCAL_PROCS local agent processes:"
    ps aux | grep python | grep -E "agents/|main.py" | grep -v grep
fi
echo ""

# Step 5: Instructions
echo "=========================================="
echo "Cleanup Complete!"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Refresh your browser at http://localhost:3001/agents"
echo "2. All agents should show 'Deploy to Cloud' button"
echo "3. Click 'Deploy to Cloud' on one agent"
echo "4. Wait 15 seconds for deployment"
echo "5. Verify green 'LiveKit Deployment' panel appears"
echo "6. Test an outbound call"
echo ""
echo "To verify deployment worked:"
echo "  ps aux | grep 'agents/' | grep python"
echo "  lk agent list"
echo ""

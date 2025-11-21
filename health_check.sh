#!/bin/bash
echo "🏥 Funnel System Health Check"
echo ""

# Frontend
if curl -s http://localhost:3000 | grep -q "Epic.ai"; then
  echo "✅ Frontend: Running"
else
  echo "❌ Frontend: Down"
fi

# Backend
if curl -s http://localhost:5001 | grep -q "Redirecting\|html"; then
  echo "✅ Backend: Running"
else
  echo "❌ Backend: Down"
fi

# Workers
for i in 1 2 3; do
  if systemctl is-active --quiet funnel-worker@$i.service; then
    echo "✅ Worker $i: Active"
  else
    echo "❌ Worker $i: Inactive"
  fi
done

# Database
if PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c "SELECT 1;" > /dev/null 2>&1; then
  echo "✅ Database: Connected"
else
  echo "❌ Database: Connection failed"
fi

echo ""
echo "📊 Current Counts:"
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -t -c \
  "SELECT 'Funnels: ' || COUNT(*) FROM funnels
   UNION ALL SELECT 'Nodes: ' || COUNT(*) FROM funnel_nodes
   UNION ALL SELECT 'Executions: ' || COUNT(*) FROM funnel_executions
   UNION ALL SELECT 'Queue: ' || COUNT(*) || ' pending' FROM funnel_stage_queue WHERE status = 'pending';"

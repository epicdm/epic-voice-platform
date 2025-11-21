# 🚀 Funnel System - Production Deployment Checklist

Complete checklist for deploying the Funnel System to production.

**Date**: 2025-11-15
**Version**: 1.0.0
**Status**: Ready for Deployment

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### Backend Infrastructure

- [x] **Database Schema**
  - [x] All 6 tables created (funnels, funnel_nodes, funnel_edges, funnel_executions, funnel_execution_events, funnel_stage_queue)
  - [x] 17 foreign key constraints configured
  - [x] All indexes created for performance
  - [x] Triggers for updated_at timestamps
  - [x] Enum types defined (funnel_status, node_type, execution_status, queue_status)

- [x] **Flask Backend**
  - [x] All 11 API endpoints implemented
  - [x] Individual node/edge CRUD routes added
  - [x] Multi-tenant user_id isolation enforced
  - [x] Authentication via @login_required decorator
  - [x] Error handling and logging implemented
  - [ ] **Backend restart required** ⚠️ (new routes not loaded yet)

- [x] **Worker Services**
  - [x] 3 funnel-worker instances running
  - [x] systemd services configured and enabled
  - [x] Memory limits set (512MB per worker)
  - [x] Auto-restart on failure configured
  - [x] Queue processing validated

### Frontend Infrastructure

- [x] **Next.js Application**
  - [x] Next.js 15 running on port 3000
  - [x] All funnel pages created (/dashboard/funnels, /dashboard/funnels/[id]/edit)
  - [x] React Flow integration with SSR disabled
  - [x] All 6 API proxy routes created
  - [x] TypeScript types defined
  - [x] API client functions implemented

- [x] **Component Library**
  - [x] FunnelCard component (264 lines)
  - [x] FunnelGrid component (106 lines)
  - [x] 7 custom React Flow node components
  - [x] PageHeader, Toolbar, EmptyState components
  - [x] Skeleton loaders for loading states

- [x] **Navigation**
  - [x] "Funnels" added to sidebar with Workflow icon
  - [x] Breadcrumb navigation configured
  - [x] Proper routing setup

### Code Quality

- [x] **Type Safety**
  - [x] TypeScript types for all entities
  - [x] Enums for status/node types
  - [x] API response interfaces
  - [x] Path aliases configured (@/)

- [x] **Error Handling**
  - [x] Error boundaries on all pages
  - [x] Try/catch in all async operations
  - [x] User-friendly error messages
  - [x] Network error handling

- [x] **Security**
  - [x] Authentication required on all routes
  - [x] Session cookies forwarded to backend
  - [x] Multi-tenant data isolation
  - [x] Input validation on all endpoints

---

## 🔧 DEPLOYMENT STEPS

### Step 1: Restart Flask Backend ⚠️ **CRITICAL**

```bash
# Run the restart script
cd /opt/livekit1
./RESTART_FLASK.sh

# OR manually:
pkill -f user_dashboard.py
python3 user_dashboard.py &

# Verify it's running
ps aux | grep user_dashboard
curl http://localhost:5001/
```

**Expected Result**: Flask responds with HTTP 200 or 302 (redirect to login)

### Step 2: Verify New Endpoints

Test one of the new CRUD endpoints to confirm they're loaded:

```bash
# Get a session cookie by logging into the app first
# Then test node creation (should return 401 without auth, not 404)

curl -X POST http://localhost:5001/api/funnels/test-id/nodes \
  -H "Content-Type: application/json" \
  -d '{"node_type":"delay","label":"Test"}'

# Expected: 401 Unauthorized (route exists)
# NOT: 404 Not Found (route missing)
```

### Step 3: Test Frontend in Browser

1. **Navigate to Funnel List**:
   - URL: `http://localhost:3000/dashboard/funnels`
   - Expected: Grid of existing funnels or empty state

2. **Create New Funnel**:
   - Click "Create Funnel" button
   - Fill in: Name, Description, Trigger Type
   - Click "Create & Edit"
   - Expected: Redirect to visual editor

3. **Test Visual Builder**:
   - Add a delay node from left palette
   - Drag node to new position
   - Check browser Network tab for PUT request
   - Expected: Auto-save request to `/api/user/funnels/.../nodes/...`

4. **Test Node Configuration**:
   - Click a node to select it
   - Edit config in right panel
   - Click "Save Node"
   - Expected: Network request succeeds (200 OK)

5. **Test Edge Creation**:
   - Drag from one node's bottom handle to another's top handle
   - Expected: Animated edge appears, saved to backend

6. **Test Node Deletion**:
   - Select a node
   - Click trash icon in right panel
   - Confirm deletion
   - Expected: Node and connected edges removed

### Step 4: Verify Worker Execution

```bash
# Check worker status
systemctl status funnel-worker@1.service

# Check recent logs
journalctl -u funnel-worker@1.service -n 50 --no-pager

# Verify queue processing
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c \
  "SELECT status, COUNT(*) FROM funnel_stage_queue GROUP BY status;"
```

### Step 5: Database Health Check

```bash
# Run integrity check
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db << 'EOF'
SELECT
  'Funnels' as entity, COUNT(*) as count
FROM funnels
UNION ALL
SELECT 'Nodes', COUNT(*) FROM funnel_nodes
UNION ALL
SELECT 'Edges', COUNT(*) FROM funnel_edges
UNION ALL
SELECT 'Executions', COUNT(*) FROM funnel_executions;
EOF
```

---

## 🧪 POST-DEPLOYMENT TESTING

### Smoke Tests

Run these tests immediately after deployment:

#### Test 1: Create Funnel
```bash
# Via UI: Create funnel → Verify in database
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c \
  "SELECT name, status FROM funnels ORDER BY created_at DESC LIMIT 1;"
```

#### Test 2: Add Nodes
```bash
# Via UI: Add 3 nodes → Drag them → Verify positions saved
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c \
  "SELECT label, position_x, position_y FROM funnel_nodes WHERE funnel_id = 'YOUR_FUNNEL_ID';"
```

#### Test 3: Create Edges
```bash
# Via UI: Connect nodes → Verify edges in database
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c \
  "SELECT source_node_id, target_node_id FROM funnel_edges WHERE funnel_id = 'YOUR_FUNNEL_ID';"
```

#### Test 4: Execute Funnel
```bash
# Via Flask API: Start execution → Verify worker processes it
curl -X POST http://localhost:5001/api/funnels/YOUR_FUNNEL_ID/start \
  -H "Cookie: session=YOUR_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"contact_data":{"phone":"+15555551234","name":"Test"}}'

# Check execution progress
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c \
  "SELECT event_type, created_at FROM funnel_execution_events WHERE execution_id = 'EXECUTION_ID' ORDER BY created_at;"
```

### Performance Tests

#### Test 1: Large Funnel (20+ nodes)
- Create funnel with 20 nodes
- Verify drag performance remains smooth
- Check auto-save doesn't lag

#### Test 2: Multiple Executions
- Start 10 executions simultaneously
- Verify workers process all without errors
- Check queue doesn't accumulate

#### Test 3: Concurrent Users
- Open 3 browser tabs with different users
- Each creates funnel simultaneously
- Verify no data leakage between users

---

## 🛡️ SECURITY VERIFICATION

### Multi-Tenancy Tests

```bash
# Test 1: User A cannot access User B's funnel
# Get funnel ID from User A, try to access as User B
# Expected: 404 Not Found

# Test 2: User A cannot modify User B's nodes
# Try to update node belonging to User B as User A
# Expected: 404 Not Found

# Test 3: Database isolation
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db << 'EOF'
-- Verify all funnel records have user_id
SELECT
  'Funnels without user_id' as check_name,
  COUNT(*) as count
FROM funnels WHERE user_id IS NULL
UNION ALL
SELECT
  'Nodes without user_id',
  COUNT(*)
FROM funnel_nodes WHERE user_id IS NULL;
EOF
```

### Authentication Tests

- [ ] Unauthenticated request to `/api/user/funnels` → 401
- [ ] Invalid session cookie → 401
- [ ] Expired session → Redirect to login
- [ ] Valid session → 200 with data

---

## 📊 MONITORING SETUP

### Metrics to Track

1. **API Performance**:
   - Endpoint response times
   - Error rates per endpoint
   - Request volume

2. **Worker Health**:
   - Queue size (should stay low)
   - Processing rate (stages/minute)
   - Failure rate
   - Memory usage

3. **Database**:
   - Query performance
   - Connection pool utilization
   - Table sizes
   - Orphaned records (should be 0)

4. **User Activity**:
   - Funnels created per day
   - Active executions
   - Node operations per session

### Recommended Alerts

```bash
# Alert if queue size > 100
SELECT COUNT(*) FROM funnel_stage_queue WHERE status = 'pending';

# Alert if workers not processing (no updates in 5 min)
SELECT MAX(processed_at) FROM funnel_stage_queue WHERE status = 'completed';

# Alert if high failure rate (>10% failed)
SELECT
  COUNT(*) FILTER (WHERE status = 'failed') * 100.0 / COUNT(*) as failure_rate
FROM funnel_executions
WHERE created_at > NOW() - INTERVAL '1 hour';
```

---

## 🔄 ROLLBACK PLAN

If deployment fails:

### Rollback Step 1: Restore Frontend
```bash
cd /opt/livekit1/frontend
git checkout HEAD~1  # Go back one commit
npm run build
# Restart Next.js service
```

### Rollback Step 2: Restore Backend
```bash
cd /opt/livekit1/backend/funnel_engine
git checkout HEAD~1
# Restart Flask
pkill -f user_dashboard.py
python3 /opt/livekit1/user_dashboard.py &
```

### Rollback Step 3: Database (if needed)
```bash
# Only if migrations were run
# Run reverse migrations
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db < rollback.sql
```

---

## 📝 POST-DEPLOYMENT TASKS

### Day 1
- [ ] Monitor error logs for 24 hours
- [ ] Check worker queue stays empty
- [ ] Verify no user complaints
- [ ] Test with real users

### Week 1
- [ ] Analyze usage patterns
- [ ] Optimize slow queries if any
- [ ] Collect user feedback
- [ ] Document common issues

### Month 1
- [ ] Review metrics and performance
- [ ] Plan feature enhancements
- [ ] Optimize worker scaling if needed

---

## 📞 SUPPORT CONTACTS

**Critical Issues**:
- Database: Check `/var/log/postgresql/`
- Flask: Check `/var/log/flask_backend.log`
- Workers: `journalctl -u funnel-worker@1.service`
- Next.js: Browser console + Network tab

**Documentation**:
- QA Report: `/opt/livekit1/FUNNEL_QA_REPORT.md`
- API Routes: `/opt/livekit1/FUNNEL_API_ROUTES.md`
- Frontend Docs: `/opt/livekit1/frontend/FUNNEL_FRONTEND_COMPLETE.md`

---

## ✅ DEPLOYMENT SIGN-OFF

- [ ] All pre-deployment checks completed
- [ ] Flask backend restarted successfully
- [ ] New endpoints verified accessible
- [ ] Frontend tested in browser
- [ ] Auto-save working correctly
- [ ] Worker execution validated
- [ ] Database integrity confirmed
- [ ] Security tests passed
- [ ] Monitoring configured
- [ ] Team trained on new features

**Deployed By**: ________________
**Date**: ________________
**Sign-off**: ________________

---

**Status**: ⚠️ **READY FOR DEPLOYMENT**
**Blocker**: Flask restart required

**Next Action**: Run `./RESTART_FLASK.sh` and complete deployment testing

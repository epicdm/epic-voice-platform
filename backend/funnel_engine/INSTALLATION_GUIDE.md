# INSTALLATION GUIDE - Funnel Engine

**Version:** 1.0.0
**Status:** Production-ready
**Estimated Time:** 30 minutes

---

## PREREQUISITES

- [x] PostgreSQL 12+ installed and running
- [x] Python 3.9+ installed
- [x] Flask backend already running
- [x] `users` table exists in database
- [x] Sudo access for systemd setup

---

## STEP 1: COPY FILES TO PRODUCTION

```bash
# Create destination directory
sudo mkdir -p /opt/livekit1/backend/funnel_engine/systemd
sudo chown -R agent3:claudegroup /opt/livekit1/backend/funnel_engine

# Copy all files from build directory
sudo cp -r /tmp/funnel_engine_build/* /opt/livekit1/backend/funnel_engine/

# Set proper permissions
sudo chown -R agent3:claudegroup /opt/livekit1/backend/funnel_engine
sudo chmod 755 /opt/livekit1/backend/funnel_engine
sudo chmod 644 /opt/livekit1/backend/funnel_engine/*.py
sudo chmod 644 /opt/livekit1/backend/funnel_engine/*.md
sudo chmod 644 /opt/livekit1/backend/funnel_engine/*.sql
sudo chmod 755 /opt/livekit1/backend/funnel_engine/funnel_worker.py

# Verify files copied
ls -la /opt/livekit1/backend/funnel_engine/
```

**Expected output:**
```
-rw-r--r-- 1 agent3 claudegroup   809 __init__.py
-rw-r--r-- 1 agent3 claudegroup 11264 models.py
-rw-r--r-- 1 agent3 claudegroup  7577 enqueue.py
-rw-r--r-- 1 agent3 claudegroup 16384 executor.py
-rwxr-xr-x 1 agent3 claudegroup  7065 funnel_worker.py
-rw-r--r-- 1 agent3 claudegroup  2252 retry.py
-rw-r--r-- 1 agent3 claudegroup 16384 routes.py
-rw-r--r-- 1 agent3 claudegroup 15360 migrations.sql
-rw-r--r-- 1 agent3 claudegroup 13312 README.md
drwxr-xr-x 2 agent3 claudegroup  4096 systemd
```

---

## STEP 2: INSTALL PYTHON DEPENDENCIES

```bash
# Navigate to funnel_engine directory
cd /opt/livekit1/backend/funnel_engine

# Install dependencies (if not already installed)
pip install sqlalchemy psycopg2-binary flask requests

# Or using requirements.txt (create if needed)
cat > requirements.txt <<EOF
sqlalchemy>=2.0.0
psycopg2-binary>=2.9.0
flask>=3.0.0
requests>=2.31.0
EOF

pip install -r requirements.txt
```

---

## STEP 3: RUN DATABASE MIGRATION

```bash
# Set database URL
export DATABASE_URL="postgresql://user:password@localhost:5432/livekit_saas"

# Run migration
psql $DATABASE_URL -f /opt/livekit1/backend/funnel_engine/migrations.sql

# Verify tables created
psql $DATABASE_URL -c "\dt funnel*"
```

**Expected output:**
```
                    List of relations
 Schema |            Name            | Type  |  Owner
--------+----------------------------+-------+----------
 public | funnel_edges               | table | postgres
 public | funnel_execution_events    | table | postgres
 public | funnel_executions          | table | postgres
 public | funnel_nodes               | table | postgres
 public | funnel_stage_queue         | table | postgres
 public | funnels                    | table | postgres
(6 rows)
```

### Verify Indexes

```bash
psql $DATABASE_URL -c "
SELECT tablename, indexname
FROM pg_indexes
WHERE tablename LIKE 'funnel%'
ORDER BY tablename, indexname;
"
```

**Expected:** 20+ indexes including critical `idx_funnel_queue_poll`

---

## STEP 4: REGISTER FLASK BLUEPRINT

### Option A: Modify Main Flask App

```python
# Edit: /opt/livekit1/backend/app.py (or wherever your Flask app is)

from funnel_engine.routes import funnel_bp

# Register blueprint
app.register_blueprint(funnel_bp)

print("✅ Funnel engine routes registered at /api/funnels")
```

### Option B: Verify Import Path

```bash
# Test import
cd /opt/livekit1/backend
python3 -c "from funnel_engine.routes import funnel_bp; print('✅ Import successful')"
```

### Restart Flask Application

```bash
# Restart your Flask app (adjust command based on your setup)
sudo systemctl restart flask-app  # or whatever your service name is
# OR
pkill -f "flask run" && flask run &
```

---

## STEP 5: CONFIGURE WORKERS

### Copy Environment File

```bash
cd /opt/livekit1/backend/funnel_engine

# Copy example to actual config
cp systemd/funnel-worker.env.example funnel-worker.env

# Edit configuration
nano funnel-worker.env
```

**Edit these values:**
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/livekit_saas
WORKER_POLL_INTERVAL=5
WORKER_BATCH_SIZE=10
LOG_LEVEL=INFO
```

**Set secure permissions:**
```bash
chmod 600 funnel-worker.env
chown agent3:claudegroup funnel-worker.env
```

---

## STEP 6: INSTALL SYSTEMD SERVICES

```bash
# Copy systemd files
sudo cp /opt/livekit1/backend/funnel_engine/systemd/funnel-worker@.service /etc/systemd/system/
sudo cp /opt/livekit1/backend/funnel_engine/systemd/funnel-worker.target /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Verify services recognized
sudo systemctl list-unit-files | grep funnel-worker
```

**Expected output:**
```
funnel-worker@.service                     disabled
funnel-worker.target                       disabled
```

---

## STEP 7: START WORKERS

```bash
# Start all workers (3 instances)
sudo systemctl start funnel-worker.target

# Check status
sudo systemctl status funnel-worker.target
sudo systemctl status funnel-worker@1
sudo systemctl status funnel-worker@2
sudo systemctl status funnel-worker@3

# View logs
journalctl -u funnel-worker@1 -f
```

**Expected logs:**
```
Nov 15 10:00:00 hostname funnel-worker-1[12345]: Starting funnel-worker-1...
Nov 15 10:00:00 hostname funnel-worker-1[12345]: Database: postgresql://user:***...
Nov 15 10:00:00 hostname funnel-worker-1[12345]: Poll interval: 5s
Nov 15 10:00:00 hostname funnel-worker-1[12345]: Batch size: 10
Nov 15 10:00:00 hostname funnel-worker-1[12345]: Worker started successfully
Nov 15 10:00:05 hostname funnel-worker-1[12345]: No pending funnel stages
```

### Enable on Boot

```bash
sudo systemctl enable funnel-worker.target
```

---

## STEP 8: VERIFY INSTALLATION

### Test Database Connection

```bash
psql $DATABASE_URL -c "SELECT * FROM get_funnel_queue_stats();"
```

**Expected:**
```
 total_pending | total_processing | total_completed | total_failed | avg_retry_count
---------------+------------------+-----------------+--------------+-----------------
             0 |                0 |               0 |            0 |
(1 row)
```

### Test API Endpoint

```bash
# Create test funnel
curl -X POST http://localhost:5000/api/funnels \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Funnel",
    "description": "Installation test",
    "status": "draft"
  }'
```

**Expected response:**
```json
{
  "id": "funnel-abc123",
  "name": "Test Funnel",
  "description": "Installation test",
  "status": "draft",
  "created_at": "2025-11-15T10:00:00Z"
}
```

### List Funnels

```bash
curl http://localhost:5000/api/funnels \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## STEP 9: CREATE SAMPLE FUNNEL (OPTIONAL)

```bash
# Create funnel
FUNNEL_ID=$(curl -s -X POST http://localhost:5000/api/funnels \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Sample Sales Funnel",
    "status": "draft"
  }' | jq -r '.id')

echo "Created funnel: $FUNNEL_ID"

# Build graph
curl -X PUT http://localhost:5000/api/funnels/$FUNNEL_ID/graph \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "nodes": [
      {
        "id": "node-1",
        "type": "call",
        "label": "Initial Call",
        "config": {"agent_id": "your-agent-id"},
        "position": {"x": 100, "y": 100}
      },
      {
        "id": "node-2",
        "type": "end",
        "label": "End",
        "config": {},
        "position": {"x": 300, "y": 100}
      }
    ],
    "edges": [
      {
        "source": "node-1",
        "target": "node-2",
        "condition": "completed"
      }
    ]
  }'

# Activate funnel
curl -X PUT http://localhost:5000/api/funnels/$FUNNEL_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"status": "active"}'

echo "✅ Sample funnel created and activated"
```

---

## STEP 10: MONITOR HEALTH

### Worker Health

```bash
# Check all workers running
sudo systemctl status funnel-worker.target | grep Active

# View recent logs
journalctl -u funnel-worker@* -n 50

# Monitor queue in real-time
watch -n 5 'psql $DATABASE_URL -c "SELECT * FROM v_funnel_queue_health;"'
```

### Database Health

```sql
-- Queue statistics
SELECT * FROM get_funnel_queue_stats();

-- Execution health
SELECT * FROM v_funnel_execution_health;

-- Recent events
SELECT * FROM funnel_execution_events
ORDER BY created_at DESC
LIMIT 10;
```

---

## TROUBLESHOOTING

### Workers Not Starting

```bash
# Check service file exists
ls -l /etc/systemd/system/funnel-worker*

# Check environment file exists
ls -l /opt/livekit1/backend/funnel_engine/funnel-worker.env

# Check permissions
ls -la /opt/livekit1/backend/funnel_engine/

# Check Python path
which python3

# Check database connection
psql $DATABASE_URL -c "SELECT 1"

# View detailed logs
journalctl -u funnel-worker@1 -xe
```

### Import Errors

```bash
# Check Python can find module
cd /opt/livekit1/backend
python3 -c "import funnel_engine; print(funnel_engine.__version__)"

# Check dependencies installed
pip list | grep -E "sqlalchemy|flask|psycopg2"
```

### Database Errors

```bash
# Check tables exist
psql $DATABASE_URL -c "\dt funnel*"

# Check indexes exist
psql $DATABASE_URL -c "\di funnel*"

# Check ENUM types exist
psql $DATABASE_URL -c "\dT funnel*"

# Re-run migration if needed
psql $DATABASE_URL -f /opt/livekit1/backend/funnel_engine/migrations.sql
```

---

## ROLLBACK (IF NEEDED)

```bash
# Stop workers
sudo systemctl stop funnel-worker.target
sudo systemctl disable funnel-worker.target

# Remove systemd files
sudo rm /etc/systemd/system/funnel-worker@.service
sudo rm /etc/systemd/system/funnel-worker.target
sudo systemctl daemon-reload

# Drop database tables
psql $DATABASE_URL -c "
DROP TABLE IF EXISTS funnel_stage_queue CASCADE;
DROP TABLE IF EXISTS funnel_execution_events CASCADE;
DROP TABLE IF EXISTS funnel_executions CASCADE;
DROP TABLE IF EXISTS funnel_edges CASCADE;
DROP TABLE IF EXISTS funnel_nodes CASCADE;
DROP TABLE IF EXISTS funnels CASCADE;
DROP TYPE IF EXISTS funnel_status;
DROP TYPE IF EXISTS node_type;
DROP TYPE IF EXISTS execution_status;
DROP TYPE IF EXISTS queue_status;
"

# Remove Flask blueprint registration (manual step)

# Remove files
sudo rm -rf /opt/livekit1/backend/funnel_engine
```

---

## SUCCESS CRITERIA

✅ All 6 database tables created
✅ 20+ indexes created
✅ 3 worker instances running
✅ Flask blueprint registered
✅ API endpoints responding
✅ Queue stats return valid data
✅ Test funnel created successfully

---

## POST-INSTALLATION

1. **Configure Frontend:**
   - Add funnel UI components
   - Integrate with React Flow library
   - Create funnel management pages

2. **Integrate with Agents:**
   - Update agent creation to support funnel context
   - Add funnel execution callbacks
   - Test call node integration

3. **Setup Monitoring:**
   - Configure Prometheus metrics
   - Add Grafana dashboards
   - Setup alerting for failed stages

4. **Production Hardening:**
   - Review security settings
   - Configure backups
   - Setup staging environment
   - Load test with 10,000 entries

---

## ESTIMATED TIMELINE

- **Installation:** 30 minutes
- **Testing:** 1 hour
- **Frontend Integration:** 1-2 days
- **Agent Integration:** 1-2 days
- **Total to Production:** 3-5 days

---

**Installation Guide Version:** 1.0.0
**Last Updated:** 2025-11-15
**Status:** ✅ READY FOR PRODUCTION

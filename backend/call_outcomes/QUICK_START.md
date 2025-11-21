# Call Outcomes Module - Quick Start Guide

**Status**: ✅ Ready for Integration
**Time to Integrate**: ~25 minutes

## 🚀 5-Step Integration

### 1. Backup & Migrate Database (5 min)
```bash
cd /opt/livekit1

# Backup
pg_dump -U postgres epic_voice_db > backup_$(date +%Y%m%d).sql

# Migrate
python3 backend/call_outcomes/migration_001_call_outcomes.py upgrade

# Verify
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c "\dt livekit_call_events"
```

### 2. Register Routes (5 min)
Edit `user_dashboard.py`:
```python
# Add near other imports (around line 30)
from backend.call_outcomes.routes import call_outcomes_bp

# Register blueprint (around line 1800, with other blueprints)
app.register_blueprint(call_outcomes_bp, url_prefix='/api')
```

### 3. Configure Environment (2 min)
```bash
# Add to .env or systemd environment
export LIVEKIT_WEBHOOK_SECRET="your-livekit-webhook-secret"
```

### 4. Restart Application (1 min)
```bash
systemctl restart livekit1

# Verify startup
journalctl -u livekit1 -n 50 | grep -i "call_outcomes\|error"
```

### 5. Configure LiveKit Webhook (5 min)
1. Go to LiveKit Cloud Dashboard
2. Navigate to: Project Settings → Webhooks
3. Add webhook:
   - **URL**: `https://your-domain.com/api/webhooks/call_completed`
   - **Events**: 
     - ✅ participant_left
     - ✅ room_finished
     - ✅ egress_ended
4. Copy webhook secret to environment variable

## ✅ Verification (5 min)

### Health Check
```bash
curl http://localhost:5000/api/webhooks/call_completed/health

# Expected: {"status": "healthy", "service": "call_outcomes"}
```

### Test Call Flow
```bash
# Make a test call through your app

# Monitor webhook processing
journalctl -u livekit1 -f | grep "call_completed"

# Check database
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c \
  "SELECT * FROM livekit_call_events ORDER BY \"createdAt\" DESC LIMIT 3;"
```

### Test Outcome Retrieval
```bash
# Get call outcome (replace with actual IDs)
curl "http://localhost:5000/api/calls/{call_id}/outcome?user_id={user_id}"

# Expected: {"id": "...", "outcome": "completed", ...}
```

## 🧪 Optional: Run Tests

### Install Test Dependencies
```bash
# Option 1: System packages
sudo apt install python3-pytest python3-pytest-cov

# Option 2: Virtual environment
python3 -m venv venv
source venv/bin/activate
pip install pytest pytest-cov sqlalchemy psycopg2-binary
```

### Run Tests
```bash
# Create test database
PGPASSWORD="nXrRje4emjejjeKI009p" createdb -U postgres epic_voice_test_db

# Set test database URL
export TEST_DATABASE_URL="postgresql://postgres:nXrRje4emjejjeKI009p@localhost:5432/epic_voice_test_db"

# Run all tests
pytest -v backend/tests/call_outcomes/

# Expected: 72 tests passed in ~2.5s
```

## 📚 Documentation

- **Complete Guide**: `backend/call_outcomes/README.md`
- **Integration Checklist**: `backend/call_outcomes/INTEGRATION_CHECKLIST.md`
- **Implementation Details**: `backend/call_outcomes/IMPLEMENTATION_SUMMARY.md`
- **Test Guide**: `backend/tests/call_outcomes/README.md`

## 🆘 Quick Troubleshooting

**Webhook 401 Unauthorized**
```bash
# Check webhook secret is set
echo $LIVEKIT_WEBHOOK_SECRET

# Verify it matches LiveKit Cloud configuration
```

**Duplicate Events**
```bash
# Check UNIQUE constraint exists
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c \
  "\d livekit_call_events" | grep eventId
```

**Cross-Tenant Access**
```bash
# Run multi-tenant tests
pytest -v -m multitenant backend/tests/call_outcomes/
```

**Migration Failed**
```bash
# Rollback
python3 backend/call_outcomes/migration_001_call_outcomes.py downgrade

# Check error logs
journalctl -u livekit1 -n 100 | grep -i error
```

## 🔄 Rollback Plan

```bash
# 1. Unregister routes (comment out in user_dashboard.py)
# 2. Rollback migration
python3 backend/call_outcomes/migration_001_call_outcomes.py downgrade

# 3. Restore database (if needed)
psql -U postgres epic_voice_db < backup_YYYYMMDD.sql

# 4. Restart
systemctl restart livekit1
```

## ✅ Success Checklist

- [ ] Database migration successful
- [ ] Routes registered and app restarted
- [ ] Health check returns 200 OK
- [ ] Test call triggers webhook
- [ ] Event recorded in database
- [ ] Outcome retrieval works
- [ ] Duplicate webhooks handled
- [ ] Multi-tenant isolation enforced

---

**Ready to integrate?** Start with Step 1 above! 🚀

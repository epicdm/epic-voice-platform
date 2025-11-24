# Call Outcomes Module - Integration Checklist

**Status**: ✅ Implementation Complete | ✅ Tests Complete | ⏳ Integration Pending

---

## 📋 Pre-Integration Checklist

### 1. Environment Setup

- [ ] **Set LiveKit webhook secret**:
  ```bash
  export LIVEKIT_WEBHOOK_SECRET="your-webhook-secret-here"
  ```

- [ ] **Verify database connection**:
  ```bash
  # Check TEST_DATABASE_URL is set
  echo $TEST_DATABASE_URL

  # Check production DATABASE_URL
  echo $DATABASE_URL
  ```

- [ ] **Install test dependencies** (optional for running tests):
  ```bash
  # Option 1: System packages
  sudo apt install python3-pytest python3-pytest-cov

  # Option 2: Virtual environment (recommended)
  python3 -m venv venv
  source venv/bin/activate
  pip install pytest pytest-cov sqlalchemy psycopg2-binary
  ```

### 2. Database Migration

- [ ] **Backup database** (CRITICAL):
  ```bash
  pg_dump -U postgres epic_voice_db > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **Run migration**:
  ```bash
  cd /opt/livekit1
  python3 backend/call_outcomes/migration_001_call_outcomes.py upgrade
  ```

- [ ] **Verify tables created**:
  ```bash
  PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c "\dt livekit_call_events"
  PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c "\d call_logs" | grep outcome
  ```

### 3. Route Registration

- [ ] **Import routes in `user_dashboard.py`**:
  ```python
  # Add near other imports (around line 30)
  from backend.call_outcomes.routes import call_outcomes_bp

  # Register blueprint (around line 1800, with other blueprints)
  app.register_blueprint(call_outcomes_bp, url_prefix='/api')
  ```

- [ ] **Verify routes registered**:
  ```bash
  # Restart Flask app
  systemctl restart livekit1

  # Check routes available
  curl -I http://localhost:5000/api/webhooks/call_completed/health
  # Should return: 200 OK
  ```

### 4. LiveKit Webhook Configuration

- [ ] **Configure webhook URL in LiveKit Cloud**:
  - Go to LiveKit Cloud dashboard
  - Project Settings → Webhooks
  - Add webhook URL: `https://your-domain.com/api/webhooks/call_completed`
  - Events to subscribe:
    - ✅ `participant_left`
    - ✅ `room_finished`
    - ✅ `egress_ended`
  - Copy webhook secret to environment variable

- [ ] **Test webhook endpoint**:
  ```bash
  # Health check
  curl http://localhost:5000/api/webhooks/call_completed/health

  # Should return:
  # {"status": "healthy", "service": "call_outcomes"}
  ```

---

## 🧪 Testing Checklist

### 1. Unit Tests (Optional but Recommended)

- [ ] **Run unit tests**:
  ```bash
  cd /opt/livekit1
  pytest -v -m unit backend/tests/call_outcomes/
  ```

- [ ] **Expected results**: 49 unit tests passed

### 2. Integration Tests (Requires Test DB)

- [ ] **Create test database**:
  ```bash
  PGPASSWORD="nXrRje4emjejjeKI009p" createdb -U postgres epic_voice_test_db
  ```

- [ ] **Set test database URL**:
  ```bash
  export TEST_DATABASE_URL="postgresql://postgres:nXrRje4emjejjeKI009p@localhost:5432/epic_voice_test_db"
  ```

- [ ] **Run integration tests**:
  ```bash
  pytest -v -m integration backend/tests/call_outcomes/
  ```

- [ ] **Expected results**: 23 integration tests passed

### 3. Critical Path Tests

- [ ] **Idempotency tests**:
  ```bash
  pytest -v -m idempotency backend/tests/call_outcomes/
  ```

- [ ] **Multi-tenant isolation tests**:
  ```bash
  pytest -v -m multitenant backend/tests/call_outcomes/
  ```

- [ ] **Expected results**: All critical tests passing

### 4. Manual Testing (Production Validation)

- [ ] **Test webhook reception**:
  1. Make a test call through your LiveKit application
  2. Check logs for webhook processing:
     ```bash
     journalctl -u livekit1 -f | grep "call_completed"
     ```
  3. Verify event recorded in database:
     ```sql
     SELECT * FROM livekit_call_events ORDER BY "createdAt" DESC LIMIT 5;
     ```

- [ ] **Test outcome retrieval**:
  ```bash
  # Get call outcome (replace with actual call_id and user_id)
  curl "http://localhost:5000/api/calls/{call_id}/outcome?user_id={user_id}"
  ```

- [ ] **Test idempotency**:
  1. Trigger same webhook twice (LiveKit retries automatically)
  2. Verify only one event recorded in database
  3. Check logs show "already processed" message

- [ ] **Test multi-tenant isolation**:
  1. Create test calls for different users
  2. Verify User A cannot access User B's call outcomes
  3. Check database queries filter by userId

---

## 🔍 Verification Checklist

### Database State

- [ ] **Tables exist**:
  ```sql
  \dt livekit_call_events
  -- Should show: public | livekit_call_events | table | postgres
  ```

- [ ] **Columns added to call_logs**:
  ```sql
  \d call_logs
  -- Should show: outcome, metadata, recordingUrl columns
  ```

- [ ] **Indexes created**:
  ```sql
  SELECT indexname FROM pg_indexes WHERE tablename = 'livekit_call_events';
  -- Should show: 5+ indexes including idx_lce_eventId
  ```

### Application State

- [ ] **Routes registered**:
  ```bash
  # Check Flask routes
  curl -I http://localhost:5000/api/webhooks/call_completed/health
  # Should return: 200 OK
  ```

- [ ] **Environment variables set**:
  ```bash
  env | grep LIVEKIT_WEBHOOK_SECRET
  # Should show: LIVEKIT_WEBHOOK_SECRET=your-secret
  ```

- [ ] **Logs show successful startup**:
  ```bash
  journalctl -u livekit1 -n 50 | grep "call_outcomes"
  # Should show: Blueprint registered successfully
  ```

---

## 📊 Monitoring Checklist

### Initial Monitoring (First 24 Hours)

- [ ] **Monitor webhook reception**:
  ```bash
  # Check webhook processing rate
  PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c \
    "SELECT COUNT(*), event FROM livekit_call_events GROUP BY event;"
  ```

- [ ] **Monitor error rates**:
  ```bash
  # Check for processing errors
  journalctl -u livekit1 -f | grep -i "error\|exception\|failed"
  ```

- [ ] **Monitor duplicate events**:
  ```bash
  # Check idempotency handling
  PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c \
    "SELECT processed, COUNT(*) FROM livekit_call_events GROUP BY processed;"
  ```

### Ongoing Monitoring

- [ ] **Database growth**:
  ```sql
  SELECT
    pg_size_pretty(pg_total_relation_size('livekit_call_events')) as events_size,
    pg_size_pretty(pg_total_relation_size('call_logs')) as logs_size;
  ```

- [ ] **Outcome distribution**:
  ```sql
  SELECT outcome, COUNT(*)
  FROM call_logs
  WHERE outcome IS NOT NULL
  GROUP BY outcome;
  ```

- [ ] **Average processing time** (add if needed):
  - Monitor webhook endpoint response times
  - Check database query performance
  - Review slow query logs

---

## 🚨 Rollback Plan

### If Integration Issues Occur

1. **Unregister routes**:
   ```python
   # Comment out in user_dashboard.py:
   # app.register_blueprint(call_outcomes_bp, url_prefix='/api')
   ```

2. **Rollback migration**:
   ```bash
   python3 backend/call_outcomes/migration_001_call_outcomes.py downgrade
   ```

3. **Restore database backup** (if needed):
   ```bash
   psql -U postgres epic_voice_db < backup_YYYYMMDD_HHMMSS.sql
   ```

4. **Restart application**:
   ```bash
   systemctl restart livekit1
   ```

---

## ✅ Success Criteria

### Functional Requirements

- ✅ Webhooks received and processed successfully
- ✅ Call outcomes classified correctly (completed, no_answer, busy, failed)
- ✅ Duplicate webhooks handled idempotently
- ✅ Multi-tenant isolation enforced
- ✅ Recording URLs captured when available
- ✅ Call metadata stored correctly

### Performance Requirements

- ✅ Webhook processing < 500ms
- ✅ Outcome retrieval < 100ms
- ✅ Database queries use indexes effectively
- ✅ No memory leaks or resource exhaustion

### Security Requirements

- ✅ Webhook signatures validated
- ✅ Multi-tenant isolation enforced
- ✅ No cross-tenant data leakage
- ✅ Secure environment variable handling

---

## 📚 Documentation Reference

- **Implementation Guide**: `backend/call_outcomes/README.md`
- **Implementation Summary**: `backend/call_outcomes/IMPLEMENTATION_SUMMARY.md`
- **Test Guide**: `backend/tests/call_outcomes/README.md`
- **Test Summary**: `backend/tests/call_outcomes/TEST_IMPLEMENTATION_SUMMARY.md`
- **This Checklist**: `backend/call_outcomes/INTEGRATION_CHECKLIST.md`

---

## 🆘 Troubleshooting Reference

### Common Issues

**Issue**: Webhook signature validation fails
- **Solution**: Verify `LIVEKIT_WEBHOOK_SECRET` matches LiveKit Cloud configuration
- **Check**: `echo $LIVEKIT_WEBHOOK_SECRET`

**Issue**: Duplicate events not detected
- **Solution**: Verify UNIQUE constraint on `eventId` column exists
- **Check**: `\d livekit_call_events` in psql

**Issue**: Cross-tenant data access
- **Solution**: Verify userId filtering in all service layer queries
- **Check**: Run multi-tenant isolation tests

**Issue**: Migration fails
- **Solution**: Check database connectivity and permissions
- **Check**: `psql -U postgres epic_voice_db -c "SELECT 1;"`

**Issue**: Tests fail
- **Solution**: Verify test database exists and is accessible
- **Check**: `echo $TEST_DATABASE_URL`

---

## 📞 Support

For issues or questions:
1. Review documentation files in `backend/call_outcomes/`
2. Check test examples in `backend/tests/call_outcomes/`
3. Review error logs: `journalctl -u livekit1 -f`
4. Verify database state with provided SQL queries

---

**Last Updated**: 2025-10-29
**Version**: 1.0.0
**Status**: Ready for Integration

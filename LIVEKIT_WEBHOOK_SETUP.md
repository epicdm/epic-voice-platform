# LiveKit Webhook Configuration Guide

**Purpose**: Configure LiveKit Cloud to send call completion events to Epic Voice Suite for call outcome recording

**Date**: October 29, 2025
**Status**: Configuration Required
**Priority**: High (Blocks Call Outcome Recording)

---

## 🎯 Overview

The call outcome recording system requires LiveKit Cloud to send webhook events when calls complete. This guide walks through the configuration steps.

## 📋 Prerequisites

- ✅ Phase 1 Complete: Database migration applied
- ✅ Phase 2 Complete: Webhook listener and processor implemented
- ✅ Flask application running and accessible
- ⏳ LiveKit Cloud account with admin access
- ⏳ Public endpoint for webhook delivery

---

## 🔐 Step 1: Get Webhook Secret from LiveKit Cloud

### Access LiveKit Cloud Console

1. **Navigate to**: https://cloud.livekit.io
2. **Log in** with your LiveKit account credentials
3. **Select** your project: `ai-agent-dl6ldsi8`

### Locate Webhook Settings

1. In the left sidebar, click **"Settings"** or **"Project Settings"**
2. Scroll to **"Webhooks"** section
3. You'll see a **"Webhook Secret"** field

### Copy Webhook Secret

```bash
# The secret will look something like:
WHsec_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

**⚠️ IMPORTANT**: This secret is used to sign webhook requests. Keep it secure!

---

## 🔧 Step 2: Configure Epic Voice Suite

### Update Environment Variables

Edit `/opt/livekit1/.env` and replace the placeholder:

```bash
# Before:
LIVEKIT_WEBHOOK_SECRET='your-webhook-secret-here'

# After:
LIVEKIT_WEBHOOK_SECRET='WHsec_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz'
```

### Restart Flask Application

```bash
# If using systemd
sudo systemctl restart livekit-frontend

# If running manually
# Stop the current process (Ctrl+C) and restart:
python3 user_dashboard.py

# Verify webhook endpoint is registered
# Look for: "✅ LiveKit webhook endpoint registered for call outcome tracking"
```

---

## 🌐 Step 3: Configure Webhook URL in LiveKit Cloud

### Determine Your Webhook Endpoint

Your webhook endpoint URL will be:

```
https://your-domain.com/api/webhooks/livekit
```

**Examples**:
- Production: `https://voice.epic.dm/api/webhooks/livekit`
- Staging: `https://staging.epic.dm/api/webhooks/livekit`
- Development: `http://localhost:5000/api/webhooks/livekit` (not recommended for LiveKit Cloud)

**⚠️ NOTE**: LiveKit Cloud requires HTTPS endpoints. Use a reverse proxy (nginx, Traefik) or ngrok for testing.

### Register Webhook in LiveKit Cloud

1. In **LiveKit Cloud Console** → **Settings** → **Webhooks**
2. Click **"Add Webhook"** or **"Configure Webhook"**
3. Enter your webhook URL:
   ```
   https://voice.epic.dm/api/webhooks/livekit
   ```
4. Select events to send:
   - ✅ **participant_left** - When participant disconnects
   - ✅ **room_finished** - When room closes
   - ✅ **egress_ended** - When recording finishes (optional)
5. Click **"Save"** or **"Update"**

### Verify Configuration

LiveKit Cloud will send a test webhook to verify the endpoint. You should see:
- ✅ Green checkmark next to webhook URL
- ✅ "Webhook verified" message

If verification fails, check:
- Is Flask application running?
- Is the endpoint publicly accessible?
- Is HTTPS configured correctly?
- Are there any firewall rules blocking the request?

---

## 🧪 Step 4: Test Webhook Delivery

### Option 1: Test with Real Call

1. Make a test outbound call via campaign engine:
   ```bash
   curl -X POST http://localhost:5000/api/user/calls/outbound \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "phone_number": "+1234567890",
       "agent_config_id": "your-agent-id"
     }'
   ```

2. Wait for call to complete (answer and hang up)

3. Check database for call outcome:
   ```sql
   SELECT
     id,
     "phoneNumber",
     outcome,
     "durationSeconds",
     "endedAt"
   FROM call_logs
   ORDER BY "createdAt" DESC
   LIMIT 5;
   ```

4. Verify `livekit_call_events` table has entry:
   ```sql
   SELECT
     event_id,
     room_name,
     event_type,
     processed,
     processed_at
   FROM livekit_call_events
   ORDER BY created_at DESC
   LIMIT 5;
   ```

### Option 2: Test with Simulated Webhook

Use the provided test script:

```bash
# Basic test (single event)
python3 test_livekit_webhook.py

# Test all scenarios (valid, invalid signature, multiple outcomes)
python3 test_livekit_webhook.py --all

# Test outcome classification only
python3 test_livekit_webhook.py --scenarios
```

**Expected Output**:
```
╔══════════════════════════════════════════════════════════════╗
║     LiveKit Webhook Endpoint Testing Tool                   ║
╚══════════════════════════════════════════════════════════════╝

============================================================
Testing LiveKit Webhook Endpoint
============================================================

📤 Sending participant_left event to http://localhost:5000/api/webhooks/livekit
🔑 Event ID: evt_test_1730246789
🏠 Room: test-room-12345
👤 Participant: PA_test456
🔐 Signature: a3c8f9e2b1d4567890...

📥 Response Status: 200
✅ SUCCESS: Webhook processed successfully
```

### Option 3: Check Flask Logs

Monitor Flask logs for webhook processing:

```bash
# If using systemd
sudo journalctl -u livekit-frontend -f

# Look for log entries like:
# "📞 Processing call outcome for room: test-room-12345, event: evt_123"
# "✅ Successfully processed call outcome for test-room-12345"
```

---

## 🔍 Troubleshooting

### Webhook Not Receiving Events

**Problem**: No webhook events arriving

**Checks**:
1. ✅ Verify webhook URL is correct in LiveKit Cloud
2. ✅ Check Flask application is running: `systemctl status livekit-frontend`
3. ✅ Test endpoint accessibility: `curl https://voice.epic.dm/api/webhooks/livekit`
4. ✅ Check firewall allows inbound HTTPS traffic
5. ✅ Verify `LIVEKIT_WEBHOOK_SECRET` is set in `.env`

### Signature Validation Failed

**Problem**: Webhook endpoint returns 403 Forbidden

**Checks**:
1. ✅ Verify `LIVEKIT_WEBHOOK_SECRET` matches LiveKit Cloud secret exactly
2. ✅ Check for extra whitespace or quotes in `.env` file
3. ✅ Restart Flask application after changing `.env`
4. ✅ Check Flask logs for "Invalid signature" messages

### Events Processed Multiple Times

**Problem**: Same event processed more than once

**Solution**: This should NOT happen due to idempotency. If it does:
1. Check `livekit_call_events` table for duplicate `event_id` values
2. Verify unique constraint exists: `\d livekit_call_events` in psql
3. Check Flask logs for database constraint violation errors

### Call Outcome Not Recorded

**Problem**: Webhook arrives but no outcome in database

**Checks**:
1. ✅ Check Flask logs for error messages
2. ✅ Verify `call_logs` table has matching `roomName`:
   ```sql
   SELECT id, "roomName", outcome
   FROM call_logs
   WHERE "roomName" = 'your-room-name';
   ```
3. ✅ Check `livekit_call_events` table for orphaned events:
   ```sql
   SELECT event_id, room_name, processed, error_message
   FROM livekit_call_events
   WHERE processed = false;
   ```
4. ✅ Verify `campaign_engine.py` is storing `livekit_room_name` correctly

---

## 📊 Monitoring and Validation

### Database Queries for Health Checks

**Check recent call outcomes**:
```sql
SELECT
  c.id,
  c."phoneNumber",
  c.outcome,
  c."durationSeconds",
  c."endedAt",
  c."createdAt"
FROM call_logs c
WHERE c."endedAt" IS NOT NULL
ORDER BY c."endedAt" DESC
LIMIT 10;
```

**Check webhook event processing rate**:
```sql
SELECT
  DATE(processed_at) as date,
  COUNT(*) as events_processed,
  COUNT(CASE WHEN processed = true THEN 1 END) as successful,
  COUNT(CASE WHEN processed = false THEN 1 END) as failed
FROM livekit_call_events
WHERE processed_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(processed_at)
ORDER BY date DESC;
```

**Check outcome distribution**:
```sql
SELECT
  outcome,
  COUNT(*) as count,
  ROUND(AVG("durationSeconds"), 2) as avg_duration,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM call_logs
WHERE outcome IS NOT NULL
GROUP BY outcome
ORDER BY count DESC;
```

### Expected Metrics

After 100 calls, you should see:
- **Completed**: 60-70% (calls lasting >10s)
- **No Answer**: 20-30% (calls lasting <10s)
- **Busy**: 5-10%
- **Failed**: 2-5%

---

## 🚀 Production Deployment Checklist

- [ ] `LIVEKIT_WEBHOOK_SECRET` configured in production `.env`
- [ ] Flask application restarted with new configuration
- [ ] Webhook URL registered in LiveKit Cloud
- [ ] HTTPS certificate valid and not expired
- [ ] Test call completed and outcome recorded successfully
- [ ] Database indexes performing well (check query execution times)
- [ ] Monitoring alerts configured for:
  - Webhook processing failures
  - High orphaned event rate
  - Signature validation failures
- [ ] Backup and rollback plan tested

---

## 📚 Related Documentation

- **Design Document**: `/opt/livekit1/CALL_OUTCOME_RECORDING_DESIGN.md`
- **Phase 1 Complete**: `/opt/livekit1/CALL_OUTCOME_PHASE1_COMPLETE.md`
- **Phase 2 Complete**: `/opt/livekit1/CALL_OUTCOME_PHASE2_COMPLETE.md`
- **Database Migration**: `/opt/livekit1/migrations/008_call_outcome_recording.sql`
- **Test Script**: `/opt/livekit1/test_livekit_webhook.py`
- **Test Suite**: `/opt/livekit1/test_call_outcome_system.py`

---

## 🎯 Success Criteria

✅ **Webhook Configuration Complete When**:
1. LiveKit Cloud shows webhook URL as verified
2. Test call generates webhook event
3. Event is processed and outcome recorded in database
4. No signature validation errors in logs
5. Idempotency prevents duplicate processing

---

## 🆘 Support

If you encounter issues:
1. Check Flask logs: `journalctl -u livekit-frontend -n 100`
2. Check database for errors: `SELECT * FROM livekit_call_events WHERE processed = false;`
3. Run test script: `python3 test_livekit_webhook.py --all`
4. Review LiveKit Cloud webhook delivery logs
5. Verify network connectivity and firewall rules

**Next Steps After Configuration**: Proceed to Phase 3 (Query API) to expose call outcome data via REST endpoints.

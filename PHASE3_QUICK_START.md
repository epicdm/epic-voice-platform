# Phase 3 Quick Start Guide 🚀

**Current Status**: 60% Complete - User Action Required
**Last Updated**: October 29, 2025

---

## ✅ What's Been Done

1. **Environment Configuration**:
   - Added `LIVEKIT_WEBHOOK_SECRET` to `.env` (placeholder)
   - Documented configuration source and instructions

2. **Testing Tools Created**:
   - `test_livekit_webhook.py` - Comprehensive webhook testing
   - Supports multiple test scenarios
   - HMAC signature generation and validation

3. **Documentation Complete**:
   - `LIVEKIT_WEBHOOK_SETUP.md` - Full configuration guide
   - `CALL_OUTCOME_PHASE3_PROGRESS.md` - Progress tracking

---

## ⚠️ What You Need to Do Next

### Step 1: Get Webhook Secret (5 minutes)

1. Go to: https://cloud.livekit.io
2. Login with your LiveKit credentials
3. Select project: `ai-agent-dl6ldsi8`
4. Navigate: **Settings** → **Webhooks**
5. Copy the **Webhook Secret** (looks like: `WHsec_...`)

### Step 2: Update Environment (2 minutes)

```bash
# Edit the .env file
nano /opt/livekit1/.env

# Find this line (around line 9):
LIVEKIT_WEBHOOK_SECRET='your-webhook-secret-here'

# Replace with your actual secret:
LIVEKIT_WEBHOOK_SECRET='WHsec_abc123...'  # Paste your secret here

# Save and exit (Ctrl+X, Y, Enter)
```

### Step 3: Restart Flask (1 minute)

```bash
# Check if running as service
sudo systemctl status livekit-frontend

# Restart the service
sudo systemctl restart livekit-frontend

# Verify webhook endpoint registered (look for this line):
# "✅ LiveKit webhook endpoint registered for call outcome tracking"

# View logs
sudo journalctl -u livekit-frontend -f
```

### Step 4: Register Webhook URL (3 minutes)

Back in LiveKit Cloud Console:

1. **Settings** → **Webhooks** → **Add Webhook**
2. **Webhook URL**: `https://voice.epic.dm/api/webhooks/livekit`
3. **Events to send**:
   - ✅ `participant_left`
   - ✅ `room_finished`
   - ✅ `egress_ended` (optional)
4. Click **Save**
5. LiveKit will send a test request to verify
6. You should see ✅ green checkmark next to URL

### Step 5: Test with Real Call (5 minutes)

```bash
# Option A: Make a test campaign call
# (through your existing campaign system)

# Option B: Test with simulation script
python3 /opt/livekit1/test_livekit_webhook.py

# Option C: Full test suite
python3 /opt/livekit1/test_livekit_webhook.py --all
```

### Step 6: Verify in Database (2 minutes)

```bash
# Connect to database
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db

# Check recent call outcomes
SELECT
  id,
  "phoneNumber",
  outcome,
  "durationSeconds",
  "endedAt"
FROM call_logs
WHERE "endedAt" IS NOT NULL
ORDER BY "endedAt" DESC
LIMIT 5;

# Check webhook events processed
SELECT
  event_id,
  room_name,
  event_type,
  processed,
  processed_at
FROM livekit_call_events
ORDER BY created_at DESC
LIMIT 5;

# Exit
\q
```

---

## 🎯 Success Criteria

You'll know it's working when:

✅ **Flask logs show**: "✅ LiveKit webhook endpoint registered"
✅ **LiveKit Cloud shows**: Green checkmark next to webhook URL
✅ **Test call**: Generates webhook event
✅ **Database**: `call_logs.outcome` is populated
✅ **No errors**: No signature validation failures in logs

---

## 🆘 Troubleshooting

### "Webhook endpoint not registered" in Flask logs

**Cause**: `LIVEKIT_WEBHOOK_SECRET` not set or still has placeholder
**Fix**: Update `.env` with real secret and restart Flask

### LiveKit webhook verification failed

**Cause**: Endpoint not accessible or signature mismatch
**Fix**:
1. Check Flask is running: `systemctl status livekit-frontend`
2. Test endpoint: `curl -I https://voice.epic.dm/api/webhooks/livekit`
3. Check HTTPS is configured correctly
4. Verify no firewall blocking inbound requests

### 403 Forbidden error in logs

**Cause**: Signature validation failed
**Fix**:
1. Verify secret matches exactly (no extra spaces/quotes)
2. Check `.env` has correct secret
3. Restart Flask after changing `.env`

### Call outcome not recorded

**Cause**: No matching `call_logs` entry or room name mismatch
**Fix**:
1. Check `call_logs` has entry with matching `roomName`
2. Verify `campaign_engine.py` stores `livekit_room_name`
3. Check `livekit_call_events` for orphaned events

---

## 📚 Full Documentation

For detailed information, see:

- **Configuration Guide**: `LIVEKIT_WEBHOOK_SETUP.md`
- **Progress Tracking**: `CALL_OUTCOME_PHASE3_PROGRESS.md`
- **Phase 1 (Database)**: `CALL_OUTCOME_PHASE1_COMPLETE.md`
- **Phase 2 (Processing)**: `CALL_OUTCOME_PHASE2_COMPLETE.md`
- **System Design**: `CALL_OUTCOME_RECORDING_DESIGN.md`

---

## ⏭️ What's Next (Phase 4)

After Phase 3 is complete:

1. **Query API** (2 days):
   - Build `/api/user/calls/outcomes` endpoint
   - Add filters (campaign, lead, outcome, date range)
   - Add statistics aggregation
   - Implement pagination

2. **Frontend Integration** (2 days):
   - Display outcomes in dashboard
   - Show success rate metrics
   - Add outcome filters
   - Build analytics charts

3. **Load Testing** (1 day):
   - Test 1000 events/minute
   - Monitor performance
   - Optimize if needed

---

## 📞 Quick Commands Reference

```bash
# Update environment
nano /opt/livekit1/.env

# Restart Flask
sudo systemctl restart livekit-frontend

# View logs
sudo journalctl -u livekit-frontend -f

# Test webhook locally
python3 test_livekit_webhook.py

# Test all scenarios
python3 test_livekit_webhook.py --all

# Check database
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db
```

---

**Total Time to Complete Phase 3**: ~20 minutes

**Ready?** Start with Step 1 above! 🚀

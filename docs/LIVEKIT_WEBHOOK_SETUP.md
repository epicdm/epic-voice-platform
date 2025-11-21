# LiveKit Cloud Webhook Configuration Guide

## Overview
This guide explains how to configure LiveKit Cloud to send webhook events to your backend for call outcome tracking.

## Webhook Endpoint
- **URL**: `https://ai.epic.dm/api/webhooks/livekit`
- **Authentication**: JWT token validation using LiveKit API credentials
- **Status**: ✅ Endpoint tested and working (returns 200 OK)

## Configuration Steps

### 1. Access LiveKit Cloud Dashboard
1. Go to https://cloud.livekit.io
2. Log in to your account
3. Select your project: `ai-agent-dl6ldsi8`

### 2. Navigate to Webhooks Settings
1. In LiveKit Cloud dashboard, go to **Settings**
2. Look for **Webhooks** section
3. You should see a field to enter webhook URL(s)

### 3. Configure Webhook URL
Simply enter this URL in the webhook configuration field:

```
https://ai.epic.dm/api/webhooks/livekit
```

**That's it!** LiveKit Cloud will automatically:
- Sign webhook requests with JWT tokens using your project's API credentials
- Send all room and participant events to this URL
- Handle retries automatically

### 4. How Authentication Works (Behind the Scenes)
LiveKit Cloud automatically signs each webhook request with a JWT token containing:
- `Authorization` header with `Bearer <JWT_TOKEN>`
- Token signed with your project's API secret
- Payload hash (sha256) included in token claims

Your backend validates these tokens using the same API credentials:
- **API Key**: From your `LIVEKIT_API_KEY` environment variable
- **API Secret**: From your `LIVEKIT_API_SECRET` environment variable

**No manual configuration of API keys in webhook settings** - LiveKit Cloud uses your project's credentials automatically.

### 5. Test the Webhook
After configuration:
1. Make a test call to any phone number assigned to an agent
2. End the call after a few seconds
3. Check backend logs: `journalctl -u livekit-backend -n 50`
4. Look for: `✅ Call outcome updated: call_log_id=...`
5. Verify database: Call should show duration and cost

## What Happens When Webhooks Work

### Before Webhooks (Current State)
```
Database calls table:
- phoneNumber: NULL
- durationSeconds: NULL
- cost: NULL
- status: 'active' (stuck)
```

### After Webhooks (Expected State)
```
Database calls table:
- phoneNumber: '+17678189426'
- durationSeconds: 127 (actual call duration)
- cost: 0.42 (calculated from duration)
- status: 'completed'
- completedAt: timestamp
```

## Expected Events Flow

### Call Start (`room_started`)
```json
{
  "event": "room_started",
  "room": {
    "sid": "RM_abc123",
    "name": "sip-17678189426__17678183742",
    "creationTime": 1730123456
  }
}
```
**Action**: Creates new call_log entry with `status='active'`

### Call End (`room_finished`)
```json
{
  "event": "room_finished",
  "room": {
    "sid": "RM_abc123",
    "name": "sip-17678189426__17678183742",
    "creationTime": 1730123456
  }
}
```
**Action**: Updates call_log with:
- `durationSeconds` = time between start and end
- `cost` = duration * rate
- `status` = 'completed'
- `completedAt` = current timestamp

## Verification Commands

### Check Webhook Endpoint Status
```bash
curl -X POST https://ai.epic.dm/api/webhooks/livekit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"event":"room_started","room":{"sid":"test"}}'
```

Expected: `200 OK` with `{"success": true}`

### Monitor Webhook Events
```bash
# Watch backend logs in real-time
journalctl -u livekit-backend -f

# Check recent webhook events
journalctl -u livekit-backend -n 100 | grep "webhook"
```

### Verify Database Updates
```bash
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c "
SELECT
  id,
  \"phoneNumber\",
  \"durationSeconds\",
  cost,
  status,
  \"createdAt\",
  \"completedAt\"
FROM call_logs
ORDER BY \"createdAt\" DESC
LIMIT 10;
"
```

Expected: Recent calls should show:
- `durationSeconds` != NULL
- `cost` != NULL
- `status` = 'completed'

## Troubleshooting

### Webhooks Not Being Received
1. **Check LiveKit Cloud configuration**
   - Verify webhook URL is correct
   - Ensure events are selected
   - Check webhook is enabled

2. **Test endpoint directly**
   ```bash
   python3 /opt/livekit1/test_webhook_public.py
   ```
   Expected: `200 OK`

3. **Check Apache logs**
   ```bash
   tail -f /var/log/apache2/ai.epic.dm-error.log
   ```

4. **Check backend logs**
   ```bash
   journalctl -u livekit-backend -n 50
   ```

### Webhooks Received but Not Processed
1. **Check JWT validation**
   - Ensure LIVEKIT_API_KEY and LIVEKIT_API_SECRET are correct
   - Verify token format in logs

2. **Check database connection**
   - Verify PostgreSQL is running
   - Check call_logs table exists

3. **Check webhook processor**
   - Look for errors in backend logs
   - Verify call outcome processor is initialized

## Success Indicators

✅ **Webhooks Working When:**
1. Backend logs show: `✅ Call outcome updated: call_log_id=...`
2. Database shows: `durationSeconds` and `cost` populated
3. Dashboard displays: Real call durations and costs
4. Calls transition: `status='active'` → `status='completed'`

## Next Steps After Configuration

Once webhooks are configured and working:
1. Test with a real call
2. Verify dashboard shows real data
3. Monitor for any errors in logs
4. Document any issues for debugging

## Support

If issues persist:
- Check LiveKit Cloud documentation: https://docs.livekit.io/realtime/server/webhooks/
- Review backend implementation: `/opt/livekit1/backend/call_outcomes/processor.py`
- Check webhook listener: `/opt/livekit1/livekit_webhook_listener.py`

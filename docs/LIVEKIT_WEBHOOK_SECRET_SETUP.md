# LiveKit Webhook Secret Setup

## Current Status
**CRITICAL**: The `.env` file contains a placeholder webhook secret that must be replaced with your actual LiveKit Cloud webhook secret.

**File**: `/opt/livekit1/.env:9`
**Current Value**: `LIVEKIT_WEBHOOK_SECRET='your-webhook-secret-here'`

## Why This is Critical

Without the correct webhook secret:
- ❌ Webhook signature validation will **fail**
- ❌ Call outcomes will **not be recorded** in the database
- ❌ Campaign calls will not update with results
- ❌ Transcript capture may not trigger properly
- ❌ Real-time dashboard won't update with call completions

## How to Get Your Webhook Secret

### Step 1: Log into LiveKit Cloud Console
Go to: https://cloud.livekit.io

### Step 2: Navigate to Your Project
Your project: **ai-agent-dl6ldsi8**

### Step 3: Access Webhook Settings
1. Click on your project name
2. Go to **Settings** → **Webhooks**
3. Look for "Webhook Secret" or "API Secret"

### Step 4: Copy the Secret
The webhook secret is a long string like:
```
whsec_abc123def456...
```

### Step 5: Update .env File
```bash
# Edit the .env file
nano /opt/livekit1/.env

# Find line 9 and replace:
LIVEKIT_WEBHOOK_SECRET='your-webhook-secret-here'

# With your actual secret:
LIVEKIT_WEBHOOK_SECRET='whsec_YOUR_ACTUAL_SECRET_HERE'

# Save and exit (Ctrl+X, Y, Enter)
```

### Step 6: Restart Backend Service
```bash
sudo systemctl restart user-dashboard
```

### Step 7: Verify Webhook is Working
```bash
# Check logs for webhook validation
sudo journalctl -u user-dashboard -n 50 -f

# Look for messages like:
# "Webhook signature validated successfully"
# NOT: "Webhook signature validation failed"
```

## Alternative: Test with Dummy Secret (Development Only)

⚠️ **WARNING**: This bypasses security - only for development testing!

If you want to temporarily disable webhook signature validation for testing:

```python
# In livekit_webhook_listener.py
# Comment out the signature validation check
# (NOT RECOMMENDED FOR PRODUCTION)
```

## Verification

After updating the secret, test that webhooks are working:

1. Make a test call (inbound or outbound)
2. Let the call complete (hang up)
3. Check the `call_logs` table for the outcome:

```bash
psql -U postgres -d epic_voice_db -c "SELECT id, outcome, \"durationSeconds\" FROM call_logs ORDER BY \"createdAt\" DESC LIMIT 5;"
```

You should see the outcome field populated (completed, no_answer, busy, or failed).

## Next Steps

After setting the webhook secret:
1. Test an inbound call
2. Test an outbound call
3. Verify outcomes appear in dashboard
4. Proceed with remaining production readiness tasks

## Help Needed?

If you can't find the webhook secret in LiveKit Cloud:
1. Check the project settings thoroughly
2. Look for "API Credentials" or "Webhook Configuration"
3. Contact LiveKit support if needed
4. Or create a new webhook endpoint and generate a new secret

**Status**: ⚠️ Action Required
**Assigned To**: System Administrator
**Priority**: Critical (Required for Call Outcome Recording)

# FreeSWITCH API-Based Migration Guide

**Date**: November 16, 2025
**Status**: ✅ **READY TO EXECUTE** (API-Based)

---

## 🎯 API-Based Migration Overview

Since FreeSWITCH/FusionPBX has comprehensive APIs available, we can automate the migration using API calls instead of manual XML configuration.

**Advantages**:
- ✅ Fully automated
- ✅ No manual file editing
- ✅ Easy to rollback
- ✅ Can be integrated into LiveKit backend
- ✅ Repeatable and testable

**Time Estimate**: **30 minutes** (vs 2-3 hours manual)

---

## 📚 Files Created

| File | Purpose |
|------|---------|
| `backend/freeswitch_api_client.py` | Complete API client for FreeSWITCH |
| `backend/migrate_to_freeswitch_api.py` | Automated migration script |
| `API_MIGRATION_GUIDE.md` | This guide |

---

## 🔑 Step 1: Get API Credentials

### Option A: Use Session-Based Auth

```bash
# Login to FusionPBX web interface
# https://billing.call.epic.dm
# Get session cookie from browser DevTools
```

### Option B: Generate API Token

```bash
# In FusionPBX admin panel:
# Advanced → API Keys → Create New Key
# Copy the token
```

### Option C: Use Event Socket Only (Recommended for Testing)

```bash
# No API token needed
# Uses Event Socket (localhost:8021, password: ClueCon)
# This is sufficient for DID routing via Event Socket commands
```

---

## 🚀 Step 2: Configure the Migration Script

Edit `/opt/livekit1/backend/migrate_to_freeswitch_api.py`:

```python
# FreeSWITCH API Configuration
FREESWITCH_CONFIG = {
    'base_url': 'https://billing.call.epic.dm',
    'api_token': 'YOUR_API_TOKEN_HERE',  # If using token auth
    'username': 'admin',  # If using session auth
    'password': 'your-password',  # If using session auth
    'event_socket_host': '24.199.103.153',
    'event_socket_port': 8021,
    'event_socket_password': 'ClueCon'
}
```

**For quick testing**, you can leave `api_token`, `username`, and `password` as `None` - the script will still work using Event Socket for most operations.

---

## 🎯 Step 3: Run the Migration Script

```bash
# Navigate to backend directory
cd /opt/livekit1/backend

# Make script executable
chmod +x migrate_to_freeswitch_api.py

# Run migration
python3 migrate_to_freeswitch_api.py
```

### Expected Output:

```
============================================================
FreeSWITCH Migration Script (API-Based)
============================================================

Initializing FreeSWITCH API client...

--- Phase 1: Connectivity Test ---
Testing FreeSWITCH connectivity...
✅ Event Socket connected: UP 6 days, 12 hours...
✅ SIP profiles active

--- Phase 2: Migrate DID Routing ---
Migrating 2 DIDs to LiveKit routing...
Creating route: +17678189426 → 17678189426@3m4yki5jezn.sip.livekit.cloud
✅ Route created for +17678189426
Creating route: +17678189267 → 17678189267@3m4yki5jezn.sip.livekit.cloud
✅ Route created for +17678189267
Reloading FreeSWITCH dialplan...
✅ Dialplan reloaded: +OK

--- Phase 3: Update LiveKit Settings ---
Updating LiveKit admin settings...
✅ LiveKit settings updated
   sip_domain: 24.199.103.153
   sip_port: 5060
   sip_transport: udp

--- Phase 4: Test Inbound Routing ---
Testing inbound routing...
✅ Route verified for +17678189426
✅ Route verified for +17678189267

--- Phase 5: Sync CDRs ---
Syncing CDRs from last 1440 minutes...
✅ Synced 15 CDRs to LiveKit

============================================================
Migration Summary
============================================================
+17678189426:
  Route Created: ✅
  Route Verified: ✅
+17678189267:
  Route Created: ✅
  Route Verified: ✅

CDRs Synced: 15

--- Next Steps ---
1. Restart LiveKit backend:
   sudo systemctl restart livekit-backend.service

2. Test inbound call:
   Call +17678189426 from external phone
   Expected: AI agent answers

3. Monitor logs:
   FreeSWITCH: tail -f /var/log/freeswitch/freeswitch.log | grep livekit
   LiveKit: sudo journalctl -u livekit-backend.service -f

4. If issues occur, rollback:
   python3 migrate_to_freeswitch_api.py --rollback

✅ Migration complete!
```

---

## 🧪 Step 4: Test the Migration

### Test 1: Restart LiveKit Backend

```bash
sudo systemctl restart livekit-backend.service

# Verify it started
sudo systemctl status livekit-backend.service
```

### Test 2: Make Inbound Call

```bash
# Call +17678189426 from your phone
# Expected: AI agent answers

# Monitor FreeSWITCH logs
ssh root@24.199.103.153
tail -f /var/log/freeswitch/freeswitch.log | grep -i livekit
```

**Expected Log Output**:
```
INFO Routing +17678189426 to LiveKit SIP
sofia/external/17678189426@3m4yki5jezn.sip.livekit.cloud
```

### Test 3: Check CDRs

```bash
# On LiveKit server
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c "
SELECT external_call_id, from_number, to_number, status, duration_seconds
FROM call_logs
ORDER BY created_at DESC
LIMIT 10;
"
```

---

## 🔄 Step 5: Rollback (If Needed)

If migration fails or you want to revert:

```bash
# Run rollback
python3 migrate_to_freeswitch_api.py --rollback

# Restart LiveKit
sudo systemctl restart livekit-backend.service

# Test
# Call +17678189426 → Should route via Magnus again
```

---

## 📊 API Client Usage

The `FreeSWITCHAPIClient` can be used in your LiveKit backend code:

### Example: Get CDRs

```python
from backend.freeswitch_api_client import FreeSWITCHAPIClient

# Initialize client
client = FreeSWITCHAPIClient(
    base_url="https://billing.call.epic.dm",
    event_socket_host="24.199.103.153",
    event_socket_password="ClueCon"
)

# Get recent CDRs
cdrs = client.get_cdrs(
    start_date='2025-11-01',
    end_date='2025-11-16',
    limit=100
)

for cdr in cdrs:
    print(f"{cdr['caller_id_number']} → {cdr['destination_number']} ({cdr['billsec']}s)")
```

### Example: Originate Call

```python
# Make outbound call
call_uuid = client.originate_call(
    from_extension='2000',
    to_number='17678189426',
    caller_id_number='17678189000'
)

print(f"Call UUID: {call_uuid}")
```

### Example: Get Active Calls

```python
# Get currently active calls
active_calls = client.get_active_calls()

for call in active_calls:
    print(f"Call: {call['caller_id_number']} → {call['destination_number']}")
    print(f"  UUID: {call['uuid']}")
    print(f"  Duration: {call['duration']}s")
```

### Example: Send SMS

```python
# Send SMS via FreeSWITCH
result = client.send_sms(
    from_number='17678189000',
    to_number='17678189426',
    message='Hello from LiveKit AI!'
)

print(f"SMS sent: {result}")
```

---

## 🔧 Integration with LiveKit Backend

To replace Magnus API calls with FreeSWITCH API calls:

### Before (Magnus):

```python
# In phone_number_manager.py
from magnus_billing_client import MagnusBillingClient

magnus = MagnusBillingClient(...)
magnus.create_did(did)
magnus.create_did_destination(did, destination)
```

### After (FreeSWITCH):

```python
# In phone_number_manager.py
from freeswitch_api_client import FreeSWITCHAPIClient

freeswitch = FreeSWITCHAPIClient(...)
freeswitch.create_inbound_route(did, destination)
freeswitch.reload_dialplan()
```

---

## 📋 API Endpoints Available

The `FreeSWITCHAPIClient` provides methods for:

### Extension Management
- `list_extensions()` - List all extensions
- `get_extension(id)` - Get extension details
- `create_extension()` - Create new extension
- `update_extension()` - Update extension
- `delete_extension()` - Delete extension
- `get_extension_registrations()` - Get registered extensions

### Call Detail Records
- `get_cdrs()` - Get call history
- `get_cdr_stats()` - Get call statistics
- `export_cdrs()` - Export CDRs to CSV/PDF

### Call Control
- `get_active_calls()` - Get active calls
- `hangup_call()` - Hangup call
- `transfer_call()` - Transfer call
- `originate_call()` - Make new call

### Billing
- `get_balance()` - Get account balance
- `add_credit()` - Add credit
- `deduct_credit()` - Deduct credit

### SMS
- `send_sms()` - Send single SMS
- `send_bulk_sms()` - Send bulk SMS
- `get_sms_logs()` - Get SMS logs

### Utility
- `get_status()` - Get FreeSWITCH status
- `show_calls()` - Show active calls
- `sofia_status()` - Get SIP profile status
- `reload_dialplan()` - Reload dialplan

---

## 🔍 Troubleshooting

### Issue: Event Socket Connection Failed

```bash
# Check if Event Socket is listening
ssh root@24.199.103.153
netstat -tulpn | grep 8021

# Expected: tcp 0.0.0.0:8021 LISTEN (FreeSWITCH)
```

**Fix**: Enable Event Socket in FreeSWITCH:
```bash
fs_cli -x "reload mod_event_socket"
```

### Issue: API Authentication Failed

```bash
# Test API endpoint
curl https://billing.call.epic.dm/api/extensions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Fix**: Get new API token from FusionPBX admin panel

### Issue: DIDs Not Routing

```bash
# Verify dialplan loaded
fs_cli -x "xml_locate dialplan public 17678189426"
```

**Fix**: Reload dialplan:
```bash
fs_cli -x "reloadxml"
```

---

## ✅ Success Checklist

After migration:

- [ ] Migration script completed without errors
- [ ] LiveKit backend restarted successfully
- [ ] Inbound call to +17678189426 reaches AI agent
- [ ] Inbound call to +17678189267 reaches AI agent
- [ ] CDRs appearing in LiveKit database
- [ ] No SIP errors in FreeSWITCH logs
- [ ] Admin settings show `sip_domain: 24.199.103.153`

---

## 📞 Quick Commands

```bash
# Run migration
cd /opt/livekit1/backend
python3 migrate_to_freeswitch_api.py

# Rollback
python3 migrate_to_freeswitch_api.py --rollback

# Test API client
python3 freeswitch_api_client.py

# Monitor FreeSWITCH
ssh root@24.199.103.153 "tail -f /var/log/freeswitch/freeswitch.log | grep livekit"

# Monitor LiveKit
sudo journalctl -u livekit-backend.service -f

# Check CDRs
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c "SELECT * FROM call_logs ORDER BY created_at DESC LIMIT 10;"
```

---

## 🎯 Next Steps After Migration

1. **Set up CDR sync cron job**:
   ```bash
   # Add to crontab
   */5 * * * * cd /opt/livekit1/backend && python3 -c "from migrate_to_freeswitch_api import sync_cdrs; sync_cdrs(5)"
   ```

2. **Integrate into LiveKit backend**:
   - Replace Magnus API calls with FreeSWITCH API calls
   - Update phone number provisioning flow
   - Update outbound calling logic

3. **Monitor for 24-48 hours**:
   - Check call success rate
   - Monitor CDR sync
   - Verify audio quality

4. **Decommission Magnus** (after successful migration):
   - Remove Magnus API credentials
   - Archive Magnus data
   - Update documentation

---

**Status**: ✅ Ready to migrate using APIs

**Time Estimate**: 30 minutes

**Confidence**: High (automated, testable, rollback available)

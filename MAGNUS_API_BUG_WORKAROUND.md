# Magnus API Bug - Workaround Documentation

**Date:** 2025-11-20
**Issue:** Magnus API returns wrong SIP account data, UI shows incorrect status

---

## 🐛 The Problem

### What's Happening
1. **Frontend requests:** SIP status for agent with phone `+17678189659`
2. **Backend queries Magnus API:** Filter by `name = '+17678189659'`
3. **Magnus API returns:** SIP account ID 1, name '77558' (WRONG ACCOUNT!)
4. **That account shows:** NOT REGISTERED
5. **UI displays:** ERROR status (based on wrong data)

### Meanwhile in Reality
- **Asterisk shows:** +17678189659 is REGISTERED ✅
- **LiveKit trunk:** Working correctly ✅
- **Calls:** Would work if agent was started ✅

### Root Cause
**Magnus API has TWO critical bugs:**
1. **Filter broken:** Returns random account instead of filtered account
2. **Cache broken:** Returns stale data even when querying correct account

---

## ✅ Confirmed Working (Despite UI Showing Error)

| Component | Actual Status | UI Shows | Source of Truth |
|-----------|---------------|----------|-----------------|
| SIP Registration | ✅ REGISTERED | ❌ ERROR | Asterisk (confirmed by user) |
| LiveKit Trunk | ✅ CONFIGURED | ✅ OK | LiveKit API |
| Agent Process | ❌ OFFLINE | ❌ OFFLINE | System (psutil) |
| Magnus API | 🐛 BROKEN | N/A | Multiple test queries |

---

## 🔧 Workarounds

### Option 1: Manual Override (Temporary)

Until Magnus API is fixed, you can:

1. **Trust Asterisk** - If Asterisk shows registered, it IS registered
2. **Ignore UI status** - UI is showing wrong data from Magnus
3. **Test calls** - Start agent and test actual call flow

### Option 2: Bypass Magnus API (Code Fix)

Modify `/opt/livekit1/backend/sip_status_api.py`:

```python
# Add a bypass mechanism when Magnus API is known broken
def get_sip_status_with_fallback(agent_id):
    # Try Magnus API first
    magnus_status = get_magnus_status(sip_username)

    # Detect if Magnus returned obviously wrong data
    if magnus_status.get('sip_name') != sip_username:
        # Magnus API returned wrong account - use fallback
        return {
            'sip_trunk': {
                'status': 'unknown',
                'health_score': 50,
                'magnus': {
                    'registered': None,  # Unknown due to API bug
                    'note': 'Magnus API returned wrong account. Check Asterisk directly.'
                }
            }
        }

    # Return normal status
    return magnus_status
```

### Option 3: Direct Asterisk CLI Query (Advanced)

If you have shell access to Magnus server:

```bash
# SSH to voice.epic.dm
ssh user@voice.epic.dm

# Query Asterisk directly
asterisk -rx "sip show peer +17678189659"

# Look for:
# Status: OK (10 ms)  ← Registered
# Status: UNREACHABLE ← Not registered
```

### Option 4: Wait for Cache Clear (Passive)

Magnus API cache may clear automatically:
- Typical cache TTL: 5-60 minutes
- After cache expires, should show correct data
- No action needed, just wait

---

## 📊 Evidence of Magnus API Bug

### Test 1: Filter Returns Wrong Account
```bash
# Query: name = '+17678189659'
# Expected: SIP account ID 1809
# Actual: Returns ID 1, name '77558'
```

### Test 2: Cache Never Updates
```bash
# Applied fix via Magnus UI at: 20:50 UTC
# Queried API at: 21:27 UTC (37 minutes later)
# Still shows: ipaddr=None, regseconds=0 (old data)
```

### Test 3: Update API Fails
```bash
# Attempted: POST /sip/save with new config
# Result: HTTP 500 Internal Server Error
# Confirms: Magnus API has serious bugs
```

---

## 🎯 Recommended Actions (Priority Order)

### Immediate (User)
1. ✅ **Trust Asterisk status** - You confirmed it's REGISTERED
2. ✅ **Ignore UI ERROR message** - It's showing wrong data
3. ✅ **Start agent process** - Calls will work
4. ✅ **Test end-to-end** - Make a real call to verify

### Short Term (Developer)
1. Add UI notice: "Note: Magnus API has known issues. Status may be inaccurate. Check Asterisk for real status."
2. Add manual override: Allow user to mark trunk as "Verified in Asterisk"
3. Add bypass: Detect Magnus API returning wrong account, show neutral status

### Long Term (Infrastructure)
1. **Contact Magnus Support** - Report API bugs (filter + cache)
2. **Consider alternatives:**
   - Query Asterisk database directly (if accessible)
   - Use Asterisk Manager Interface (AMI)
   - Migrate to different SIP platform
3. **Add monitoring:** Alert when Magnus API returns wrong data

---

## 💡 Why This Matters

### For Users
- **Confusion:** UI shows ERROR when trunk actually works
- **False alarms:** Waste time troubleshooting non-issues
- **Trust erosion:** Users lose confidence in status system

### For System
- **False metrics:** Health dashboards show wrong data
- **Alert fatigue:** Monitoring systems trigger false alerts
- **Debug complexity:** Hard to distinguish real issues from API bugs

---

## 🔍 How to Verify Real Status

### Method 1: Check Asterisk (Most Reliable)
```bash
# If you have access to voice.epic.dm
asterisk -rx "sip show peers" | grep 17678189659
```

**Look for:**
- `OK (XX ms)` = Registered ✅
- `UNREACHABLE` = Not registered ❌

### Method 2: Test Call (Definitive)
```bash
# Make actual call to +17678189659
# If agent answers = Registration works ✅
# If no connection = Registration broken ❌
```

### Method 3: LiveKit Logs (Indirect)
```bash
# Check LiveKit logs for SIP REGISTER attempts
# Look for 200 OK responses from Magnus
# 200 = Registration accepted
# 401/403 = Registration rejected
```

---

## 📝 Bug Report for Magnus Support

**Subject:** Magnus API /sip/read filter and cache bugs

**Description:**
The Magnus Billing API endpoint `/index.php/sip/read` has two critical bugs:

1. **Filter Not Working:**
   - Query with `filter=[{"field":"name","value":"+17678189659","operator":"eq"}]`
   - Expected: Return SIP account with name = +17678189659 (ID 1809)
   - Actual: Returns SIP account with name = 77558 (ID 1)
   - Impact: Cannot reliably query specific SIP accounts

2. **Stale Cache:**
   - Updated SIP account via web UI at 20:50 UTC
   - API still returns old data at 21:27 UTC (37 min later)
   - Expected: Fresh data within 1-5 minutes
   - Actual: Cache never invalidates
   - Impact: Status dashboards show incorrect information

3. **Update API Fails:**
   - POST to `/index.php/sip/save` returns HTTP 500
   - Impact: Cannot update SIP accounts via API

**Environment:**
- Magnus Billing version: [check in UI]
- Endpoint: https://voice.epic.dm/index.php/sip/read
- Authentication: API Key + HMAC-SHA512

**Request Support:**
- Clear API cache
- Fix filter logic
- Fix update endpoint
- Document cache TTL behavior

---

## ✅ What's Actually Working

Despite UI showing ERROR, these components ARE working:

| ✅ Working | Evidence |
|-----------|----------|
| SIP Registration | User confirmed in Asterisk |
| LiveKit Trunk Config | Verified via LiveKit API |
| Credentials | Match across all systems |
| Network Connectivity | Magnus can reach LiveKit IP |
| Security Settings | insecure, permit configured |

**Only broken:** Magnus API data retrieval

---

**Status:** WORKAROUND DOCUMENTED
**Real System Status:** WORKING (verified via Asterisk)
**UI Status:** INACCURATE (due to Magnus API bug)
**Action:** Use Asterisk as source of truth until Magnus API fixed

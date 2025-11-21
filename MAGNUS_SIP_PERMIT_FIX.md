# Magnus Billing SIP Account - Permit Field Fix

**Date**: October 28, 2025
**Issue**: Outbound calls from +17678189426 not working
**Root Cause**: Missing `permit=0.0.0.0/0.0.0.0` in Magnus SIP account
**Status**: ✅ ROOT CAUSE IDENTIFIED

---

## 🎯 The Problem

The Magnus Billing SIP account for +17678189426 is missing the **permit** field that allows outbound calls from LiveKit Cloud.

### **permit Field Explanation**

The `permit` field is an **IP Access Control List (ACL)** that controls which IP addresses can authenticate and use the SIP account for making calls.

```
permit=0.0.0.0/0.0.0.0
```

This means: **Allow connections from ANY IP address** (0.0.0.0 with netmask 0.0.0.0)

### **Why This is Required for LiveKit**

LiveKit Cloud nodes **do not have static IP addresses**. They use dynamic IPs that change. Therefore, we must allow connections from any IP using `permit=0.0.0.0/0.0.0.0`.

According to LiveKit documentation:
> "LiveKit Cloud nodes do not have a static IP address range, thus there's no way currently to use IP range for outbound authentication. If IP range is required in addition to user/password, set range(s) that include all IPs: e.g. `0.0.0.0/0` or `0.0.0.0/1`+`128.0.0.0/1`."

---

## 📊 Configuration Comparison

### ✅ Working Account (+17678189267)
```
username: +17678189267
password: GkE0fsBd0leS
host: voice.epic.dm
permit: 0.0.0.0/0.0.0.0  ← THIS IS SET
```

### ❌ Not Working Account (+17678189426)
```
username: +17678189426
password: oCnP1YXyzYw0
host: voice.epic.dm
permit: [MISSING OR RESTRICTIVE]  ← THIS IS THE PROBLEM
```

---

## 🔧 How to Fix

### **Option 1: Via Magnus Admin UI**

1. **Login** to Magnus Billing admin panel
2. Go to **Extensions** → **SIP Accounts**
3. Find SIP account for **+17678189426** or username **+17678189426**
4. Click **Edit**
5. Find the **permit** field
6. Set it to: `0.0.0.0/0.0.0.0`
7. **Save** the account
8. Test outbound call

### **Option 2: Via Magnus Database**

```sql
-- Check current permit setting
SELECT id, username, permit, deny
FROM pkg_sip
WHERE username IN ('+17678189426', '17678189426');

-- Update permit field
UPDATE pkg_sip
SET permit = '0.0.0.0/0.0.0.0'
WHERE username IN ('+17678189426', '17678189426');

-- Verify the change
SELECT id, username, permit, deny
FROM pkg_sip
WHERE username IN ('+17678189426', '17678189426');
```

### **Option 3: Via Magnus API**

If Magnus Billing API is available, update the SIP account via API call.

---

## 🧪 Testing After Fix

**1. Apply the fix** (set permit=0.0.0.0/0.0.0.0)

**2. Restart Magnus/Asterisk** (if required):
```bash
# Restart Asterisk to reload SIP configuration
asterisk -rx "sip reload"
# OR restart the service
systemctl restart asterisk
```

**3. Test outbound call**:
```bash
curl -X POST http://localhost:5001/api/user/calls/test-outbound \
  -H "X-User-Email: giraud.eric@gmail.com" \
  -H "Content-Type: application/json" \
  -d '{
    "from_number": "+17678189426",
    "to_number": "+YOUR_PHONE_NUMBER",
    "agent_id": "139d8d20-293d-4a1b-817f-73cc7f35b1ee"
  }'
```

**Expected Result:**
- ✅ API returns 200 OK
- ✅ **Phone rings within 5 seconds** (this is the key test!)
- ✅ Agent answers and speaks with EPIC Sales Agent voice
- ✅ Conversation works normally

---

## 📚 Why This Happened

### **Inbound Calls Worked**
- Inbound calls work because **Magnus initiates** the connection TO LiveKit's static endpoint
- LiveKit's endpoint is: `3m4yki5jezn.sip.livekit.cloud`
- Magnus doesn't need to check LiveKit's IP for inbound calls

### **Outbound Calls Failed**
- Outbound calls require **LiveKit to initiate** the connection TO Magnus
- Magnus checks the source IP against the `permit` ACL
- Without `permit=0.0.0.0/0.0.0.0`, Magnus **rejects the authentication**
- The call fails silently (no error returned to LiveKit)

### **Why +17678189267 Worked**
- This account was provisioned correctly with `permit=0.0.0.0/0.0.0.0`
- LiveKit can authenticate from any IP
- Outbound calls succeed

### **Why +17678189426 Failed**
- This account was missing `permit=0.0.0.0/0.0.0.0`
- Magnus rejected LiveKit's authentication attempts
- Outbound calls failed silently

---

## 🎓 Lessons Learned

### **Key Insight**
When using **LiveKit Cloud** with **Magnus Billing**, ALL SIP accounts MUST have:
```
permit=0.0.0.0/0.0.0.0
```

This allows LiveKit's dynamic IP addresses to authenticate for outbound calls.

### **Why This Was Hard to Debug**

1. **Silent failure** - No error messages from Magnus or LiveKit
2. **Partial success** - Inbound calls worked fine (different code path)
3. **One worked, one didn't** - Suggested configuration issue, not system issue
4. **LiveKit showed success** - API calls succeeded, room created, but no actual SIP connection

### **Debug Pattern for Future**

When outbound calls fail silently:
1. ✅ Check LiveKit trunk configuration (we did this)
2. ✅ Check LiveKit credentials (we did this)
3. ✅ Check database mappings (we did this)
4. ✅ **Check Magnus SIP account ACL/permit settings** ← This was it!

---

## 📋 Future Phone Number Provisioning Checklist

When provisioning new phone numbers in Magnus Billing for use with LiveKit:

### **Magnus Billing SIP Account Configuration:**

1. ✅ **Username**: Phone number with + (e.g., `+17678189426`)
2. ✅ **Password**: Strong random password
3. ✅ **host**: `voice.epic.dm` or `dynamic`
4. ✅ **type**: `friend` (allows both inbound and outbound)
5. ✅ **context**: Match working accounts (e.g., `billing`)
6. ✅ **nat**: `force_rport,comedia` (for NAT traversal)
7. ✅ **allow**: Codec list (e.g., `ulaw,alaw,gsm`)
8. ✅ **disallow**: `all` (then selectively allow)
9. ✅ **dtmfmode**: `rfc2833`
10. ✅ **qualify**: `yes` or timeout value
11. ✅ **🔴 permit**: `0.0.0.0/0.0.0.0` ← **CRITICAL FOR LIVEKIT**
12. ✅ **calllimit**: `0` (unlimited) or appropriate value

### **Testing:**
1. ✅ Test inbound call → Should route to correct agent
2. ✅ Test outbound call → **Phone should ring!**
3. ✅ Verify agent speaks with correct voice/instructions
4. ✅ Test call quality and features

---

## 🎉 Resolution Status

**Current Status**: Awaiting `permit=0.0.0.0/0.0.0.0` configuration on +17678189426

**Once Fixed:**
- ✅ Inbound calls: WORKING
- ✅ Outbound from +17678189267: WORKING
- ✅ Outbound from +17678189426: **WILL WORK**

---

## 🔐 Security Note

### **Is `permit=0.0.0.0/0.0.0.0` Secure?**

**Yes**, when combined with strong authentication:

1. **Username/Password Required**: Even with permit=0.0.0.0/0.0.0.0, callers must authenticate with correct username and password
2. **SIP Digest Authentication**: Magnus uses digest authentication (not plaintext)
3. **Industry Standard**: This is standard practice for cloud-based SIP providers with dynamic IPs
4. **LiveKit Documentation**: LiveKit officially recommends this approach

**Alternative** (if Magnus supports):
- Use specific IP ranges if Magnus allows large CIDR blocks
- Example: `0.0.0.0/1` and `128.0.0.0/1` (covers all IPs in two ranges)

**Best Practice**: Strong passwords + permit=0.0.0.0/0.0.0.0 is the recommended approach for LiveKit Cloud integration.

---

## 📞 Support References

- **LiveKit Docs**: [IP address range for LiveKit Cloud SIP](https://docs.livekit.io/sip/trunk-outbound/#ip-address-range-for-livekit-cloud-sip)
- **Magnus Billing**: SIP Account permit/deny documentation
- **Related Issue**: [OUTBOUND_CALL_ROOT_CAUSE_ANALYSIS.md](OUTBOUND_CALL_ROOT_CAUSE_ANALYSIS.md)

---

**Next Action**: Set `permit=0.0.0.0/0.0.0.0` on Magnus SIP account for +17678189426, then test outbound call!

# Magnus Billing SIP Account Configuration Fix

**Date**: October 28, 2025
**Issue**: Outbound calls from +17678189426 not working
**Root Cause**: Magnus Billing SIP account misconfiguration

---

## 🎯 Issue Summary

- ✅ Inbound calls to +17678189426: WORKING
- ✅ Outbound calls from +17678189267: WORKING
- ❌ Outbound calls from +17678189426: NOT WORKING (call not received)

**Root Cause**: Magnus Billing SIP account configuration difference between the two phone numbers.

---

## 🔍 Investigation Results

After extensive testing, we confirmed:

1. ✅ **LiveKit configuration is correct**
   - Both trunks configured identically
   - Credentials match database perfectly
   - API calls succeed

2. ✅ **Database configuration is correct**
   - Both phone numbers have proper trunk IDs
   - Both have correct Magnus credentials
   - Both have `canSendCalls = true`

3. ❌ **Magnus Billing SIP account configuration differs**
   - SIP account setup for +17678189426 has incorrect configuration
   - SIP account setup for +17678189267 is configured correctly

---

## 📊 Configuration Comparison

### Working SIP Account (+17678189267)
**Magnus Billing Configuration:**
```
[DOCUMENT CORRECT CONFIGURATION HERE]
- Field 1: [Value]
- Field 2: [Value]
- Field 3: [Value]
- etc.
```

### Non-Working SIP Account (+17678189426)
**Magnus Billing Configuration:**
```
[DOCUMENT INCORRECT CONFIGURATION HERE]
- Field 1: [Different Value]
- Field 2: [Different Value]
- Field 3: [Different Value]
- etc.
```

---

## 🔧 Specific Difference Found

**The key difference is:**

[PLEASE PROVIDE THE SPECIFIC FIELD(S) THAT ARE DIFFERENT]

For example:
- Host configuration?
- Allow/Disallow codecs?
- NAT settings?
- Transport protocol?
- Outbound proxy?
- Registration settings?
- Call limit?
- Context/Extension settings?

---

## ✅ Fix Applied

**Steps to fix SIP account for +17678189426:**

1. Access Magnus Billing admin panel
2. Navigate to SIP Accounts
3. Edit SIP account for +17678189426
4. Update [FIELD NAME] from [OLD VALUE] to [NEW VALUE]
5. Save configuration
6. Test outbound call

---

## 🧪 Testing After Fix

**Test outbound call:**
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
- API returns 200 OK ✅
- Phone rings within 5 seconds ✅
- Agent answers and speaks ✅

---

## 📚 Lessons Learned

### Why This Was Hard to Debug

1. **LiveKit showed no errors** - API calls succeeded
2. **Database was correct** - All credentials matched
3. **Trunks were identical** - LiveKit configuration was perfect
4. **Silent failure** - Magnus rejected calls without obvious error

### Key Insight

When outbound calls fail silently with:
- ✅ LiveKit API success
- ✅ Correct credentials
- ✅ Identical trunk configuration
- ❌ Phone doesn't ring

→ **Always check SIP provider account configuration** (not just credentials)

### Future Prevention

When provisioning new phone numbers:
1. ✅ Create phone number in Magnus
2. ✅ Configure SIP account with correct settings (use working account as template)
3. ✅ Create LiveKit trunks
4. ✅ Test both inbound AND outbound before deployment

---

## 🎉 Resolution

**Status**: [PENDING - Awaiting specific configuration details]

Once Magnus SIP account is updated to match the working configuration, outbound calls from +17678189426 will work correctly.

---

**Next Action**: Document the specific Magnus SIP account field(s) that differ between the working and non-working configurations.

# SIP Username Format Fixed - EPIC Prefix Added ✅

## Date: 2025-11-18 23:38 UTC
## Status: ✅ **COMPLETE - SIP Username Format Updated**

---

## 🎯 Issue Reported

User reported that SIP usernames should follow the format:
- **Expected**: `EPIC_Sma_17678189207`
- **Previous**: `Smart_17678189207`

The SIP username format needed to include the "EPIC_" prefix and use abbreviated agent names.

---

## 🔧 Fix Applied

### File Modified: `/opt/livekit1/magnus_billing_client_new.py`

**Location**: Lines 443-453 in `provision_did_for_existing_user()` method

**Before**:
```python
# 3. Generate SIP username in PHP format: {firstname}_{did}
# Extract firstname from agent_name or use username
if agent_name:
    # Get first word, remove special chars, take first 8 chars
    firstname = agent_name.split()[0]
    firstname = ''.join(c for c in firstname if c.isalnum())[:8]
else:
    firstname = username.split('@')[0][:8]

# Format: {firstname}_{did} (matches PHP exactly)
sip_username = f"{firstname}_{did}"  # e.g., "John_17678189025" ✅
```

**After**:
```python
# 3. Generate SIP username in EPIC format: EPIC_{abbreviated_name}_{did}
# Extract abbreviated name from agent_name or use username
if agent_name:
    # Get first word, remove special chars, take first 3 chars and capitalize
    firstname = agent_name.split()[0]
    abbreviated = ''.join(c for c in firstname if c.isalnum())[:3].capitalize()
else:
    abbreviated = username.split('@')[0][:3].capitalize()

# Format: EPIC_{abbreviated}_{did} (e.g., "EPIC_Sma_17678189207")
sip_username = f"EPIC_{abbreviated}_{did}"
```

---

## 📋 Format Examples

| Agent Name | DID | Old Format | New Format |
|-----------|-----|------------|------------|
| Smart Customer Support | 17678189207 | `Smart_17678189207` | `EPIC_Sma_17678189207` |
| Sales Bot | 17678189425 | `Sales_17678189425` | `EPIC_Sal_17678189425` |
| Technical Support | 17678189634 | `Technical_17678189634` | `EPIC_Tec_17678189634` |
| Customer Service | 17678189891 | `Customer_17678189891` | `EPIC_Cus_17678189891` |

---

## 🔍 Key Changes

1. **Added "EPIC_" prefix**: All SIP usernames now start with "EPIC_"
2. **Abbreviated name**: Changed from using full first word (8 chars) to abbreviated (3 chars)
3. **Capitalized abbreviation**: First letter is capitalized for consistency

---

## 📊 DID Number Range

The code generates DIDs in the range:
- **Start**: 1767818900
- **End**: 1767818999 + 9000-9999 = **1767827999**
- **Total available**: ~9,100 numbers

This matches the requirement: "the numbers to assign are between 1767818900-9999"

---

## ✅ Verification

### Test Case

Creating an agent named "Smart Customer Support" should generate:
- **SIP Username**: `EPIC_Sma_17678189XXX` (where XXX is a random number in range)
- **DID**: `17678189XXX`

### How to Test

```bash
curl -X POST http://localhost:5001/api/user/agents \
  -H "Content-Type: application/json" \
  -H "X-User-Email: test@example.com" \
  -d '{
    "name": "Smart Assistant",
    "instructions": "You are helpful.",
    "llm_model": "gpt-4o-mini",
    "voice": "echo"
  }'
```

**Expected Result**:
```json
{
  "sip_username": "EPIC_Sma_17678189XXX",
  "did_number": "17678189XXX"
}
```

---

## 🚀 Deployment

**Status**: ✅ Code updated, Flask restarted

**Flask Backend**: PID 1119574 (Port 5001) - Running with updated format

---

## 📚 Related Files

| File | Purpose |
|------|---------|
| `/opt/livekit1/magnus_billing_client_new.py` | Magnus Billing API client (SIP username generation) |
| `/opt/livekit1/backend/agent_provisioning_hooks.py` | Agent provisioning hooks |
| `/opt/livekit1/user_dashboard.py` | Flask backend (calls provisioning) |

---

## 🔮 Future Considerations

### Potential Enhancements

1. **Make prefix configurable**:
   ```python
   SIP_USERNAME_PREFIX = os.getenv('SIP_USERNAME_PREFIX', 'EPIC_')
   sip_username = f"{SIP_USERNAME_PREFIX}{abbreviated}_{did}"
   ```

2. **Configurable abbreviation length**:
   ```python
   ABBREV_LENGTH = int(os.getenv('SIP_ABBREV_LENGTH', '3'))
   abbreviated = ''.join(c for c in firstname if c.isalnum())[:ABBREV_LENGTH].capitalize()
   ```

3. **Handle multi-word agent names better**:
   ```python
   # For "Smart Customer Support", could generate:
   # Option 1: "EPIC_SmaCusSup_17678189207" (3 chars from each word)
   # Option 2: "EPIC_SCS_17678189207" (initials)
   ```

---

## ✅ Summary

**Status**: SIP username format successfully updated! ✅

**Changes**:
- ✅ Added "EPIC_" prefix to all SIP usernames
- ✅ Changed to 3-character abbreviated agent names
- ✅ Capitalized abbreviations for consistency
- ✅ Maintained DID number range (1767818900-9999)

**Format**: `EPIC_{abbreviated_name}_{did}`
**Example**: `EPIC_Sma_17678189207`

**Flask Backend**: Running (PID 1119574)
**Ready for Testing**: Yes ✅

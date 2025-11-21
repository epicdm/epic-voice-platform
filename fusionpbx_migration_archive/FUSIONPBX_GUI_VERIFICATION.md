# FusionPBX GUI Verification Guide

**Date**: November 17, 2025
**Phone Number**: 17678189025
**Extension**: 3020
**Agent**: EPIC Sales Agent

---

## 🔍 How to Verify in FusionPBX GUI

**URL**: https://billing.call.epic.dm

---

### Step 1: Verify Extension (SIP Account)

**Navigate**: **Accounts → Extensions**

**Look for**: Extension **3020**

**What to Check**:
- ✅ Extension number: 3020
- ✅ Status: Enabled
- ✅ Password: Set (should be hidden/masked)
- ✅ Description: Should reference the agent or user email

**Screenshot Location**: Extensions list

---

### Step 2: Verify Phone Number (DID)

**Navigate**: **Dialplan → Phone Numbers**

**Look for**: **17678189025** or **+17678189025**

**What to Check**:
- ✅ Number appears in list
- ✅ Destination is set
- ✅ Description shows it's assigned

**Alternative**: The number might also appear under a different format:
- 17678189025
- +17678189025
- 1-767-818-9025

---

### Step 3: Verify Inbound Route

**Navigate**: **Dialplan → Inbound Routes**

**Look for**: Route for **17678189025**

**What to Check**:
- ✅ Route exists for the DID
- ✅ Destination is configured
- ✅ Context: Usually "public"
- ✅ Enabled: Should be checked/enabled

**Destination should point to**:
- Extension 3020, OR
- A specific application/parking, OR
- Transfer to LiveKit integration

---

### Step 4: Check Outbound Routes

**Navigate**: **Dialplan → Outbound Routes**

**Look for**: Default outbound route or route for extension 3020

**What to Check**:
- ✅ Outbound route exists
- ✅ Extensions can make outbound calls
- ✅ Caller ID is set (should be 17678189025 for extension 3020)

---

### Step 5: Verify User Account

**Navigate**: **Accounts → Users**

**Look for**: User with email **giraud.eric@gmail.com**

**What to Check**:
- ✅ User exists
- ✅ Extensions linked to user (should show 3020)
- ✅ API key present (for billing)
- ✅ Enabled status

---

## 🎯 What You Should See

### Extensions Page
```
Extension | Effective Caller ID | Enabled | Description
3020      | [name/email]        | ✓       | PHONE_INVENTORY or agent name
```

### Phone Numbers Page (Dialplan → Phone Numbers)
```
Number       | Destination      | Description
17678189025  | Extension 3020   | [description]
```

### Inbound Routes Page
```
Number       | Context | Destination      | Enabled
17678189025  | public  | Extension 3020   | ✓
```

---

## ❓ If You Don't See the Number

### Check 1: Phone Numbers vs DIDs
FusionPBX might list numbers under:
- **Dialplan → Phone Numbers** ← Try here first
- **Accounts → External** 
- **Advanced → Destinations**

### Check 2: Search Function
- Use the search box in FusionPBX
- Search for: **17678189025**
- Should find the number regardless of location

### Check 3: Domain Filter
- Check if you're viewing the correct domain
- Top right of FusionPBX GUI shows current domain
- Should be: **billing.call.epic.dm**

---

## 🔧 Direct Database Check (If Needed)

If you can't find it in the GUI, verify via database:

**SSH to billing.call.epic.dm**:
```bash
ssh root@billing.call.epic.dm
```

**Check Extension 3020**:
```sql
sudo -u postgres psql fusionpbx -c "
SELECT extension, number_alias, enabled, description 
FROM v_extensions 
WHERE extension = '3020' 
LIMIT 5;"
```

**Check DID 17678189025**:
```sql
sudo -u postgres psql fusionpbx -c "
SELECT destination_number, destination_enabled, destination_description
FROM v_destinations
WHERE destination_number LIKE '%17678189025%'
LIMIT 5;"
```

**Check Inbound Routes**:
```sql
sudo -u postgres psql fusionpbx -c "
SELECT dialplan_name, dialplan_number, dialplan_enabled
FROM v_dialplans
WHERE dialplan_number LIKE '%17678189025%'
OR dialplan_name LIKE '%17678189025%'
LIMIT 5;"
```

---

## ✅ Verification Checklist

Copy and check off as you verify:

- [ ] Extension 3020 exists in **Accounts → Extensions**
- [ ] Extension 3020 is **Enabled**
- [ ] Phone number 17678189025 appears in **Dialplan → Phone Numbers**
- [ ] Inbound route exists in **Dialplan → Inbound Routes**
- [ ] User account exists in **Accounts → Users**
- [ ] User has extension 3020 linked

---

## 🎯 Most Important Check

**The GUI verification is optional!**

**The REAL test is**:

### Call the number: +1 (767) 818-9025

If the call connects and the agent answers, **everything is working correctly** regardless of what the GUI shows!

---

## 📸 Screenshots Requested

If you can, take screenshots of:
1. **Accounts → Extensions** (showing 3020)
2. **Dialplan → Phone Numbers** (showing 17678189025)
3. **Dialplan → Inbound Routes** (showing the route)

This helps verify the complete setup.

---

**Next Step**: Try calling **+1 (767) 818-9025** to verify end-to-end!

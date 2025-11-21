# Complete Call Testing Guide

**Date**: November 17, 2025
**Agent**: EPIC Sales Agent  
**Phone Number**: 17678189025
**Extension**: 3020
**SIP Domain**: billing.call.epic.dm

---

## ✅ Setup Complete

All prerequisites are in place:
- ✅ Phone number provisioned in FusionPBX
- ✅ Extension 3020 created
- ✅ SIP credentials configured
- ✅ Number assigned to agent
- ✅ Agent has SIP credentials in database

---

## 📞 QUICK TEST (Start Here!)

**The simplest way to verify everything works**:

### Step 1: Call the Number
```
Dial: +1 (767) 818-9025
From: Your mobile phone or any phone
```

### Step 2: Expected Behavior
- ✅ Call connects within 3-5 seconds
- ✅ Agent greeting plays
- ✅ Agent responds when you speak
- ✅ Two-way audio works
- ✅ Call quality is good

**If this works → SUCCESS! Migration complete!**

---

## 🔍 Detailed Verification

### Test 1: FusionPBX GUI Check
**URL**: https://billing.call.epic.dm

1. **Extension 3020**:
   - Navigate: Accounts → Extensions
   - Verify: Extension 3020 exists and is enabled

2. **DID 17678189025**:
   - Navigate: Dialplan → Destinations  
   - Verify: Number exists and is assigned

### Test 2: FreeSWITCH Registration
**Command** (on billing.call.epic.dm):
```bash
fs_cli -x "sofia status profile internal reg"
```

**Look for**: Extension 3020 (only shows if agent is running)

### Test 3: Inbound Call Test
**Action**: Call +1 (767) 818-9025

**Verify**:
- Call connects
- Agent answers
- Audio works both ways
- No echo or quality issues

### Test 4: Check Call Logs
**Command**:
```bash
fs_cli -x "show calls"
```

**Verify**: Active call shows when testing

---

## 🐛 Troubleshooting

### Call Doesn't Connect
1. Check FreeSWITCH logs:
   ```bash
   fs_cli -x "console loglevel 7"
   ```

2. Verify inbound route:
   ```bash
   fs_cli -x "show dialplan 17678189025"
   ```

### No Audio
- Check firewall: UDP ports 16384-32768
- Check agent is running
- Verify SIP credentials match

---

**Status**: Ready for Testing  
**Next**: Call +1 (767) 818-9025 and verify it works!

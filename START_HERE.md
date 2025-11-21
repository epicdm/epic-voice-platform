# START HERE - FreeSWITCH Migration Quick Start

**Date**: November 16, 2025
**Status**: ✅ **READY TO BEGIN**

---

## 🎯 What You Need to Do RIGHT NOW

### Step 1: Open the AI Prompt File

```bash
# On this server (LiveKit)
cat /opt/livekit1/FREESWITCH_AI_INVENTORY_PROMPT.md
```

Or view it here: `/opt/livekit1/FREESWITCH_AI_INVENTORY_PROMPT.md`

### Step 2: Copy the Prompt Section

**Start copying from line 10** (the section that starts with triple backticks)

The prompt begins with:
```
I am migrating from Magnus Billing to FreeSWITCH for VoIP call routing...
```

**End copying at line 215** (before "What to Do with the Response" section)

### Step 3: Connect to FreeSWITCH Server

**Server Details**:
- IP: 24.199.103.153
- Password: TAIOiEajqAl7H9vF4uXN
- User: root

**SSH Command**:
```bash
ssh root@24.199.103.153
# Password: TAIOiEajqAl7H9vF4uXN
```

### Step 4: Paste Prompt to FreeSWITCH AI

If you have an AI assistant on the FreeSWITCH server:
1. Open AI interface
2. Paste the entire prompt
3. Wait for response (30-60 minutes)

**OR** If running commands manually:

Run these commands and save output:
```bash
# 1. System info
hostname && uname -a && df -h

# 2. FreeSWITCH status
systemctl status freeswitch
fs_cli -x "sofia status"
fs_cli -x "show calls"

# 3. Configuration files
find /etc/freeswitch -name "*.xml" | grep -E "(dialplan|sip_profiles|directory)" | head -30
cat /etc/freeswitch/dialplan/public/*.xml

# 4. CDR check
ls -la /var/log/freeswitch/cdr-csv/ 2>/dev/null || echo "No CSV CDR"
cat /etc/freeswitch/autoload_configs/cdr*.xml 2>/dev/null

# 5. Network
netstat -tulpn | grep freeswitch
ping -c 3 134.199.197.42
```

### Step 5: Save the Response

Save the AI response or command output to a file:
```bash
# On this server (LiveKit)
nano /opt/livekit1/FREESWITCH_INVENTORY_REPORT.md

# Paste the FreeSWITCH response
# Save: Ctrl+O, Enter, Ctrl+X
```

### Step 6: Share with Me

Once you have the inventory report, I'll:
1. Analyze the FreeSWITCH configuration
2. Compare against Magnus functions
3. Identify gaps
4. Create specific configuration files
5. Guide you through migration

---

## 📋 What I've Already Done

### ✅ Analyzed Magnus Billing API
**File**: `/opt/livekit1/MAGNUS_TO_FREESWITCH_MIGRATION_CHECKLIST.md`

Found 9 core functions Magnus provides:
1. DID provisioning
2. **DID routing** (MOST CRITICAL - routes calls to LiveKit)
3. SIP account management
4. CDR capture
5. User management
6. Outbound calling
7. Billing
8. Offers/plans
9. Caller ID management

### ✅ Connected to FreeSWITCH Server
**File**: `/opt/livekit1/FREESWITCH_INTEGRATION_CONFIG.md`

Discovered:
- ✅ Server running (24.199.103.153)
- ✅ SIP profiles active (5060, 5080)
- ✅ Codecs compatible (PCMU, PCMA, G.722)
- ✅ Network accessible (60ms latency)
- ✅ Carriers configured (Vitelity, local trunk)

### ✅ Created Admin Settings Panel
**File**: `/opt/livekit1/ADMIN_SETTINGS_DEPLOYMENT_COMPLETE.md`

You can now switch SIP trunks via web UI:
- URL: http://localhost:3000/dashboard/admin/system-settings
- Tab: SIP Trunk
- Change `sip_domain` from `voice.epic.dm` to `24.199.103.153`
- Click "Save Changes"

### ✅ Built Migration Documentation

| File | Purpose |
|------|---------|
| `MAGNUS_TO_FREESWITCH_MIGRATION_CHECKLIST.md` | Complete function mapping |
| `FREESWITCH_AI_INVENTORY_PROMPT.md` | AI prompt (use this!) |
| `FREESWITCH_INTEGRATION_CONFIG.md` | Technical details |
| `FREESWITCH_INTEGRATION_GUIDE.md` | Step-by-step guide |
| `MIGRATION_READY.md` | Executive summary |
| `MIGRATION_WORKFLOW.md` | Visual workflow |
| `START_HERE.md` | This file |

---

## 🎯 Expected Outcome

After you run the inventory prompt, you'll know:

### Critical Questions Answered:
1. ✅ Can FreeSWITCH route +17678189426 to LiveKit?
2. ✅ How are DIDs currently stored? (Database? XML?)
3. ✅ Are CDRs being captured? Where?
4. ✅ What carriers are configured?
5. ✅ How to add new DID routes?

### Files We'll Create:
1. **FreeSWITCH dialplan route**: Route +17678189426 → LiveKit
2. **FreeSWITCH dialplan route**: Route +17678189267 → LiveKit
3. **CDR sync script**: FreeSWITCH → LiveKit database
4. **DID management API**: Automate DID provisioning

---

## 🚀 Migration Timeline

**Today (Step 1)**: Run inventory prompt (30-60 min)
**Tomorrow (Step 2)**: Gap analysis & configuration (2-3 hours)
**Day 3 (Step 3)**: Testing (2-3 hours)
**Day 4 (Step 4)**: Monitoring & go live (24 hours)

**Total**: 2-4 days from start to production

---

## 🔄 What Changes in Your System

### Before (Current - Magnus):
```
Inbound Call Flow:
PSTN → Magnus (voice.epic.dm) → LiveKit → AI Agent

Outbound Call Flow:
AI Agent → LiveKit → Magnus → PSTN

CDR:
Magnus database → Sync script → LiveKit database
```

### After (Target - FreeSWITCH):
```
Inbound Call Flow:
PSTN → FreeSWITCH (24.199.103.153) → LiveKit → AI Agent

Outbound Call Flow:
AI Agent → LiveKit → FreeSWITCH → PSTN

CDR:
FreeSWITCH database/CSV → Sync script → LiveKit database
```

### What Stays the Same:
- ✅ Phone numbers (+17678189426, +17678189267)
- ✅ LiveKit SIP domain (3m4yki5jezn.sip.livekit.cloud)
- ✅ AI agents and logic
- ✅ Frontend dashboard
- ✅ Call logs and analytics

### What Changes:
- ⚙️ SIP trunk provider (Magnus → FreeSWITCH)
- ⚙️ Admin setting: `sip_domain` (voice.epic.dm → 24.199.103.153)
- ⚙️ DID routing (Magnus API → FreeSWITCH dialplan)
- ⚙️ CDR source (Magnus API → FreeSWITCH)

---

## 📞 Phone Numbers to Test

**Primary Test DID**: +17678189426
**Secondary Test DID**: +17678189267

Both currently route via Magnus, will migrate to FreeSWITCH.

**Test Plan**:
1. Before migration: Call +17678189426, verify AI answers
2. After migration: Call +17678189426, verify AI still answers
3. Test outbound: AI calls you back, verify connection

---

## 🆘 If You Get Stuck

### Issue: Can't SSH to FreeSWITCH
```bash
# Try from LiveKit server
ssh root@24.199.103.153
# Password: TAIOiEajqAl7H9vF4uXN

# If connection refused, check firewall
ping 24.199.103.153
telnet 24.199.103.153 22
```

### Issue: FreeSWITCH Service Not Running
```bash
# On FreeSWITCH server
systemctl status freeswitch
systemctl start freeswitch
```

### Issue: Can't Find Configuration Files
```bash
# List all FreeSWITCH configs
find /etc/freeswitch -type f -name "*.xml" | head -50

# Check dialplan
ls -la /etc/freeswitch/dialplan/public/

# Check SIP profiles
ls -la /etc/freeswitch/sip_profiles/
```

### Issue: Don't Understand the Inventory Response
**Share it with me!** I'll analyze and explain.

---

## ✅ Checklist

Before you begin, verify:

- [ ] I can access FreeSWITCH server (SSH or AI)
- [ ] I have the inventory prompt file open
- [ ] I'm ready to copy-paste the prompt
- [ ] I have 30-60 minutes to wait for response
- [ ] I can save the response to a file

After inventory, you'll be ready to:

- [ ] Review gap analysis
- [ ] Approve configuration changes
- [ ] Test inbound calls
- [ ] Test outbound calls
- [ ] Go live with FreeSWITCH

---

## 🎯 The Single Most Important Question

**After running the inventory prompt, we need to answer**:

> "How are inbound calls to +17678189426 currently routed in FreeSWITCH?"

**Options**:
1. **Already routed to LiveKit** → Just need to verify and test
2. **Routed to different destination** → Need to change dialplan
3. **Not routed at all** → Need to create dialplan route

This will determine if we can migrate today or need configuration first.

---

## 📝 Quick Command Reference

**On FreeSWITCH Server**:
```bash
# Check SIP status
fs_cli -x "sofia status"

# Check active calls
fs_cli -x "show calls"

# Check dialplan routes
cat /etc/freeswitch/dialplan/public/*.xml

# Reload configuration
fs_cli -x "reloadxml"
```

**On LiveKit Server**:
```bash
# Check admin settings
curl 'http://localhost:3000/api/admin/settings?category=sip' | python3 -m json.tool

# Check phone numbers
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c "
SELECT \"phoneNumber\", \"livekitInboundTrunkId\"
FROM phone_number_pool
WHERE \"phoneNumber\" IN ('+17678189426', '+17678189267');
"
```

---

## 🚀 Ready to Start?

**Your next action**: Open `/opt/livekit1/FREESWITCH_AI_INVENTORY_PROMPT.md` and copy the prompt!

**Time required**: 30-60 minutes for AI response

**What you'll get**: Complete understanding of FreeSWITCH configuration

**After that**: We'll create the migration plan and execute

---

**STATUS**: ✅ Everything ready - waiting for you to run inventory prompt

**Last Updated**: November 16, 2025

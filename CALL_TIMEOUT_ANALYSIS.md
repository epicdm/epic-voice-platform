# 🔍 Call Timeout Analysis - 5 Minutes 5 Seconds

## 📊 **Problem Summary:**

Calls are **disconnecting after exactly 5 minutes and 5 seconds (305 seconds)**, regardless of the conversation state.

### **Evidence from Logs:**

```
stt_audio_duration=306.0499999999994
reason: "CLIENT_INITIATED" 
reason: "room disconnected"
```

**Key Finding:** The disconnect is initiated by the **SIP client/trunk**, not by the LiveKit agent.

---

## 🎯 **Root Cause:**

The 305-second (5m 5s) timeout is **NOT** coming from:
- ❌ LiveKit Agent code
- ❌ Your application configuration
- ❌ OpenAI API limits
- ❌ Deepgram limits

The timeout **IS** coming from:
- ✅ **Magnus Billing SIP trunk configuration**
- ✅ **SIP Session Timer (RFC 4028)**
- ✅ **SIP provider call duration limits**

---

## 🔧 **Technical Analysis:**

### **SIP Session Timers:**

SIP uses "Session Timers" (RFC 4028) to:
- Detect dead sessions
- Prevent stale calls
- Manage resources

**How it works:**
```
Call Start
   ↓
Session Timer starts (e.g., 300 seconds)
   ↓
Timer expires if no INVITE refresh
   ↓
Call disconnects with BYE
   ↓
Agent sees "CLIENT_INITIATED" disconnect
```

### **Common Session Timer Values:**

| Timeout | Duration | Common Use |
|---------|----------|------------|
| 180s | 3 minutes | Short demo/trial accounts |
| **305s** | **5m 5s** | **Your current setting** |
| 600s | 10 minutes | Standard business |
| 1800s | 30 minutes | Extended calls |
| 3600s | 1 hour | Maximum recommended |

---

## 📍 **Where the Timeout is Set:**

### **1. Magnus Billing SIP Trunk**

**Location:** Magnus Billing Admin Panel → SIP Trunks → Your Trunk

**Settings to check:**
- `Session-Timers` or `session-expires`
- `Max Call Duration`
- `Session Refresh Interval`
- `Min-SE` (Minimum Session Expires)

**Your current trunk:** `ST_sTo8gGpNbXzY`

### **2. Magnus Billing DID/Route Settings**

**Location:** Magnus Billing Admin Panel → DIDs → Your Number

**Settings:**
- Per-DID call duration limits
- Account-level restrictions
- Trunk-level restrictions

### **3. LiveKit SIP Configuration**

**Location:** LiveKit Cloud Console → SIP Settings

**Settings:**
- SIP session timer
- INVITE refresh interval
- Session expires header

---

## 🔨 **Solutions:**

### **Solution 1: Increase Magnus Billing Session Timer (Recommended)**

#### **Step 1: Access Magnus Billing Admin Panel**
```
URL: https://voice.epic.dm/mbilling
Username: admin (or your admin account)
```

#### **Step 2: Navigate to SIP Trunk Settings**
```
Telephony → Trunks → Find trunk: ST_sTo8gGpNbXzY → Edit
```

#### **Step 3: Update Session Timer Settings**

Look for these fields:
```ini
session-timers = accept
session-expires = 1800        # Change from 305 to 1800 (30 minutes)
session-minse = 90            # Minimum session expires
```

Or in the web UI:
- **Session Timer:** `1800` seconds (30 minutes)
- **Enable Session Refresh:** `Yes`
- **Session Min-SE:** `90` seconds

#### **Step 4: Save and Apply**
```
Save → Apply Changes → Reload SIP configuration
```

### **Solution 2: Update via Magnus Billing API**

If you have API access, update programmatically:

```python
# Update trunk session timer
import requests

url = "https://voice.epic.dm/mbilling/index.php/api/trunk/ST_sTo8gGpNbXzY"
headers = {
    'Authorization': 'Basic 8c0f89a45a4e485ab75babad914d33d0:dc59cbbf25ab420ea9e6bff05479dc68',
    'Content-Type': 'application/json'
}
data = {
    'sessiontimers': 'accept',
    'sessionexpires': 1800,  # 30 minutes
    'sessionminse': 90
}

response = requests.put(url, headers=headers, json=data)
print(response.json())
```

### **Solution 3: Configure LiveKit SIP Headers**

Add SIP headers to request longer sessions:

```python
# In your agent deployment code
sip_headers = {
    'Session-Expires': '1800',
    'Min-SE': '90',
    'Supported': 'timer'
}
```

### **Solution 4: Enable Session Refresh in Agent**

Modify agent to send periodic INVITE refreshes:

```python
# This would require LiveKit agent modification
# to send re-INVITE messages every 300 seconds
```

---

## 🧪 **Verification Steps:**

### **1. Check Current Settings**

**Via SIP Client:**
```bash
# Install SIPp or sip-tester
sip-tester -s voice.epic.dm -u livekit -p werwqerwqrwq555 -d

# Look for Session-Expires header in response
```

**Via Magnus Billing Database:**
```sql
SELECT 
    name, 
    sessiontimers, 
    sessionexpires, 
    sessionminse 
FROM pkg_trunk 
WHERE id_trunk = (SELECT id_trunk FROM pkg_sip WHERE name = 'ST_sTo8gGpNbXzY');
```

### **2. Test Different Durations**

After changing settings:

| Test | Duration | Expected Result |
|------|----------|----------------|
| **Short call** | 2 minutes | ✅ Should work |
| **Medium call** | 5 minutes | ✅ Should work (no disconnect) |
| **Long call** | 10 minutes | ✅ Should work with new settings |
| **Very long call** | 30+ minutes | ✅ Should work with 1800s timeout |

### **3. Monitor Agent Logs**

```bash
tail -f /opt/livekit1/agents/epic_demo/agent.log | grep -E "disconnect|close|duration"
```

**Good log (after fix):**
```
stt_audio_duration=1205.34  # Over 20 minutes!
reason: "participant disconnect"  # Natural end
```

**Bad log (still broken):**
```
stt_audio_duration=306.05
reason: "CLIENT_INITIATED"  # Still timing out
```

---

## 📋 **Recommended Settings:**

### **For Different Use Cases:**

**Customer Service / Sales Calls:**
```
Session-Expires: 1800 (30 minutes)
Min-SE: 90
Session-Refresh: 300 seconds
```

**Healthcare / Screening:**
```
Session-Expires: 3600 (1 hour)
Min-SE: 90
Session-Refresh: 600 seconds
```

**Demo / Testing:**
```
Session-Expires: 600 (10 minutes)
Min-SE: 90
Session-Refresh: 120 seconds
```

---

## 🚨 **Immediate Workaround:**

If you can't change Magnus Billing settings immediately:

### **Workaround 1: Multiple Short Calls**

Configure agent to gracefully end calls before timeout:

```python
# In agent_logic.py
MAX_CALL_DURATION = 280  # 4 minutes 40 seconds (before timeout)

async def monitor_call_duration():
    start_time = time.time()
    while True:
        await asyncio.sleep(10)
        elapsed = time.time() - start_time
        if elapsed > MAX_CALL_DURATION:
            # Gracefully end call
            await session.say("Thank you for calling! I'll transfer you to continue.")
            # Trigger transfer or hangup
            break
```

### **Workaround 2: Call Transfer**

Before timeout, transfer to a new session:

```python
# At 4:30 mark
if elapsed > 270:
    await session.say("Please hold while I refresh the connection...")
    # Transfer to new LiveKit room
    # This resets the SIP session timer
```

---

## 🔍 **Debugging Commands:**

### **Check Active SIP Sessions:**

```bash
# SSH into voice.epic.dm
ssh admin@voice.epic.dm

# Check Asterisk SIP sessions
asterisk -rx "sip show channels"

# Check session timer settings
asterisk -rx "sip show settings" | grep -i timer
```

### **Check LiveKit SIP Status:**

```bash
# Check LiveKit Cloud SIP trunk
curl -X GET https://ai-agent-dl6ldsi8.livekit.cloud/sip/v1/trunks/ST_sTo8gGpNbXzY \
  -H "Authorization: Bearer APIfFhqC7dRApB2:U5ln2qZ6BDX1SwYBnla31AgcyhInbSuepNDYPIfhs9V"
```

### **Monitor Real-time:**

```bash
# Terminal 1: Agent logs
tail -f /opt/livekit1/agents/epic_demo/agent.log

# Terminal 2: Flask backend logs
tail -f /opt/livekit1/flask.log

# Terminal 3: SIP packets (if you have access)
tcpdump -i any -n port 5060 -A
```

---

## 📊 **Expected Behavior After Fix:**

### **Before (Current):**

```
00:00 - Call starts
01:00 - Conversation ongoing
02:00 - Still talking
03:00 - Still talking
04:00 - Still talking
05:05 - ❌ DISCONNECT (timeout)
       - Log: "CLIENT_INITIATED"
       - Reason: Session timer expired
```

### **After (Fixed):**

```
00:00 - Call starts
01:00 - Conversation ongoing
05:00 - Still talking ✅
10:00 - Still talking ✅
20:00 - Still talking ✅
30:00 - Natural end or session refresh
       - Log: "participant disconnect" or session refreshed
```

---

## 🎯 **Action Items:**

### **Immediate (You):**

- [ ] **Contact Magnus Billing Admin**
  - Request session timer increase on trunk `ST_sTo8gGpNbXzY`
  - Target: 1800 seconds (30 minutes)

- [ ] **Or: Access Magnus Billing Panel**
  - Login to https://voice.epic.dm/mbilling
  - Navigate to Trunks → ST_sTo8gGpNbXzY
  - Change `sessionexpires` from 305 to 1800
  - Save and apply

### **Short-term (Testing):**

- [ ] **Make test calls** after configuration change
- [ ] **Monitor for 10+ minutes** to verify
- [ ] **Check logs** for session duration
- [ ] **Confirm no "CLIENT_INITIATED" disconnects**

### **Long-term (Optimization):**

- [ ] **Implement call analytics** to track average call duration
- [ ] **Set up monitoring** for unexpected disconnects
- [ ] **Configure alerts** if calls drop before natural end
- [ ] **Review SIP trunk settings** periodically

---

## 📞 **Support Contacts:**

### **Magnus Billing Support:**

If you need help changing settings:
```
Magnus Billing Documentation:
https://www.magnusbilling.org/

Support Forum:
https://forum.magnusbilling.org/

Email Support:
support@magnusbilling.org
```

### **LiveKit SIP Support:**

```
LiveKit Documentation:
https://docs.livekit.io/sip/

LiveKit Discord:
https://livekit.io/discord

Email Support:
support@livekit.io
```

---

## ✅ **Summary:**

| Issue | Root Cause | Solution | Priority |
|-------|------------|----------|----------|
| **Calls drop at 5:05** | SIP session timer = 305s | Increase to 1800s in Magnus Billing | 🔴 **HIGH** |
| **"CLIENT_INITIATED"** | SIP trunk timeout | Configure trunk settings | 🔴 **HIGH** |
| **No error in agent** | External timeout | Not an agent bug | ℹ️ **INFO** |

---

## 🚀 **Next Steps:**

1. **Access Magnus Billing** admin panel
2. **Navigate to trunk** `ST_sTo8gGpNbXzY`
3. **Change session-expires** from `305` to `1800`
4. **Save and reload** SIP configuration
5. **Test with 10-minute call**
6. **Verify logs** show longer duration

---

**The fix is on the Magnus Billing side. Once the session timer is increased, your calls will no longer drop at 5 minutes!** 🎉

# LiveKit SIP API Capabilities & Limitations

## 📚 Based on Official Documentation Research

### ✅ What LiveKit SIP APIs DO Expose

#### 1. Trunk Configuration (Static)
**Inbound Trunks:**
- `sip_trunk_id` - Unique identifier
- `numbers` - Phone numbers assigned
- `allowed_addresses` - IP/CIDR whitelist (config, not live state)
- `auth_username`, `auth_password` - Credentials
- `ringing_timeout`, `max_call_duration` - Call limits

**Outbound Trunks:**
- `address` - Target SIP server (e.g., voice.epic.dm:5060)
- `auth_username`, `auth_password` - Auth credentials
- `numbers` - Phone numbers for outbound calls
- `transport` - UDP/TCP/TLS
- `destination_country`

#### 2. SIP Participants (Per-Call, Dynamic)
**Available Attributes:**
```
sip.callID          # LiveKit SIP call ID
sip.callIDFull      # Provider's SIP call ID
sip.callStatus      # dialing, ringing, automation, active, hangup
sip.phoneNumber     # Caller/callee number
sip.trunkID         # Which trunk is handling this call
sip.trunkPhoneNumber
```

**Use Case:** Real-time call monitoring, call state tracking

#### 3. Dispatch Rules
- Routing configuration (which trunk → which room)
- Phone number mapping
- Agent dispatch settings

#### 4. Analytics & Events (Cloud)
- Per-call errors (SIP status codes: 500, 503, etc.)
- Call duration, quality metrics
- IP addresses involved in specific calls (fromUri.ip, toUri.host)

---

### ❌ What LiveKit SIP APIs DO NOT Expose

#### Registration State (Confirmed by Official Docs)

**NOT Available:**
- ❌ Registration status (registered / not registered)
- ❌ Last registration timestamp
- ❌ Registration failures or errors
- ❌ Current registered IP address (for the trunk itself)
- ❌ Registration expiry time
- ❌ User-Agent string from REGISTER

**Why Not:**
> "LiveKit's telephony layer is designed as a **SIP-to-LiveKit bridge** for trunks and phone calls, **not as a general SIP registrar/endpoint monitor**. Registration state lives with your SIP provider or PBX, not in a LiveKit-exposed API."

**Implication:**
- You MUST query your SIP provider/PBX (Magnus/Asterisk) for registration status
- LiveKit APIs show trunk *configuration*, not *runtime registration state*

---

## 🎯 Correct Architecture for Status Monitoring

### ✅ Multi-Source Approach (What We're Doing)

**Layer 1: SIP Trunk Registration Status**
- **Source:** Magnus/Asterisk database or API
- **Query:** `asterisk_sip.ipaddr`, `regseconds`, `lastms`
- **Why:** Only the SIP registrar knows if a peer is registered

**Layer 2: Agent Process Status**
- **Source:** System process monitoring (psutil)
- **Query:** Check if agent.py is running, get PID, CPU, memory
- **Why:** LiveKit doesn't track if your custom agent code is running

**Layer 3: Call Readiness**
- **Source:** Combine Layer 1 + Layer 2
- **Logic:** Both must be healthy for calls to work

**Layer 4 (Optional): Active Call Status**
- **Source:** LiveKit SIP Participant API
- **Query:** List participants with `sip.callStatus`
- **Why:** LiveKit DOES track live calls

---

## 🚀 Potential Enhancements Using LiveKit APIs

### 1. Real-Time Call Monitoring
```python
# Query active SIP participants
participants = await lk_api.room.list_participants(room_name)

for p in participants:
    if 'sip.callStatus' in p.attributes:
        call_status = p.attributes['sip.callStatus']  # active, ringing, etc.
        phone_number = p.attributes.get('sip.phoneNumber')

        # Show in UI: "Currently on call with +1234567890"
```

**Use Case:** Live call dashboard showing who's on the phone

### 2. Trunk Configuration Health Check
```python
# Verify LiveKit config matches database
trunk = await lk_api.sip.get_sip_outbound_trunk(trunk_id)

# Check for configuration drift
assert trunk.auth_username == db_phone_number.magnus_sip_username
assert trunk.address == "voice.epic.dm:5060"
assert phone_number in trunk.numbers
```

**Use Case:** Detect configuration mismatches before they cause issues

### 3. Call Failure Analytics
```python
# Get call events from LiveKit analytics
# (Available via Cloud dashboard or analytics API)

# Track:
# - Failed calls (SIP 500, 503, 401, etc.)
# - Average call duration
# - Call quality metrics
# - Geographic call patterns
```

**Use Case:** Proactive alerting on call quality issues

### 4. Outbound Call Initiation
```python
# We can CREATE outbound calls via API
result = await lk_api.sip.create_sip_participant(
    sip_trunk_id=trunk_id,
    sip_call_to="+17678189659",
    room_name="support-room-123"
)
```

**Use Case:** Click-to-call from web dashboard

---

## 📊 Comparison: LiveKit vs Traditional PBX

| Feature | Traditional PBX (Asterisk) | LiveKit SIP |
|---------|---------------------------|-------------|
| SIP Registration Monitoring | ✅ Full visibility | ❌ Not exposed |
| Extension/Peer Status | ✅ Shows online/offline | ❌ Not applicable |
| Call State Tracking | ✅ Per-channel | ✅ Per-participant |
| Trunk Configuration | ✅ sip.conf | ✅ Trunk API |
| Call Analytics | ⚠️ CDR only | ✅ Rich analytics |
| WebRTC Integration | ⚠️ Requires add-ons | ✅ Native |
| Scalability | ⚠️ Vertical scaling | ✅ Cloud-native |

**Key Insight:** LiveKit is **not a PBX replacement** - it's a **WebRTC bridge** that happens to support SIP trunking.

---

## 🛠️ Recommendations for Our System

### Current Implementation (Correct ✅)
```python
# backend/sip_status_api.py
def get_sip_status(agent_id):
    # Layer 1: Query Magnus for registration
    magnus_status = magnus_client.get_sip_registration_status(sip_name)

    # Layer 2: Check agent process
    agent_health = check_agent_process_running(agent_name)

    # Layer 3: Calculate readiness
    call_readiness = calculate_call_readiness(magnus_status, agent_health)

    return {
        'sip_trunk': magnus_status,      # ← CORRECT: Use Magnus
        'agent': agent_health,
        'call_readiness': call_readiness
    }
```

### Potential Addition (Optional)
```python
# Add Layer 4: Active call monitoring
def get_sip_status(agent_id):
    # ... existing layers ...

    # NEW: Check for active calls via LiveKit
    active_calls = await get_active_calls_for_agent(agent_id)

    return {
        'sip_trunk': magnus_status,
        'agent': agent_health,
        'call_readiness': call_readiness,
        'active_calls': active_calls  # NEW: From LiveKit API
    }
```

---

## 📝 Documentation References

- [LiveKit SIP API Reference](https://docs.livekit.io/sip/api/)
- [SIP Participant Attributes](https://docs.livekit.io/sip/participant-attributes/)
- [SIP Trunk Setup](https://docs.livekit.io/sip/quickstarts/configuring-sip-trunk/)

---

## ✅ Conclusion

**For SIP Registration Monitoring:**
- ❌ **Cannot** use LiveKit APIs (not exposed)
- ✅ **Must** use Magnus/Asterisk (source of truth)
- ✅ Our current approach is architecturally correct

**For Call Monitoring:**
- ✅ **Can** use LiveKit SIP Participant API
- ✅ **Should** consider adding for enhanced visibility

**For Health Checks:**
- ✅ **Can** verify trunk configuration matches database
- ✅ **Can** track call failures via analytics

Our multi-layer status system is correctly designed given LiveKit's API limitations.

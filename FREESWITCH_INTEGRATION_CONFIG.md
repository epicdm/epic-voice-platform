# FreeSWITCH Integration Configuration

**Date**: November 16, 2025
**FreeSWITCH Server**: 24.199.103.153 (debian-s-2vcpu-4gb-amd-sfo3-01)
**Status**: ✅ **RUNNING** - Ready for integration

---

## FreeSWITCH Server Details

### Network Configuration
- **External IP**: 24.199.103.153
- **Internal IPs**:
  - 10.48.0.5/16 (eth0)
  - 10.124.0.2/20 (eth1)
- **Location**: San Francisco (SFO3)

### SIP Profiles Running

#### 1. Internal Profile (Port 5060)
- **SIP-IP**: 24.199.103.153:5060
- **Transport**: UDP, TCP
- **WebSocket**: 5066 (ws), 7443 (wss)
- **Context**: public
- **Codecs**: G7221@32000h, G7221@16000h, G722, PCMU, PCMA
- **RTP-IP**: 24.199.103.153
- **DTMF**: RFC2833
- **Stats**:
  - Calls In: 162 (66 failed)
  - Calls Out: 85 (80 failed)
  - Registrations: 0

#### 2. External Profile (Port 5080)
- **SIP-IP**: 24.199.103.153:5080
- **Transport**: UDP, TCP
- **Context**: public
- **Codecs**: G7221@32000h, G7221@16000h, G722, PCMU, PCMA
- **RTP-IP**: 24.199.103.153
- **DTMF**: RFC2833
- **Stats**:
  - Calls In: 1 (1 failed)
  - Calls Out: 38 (14 failed)
  - Registrations: 0

### Active Gateways

#### Outbound Gateway
- **Name**: outbound_trunk
- **Proxy**: 23.186.240.10 (Vitelity/local trunk)
- **Registration**: Not required
- **Config Location**: `/etc/freeswitch/sip_profiles/internal/outbound_trunk.xml`

### Dialplan Routes

#### 1. Route 1767 Calls to Local Trunk (Priority 1)
**File**: `/etc/freeswitch/dialplan/public/100_outbound_1767.xml`
```xml
<extension name="outbound_1767_local">
  <condition field="destination_number" expression="^(1767\d{7})$">
    <action application="bridge" data="sofia/external/${destination_number}@23.186.240.10"/>
  </condition>
</extension>
```

#### 2. Route All Other Calls to Vitelity (Priority 2)
**File**: `/etc/freeswitch/dialplan/public/200_outbound_vitelity.xml`
```xml
<extension name="outbound_vitelity">
  <condition field="destination_number" expression="^(\+?1?\d{10,15})$">
    <action application="bridge" data="sofia/external/${destination_number}@outbound.vitelity.net"/>
  </condition>
</extension>
```

#### 3. Generic Outbound Route (Fallback)
**File**: `/etc/freeswitch/dialplan/public/001_outbound_route.xml`
```xml
<extension name="outbound_route">
  <condition field="destination_number" expression="^(\+?1?\d{10,15})$">
    <action application="bridge" data="sofia/internal/${destination_number}@23.186.240.10"/>
  </condition>
</extension>
```

### Supported Codecs
- ✅ **G.711 ulaw (PCMU)** - Recommended for LiveKit
- ✅ **G.711 alaw (PCMA)** - Alternative
- ✅ **G.722** - Wideband audio
- ✅ **G.729** - Low bandwidth
- ✅ **Speex**
- ✅ **GSM**
- ✅ **AMR**

---

## Integration Architecture Options

### Option 1: LiveKit as SIP Peer (Recommended)

```
PSTN/Carrier
    ↓
FreeSWITCH (24.199.103.153)
    ↓ (Route inbound DIDs to LiveKit)
LiveKit SIP Server (3m4yki5jezn.sip.livekit.cloud)
    ↓
AI Agents
```

**Setup**:
1. Add LiveKit as a gateway in FreeSWITCH
2. Route specific DIDs to LiveKit SIP domain
3. LiveKit handles AI agent logic
4. Outbound calls: LiveKit → FreeSWITCH → PSTN

### Option 2: Direct SIP Registration

```
PSTN/Carrier
    ↓
FreeSWITCH (24.199.103.153:5060)
    ↓ (SIP peer/registration)
LiveKit Backend (134.199.197.42)
    ↓
AI Agents
```

**Setup**:
1. Configure FreeSWITCH to accept SIP from LiveKit server
2. Add LiveKit backend IP to ACL
3. Create dialplan to route calls to LiveKit
4. No registration required (IP-based auth)

---

## Recommended Integration Steps

### Step 1: Add LiveKit Gateway to FreeSWITCH

Create `/etc/freeswitch/sip_profiles/internal/livekit.xml`:

```xml
<include>
  <gateway name="livekit">
    <param name="proxy" value="3m4yki5jezn.sip.livekit.cloud"/>
    <param name="register" value="false"/>
    <param name="caller-id-in-from" value="true"/>
    <param name="extension-in-contact" value="true"/>
    <param name="expire-seconds" value="600"/>
    <param name="retry-seconds" value="30"/>
  </gateway>
</include>
```

### Step 2: Create Inbound Route to LiveKit

Add `/etc/freeswitch/dialplan/public/300_livekit_inbound.xml`:

```xml
<include>
  <!-- Route specific DIDs to LiveKit AI agents -->
  <extension name="livekit_ai_agents">
    <condition field="destination_number" expression="^(17678189426|17678189267)$">
      <action application="set" data="call_direction=inbound"/>
      <action application="set" data="hangup_after_bridge=true"/>
      <action application="export" data="sip_h_X-Trunk=livekit"/>
      <action application="log" data="INFO Routing to LiveKit AI: ${destination_number}"/>
      <action application="bridge" data="sofia/internal/${destination_number}@3m4yki5jezn.sip.livekit.cloud"/>
    </condition>
  </extension>
</include>
```

### Step 3: Allow LiveKit Outbound Calls via FreeSWITCH

Add to dialplan to receive calls FROM LiveKit:

```xml
<include>
  <!-- Accept outbound calls from LiveKit -->
  <extension name="livekit_outbound">
    <condition field="${sip_from_host}" expression="3m4yki5jezn.sip.livekit.cloud">
      <action application="set" data="call_direction=outbound"/>
      <action application="log" data="INFO Outbound call from LiveKit to: ${destination_number}"/>
      <!-- Route to appropriate carrier based on number -->
      <action application="transfer" data="${destination_number} XML public"/>
    </condition>
  </extension>
</include>
```

### Step 4: Update LiveKit Admin Settings

**Current Settings** (Magnus):
- SIP Domain: `voice.epic.dm`
- SIP Outbound Trunk ID: `ST_sTo8gGpNbXzY`

**New Settings** (FreeSWITCH):
- SIP Domain: `24.199.103.153` or `sip.yourdomain.com`
- SIP Port: `5060` (internal profile)
- SIP Transport: `tcp` or `udp`
- No authentication required (IP-based routing)

### Step 5: Update Phone Numbers in Database

Point DIDs to use FreeSWITCH routing:

```sql
UPDATE phone_number_pool
SET
  sip_trunk_provider = 'freeswitch',
  sip_domain = '24.199.103.153',
  sip_port = 5060
WHERE phoneNumber IN ('+17678189426', '+17678189267');
```

---

## Testing Plan

### Phase 1: Inbound Call Test
1. Configure FreeSWITCH to route +17678189426 to LiveKit
2. Call +17678189426 from external number
3. Verify call reaches LiveKit AI agent
4. Check audio quality and latency

### Phase 2: Outbound Call Test
1. Trigger outbound call from LiveKit to test number
2. Verify FreeSWITCH receives call from LiveKit
3. Check FreeSWITCH routes to appropriate carrier (Vitelity or local)
4. Verify recipient receives call

### Phase 3: Bidirectional Test
1. Inbound call to AI agent
2. AI agent initiates outbound call during conversation
3. Verify both legs work correctly
4. Test transfer scenarios

---

## Network Connectivity Test

### From LiveKit Server to FreeSWITCH

Test if LiveKit backend can reach FreeSWITCH:

```bash
# From LiveKit server (134.199.197.42)
ping -c 3 24.199.103.153
telnet 24.199.103.153 5060
```

Expected: Connection should succeed

### From FreeSWITCH to LiveKit

Test if FreeSWITCH can reach LiveKit SIP:

```bash
# From FreeSWITCH server
dig 3m4yki5jezn.sip.livekit.cloud
telnet 3m4yki5jezn.sip.livekit.cloud 5060
```

---

## Configuration Files to Create/Modify

### On FreeSWITCH Server (24.199.103.153)

1. **Create LiveKit Gateway**:
   - File: `/etc/freeswitch/sip_profiles/internal/livekit.xml`
   - Purpose: Define LiveKit as outbound gateway

2. **Create Inbound Route**:
   - File: `/etc/freeswitch/dialplan/public/300_livekit_inbound.xml`
   - Purpose: Route specific DIDs to LiveKit

3. **Create Outbound Accept Rule**:
   - File: `/etc/freeswitch/dialplan/public/310_livekit_outbound.xml`
   - Purpose: Accept outbound calls from LiveKit

4. **Reload FreeSWITCH**:
   ```bash
   fs_cli -x "reloadxml"
   fs_cli -x "sofia profile internal rescan"
   ```

### On LiveKit Server (134.199.197.42)

1. **Update Admin Settings**:
   - Navigate to: http://localhost:3000/dashboard/admin/system-settings
   - Tab: SIP Trunk
   - Change:
     - `sip_domain`: `24.199.103.153`
     - `sip_transport`: `udp` or `tcp`
     - `sip_port`: `5060`

2. **Update Phone Numbers**:
   - Navigate to: http://localhost:3000/dashboard/phone-numbers
   - Update DIDs to use FreeSWITCH routing

---

## Security Considerations

### IP-based Authentication
FreeSWITCH is currently configured for IP-based auth (no registration required):
- ✅ Simpler setup
- ⚠️ Less secure without firewall rules
- **Recommendation**: Add LiveKit IP (134.199.197.42) to FreeSWITCH ACL

### Firewall Rules Needed

**On FreeSWITCH (24.199.103.153)**:
```bash
# Allow SIP from LiveKit
ufw allow from 134.199.197.42 to any port 5060 proto udp
ufw allow from 134.199.197.42 to any port 5060 proto tcp

# Allow RTP from LiveKit (range TBD based on FreeSWITCH config)
ufw allow from 134.199.197.42 to any port 16384:32768 proto udp
```

**On LiveKit (134.199.197.42)**:
```bash
# Allow SIP from FreeSWITCH
ufw allow from 24.199.103.153 to any port 5060 proto udp
ufw allow from 24.199.103.153 to any port 5060 proto tcp

# Allow RTP from FreeSWITCH
ufw allow from 24.199.103.153 to any port 50000:60000 proto udp
```

---

## Troubleshooting Commands

### Check FreeSWITCH Status
```bash
ssh root@24.199.103.153
fs_cli -x "sofia status"
fs_cli -x "sofia status profile internal"
fs_cli -x "show calls"
```

### Monitor Live Calls
```bash
fs_cli
# Then inside fs_cli:
console loglevel debug
sofia loglevel all 9
```

### Check Call Logs
```bash
tail -f /var/log/freeswitch/freeswitch.log
```

### Test SIP Connection
```bash
# From LiveKit server
sip-tester -t udp -h 24.199.103.153 -p 5060
```

---

## Next Actions

1. **Test Network Connectivity**: Verify LiveKit ↔ FreeSWITCH can communicate
2. **Create FreeSWITCH Gateway Config**: Add LiveKit as gateway
3. **Create Dialplan Routes**: Route DIDs to LiveKit
4. **Update Admin Settings**: Switch from Magnus to FreeSWITCH
5. **Test Inbound Calls**: Verify AI agents respond
6. **Test Outbound Calls**: Verify LiveKit can call out via FreeSWITCH
7. **Monitor & Optimize**: Check call quality, latency, success rates

---

## Summary

FreeSWITCH is ready for integration with the following configuration:
- **SIP Server**: 24.199.103.153:5060 (internal) or :5080 (external)
- **Codecs**: PCMU, PCMA, G.722 (compatible with LiveKit)
- **Current Carriers**: Vitelity (main), Local trunk at 23.186.240.10 (1767 numbers)
- **Dialplan**: Flexible routing based on DID patterns

The integration will allow LiveKit AI agents to handle inbound calls and place outbound calls through FreeSWITCH's carrier connections, replacing the Magnus trunk.

# Magnus to FreeSWITCH Migration - Visual Workflow

**Date**: November 16, 2025

---

## Current Architecture (Magnus)

```
┌─────────────────┐
│  PSTN/Carrier   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Magnus Billing  │  voice.epic.dm
│  SIP Server     │  Trunk: ST_sTo8gGpNbXzY
└────────┬────────┘
         │
         │ DID Routing
         ▼
┌─────────────────────────────┐
│      LiveKit SIP            │  3m4yki5jezn.sip.livekit.cloud
│  134.199.197.42             │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────┐
│   AI Agents     │
│  (Voice Bots)   │
└─────────────────┘

Magnus Functions:
✓ DID Provisioning (+17678189426, +17678189267)
✓ DID Routing (calls → LiveKit SIP)
✓ SIP Account Management
✓ CDR Capture
✓ Outbound Calling
✓ Billing & Cost Tracking
```

---

## Target Architecture (FreeSWITCH)

```
┌─────────────────┐
│  PSTN/Carrier   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│    FreeSWITCH Server        │  24.199.103.153:5060
│  debian-s-2vcpu-4gb         │  Transport: UDP/TCP
│  Codecs: PCMU, PCMA, G.722  │
└────────┬────────────────────┘
         │
         │ Dialplan Routing
         │ (XML Configuration)
         ▼
┌─────────────────────────────┐
│      LiveKit SIP            │  3m4yki5jezn.sip.livekit.cloud
│  134.199.197.42             │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────┐
│   AI Agents     │
│  (Voice Bots)   │
└─────────────────┘

FreeSWITCH Capabilities:
? DID Management (TBD - need inventory)
? DID Routing (TBD - need dialplan config)
? CDR Capture (TBD - need to verify module)
✓ Outbound Calling (Vitelity configured)
✓ Codecs (Compatible with LiveKit)
✓ Network (60ms latency, ports open)
```

---

## Migration Phases

### Phase 1: INVENTORY (NOW) ⏳

**Action**: Run AI prompt on FreeSWITCH server

```
┌────────────────────────────┐
│  You (Human)               │
│                            │
│  1. Open file:             │
│     FREESWITCH_AI_         │
│     INVENTORY_PROMPT.md    │
│                            │
│  2. Copy prompt            │
│                            │
│  3. Paste to FreeSWITCH    │
│     server AI              │
│                            │
│  4. Get inventory response │
└────────────────────────────┘
         │
         ▼
┌────────────────────────────┐
│  FreeSWITCH Server AI      │
│  24.199.103.153            │
│                            │
│  Gathers:                  │
│  - DID storage method      │
│  - Dialplan routes         │
│  - CDR configuration       │
│  - SIP profiles            │
│  - Database setup          │
└────────────────────────────┘
         │
         ▼
┌────────────────────────────┐
│  Inventory Report          │
│  (You save this)           │
│                            │
│  FREESWITCH_INVENTORY_     │
│  REPORT.md                 │
└────────────────────────────┘
```

**Output**: Complete understanding of FreeSWITCH capabilities

---

### Phase 2: GAP ANALYSIS (After Phase 1) 📊

**Action**: Compare Magnus vs FreeSWITCH

```
┌─────────────────────────────┐
│  Magnus Functions           │
│  (What we have now)         │
│                             │
│  File:                      │
│  MAGNUS_TO_FREESWITCH_      │
│  MIGRATION_CHECKLIST.md     │
└──────────┬──────────────────┘
           │
           ▼
      ┌────────┐
      │ COMPARE│
      └────────┘
           │
           ▼
┌─────────────────────────────┐
│  FreeSWITCH Capabilities    │
│  (What FreeSWITCH has)      │
│                             │
│  File:                      │
│  FREESWITCH_INVENTORY_      │
│  REPORT.md                  │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Gap Analysis               │
│                             │
│  ✅ Already configured      │
│  ⚠️  Needs configuration    │
│  ❌ Not available           │
│                             │
│  File: GAP_ANALYSIS.md      │
└─────────────────────────────┘
```

**Output**: List of what needs to be configured

---

### Phase 3: CONFIGURATION (After Phase 2) ⚙️

**Action**: Create FreeSWITCH configuration files

```
Critical Configurations:

1. DID Routing to LiveKit
   ┌──────────────────────────────┐
   │ /etc/freeswitch/dialplan/    │
   │   public/                    │
   │     300_livekit_inbound.xml  │
   │                              │
   │ <extension name="livekit">   │
   │   <condition                 │
   │     field="destination_      │
   │       number"                │
   │     expression="^17678189426$"│
   │   >                          │
   │     <action application=     │
   │       "bridge"               │
   │       data="sofia/internal/  │
   │         ${destination_number}│
   │         @3m4yki5jezn.sip.    │
   │         livekit.cloud"       │
   │     />                       │
   │   </condition>               │
   │ </extension>                 │
   └──────────────────────────────┘

2. LiveKit Gateway
   ┌──────────────────────────────┐
   │ /etc/freeswitch/             │
   │   sip_profiles/internal/     │
   │     livekit.xml              │
   │                              │
   │ <gateway name="livekit">     │
   │   <param name="proxy"        │
   │     value="3m4yki5jezn.sip.  │
   │       livekit.cloud"/>       │
   │   <param name="register"     │
   │     value="false"/>          │
   │ </gateway>                   │
   └──────────────────────────────┘

3. CDR Capture
   ┌──────────────────────────────┐
   │ /etc/freeswitch/             │
   │   autoload_configs/          │
   │     cdr_pg_csv.conf.xml      │
   │                              │
   │ <configuration>              │
   │   <param name="db-host"      │
   │     value="localhost"/>      │
   │   <param name="db-name"      │
   │     value="freeswitch_cdr"/> │
   │   <param name="table"        │
   │     value="cdr"/>            │
   │ </configuration>             │
   └──────────────────────────────┘

4. Reload FreeSWITCH
   ┌──────────────────────────────┐
   │ fs_cli -x "reloadxml"        │
   │ fs_cli -x "sofia profile     │
   │   internal rescan"           │
   └──────────────────────────────┘
```

**Output**: FreeSWITCH configured to route calls to LiveKit

---

### Phase 4: LIVEKIT SETTINGS UPDATE ⚙️

**Action**: Update admin settings to use FreeSWITCH

```
┌────────────────────────────────┐
│  Admin Settings Panel          │
│  http://localhost:3000/        │
│    dashboard/admin/            │
│    system-settings             │
│                                │
│  SIP Trunk Tab:                │
│                                │
│  ┌──────────────────────────┐ │
│  │ sip_domain               │ │
│  │ [24.199.103.153      ]   │ │
│  │                          │ │
│  │ sip_port                 │ │
│  │ [5060               ]    │ │
│  │                          │ │
│  │ sip_transport            │ │
│  │ [udp ▼]                  │ │
│  │                          │ │
│  │ [Test Connection]        │ │
│  │ [Save Changes]           │ │
│  └──────────────────────────┘ │
└────────────────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│  Database Update               │
│  system_settings table         │
│                                │
│  UPDATE system_settings        │
│  SET value='24.199.103.153'    │
│  WHERE key='sip_domain'        │
└────────────────────────────────┘
```

**Output**: LiveKit configured to use FreeSWITCH for SIP

---

### Phase 5: TESTING 🧪

**Action**: Test call flows

```
Test 1: INBOUND CALL
┌──────────────┐
│ Your Phone   │
│              │
│ Dial:        │
│ +17678189426 │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ PSTN Network │
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│ FreeSWITCH          │
│ 24.199.103.153:5060 │
│                     │
│ Dialplan matches:   │
│ 17678189426         │
│                     │
│ Routes to:          │
│ 3m4yki5jezn.sip.    │
│   livekit.cloud     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ LiveKit SIP         │
│ 134.199.197.42      │
│                     │
│ Creates room:       │
│ sip-7678189426__xxx │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ AI Agent (tst0002)  │
│                     │
│ Loads config from   │
│ database by phone # │
│                     │
│ Agent responds:     │
│ "Hello, how can I   │
│  help you?"         │
└─────────────────────┘

✅ Success Criteria:
- Call reaches AI agent
- Agent greets caller
- Audio quality good
- CDR captured


Test 2: OUTBOUND CALL
┌─────────────────────┐
│ AI Agent            │
│                     │
│ Tool call:          │
│ make_outbound_call( │
│   to="+15551234567" │
│ )                   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ LiveKit Backend     │
│ Creates SIP         │
│ participant         │
│                     │
│ SIP URI:            │
│ sip:15551234567@    │
│   24.199.103.153    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ FreeSWITCH          │
│ 24.199.103.153:5060 │
│                     │
│ Accepts call from   │
│ LiveKit IP          │
│                     │
│ Routes to Vitelity  │
│ (outbound carrier)  │
└──────┬──────────────┘
       │
       ▼
┌──────────────┐
│ PSTN Network │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Recipient    │
│ Phone        │
│              │
│ Receives call│
└──────────────┘

✅ Success Criteria:
- Call connects
- Recipient answers
- Audio quality good
- CDR captured
```

**Output**: Verified call flows work correctly

---

### Phase 6: CDR SYNC 📊

**Action**: Sync FreeSWITCH CDRs to LiveKit database

```
┌─────────────────────────────┐
│ FreeSWITCH CDR              │
│ /var/log/freeswitch/        │
│   cdr-csv/*.csv             │
│                             │
│ OR                          │
│                             │
│ PostgreSQL: freeswitch_cdr  │
│   table: cdr                │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ CDR Sync Script             │
│ (Python cron job)           │
│                             │
│ Reads FreeSWITCH CDRs       │
│ Maps fields:                │
│   caller → from             │
│   called → to               │
│   duration → duration       │
│   billsec → billable_seconds│
│                             │
│ Inserts into LiveKit DB     │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ LiveKit Database            │
│ epic_voice_db               │
│   table: call_logs          │
│                             │
│ Used for:                   │
│ - Call history UI           │
│ - Billing/invoices          │
│ - Analytics                 │
└─────────────────────────────┘
```

**Output**: All calls visible in LiveKit dashboard

---

### Phase 7: MONITORING 📈

**Action**: Monitor for 24-48 hours

```
Metrics to Watch:
┌────────────────────────────┐
│ Call Success Rate          │
│ Target: >95%               │
│                            │
│ ████████████████░░ 98%     │
└────────────────────────────┘

┌────────────────────────────┐
│ Audio Quality              │
│ Target: <200ms latency     │
│                            │
│ Avg: 65ms ✅               │
└────────────────────────────┘

┌────────────────────────────┐
│ CDR Capture Rate           │
│ Target: 100%               │
│                            │
│ ████████████████████ 100%  │
└────────────────────────────┘

┌────────────────────────────┐
│ SIP Errors                 │
│ Target: 0                  │
│                            │
│ Count: 0 ✅                │
└────────────────────────────┘
```

**Output**: Stable, production-ready system

---

## Data Migration

### Phone Numbers (DIDs)

**Current (Magnus)**:
```sql
-- Magnus stores DIDs in their database
-- We reference them in phone_number_pool

SELECT "phoneNumber", "livekitInboundTrunkId"
FROM phone_number_pool
WHERE "phoneNumber" IN ('+17678189426', '+17678189267');

-- phoneNumber       | livekitInboundTrunkId
-- +17678189426      | ST_sTo8gGpNbXzY
-- +17678189267      | ST_sTo8gGpNbXzY
```

**New (FreeSWITCH)**:
```sql
-- Option 1: Keep in phone_number_pool, add FreeSWITCH routing
UPDATE phone_number_pool
SET
  sip_trunk_provider = 'freeswitch',
  sip_domain = '24.199.103.153',
  sip_port = 5060
WHERE "phoneNumber" IN ('+17678189426', '+17678189267');

-- Option 2: Create FreeSWITCH DID table
CREATE TABLE freeswitch_dids (
  id SERIAL PRIMARY KEY,
  did VARCHAR(20) UNIQUE NOT NULL,
  livekit_phone_number_id INTEGER REFERENCES phone_number_pool(id),
  dialplan_file VARCHAR(255),
  activated BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Rollback Plan

If migration fails, revert in 5 minutes:

```
Step 1: Update Admin Settings
┌──────────────────────────────┐
│ sip_domain: voice.epic.dm    │
│ (change back from            │
│  24.199.103.153)             │
└──────────────────────────────┘

Step 2: Verify Calls Work
┌──────────────────────────────┐
│ Test inbound call to         │
│ +17678189426                 │
│                              │
│ Should route via Magnus      │
└──────────────────────────────┘

Step 3: Monitor
┌──────────────────────────────┐
│ Check call logs              │
│ Verify CDRs captured         │
└──────────────────────────────┘

No code changes needed - just admin panel update!
```

---

## Summary

**Current Status**: ✅ Ready for Phase 1 (Inventory)

**Next Action**: YOU run AI prompt on FreeSWITCH server

**Files Ready**:
- ✅ Magnus function checklist
- ✅ FreeSWITCH inventory prompt
- ✅ Integration guide
- ✅ Configuration examples

**Waiting For**:
- ⏳ FreeSWITCH inventory report from you

**After Inventory**:
- Gap analysis
- Configuration files
- Testing
- Go live

**Timeline**: 2-4 days total

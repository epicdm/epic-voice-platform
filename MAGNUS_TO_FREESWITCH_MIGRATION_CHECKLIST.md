# Magnus to FreeSWITCH Migration - Complete Checklist

**Date**: November 16, 2025
**Purpose**: Comprehensive inventory of all Magnus Billing functions to replicate on FreeSWITCH

---

## Executive Summary

Magnus Billing currently provides:
1. **DID/Phone Number Management** - Provisioning, assignment, routing
2. **SIP Account Management** - User accounts, credentials, caller ID
3. **Call Routing (DID Destinations)** - Inbound call routing to LiveKit
4. **CDR/Call Records** - Call Detail Records for billing and analytics
5. **User/Account Management** - Customer accounts with plans and offers
6. **Outbound Trunk** - SIP trunk for outbound calling

---

## Part 1: Phone Number (DID) Management

### What Magnus Does:

#### 1.1 DID Provisioning
```python
# Magnus API: POST /api/did
{
    "did": "17678189426",
    "country": "Dominica",
    "activated": 1
}
```

**FreeSWITCH Equivalent Needed**:
- [ ] **DID Database Table** (or flat file config)
  - Table structure:
    - `id` - Unique ID
    - `did` - Phone number (E.164 format)
    - `country` - Country name
    - `activated` - Boolean (1/0)
    - `created_at` - Timestamp
    - `updated_at` - Timestamp

- [ ] **DID Management Interface** (CLI/API/Web)
  - Add DID manually or via API
  - List all DIDs
  - Activate/Deactivate DIDs
  - Delete DIDs

#### 1.2 DID Lookup
```python
# Magnus API: GET /api/did?filter[did]=17678189426
```

**FreeSWITCH Equivalent Needed**:
- [ ] **DID Lookup Function**
  - Query: `SELECT * FROM dids WHERE did = '17678189426'`
  - OR: File-based lookup (e.g., `/etc/freeswitch/dids/17678189426.xml`)

---

## Part 2: DID Routing (Call Destinations)

### What Magnus Does:

#### 2.1 DID Destination Configuration
```python
# Magnus API: POST /api/diddestination
{
    "id_user": "123",
    "id_did": "456",
    "voip_call": 1,
    "id_sip": "789",
    "destination": "SIP/username",
    "priority": 1
}
```

**This is THE MOST CRITICAL FUNCTION** - Routes inbound calls to LiveKit

**FreeSWITCH Equivalent Needed**:
- [ ] **Dialplan Configuration** for Each DID

**Option A: Database-Driven Dialplan**:
```sql
CREATE TABLE did_routing (
    id VARCHAR(36) PRIMARY KEY,
    did VARCHAR(20) UNIQUE NOT NULL,
    destination_type VARCHAR(20),  -- 'livekit', 'sip', 'external'
    destination_value TEXT,        -- 'SIP/username@livekit.cloud' or IP
    priority INT DEFAULT 1,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Insert routing rules
INSERT INTO did_routing (did, destination_type, destination_value)
VALUES
  ('17678189426', 'livekit', '3m4yki5jezn.sip.livekit.cloud'),
  ('17678189267', 'livekit', '3m4yki5jezn.sip.livekit.cloud');
```

**Option B: XML Dialplan Files** (Simpler):
```xml
<!-- /etc/freeswitch/dialplan/public/300_livekit_17678189426.xml -->
<include>
  <extension name="route_17678189426_to_livekit">
    <condition field="destination_number" expression="^(\+?1?7678189426)$">
      <action application="log" data="INFO Routing ${destination_number} to LiveKit"/>
      <action application="bridge" data="sofia/internal/${destination_number}@3m4yki5jezn.sip.livekit.cloud"/>
    </condition>
  </extension>
</include>
```

**CHECKLIST**:
- [ ] Create routing table OR dialplan files for each DID
- [ ] Map DID → LiveKit SIP domain
- [ ] Test inbound call routing
- [ ] Create API/script to add new routes dynamically

---

## Part 3: SIP Account Management

### What Magnus Does:

#### 3.1 SIP Account Creation (Auto-created with User)
```python
# When user is created, Magnus auto-creates SIP account
# Fields:
{
    "id_user": "123",
    "name": "username",  # SIP username
    "secret": "password",  # SIP password
    "callerid": "17678189426",
    "host": "dynamic",
    "allow": "opus,g729,gsm,alaw,ulaw",
    "voicemail": 1,
    "voicemail_email": "user@example.com",
    "voicemail_password": "9426"  # Last 4 of DID
}
```

#### 3.2 SIP Account Updates
```python
# Magnus API: PUT /api/sip/{sip_id}
{
    "callerid": "17678189426",
    "allow": "opus,g729,gsm,alaw,ulaw"
}
```

**FreeSWITCH Equivalent Needed**:

**For LiveKit Integration: NOT NEEDED**
- LiveKit does NOT register as a SIP user to FreeSWITCH
- LiveKit uses IP-based SIP peering (no username/password)
- DIDs route directly to LiveKit SIP domain

**For Other Users (if needed)**:
- [ ] **SIP User Directory** (if you want to create SIP accounts)
  - Location: `/etc/freeswitch/directory/default/`
  - Example: `/etc/freeswitch/directory/default/1000.xml`
  ```xml
  <user id="1000">
    <params>
      <param name="password" value="secretpassword"/>
      <param name="vm-password" value="1000"/>
    </params>
    <variables>
      <variable name="toll_allow" value="domestic,international"/>
      <variable name="accountcode" value="1000"/>
      <variable name="user_context" value="default"/>
      <variable name="effective_caller_id_name" value="John Doe"/>
      <variable name="effective_caller_id_number" value="17678189426"/>
    </variables>
  </user>
  ```

**CHECKLIST** (Only if creating FreeSWITCH users):
- [ ] SIP user directory structure
- [ ] User creation script/API
- [ ] Password management
- [ ] Caller ID assignment
- [ ] Voicemail configuration (if needed)

---

## Part 4: Call Detail Records (CDR)

### What Magnus Does:

#### 4.1 CDR Storage
Magnus stores all call records in MySQL database:
```sql
-- Magnus CDR Table Structure
CREATE TABLE pkg_cdr (
    id BIGINT PRIMARY KEY,
    uniqueid VARCHAR(50),
    accountcode VARCHAR(20),
    src VARCHAR(80),        -- Caller number
    dst VARCHAR(80),        -- Called number
    dcontext VARCHAR(80),
    clid VARCHAR(80),
    channel VARCHAR(80),
    dstchannel VARCHAR(80),
    lastapp VARCHAR(80),
    lastdata VARCHAR(80),
    startdate DATETIME,     -- Call start
    answerdate DATETIME,    -- Call answered
    enddate DATETIME,       -- Call ended
    duration INT,           -- Total seconds
    billsec INT,            -- Billable seconds
    disposition VARCHAR(45), -- ANSWERED, NO ANSWER, BUSY, FAILED
    amaflags INT,
    userfield VARCHAR(255),
    did VARCHAR(90),
    buycost DECIMAL(15,5),  -- Cost to provider
    sellcost DECIMAL(15,5)  -- Charge to customer
);
```

#### 4.2 CDR API Access
```python
# Magnus API: GET /api/cdr
# Filters: startdate, enddate, accountcode, did, disposition
```

**FreeSWITCH Equivalent**:

FreeSWITCH has built-in CDR support to multiple backends:

**Option A: CSV Files** (Simplest):
```xml
<!-- /etc/freeswitch/autoload_configs/cdr_csv.conf.xml -->
<configuration name="cdr_csv.conf" description="CDR CSV">
  <settings>
    <param name="default-template" value="example"/>
    <param name="rotate-on-hup" value="true"/>
    <param name="legs" value="a"/>
  </settings>
  <templates>
    <template name="example">
      "${caller_id_name}","${caller_id_number}","${destination_number}","${start_stamp}","${answer_stamp}","${end_stamp}","${duration}","${billsec}","${hangup_cause}","${uuid}"
    </template>
  </templates>
</configuration>
```
**Output**: `/var/log/freeswitch/cdr-csv/Master.csv`

**Option B: Database (PostgreSQL/MySQL)** (Recommended):
```xml
<!-- /etc/freeswitch/autoload_configs/cdr_pg_csv.conf.xml -->
<configuration name="cdr_pg_csv.conf" description="CDR PostgreSQL">
  <settings>
    <param name="db-info" value="host=localhost dbname=freeswitch user=postgres password=yourpassword"/>
    <param name="db-table" value="cdr"/>
  </settings>
</configuration>
```

**FreeSWITCH Auto-Creates Table**:
```sql
CREATE TABLE cdr (
    uuid VARCHAR(255),
    caller_id_name VARCHAR(255),
    caller_id_number VARCHAR(255),
    destination_number VARCHAR(255),
    context VARCHAR(255),
    start_stamp TIMESTAMP,
    answer_stamp TIMESTAMP,
    end_stamp TIMESTAMP,
    duration INTEGER,
    billsec INTEGER,
    hangup_cause VARCHAR(255),
    accountcode VARCHAR(255),
    read_codec VARCHAR(255),
    write_codec VARCHAR(255)
);
```

**CHECKLIST**:
- [ ] **Enable CDR Module** in FreeSWITCH
  - CSV: `/etc/freeswitch/autoload_configs/modules.conf.xml` → `<load module="mod_cdr_csv"/>`
  - PostgreSQL: `<load module="mod_cdr_pg_csv"/>`
  - SQLite: `<load module="mod_cdr_sqlite"/>`

- [ ] **Configure CDR Backend**
  - Database connection string
  - Table/file location
  - Fields to capture

- [ ] **CDR Sync Script** (for LiveKit database integration)
  - Periodically copy CDRs from FreeSWITCH to LiveKit database
  - Map FreeSWITCH CDR fields to LiveKit `call_logs` table
  - Script: `/opt/livekit1/integrations/freeswitch_cdr_sync.py`

- [ ] **CDR API** (Optional)
  - REST API to query FreeSWITCH CDRs
  - Or direct database query

---

## Part 5: User/Account Management

### What Magnus Does:

#### 5.1 User Creation
```python
# Magnus API: POST /api/user
{
    "username": "john_17678189426",
    "password": "abc123",
    "firstname": "John",
    "lastname": "Doe",
    "email": "john@example.com",
    "phone": "17678189426",
    "id_plan": 34,      # Billing plan
    "id_group": 3,      # User group
    "typepaid": 0,      # Prepaid/Postpaid
    "id_offer": 7       # Special offer
}
```

**FreeSWITCH Equivalent**:

**For LiveKit Integration: NOT NEEDED**
- User management stays in LiveKit database
- FreeSWITCH only routes calls, doesn't manage users

**For Billing/Tracking (Optional)**:
- [ ] **Link FreeSWITCH CDRs to LiveKit Users**
  - Add `accountcode` to CDR (maps to LiveKit user_id)
  - Set in dialplan:
  ```xml
  <action application="set" data="accountcode=${user_id}"/>
  ```

**CHECKLIST**:
- [ ] Map LiveKit user_id to FreeSWITCH accountcode
- [ ] Set accountcode in dialplan for tracking
- [ ] CDR sync includes user mapping

---

## Part 6: Outbound Calling

### What Magnus Does:

#### 6.1 Outbound SIP Trunk
Magnus provides SIP trunk for outbound calls:
- **SIP Domain**: `voice.epic.dm`
- **Authentication**: IP-based or username/password
- **Route**: LiveKit → Magnus → Carrier

#### 6.2 Outbound Routing
LiveKit sends calls to Magnus:
```
sip:+15551234567@voice.epic.dm
```

**FreeSWITCH Equivalent**:

**Already Configured!** Your FreeSWITCH has outbound routes:
- 1767 numbers → Local trunk (23.186.240.10)
- All others → Vitelity (outbound.vitelity.net)

**LiveKit Integration**:
- [ ] **Point LiveKit to FreeSWITCH for Outbound**
  - Update LiveKit outbound SIP URI: `sip:${dest}@24.199.103.153:5060`
  - FreeSWITCH receives call from LiveKit
  - FreeSWITCH routes to appropriate carrier (Vitelity/local)

- [ ] **Accept Calls from LiveKit IP**
  - Add to FreeSWITCH ACL: `134.199.197.42`
  - Or dialplan condition: `${sip_network_ip} == 134.199.197.42`

**CHECKLIST**:
- [ ] Configure FreeSWITCH to accept calls from LiveKit IP
- [ ] Test outbound call flow: LiveKit → FreeSWITCH → Carrier
- [ ] Verify caller ID passthrough
- [ ] Update LiveKit admin settings (sip_domain = 24.199.103.153)

---

## Part 7: Billing & Cost Tracking

### What Magnus Does:

#### 7.1 Call Cost Calculation
```sql
-- Magnus calculates costs per call
buycost DECIMAL(15,5),   -- What Magnus pays carrier
sellcost DECIMAL(15,5)   -- What customer is charged
```

#### 7.2 Rate Tables
Magnus has rate tables for different destinations:
- Domestic: $0.01/min
- International: $0.05/min
- Premium: $0.10/min

**FreeSWITCH Equivalent**:

**NOT Built-in** - FreeSWITCH does not handle billing

**Options**:
1. **Keep billing in LiveKit database** (Recommended)
   - Sync CDRs to LiveKit
   - Calculate costs in LiveKit backend
   - Store in `call_logs` table

2. **External Billing System**
   - Use A2Billing (works with FreeSWITCH)
   - Use custom Python/Node.js billing service

**CHECKLIST**:
- [ ] **CDR Sync to LiveKit** for billing
- [ ] **Cost calculation** in LiveKit backend
- [ ] **Rate table** in LiveKit database
- [ ] **Monthly usage reports** per user

---

## Part 8: Offers & Plans (Optional)

### What Magnus Does:

#### 8.1 User Plans
```python
# Assign user to billing plan
id_plan: 34  # e.g., "$10/month, 100 mins included"
```

#### 8.2 Special Offers
```python
# Assign special offer to user
id_offer: 7  # e.g., "First month free"
```

**FreeSWITCH Equivalent**:

**NOT NEEDED for call routing** - This is business logic

**Keep in LiveKit database**:
- [ ] User subscription plans
- [ ] Usage limits
- [ ] Special promotions

---

## Part 9: API Endpoints (Summary)

### Magnus API Endpoints Used:

| Endpoint | Method | Purpose | FreeSWITCH Equivalent |
|----------|--------|---------|----------------------|
| `/api/user` | POST | Create user | LiveKit database |
| `/api/user/{id}` | GET | Get user info | LiveKit database |
| `/api/user/{id}` | PUT | Update user | LiveKit database |
| `/api/did` | POST | Create DID | DID table/config |
| `/api/did` | GET | List DIDs | DID table/config |
| `/api/diddestination` | POST | Route DID | Dialplan XML |
| `/api/sip/{id}` | PUT | Update SIP account | Not needed (LiveKit uses IP peering) |
| `/api/cdr` | GET | Fetch CDRs | CDR database/CSV |
| `/api/offeruse` | POST | Assign offer | LiveKit database |

---

## Part 10: Migration Priority Order

### Phase 1: Critical (Must Have)
1. ✅ **FreeSWITCH Network Connectivity** - Tested, working
2. ⏳ **DID Routing Configuration** - Create dialplan routes
3. ⏳ **Inbound Call Test** - Verify calls reach LiveKit
4. ⏳ **Outbound Call Configuration** - FreeSWITCH accepts from LiveKit
5. ⏳ **Outbound Call Test** - Verify LiveKit → FS → Carrier

### Phase 2: Important (Should Have)
6. ⏳ **CDR Storage** - Enable CDR module in FreeSWITCH
7. ⏳ **CDR Sync Script** - Copy CDRs to LiveKit database
8. ⏳ **Cost Tracking** - Calculate costs in LiveKit

### Phase 3: Optional (Nice to Have)
9. ⏳ **DID Management UI** - Web interface to add/remove DIDs
10. ⏳ **Real-time Monitoring** - Call statistics dashboard
11. ⏳ **Firewall Rules** - Restrict SIP to LiveKit IP

---

## FreeSWITCH Inventory Questions

Use this checklist to prompt the AI on the FreeSWITCH server:

### A. DID Management
- [ ] **How are DIDs currently stored?** (Database table? Config files?)
- [ ] **What DIDs are currently active?** (List all)
- [ ] **How do you add a new DID?** (Manual config? API?)
- [ ] **Can you query DID by number?** (Search function?)

### B. Call Routing
- [ ] **How are inbound calls routed?** (Dialplan location?)
- [ ] **What is the dialplan structure?** (XML files in `/etc/freeswitch/dialplan/`)
- [ ] **Can routing be changed dynamically?** (API or manual edit?)
- [ ] **How do you route a DID to external SIP?** (Bridge command?)

### C. SIP Peering
- [ ] **How do you accept SIP from external IP?** (ACL? Dialplan condition?)
- [ ] **What SIP profiles are configured?** (Internal/External)
- [ ] **Can FreeSWITCH receive calls without registration?** (IP-based auth?)
- [ ] **How do you add a SIP gateway?** (Gateway XML config?)

### D. CDR Management
- [ ] **Is CDR module enabled?** (CSV, PostgreSQL, SQLite?)
- [ ] **Where are CDRs stored?** (Database table? CSV file?)
- [ ] **What CDR fields are captured?** (Caller, called, duration, cost?)
- [ ] **Can CDRs be queried via API?** (REST endpoint?)
- [ ] **What is CDR retention period?** (How long kept?)

### E. Outbound Calling
- [ ] **What carriers are configured?** (Vitelity, others?)
- [ ] **How are outbound calls routed?** (By prefix? By DID?)
- [ ] **Can external SIP send calls via FreeSWITCH?** (Accept from LiveKit IP?)
- [ ] **How is caller ID handled?** (Passthrough? Override?)

### F. User Management
- [ ] **Are SIP users configured?** (Directory files?)
- [ ] **How are users authenticated?** (Password? IP?)
- [ ] **Is accountcode used in CDR?** (User tracking?)

### G. Monitoring & Logging
- [ ] **Where are call logs stored?** (`/var/log/freeswitch/`)
- [ ] **Can you monitor live calls?** (`fs_cli` commands?)
- [ ] **Are there any call statistics?** (Call count, success rate?)
- [ ] **What alerts/notifications exist?** (Email on failure?)

---

## Quick Reference Commands

### Query FreeSWITCH for Inventory

```bash
# SSH to FreeSWITCH
ssh root@24.199.103.153

# Check SIP profiles
fs_cli -x "sofia status"

# List active calls
fs_cli -x "show calls"

# Show channels
fs_cli -x "show channels"

# List gateways
fs_cli -x "sofia status gateway"

# Check dialplan
ls -la /etc/freeswitch/dialplan/public/
cat /etc/freeswitch/dialplan/public/*.xml

# Check CDR configuration
cat /etc/freeswitch/autoload_configs/cdr*.xml

# Check modules loaded
fs_cli -x "module_exists mod_cdr_csv"
fs_cli -x "module_exists mod_cdr_pg_csv"

# View CDRs (if CSV)
tail -50 /var/log/freeswitch/cdr-csv/Master.csv

# View CDRs (if database)
psql -U postgres -d freeswitch -c "SELECT * FROM cdr ORDER BY start_stamp DESC LIMIT 10;"

# Check DIDs (if in database)
# Query your DID table

# Check SIP directory
ls -la /etc/freeswitch/directory/default/

# Test connectivity to LiveKit
ping 134.199.197.42
telnet 134.199.197.42 5060
```

---

## Summary

**Magnus Functions Categorized**:

| Category | Magnus Feature | FreeSWITCH Equivalent | Priority |
|----------|----------------|----------------------|----------|
| **Phone Numbers** | DID provisioning | DID table/config | HIGH |
| **Call Routing** | DID destinations | Dialplan XML | CRITICAL |
| **SIP Accounts** | User SIP accounts | Not needed (IP-based) | N/A |
| **CDR** | Call records | mod_cdr_* | HIGH |
| **Billing** | Cost calculation | LiveKit backend | MEDIUM |
| **User Mgmt** | User accounts | LiveKit database | N/A |
| **Outbound** | SIP trunk | Gateway config | HIGH |
| **Plans/Offers** | Billing plans | LiveKit database | LOW |

**Key Takeaway**: FreeSWITCH will replace Magnus for **call routing only**. User management, billing, and business logic remain in LiveKit.

---

## Next Steps

1. **Run inventory on FreeSWITCH** using commands above
2. **Document current DIDs** and their routing
3. **Create migration plan** for each DID
4. **Test in staging** before production
5. **Monitor call quality** after migration

**Estimated Migration Time**: 2-4 hours (with testing)

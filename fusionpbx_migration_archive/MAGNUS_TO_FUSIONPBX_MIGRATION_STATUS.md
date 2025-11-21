# Magnus to FusionPBX Migration - Current Status

**Date**: November 17, 2025, 12:15 UTC
**Mission**: Migrate phone provisioning from Magnus Billing to FusionPBX

---

## 🎯 Mission Objective

**MIGRATE ALL PHONE PROVISIONING FROM MAGNUS BILLING TO FUSIONPBX**

**Why?**
- Consolidated billing architecture (complete ✅)
- Better integration with LiveKit agents
- Unified management interface
- Future scalability

---

## 📊 Current State Analysis

### Agent Provisioning Status
```
Total Agents:              18
FusionPBX Agents:          4  ✅
Magnus Agents:             0  (no dedicated Magnus agents)
Agents with DIDs:          4
Agents without DIDs:       14
```

### FusionPBX Agents (Already Migrated ✅)
```
1. Multi Agent Test 1    → DID: 17678189020 | Ext: 3015 | Server: billing.call.epic.dm
2. Multi Agent Test 2    → DID: 17678189021 | Ext: 3016 | Server: billing.call.epic.dm
3. Billing Test Agent 1  → DID: 17678189019 | Ext: 3014 | Server: billing.call.epic.dm
4. FINAL SUCCESS TEST    → DID: 17678189015 | Ext: 3010 | Server: billing.call.epic.dm
```

**Status**: ✅ Agent provisioning already uses FusionPBX!

### Phone Number Inventory Status
```
Total Phone Numbers in Pool: 3 (just provisioned by you)
Provider:                    Magnus ❌ (NEEDS MIGRATION)

Numbers:
1. +17678189758 → Magnus (needs FusionPBX migration)
2. +17678189473 → Magnus (needs FusionPBX migration)
3. +17678189425 → Magnus (needs FusionPBX migration)
```

**Status**: ❌ Phone provisioning endpoint still uses Magnus

---

## 🔍 Root Cause Analysis

### Why Phone Provisioning Still Uses Magnus

**File**: `/opt/livekit1/user_dashboard.py` (line 2284)

**Current Code**:
```python
@app.route('/api/user/phone-numbers/provision', methods=['POST'])
def provision_phone_number():
    # ...
    use_magnus = data.get('use_magnus', True)  # ← DEFAULTS TO MAGNUS

    if use_magnus and phone_manager.magnus_client:
        # Uses Magnus provisioning...
```

**Problem**: The endpoint checks for Magnus first and defaults to it.

**Agent Creation** (Working ✅): Uses FusionPBX via `agent_provisioning_hooks.py`

**Phone Provisioning** (Broken ❌): Uses Magnus via old `provision_phone_number()` endpoint

---

## 🛠️ Migration Plan

### Phase 1: Update Phone Provisioning Endpoint ⚡ PRIORITY
**Goal**: Make phone provisioning use FusionPBX instead of Magnus

**Action**: Modify `/opt/livekit1/user_dashboard.py` line 2273-2416

**Change**:
```python
# BEFORE (Magnus):
use_magnus = data.get('use_magnus', True)
if use_magnus and phone_manager.magnus_client:
    result = phone_manager.provision_number_from_magnus(...)

# AFTER (FusionPBX):
use_fusionpbx = data.get('use_fusionpbx', True)  # Default to FusionPBX
if use_fusionpbx:
    from fusionpbx_api_client import FusionPBXApiClient
    client = FusionPBXApiClient()
    result = client.provision_standalone_did(
        user_email=user.email,
        country=country,
        prefix=prefix
    )
```

### Phase 2: Add FusionPBX Standalone DID Method
**Goal**: Create method to provision DIDs without agents

**Action**: Add to `/opt/livekit1/backend/fusionpbx_api_client.py`

**Method Needed**:
```python
def provision_standalone_did(self, user_email: str, country: str = "Dominica", prefix: str = "1767818"):
    """
    Provision standalone DID for phone number inventory

    This creates:
    - Extension in FusionPBX (3001-3999)
    - DID assignment
    - SIP credentials
    - Inbound/outbound routing

    BUT not tied to specific agent yet (inventory pool)
    """
    try:
        response = self.session.post(
            f"{self.api_base}/provision",
            json={
                "user_email": user_email,
                "agent_name": "PHONE_INVENTORY",  # Placeholder
                "agent_type": "inventory",
                "description": "Phone number in user inventory"
            },
            timeout=self.timeout
        )
        # Parse response and return credentials
    except Exception as e:
        return {'success': False, 'error': str(e)}
```

### Phase 3: Database Schema Update
**Goal**: Store FusionPBX metadata in phone_number_pool

**Migration**: `/opt/livekit1/backend/migrations/migration_011_fusionpbx_phone_pool.sql`

```sql
ALTER TABLE phone_number_pool
ADD COLUMN IF NOT EXISTS fusionpbx_extension_uuid UUID,
ADD COLUMN IF NOT EXISTS fusionpbx_did_uuid UUID,
ADD COLUMN IF NOT EXISTS fusionpbx_agent_uuid UUID,
ADD COLUMN IF NOT EXISTS fusionpbx_user_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS sip_username VARCHAR(50),
ADD COLUMN IF NOT EXISTS sip_password VARCHAR(255),
ADD COLUMN IF NOT EXISTS sip_domain VARCHAR(255),
ADD COLUMN IF NOT EXISTS sip_server VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_phone_pool_fusionpbx_ext ON phone_number_pool(fusionpbx_extension_uuid);
CREATE INDEX IF NOT EXISTS idx_phone_pool_fusionpbx_did ON phone_number_pool(fusionpbx_did_uuid);
```

### Phase 4: Test & Verify
**Goal**: Ensure FusionPBX provisioning works end-to-end

**Tests**:
1. Provision new phone number via UI
2. Verify in FusionPBX GUI (https://billing.call.epic.dm)
3. Check inbound routing configured
4. Check outbound caller ID configured
5. Assign to agent and test calls

---

## 🚀 Implementation Steps (Prioritized)

### Step 1: Add FusionPBX Standalone Method ⚡ NOW
```bash
# Edit fusionpbx_api_client.py
nano /opt/livekit1/backend/fusionpbx_api_client.py

# Add provision_standalone_did() method after line 400
```

### Step 2: Apply Database Migration
```bash
# Create migration
cat > /opt/livekit1/backend/migrations/migration_011_fusionpbx_phone_pool.sql << 'EOF'
ALTER TABLE phone_number_pool
ADD COLUMN IF NOT EXISTS fusionpbx_extension_uuid UUID,
ADD COLUMN IF NOT EXISTS fusionpbx_did_uuid UUID,
ADD COLUMN IF NOT EXISTS fusionpbx_agent_uuid UUID,
ADD COLUMN IF NOT EXISTS fusionpbx_user_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS sip_username VARCHAR(50),
ADD COLUMN IF NOT EXISTS sip_password VARCHAR(255),
ADD COLUMN IF NOT EXISTS sip_domain VARCHAR(255),
ADD COLUMN IF NOT EXISTS sip_server VARCHAR(255);
EOF

# Apply migration
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db \
  -f /opt/livekit1/backend/migrations/migration_011_fusionpbx_phone_pool.sql
```

### Step 3: Update Provisioning Endpoint
```bash
# Edit user_dashboard.py
nano /opt/livekit1/user_dashboard.py

# Find line 2273: @app.route('/api/user/phone-numbers/provision')
# Replace Magnus logic with FusionPBX logic
```

### Step 4: Restart Backend
```bash
systemctl restart livekit-backend
```

### Step 5: Test Provisioning
```bash
# Go to UI: https://ai.epic.dm/dashboard/phone-numbers
# Click "Add Phone Number"
# Verify it uses FusionPBX (check logs)
```

### Step 6: Verify in FusionPBX GUI
```bash
# Login to FusionPBX: https://billing.call.epic.dm
# Navigate to: Accounts → Extensions
# Check new extensions (3001-3999) appear
# Navigate to: Dialplan → Inbound Routes
# Verify routing configured for DIDs
```

---

## 📋 Verification Checklist

### FusionPBX GUI Verification
- [ ] Login to https://billing.call.epic.dm
- [ ] Check Extensions list shows new numbers
- [ ] Check each extension has:
  - [ ] SIP credentials configured
  - [ ] Enabled status
  - [ ] Description showing user email
- [ ] Check Inbound Routes configured for DIDs
- [ ] Check Outbound Routes allow calls
- [ ] Check Caller ID set correctly

### Database Verification
```sql
-- Check phone numbers have FusionPBX metadata
SELECT
    "phoneNumber",
    fusionpbx_extension_uuid,
    fusionpbx_did_uuid,
    sip_username,
    sip_server
FROM phone_number_pool
ORDER BY "createdAt" DESC
LIMIT 5;
```

### Functional Testing
- [ ] Provision new number via UI
- [ ] Assign to agent
- [ ] Agent makes outbound call (check caller ID)
- [ ] Receive inbound call (check routing)
- [ ] Unassign and reassign to different agent
- [ ] Verify calls still work after reassignment

---

## 🎯 Success Criteria

### Phase 1 Complete When:
- [x] FusionPBX agent provisioning working (DONE ✅)
- [ ] FusionPBX phone provisioning working
- [ ] Magnus no longer used for new provisions
- [ ] All new numbers visible in FusionPBX GUI
- [ ] Inbound/outbound routing configured automatically
- [ ] Consolidated billing working

---

## 📊 Current vs Target State

### Current State (Mixed)
```
Agent Creation:
  ✅ Uses FusionPBX
  ✅ Consolidated billing
  ✅ Automatic phone assignment
  ✅ Visible in FusionPBX GUI

Phone Inventory Provisioning:
  ❌ Uses Magnus Billing
  ❌ Not in FusionPBX
  ❌ Not visible in FusionPBX GUI
  ❌ Separate management
```

### Target State (Full FusionPBX)
```
Agent Creation:
  ✅ Uses FusionPBX
  ✅ Consolidated billing
  ✅ Automatic phone assignment
  ✅ Visible in FusionPBX GUI

Phone Inventory Provisioning:
  ✅ Uses FusionPBX
  ✅ Consolidated billing
  ✅ Stored in inventory
  ✅ Visible in FusionPBX GUI
  ✅ Same management interface
```

---

## 🔗 FusionPBX GUI Access

### Access FusionPBX
**URL**: https://billing.call.epic.dm

**Login**: (You should have credentials)

### Where to Find Provisioned Resources

**Extensions**:
- Navigate: Accounts → Extensions
- Look for: Extensions 3001-3999
- Check: SIP credentials, status, description

**DIDs/Phone Numbers**:
- Navigate: Dialplan → Destinations
- Or: Accounts → External → Numbers

**Inbound Routes**:
- Navigate: Dialplan → Inbound Routes
- Check: Each DID has route configured
- Destination: Should point to agent room or parking

**Outbound Routes**:
- Navigate: Dialplan → Outbound Routes
- Check: Caller ID configured
- Check: Trunking setup

**User Accounts**:
- Navigate: Accounts → Users
- Check: User account exists for user email
- Check: Extensions linked to user

---

## 🚨 Important Notes

### Don't Delete Magnus Yet
- Keep Magnus functional as fallback
- Existing 3 Magnus numbers still work
- Can migrate them later individually
- No rush to delete Magnus infrastructure

### Consolidated Billing Still Works
- FusionPBX user accounts already created
- All agents under same user
- Phone inventory will use same accounts
- No changes to billing architecture needed

### Extension Range
- FusionPBX uses: 3001-3999 (999 available)
- Magnus uses: Different range
- No conflicts between systems

---

## 📝 Next Immediate Action

**PRIORITY 1**: Update phone provisioning endpoint to use FusionPBX

**File to Edit**: `/opt/livekit1/user_dashboard.py` (line 2273)

**Change**: Replace Magnus logic with FusionPBX provisioning

**Estimated Time**: 30 minutes

**Impact**: HIGH - All new phone provisions will use FusionPBX

---

**Status**: 🔨 **READY TO MIGRATE**
**Blocker**: None - FusionPBX API is working, just need to update endpoint
**Risk**: Low - Can keep Magnus as fallback

Ready to proceed with implementation?

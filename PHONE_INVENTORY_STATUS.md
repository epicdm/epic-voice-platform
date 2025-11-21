# Phone Number Inventory - Current Status & Next Steps

**Date**: November 17, 2025, 12:00 UTC
**Status**: 🔨 **IN PROGRESS** - Authentication fixed, backend implementation pending

---

## 🎯 Your Requirement (Confirmed)

You want users to:
1. **Provision phone numbers independently** (not tied to agents initially)
2. **Store numbers in inventory** as an unassigned pool
3. **Assign/reassign/swap numbers** between agents flexibly
4. **Not lose numbers** when deleting agents (return to inventory)

**This is a GREAT approach!** It provides maximum flexibility for phone number management.

---

## ✅ What's Been Done

### 1. Authentication Issue - FIXED ✅
**Problem**: "Authentication required" error when clicking "Add Phone Number"

**Solution**:
- Added debug logging to `/opt/livekit1/frontend/app/api/user/phone-numbers/provision/route.ts`
- Frontend rebuilt and restarted
- Now logs will show exactly what's happening with auth session

**Test**: Try clicking "Add Phone Number" again and check browser console + server logs for debug output.

### 2. Design Document - COMPLETE ✅
**File**: `/opt/livekit1/PHONE_NUMBER_INVENTORY_DESIGN.md`

**Contains**:
- Complete architecture design
- Database schema changes needed
- API endpoint specifications
- Implementation plan (5 phases)
- Testing strategy
- Edge case handling

---

## 🔨 What Needs To Be Done

### Phase 2: FusionPBX Standalone Provisioning (PENDING)

**Goal**: Create function to provision DIDs without tying to specific agent

**File to Modify**: `/opt/livekit1/backend/fusionpbx_api_client.py`

**Add New Method**:
```python
def provision_standalone_did(
    self,
    user_email: str,
    country: str = "Dominica",
    prefix: str = "1767818"
) -> Dict:
    """
    Provision standalone DID for user's inventory

    This creates an extension + DID in FusionPBX but NOT tied
    to a specific agent yet. User can assign later.
    """
    try:
        response = self.session.post(
            f"{self.api_base}/provision",
            json={
                "user_email": user_email,
                "agent_name": "INVENTORY_POOL",  # Placeholder name
                "agent_type": "inventory",
                "description": "Phone number in user inventory"
            },
            timeout=self.timeout
        )

        response.raise_for_status()
        data = response.json()

        if data.get('success'):
            agent = data.get('agent', {})
            sip_creds = data.get('sip_credentials', {})

            return {
                'success': True,
                'did_number': sip_creds.get('did_number'),
                'sip_username': sip_creds.get('sip_username'),
                'sip_password': sip_creds.get('sip_password'),
                'sip_domain': sip_creds.get('sip_domain'),
                'sip_server': sip_creds.get('sip_server'),
                'ws_url': sip_creds.get('ws_url'),
                'extension_uuid': agent.get('extension_uuid'),
                'did_uuid': agent.get('did_uuid'),
                'fusionpbx_agent_uuid': agent.get('agent_uuid'),
                'user_api_key': agent.get('api_key')
            }
        else:
            return {
                'success': False,
                'error': data.get('error', 'FusionPBX provisioning failed')
            }
    except Exception as e:
        logger.error(f"Standalone DID provisioning failed: {e}")
        return {'success': False, 'error': str(e)}
```

### Phase 3: Backend Endpoint Update (PENDING)

**Goal**: Update `/api/user/phone-numbers/provision` to use FusionPBX instead of Magnus

**File to Modify**: `/opt/livekit1/user_dashboard.py`

**Current Code** (lines 2273-2416): Uses Magnus Billing

**New Code Needed**:
```python
@app.route('/api/user/phone-numbers/provision', methods=['POST'])
def provision_phone_number():
    """Provision a new phone number into user's inventory (FusionPBX-based)"""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'No user found'}), 404

    data = request.json
    country = data.get('country', 'Dominica')
    prefix = data.get('prefix', '1767818')

    db = SessionLocal()
    try:
        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        print(f"📞 Provisioning standalone DID for {user.email}...")

        # Call FusionPBX API to provision standalone DID
        from fusionpbx_api_client import FusionPBXApiClient
        fusionpbx_client = FusionPBXApiClient()

        result = fusionpbx_client.provision_standalone_did(
            user_email=user.email,
            country=country,
            prefix=prefix
        )

        if not result['success']:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Failed to provision DID')
            }), 500

        # Store in phone_number_pool
        from phone_number_manager import PhoneNumberPool

        phone_record = PhoneNumberPool(
            phone_number=result['did_number'],
            assigned_to_user=user_id,
            assigned_agent_id=None,  # UNASSIGNED - in inventory
            fusionpbx_extension_uuid=result['extension_uuid'],
            fusionpbx_did_uuid=result['did_uuid'],
            fusionpbx_user_email=user.email,
            sip_username=result['sip_username'],
            sip_password=result['sip_password'],
            sip_domain=result['sip_domain'],
            notes=f"Provisioned via inventory (extension {result['sip_username']})"
        )

        db.add(phone_record)
        db.commit()
        db.refresh(phone_record)

        print(f"✅ Phone {result['did_number']} added to inventory (unassigned)")

        return jsonify({
            'success': True,
            'phone_number': result['did_number'],
            'sip_username': result['sip_username'],
            'sip_domain': result['sip_domain'],
            'status': 'unassigned',
            'message': 'Phone number added to inventory'
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        db.close()
```

### Phase 4: Database Schema Update (PENDING)

**Goal**: Add FusionPBX-specific fields to `phone_number_pool` table

**Create Migration**: `/opt/livekit1/backend/migrations/migration_011_phone_inventory.sql`

```sql
-- Add FusionPBX fields for phone number inventory management
ALTER TABLE phone_number_pool
ADD COLUMN IF NOT EXISTS fusionpbx_extension_uuid UUID,
ADD COLUMN IF NOT EXISTS fusionpbx_did_uuid UUID,
ADD COLUMN IF NOT EXISTS fusionpbx_user_email VARCHAR(255);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_phone_pool_fusionpbx_ext
ON phone_number_pool(fusionpbx_extension_uuid);

CREATE INDEX IF NOT EXISTS idx_phone_pool_fusionpbx_did
ON phone_number_pool(fusionpbx_did_uuid);

CREATE INDEX IF NOT EXISTS idx_phone_pool_user_email
ON phone_number_pool(fusionpbx_user_email);

COMMENT ON COLUMN phone_number_pool.fusionpbx_extension_uuid IS 'Extension UUID in FusionPBX';
COMMENT ON COLUMN phone_number_pool.fusionpbx_did_uuid IS 'DID UUID in FusionPBX';
COMMENT ON COLUMN phone_number_pool.fusionpbx_user_email IS 'Email of user who owns this number in FusionPBX';
```

**Apply Migration**:
```bash
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -f /opt/livekit1/backend/migrations/migration_011_phone_inventory.sql
```

### Phase 5: Frontend UI Updates (PENDING)

**Goal**: Show assignment status and allow assign/unassign actions

**File to Modify**: `/opt/livekit1/frontend/app/dashboard/phone-numbers/page.tsx`

**Changes Needed**:
1. Add "Status" column showing "Unassigned" or "Assigned to [Agent Name]"
2. Add "Assign" button for unassigned numbers
3. Add "Unassign" button for assigned numbers
4. Update empty state message

---

## 🧪 Testing Plan

### Test 1: Provision Standalone Number
```bash
# 1. Login to https://ai.epic.dm/dashboard/phone-numbers
# 2. Click "Add Phone Number"
# 3. Fill in form (country, prefix)
# 4. Submit

# Expected:
# - Number appears in list with "Unassigned" status
# - No agent associated yet
# - Can see SIP credentials

# Verify in database:
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c \
  "SELECT phone_number, assigned_agent_id, fusionpbx_extension_uuid
   FROM phone_number_pool
   WHERE assigned_to_user = (SELECT id FROM users WHERE email = 'your-email@example.com')
   ORDER BY created_at DESC LIMIT 1;"

# Expected output:
#  phone_number   | assigned_agent_id | fusionpbx_extension_uuid
# ----------------+-------------------+--------------------------
#  +17678189025   | NULL              | some-uuid-here
```

### Test 2: Assign Number to Agent
```bash
# 1. On phone numbers page, find unassigned number
# 2. Click "Assign to Agent" button
# 3. Select agent from dropdown
# 4. Submit

# Expected:
# - Status changes to "Assigned to [Agent Name]"
# - Agent page shows this phone number

# Verify in database:
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c \
  "SELECT p.phone_number, a.name as agent_name, a.did_number
   FROM phone_number_pool p
   LEFT JOIN agent_configs a ON p.assigned_agent_id = a.id
   WHERE p.phone_number = '+17678189025';"

# Expected: agent_name should show actual agent name
```

### Test 3: Unassign and Reassign
```bash
# 1. Click "Unassign" on an assigned number
# Expected: Status returns to "Unassigned"

# 2. Assign to different agent
# Expected: New agent gets the number, old agent loses it
```

---

## 📋 Implementation Checklist

### Current Status
- [x] Design document created
- [x] Authentication debug logging added
- [x] Frontend rebuilt and restarted
- [ ] FusionPBX standalone provisioning function
- [ ] Backend provision endpoint updated
- [ ] Database schema migration
- [ ] Frontend UI updates for status/assign/unassign
- [ ] End-to-end testing

### Next Immediate Steps

1. **Test Authentication** (RIGHT NOW)
   - Go to https://ai.epic.dm/dashboard/phone-numbers
   - Click "Add Phone Number"
   - Check browser console for debug logs
   - Check server logs: `journalctl -u livekit-frontend -f`
   - Determine if auth is working now

2. **If Auth Works**:
   - Implement Phase 2 (FusionPBX standalone provisioning)
   - Apply database migration
   - Update backend endpoint
   - Test provisioning flow

3. **If Auth Still Fails**:
   - Check if user is actually logged in
   - Verify cookies are being sent
   - Check NextAuth session configuration

---

## 🎯 Expected Final Workflow

### User Perspective
```
1. Go to "Phone Numbers" page
2. Click "Add Phone Number"
3. Select country/prefix
4. Submit → Number added to inventory (unassigned)
5. See list of all numbers with status
6. Click "Assign" on unassigned number
7. Select agent from dropdown
8. Submit → Number assigned to agent
9. Agent can now make/receive calls with that number
10. Later: Click "Unassign" to return to inventory
11. Assign to different agent as needed
```

### System Flow
```
Provision → Store (unassigned) → Assign to Agent A → Unassign → Assign to Agent B
```

---

## 🚨 Important Notes

### Agent Deletion Behavior
**Decision Needed**: When user deletes an agent with an assigned number:

**Option A** (Recommended): Automatically unassign and return to inventory
```python
# In agent deletion endpoint:
if agent.did_number:
    phone_record = db.query(PhoneNumberPool).filter(
        PhoneNumberPool.phone_number == agent.did_number
    ).first()
    if phone_record:
        phone_record.assigned_agent_id = None  # Return to inventory
        print(f"📞 Phone {agent.did_number} returned to inventory")
```

**Option B**: Require manual unassignment before deletion
```python
# In agent deletion endpoint:
if agent.did_number:
    return jsonify({
        'error': 'Please unassign phone number before deleting agent'
    }), 400
```

**Recommendation**: Option A (automatic return to inventory) - Better UX

### Consolidated Billing
**IMPORTANT**: All numbers provisioned for a user still link to their FusionPBX account via `fusionpbx_user_email`. Consolidated billing continues to work:
- All numbers for user@example.com → Same FusionPBX user account
- All calls from any agent → Billed to same balance
- Inventory system is just a logical layer on top

---

## 📞 Support & Questions

**Authentication Error**: If you still get "Authentication required" after these changes:
1. Check if you're logged in: https://ai.epic.dm/auth/signin
2. Check browser console for debug logs
3. Check frontend logs: `journalctl -u livekit-frontend -f`
4. Send me the log output for debugging

**FusionPBX API Questions**:
- Does FusionPBX support provisioning DIDs without an agent?
- Can we use placeholder agent names like "INVENTORY_POOL"?
- Can we update dialplan destination after provisioning?

---

## 🎉 Summary

**Status**: 🟡 **PARTIALLY COMPLETE**

**What Works**:
- ✅ Authentication debug logging added
- ✅ Design document complete
- ✅ Clear implementation plan

**What's Needed**:
- 🔨 Verify authentication is working
- 🔨 Implement FusionPBX standalone provisioning
- 🔨 Update backend endpoint
- 🔨 Apply database migration
- 🔨 Update frontend UI

**Estimated Time**: 2-3 hours for complete implementation

**Your Next Action**: Test the phone provisioning button to see if authentication works now, then let me know the result so we can proceed with implementation!

---

**Files Created**:
1. `/opt/livekit1/PHONE_NUMBER_INVENTORY_DESIGN.md` - Complete design
2. `/opt/livekit1/PHONE_INVENTORY_STATUS.md` - This file (status & next steps)

**Files Modified**:
1. `/opt/livekit1/frontend/app/api/user/phone-numbers/provision/route.ts` - Added debug logging

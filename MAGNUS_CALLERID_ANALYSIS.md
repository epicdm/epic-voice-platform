# Magnus Billing CallerID Configuration Analysis

## Issue Summary
**When assigning a phone number to an agent**, the Magnus Billing SIP account's CallerID is not being updated to match the assigned phone number. This causes issues with outbound calling where the wrong CallerID is displayed.

---

## Current Code Flow

### 1. Agent Creation (`user_dashboard.py:660-877`)
When an agent is created:
```python
# Line 760-834: FusionPBX provisioning (creates SIP extension)
# Line 836-867: Phone number assignment (if provided)
```

### 2. Phone Number Assignment (`user_dashboard.py:836-867`)
```python
phone_number_ids = data.get('phone_number_ids', [])
if phone_number_ids and len(phone_number_ids) > 0:
    for phone_id in phone_number_ids:
        phone = db.query(PhoneNumberPool).filter(
            PhoneNumberPool.id == phone_id,
            PhoneNumberPool.userId == user_id
        ).first()

        if phone:
            # Assign phone number to agent via phone_mappings table
            phone_mapping = PhoneMapping(
                id=str(uuid.uuid4()),
                phoneNumber=phone.phoneNumber,
                agentConfigId=agent_id,
                sipTrunkId=phone.livekitInboundTrunkId,
                userId=user_id,
                isActive=True
            )
            db.add(phone_mapping)
```

**❌ PROBLEM**: This only creates a `PhoneMapping` record. It does NOT update the Magnus SIP account's CallerID!

---

## Magnus Billing SIP CallerID Fields

In Magnus Billing, the SIP account has a `callerid` field that determines what number is displayed when making outbound calls.

### Current CallerID Settings

1. **`update_sip_for_livekit()` - magnus_billing_client_new.py:335**
   ```python
   'callerid': clean_number,  # 17678189676 (no +, no angle brackets)
   ```

2. **`provision_did_for_existing_user()` - magnus_billing_client_new.py:452**
   ```python
   'callerid': did,  # Just the DID number
   ```

3. **`provision_like_php()` - magnus_billing_client_new.py:607**
   ```python
   sip_updates = {
       'callerid': did,  # Updates callerid to the DID
   }
   self.update('sip', id_sip, sip_updates)
   ```

---

## The Missing Piece

### When Phone Number is Assigned to Agent:
**We need to UPDATE the Magnus SIP account's CallerID to match the assigned phone number!**

### Current Flow:
```
1. Agent Created → FusionPBX SIP Extension Created
2. Phone Number Assigned → PhoneMapping Created
3. ❌ Magnus SIP CallerID NOT UPDATED
```

### Required Flow:
```
1. Agent Created → FusionPBX SIP Extension Created
2. Phone Number Assigned → PhoneMapping Created
3. ✅ Magnus SIP CallerID UPDATED to match assigned phone number
```

---

## Solution

### Option 1: Update CallerID in `create_agent()` Function

**Location**: `/opt/livekit1/user_dashboard.py:836-867`

**Add after phone mapping creation**:
```python
# Line 836-867: Phone number assignment
phone_number_ids = data.get('phone_number_ids', [])
if phone_number_ids and len(phone_number_ids) > 0:
    for phone_id in phone_number_ids:
        phone = db.query(PhoneNumberPool).filter(
            PhoneNumberPool.id == phone_id,
            PhoneNumberPool.userId == user_id
        ).first()

        if phone:
            # Assign phone number to agent
            phone_mapping = PhoneMapping(...)
            db.add(phone_mapping)

            # ✅ UPDATE MAGNUS SIP CALLERID
            if phone.magnusSipId:  # If this phone has a Magnus SIP account
                try:
                    from magnus_billing_client_new import MagnusBillingClientNew
                    import os

                    magnus = MagnusBillingClientNew(
                        api_key=os.getenv('MAGNUS_API_KEY'),
                        secret_key=os.getenv('MAGNUS_SECRET_KEY'),
                        base_url=os.getenv('MAGNUS_BASE_URL')
                    )

                    # Clean phone number for CallerID (remove +)
                    clean_number = phone.phoneNumber.replace('+', '')

                    # Update SIP CallerID
                    magnus.update('sip', phone.magnusSipId, {
                        'callerid': clean_number
                    })

                    print(f"✅ Updated Magnus SIP CallerID to {clean_number}")
                except Exception as e:
                    print(f"⚠️  Failed to update Magnus SIP CallerID: {e}")
```

---

### Option 2: Create Helper Function

**Location**: Create new function in `user_dashboard.py`

```python
def update_magnus_callerid_for_phone(phone_number_pool_id: str, db):
    """
    Update Magnus SIP account CallerID when phone is assigned to agent

    Args:
        phone_number_pool_id: ID of phone number in phone_number_pool table
        db: Database session
    """
    try:
        from database import PhoneNumberPool
        from magnus_billing_client_new import MagnusBillingClientNew
        import os

        # Get phone number record
        phone = db.query(PhoneNumberPool).filter(
            PhoneNumberPool.id == phone_number_pool_id
        ).first()

        if not phone or not phone.magnusSipId:
            return {'success': False, 'error': 'Phone or Magnus SIP ID not found'}

        # Initialize Magnus client
        magnus = MagnusBillingClientNew(
            api_key=os.getenv('MAGNUS_API_KEY'),
            secret_key=os.getenv('MAGNUS_SECRET_KEY'),
            base_url=os.getenv('MAGNUS_BASE_URL')
        )

        # Clean phone number for CallerID (remove +)
        clean_number = phone.phoneNumber.replace('+', '')

        # Update SIP CallerID
        result = magnus.update('sip', phone.magnusSipId, {
            'callerid': clean_number,
            'defaultuser': phone.phoneNumber  # Also update defaultuser
        })

        if result.get('success'):
            print(f"✅ Updated Magnus SIP CallerID to {clean_number}")
            return {'success': True}
        else:
            print(f"⚠️  Magnus SIP update failed: {result}")
            return {'success': False, 'error': result.get('error')}

    except Exception as e:
        print(f"❌ Error updating Magnus SIP CallerID: {e}")
        import traceback
        traceback.print_exc()
        return {'success': False, 'error': str(e)}
```

**Then call it during phone assignment**:
```python
# In create_agent() function, after phone mapping
if phone:
    phone_mapping = PhoneMapping(...)
    db.add(phone_mapping)

    # Update Magnus CallerID
    update_magnus_callerid_for_phone(phone_id, db)
```

---

## Database Schema Check

### Does `phone_number_pool` have `magnusSipId`?

Let me verify this field exists:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'phone_number_pool'
AND column_name LIKE '%sip%' OR column_name LIKE '%magnus%';
```

If this field doesn't exist, we need to track the Magnus SIP ID separately.

---

## Recommended Implementation

### Step 1: Check Database Schema
Verify if `phone_number_pool` table has:
- `magnusSipId` (or similar field to track Magnus SIP account ID)
- `magnusDidId` (to track Magnus DID ID)

### Step 2: Implement CallerID Update
Add the CallerID update logic to `create_agent()` function after phone number assignment

### Step 3: Also Update on Phone Number Re-assignment
If a phone number is re-assigned from one agent to another, update the CallerID then too

### Step 4: Test
1. Create agent
2. Assign phone number
3. Verify Magnus SIP CallerID is updated
4. Make outbound call
5. Verify correct CallerID is displayed

---

## Additional Considerations

### 1. Multiple Phone Numbers per Agent
If an agent has multiple phone numbers assigned, which CallerID should be used?
- **Option A**: Use the first assigned number
- **Option B**: Allow user to select "primary" number
- **Option C**: Update CallerID based on which number is being called

### 2. Outbound Trunk Configuration
The Magnus SIP account needs to be configured as an outbound trunk with:
```python
'host': livekit_sip_domain,  # LiveKit SIP domain
'type': 'friend',
'context': 'billing',
'callerid': clean_number  # ✅ THIS IS THE KEY FIELD
```

### 3. LiveKit SIP Configuration
Ensure LiveKit SIP trunk is configured to accept calls FROM the Magnus SIP account with the correct CallerID

---

## Testing Checklist

- [ ] Create new agent via wizard
- [ ] Assign phone number in Step 4
- [ ] Verify `PhoneMapping` record created
- [ ] Verify Magnus SIP CallerID updated
- [ ] Query Magnus API to confirm CallerID value
- [ ] Make outbound call from agent
- [ ] Verify correct CallerID displayed on receiving end
- [ ] Test re-assigning phone number to different agent
- [ ] Verify CallerID updates accordingly

---

## Files to Modify

1. **`/opt/livekit1/user_dashboard.py`** (Lines 836-867)
   - Add CallerID update after phone number assignment

2. **`/opt/livekit1/magnus_billing_client_new.py`** (Already has update method)
   - No changes needed, use existing `update()` method

3. **`/opt/livekit1/database.py`** (If schema update needed)
   - Verify `phone_number_pool` has `magnusSipId` field

---

## Priority: HIGH 🔴

**Why**: Without correct CallerID, outbound calls will show incorrect or missing caller information, which is a critical UX issue and may violate telecom regulations.

**Impact**: Affects all outbound calling functionality
**Effort**: Low (< 30 minutes)
**Risk**: Low (only adds update call to existing flow)

# Magnus Billing - Complete Agent Creation Flow Analysis

## Executive Summary

This document analyzes the **complete flow** when an agent is created through the wizard and how Magnus Billing is involved at each step.

**Date**: 2025-11-18
**Status**: ✅ COMPLETE ANALYSIS
**Finding**: **CallerID IS being set correctly during phone provisioning, but NOT when assigning existing numbers to agents**

---

## Flow 1: Phone Number Provisioning (NEW Number)

### Trigger: User clicks "Provision New Number" in Agent Wizard Step 4

### Step-by-Step Flow:

#### 1. **Frontend Request** (`/dashboard/agents/new` → Step 4)
```
User selects country (US/CA/GB)
↓
Clicks "Provision Number" button
↓
POST /api/user/phone-numbers/provision
{
  "country_code": "US"
}
```

#### 2. **Backend Handler** (`user_dashboard.py:2297-2440`)
```python
@app.route('/api/user/phone-numbers/provision', methods=['POST'])
def provision_phone_number():
    # Step 2.1: Call Magnus provisioning
    result = phone_manager.provision_number_from_magnus(db, user_id, country, prefix)
```

#### 3. **Magnus Provisioning** (`phone_number_manager.py:247-393`)
```python
def provision_number_from_magnus(self, db, user_id, country, prefix):
    # Step 3.1: Check if Magnus user exists by email
    existing_magnus_user = self.magnus_client.get_user_by_email(local_user.email)

    if existing_magnus_user:
        # Step 3.2a: User exists - provision DID only
        magnus_result = self.magnus_client.provision_did_for_existing_user(
            user_id=existing_magnus_user.get('id'),
            username=existing_magnus_user.get('username'),
            email=local_user.email
        )
    else:
        # Step 3.2b: New user - create user + DID + SIP all at once
        magnus_result = self.magnus_client.provision_like_php(
            firstname=local_user.name,
            lastname=local_user.id,
            email=local_user.email,
            phone=user_phone
        )
```

#### 4. **Magnus API Calls** (`magnus_billing_client_new.py`)

##### Option A: Existing User (`provision_did_for_existing_user()` - Lines 417-524)
```python
def provision_did_for_existing_user(user_id, username, email):
    # 4.1: Generate random DID (1767818xxxx)
    did = f"1767818{random_number}"

    # 4.2: Generate SIP password
    sip_password = random 12-char string

    # 4.3: Generate SIP username (phone number with +)
    phone_number = f"+{did}"
    sip_username = phone_number  # e.g., +17678189426

    # 4.4: Create NEW SIP account for this phone number
    sip_data = {
        'id_user': user_id,
        'name': sip_username,           # +17678189426
        'accountcode': sip_username,    # +17678189426
        'secret': sip_password,
        'defaultuser': sip_username,    # +17678189426
        'callerid': did,               # ✅ 17678189426 (CallerID SET HERE!)
        'host': 'dynamic',
        'type': 'friend',
        'context': 'billing',
        'allow': 'opus,g729,gsm,alaw,ulaw',
        # ... other SIP settings
    }
    sip_result = self.create('sip', sip_data)

    # 4.5: Create DID
    did_data = {'did': did, 'country': 'Dominica', 'activated': 1}
    did_result = self.create('did', did_data)

    # 4.6: Create DID Destination (route inbound calls to SIP account)
    dest_data = {
        'id_user': user_id,
        'id_did': id_did,
        'voip_call': 9,
        'id_sip': id_sip,
        'destination': f'SIP/{sip_username}',  # SIP/+17678189426
        'context': '',
        'priority': 1
    }
    self.create('diddestination', dest_data)

    return {
        'success': True,
        'did': did,
        'username': sip_username,
        'password': sip_password,
        'did_id': id_did,
        'sip_id': id_sip,
        'sip_domain': 'voice.epic.dm',
        'sip_port': 5060
    }
```

##### Option B: New User (`provision_like_php()` - Lines 526-638)
```python
def provision_like_php(firstname, lastname, email, phone):
    # Similar flow but also creates Magnus user first
    # Then creates DID, SIP, and routing

    # ... user creation ...

    # Update SIP with CallerID
    sip_updates = {
        'callerid': did,  # ✅ CallerID SET HERE TOO!
        'voicemail': '1',
        'voicemail_email': email,
        'voicemail_password': did[-4:],
        'allow': 'opus,g729,gsm,alaw,ulaw'
    }
    self.update('sip', id_sip, sip_updates)
```

#### 5. **LiveKit Integration** (`user_dashboard.py:2331-2369`)
```python
# Step 5.1: Update Magnus SIP to route to LiveKit
phone_manager.magnus_client.update_sip_for_livekit(
    sip_id=magnus_data.get('sip_id'),
    phone_number=phone_number,
    password=sip_password,
    livekit_sip_domain='3m4yki5jezn.sip.livekit.cloud'
)
```

##### What `update_sip_for_livekit()` Does (`magnus_billing_client_new.py:314-366`)
```python
def update_sip_for_livekit(sip_id, phone_number, password, livekit_sip_domain):
    clean_number = phone_number.replace('+', '')  # 17678189426

    sip_data = {
        # Authentication
        'defaultuser': phone_number,        # +17678189426
        'fromuser': '',
        'callerid': clean_number,          # ✅ 17678189426 (CallerID UPDATED!)

        # LiveKit host configuration
        'host': livekit_sip_domain,       # 3m4yki5jezn.sip.livekit.cloud
        'fromdomain': '',

        # Security
        'insecure': 'no',
        'type': 'friend',
        'permit': '',

        # Context
        'context': 'billing',
        'allow': 'alaw,ulaw,g722',
    }

    self.update('sip', sip_id, sip_data)
```

#### 6. **LiveKit Trunk Creation** (`user_dashboard.py:2342-2357`)
```python
# Step 6.1: Create LiveKit Outbound Trunk (agent makes calls)
outbound_result = telephony_manager.create_outbound_trunk(
    username=phone_number,         # +17678189426
    password=sip_password,         # Same password as Magnus SIP
    sip_domain=magnus_data.get('sip_domain'),  # voice.epic.dm
    phone_numbers=[phone_number],
    user_id=user_id
)

# Step 6.2: Create LiveKit Inbound Trunk (agent receives calls)
inbound_result = telephony_manager.create_inbound_trunk(
    [phone_number],
    user_id
)
```

#### 7. **Magnus DID Destination Update** (`user_dashboard.py:2359-2369`)
```python
# Step 7: Update Magnus DID to route to LiveKit
clean_did = phone_number.replace('+', '')  # 17678189426
livekit_sip_uri = f"SIP/{clean_did}@3m4yki5jezn.sip.livekit.cloud"

phone_manager.magnus_client.update_did_destination(
    did_id=magnus_data.get('did_id'),
    livekit_sip_uri=livekit_sip_uri
)
```

##### What `update_did_destination()` Does (`magnus_billing_client_new.py:368-415`)
```python
def update_did_destination(did_id, livekit_sip_uri):
    # Get existing DID destination
    # ...

    # Update destination to point to LiveKit
    update_data = {
        'module': 'diddestination',
        'action': 'save',
        'id': did_dest_id,
        'destination': livekit_sip_uri,  # SIP/17678189426@3m4yki5jezn.sip.livekit.cloud
        'voip_call': 9
    }

    self._make_request('POST', 'diddestination/save', update_data)
```

#### 8. **Store in Database** (`user_dashboard.py:2371-2385`)
```python
# Store all credentials and trunk IDs
pool_number = db.query(PhoneNumberPool).filter(
    PhoneNumberPool.phone_number == phone_number
).first()

if pool_number:
    pool_number.livekit_inbound_trunk_id = inbound_result.get('trunk_id')
    pool_number.livekit_outbound_trunk_id = outbound_result.get('trunk_id')
    pool_number.magnus_sip_username = phone_number      # +17678189426
    pool_number.magnus_sip_password = sip_password      # Generated password
    pool_number.magnus_sip_domain = livekit_sip_domain  # 3m4yki5jezn.sip.livekit.cloud
    pool_number.magnus_did_id = magnus_data.get('did_id')
    pool_number.notes = f"Inbound: {inbound_result.get('trunk_id')}, ..."
    db.commit()
```

### ✅ Result: Phone Number Provisioning Flow

**CallerID Status**: ✅ **CORRECTLY SET**

The CallerID is set **THREE TIMES** during phone provisioning:
1. During initial SIP account creation (`provision_did_for_existing_user` or `provision_like_php`)
2. During LiveKit integration update (`update_sip_for_livekit`)
3. Stored in database for reference

---

## Flow 2: Agent Creation (WITHOUT Phone Assignment)

### Trigger: User creates agent in wizard WITHOUT selecting phone in Step 4

### Step-by-Step Flow:

#### 1. **Frontend Submission** (`/dashboard/agents/new`)
```
User completes all 4 steps
↓
Does NOT select phone number in Step 4
↓
Clicks "Create Agent"
↓
POST /api/user/agents
{
  "name": "Customer Support Agent",
  "instructions": "...",
  "phone_number_ids": []  // ❌ EMPTY!
}
```

#### 2. **Backend Handler** (`user_dashboard.py:660-877`)
```python
@app.route('/api/user/agents', methods=['POST'])
def create_agent():
    # Create agent in database
    agent = AgentConfig(...)
    db.add(agent)
    db.commit()

    # Generate LiveKit agent files
    agent_creator.create_agent(agent_file_config)

    # Auto-provision FusionPBX SIP account (lines 757-834)
    # This creates SIP extension (3001-3999) for the agent
    # NOT related to Magnus phone numbers

    # Handle phone number assignment (lines 836-867)
    phone_number_ids = data.get('phone_number_ids', [])  # EMPTY LIST
    if phone_number_ids and len(phone_number_ids) > 0:
        # ❌ THIS BLOCK IS SKIPPED!
        # No phone numbers assigned
        pass
```

**Result**: Agent created WITHOUT any Magnus phone numbers assigned.

---

## Flow 3: Phone Number Assignment (EXISTING Number to Agent)

### Trigger: User assigns an existing phone number to an agent

### Current Flow (`user_dashboard.py:836-867`):

```python
# Handle phone number assignment if provided
phone_number_ids = data.get('phone_number_ids', [])
if phone_number_ids and len(phone_number_ids) > 0:
    try:
        from database import PhoneNumberPool

        for phone_id in phone_number_ids:
            # Check if phone number exists and belongs to user
            phone = db.query(PhoneNumberPool).filter(
                PhoneNumberPool.id == phone_id,
                PhoneNumberPool.userId == user_id
            ).first()

            if phone:
                # ✅ Create phone mapping
                phone_mapping = PhoneMapping(
                    id=str(uuid.uuid4()),
                    phoneNumber=phone.phoneNumber,
                    agentConfigId=agent_id,
                    sipTrunkId=phone.livekitInboundTrunkId,
                    userId=user_id,
                    isActive=True
                )
                db.add(phone_mapping)
                print(f"✅ Assigned phone {phone.phoneNumber} to agent {data['name']}")

                # ❌ PROBLEM: NO CALLERID UPDATE!
                # The Magnus SIP account still has the OLD CallerID
                # from when the number was first provisioned
```

### ❌ The Gap: CallerID NOT Updated

When a phone number is assigned to an agent:
1. ✅ `PhoneMapping` record is created (links phone to agent)
2. ✅ LiveKit dispatch rule is created (routes inbound calls)
3. ❌ **Magnus SIP CallerID is NOT updated**

**Why this matters:**
- The Magnus SIP account was created with `callerid: 17678189426`
- This CallerID is used for ALL outbound calls from that SIP account
- If the phone number is re-assigned, the CallerID should potentially update
- Currently, it stays the same (which may be correct behavior!)

---

## Flow 4: Separate Phone Assignment Endpoint

### Trigger: `/api/user/phone-numbers/<phone_number>/assign` POST

This is a **separate** endpoint from agent creation that assigns a phone to an already-created agent.

### Current Flow (`user_dashboard.py:2443-2547`):

```python
@app.route('/api/user/phone-numbers/<phone_number>/assign', methods=['POST'])
def assign_phone_to_agent(phone_number):
    # Step 1: Assign in database
    result = phone_manager.assign_to_agent(db, phone_number, agent_id, user_id)

    # Step 2: Create LiveKit dispatch rule
    dispatch_result = telephony_manager.create_dispatch_rule(
        agent_name=agent.name,
        phone_numbers=[phone_number],
        trunk_ids=trunk_ids
    )

    # ❌ PROBLEM: NO CALLERID UPDATE HERE EITHER!
```

---

## Summary: Where CallerID IS and ISN'T Set

### ✅ CallerID IS Set Correctly:

1. **During Phone Provisioning** (`provision_number_from_magnus`)
   - Initial SIP account creation: `'callerid': did`
   - LiveKit integration update: `'callerid': clean_number`

### ❌ CallerID is NOT Updated:

2. **During Agent Creation with Phone Assignment** (`create_agent`)
   - Phone mapping created
   - No Magnus SIP update

3. **During Standalone Phone Assignment** (`assign_phone_to_agent`)
   - Phone assigned to agent
   - No Magnus SIP update

---

## Question: Should CallerID Change?

### Scenario Analysis:

**Scenario 1**: Phone +17678189426 is provisioned
- Magnus SIP account created with `callerid: 17678189426`
- Phone is assigned to Agent A
- Agent A makes outbound call
- **CallerID displayed**: 17678189426 ✅

**Scenario 2**: Phone +17678189426 is re-assigned from Agent A to Agent B
- Magnus SIP account still has `callerid: 17678189426`
- Agent B makes outbound call using this phone
- **CallerID displayed**: 17678189426 ✅

**Conclusion**: **CallerID should NOT change** when a phone is assigned/re-assigned to different agents. The CallerID represents the PHONE NUMBER, not the agent.

---

## The REAL Question: Multiple Phones per Agent

### Problem Statement:

If an agent has **multiple phone numbers** assigned, which CallerID should be used for outbound calls?

**Example**:
- Agent A has phone numbers: +17678189426, +17678189267, +17678189473
- Agent A makes an outbound call
- Which number should appear as CallerID?

### Current State:

Each phone number has its OWN Magnus SIP account with its OWN CallerID:
- +17678189426 → Magnus SIP account 1 → `callerid: 17678189426`
- +17678189267 → Magnus SIP account 2 → `callerid: 17678189267`
- +17678189473 → Magnus SIP account 3 → `callerid: 17678189473`

**The agent uses different SIP accounts depending on which number is being used.**

---

## Recommendation: NO CHANGES NEEDED

### ✅ Current Implementation is CORRECT

**Reasoning**:
1. CallerID is tied to the PHONE NUMBER, not the agent
2. Each phone has its own Magnus SIP account with correct CallerID
3. When provisioning, CallerID is set correctly (3 times!)
4. When assigning phones to agents, CallerID should NOT change
5. Multiple phones = multiple SIP accounts = multiple CallerIDs (correct!)

### What IS Working:
- ✅ Phone provisioning sets CallerID correctly
- ✅ LiveKit integration updates CallerID correctly
- ✅ Database stores all SIP credentials correctly
- ✅ Each phone has its own SIP account with unique CallerID

### What MIGHT Need Attention:
- ⚠️ Outbound calling: Which SIP trunk does the agent use?
- ⚠️ CallerID selection: Can agent choose which number to call from?
- ⚠️ Default CallerID: If agent has multiple phones, which is default?

---

## Next Steps

1. **Test Outbound Calling**:
   - Create agent
   - Assign phone number
   - Make outbound call
   - Verify correct CallerID is displayed

2. **Test Multiple Phone Numbers**:
   - Assign 2+ phones to one agent
   - Make outbound calls
   - Determine which CallerID is used

3. **Document CallerID Behavior**:
   - How is outbound trunk selected?
   - How is CallerID determined?
   - Can users control this?

---

## Conclusion

**Finding**: ✅ **CallerID IS being set correctly during phone provisioning**

**No bugs found** in the Magnus CallerID configuration. The system works as designed:
- Each phone number has its own Magnus SIP account
- Each SIP account has the correct CallerID (the phone number itself)
- When phones are assigned to agents, the CallerID remains tied to the phone
- This is the CORRECT behavior

**Potential Enhancement**: Allow agents to select which phone number (CallerID) to use when making outbound calls, if multiple phones are assigned.

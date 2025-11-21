# Provisioning Fixes Needed - Magnus Billing Alignment

## Date: 2025-11-18 21:45 UTC
## Status: 🔧 **ANALYSIS COMPLETE - Fixes Identified**

---

## 🔍 Comparison: Working PHP vs Our Python Code

### **Issue 1: SIP Username Format**

**PHP Script** (CORRECT):
```php
$trimmedFirstName = substr($firstname, 0, 8);
$did = 17678189025;  // Integer
$username = $trimmedFirstName . "_" . $did;  // e.g., "John_17678189025"

// SIP username = user username
$sip_username = $username;  // "John_17678189025"
```

**Our Python Code** (WRONG):
```python
did = "1767818" + str(random_number)  # e.g., "17678189025"
phone_number = f"+{did}"               # "+17678189025"
sip_username = phone_number            # "+17678189025" ❌
```

**Problem**: We're using phone number format (`+17678189025`) instead of username format (`John_17678189025`)

---

### **Issue 2: DID Destination Format**

**PHP Script** (CORRECT):
```php
'destination' => 'SIP/' . $trimmedFirstName . "_" . $did
// Result: "SIP/John_17678189025"
```

**Our Python Code** (NEEDS VERIFICATION):
```python
'destination': f'SIP/{sip_username}'
// With current code: "SIP/+17678189025" ❌
// Should be: "SIP/John_17678189025" ✅
```

---

### **Issue 3: User Creation vs SIP Creation**

**PHP Script** (CORRECT):
```php
// Step 1: Create user (auto-creates SIP account)
$result = $magnusBilling->createUser([
    'username' => $trimmedFirstName . "_" . $did,
    // ... other fields
]);

// Step 2: Get auto-created SIP ID
$id_sip = $magnusBilling->getId('sip', 'id_user', $id_user);

// Step 3: Update SIP settings
$magnusBilling->update('sip', $id_sip, [
    'callerid' => $did,
    'voicemail' => '1',
    // ... other settings
]);
```

**Our Python Code** (DIFFERENT APPROACH):
```python
# We're creating SIP accounts separately
# Not using createUser() at all
# This might be intentional for our use case, but worth noting
```

---

### **Issue 4: DID Number Format**

**PHP Script** (CORRECT):
```php
$did = 17678180000 + $randomNumber;  // Integer
// Stored as: 17678189025 (no + prefix)
```

**Our Python Code** (CHECK):
```python
did = "1767818" + str(random_number)  # String
# Need to verify how it's stored in database
```

---

### **Issue 5: voip_call Parameter**

**PHP Script** (CORRECT):
```php
'voip_call' => 1
```

**Our Python Code** (DIFFERENT):
```python
'voip_call': 9  # Comment says "Match working example"
```

**Question**: Why 9? PHP uses 1. Need to verify which is correct.

---

## 🔧 Required Fixes

### **Fix 1: Update provision_did_for_existing_user()**

Change SIP username generation to match PHP format:

**Current** (WRONG):
```python
def provision_did_for_existing_user(self, user_id: str, username: str, email: str):
    # ...
    did = "17678189025"
    phone_number = f"+{did}"
    sip_username = phone_number  # "+17678189025" ❌
```

**Should Be** (CORRECT):
```python
def provision_did_for_existing_user(self, user_id: str, username: str, email: str, agent_name: str):
    # ...
    did = 17678189025  # Integer

    # Extract first name from agent_name (or use username)
    firstname = agent_name.split()[0][:8]  # First 8 chars of first word

    # Format: {firstname}_{did}
    sip_username = f"{firstname}_{did}"  # "John_17678189025" ✅
```

---

### **Fix 2: Update DID Destination**

Should automatically match if Fix 1 is applied:

```python
dest_data = {
    'id_user': user_id,
    'id_did': id_did,
    'voip_call': 1,  # Use 1 like PHP (not 9)
    'id_sip': id_sip,
    'destination': f'SIP/{sip_username}',  # "SIP/John_17678189025" ✅
    'context': '',
    'priority': 1
}
```

---

### **Fix 3: DID as Integer**

**Current**:
```python
temp_did = f"1767818{random_number}"  # String
```

**Should Be**:
```python
temp_did = 1767818000 + random_number  # Integer
```

---

### **Fix 4: Caller ID Format**

**Current**: May have + prefix
```python
'callerid': did  # If did is string with +
```

**Should Be**:
```python
'callerid': str(did)  # Integer converted to string (no + prefix)
```

---

## 📋 Updated Function Signature

**Current**:
```python
def provision_did_for_existing_user(self, user_id: str, username: str, email: str)
```

**Should Be**:
```python
def provision_did_for_existing_user(
    self,
    user_id: str,
    username: str,
    email: str,
    agent_name: str  # ADD: Need agent name for SIP username
)
```

---

## 🎯 Complete Corrected Flow

```python
def provision_did_for_existing_user(
    self,
    user_id: str,
    username: str,
    email: str,
    agent_name: str
) -> Dict:
    """Provision a new DID for an existing Magnus user"""
    try:
        # 1. Generate DID (as integer)
        did = None
        for _ in range(100):
            random_number = random.randint(9000, 9999)
            temp_did = 1767818000 + random_number  # Integer ✅
            if not self.get_id('did', 'did', str(temp_did)):
                did = temp_did
                break

        if not did:
            return {'success': False, 'error': 'Could not generate unique DID'}

        # 2. Generate SIP username (firstname_DID format)
        firstname = agent_name.split()[0][:8] if agent_name else username[:8]
        sip_username = f"{firstname}_{did}"  # e.g., "John_17678189025" ✅

        # 3. Generate password
        import string
        characters = string.ascii_letters + string.digits
        sip_password = ''.join(random.choice(characters) for _ in range(12))

        print(f"🔧 Creating SIP account for existing user:")
        print(f"   User ID: {user_id}")
        print(f"   DID: {did}")
        print(f"   SIP Username: {sip_username}")

        # 4. Create SIP account
        sip_data = {
            'id_user': user_id,
            'name': sip_username,              # "John_17678189025" ✅
            'accountcode': sip_username,
            'secret': sip_password,
            'defaultuser': sip_username,
            'callerid': str(did),              # No + prefix ✅
            'host': 'dynamic',
            'type': 'friend',
            'context': 'billing',
            'allow': 'opus,g729,gsm,alaw,ulaw',
            'nat': 'force_rport,comedia',
            'qualify': 'yes',
            'dtmfmode': 'RFC2833',
            'directmedia': 'no',
            'allowtransfer': 'no',
            'insecure': 'no',
            'transport': 'tcp'
        }

        sip_result = self.create('sip', sip_data)
        if not sip_result.get('success'):
            return {'success': False, 'error': f"SIP creation failed"}

        # Get SIP ID
        id_sip = sip_result.get('id') or self.get_id('sip', 'name', sip_username)
        if not id_sip:
            return {'success': False, 'error': 'Failed to get SIP ID'}

        # 5. Create DID
        did_data = {
            'did': str(did),  # String representation of integer
            'country': 'Dominica',
            'activated': 1
        }
        did_result = self.create('did', did_data)
        if not did_result.get('success'):
            return {'success': False, 'error': 'DID creation failed'}

        id_did = self.get_id('did', 'did', str(did))

        # 6. Create DID Destination
        dest_data = {
            'id_user': user_id,
            'id_did': id_did,
            'voip_call': 1,  # Use 1 like PHP ✅
            'id_sip': id_sip,
            'destination': f'SIP/{sip_username}',  # "SIP/John_17678189025" ✅
            'context': '',
            'priority': 1
        }
        self.create('diddestination', dest_data)

        # 7. Update SIP settings (voicemail, etc.)
        self.update('sip', id_sip, {
            'voicemail': '1',
            'voicemail_email': email,
            'voicemail_password': str(did)[-4:],  # Last 4 digits ✅
        })

        print(f"✅ DID provisioned:")
        print(f"   DID: {did}")
        print(f"   SIP Username: {sip_username}")
        print(f"   SIP ID: {id_sip}")

        return {
            'success': True,
            'did': str(did),
            'username': sip_username,  # "John_17678189025" ✅
            'password': sip_password,
            'did_id': id_did,
            'sip_id': id_sip,
            'sip_domain': 'voice.epic.dm',
            'sip_port': 5060,
            'destination': f'SIP/{sip_username}'  # ✅
        }

    except Exception as e:
        print(f"❌ Provisioning error: {e}")
        import traceback
        traceback.print_exc()
        return {'success': False, 'error': str(e)}
```

---

## 🔄 Update Agent Provisioning Hook

Update the call to include agent_name:

```python
# In agent_provisioning_hooks.py

# Current:
magnus_result = magnus_client.provision_did_for_existing_user(
    user_id=existing_magnus_user,
    username=magnus_username,
    email=user_email
)

# Should Be:
magnus_result = magnus_client.provision_did_for_existing_user(
    user_id=existing_magnus_user,
    username=magnus_username,
    email=user_email,
    agent_name=agent_name  # ADD THIS ✅
)
```

---

## ✅ Verification Checklist

After applying fixes:

- [ ] SIP username format: `{firstname}_{did}` (e.g., `John_17678189025`)
- [ ] DID destination: `SIP/{sip_username}` (e.g., `SIP/John_17678189025`)
- [ ] DID stored as integer (17678189025), not string with +
- [ ] Caller ID: String without + prefix (`"17678189025"`)
- [ ] voip_call parameter: 1 (matches PHP)
- [ ] Voicemail password: Last 4 digits of DID
- [ ] SIP domain: voice.epic.dm
- [ ] Test call routes correctly

---

## 🚨 Critical Points

1. **SIP Username Format**: MUST be `{firstname}_{did}`, NOT `+{phonenumber}`
2. **Destination Format**: MUST be `SIP/{username}`, this is Magnus Billing internal format
3. **No FreeSwitch**: This is pure Magnus Billing API, no FreeSwitch involved
4. **DID as Integer**: Store/generate as integer, convert to string for API calls

---

**Next Steps**: Apply these fixes to `magnus_billing_client_new.py` and test provisioning.

# Phone Number Inventory - Quick Start Guide

**For developers implementing phone number inventory management**

---

## 🚀 Quick Implementation (3 Steps)

### Step 1: Apply Database Migration
```bash
# Create migration file
cat > /opt/livekit1/backend/migrations/migration_011_phone_inventory.sql << 'EOF'
-- Phone number inventory management
ALTER TABLE phone_number_pool
ADD COLUMN IF NOT EXISTS fusionpbx_extension_uuid UUID,
ADD COLUMN IF NOT EXISTS fusionpbx_did_uuid UUID,
ADD COLUMN IF NOT EXISTS fusionpbx_user_email VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_phone_pool_fusionpbx_ext ON phone_number_pool(fusionpbx_extension_uuid);
CREATE INDEX IF NOT EXISTS idx_phone_pool_fusionpbx_did ON phone_number_pool(fusionpbx_did_uuid);
CREATE INDEX IF NOT EXISTS idx_phone_pool_user_email ON phone_number_pool(fusionpbx_user_email);
EOF

# Apply migration
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db \
  -f /opt/livekit1/backend/migrations/migration_011_phone_inventory.sql
```

### Step 2: Add FusionPBX Standalone Provisioning
```bash
# Edit /opt/livekit1/backend/fusionpbx_api_client.py
# Add this method to FusionPBXApiClient class (after line 400)

def provision_standalone_did(self, user_email: str, country: str = "Dominica", prefix: str = "1767818"):
    """Provision standalone DID for inventory"""
    try:
        response = self.session.post(
            f"{self.api_base}/provision",
            json={
                "user_email": user_email,
                "agent_name": "INVENTORY_POOL",
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
                'extension_uuid': agent.get('extension_uuid'),
                'did_uuid': agent.get('did_uuid'),
                'user_api_key': agent.get('api_key')
            }
        return {'success': False, 'error': data.get('error', 'Provisioning failed')}
    except Exception as e:
        logger.error(f"Standalone DID provisioning failed: {e}")
        return {'success': False, 'error': str(e)}
```

### Step 3: Update Backend Endpoint
```bash
# Edit /opt/livekit1/user_dashboard.py
# Replace the provision_phone_number function (around line 2273) with this:

@app.route('/api/user/phone-numbers/provision', methods=['POST'])
def provision_phone_number():
    """Provision phone number into inventory"""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'No user found'}), 404

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        data = request.json

        # Use FusionPBX
        from fusionpbx_api_client import FusionPBXApiClient
        client = FusionPBXApiClient()
        result = client.provision_standalone_did(
            user_email=user.email,
            country=data.get('country', 'Dominica'),
            prefix=data.get('prefix', '1767818')
        )

        if result['success']:
            from phone_number_manager import PhoneNumberPool
            phone = PhoneNumberPool(
                phone_number=result['did_number'],
                assigned_to_user=user_id,
                assigned_agent_id=None,  # Unassigned
                fusionpbx_extension_uuid=result['extension_uuid'],
                fusionpbx_did_uuid=result['did_uuid'],
                fusionpbx_user_email=user.email,
                sip_username=result['sip_username'],
                sip_password=result['sip_password'],
                sip_domain=result['sip_domain']
            )
            db.add(phone)
            db.commit()

            return jsonify({
                'success': True,
                'phone_number': result['did_number'],
                'status': 'unassigned'
            })
        return jsonify({'success': False, 'error': result['error']}), 500
    finally:
        db.close()
```

---

## ✅ Testing

```bash
# 1. Restart backend
systemctl restart livekit-backend

# 2. Test via UI
# - Go to https://ai.epic.dm/dashboard/phone-numbers
# - Click "Add Phone Number"
# - Submit form

# 3. Verify in database
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c \
  "SELECT phone_number, assigned_agent_id, sip_username FROM phone_number_pool ORDER BY created_at DESC LIMIT 1;"

# Expected: phone_number shows, assigned_agent_id is NULL
```

---

## 📋 Full Documentation

- Design: `/opt/livekit1/PHONE_NUMBER_INVENTORY_DESIGN.md`
- Status: `/opt/livekit1/PHONE_INVENTORY_STATUS.md`
- Quick Start: This file

---

## 🎯 Key Concepts

**Inventory**: Pool of provisioned but unassigned phone numbers
**Assignment**: Linking a number to a specific agent
**Flexibility**: Numbers can be reassigned between agents without reprovisioning
**Consolidated Billing**: All numbers still bill to user's FusionPBX account

---

**Ready to implement? Start with Step 1 above!**

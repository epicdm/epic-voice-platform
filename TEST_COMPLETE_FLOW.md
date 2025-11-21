# Complete Voice Agent Flow - Testing Guide

## ✅ System Status
- Magnus Billing Integration: **WORKING**
- Agent Creation: **WORKING**
- Phone Assignment: **WORKING**
- SIP Inbound Routing: **WORKING**

## 🔄 Complete Flow

```
1. User creates AI agent
   ↓
2. User provisions phone number from Magnus
   ↓
3. User assigns number to agent
   ↓
4. Incoming call arrives at Magnus Billing
   ↓
5. Magnus routes to LiveKit SIP trunk
   ↓
6. LiveKit triggers webhook → /api/sip/inbound
   ↓
7. System looks up agent for number
   ↓
8. Creates LiveKit room
   ↓
9. Agent process joins room
   ↓
10. Call connected!
```

## 📋 Step-by-Step Test

### Step 1: Create an Agent
```bash
curl -X POST http://localhost:5001/api/user/agents \
  -H "Content-Type: application/json" \
  -H "X-User-Email: YOUR_EMAIL@example.com" \
  -d '{
    "name": "Customer Support",
    "instructions": "You are a helpful customer support agent. Be friendly and professional.",
    "description": "Handles customer inquiries",
    "temperature": 0.7,
    "llm_model": "gpt-4o-mini",
    "voice": "alloy"
  }'
```

**Expected Output:**
```json
{
  "success": true,
  "agent_id": "abc-123-def",
  "files_created": true
}
```

### Step 2: Provision Phone Number from Magnus
```bash
curl -X POST http://localhost:5001/api/user/phone-numbers/provision \
  -H "Content-Type: application/json" \
  -H "X-User-Email: YOUR_EMAIL@example.com" \
  -d '{
    "use_magnus": true,
    "country": "Dominica",
    "prefix": "1767818"
  }'
```

**Expected Output:**
```json
{
  "success": true,
  "phone_number": "+17678189XXX",
  "provider": "magnus",
  "message": "Phone number provisioned from Magnus Billing"
}
```

### Step 3: Assign Number to Agent
```bash
curl -X POST http://localhost:5001/api/user/phone-numbers/+17678189XXX/assign \
  -H "Content-Type: application/json" \
  -H "X-User-Email: YOUR_EMAIL@example.com" \
  -d '{
    "agent_id": "abc-123-def"
  }'
```

**Expected Output:**
```json
{
  "success": true,
  "message": "Phone number assigned to Customer Support"
}
```

### Step 4: Test SIP Inbound Routing
```bash
curl -X POST http://localhost:5001/api/sip/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+17671234567",
    "to": "+17678189XXX"
  }'
```

**Expected Output:**
```json
{
  "action": "route",
  "agent": "Customer Support",
  "room_name": "customer_support_abc123"
}
```

### Step 5: Verify Agent Files
```bash
ls -la /opt/livekit1/agents/
```

Should show:
```
customer_support/
  agent.py
  entrypoint.sh
```

## 🔧 Configuration Required

### 1. Magnus Billing SIP Settings
Configure the DID in Magnus Billing:
- **DID**: Your provisioned number (e.g., 17678189360)
- **Destination**: `SIP/{username}` (already configured by API)
- **Activated**: Yes
- **Country**: Dominica

### 2. LiveKit SIP Trunk (Inbound)
Create inbound SIP trunk in LiveKit dashboard:
- **Name**: Magnus Billing Inbound
- **Host**: voice.epic.dm
- **Port**: 5060
- **Transport**: TCP/UDP
- **Auth**: Check Magnus requirements

### 3. LiveKit Dispatch Rules
Configure dispatch rules in LiveKit:
- **Webhook URL**: `https://YOUR_SERVER/api/sip/inbound`
- **Method**: POST
- **Payload**: Include `from` and `to` numbers

## 🐛 Troubleshooting

### Issue: "No agent found for number"
**Solution**: Verify phone mapping:
```bash
curl http://localhost:5001/api/user/phone-numbers \
  -H "X-User-Email: YOUR_EMAIL@example.com" | jq
```

### Issue: "Magnus provisioning failed"
**Solution**: Check Magnus API credentials in `.env`:
```bash
grep MAGNUS /opt/livekit1/.env
```

### Issue: Agent doesn't join room
**Solution**: 
1. Check agent process is running
2. Verify LiveKit credentials
3. Check agent files exist

## 📊 Monitoring

### Check Backend Logs
```bash
tail -f /opt/livekit1/backend_live.log
```

### Check Agent Status
```bash
curl http://localhost:5001/api/user/agents \
  -H "X-User-Email: YOUR_EMAIL@example.com" | jq
```

### Check Phone Mappings
```bash
sqlite3 /opt/livekit1/voice_agents.db \
  "SELECT pm.phone_number, ac.name FROM phone_mappings pm 
   JOIN agent_configs ac ON pm.agent_config_id = ac.id 
   WHERE pm.is_active = 1;"
```

## ✨ Success Indicators

✅ Agent created in database  
✅ Phone number provisioned in Magnus  
✅ Number appears in LiveKit  
✅ Phone mapping is active  
✅ SIP webhook returns routing info  
✅ Agent process connects to room  
✅ Call audio flows bidirectionally  

## 🎯 Next Steps

1. **Deploy Agent Process**: Ensure agent is running to handle calls
2. **Configure Magnus Webhook**: Point Magnus to your server's SIP endpoint
3. **Test Real Call**: Make actual phone call to verify end-to-end
4. **Monitor & Scale**: Add logging, metrics, and auto-scaling

## 📞 Support

If you encounter issues:
1. Check all credentials in `.env`
2. Verify network connectivity to Magnus Billing
3. Review backend logs for errors
4. Test each component individually

# FreeSWITCH Auto-Provisioning API Documentation

**Version**: 1.0.0
**Base URL**: `https://ai.epic.dm/api/freeswitch`
**Date**: November 16, 2025

---

## Overview

The FreeSWITCH Auto-Provisioning API provides automated DID (Direct Inward Dialing) routing management for AI voice agents. When users create AI agents in the platform, DIDs are automatically provisioned on the FreeSWITCH server to route incoming calls to the appropriate LiveKit AI agent.

### Key Features

- **Automatic Provisioning**: DIDs are automatically provisioned when AI agents are created with phone numbers
- **Lifecycle Management**: DIDs are automatically deprovisioned when agents are deleted
- **SSH-Based**: Uses SSH/Paramiko to execute FreeSWITCH CLI commands remotely
- **No Event Socket Required**: Works without direct Event Socket access
- **Integrated Hooks**: Seamlessly integrated into agent CRUD operations

---

## Architecture

```
User Creates AI Agent
        ↓
LiveKit Backend (user_dashboard.py)
        ↓
agent_provisioning_hooks.py
        ↓
freeswitch_provisioning.py
        ↓
SSH → FreeSWITCH Server (24.199.103.153)
        ↓
Create Dialplan XML → Reload Config
        ↓
DID Ready to Route Calls
```

---

## API Endpoints

### 1. Health Check

**GET** `/api/freeswitch/health`

Check if FreeSWITCH provisioner is connected and healthy.

**Response**:
```json
{
  "success": true,
  "status": "healthy",
  "provisioner": "connected"
}
```

**Status Codes**:
- `200 OK`: Provisioner is healthy
- `503 Service Unavailable`: Provisioner is disconnected

---

### 2. Provision DID

**POST** `/api/freeswitch/provision`

Provision DID routing for an AI agent.

**Request Body**:
```json
{
  "phone_number": "+17678189426",
  "agent_config_id": 1,
  "agent_name": "Customer Support AI"
}
```

**Response**:
```json
{
  "success": true,
  "did": "+17678189426",
  "clean_did": "17678189426",
  "agent_config_id": 1,
  "filepath": "/etc/freeswitch/dialplan/public/050_livekit_17678189426.xml",
  "route_verified": true,
  "message": "DID +17678189426 routed to LiveKit"
}
```

**What It Does**:
1. Creates FreeSWITCH dialplan XML file
2. Configures DID to route to LiveKit SIP domain (3m4yki5jezn.sip.livekit.cloud)
3. Reloads FreeSWITCH configuration
4. Verifies routing is active

**Status Codes**:
- `200 OK`: Provisioning successful
- `400 Bad Request`: Missing phone_number
- `500 Internal Server Error`: Provisioning failed

---

### 3. Deprovision DID

**POST** `/api/freeswitch/deprovision`

Remove DID routing (called when agent is deleted or phone number unassigned).

**Request Body**:
```json
{
  "phone_number": "+17678189426"
}
```

**Response**:
```json
{
  "success": true,
  "did": "+17678189426",
  "message": "DID +17678189426 routing removed"
}
```

**What It Does**:
1. Removes FreeSWITCH dialplan XML file
2. Reloads FreeSWITCH configuration
3. Frees DID for reassignment

**Status Codes**:
- `200 OK`: Deprovisioning successful
- `400 Bad Request`: Missing phone_number
- `500 Internal Server Error`: Deprovisioning failed

---

### 4. List Provisioned DIDs

**GET** `/api/freeswitch/dids`

Get list of all DIDs currently provisioned for LiveKit routing.

**Response**:
```json
{
  "success": true,
  "dids": ["+17678189426", "+17678189267"],
  "count": 2
}
```

**Status Codes**:
- `200 OK`: List retrieved successfully
- `500 Internal Server Error`: Failed to retrieve list

---

### 5. Verify DID Routing

**GET** `/api/freeswitch/verify/<phone_number>`

Verify that DID routing is configured correctly.

**Example**: `/api/freeswitch/verify/+17678189426`

**Response**:
```json
{
  "success": true,
  "did": "+17678189426",
  "routing_configured": true
}
```

**Status Codes**:
- `200 OK`: Verification complete
- `500 Internal Server Error`: Verification failed

---

### 6. Get Active Calls

**GET** `/api/freeswitch/active-calls`

Get currently active calls on the FreeSWITCH server.

**Response**:
```json
{
  "success": true,
  "calls": [
    {
      "uuid": "abc123",
      "caller_id_number": "17678189426",
      "destination_number": "2000",
      "duration": 120
    }
  ],
  "count": 1
}
```

**Status Codes**:
- `200 OK`: Calls retrieved successfully
- `500 Internal Server Error`: Failed to get calls

---

### 7. Reload Configuration

**POST** `/api/freeswitch/reload`

Manually reload FreeSWITCH configuration (usually not needed - automatic).

**Response**:
```json
{
  "success": true,
  "message": "FreeSWITCH configuration reloaded"
}
```

**Status Codes**:
- `200 OK`: Reload successful
- `500 Internal Server Error`: Reload failed

---

## Integration with Agent Lifecycle

### Automatic Provisioning Hooks

The provisioning system is automatically integrated into the agent lifecycle:

#### 1. Agent Creation (`POST /api/user/agents`)

When a user creates an AI agent with a phone number:

```python
# user_dashboard.py:765-775
provisioning_result = on_agent_created(
    agent_config_id=agent.id,
    agent_name=data['name'],
    phone_number=phone.phoneNumber
)
if provisioning_result['success']:
    print(f"✅ FreeSWITCH DID {phone.phoneNumber} provisioned for agent {data['name']}")
```

**What Happens**:
1. Agent created in database
2. Phone number assigned to agent
3. **FreeSWITCH DID automatically provisioned** ← New!
4. Agent ready to receive calls

#### 2. Agent Deletion (`DELETE /api/user/agents/<agent_id>`)

When a user deletes an AI agent:

```python
# user_dashboard.py:913-917
deprovision_result = on_agent_deleted(
    agent_config_id=agent.id,
    agent_name=agent.name,
    phone_number=mapping.phoneNumber
)
```

**What Happens**:
1. Phone mappings retrieved
2. **FreeSWITCH DIDs automatically deprovisioned** ← New!
3. Agent marked inactive in database

#### 3. Agent Update (Future)

Phone number changes will trigger re-provisioning:

```python
on_agent_updated(
    agent_config_id=agent_id,
    old_phone_number="+17678189426",
    new_phone_number="+17678189267"
)
```

---

## Technical Implementation

### File Structure

```
/opt/livekit1/backend/
├── freeswitch_provisioning.py    # Core provisioning service
├── freeswitch_routes.py           # Flask API routes
├── agent_provisioning_hooks.py   # Lifecycle hooks
└── user_dashboard.py              # Main Flask app (integration)
```

### Provisioning Flow

**1. FreeSWITCHProvisioner Class** (`freeswitch_provisioning.py`):
- Manages SSH connection to FreeSWITCH server
- Creates/removes dialplan XML files
- Reloads FreeSWITCH configuration
- Verifies routing

**2. Flask API Routes** (`freeswitch_routes.py`):
- REST API endpoints for provisioning operations
- Registered as blueprint: `app.register_blueprint(freeswitch_bp)`

**3. Lifecycle Hooks** (`agent_provisioning_hooks.py`):
- `on_agent_created()`: Provision DID when agent created
- `on_agent_updated()`: Re-provision when phone number changes
- `on_agent_deleted()`: Deprovision when agent deleted
- `on_phone_number_assigned()`: Provision when number assigned
- `on_phone_number_unassigned()`: Deprovision when number unassigned

**4. Integration** (`user_dashboard.py`):
- Hooks called automatically in agent CRUD endpoints
- No manual intervention required

---

## Dialplan XML Structure

When a DID is provisioned, a dialplan XML file is created:

**File**: `/etc/freeswitch/dialplan/public/050_livekit_17678189426.xml`

```xml
<include>
  <extension name="LiveKit_DID_17678189426">
    <condition field="destination_number" expression="^(\+?1?17678189426)$">
      <action application="set" data="call_direction=inbound"/>
      <action application="set" data="accountcode=livekit_17678189426"/>
      <action application="set" data="agent_config_id=1"/>
      <action application="log" data="INFO Routing +17678189426 to LiveKit SIP (Agent ID: 1)"/>
      <action application="bridge" data="sofia/external/17678189426@3m4yki5jezn.sip.livekit.cloud"/>
      <action application="hangup" data="NO_ANSWER"/>
    </condition>
  </extension>
</include>
```

**Key Features**:
- Matches incoming calls to the DID
- Sets call direction and account code
- Logs agent configuration ID
- Bridges to LiveKit SIP domain
- Handles call hangup

---

## Error Handling

All provisioning operations use graceful error handling:

```python
try:
    provisioning_result = on_agent_created(...)
    if provisioning_result['success']:
        print("✅ Provisioned successfully")
    else:
        print(f"⚠️ Provisioning failed: {provisioning_result['error']}")
except Exception as e:
    print(f"⚠️ Provisioning error: {e}")
    # Agent creation continues even if provisioning fails
```

**Design Principle**: Agent creation/deletion should never fail due to provisioning errors. The system logs warnings but continues operation.

---

## Configuration

### SSH Credentials

**Current** (hardcoded in `freeswitch_routes.py:17-22`):
```python
provisioner = FreeSWITCHProvisioner(
    ssh_host="24.199.103.153",
    ssh_user="root",
    ssh_password="TAIOiEajqAl7H9vF4uXN",  # TODO: Move to environment variable
    livekit_sip_domain="3m4yki5jezn.sip.livekit.cloud"
)
```

**Recommended** (move to `.env`):
```bash
FREESWITCH_SSH_HOST=24.199.103.153
FREESWITCH_SSH_USER=root
FREESWITCH_SSH_PASSWORD=TAIOiEajqAl7H9vF4uXN
LIVEKIT_SIP_DOMAIN=3m4yki5jezn.sip.livekit.cloud
```

---

## Testing

### Manual API Tests

**1. Test Health Check**:
```bash
curl http://localhost:5001/api/freeswitch/health
```

**2. Test Provisioning**:
```bash
curl -X POST http://localhost:5001/api/freeswitch/provision \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+17678189426",
    "agent_config_id": 1,
    "agent_name": "Test Agent"
  }'
```

**3. Test List DIDs**:
```bash
curl http://localhost:5001/api/freeswitch/dids
```

**4. Test Deprovisioning**:
```bash
curl -X POST http://localhost:5001/api/freeswitch/deprovision \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+17678189426"}'
```

### Integration Test

**Test Complete Agent Lifecycle**:
1. Create agent with phone number via UI or API
2. Check logs: `sudo journalctl -u livekit-backend.service -f | grep FreeSWITCH`
3. Verify DID provisioned: `curl http://localhost:5001/api/freeswitch/dids`
4. Make test call to the DID
5. Delete agent via UI or API
6. Verify DID deprovisioned: `curl http://localhost:5001/api/freeswitch/dids`

---

## Security Considerations

1. **SSH Credentials**: Move to environment variables (`.env`)
2. **API Authentication**: Consider adding authentication to FreeSWITCH API endpoints
3. **Rate Limiting**: Add rate limiting to prevent abuse
4. **Audit Logging**: Log all provisioning operations for security audit trail

---

## Monitoring

### Logs

**Backend Service Logs**:
```bash
sudo journalctl -u livekit-backend.service -f | grep FreeSWITCH
```

**Expected Output**:
```
✅ FreeSWITCH Provisioning API registered at /api/freeswitch
✅ FreeSWITCH DID +17678189426 provisioned for agent Customer Support AI
✅ FreeSWITCH DID +17678189426 deprovisioned
```

**FreeSWITCH Logs** (on FreeSWITCH server):
```bash
ssh root@24.199.103.153
tail -f /var/log/freeswitch/freeswitch.log | grep -i livekit
```

**Expected Output**:
```
INFO Routing +17678189426 to LiveKit SIP (Agent ID: 1)
sofia/external/17678189426@3m4yki5jezn.sip.livekit.cloud
```

---

## Troubleshooting

### Common Issues

**Issue**: "SSH connection timeout"
- **Solution**: Check FreeSWITCH server is accessible on port 22
- **Command**: `telnet 24.199.103.153 22`

**Issue**: "Provisioning failed: Permission denied"
- **Solution**: Verify SSH credentials are correct
- **File**: `/opt/livekit1/backend/freeswitch_routes.py:20`

**Issue**: "DID not routing calls"
- **Solution**: Verify FreeSWITCH configuration reloaded
- **Command**: `ssh root@24.199.103.153 'fs_cli -x "reloadxml"'`

**Issue**: "Agent created but DID not provisioned"
- **Solution**: Check backend logs for provisioning errors
- **Command**: `sudo journalctl -u livekit-backend.service -n 100 | grep -A5 "Provisioning"`

---

## Roadmap

### Future Enhancements

- [ ] Move SSH credentials to environment variables
- [ ] Add authentication to FreeSWITCH API endpoints
- [ ] Add rate limiting to API endpoints
- [ ] Implement audit logging for compliance
- [ ] Add webhook notifications for provisioning events
- [ ] Support bulk provisioning operations
- [ ] Add provisioning status dashboard
- [ ] Implement automatic retry on provisioning failures
- [ ] Add support for multiple FreeSWITCH servers
- [ ] Create Swagger/OpenAPI documentation

---

## Support

For issues or questions about the FreeSWITCH provisioning system:

- **Documentation**: `/opt/livekit1/backend/FREESWITCH_API_DOCUMENTATION.md` (this file)
- **Integration Guide**: `/opt/livekit1/backend/FREESWITCH_INTEGRATION_GUIDE.md`
- **Provisioning Code**: `/opt/livekit1/backend/freeswitch_provisioning.py`
- **API Routes**: `/opt/livekit1/backend/freeswitch_routes.py`
- **Lifecycle Hooks**: `/opt/livekit1/backend/agent_provisioning_hooks.py`

---

## Changelog

**v1.0.0** (November 16, 2025):
- Initial release
- SSH-based provisioning system
- REST API endpoints
- Automatic lifecycle hooks
- Integration with agent CRUD operations
- Health check and monitoring endpoints

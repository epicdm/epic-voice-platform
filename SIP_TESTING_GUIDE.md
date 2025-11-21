# SIP Testing Guide for LiveKit Voice Agents

This guide explains how to test your SIP-enabled voice agents with phone numbers.

## 🎯 Overview

Your platform now supports:
- ✅ **Multi-tenant voice agents** - Each phone number routes to a specific agent configuration
- ✅ **SIP trunk integration** - Connect phone numbers via LiveKit SIP
- ✅ **Database-driven routing** - Phone numbers mapped to agents in database
- ✅ **Call logging** - All calls tracked with duration and cost
- ✅ **Web testing interface** - Test configurations before making real calls

## 📋 Architecture

```
Incoming Call (SIP)
    ↓
LiveKit SIP Trunk
    ↓
multi_tenant_agent.py
    ↓
Database Lookup (phone → agent)
    ↓
Load Agent Config (instructions, voice, model)
    ↓
Start Voice Session
    ↓
Log Call to Database
```

## 🚀 Quick Start

### 1. Start Your Services

```bash
# Terminal 1: Start Flask Backend
cd /opt/livekit1
uv run python user_dashboard.py

# Terminal 2: Start Frontend
cd /opt/livekit1/frontend
npm run dev

# Terminal 3: Start Multi-Tenant Agent
cd /opt/livekit1
uv run python multi_tenant_agent.py dev
```

### 2. Configure a Phone Number

1. Go to http://localhost:3001/agents
2. Click "Edit" on an agent
3. Add a phone number in the "Phone Numbers" section
4. Click "Add" to save

### 3. Test the Configuration

1. Go to http://localhost:3001/phone-test
2. Find your phone number in the list
3. Click "Test Configuration"
4. Verify the agent details are correct

## 📞 Testing Methods

### Method 1: Web Interface Test (No Real Call)

**Purpose:** Verify routing configuration without making a call

1. Navigate to **Phone Test** page
2. Click **"Test Configuration"** for any number
3. Review the test results:
   - ✅ **Success**: Agent found and configuration loaded
   - ❌ **Failed**: Check phone number mapping or agent assignment

**What It Tests:**
- Phone number is in database
- Phone number is mapped to an agent
- Agent configuration can be loaded
- SIP trunk ID is set (if applicable)

### Method 2: Real SIP Call Test (Inbound)

**Purpose:** Test actual voice interaction with incoming calls

**Prerequisites:**
- LiveKit Cloud account with SIP configured
- SIP trunk connected in LiveKit console
- Phone number provisioned and routed
- Agent running (`multi_tenant_agent.py`)

**Steps:**
1. Call your configured phone number
2. Agent should answer with configured voice
3. Agent uses instructions from database
4. Call is logged to database
5. Check Call Logs page for call record

### Method 3: Outbound Call Test

**Purpose:** Test agent-initiated calls to external phone numbers

**Prerequisites:**
- LiveKit Cloud account with SIP outbound trunk configured
- Agent running (`multi_tenant_agent.py`)
- LiveKit CLI installed (for dispatching the actual call)

**Steps:**

1. **Initiate the Call via Web UI:**
   - Go to **Agents** page or **Phone Test** page
   - Click **"Test Outbound Call"** button
   - Enter the destination phone number (e.g., `+15551234567`)
   - Optionally enter a caller ID (from number)
   - Click **"Initiate Call"**

2. **The system will:**
   - Create a unique room for the call
   - Log the call attempt to the database
   - Return a room name and instructions

3. **Dispatch the actual call using LiveKit CLI:**
   ```bash
   lk sip create-dispatch \
     --to "+15551234567" \
     --from "+15559990000" \
     --room "outbound-call-<uuid>" \
     --trunk-id "your-trunk-id"
   ```

4. **When the call is answered:**
   - Your agent will automatically join the room
   - The agent will greet the recipient
   - Conversation proceeds using your agent's configuration
   - Call is logged with duration and cost

**Important Notes:**
- The web UI creates the room and logs the call
- You must use LiveKit CLI or API to actually dial the number
- The agent must be running to join the room when the call connects
- LiveKit SIP outbound trunk must be configured in LiveKit Cloud console

## 🔧 Configuration Files

### Environment Variables (`.env`)

```bash
# LiveKit Configuration
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# OpenAI Configuration (for LLM and TTS)
OPENAI_API_KEY=sk-...

# Deepgram Configuration (for STT)
DEEPGRAM_API_KEY=...

# Database
DATABASE_URL=sqlite:///./voice_agents.db
```

### Database Schema

**phone_mappings table:**
- `id`: UUID
- `user_id`: Links to users table
- `agent_config_id`: Links to agent_configs table
- `phone_number`: The phone number (e.g., "+15551234567")
- `sip_trunk_id`: Optional SIP trunk identifier
- `is_active`: Boolean

## 🎤 How Multi-Tenant Agent Works

The `multi_tenant_agent.py` file handles incoming calls:

1. **Call Received**: Agent joins room when call arrives
2. **Extract Phone Number**: Gets phone from SIP participant identity
3. **Database Lookup**: Queries `phone_mappings` table
4. **Load Config**: Fetches agent configuration from database
5. **Create Session**: Sets up STT, LLM, TTS with user's config
6. **Start Conversation**: Greets caller and starts voice chat
7. **Log Call**: Records start time, duration, cost to database

## 🧪 Testing Scenarios

### Scenario 1: Basic Agent Test

```
Phone: +15551234567
Agent: Customer Support Agent
Expected: Agent answers with "Customer Support Agent" personality
```

### Scenario 2: Multiple Numbers, Different Agents

```
Phone 1: +15551111111 → Agent A (Sales)
Phone 2: +15552222222 → Agent B (Support)
Expected: Each number routes to correct agent personality
```

### Scenario 3: Same Agent, Multiple Numbers

```
Phone 1: +15551111111 → Agent A
Phone 2: +15552222222 → Agent A
Expected: Both route to same agent configuration
```

### Scenario 4: Unmapped Phone Number

```
Phone: +15559999999 (not in database)
Expected: Uses default configuration from environment variables
```

## 📊 Testing Checklist

### Inbound Call Testing

Before making a real inbound call, verify:

- [ ] Flask backend is running on port 5001
- [ ] Frontend is running on port 3001
- [ ] Agent script is running (`multi_tenant_agent.py`)
- [ ] Phone number is added to database
- [ ] Phone number is mapped to an agent
- [ ] Agent has instructions configured
- [ ] Agent has voice and model selected
- [ ] LiveKit credentials are in `.env`
- [ ] LiveKit SIP trunk is configured (for real calls)

### Outbound Call Testing

Before testing outbound calls, verify:

- [ ] Flask backend is running on port 5001
- [ ] Frontend is running on port 3001
- [ ] Agent script is running (`multi_tenant_agent.py`)
- [ ] Agent has instructions configured
- [ ] Agent has voice and model selected
- [ ] LiveKit credentials are in `.env`
- [ ] LiveKit SIP outbound trunk is configured in LiveKit console
- [ ] LiveKit CLI is installed (`lk --version`)
- [ ] You have the trunk ID from LiveKit console

## 🐛 Troubleshooting

### Phone Test Shows "Phone number not found"

**Cause:** Phone number not in database or not active

**Fix:**
1. Go to Agents page
2. Edit agent
3. Add phone number
4. Make sure format matches (e.g., +1555123456 7)

### Agent Doesn't Answer Call

**Possible Causes:**
- Agent script not running
- LiveKit SIP not configured
- Phone number not routed in LiveKit console

**Fix:**
1. Check agent is running: `ps aux | grep multi_tenant`
2. Check LiveKit console for SIP configuration
3. Verify phone routing in LiveKit dashboard

### Wrong Agent Answers

**Cause:** Phone number mapped to different agent

**Fix:**
1. Go to Phone Test page
2. Run test to see which agent it's mapped to
3. Edit agent to update phone number mapping

### Call Not Logged

**Cause:** Database write error or agent crashed

**Fix:**
1. Check agent logs for errors
2. Verify database is writable
3. Check `call_logs` table in database

### Outbound Call Not Connecting

**Cause:** Missing LiveKit CLI dispatch or configuration issue

**Fix:**
1. Verify LiveKit CLI is installed: `lk --version`
2. Check SIP outbound trunk is configured in LiveKit console
3. Ensure you ran the `lk sip create-dispatch` command
4. Verify the room name matches exactly
5. Check LiveKit dashboard for dispatch status

### Agent Doesn't Join Outbound Call

**Cause:** Agent not running or room name mismatch

**Fix:**
1. Verify agent is running: `ps aux | grep multi_tenant`
2. Check agent logs for connection errors
3. Ensure room name in dispatch matches the one returned by API
4. Restart agent if needed: `./run_agent.sh`

## 📝 API Endpoints

### Test Phone Configuration

```bash
curl -X POST http://localhost:5001/api/sip/test-call \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+15551234567"}'
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Configuration loaded successfully",
  "phone_number": "+15551234567",
  "agent": {
    "id": "agent-uuid",
    "name": "Customer Support Agent",
    "llm_model": "gpt-4o-mini",
    "voice": "onyx",
    "language": "en-US",
    "instructions": "You are a professional..."
  },
  "user": {
    "id": "user-uuid",
    "name": "John Doe"
  },
  "sip_trunk_id": "trunk-1"
}
```

### Initiate Outbound Call

```bash
curl -X POST http://localhost:5001/api/sip/outbound-call \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent-uuid",
    "to_number": "+15551234567",
    "from_number": "+15559990000"
  }'
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Outbound call initiated",
  "call_id": "call-uuid",
  "room_name": "outbound-call-<uuid>",
  "to_number": "+15551234567",
  "from_number": "+15559990000",
  "agent": {
    "id": "agent-uuid",
    "name": "Customer Support Agent",
    "voice": "onyx",
    "model": "gpt-4o-mini"
  },
  "instructions": "To complete the outbound call:\n\n1. Your agent must be running (./run_agent.sh)\n2. LiveKit SIP outbound trunk must be configured\n3. Use LiveKit API or CLI to dispatch the SIP call:\n\n   lk sip create-dispatch \\\n     --to \"+15551234567\" \\\n     --from \"+15559990000\" \\\n     --room \"outbound-call-<uuid>\" \\\n     --trunk-id \"your-trunk-id\"\n\nThe agent will join the room automatically when the call is answered."
}
```

### Get SIP Trunks

```bash
curl http://localhost:5001/api/sip/trunks
```

### Get Phone Numbers

```bash
curl http://localhost:5001/api/user/phone-numbers
```

## 🎯 Next Steps

1. **Configure LiveKit SIP** - Set up SIP trunk in LiveKit console
2. **Provision Phone Numbers** - Get phone numbers from provider (Twilio, Telnyx, etc.)
3. **Route Numbers** - Point numbers to LiveKit SIP endpoint
4. **Test Calls** - Make test calls to verify everything works
5. **Monitor Logs** - Check Call Logs page for call records
6. **Scale Up** - Add more agents and phone numbers as needed

## 📚 Additional Resources

- [LiveKit SIP Documentation](https://docs.livekit.io/agents/sip/)
- [LiveKit Agents Documentation](https://docs.livekit.io/agents/)
- [Multi-Tenant Agent Example](/examples/README.md)
- [Voice Agents Examples](/examples/voice_agents/)

## 🆘 Support

If you encounter issues:

1. Check agent logs: Agent script outputs detailed logs
2. Check Flask logs: Backend shows API requests and database queries
3. Check browser console: Frontend shows API errors
4. Check LiveKit dashboard: Shows room connections and SIP status

---

Happy testing! 🎉

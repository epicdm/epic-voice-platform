# Outbound Calling Guide

Quick guide for testing agent-initiated outbound calls.

## 🎯 Quick Start

### 1. Prerequisites

- ✅ LiveKit Cloud account with SIP outbound trunk configured
- ✅ Agent running (`./run_agent.sh`)
- ✅ LiveKit CLI installed
- ✅ Backend and frontend running

### 2. Initiate Call via Web UI

**Option A: From Agents Page**
1. Go to http://localhost:3001/agents
2. Find the agent you want to test
3. Click **"Test Outbound Call"** button
4. Enter destination phone number (e.g., `+15551234567`)
5. Optionally enter caller ID
6. Click **"Initiate Call"**

**Option B: From Phone Test Page**
1. Go to http://localhost:3001/phone-test
2. Find a phone number/agent
3. Click **"Test Outbound Call"** button
4. Follow same steps as above

### 3. Complete the Call with LiveKit CLI

The UI will provide you with a room name. Use it with LiveKit CLI:

```bash
lk sip create-dispatch \
  --to "+15551234567" \
  --from "+15559990000" \
  --room "outbound-call-abc-123-def" \
  --trunk-id "your-trunk-id"
```

### 4. What Happens Next

1. LiveKit dials the phone number
2. When answered, your agent joins the room
3. Agent greets the recipient
4. Conversation proceeds
5. Call is logged to database

## 🔧 Setup Requirements

### LiveKit Cloud Configuration

1. **Login to LiveKit Cloud Console:**
   - Navigate to https://cloud.livekit.io

2. **Configure SIP Outbound Trunk:**
   - Go to SIP section
   - Add outbound trunk credentials
   - Note your trunk ID (you'll need this)

3. **Get Your Credentials:**
   - API Key
   - API Secret
   - Trunk ID

### Install LiveKit CLI

```bash
# macOS
brew install livekit-cli

# Linux/Windows - Download from:
# https://github.com/livekit/livekit-cli/releases
```

### Configure Environment

Make sure your `.env` file has:

```bash
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
OPENAI_API_KEY=sk-...
DEEPGRAM_API_KEY=...
```

## 📝 API Usage

### Programmatic Outbound Calls

```bash
curl -X POST http://localhost:5001/api/sip/outbound-call \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "your-agent-id",
    "to_number": "+15551234567",
    "from_number": "+15559990000"
  }'
```

Response:
```json
{
  "success": true,
  "call_id": "call-uuid",
  "room_name": "outbound-call-abc-123",
  "to_number": "+15551234567",
  "from_number": "+15559990000",
  "agent": {
    "id": "agent-id",
    "name": "Customer Support Agent",
    "voice": "onyx",
    "model": "gpt-4o-mini"
  }
}
```

## 🐛 Troubleshooting

### Call Doesn't Connect

**Issue:** Click "Initiate Call" but nothing happens

**Solution:**
1. Check that you ran the `lk sip create-dispatch` command
2. Verify room name matches exactly
3. Check LiveKit dashboard for dispatch status

### Agent Doesn't Join

**Issue:** Call connects but agent doesn't speak

**Solution:**
1. Verify agent is running: `ps aux | grep multi_tenant`
2. Check agent logs for errors
3. Restart agent: `./run_agent.sh`

### "Trunk not found" Error

**Issue:** LiveKit CLI returns trunk error

**Solution:**
1. Verify trunk ID in LiveKit console
2. Check outbound trunk is configured (not just inbound)
3. Ensure trunk has credits/is active

## 💡 Tips

1. **Test with your own number first** - Call yourself to test the flow
2. **Copy room name carefully** - Room name must match exactly
3. **Keep agent running** - Agent must be active before dispatch
4. **Check logs** - Both agent and Flask logs show call activity
5. **Use full E.164 format** - Always include country code (e.g., `+1...`)

## 📊 Call Lifecycle

```
1. User clicks "Test Outbound Call"
   ↓
2. Frontend sends API request
   ↓
3. Backend creates room + logs call
   ↓
4. Returns room name to user
   ↓
5. User runs `lk sip create-dispatch`
   ↓
6. LiveKit dials the number
   ↓
7. When answered, agent joins room
   ↓
8. Agent greets recipient
   ↓
9. Conversation proceeds
   ↓
10. Call ends, logged to database
```

## 🎯 Next Steps

1. Test with your own phone number
2. Configure custom caller ID
3. Set up automated outbound campaigns
4. Monitor call logs and analytics
5. Integrate with your CRM/system

## 📚 Additional Resources

- [SIP Testing Guide](./SIP_TESTING_GUIDE.md) - Comprehensive testing documentation
- [LiveKit SIP Documentation](https://docs.livekit.io/agents/sip/)
- [LiveKit CLI Documentation](https://github.com/livekit/livekit-cli)

---

Need help? Check the main [SIP_TESTING_GUIDE.md](./SIP_TESTING_GUIDE.md) for detailed troubleshooting.

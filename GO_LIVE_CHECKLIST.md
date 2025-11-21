# 🚀 GO LIVE CHECKLIST - AI Voice Agent Platform

**Target:** Production-ready voice AI agents that handle real phone calls
**Date:** 2025-10-26
**Status:** 🔄 IN PROGRESS

---

## ✅ CRITICAL PATH (Must Work for Launch)

### 1. **Agent Lifecycle** ⏳
- [ ] **Create Agent** - 3-step wizard works
  - [ ] Step 1: Basic info (name, greeting, language)
  - [ ] Step 2: Voice & model selection
  - [ ] Step 3: Advanced config (temperature, turn detection)
- [ ] **Deploy Agent** - Agent goes live on LiveKit Cloud
  - [ ] Deploy button works
  - [ ] Status changes: created → deploying → deployed
  - [ ] LiveKit worker appears in cloud
  - [ ] Agent shows "Running" badge
- [ ] **Stop/Undeploy Agent** - Clean shutdown
  - [ ] Stop button works
  - [ ] Status changes: deployed → created
  - [ ] Worker removed from LiveKit

### 2. **Phone Number Management** ⏳
- [ ] **Provision Number** - Get new phone number
  - [ ] Modal opens and loads available numbers
  - [ ] User can select area code/region
  - [ ] Number is provisioned successfully
  - [ ] Number appears in phone numbers table
- [ ] **Assign to Agent** - Connect phone → agent
  - [ ] Dropdown shows deployed agents
  - [ ] Assignment saves to database
  - [ ] SIP trunk configured correctly
  - [ ] Phone number shows assigned agent
- [ ] **Release Number** - Remove phone number
  - [ ] Delete confirmation works
  - [ ] Number released from provider
  - [ ] Database cleaned up

### 3. **Inbound Call Flow** (HIGHEST PRIORITY) ⏳
- [ ] **Phone → LiveKit → Agent**
  - [ ] Call someone's phone to provisioned number
  - [ ] SIP trunk receives call
  - [ ] LiveKit creates room
  - [ ] Agent joins room
  - [ ] Agent speaks greeting
  - [ ] Conversation works (speech recognition)
  - [ ] Agent responds appropriately
  - [ ] Call can be ended
- [ ] **Call Logging**
  - [ ] Call appears in call logs
  - [ ] Duration recorded
  - [ ] Transcript saved
  - [ ] Sentiment analysis (if applicable)
  - [ ] Cost calculated

### 4. **Outbound Call Flow** ⏳
- [ ] **Agent → Phone**
  - [ ] Outbound call tester works
  - [ ] Enter phone number
  - [ ] Select agent
  - [ ] Call initiates
  - [ ] Phone rings
  - [ ] Agent speaks when answered
  - [ ] Conversation works
- [ ] **Call Logging**
  - [ ] Outbound call logged
  - [ ] Same data as inbound

### 5. **Dashboard & Analytics** 📊
- [ ] **Dashboard Home**
  - [ ] Shows total agents
  - [ ] Shows active calls
  - [ ] Shows recent activity
  - [ ] Stats update in real-time
- [ ] **Analytics Page**
  - [ ] Call volume chart
  - [ ] Cost analysis
  - [ ] Agent performance
  - [ ] Time period filters work
- [ ] **Call Logs Page**
  - [ ] Table loads calls
  - [ ] Pagination works
  - [ ] Can view transcripts
  - [ ] Can filter by agent/date
  - [ ] Search works

### 6. **User Management & Auth** 🔐
- [ ] **Authentication**
  - [x] Google OAuth login works
  - [x] Session persists
  - [x] Protected routes work
  - [ ] User profile loads
- [ ] **Multi-tenancy**
  - [ ] Users see only their agents
  - [ ] Users see only their calls
  - [ ] Users see only their phone numbers
  - [ ] No data leakage between users

---

## 🔧 TECHNICAL REQUIREMENTS

### Infrastructure ✅
- [x] Frontend service running (Next.js)
- [x] Backend service running (Flask)
- [x] Database accessible (PostgreSQL)
- [x] LiveKit Cloud credentials configured
- [x] OpenAI API key configured
- [x] Deepgram API key configured

### Environment Variables ⏳
- [x] `LIVEKIT_URL` - Cloud URL
- [x] `LIVEKIT_API_KEY` - API key
- [x] `LIVEKIT_API_SECRET` - API secret
- [x] `OPENAI_API_KEY` - For LLM/TTS
- [x] `DEEPGRAM_API_KEY` - For STT
- [ ] `SIP_TRUNK_ID` - For telephony (verify working)
- [ ] `MAGNUS_API_KEY` - If using Magnus (verify working)

### Domain & SSL ✅
- [x] Domain pointing to server (ai.epic.dm)
- [x] SSL certificate active
- [x] HTTPS working
- [x] Redirects configured

### Services Health ⏳
- [x] Frontend accessible (https://ai.epic.dm)
- [x] Backend responding (localhost:5001)
- [x] Database migrations applied
- [ ] LiveKit agents can deploy
- [ ] SIP trunk receiving calls
- [ ] Webhooks configured

---

## 🐛 KNOWN ISSUES TO FIX

### Critical (Blocks Launch) 🔴
- [ ] **Test inbound call end-to-end** - Not verified yet
- [ ] **Test outbound call end-to-end** - Not verified yet
- [ ] **Verify SIP trunk configuration** - May need updates
- [ ] **Test phone number provisioning** - Not verified yet

### High Priority (Should Fix) 🟡
- [ ] **Call logs API response format** - May need wrapper
- [ ] **Analytics data loading** - Verify backend endpoints
- [ ] **Agent logs display** - LiveKit info now works
- [ ] **Error handling in wizard** - Add validation feedback

### Nice to Have (Post-Launch) 🟢
- [ ] Add webhook monitoring dashboard
- [ ] Add cost alerts
- [ ] Add agent performance metrics
- [ ] Add call recording playback
- [ ] Add bulk phone number import

---

## 🧪 TEST PROCEDURES

### Manual Test 1: Create & Deploy Agent
```
1. Navigate to /dashboard/agents
2. Click "Create New Agent"
3. Fill Step 1: Name="Test Agent", Greeting="Hello!", Language="en-US"
4. Fill Step 2: Voice="alloy", Model="gpt-4o-mini"
5. Fill Step 3: Temperature=0.7, Turn Detection="semantic"
6. Click "Create Agent"
7. Verify agent appears in list with "Not Deployed" status
8. Click "Deploy" button
9. Wait 30 seconds
10. Verify status changes to "Running"
11. Expand "LiveKit Details"
12. Verify Worker ID, Region, Uptime appear
```

### Manual Test 2: Provision & Assign Phone Number
```
1. Navigate to /dashboard/phone-numbers
2. Click "Provision New Number"
3. Select country/region
4. Click on available number
5. Verify number appears in table
6. Click "Assign Agent" dropdown
7. Select deployed agent
8. Click "Assign"
9. Verify assignment shows in table
```

### Manual Test 3: Make Inbound Call
```
1. Use personal phone
2. Dial provisioned number
3. Listen for agent greeting
4. Say "Hello, who are you?"
5. Verify agent responds
6. Have 30-second conversation
7. Hang up
8. Navigate to /dashboard/calls
9. Verify call appears in logs
10. Click "View Transcript"
11. Verify transcript is accurate
```

### Manual Test 4: Make Outbound Call
```
1. Navigate to /dashboard/testing
2. Go to "Outbound Call Tester"
3. Enter your phone number
4. Select deployed agent
5. Click "Initiate Call"
6. Answer your phone
7. Listen for agent greeting
8. Have conversation
9. Hang up
10. Verify call logged
```

---

## 📋 LAUNCH BLOCKERS

**MUST FIX BEFORE GOING LIVE:**
1. ❌ Verify SIP trunk is receiving calls
2. ❌ Test full inbound call flow
3. ❌ Test full outbound call flow
4. ❌ Verify call logging works
5. ❌ Test phone number provisioning

**Current Status:**
- Frontend: ✅ Working
- Backend: ✅ Running
- Database: ✅ Connected
- LiveKit: ⏳ Not tested end-to-end
- Telephony: ⏳ Not tested end-to-end

---

## 🎯 GO/NO-GO DECISION

### GO Criteria:
- ✅ All critical tests pass
- ✅ No data loss bugs
- ✅ Agents can make/receive calls
- ✅ Call logging works
- ✅ Multi-tenant isolation works

### NO-GO Criteria:
- ❌ Calls don't connect
- ❌ Agents don't respond
- ❌ Data leakage between users
- ❌ Critical security issues
- ❌ SIP trunk not working

---

**Next Steps:**
1. Run all manual tests
2. Fix critical bugs
3. Re-test
4. Document any workarounds
5. Launch! 🚀

# Epic.ai MVP Launch Plan - Single Tab Focus

**Date**: November 17, 2025
**Strategy**: Launch with ONE core tab, iterate from there
**Timeline**: 2-3 days to MVP launch

---

## 🎯 The Core MVP Tab: **AI AGENTS**

### Why AI Agents is the MVP:

**Reasoning**:
1. **It's the product** - Everything else supports this
2. **Users need it first** - Can't do anything without an agent
3. **Already 95% complete** - Fastest path to launch
4. **Self-contained** - Works independently
5. **Generates value immediately** - Users can create agents and take calls

### The MVP User Journey:

```
User signs up
    ↓
Creates AI agent (4-step wizard)
    ↓
Agent gets phone number automatically
    ↓
User gives out phone number
    ↓
Customers call
    ↓
AI agent answers
    ↓
VALUE DELIVERED ✅
```

**Everything else is optional for MVP!**

---

## ✅ What MUST Work for MVP

### 1. AI Agent Creation ✅ (Already Working)
**Page**: `/dashboard/agents/new`

**Critical Path**:
- [x] Step 1: Name + Description
- [x] Step 2: Instructions (personality)
- [x] Step 3: Voice selection
- [x] Step 4: Deploy agent

**What Works**:
- ✅ 4-step wizard
- ✅ All configuration options
- ✅ Save & deploy
- ✅ Phone number assignment

**What to Test**:
- [ ] Can create agent end-to-end
- [ ] Agent deploys successfully
- [ ] Agent gets phone number
- [ ] Phone number works (inbound calls)

### 2. AI Agent List ✅ (Already Working)
**Page**: `/dashboard/agents`

**Critical Path**:
- [x] See all my agents
- [x] View agent status
- [x] See phone numbers
- [x] Basic metrics

**What Works**:
- ✅ Agent grid/list
- ✅ Search/filter
- ✅ Agent cards with metrics
- ✅ Status indicators

**What to Test**:
- [ ] Agents display correctly
- [ ] Metrics are accurate
- [ ] Can navigate to create new agent

### 3. Making Calls Work ✅ (Already Working)
**Backend**: Magnus Billing + LiveKit

**Critical Path**:
- [x] Inbound calls route to agent
- [x] Agent answers
- [x] Conversation works
- [x] Call ends cleanly

**What Works**:
- ✅ Phone provisioning (Magnus)
- ✅ SIP integration
- ✅ LiveKit routing
- ✅ Agent deployment

**What to Test**:
- [ ] Call the agent's phone number
- [ ] Agent answers
- [ ] Can have conversation
- [ ] Call quality is good
- [ ] Call ends properly

---

## ❌ What Can Wait (Not Needed for MVP)

### Tabs to Hide/Disable:

1. **Campaigns** - Not needed, users can call agent directly
2. **Leads** - Not needed, users call agent ad-hoc
3. **Funnels** - Advanced feature, not needed for v1
4. **Analytics** - Nice-to-have, basic metrics in agent cards
5. **Live Listen** - Advanced feature
6. **Realtime** - Advanced dashboard
7. **Marketplace** - Future feature
8. **White Label** - Future feature
9. **Testing** - Internal tool

### Tabs to Keep Minimal:

1. **Dashboard (Home)** - Simple welcome page + link to create agent
2. **Calls** - Simple list (can be basic, just show call happened)
3. **Phone Numbers** - Auto-assigned, user doesn't manage
4. **Settings** - Just basic profile
5. **Billing** - Just show balance (if needed)

### Hidden/Future Features:
- Campaign management
- Lead import
- Funnel builder
- Advanced analytics
- Live monitoring
- Webhooks (work in background, no UI needed)
- API keys (future)
- Brand kits (future)

---

## 🚀 MVP Launch Timeline

### Day 1 (Today - Nov 17): Clean & Test ⚡

#### Morning (2 hours):
- [x] ✅ Analyze current state
- [ ] Clean up test agents (DELETE: test 02, Adminwerwrw, tst0002)
- [ ] Keep only: Survey & Feedback, EPIC Sales, Customer Support
- [ ] Deploy Customer Support Agent

#### Afternoon (3 hours):
- [ ] **CRITICAL TEST**: End-to-end agent creation
  1. Create new agent via wizard
  2. Deploy agent
  3. Get phone number
  4. Call the number
  5. Verify agent answers
  6. Have conversation
  7. Verify call works perfectly

- [ ] Document any issues found
- [ ] Fix critical blockers

### Day 2 (Nov 18): Polish & Simplify ⚡

#### Morning (2 hours):
- [ ] Simplify navigation - hide non-MVP tabs
- [ ] Update Dashboard (Home) - simple welcome + "Create Agent" CTA
- [ ] Polish AI Agents page - make it the hero
- [ ] Add better onboarding hints

#### Afternoon (3 hours):
- [ ] Test with fresh eyes (pretend to be new user)
- [ ] Fix UI/UX issues
- [ ] Add simple documentation/help text
- [ ] Write basic user guide

### Day 3 (Nov 19): Launch Prep ⚡

#### Morning (2 hours):
- [ ] Final testing
- [ ] Check error handling
- [ ] Verify all test agents deleted
- [ ] Clean up any test data

#### Afternoon (2 hours):
- [ ] Deploy to production
- [ ] Final smoke test
- [ ] Create demo video
- [ ] **LAUNCH** 🚀

---

## 🎯 MVP Success Criteria

### Minimum Viable Features:

#### Must Work Perfectly:
1. ✅ **Create AI Agent** - 4-step wizard
2. ✅ **Agent Gets Phone Number** - Automatic
3. ✅ **Inbound Calls Work** - Customer can call
4. ✅ **Agent Answers** - Conversation happens
5. ✅ **View My Agents** - List page

#### Can Be Basic:
- Dashboard shows welcome message
- Calls tab shows simple list
- Settings has basic info
- No analytics needed
- No campaigns needed

#### Can Be Missing:
- Advanced analytics
- Campaign management
- Lead management
- Funnel builder
- Live monitoring
- White label
- Marketplace

---

## 📋 MVP Critical Path Test

### The One Test That Matters:

**User Journey Test** (30 minutes):

```
1. Sign up / Log in
   ✓ Can access dashboard

2. Create Agent
   ✓ Click "Create Agent" or go to /dashboard/agents/new
   ✓ Step 1: Enter name "Test Sales Agent"
   ✓ Step 2: Enter instructions "You are a sales assistant"
   ✓ Step 3: Select voice "echo"
   ✓ Step 4: Click "Deploy"
   ✓ Agent appears in list with phone number

3. Test Call
   ✓ Note the phone number (e.g., +17678189XXX)
   ✓ Call from mobile phone
   ✓ Agent answers within 3 seconds
   ✓ Agent greeting plays
   ✓ Can have conversation
   ✓ Agent responds intelligently
   ✓ Call quality is good
   ✓ Call ends cleanly

4. Verify
   ✓ Call appears in "Calls" tab (if implemented)
   ✓ Agent metrics update
   ✓ No errors in console
```

**If this works → SHIP IT! 🚀**

---

## 🔧 Quick Fixes Needed

### Before MVP Launch:

#### 1. Clean Up Test Data (5 minutes) 🔴 CRITICAL
```sql
-- Delete test agents
DELETE FROM agent_configs
WHERE name IN ('test 02', 'Adminwerwrw', 'tst0002');
```

#### 2. Simplify Navigation (15 minutes) 🟡 IMPORTANT
**Hide these tabs temporarily**:
- Campaigns
- Leads
- Funnels
- Analytics (advanced)
- Live Listen
- Realtime
- Marketplace
- White Label
- Testing

**Keep only**:
- Dashboard (Home)
- **AI Agents** ⭐ (THE MVP)
- Calls (simple)
- Phone Numbers (if needed)
- Settings (basic)

#### 3. Improve Dashboard Home (30 minutes) 🟡 IMPORTANT
**Make it super simple**:
```
Welcome to Epic.ai Voice Agents!

[Big Button: Create Your First AI Agent]

Quick Stats:
- Agents: 3
- Calls Today: 5
- Active: 2

[Recent Calls - Simple list]
```

#### 4. Add Onboarding Hints (20 minutes) 🟢 NICE-TO-HAVE
- First-time user sees "Create your first agent" prompt
- Tooltips on agent wizard steps
- "What happens next?" messaging

---

## 🎯 MVP Feature Matrix

| Feature | Status | Priority | MVP? |
|---------|--------|----------|------|
| **Create AI Agent** | ✅ Working | 🔴 CRITICAL | ✅ YES |
| **List Agents** | ✅ Working | 🔴 CRITICAL | ✅ YES |
| **Agent Answers Calls** | ✅ Working | 🔴 CRITICAL | ✅ YES |
| **Phone Number Auto-Assign** | ✅ Working | 🔴 CRITICAL | ✅ YES |
| **Edit Agent** | ✅ Working | 🟡 IMPORTANT | ✅ YES |
| **Delete Agent** | ✅ Working | 🟡 IMPORTANT | ✅ YES |
| **Basic Metrics** | ✅ Working | 🟡 IMPORTANT | ✅ YES |
| **Simple Call List** | ✅ Working | 🟡 IMPORTANT | ⚠️ BASIC |
| **Dashboard Home** | ⚠️ Complex | 🟢 NICE | ⚠️ SIMPLIFY |
| **Campaigns** | ✅ Working | 🟢 FUTURE | ❌ HIDE |
| **Leads** | ✅ Working | 🟢 FUTURE | ❌ HIDE |
| **Funnels** | ✅ Working | 🟢 FUTURE | ❌ HIDE |
| **Analytics Dashboard** | ✅ Working | 🟢 FUTURE | ❌ HIDE |
| **Live Listen** | ✅ Working | 🟢 FUTURE | ❌ HIDE |
| **Billing** | ⚠️ Unknown | 🟢 FUTURE | ⚠️ BASIC |

---

## 📊 MVP vs Full Platform

### MVP (Ship This Week):
```
Epic.ai Voice Agents - AI Phone Agents in Minutes

✅ Create AI agent
✅ Get phone number
✅ Answer calls
✅ View agents
✅ Basic settings

That's it!
```

### Full Platform (Build Over Time):
```
+ Campaign management
+ Lead scoring
+ Funnel automation
+ Advanced analytics
+ Live monitoring
+ Multi-agent routing
+ White label
+ API access
+ Marketplace
+ Integrations
```

---

## 🚀 MVP Value Proposition

### What Users Get (MVP):

**In 5 Minutes You Can**:
1. Create an AI phone agent
2. Get a phone number
3. Start taking calls
4. AI handles conversations
5. See basic call metrics

**Use Cases**:
- Small business phone answering
- After-hours support
- Appointment scheduling
- Lead qualification
- Customer service
- Sales inquiries

**Pricing** (Suggest):
- Free: 10 minutes/month
- Starter: $29/mo - 500 minutes
- Pro: $99/mo - 2000 minutes
- Enterprise: Custom

---

## ✅ Today's Action Items

### Right Now (30 minutes):

1. **Clean Database** ✅
   ```sql
   -- Delete test agents
   DELETE FROM agent_configs
   WHERE id IN (
     '259b6aab-c27c-4f39-8d68-99349a89fa8e',  -- Adminwerwrw
     '7b885e98-8cfe-4d8a-947c-9eb24ad678e0',  -- tst0002
     'aaf9234e-e100-4821-828c-ad0f1c4f246e'   -- test 02
   );
   ```

2. **Deploy Pending Agent** ✅
   - Deploy: Customer Support Agent
   - Verify it gets a phone number

3. **Test Critical Path** ✅
   - Create new agent
   - Call the number
   - Verify it works

### This Afternoon (2 hours):

4. **Simplify Navigation** 🔧
   - Hide non-essential tabs
   - Focus on AI Agents

5. **Polish Agent Page** 🎨
   - Make it beautiful
   - Clear CTAs
   - Good empty states

6. **Test Everything** 🧪
   - Fresh user perspective
   - Find and fix issues

---

## 🎯 Success Metrics (MVP)

### Launch Day:
- [ ] Zero critical bugs
- [ ] Agent creation works 100%
- [ ] Calls connect successfully
- [ ] No test data visible
- [ ] Clean, simple UI

### Week 1:
- [ ] 10 new users sign up
- [ ] 5 agents created
- [ ] 20 successful calls
- [ ] 4+ star feedback
- [ ] 0 critical support tickets

---

## 🚢 Ship Decision Tree

```
Can user create an agent?
├─ NO → FIX THIS FIRST
└─ YES
    └─ Does agent answer calls?
        ├─ NO → FIX THIS FIRST
        └─ YES
            └─ Is call quality good?
                ├─ NO → FIX THIS FIRST
                └─ YES
                    └─ Is UI confusing?
                        ├─ YES → SIMPLIFY
                        └─ NO
                            └─ 🚀 SHIP IT!
```

---

**MVP Focus**: AI Agents Tab Only
**Timeline**: 2-3 days
**Launch Target**: November 19-20, 2025
**Post-Launch**: Add features based on user feedback

**Next Action**: Clean up test agents and run critical path test!

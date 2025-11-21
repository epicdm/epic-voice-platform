# Funnel Feature - Production Ready Plan

**Date**: 2025-11-16
**Goal**: Make funnels 100% production-ready for end-to-end user testing
**Approach**: Stop firefighting, build systematically

---

## 🎯 User Perspective: What Our Users Need

### User Persona
**Marketing Manager Sarah** wants to:
1. Create an outbound sales funnel
2. Call leads with an AI agent
3. Send follow-up emails based on call outcome
4. Track performance and optimize

### Current User Experience (BROKEN)
```
1. Sarah clicks "Create Funnel" ✅ Works
2. Chooses template ✅ Works
3. Visual editor opens ✅ Works
4. Clicks on CALL node to configure
5. Sees: "Agent Config ID" text field ❌ BROKEN
   - No dropdown to choose agent
   - Has to manually type UUID
   - Can't see which agents exist
   - Can't see agent properties (voice, phone number)
   - No validation
6. Types random UUID → Funnel breaks at runtime
```

### Target User Experience (PRODUCTION READY)
```
1. Sarah clicks "Create Funnel" ✅
2. Chooses "Sales Follow-up" template ✅
3. Visual editor opens with CALL → DELAY → EMAIL ✅
4. Clicks CALL node
5. Sees dropdown: "Select AI Agent" ✅ NEW
   - "Sales Bot John (+17678189267, voice: alloy)" ✅ NEW
   - "Support Agent Mary (+17678189426, voice: echo)" ✅ NEW
   - "+ Create New Agent" button ✅ NEW
6. Selects "Sales Bot John"
7. Sees preview: ✅ NEW
   - "This call will use Sales Bot John"
   - "Caller ID: +17678189267"
   - "Voice: alloy"
   - "Instructions: You are a friendly sales rep..."
8. Clicks EMAIL node
9. Sees email template editor: ✅ NEW
   - Subject field
   - Body with variable support
   - Preview
10. Clicks "Test Funnel" ✅ NEW
11. Enters test phone/email
12. Sees live execution progress ✅ NEW
13. Call succeeds → Email sent ✅
14. Activates funnel ✅
15. Imports leads ✅ NEW
16. Monitors executions dashboard ✅ NEW
```

---

## 📊 Current State Analysis

### ✅ What Exists (Working)

#### Backend
- `/api/user/agents` - List, create, update, delete agents
- `/api/funnels` - List, create, update, delete funnels
- `/api/funnels/{id}/nodes` - Add/update/delete nodes
- `/api/funnels/{id}/edges` - Add/delete edges
- `/api/funnels/{id}/start` - Trigger funnel execution
- `CallService` - Initiates LiveKit calls with agent lookup
- `FunnelExecutor` - Executes funnel nodes
- `FunnelWorker` - Background processing with retry
- Dynamic agent routing (tst0002 worker)

#### Frontend
- `/dashboard/funnels` - List page with create modal
- `/dashboard/funnels/{id}/edit` - Visual editor (React Flow)
- `/dashboard/agents` - Agent list page
- `NodeConfigPanel` - Config forms for each node type
- `useAgents()` hook - Fetch agents
- `useFunnels()` hook - Fetch funnels
- Templates system

### ❌ What's Missing (Gaps)

#### Frontend - Critical Blockers
1. **Agent Selector in CALL Node** ❌ CRITICAL
   - Currently: Manual text input for `agent_config_id`
   - Needed: Dropdown with agent list
   - Needed: Show agent name, phone, voice in dropdown
   - Needed: Validation that agent exists
   - Needed: "Create Agent" button if empty

2. **Email Template Editor** ❌ CRITICAL
   - Currently: Basic text field
   - Needed: Rich editor or template selector
   - Needed: Variable support ({{contact.name}}, {{contact.email}})
   - Needed: Preview
   - Needed: Test email button

3. **SMS Template Editor** ❌ CRITICAL
   - Currently: Basic textarea
   - Needed: Character counter (160 limit)
   - Needed: Variable support
   - Needed: Test SMS button

4. **Funnel Testing UI** ❌ CRITICAL
   - Currently: None - must use Python test script
   - Needed: "Test" button in editor
   - Needed: Test contact form (phone, email, name)
   - Needed: Live execution progress
   - Needed: Show current node, outcome, errors

5. **Execution Monitoring** ❌ CRITICAL
   - Currently: No UI to view executions
   - Needed: Executions list page
   - Needed: Execution detail view
   - Needed: Timeline/flow visualization
   - Needed: Error details and retry buttons

6. **Lead Management** ❌ IMPORTANT
   - Currently: No way to add leads via UI
   - Needed: Import CSV
   - Needed: Manually add leads
   - Needed: Lead list view

#### Frontend - Nice to Have
7. **Agent Property Validation** ⚠️ IMPORTANT
   - Warn if agent has no phone number
   - Warn if agent not deployed
   - Show agent status (active/inactive)

8. **Funnel Analytics** ⚠️ NICE TO HAVE
   - Success rate per funnel
   - Average execution time
   - Cost per funnel
   - Conversion metrics

9. **Conditional Logic Builder** ⚠️ NICE TO HAVE
   - Currently: Manual JSON config
   - Needed: Visual condition builder

#### Backend - Gaps
10. **Email Template System** ❌ IMPORTANT
    - Currently: Hardcoded emails
    - Needed: Template storage
    - Needed: Variable substitution
    - Needed: Template CRUD API

11. **SMS Gateway Integration** ❌ IMPORTANT
    - Currently: Not implemented
    - Needed: Choose provider (Twilio, etc.)
    - Needed: Send SMS API
    - Needed: SMS logging

12. **Lead Import API** ❌ IMPORTANT
    - Currently: Must use Python script
    - Needed: `/api/funnels/{id}/import` endpoint
    - Needed: CSV parsing
    - Needed: Validation

13. **Execution Status API** ⚠️ IMPORTANT
    - Currently: Exists but returns 404
    - Needed: Fix `/api/funnels/{id}/executions/{exec_id}`
    - Needed: Real-time status updates

---

## 🎯 Implementation Plan (Phased Approach)

### **PHASE 1: Core User Flow (Minimum Viable)** - PRIORITY

This phase makes funnels actually usable by users.

#### 1.1: Agent Selector in CALL Node ⭐ CRITICAL
**File**: `/frontend/components/funnels/NodeConfigPanel.tsx`

**Changes**:
```tsx
// OLD (Lines 50-71):
case "call":
  return (
    <Input
      label="Agent Config ID"
      value={localConfig.agent_config_id || ""}
      onChange={(e) => updateField("agent_config_id", e.target.value)}
      placeholder="agent-123"
    />
  );

// NEW:
case "call":
  const { agents, isLoading: agentsLoading } = useAgents();

  return (
    <div className="space-y-4">
      <Select
        label="AI Agent"
        placeholder={agentsLoading ? "Loading agents..." : "Select an agent"}
        selectedKeys={[localConfig.agent_id || ""]}
        onChange={(e) => updateField("agent_id", e.target.value)}
        isDisabled={agentsLoading}
        isRequired
        description="Choose which AI agent makes this call"
      >
        {agents.map((agent) => (
          <SelectItem
            key={agent.id}
            value={agent.id}
            description={`${agent.phone_number || 'No phone'} • ${agent.voice || 'default voice'}`}
          >
            {agent.name}
          </SelectItem>
        ))}
      </Select>

      {/* Show selected agent details */}
      {localConfig.agent_id && (
        <AgentPreview agentId={localConfig.agent_id} agents={agents} />
      )}

      {/* Create agent button if none exist */}
      {agents.length === 0 && (
        <Button onPress={() => router.push('/dashboard/agents')}>
          Create Your First Agent
        </Button>
      )}

      <Input
        label="Max Duration (seconds)"
        type="number"
        value={String(localConfig.max_duration || 300)}
        onChange={(e) => updateField("max_duration", parseInt(e.target.value))}
      />
    </div>
  );
```

**New Component**: `AgentPreview.tsx`
```tsx
function AgentPreview({ agentId, agents }) {
  const agent = agents.find(a => a.id === agentId);
  if (!agent) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded p-3">
      <h4 className="font-semibold text-sm">Selected Agent</h4>
      <div className="text-sm mt-2 space-y-1">
        <div><strong>Name:</strong> {agent.name}</div>
        <div><strong>Caller ID:</strong> {agent.phone_number || '⚠️ No phone assigned'}</div>
        <div><strong>Voice:</strong> {agent.voice}</div>
        <div><strong>Model:</strong> {agent.llm_model}</div>
      </div>
      {!agent.phone_number && (
        <div className="mt-2 text-xs text-red-600">
          ⚠️ This agent needs a phone number assigned
        </div>
      )}
    </div>
  );
}
```

**Acceptance Criteria**:
- ✅ User sees dropdown of all their agents
- ✅ Dropdown shows agent name + phone + voice
- ✅ Selected agent shows full preview
- ✅ Warning if agent missing phone number
- ✅ "Create agent" button if no agents exist

**Estimated Time**: 2-3 hours

---

#### 1.2: Email Template Editor ⭐ CRITICAL
**File**: `/frontend/components/funnels/NodeConfigPanel.tsx`

**Changes**:
```tsx
case "email":
  return (
    <div className="space-y-4">
      <Input
        label="Subject"
        value={localConfig.subject || ""}
        onChange={(e) => updateField("subject", e.target.value)}
        placeholder="Thanks for speaking with us!"
        isRequired
      />

      <Textarea
        label="Email Body"
        value={localConfig.body || ""}
        onChange={(e) => updateField("body", e.target.value)}
        placeholder={`Hi {{contact.name}},\n\nThanks for speaking with us...\`}
        minRows={8}
        description="Use {{contact.name}}, {{contact.email}}, {{contact.phone}} for personalization"
      />

      <Textarea
        label="HTML Body (Optional)"
        value={localConfig.html_body || ""}
        onChange={(e) => updateField("html_body", e.target.value)}
        minRows={6}
        classNames={{ input: "font-mono text-xs" }}
        description="Advanced: Use HTML for rich formatting"
      />

      {/* Variable helper */}
      <div className="text-xs text-gray-600">
        <strong>Available variables:</strong>
        <div className="mt-1 space-x-2">
          <code className="bg-gray-100 px-1 rounded">{{contact.name}}</code>
          <code className="bg-gray-100 px-1 rounded">{{contact.email}}</code>
          <code className="bg-gray-100 px-1 rounded">{{contact.phone}}</code>
        </div>
      </div>

      {/* Preview */}
      <details>
        <summary className="cursor-pointer text-sm font-medium">
          Preview Email
        </summary>
        <div className="mt-2 border rounded p-3 bg-gray-50">
          <div className="text-xs text-gray-500 mb-2">
            <strong>To:</strong> {{contact.email}}<br />
            <strong>Subject:</strong> {localConfig.subject || "(no subject)"}
          </div>
          <div className="whitespace-pre-wrap text-sm">
            {localConfig.body || "(no content)"}
          </div>
        </div>
      </details>
    </div>
  );
```

**Acceptance Criteria**:
- ✅ Subject and body fields
- ✅ Variable support documented
- ✅ Preview shows what email will look like
- ✅ HTML body option for advanced users

**Estimated Time**: 1-2 hours

---

#### 1.3: Test Funnel Button ⭐ CRITICAL
**File**: `/frontend/app/dashboard/funnels/[id]/edit/page.tsx`

**Add to toolbar**:
```tsx
<Button
  color="success"
  variant="flat"
  onPress={() => setShowTestModal(true)}
  startContent={<Play />}
>
  Test Funnel
</Button>

<Modal isOpen={showTestModal} onClose={() => setShowTestModal(false)}>
  <ModalHeader>Test Funnel</ModalHeader>
  <ModalBody>
    <Input
      label="Test Phone Number"
      placeholder="+1234567890"
      value={testPhone}
      onChange={(e) => setTestPhone(e.target.value)}
    />
    <Input
      label="Test Email"
      placeholder="test@example.com"
      value={testEmail}
      onChange={(e) => setTestEmail(e.target.value)}
    />
    <Input
      label="Test Name"
      placeholder="John Doe"
      value={testName}
      onChange={(e) => setTestName(e.target.value)}
    />
  </ModalBody>
  <ModalFooter>
    <Button onPress={() => handleTestFunnel()}>
      Start Test
    </Button>
  </ModalFooter>
</Modal>
```

**Handler**:
```tsx
const handleTestFunnel = async () => {
  const response = await fetch(`/api/funnels/${funnelId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contact_data: {
        phone: testPhone,
        email: testEmail,
        name: testName
      }
    })
  });

  const { execution_id } = await response.json();

  // Open execution monitor
  router.push(`/dashboard/funnels/${funnelId}/executions/${execution_id}`);
};
```

**Acceptance Criteria**:
- ✅ "Test" button visible in editor toolbar
- ✅ Modal collects test contact data
- ✅ Triggers funnel execution
- ✅ Navigates to execution monitor

**Estimated Time**: 2 hours

---

#### 1.4: Execution Monitor Page ⭐ CRITICAL
**New File**: `/frontend/app/dashboard/funnels/[id]/executions/[execId]/page.tsx`

**Features**:
- Live status polling
- Timeline view showing node progression
- Current node highlighting
- Outcome badges (answered/no_answer/success/failed)
- Error messages
- Retry button

**UI**:
```tsx
<div className="space-y-6">
  <PageHeader
    title={`Execution: ${execution.id}`}
    breadcrumbs={[
      { label: 'Funnels', href: '/dashboard/funnels' },
      { label: funnel.name, href: `/dashboard/funnels/${funnel.id}` },
      { label: 'Executions' }
    ]}
  />

  <Card>
    <CardBody>
      <div className="flex items-center justify-between">
        <div>
          <h3>Status</h3>
          <Badge color={getStatusColor(execution.status)}>
            {execution.status}
          </Badge>
        </div>
        <div>
          <h3>Current Node</h3>
          <p>{getCurrentNodeLabel(execution.current_node_id)}</p>
        </div>
      </div>
    </CardBody>
  </Card>

  <Card>
    <CardBody>
      <h3>Execution Timeline</h3>
      <div className="space-y-2 mt-4">
        {timeline.map((event, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className={`w-2 h-2 rounded-full mt-2 ${
              event.status === 'completed' ? 'bg-green-500' :
              event.status === 'failed' ? 'bg-red-500' :
              'bg-yellow-500'
            }`} />
            <div className="flex-1">
              <div className="font-medium">{event.node_label}</div>
              <div className="text-sm text-gray-600">{event.outcome}</div>
              <div className="text-xs text-gray-500">{event.timestamp}</div>
            </div>
          </div>
        ))}
      </div>
    </CardBody>
  </Card>
</div>
```

**Acceptance Criteria**:
- ✅ Shows execution status (active/completed/failed)
- ✅ Shows timeline of nodes executed
- ✅ Highlights current node
- ✅ Shows outcomes and errors
- ✅ Auto-refreshes until complete

**Estimated Time**: 4-6 hours

---

### **PHASE 2: Enhanced UX** - IMPORTANT

#### 2.1: Lead Import UI
- CSV upload
- Drag & drop
- Preview before import
- Validation errors

#### 2.2: Execution List Page
- Table of all executions
- Filter by status, date, funnel
- Search by contact
- Bulk actions

#### 2.3: SMS Editor Improvements
- Character counter
- Variable support
- Test SMS button

#### 2.4: Agent Validation
- Warn if no phone number
- Check if agent deployed
- Show agent status indicator

**Estimated Time**: 8-10 hours total

---

### **PHASE 3: Analytics & Optimization** - NICE TO HAVE

#### 3.1: Funnel Analytics Dashboard
- Success rate
- Average execution time
- Cost tracking
- Conversion funnel visualization

#### 3.2: A/B Testing
- Test different agents
- Test different templates
- Statistical significance

**Estimated Time**: 10-15 hours total

---

## 📋 Implementation Checklist (Phase 1 Only)

### Must Complete Before User Testing

- [ ] **1.1: Agent Selector** (2-3 hrs)
  - [ ] Replace text input with Select dropdown
  - [ ] Fetch agents using `useAgents()` hook
  - [ ] Show agent name, phone, voice in dropdown items
  - [ ] Create `AgentPreview` component
  - [ ] Show preview when agent selected
  - [ ] Warn if agent missing phone number
  - [ ] Add "Create Agent" button if none exist
  - [ ] Update backend to accept `agent_id` (already uses it!)
  - [ ] Test: Create funnel, select agent, save, execute

- [ ] **1.2: Email Template Editor** (1-2 hrs)
  - [ ] Add subject field
  - [ ] Add body textarea with variable hints
  - [ ] Add HTML body field (optional)
  - [ ] Show available variables
  - [ ] Add preview section
  - [ ] Test: Create email node, write template, execute

- [ ] **1.3: Test Funnel Button** (2 hrs)
  - [ ] Add "Test" button to editor toolbar
  - [ ] Create test modal with contact fields
  - [ ] Call `/api/funnels/{id}/start` endpoint
  - [ ] Navigate to execution monitor
  - [ ] Test: Click test, enter data, see execution

- [ ] **1.4: Execution Monitor** (4-6 hrs)
  - [ ] Create new page `/dashboard/funnels/[id]/executions/[execId]`
  - [ ] Fetch execution data
  - [ ] Poll for updates every 2-3 seconds
  - [ ] Show status badge
  - [ ] Show current node
  - [ ] Show timeline of completed nodes
  - [ ] Show outcomes for each node
  - [ ] Show errors if failed
  - [ ] Add retry button
  - [ ] Test: Run funnel, watch execution live

- [ ] **1.5: Fix Backend Execution Status Endpoint** (1 hr)
  - [ ] Debug why `GET /api/funnels/{id}/executions/{execId}` returns 404
  - [ ] Ensure it returns execution object
  - [ ] Include context, current_node_id, status
  - [ ] Test with curl/Postman

---

## 🧪 Testing Checklist

### End-to-End User Scenarios

**Scenario 1: Sales Follow-up Funnel**
```
1. User has agent "Sales Bot" with phone +17678189267
2. Click "Create Funnel"
3. Choose "Sales Follow-up" template
4. Editor opens with CALL → DELAY → EMAIL
5. Click CALL node
6. Select "Sales Bot" from dropdown ✅ Must see dropdown
7. See preview showing phone number ✅ Must see preview
8. Click EMAIL node
9. Write subject and body ✅ Must have proper editor
10. Click "Test Funnel" ✅ Must have test button
11. Enter test phone +17678181111
12. Execution starts
13. See live progress ✅ Must see execution monitor
14. Call completes → Delay → Email sent
15. Execution shows "completed"
16. Check email received ✅
```

**Scenario 2: No Agent Error Handling**
```
1. New user with no agents
2. Click "Create Funnel"
3. Add CALL node
4. See "Create Your First Agent" button ✅
5. Click button → Navigate to agents page
6. Create agent
7. Return to funnel editor
8. Now see agent in dropdown ✅
```

**Scenario 3: Agent Missing Phone Number**
```
1. User has agent with no phone assigned
2. Create funnel with CALL node
3. Select agent
4. See warning: "⚠️ Agent needs phone number" ✅
5. Click link to assign phone
6. Return, warning gone ✅
```

---

## 🚀 Deployment Plan

### Phase 1 Deployment
1. Merge all Phase 1 changes to main branch
2. Build frontend: `npm run build`
3. Restart services
4. Smoke test with test funnel
5. Monitor for errors
6. User acceptance testing

### Rollback Plan
- Git revert to previous working commit
- Restart services
- Notify users of temporary issues

---

## ✅ Success Criteria

Phase 1 is complete when:

1. ✅ User can select agent from dropdown (no manual UUID typing)
2. ✅ User sees agent properties preview
3. ✅ User can write email templates with variables
4. ✅ User can test funnel with one click
5. ✅ User can monitor execution live
6. ✅ All node types have proper config UIs
7. ✅ No Python scripts needed for testing
8. ✅ Error messages are user-friendly

**Final Test**: Non-technical user can create and test a funnel without asking for help.

---

## 📊 Estimated Effort

**Phase 1 (MVP)**: 10-14 hours
- Agent selector: 2-3 hrs
- Email editor: 1-2 hrs
- Test button: 2 hrs
- Execution monitor: 4-6 hrs
- Backend fixes: 1 hr
- Testing: 2 hrs

**Phase 2 (Enhanced)**: 8-10 hours
**Phase 3 (Analytics)**: 10-15 hours

**Total for Production-Ready**: 28-39 hours

---

**Created by**: Claude Code
**Next Step**: Review plan, approve, then implement Phase 1 systematically

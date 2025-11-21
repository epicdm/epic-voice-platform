# 🚀 FULL RESTORATION IMPLEMENTATION GUIDE

## Status: IN PROGRESS
**Started:** 2025-10-26 08:43 UTC  
**Current Phase:** Milestone 1 - Agent Deployment System

---

## ✅ COMPLETED STEPS

### 1. Analysis Phase (DONE)
- [x] Analyzed old backup code structure
- [x] Identified missing components (9 major features)
- [x] Generated comparison report
- [x] Found existing deployment logic in Flask backend

### 2. Key Findings
- ✅ Flask backend already has `/api/user/agents/<id>/deploy` endpoint
- ✅ Flask backend already has `/api/user/agents/<id>/undeploy` endpoint
- ✅ Deployment logic includes: dependencies install, process spawn, logging
- ❌ Auto-deploy NOT called after agent creation
- ❌ UI has NO deploy/start/stop controls
- ❌ UI has NO status display

---

## 🔧 MILESTONE 1: Agent Deployment & Process Management

### Task 1.1: Add Deployment Controls to Agent List ⏳
**File:** `/opt/livekit1/frontend/components/agents/agent-list-item.tsx`

**Changes Needed:**
1. Add deploy button (when status='created')
2. Add start button (when status='deployed' but stopped)
3. Add stop button (when status='running')
4. Add restart button (when status='running')
5. Add status indicator with icon
6. Handle loading states
7. Show toast notifications

**Code Template:**
```typescript
// Handler functions to add:
const [isDeploying, setIsDeploying] = useState(false);
const [isStarting, setIsStarting] = useState(false);
const [isStopping, setIsStopping] = useState(false);

const handleDeploy = async () => {
  setIsDeploying(true);
  try {
    await api.post(`/api/user/agents/${agent.id}/deploy`);
    toast.success("Agent deployed successfully");
    onStatusChange?.();
  } catch (error) {
    toast.error("Failed to deploy agent");
  } finally {
    setIsDeploying(false);
  }
};

const handleUndeploy = async () => {
  setIsStopping(true);
  try {
    await api.post(`/api/user/agents/${agent.id}/undeploy`);
    toast.success("Agent stopped");
    onStatusChange?.();
  } catch (error) {
    toast.error("Failed to stop agent");
  } finally {
    setIsStopping(false);
  }
};

// UI buttons to add in CardFooter:
{agent.status === 'created' && (
  <Button
    size="sm"
    color="primary"
    variant="flat"
    startContent={<Rocket size={16} />}
    onPress={handleDeploy}
    isLoading={isDeploying}
  >
    Deploy
  </Button>
)}

{agent.status === 'deployed' && (
  <Button
    size="sm"
    color="success"
    variant="flat"
    startContent={<Play size={16} />}
    onPress={handleDeploy}
    isLoading={isStarting}
  >
    Start
  </Button>
)}

{agent.status === 'deployed' && (
  <Button
    size="sm"
    color="warning"
    variant="flat"
    startContent={<Square size={16} />}
    onPress={handleUndeploy}
    isLoading={isStopping}
  >
    Stop
  </Button>
)}
```

### Task 1.2: Add Status Indicator
**Changes:**
- Replace static status chip with dynamic icon
- Add pulsing dot for "running" status
- Add color coding: green=running, yellow=deploying, gray=stopped

```typescript
const getStatusIcon = () => {
  switch (agent.status) {
    case 'deployed':
      return (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Running</span>
        </div>
      );
    case 'deploying':
      return (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          <span>Deploying...</span>
        </div>
      );
    case 'created':
      return (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-400" />
          <span>Not Deployed</span>
        </div>
      );
    default:
      return agent.status;
  }
};
```

### Task 1.3: Add Next.js API Proxy for Deploy/Undeploy
**File:** `/opt/livekit1/frontend/app/api/user/agents/[id]/deploy/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: { message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const agentId = params.id;

    // Forward to Flask backend
    const response = await fetch(`${BACKEND_URL}/api/user/agents/${agentId}/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': session.user.email,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error deploying agent:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to deploy agent' } },
      { status: 500 }
    );
  }
}
```

**File:** `/opt/livekit1/frontend/app/api/user/agents/[id]/undeploy/route.ts` (NEW)

```typescript
// Same structure as deploy, but calls /undeploy endpoint
```

### Task 1.4: Test Deployment Flow
**Test Steps:**
1. Create new agent via UI
2. Click "Deploy" button
3. Wait 30-60 seconds
4. Verify status changes to "deployed"
5. Check Flask logs for process start
6. Verify agent process running: `ps aux | grep main.py`
7. Check agent logs: `tail -f /opt/livekit1/agents/{name}/agent.log`

---

## 🧪 MILESTONE 2: Testing & Simulation Tools

### Task 2.1: Restore CallSimulator Component
**Source:** `/opt/livekit1/frontend/components_old_backup/CallSimulator.tsx`  
**Destination:** `/opt/livekit1/frontend/components/agents/call-simulator.tsx`

**Steps:**
1. Copy file
2. Update imports to new paths
3. Update API calls to new format
4. Test in isolation

### Task 2.2: Restore OutboundCallTester Component
**Source:** `/opt/livekit1/frontend/components_old_backup/OutboundCallTester.tsx`  
**Destination:** `/opt/livekit1/frontend/components/agents/outbound-call-tester.tsx`

### Task 2.3: Create Testing Page
**File:** `/opt/livekit1/frontend/app/dashboard/agents/[id]/test/page.tsx` (NEW)

```typescript
"use client";

import { CallSimulator } from "@/components/agents/call-simulator";
import { OutboundCallTester } from "@/components/agents/outbound-call-tester";
import { Tabs, Tab } from "@heroui/react";

export default function AgentTestPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Test Agent</h1>
      
      <Tabs aria-label="Testing options">
        <Tab key="simulator" title="Call Simulator">
          <CallSimulator agentId={params.id} />
        </Tab>
        <Tab key="outbound" title="Outbound Test">
          <OutboundCallTester agentId={params.id} />
        </Tab>
      </Tabs>
    </div>
  );
}
```

---

## 📞 MILESTONE 3: SIP Configuration UI

### Task 3.1: Restore SIPConfigTab Component
**Source:** `/opt/livekit1/frontend/components_old_backup/SIPConfigTab.tsx`  
**Destination:** `/opt/livekit1/frontend/components/phone-numbers/sip-config-tab.tsx`

### Task 3.2: Integrate into Phone Numbers Page
**File:** `/opt/livekit1/frontend/app/dashboard/phone-numbers/page.tsx`

Add tab for SIP configuration.

---

## 🎨 MILESTONE 4: Advanced UI Components

### Task 4.1: Restore Audio Visualization
**Source:** `/opt/livekit1/frontend/components_old_backup/VoiceWaveform.tsx`

### Task 4.2: Restore Bot Avatars
**Source:** `/opt/livekit1/frontend/components_old_backup/BotAvatar.tsx`

### Task 4.3: Restore Onboarding Wizard
**Source:** `/opt/livekit1/frontend/components_old_backup/OnboardingWizard.tsx`

---

## 📊 PROGRESS TRACKER

| Milestone | Status | Progress | ETA |
|-----------|--------|----------|-----|
| M1: Deployment | 🟡 In Progress | 25% | 4-6 hours |
| M2: Testing Tools | ⚪ Pending | 0% | 4-6 hours |
| M3: SIP Config | ⚪ Pending | 0% | 3-4 hours |
| M4: Advanced UI | ⚪ Pending | 0% | 4-5 hours |

**Total Estimated Time:** 15-21 hours  
**Current Session Time:** 1 hour  
**Remaining:** 14-20 hours

---

## 🚨 BLOCKERS & RISKS

### Current Blockers:
- None yet

### Potential Risks:
1. **API changes:** Old components may use different API format
2. **Dependencies:** May need additional npm packages
3. **LiveKit connection:** Testing tools require LiveKit credentials
4. **Process management:** Agent processes may fail to start

### Mitigation:
- Test each component incrementally
- Keep Flask backend logs visible
- Have rollback plan for each change

---

## 📝 NEXT IMMEDIATE STEPS

1. **Complete agent-list-item.tsx edits** - Add deploy/start/stop buttons
2. **Create deploy API routes** - Proxy to Flask backend
3. **Test deployment** - Create agent → Deploy → Verify running
4. **Begin Milestone 2** - Restore testing tools

---

## 🔗 USEFUL COMMANDS

```bash
# Restart Flask backend
pkill -f user_dashboard && cd /opt/livekit1 && python3 user_dashboard.py > user_dashboard.log 2>&1 &

# Rebuild and restart Next.js
cd /opt/livekit1/frontend && npm run build && pkill -f next-server && npm run start > /tmp/nextjs.log 2>&1 &

# Check running agents
ps aux | grep "main.py"

# View agent logs
tail -f /opt/livekit1/agents/*/agent.log

# Check Flask logs
tail -f /opt/livekit1/user_dashboard.log
```

---

**End of Implementation Guide**

# LiveKit Details - Architecture Update ✅

**Date**: October 28, 2025
**Status**: Deployed to Production
**Impact**: LiveKit Details now accurately reflects the dynamic routing architecture

---

## 🏗️ Architecture Change

### Old Architecture (Deprecated)
- Each agent config had its own dedicated LiveKit worker
- Individual agent.log files per agent
- Separate worker IDs, regions, uptimes per agent
- Each agent was a separate deployment

### New Architecture (Current)
- **Single tst0002 agent** handles ALL calls
- Agent configs are **database entries** loaded dynamically
- Routing based on: `phone number → agent_config_id → load config from DB`
- One shared LiveKit worker serves all agent configurations

---

## ❌ What Was Wrong

The LiveKit Details panel was showing:
- **Worker ID**: Unknown
- **Region**: Unknown
- **Uptime**: Unknown
- **LiveKit Cloud URL**: wss://ai-agent-d161ds18.livekit.cloud

This was confusing because it tried to display info for individual workers that don't exist anymore.

---

## ✅ What's Fixed

### Backend API (`/api/user/agents/{id}/livekit-info`)

**Before** (lines 912-1031):
```python
# Tried to read individual agent log files
log_file = os.path.join(agent.filePath, 'agent.log')

# Extracted worker ID, region, protocol from logs
if 'registered worker' in line:
    info['workerId'] = worker_match.group(1)
    info['region'] = region_match.group(1)

# Returned "Unknown" when logs didn't exist
info = {
    'workerId': 'Unknown',
    'region': 'Unknown',
    'uptime': 'Unknown'
}
```

**After** (lines 912-994):
```python
# Return architecture-accurate configuration info
info = {
    'configId': str(agent.id),
    'architecture': 'dynamic',
    'workerName': 'tst0002 (Shared Agent)',
    'status': 'Active Configuration',
    'loadingMethod': 'Database-Driven Routing',
    'url': os.getenv('LIVEKIT_URL', 'wss://ai-agent-d161ds18.livekit.cloud'),
    'protocol': 16,
    'lastUpdated': agent.updatedAt.isoformat(),
    'description': 'Config loaded dynamically by tst0002 agent'
}

# Check tst0002 worker uptime (shared across all configs)
tst0002_log = '/opt/livekit1/agents/tst0002/agent.log'
if os.path.exists(tst0002_log):
    # Calculate shared worker uptime
    info['workerUptime'] = uptime_str
```

### Frontend Component (`agent-list-item.tsx`)

**Updated Interface** (lines 19-30):
```typescript
interface AgentLiveKitInfo {
  configId?: string;           // Database config ID
  architecture?: string;        // "dynamic"
  workerName?: string;          // "tst0002 (Shared Agent)"
  status?: string;              // "Active Configuration"
  loadingMethod?: string;       // "Database-Driven Routing"
  url?: string;                 // LiveKit Cloud URL
  protocol?: number;            // Protocol version
  workerUptime?: string;        // Shared worker uptime
  lastUpdated?: string;         // Config last updated
  description?: string;         // Architecture explanation
}
```

**Updated Display** (lines 294-392):

Now shows:

1. **Architecture Info Banner**
   - "Dynamic Routing Architecture"
   - Explanation: "Config loaded by shared tst0002 agent"

2. **Worker & Status**
   - LiveKit Worker: `tst0002 (Shared Agent)`
   - Status: `Active Configuration`

3. **Config Details**
   - Config ID: First 8 chars of agent ID
   - Worker Uptime: Uptime of shared tst0002 worker

4. **Technical Info**
   - Protocol: v16
   - Loading: `Database-Driven Routing`

5. **LiveKit Cloud URL**
   - `wss://ai-agent-d161ds18.livekit.cloud`

---

## 📊 Before vs After Comparison

### Before (Confusing)
```
LiveKit Details
├─ Worker ID: Unknown           ❌ Misleading
├─ Region: Unknown               ❌ Not applicable
├─ Uptime: Unknown               ❌ Wrong scope
└─ LiveKit Cloud URL: wss://...  ✓ Correct
```

### After (Accurate)
```
LiveKit Details
├─ 🏗️ Dynamic Routing Architecture
│   └─ Config loaded by shared tst0002 agent
├─ LiveKit Worker: tst0002 (Shared Agent)  ✅ Accurate
├─ Status: Active Configuration             ✅ Clear
├─ Config ID: 1dea074b...                   ✅ Helpful
├─ Worker Uptime: 2d 14h                    ✅ Shared worker
├─ Protocol: v16                            ✅ Correct
├─ Loading: Database-Driven Routing         ✅ Explanatory
└─ LiveKit Cloud URL: wss://...             ✅ Correct
```

---

## 🎯 Key Improvements

### 1. Architectural Accuracy
- **Before**: Implied each config was a separate worker
- **After**: Clearly shows single shared worker architecture

### 2. User Understanding
- **Before**: "Unknown" everywhere created confusion
- **After**: Descriptive labels explain the system

### 3. Debugging Info
- **Before**: No useful debugging information
- **After**: Config ID, shared worker uptime, loading method

### 4. Visual Clarity
- **Before**: Plain text with "Unknown" values
- **After**: Color-coded info banner explaining architecture

---

## 🔧 Technical Details

### How Dynamic Routing Works

**Inbound Call Flow**:
```
1. Phone call arrives at +1-767-818-9426
2. Magnus creates SIP room: sip-7678189426__xxx
3. tst0002 agent joins room
4. Agent extracts phone number from room name
5. Queries database for agent_config_id assigned to that number
6. Loads configuration from database
7. Uses that config's instructions/voice/settings for the call
```

**Outbound Call Flow**:
```
1. User clicks "Test Call" on agent config
2. Creates room: {agent_config_id}__sip_xxx
3. tst0002 agent joins room
4. Agent extracts agent_config_id from room name
5. Loads configuration from database
6. Uses that config for the call
```

### Database Schema

**agent_configs table**:
```sql
CREATE TABLE agent_configs (
    id UUID PRIMARY KEY,
    userId UUID NOT NULL,
    name VARCHAR(255),
    instructions TEXT,
    llm_model VARCHAR(50),
    voice VARCHAR(50),
    temperature DECIMAL,
    turn_detection VARCHAR(50),
    status VARCHAR(50),  -- 'created' or 'deployed'
    createdAt TIMESTAMP,
    updatedAt TIMESTAMP
);
```

**Key Point**: `status = 'deployed'` means "available for use by tst0002 agent", NOT "has its own LiveKit worker"

### LiveKit Worker

**tst0002 agent**:
- Location: `/opt/livekit1/agents/tst0002/`
- Log file: `/opt/livekit1/agents/tst0002/agent.log`
- Uptime: Shared across all configurations
- Worker ID: Registered with LiveKit Cloud
- Function: Loads any agent config dynamically based on routing

---

## 📁 Files Modified

### Backend
1. **`/opt/livekit1/user_dashboard.py`** (lines 911-994)
   - Replaced log parsing logic with architecture-aware info
   - Added tst0002 worker uptime check
   - Returns config metadata instead of worker metadata

### Frontend
1. **`/opt/livekit1/frontend/components/agents/agent-list-item.tsx`**
   - Updated `AgentLiveKitInfo` interface (lines 19-30)
   - Redesigned LiveKit Details display (lines 294-392)
   - Added architecture explanation banner
   - Show shared worker info instead of per-config worker info

---

## 🧪 Testing

### Manual Testing Checklist

✅ **Agent List Page** (`/dashboard/agents`)
- [x] Open LiveKit Details for deployed agent
- [x] Verify "Dynamic Routing Architecture" banner shows
- [x] Verify worker name shows "tst0002 (Shared Agent)"
- [x] Verify status shows "Active Configuration"
- [x] Verify config ID displays (first 8 chars)
- [x] Verify worker uptime shows (if tst0002 is running)
- [x] Verify protocol shows "v16"
- [x] Verify loading method shows "Database-Driven Routing"
- [x] Verify LiveKit Cloud URL displays correctly

✅ **Multiple Agents**
- [x] Check that all deployed agents show same worker name
- [x] Check that all show same worker uptime (shared)
- [x] Check that each shows different config ID

✅ **Edge Cases**
- [x] Agent with status='created' (should not show LiveKit Details)
- [x] tst0002 agent not running (gracefully handles missing log)
- [x] Dark mode display (colors and contrast)

---

## 🚀 Deployment

**Build Status**: ✅ Successful in 18.1s
**Services Restarted**:
- ✅ livekit-frontend.service (17:35:56 UTC)
- ✅ livekit-backend.service (17:36:01 UTC)

**Live URL**: https://ai.epic.dm

**Deployment Steps**:
```bash
cd /opt/livekit1/frontend
npm run build
systemctl restart livekit-frontend.service
systemctl restart livekit-backend.service
```

---

## 💡 User-Facing Benefits

### For End Users
- **Clarity**: Understand that configs are loaded dynamically
- **Transparency**: See that all configs share one worker
- **Debugging**: Config ID helps identify specific configurations

### For Admins/Developers
- **Architecture Understanding**: Clear display of dynamic routing
- **Worker Monitoring**: See shared worker uptime
- **Configuration Tracking**: Config ID for database lookups

### For Sales/Support
- **Accurate Explanation**: Can explain "single worker, many configs"
- **Differentiation**: Show superior architecture vs competitors
- **Confidence**: No more "Unknown" values to explain away

---

## 📚 Related Documentation

- [ROOM_PREFIX_FIX.md](ROOM_PREFIX_FIX.md) - Room prefix routing implementation
- [INBOUND_ROUTING_FIX.md](INBOUND_ROUTING_FIX.md) - Phone number → config routing
- [WIZARD_NAVIGATION_BUG_FIX.md](WIZARD_NAVIGATION_BUG_FIX.md) - Navigation button fix
- [WIZARD_NEXT_LEVEL_UPGRADE.md](WIZARD_NEXT_LEVEL_UPGRADE.md) - Schema-driven wizard

---

## 🎓 Architecture Benefits

### Scalability
- **Before**: N agents = N LiveKit workers (expensive)
- **After**: N configs = 1 LiveKit worker (efficient)

### Simplicity
- **Before**: Deploy/undeploy individual workers
- **After**: Just activate/deactivate configs in database

### Cost
- **Before**: LiveKit worker costs scale with agent count
- **After**: Fixed cost for single worker, unlimited configs

### Flexibility
- **Before**: Changing config requires redeploying worker
- **After**: Config changes applied immediately (no redeploy)

---

**Status**: ✅ Complete and Deployed
**Next**: Monitor user feedback on new display format

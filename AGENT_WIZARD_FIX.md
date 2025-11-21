# AI Agent Wizard Fix - Phone Number Assignment Step

## Issue Identified

The AI agent creation wizard was missing the phone number assignment step (Step 4). The wizard only had 3 steps:
1. Basic Info (name, description) ✓
2. Instructions & Voice (instructions, LLM, voice, temperature) ✓
3. Advanced Settings (VAD, turn detection, noise cancellation) ✓
4. **MISSING** - Phone Number Assignment ❌

According to the original design, there should be a 4th step for assigning phone numbers to the agent.

## Root Cause

The phone number assignment step component was never created during the initial wizard implementation.

## Solution Implemented

### 1. Created New Wizard Step Component
**File**: [frontend/components/agents/agent-wizard-step4.tsx](frontend/components/agents/agent-wizard-step4.tsx)

Features:
- Multi-select dropdown for available phone numbers
- Real-time loading from phone numbers API
- Visual phone number display with country flags
- Formatted phone numbers (e.g., "+1 (767) 818-9426")
- Empty state when no phone numbers available
- Selected phone preview with details
- Configuration summary review panel
- Optional assignment (can skip step)

### 2. Updated Agent Schema
**File**: [frontend/lib/schemas/agent-schema.ts](frontend/lib/schemas/agent-schema.ts)

Changes:
- Added `agentWizardStep4Schema` for phone number IDs
- Updated `agentCreateSchema` to include Step 4 fields
- Added `phone_number_ids: []` to default values
- Updated comments to reflect 4-step wizard

### 3. Updated Wizard Page
**File**: [frontend/app/dashboard/agents/new/page.tsx](frontend/app/dashboard/agents/new/page.tsx)

Changes:
- Changed `totalSteps` from 3 to 4
- Imported `AgentWizardStep4` component
- Added Step 4 to renderStep() switch
- Added Step 4 validation (optional, always passes)
- Updated progress labels: "Basic Info", "Instructions", "Settings", "Phone Numbers"
- Updated header text: "Set up your AI voice agent in just 4 simple steps"

### 4. Updated Backend API
**File**: [user_dashboard.py](user_dashboard.py) (lines 573-604)

Added phone number assignment logic after agent creation:
```python
# Handle phone number assignment if provided
phone_number_ids = data.get('phone_number_ids', [])
if phone_number_ids and len(phone_number_ids) > 0:
    try:
        from database import PhoneNumberPool

        for phone_id in phone_number_ids:
            # Check if phone number exists and belongs to user
            phone = db.query(PhoneNumberPool).filter(
                PhoneNumberPool.id == phone_id,
                PhoneNumberPool.userId == user_id
            ).first()

            if phone:
                # Assign phone number to agent via phone_mappings table
                phone_mapping = PhoneMapping(
                    id=str(uuid.uuid4()),
                    phoneNumber=phone.phoneNumber,
                    agentConfigId=agent_id,
                    sipTrunkId=phone.livekitInboundTrunkId,
                    userId=user_id,
                    isActive=True
                )
                db.add(phone_mapping)
                print(f"✅ Assigned phone {phone.phoneNumber} to agent {data['name']}")
```

## Wizard Flow

### Complete 4-Step Flow:

**Step 1: Basic Information**
- Agent Name (3-50 characters)
- Description (10-500 characters with counter)

**Step 2: Instructions & Voice**
- System Instructions (20-2000 characters with counter)
- LLM Model selection (GPT-4o Mini, GPT-4o, Claude 3.5 Sonnet)
- Voice selection (Alloy, Echo, Fable, Nova, Onyx, Shimmer)
- Temperature slider (0-1)

**Step 3: Advanced Settings**
- Voice Activity Detection (VAD) toggle
- Turn Detection mode (Semantic vs VAD-based)
- Noise Cancellation toggle

**Step 4: Phone Number Assignment** ✨ NEW
- Multi-select phone number dropdown
- Shows only available (unassigned) phone numbers
- Visual phone number display with country flags
- Optional step - can skip and assign later
- Configuration summary review panel

## Technical Details

### HeroUI Select Component
Used HeroUI's Select component with multi-selection:
```tsx
<Select
  selectionMode="multiple"
  selectedKeys={field.value || []}
  onSelectionChange={(keys) => {
    const selectedArray = Array.from(keys) as string[];
    field.onChange(selectedArray);
  }}
  renderValue={(items) => {
    // Custom chip rendering for selected phone numbers
  }}
>
  {availablePhones.map((phone) => (
    <SelectItem key={phone.id} textValue={phone.number}>
      {/* Phone number with flag and status */}
    </SelectItem>
  ))}
</Select>
```

### Phone Number Filtering
Only shows phone numbers that can be assigned:
```tsx
const availablePhones = phoneNumbers.filter(canAssignPhoneNumber);
```

Where `canAssignPhoneNumber` checks:
- Status is `ACTIVE`
- `agent_id` is `null` (not already assigned)

### Database Integration
Uses `usePhoneNumbers()` hook to fetch available phone numbers from:
- Frontend API: `GET /api/user/phone-numbers`
- Backend: Queries `phone_number_pool` table filtered by user

### Phone Assignment Logic
When wizard is submitted with selected phone numbers:
1. Frontend sends `phone_number_ids: ["uuid1", "uuid2"]` to backend
2. Backend creates agent in `agent_configs` table
3. Backend creates entries in `phone_mappings` table linking phones to agent
4. Each mapping includes: `phoneNumber`, `agentConfigId`, `sipTrunkId`, `userId`

## Testing Status

✅ **Compilation**: No TypeScript/Next.js errors
✅ **Dev Server**: Running successfully on http://localhost:3001
✅ **Schema Validation**: Zod schema updated and valid
✅ **Component Structure**: All 4 steps implemented
✅ **API Integration**: Backend handles phone assignment

⏳ **Pending**: End-to-end browser testing with actual phone number assignment

## Files Changed

### Created
- `frontend/components/agents/agent-wizard-step4.tsx` - New phone assignment step

### Modified
- `frontend/lib/schemas/agent-schema.ts` - Added Step 4 schema
- `frontend/app/dashboard/agents/new/page.tsx` - Updated wizard flow
- `user_dashboard.py` - Added phone assignment backend logic

## Benefits

1. **Complete Workflow**: Users can now assign phone numbers during agent creation
2. **Better UX**: No need to navigate to separate page for phone assignment
3. **Visual Feedback**: Clear display of selected phones and configuration summary
4. **Flexible**: Phone assignment is optional - can be done later if needed
5. **Safe**: Only shows available phone numbers, prevents double-assignment

## Next Steps

1. ✅ Compile and verify no errors
2. 📝 Test wizard end-to-end in browser
3. 📝 Test phone number assignment creates proper database entries
4. 📝 Verify inbound calls route correctly to newly created agents
5. 📝 Test edge cases:
   - Creating agent without phone assignment
   - Creating agent with multiple phone assignments
   - Attempting to assign already-assigned phones (should not appear)

## Notes

- Phone assignment step is **optional** - users can skip and assign later
- Multi-selection allows assigning multiple phone numbers to one agent
- Phone numbers can be reassigned to different agents later via phone management
- Each phone number can only be assigned to one agent at a time
- Configuration summary shows all settings before final submission

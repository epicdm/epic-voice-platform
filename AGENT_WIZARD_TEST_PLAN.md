# Agent Creation Wizard - Test Plan

## Test Environment
- **URL**: https://ai.epic.dm/dashboard/agents/new
- **Date**: 2025-11-18
- **Version**: Enhanced with Templates & Phone Provisioning

## Pre-Test Status
✅ **Existing Agents**: 5 agents in database
✅ **Available Phone Numbers**: 5 numbers available
✅ **Backend Status**: Flask running on port 5001
✅ **Frontend Status**: Next.js production server running
✅ **Build Status**: Clean build completed

## Test Cases

### Test 1: Template Selection Flow
**Objective**: Verify template selection works and pre-fills wizard

**Steps**:
1. Navigate to `/dashboard/agents/new`
2. Verify template selection screen appears with:
   - "Start with a Template" header with ✨ icon
   - "Skip & Start from Scratch" button
   - 3 popular templates displayed (Appointment Booking, Technical Support, Customer Support)
3. Click on "Customer Support Agent" template
4. Verify:
   - Template is selected (checkmark appears)
   - Screen transitions to agent type/details section
   - Name field is pre-filled with "Customer Support Agent"
   - Description is pre-filled
5. Click "Next" to proceed to Step 2
6. Verify instructions field is pre-filled with template instructions
7. Verify voice and other settings match template defaults

**Expected Results**:
- ✅ All template data is correctly applied to form
- ✅ Navigation between steps works smoothly
- ✅ "Change Template" button appears in header

---

### Test 2: Skip Templates (Custom Agent)
**Objective**: Verify users can bypass templates and create custom agents

**Steps**:
1. Navigate to `/dashboard/agents/new`
2. Click "Skip & Start from Scratch" button
3. Verify:
   - Template selection screen disappears
   - Agent type cards appear (Inbound, Outbound, Hybrid)
   - Name and Description fields appear
4. Select "Inbound" agent type
5. Fill in Name: "Test Custom Agent"
6. Fill in Description: "This is a custom agent for testing"
7. Click "Next"
8. Fill in custom instructions
9. Complete remaining steps
10. Create agent

**Expected Results**:
- ✅ Form fields start empty
- ✅ User has full control over all settings
- ✅ Agent is created successfully

---

### Test 3: Phone Number Assignment (Existing Numbers)
**Objective**: Verify existing phone number selection works

**Steps**:
1. Create agent using template or custom flow
2. Navigate to Step 4 (Phone Numbers)
3. Verify:
   - "Provision New Number" button is visible
   - Dropdown shows available phone numbers
   - Current available numbers are listed
4. Select one or more phone numbers
5. Verify selected numbers appear in "Selected Phone Numbers" preview
6. Click "Create Agent"
7. Verify agent is created with assigned numbers

**Expected Results**:
- ✅ Phone numbers are selectable
- ✅ Preview shows selected numbers
- ✅ Agent creation succeeds
- ✅ Database shows phone numbers assigned to agent

---

### Test 4: Phone Number Provisioning
**Objective**: Verify new phone number provisioning works from wizard

**Steps**:
1. Create agent using any flow
2. Navigate to Step 4 (Phone Numbers)
3. Click "Provision New Number" button
4. Verify modal opens with:
   - Title: "Provision New Phone Number"
   - Country selection (US, CA, GB)
   - Note about charges
   - Cancel and "Provision Number" buttons
5. Select "United States"
6. Click "Provision Number"
7. Wait for provisioning to complete
8. Verify:
   - Success toast appears with new number
   - Phone numbers list refreshes
   - New number is auto-selected
9. Complete agent creation

**Expected Results**:
- ✅ Modal opens correctly
- ✅ Provisioning succeeds (if backend supports it)
- ✅ New number is auto-selected
- ✅ Agent is created with new number

---

### Test 5: Form Validation
**Objective**: Verify all validation rules work correctly

**Steps**:
1. Navigate to wizard
2. Skip templates
3. Try clicking "Next" without filling required fields
4. Verify error messages appear for:
   - Agent type (if not selected)
   - Name (if empty or too short)
   - Description (if empty or too short)
5. Fill in invalid data and verify validation:
   - Name less than 3 characters
   - Description less than 10 characters
6. Verify validation passes when correct data is entered

**Expected Results**:
- ✅ All required fields show errors when empty
- ✅ Length validation works correctly
- ✅ Error messages are clear and helpful

---

### Test 6: Step Navigation
**Objective**: Verify wizard navigation works correctly

**Steps**:
1. Create an agent
2. Click "Next" to go to Step 2
3. Click "Back" to return to Step 1
4. Verify data is preserved
5. Navigate to Step 3
6. Click "Back" twice to return to Step 1
7. Complete all steps forward
8. Verify progress indicator updates correctly

**Expected Results**:
- ✅ "Next" and "Back" buttons work
- ✅ Form data persists when navigating
- ✅ Progress indicator shows correct step
- ✅ Completed steps show checkmarks

---

### Test 7: Template Change Mid-Wizard
**Objective**: Verify users can change templates after selection

**Steps**:
1. Select a template (e.g., "Customer Support Agent")
2. Proceed to Step 2
3. Click "Change Template" button (if visible)
4. Select a different template
5. Verify all form fields update to new template
6. Complete agent creation

**Expected Results**:
- ✅ "Change Template" button is accessible
- ✅ Template switch updates all fields
- ✅ No data corruption occurs

---

### Test 8: End-to-End Agent Creation
**Objective**: Create a complete agent from start to finish

**Steps**:
1. Navigate to wizard
2. Select "Sales Outreach Agent" template
3. Modify name to "Test Sales Agent - Nov 18"
4. Click "Next" through all steps
5. On Step 4, select 1 phone number
6. Click "Create Agent"
7. Wait for creation to complete
8. Verify redirect to agents list
9. Verify new agent appears in list
10. Check database to confirm agent was created

**Expected Results**:
- ✅ Agent appears in agents list
- ✅ Database has new agent record
- ✅ Phone number is assigned
- ✅ All template settings are applied

---

## Database Verification Queries

After each test, run these queries to verify data integrity:

```sql
-- Check latest agent
SELECT id, name, description, instructions, "isActive"
FROM agent_configs
ORDER BY "createdAt" DESC
LIMIT 1;

-- Check phone number assignments
SELECT pnp.id, pnp."phoneNumber", pnp."assignedToAgentId", ac.name as agent_name
FROM phone_number_pool pnp
LEFT JOIN agent_configs ac ON pnp."assignedToAgentId" = ac.id
WHERE pnp."assignedToAgentId" IS NOT NULL
ORDER BY pnp."updatedAt" DESC
LIMIT 5;
```

---

## Known Issues / Notes

1. **Phone Provisioning**: May require Magnus API credentials to be properly configured
2. **Template Instructions**: Are quite long, ensure they fit in database text fields
3. **Agent Type Field**: Not currently in database schema, may need migration

---

## Success Criteria

✅ All 8 test cases pass
✅ No console errors in browser
✅ No backend errors in Flask logs
✅ Database integrity maintained
✅ User experience is smooth and intuitive

---

## Test Results

### Test 1: Template Selection Flow
**Status**: ⏳ PENDING
**Notes**:

### Test 2: Skip Templates (Custom Agent)
**Status**: ⏳ PENDING
**Notes**:

### Test 3: Phone Number Assignment
**Status**: ⏳ PENDING
**Notes**:

### Test 4: Phone Number Provisioning
**Status**: ⏳ PENDING
**Notes**:

### Test 5: Form Validation
**Status**: ⏳ PENDING
**Notes**:

### Test 6: Step Navigation
**Status**: ⏳ PENDING
**Notes**:

### Test 7: Template Change Mid-Wizard
**Status**: ⏳ PENDING
**Notes**:

### Test 8: End-to-End Agent Creation
**Status**: ⏳ PENDING
**Notes**:

---

## Final Summary
**Date**: 2025-11-18
**Overall Status**: ⏳ TESTING IN PROGRESS
**Pass Rate**: 0/8 (0%)

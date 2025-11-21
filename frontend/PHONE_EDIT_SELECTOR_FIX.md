# Phone Selector Fix for Edit Mode

**Date**: 2025-11-19
**Issue**: Phone selector error in agent edit mode
**Status**: ✅ FIXED

---

## Problem

When editing an agent with an assigned phone number, the phone selector showed an error:

```
Select: Keys "81e579b5-338e-4b99-90bf-acf2cca00e65" passed to "selectedKeys"
are not present in the collection.
```

**Root Cause**: The `canAssignPhoneNumber` filter excluded phones with `agent_id` set, but when editing an agent, the currently assigned phone has that agent's ID, so it was filtered out of the available list.

---

## Solution

Modified `/opt/livekit1/frontend/components/agents/agent-wizard-step4.tsx` (lines 32-43):

**Before**:
```typescript
// Filter to only show unassigned phone numbers
const availablePhones = phoneNumbers.filter(canAssignPhoneNumber);

// Watch selected phone numbers
const selectedPhoneIds = watch("phone_number_ids") || [];
```

**After**:
```typescript
// Watch selected phone numbers
const selectedPhoneIds = watch("phone_number_ids") || [];

// Filter to show unassigned phone numbers + currently selected phone (for edit mode)
const availablePhones = phoneNumbers.filter(phone => {
  // Always include if currently selected (edit mode)
  if (selectedPhoneIds.includes(phone.id)) {
    return true;
  }
  // Otherwise only show unassigned phones
  return canAssignPhoneNumber(phone);
});
```

---

## How It Works

**Creation Mode**:
- `selectedPhoneIds` is empty `[]`
- Filter shows only unassigned phones (`canAssignPhoneNumber` returns true)
- User selects from available phones

**Edit Mode**:
- `selectedPhoneIds` contains the currently assigned phone ID (e.g., `["81e579b5-..."]`)
- Filter includes:
  1. The currently selected phone (even if assigned to this agent)
  2. All unassigned phones
- User sees current phone pre-selected and can change to any unassigned phone

---

## Benefits

1. ✅ **No Selector Errors**: Phone ID is always in the collection
2. ✅ **Seamless Edit Experience**: Current phone appears in dropdown
3. ✅ **Creation Mode Unaffected**: Still only shows unassigned phones when creating
4. ✅ **Single Code Path**: Same component works for both create and edit

---

## Testing

### Test Case 1: Edit Agent with Assigned Phone
1. Navigate to `/dashboard/agents`
2. Click "Edit" on agent with phone number
3. Go to Step 4 (Phone Numbers)
4. **Expected**:
   - ✅ No console errors
   - ✅ Current phone number is pre-selected in dropdown
   - ✅ Can see other available phones
   - ✅ Can change to different phone or remove

### Test Case 2: Edit Agent without Phone
1. Navigate to `/dashboard/agents`
2. Click "Edit" on agent without phone number
3. Go to Step 4 (Phone Numbers)
4. **Expected**:
   - ✅ No console errors
   - ✅ Dropdown shows all available phones
   - ✅ Can select any available phone

### Test Case 3: Create New Agent
1. Navigate to `/dashboard/agents/new`
2. Go through steps to Step 4
3. **Expected**:
   - ✅ No console errors
   - ✅ Dropdown shows only unassigned phones
   - ✅ Works exactly as before

---

## Files Modified

- `/opt/livekit1/frontend/components/agents/agent-wizard-step4.tsx` (lines 32-43)

---

## Services Restarted

- ✅ Frontend built successfully
- ✅ livekit-frontend.service restarted
- ✅ apache2 restarted
- ✅ Flask backend running (PID 1460080)

---

## Related Fixes

This fix was part of the phone number edit feature implementation. See:
- `/opt/livekit1/frontend/PHONE_NUMBER_EDIT_FEATURE_COMPLETE.md`
- `/opt/livekit1/frontend/TEST_CALL_FINAL_FIX.md`

---

**Status**: ✅ DEPLOYED
**Testing Required**: Manual testing of edit flow
**Ready**: ✅ YES

---

**Fixed**: 2025-11-19 19:26
**Build**: ✅ SUCCESS
**Services**: ✅ ACTIVE

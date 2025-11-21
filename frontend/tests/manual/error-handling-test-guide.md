# Error Handling & Edge Cases Test Guide (Phase 7)

This guide covers manual testing scenarios for T055-T061 to verify error handling and edge cases are properly implemented.

## Test Environment Setup

Before running these tests:
1. Ensure backend is running
2. Have browser DevTools open (Console + Network tabs)
3. Clear browser cache and localStorage
4. Start with a fresh session

---

## T055: Network Timeout Scenario

**Objective**: Verify all pages show error messages with "Retry" button when backend is unavailable.

### Test Steps:

1. **Stop the backend server**
   ```bash
   # Stop the backend process
   pkill -f "python.*uvicorn"
   ```

2. **Test Each Page**:
   - Navigate to `/dashboard`
   - Navigate to `/dashboard/agents`
   - Navigate to `/dashboard/agents/new`
   - Navigate to `/dashboard/phone-numbers`
   - Navigate to `/dashboard/calls`
   - Navigate to `/dashboard/analytics`
   - Navigate to `/dashboard/settings`

3. **Expected Behavior**:
   - ✅ Loading state appears initially
   - ✅ After 30 seconds (timeout), error message appears
   - ✅ Error message is clear (e.g., "Failed to load [resource]")
   - ✅ "Retry" button is visible
   - ✅ No console errors about unhandled promises

4. **Test Retry Functionality**:
   - Click "Retry" button (should show same error while backend is down)
   - Restart backend
   - Click "Retry" button again
   - ✅ Data loads successfully
   - ✅ Error message disappears
   - ✅ Content displays properly

### Expected Results:
- [ ] Dashboard shows error with retry
- [ ] Agents page shows error with retry
- [ ] Agent wizard shows error with retry
- [ ] Phone numbers page shows error with retry
- [ ] Call history page shows error with retry
- [ ] Analytics page shows error with retry
- [ ] Settings page shows error with retry
- [ ] All retry buttons work after backend restart

---

## T056: Validation Error Scenario

**Objective**: Verify inline validation errors display correctly for invalid form inputs.

### Test Scenario 1: Agent Wizard - Too Short Name

1. Navigate to `/dashboard/agents/new`
2. Step 1: Enter name "Ab" (only 2 characters)
3. Click "Next"

**Expected**:
- ✅ Error message appears below name field: "Name must be at least 3 characters"
- ✅ Cannot proceed to Step 2
- ✅ Field is highlighted with red border
- ✅ Error message is red text

4. Enter valid name (3+ characters)
5. Click "Next"

**Expected**:
- ✅ Error disappears
- ✅ Proceeds to Step 2

### Test Scenario 2: Agent Wizard - Too Short Description

1. In Step 1: Enter description with only 5 characters
2. Click "Next"

**Expected**:
- ✅ Error message: "Description must be at least 10 characters"
- ✅ Cannot proceed to Step 2

### Test Scenario 3: Phone Provision - Invalid Area Code

1. Navigate to `/dashboard/phone-numbers`
2. Click "Add Phone Number"
3. Select country "US"
4. Enter area code "99" (only 2 digits)
5. Click "Provision"

**Expected**:
- ✅ Error message: "Area code must be 3 digits"
- ✅ Field highlighted in red
- ✅ Modal does not close
- ✅ API call not made (check Network tab)

### Test Scenario 4: Settings - Invalid Timezone

1. Navigate to `/dashboard/settings`
2. Try to select an invalid timezone (if possible) or leave required field empty
3. Click "Save Changes"

**Expected**:
- ✅ Validation error displays
- ✅ Form cannot submit
- ✅ Fields remain editable

### Expected Results:
- [ ] Agent name validation works (min 3, max 50 chars)
- [ ] Agent description validation works (min 10, max 500 chars)
- [ ] Agent instructions validation works (min 20, max 2000 chars)
- [ ] Phone area code validation works (exactly 3 digits or empty)
- [ ] Settings timezone validation works
- [ ] All inline errors display in red below fields
- [ ] Forms cannot submit while invalid
- [ ] Errors clear when input becomes valid

---

## T057: Magnus Billing Unavailable Scenario

**Objective**: Verify specific error message when Magnus Billing service is unavailable.

### Test Steps:

1. **Mock Magnus Unavailable Error**:
   - Open DevTools → Network tab
   - Add a network request override for `/api/user/phone-numbers`
   - Mock response:
     ```json
     {
       "success": false,
       "error": {
         "code": "MAGNUS_UNAVAILABLE",
         "message": "Magnus Billing service is temporarily unavailable"
       }
     }
     ```
   - Set status code: 503

2. **Trigger Phone Provisioning**:
   - Navigate to `/dashboard/phone-numbers`
   - Click "Add Phone Number"
   - Fill form with valid data
   - Click "Provision"

3. **Expected Behavior**:
   - ✅ Loading state shows "Provisioning..."
   - ✅ After mock response, specific error message displays
   - ✅ Error includes: "Magnus Billing service is temporarily unavailable"
   - ✅ "Retry" button is visible
   - ✅ Modal remains open (doesn't close on error)
   - ✅ Toast notification shows error

4. **Test Retry**:
   - Remove network override
   - Click "Retry" button
   - ✅ Provision should succeed (if backend is working)

### Expected Results:
- [ ] Loading state displays during API call
- [ ] Specific Magnus error message shows
- [ ] Error message mentions "temporarily unavailable"
- [ ] "Retry" button is present
- [ ] Retry button works when service restored
- [ ] Toast notification appears

---

## T058: Destructive Action Confirmation

**Objective**: Verify confirmation dialogs appear for destructive actions and function correctly.

### Test Scenario 1: Delete Agent

1. Navigate to `/dashboard/agents`
2. Find an agent card
3. Click "Delete" button

**Expected**:
- ✅ Confirmation dialog appears
- ✅ Dialog shows warning icon
- ✅ Dialog title: "Delete Agent"
- ✅ Dialog message includes agent name
- ✅ Dialog message: "This action cannot be undone"
- ✅ Two buttons: "Cancel" and "Delete"
- ✅ "Delete" button is red/danger color

4. Click "Cancel"

**Expected**:
- ✅ Dialog closes
- ✅ Agent NOT deleted
- ✅ Agent still appears in list

5. Click "Delete" again
6. Click "Delete" (confirm)

**Expected**:
- ✅ Loading state on "Delete" button
- ✅ Dialog closes after API success
- ✅ Success toast: "Agent deleted"
- ✅ Agent removed from list
- ✅ No console errors

### Test Scenario 2: Delete Phone Number

1. Navigate to `/dashboard/phone-numbers`
2. Find an UNASSIGNED phone number
3. Click "Delete" button

**Expected**:
- ✅ Confirmation dialog appears
- ✅ Shows phone number in message
- ✅ Warning about irreversibility

4. Test Cancel and Confirm (same as above)

### Test Scenario 3: Delete Assigned Phone Number

1. Find an ASSIGNED phone number (status = "Active")
2. Verify "Delete" button is DISABLED

**Expected**:
- ✅ Delete button is grayed out
- ✅ Cannot click delete button
- ✅ No dialog appears

### Test Scenario 4: Unassign Phone Number

1. Find an assigned phone number
2. Click "Unassign" button

**Expected**:
- ✅ Confirmation dialog appears
- ✅ Warning message about phone stopping to receive calls
- ✅ Shows agent name phone is assigned to

3. Click "Confirm"

**Expected**:
- ✅ Success toast appears
- ✅ Phone status changes to "Available"
- ✅ "Assign to Agent" button appears
- ✅ "Unassign" button disappears

### Expected Results:
- [ ] Agent deletion shows confirmation dialog
- [ ] Phone deletion shows confirmation dialog
- [ ] Unassignment shows confirmation dialog
- [ ] Cancel button works (does not delete)
- [ ] Confirm button works (deletes/unassigns)
- [ ] Assigned phones cannot be deleted (button disabled)
- [ ] All confirmation dialogs use red/danger styling
- [ ] All show "cannot be undone" warning
- [ ] Loading states show during operations

---

## T059: Navigate Away from Wizard Mid-Creation

**Objective**: Verify form state is reset when navigating away from wizard.

### Test Steps:

1. Navigate to `/dashboard/agents/new`
2. Fill Step 1:
   - Name: "Test Agent"
   - Description: "This is a test agent for validation"
3. Click "Next" to go to Step 2
4. Fill Step 2:
   - Instructions: "You are a helpful assistant"
   - Select LLM model
   - Select voice
5. **Navigate away** (click browser back button or navigate to different page)

**Expected**:
- ✅ Navigation succeeds (no confirmation dialog)
- ✅ User leaves wizard page

6. Navigate back to `/dashboard/agents/new`

**Expected**:
- ✅ Wizard is back to Step 1
- ✅ All fields are empty (form reset)
- ✅ Progress shows "Step 1 of 3"
- ✅ Previous data is NOT retained

**Note**: This is expected behavior per spec.md - wizard does not save progress.

### Expected Results:
- [ ] Can navigate away from wizard without confirmation
- [ ] Form state is not saved
- [ ] Returning to wizard shows clean Step 1
- [ ] No errors in console
- [ ] Progress indicator resets

---

## T060: Slow 3G Connection

**Objective**: Verify loading states remain visible and timeout works on slow connections.

### Test Steps:

1. **Throttle Network**:
   - Open DevTools → Network tab
   - Change throttling to "Slow 3G"
   - Disable cache

2. **Test Dashboard Load**:
   - Navigate to `/dashboard`
   - Observe loading behavior

**Expected**:
- ✅ Skeleton loaders appear immediately
- ✅ Loaders remain visible for extended time
- ✅ No flickering or content jumps
- ✅ Eventually, either data loads OR timeout error appears
- ✅ If timeout (30s), shows error with "Retry" button

3. **Test Agent Creation**:
   - Navigate to `/dashboard/agents/new`
   - Fill all 3 steps
   - Click "Create Agent"

**Expected**:
- ✅ "Create Agent" button shows "Creating..." state
- ✅ Button remains disabled during submission
- ✅ Loading state visible for entire request
- ✅ Eventually succeeds or shows timeout error
- ✅ If timeout, "Retry" button appears

4. **Test Phone Provisioning**:
   - Click "Add Phone Number"
   - Fill form
   - Click "Provision"

**Expected**:
- ✅ "Provisioning..." state shows
- ✅ Loading spinner visible
- ✅ Modal remains open during request
- ✅ Timeout after 30 seconds with error message

5. **Restore Network**:
   - Change throttling back to "No throttling"
   - Click "Retry" on any failed operation
   - ✅ Should succeed quickly

### Expected Results:
- [ ] All pages show skeleton loaders on slow connections
- [ ] Loading states do not flicker or disappear prematurely
- [ ] Buttons show loading text (e.g., "Creating...", "Saving...")
- [ ] 30-second timeout triggers error messages
- [ ] Timeout errors show "Retry" button
- [ ] Retry works after network restored
- [ ] No console errors during slow loads

---

## T061: Server-Side Validation Different from Frontend

**Objective**: Verify server errors display when frontend validation passes but backend rejects.

### Test Scenario 1: Agent Creation - Backend Validation

1. **Mock Server Validation Error**:
   - Use DevTools to intercept `/api/user/agents` POST request
   - Return:
     ```json
     {
       "success": false,
       "error": {
         "code": "VALIDATION_ERROR",
         "message": "Agent name already exists",
         "details": {
           "field": "name",
           "issue": "duplicate"
         }
       }
     }
     ```
   - Status: 400

2. **Submit Agent Form**:
   - Fill wizard with valid data (passes frontend validation)
   - Click "Create Agent"

**Expected**:
- ✅ Form submits (frontend validation passes)
- ✅ Loading state shows
- ✅ Error message appears after API response
- ✅ Error displays inline or in error banner
- ✅ Error message: "Agent name already exists"
- ✅ Form remains editable
- ✅ User can fix issue and retry

### Test Scenario 2: Settings - Invalid Server Data

1. Mock `/api/user/profile` PUT with validation error:
   ```json
   {
     "success": false,
     "error": {
       "code": "VALIDATION_ERROR",
       "message": "Timezone is not supported",
       "details": {
         "field": "timezone"
       }
     }
   }
   ```

2. Submit settings form

**Expected**:
- ✅ Server error displays
- ✅ Error shows near affected field or in banner
- ✅ "Retry" button appears
- ✅ Form stays editable

### Test Scenario 3: Phone Assignment - Already Assigned

1. Mock assignment error:
   ```json
   {
     "success": false,
     "error": {
       "code": "AGENT_IN_USE",
       "message": "Agent already has a phone number assigned"
     }
   }
   ```

2. Try to assign phone

**Expected**:
- ✅ Error message displays in modal
- ✅ Modal stays open
- ✅ User can close modal or retry
- ✅ Toast notification shows error

### Expected Results:
- [ ] Server validation errors display clearly
- [ ] Error messages are specific (not generic)
- [ ] Forms remain editable after server errors
- [ ] "Retry" buttons available
- [ ] Toast notifications show for server errors
- [ ] No page crashes or white screens
- [ ] Console shows error details for debugging

---

## Test Completion Checklist

### Overall Requirements:
- [ ] All 7 test scenarios completed
- [ ] All expected results verified
- [ ] No console errors during any test
- [ ] Error boundaries never triggered during normal errors
- [ ] All error messages are user-friendly (not technical jargon)
- [ ] All "Retry" buttons work correctly
- [ ] Loading states consistent across platform
- [ ] No data loss during error scenarios

### Documentation:
- [ ] Any bugs found documented
- [ ] Screenshots of error states captured
- [ ] Browser compatibility verified (Chrome, Firefox, Safari)
- [ ] Mobile responsiveness of error states verified

---

## Common Issues to Watch For:

1. **Console Errors**: Unhandled promise rejections, React errors
2. **Flickering**: Loading states appearing/disappearing too quickly
3. **Generic Errors**: "An error occurred" instead of specific messages
4. **Missing Retry**: Error states without way to recover
5. **Loading Stuck**: Loading state never clears
6. **Form Loss**: User input lost after error
7. **Modal Bugs**: Modals closing when they shouldn't
8. **Network Tab**: Unnecessary duplicate API calls

---

## Success Criteria (Phase 7 Complete):

✅ All pages gracefully handle network timeouts
✅ All forms show inline validation errors
✅ Magnus Billing errors show specific messages
✅ All destructive actions require confirmation
✅ Wizard resets state when navigating away
✅ Platform works on slow connections with proper timeouts
✅ Server-side validation errors display properly
✅ Zero console errors during error scenarios
✅ All error states have recovery paths (retry/close)
✅ Error messages are clear and actionable

---

**Note**: This is a MANUAL testing guide. These tests verify that the error handling code already implemented in Phases 1-6 works correctly in edge case scenarios.

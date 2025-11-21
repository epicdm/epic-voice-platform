# Funnel Editor - User Experience Test Guide

## Test Date: November 15, 2025
## Purpose: Verify complete funnel creation workflow

---

## 🎯 Real User Flow Test Scenarios

### Test 1: Create a Simple Linear Funnel
**Goal:** Test basic funnel creation with sequential nodes

**Steps:**
1. Navigate to http://[your-domain]/dashboard/funnels
2. Click "Create New Funnel" button
3. Enter funnel details:
   - Name: "Test Welcome Sequence"
   - Description: "Call → Delay → Email → End"
4. Click on funnel to edit

5. **Add Nodes:**
   - Click "Call" button (left sidebar)
   - Click "Delay" button
   - Click "Email" button
   - Click "End" button

   You should now see 4 nodes on the canvas

6. **Connect Nodes (CRITICAL TEST):**
   - Hover over the **bottom** of the "Call" node
   - You should see a blue circle (source handle)
   - Click and drag from this circle to the **top** of the "Delay" node
   - Release when you see the target handle highlight
   - A line should appear connecting Call → Delay

   Repeat for:
   - Delay → Email
   - Email → End

7. **Configure Nodes:**
   - Click on "Call" node
   - Right panel should show configuration options
   - Select an AI agent
   - Click "Update Config"

   - Click on "Delay" node
   - Set duration (e.g., 5 minutes)
   - Click "Update Config"

8. **Save and Activate:**
   - All nodes should be connected
   - All nodes should be configured
   - Click "Activate Funnel" (if button exists)

**Expected Results:**
✅ All 4 nodes visible on canvas
✅ 3 edges connecting them (Call→Delay, Delay→Email, Email→End)
✅ Each node shows configured settings
✅ Can drag nodes around without breaking connections
✅ Can undo/redo (Ctrl+Z, Ctrl+Y)
✅ Can delete nodes/edges (select + Delete key)

**Common Issues:**
❌ **Can't see handles:** Handles only appear on hover
❌ **Can't drag connection:** Make sure you're dragging FROM the blue circle
❌ **Connection doesn't stick:** Check browser console for errors
❌ **Nodes disappear after adding:** Check for JavaScript errors

---

### Test 2: Create a Branching Funnel (Condition)
**Goal:** Test conditional logic and multiple paths

**Steps:**
1. Create new funnel: "Lead Qualification"
2. Add nodes:
   - Call
   - Condition
   - SMS (for "interested" path)
   - Email (for "not interested" path)
   - End

3. **Connect with conditions:**
   - Call → Condition
   - Condition → SMS (label: "Interested")
   - Condition → Email (label: "Not Interested")
   - SMS → End
   - Email → End

4. **Configure Condition node:**
   - Click on Condition node
   - Set condition logic (e.g., "lead.interest_level == 'high'")
   - Click "Update Config"

**Expected Results:**
✅ Condition node has 2 outgoing edges
✅ Each edge has a label
✅ Both paths merge at End node
✅ Can trace path from start to end

---

### Test 3: Test All Editor Features
**Goal:** Verify all 4 new features work correctly

**Steps:**
1. Create a funnel with 3-4 nodes connected
2. **Test Undo/Redo:**
   - Add a node
   - Press Ctrl+Z → node should disappear
   - Press Ctrl+Y → node should reappear
   - Delete a connection
   - Press Ctrl+Z → connection should restore

3. **Test Copy/Paste:**
   - Click on a node to select it
   - Press Ctrl+C to copy
   - Press Ctrl+V to paste
   - A duplicate node should appear offset from original
   - Shift+click to select multiple nodes
   - Copy/paste multiple nodes at once

4. **Test Auto Layout:**
   - Create a messy funnel with overlapping nodes
   - Click "Auto Layout" button in toolbar
   - Nodes should rearrange into a clean top-down tree

5. **Test Export/Import:**
   - Click "Export" button
   - A JSON file should download (funnel-[name]-[timestamp].json)
   - Create a new funnel
   - Click "Import" button
   - Select the downloaded JSON file
   - All nodes and connections should appear

**Expected Results:**
✅ Undo/Redo works for all operations
✅ Copy/Paste creates exact duplicates
✅ Auto Layout creates readable tree structure
✅ Export/Import preserves all data

---

## 🐛 Debugging Guide

### If You Can't Connect Nodes:

1. **Check Browser Console:**
   ```
   Press F12 → Console tab
   Look for errors containing: "Failed to create edge" or "connection"
   ```

2. **Check Network Tab:**
   ```
   F12 → Network tab
   Try to connect nodes
   Look for POST request to: /api/user/funnels/[id]/edges
   Check if it returns 201 Created or an error
   ```

3. **Verify Handles Exist:**
   ```
   Inspect a node in DevTools
   Search for class "react-flow__handle"
   Should find 2: one "react-flow__handle-top" and one "react-flow__handle-bottom"
   ```

4. **Check React Flow Props:**
   ```javascript
   // In browser console:
   // Right-click on canvas → Inspect
   // Check if onConnect prop is set on <ReactFlow> component
   ```

### If Connections Don't Persist:

1. **Check API Response:**
   ```
   Network tab → POST /api/user/funnels/.../edges
   Response should be: {"edge_id": "some-uuid"}
   If error: check response body for details
   ```

2. **Check Database:**
   ```bash
   psql -U postgres -d epic_voice_db
   SELECT * FROM funnel_edges WHERE funnel_id = 'your-funnel-id';
   ```

3. **Check Auto-Refresh:**
   ```
   After creating connection, check if onFunnelUpdated() is called
   This should refresh the funnel data from backend
   ```

---

## 📊 Test Results Template

### Test Execution Date: _______________

| Test Case | Pass/Fail | Notes |
|-----------|-----------|-------|
| Add nodes | ⬜ | |
| Connect nodes | ⬜ | |
| Configure nodes | ⬜ | |
| Delete nodes/edges | ⬜ | |
| Drag nodes | ⬜ | |
| Undo/Redo | ⬜ | |
| Copy/Paste | ⬜ | |
| Auto Layout | ⬜ | |
| Export/Import | ⬜ | |
| Save changes | ⬜ | |

### Issues Found:
1.
2.
3.

### Browser/Environment:
- Browser: _______________
- Version: _______________
- OS: _______________
- Screen Size: _______________

---

## 🎬 Video Recording Recommendation

For best debugging, record your screen while testing:
- **Windows:** Win+G (Xbox Game Bar)
- **Mac:** Cmd+Shift+5
- **Linux:** OBS Studio or SimpleScreenRecorder

This helps identify UI/UX issues that are hard to describe in words.

---

## 🔍 Key Areas to Watch

1. **Handle Visibility:**
   - Handles should appear on hover
   - Source handle: bottom of node (blue circle)
   - Target handle: top of node (blue circle)

2. **Connection Animation:**
   - When dragging, you should see a temporary line following cursor
   - Line should "snap" to target handle when close enough
   - Line becomes solid when connection is created

3. **Visual Feedback:**
   - Selected nodes have blue ring
   - Connections are solid lines with arrows
   - Error messages appear in toolbar (red background)
   - "Saving..." indicator shows during API calls

4. **Keyboard Shortcuts:**
   - Ctrl+Z: Undo
   - Ctrl+Y or Ctrl+Shift+Z: Redo
   - Ctrl+C: Copy
   - Ctrl+V: Paste
   - Delete/Backspace: Remove selected items
   - Shift: Multi-select

---

## ✅ Success Criteria

A successful funnel creation flow includes:
- ✅ User can add 5+ nodes without issues
- ✅ User can connect nodes by dragging handles
- ✅ Connections persist after page refresh
- ✅ User can configure each node
- ✅ User can rearrange nodes visually
- ✅ User can undo mistakes
- ✅ User can duplicate common patterns (copy/paste)
- ✅ User can organize complex funnels (auto layout)
- ✅ User can backup/restore funnels (export/import)
- ✅ Changes save automatically (debounced)
- ✅ No JavaScript errors in console
- ✅ No network errors in Network tab

---

## 📞 Support

If you encounter issues during testing:
1. Check the debugging guide above
2. Take screenshots of errors
3. Export browser console logs (right-click in console → Save as...)
4. Document exact steps to reproduce

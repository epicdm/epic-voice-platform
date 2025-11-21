# 🚀 Quick Funnel Test - 5 Minutes

## Open Your Browser Console FIRST
**Before anything else:** Press `F12` → Click `Console` tab → Keep it open during testing

---

## Step 1: Navigate to Funnels (30 seconds)
1. Go to: http://[your-domain]/dashboard/funnels
2. Click any existing funnel OR create a new one
3. You should see the funnel editor canvas

---

## Step 2: Add Nodes (1 minute)
1. On the LEFT sidebar, click "Call" button
2. Click "Delay" button
3. Click "Email" button

You should now see 3 nodes on the canvas. You can drag them around.

---

## Step 3: Connect Nodes - THE CRITICAL TEST (2 minutes)

### Connect Call → Delay:
1. **Hover** over the "Call" node
2. Look at the **BOTTOM** of the node - you should see a small **blue circle** appear
3. **Click and HOLD** on that blue circle
4. **Drag** your mouse toward the "Delay" node
5. You should see a line following your cursor
6. Move to the **TOP** of the "Delay" node
7. A blue circle should appear at the top
8. **Release** your mouse

**What to watch for in console:**
```
🔗 Connection attempt: {source: "...", target: "..."}
📡 Creating edge via API...
✅ Edge created successfully: some-uuid
✅ Connection completed successfully
```

**If it works:** You'll see a solid line connecting Call → Delay

**If it fails:** You'll see red error messages in console starting with ❌

### Connect Delay → Email:
Repeat the same process:
- Drag from BOTTOM of "Delay" node
- To TOP of "Email" node

---

## Step 4: Visual Verification (30 seconds)

You should now see:
- ✅ 3 nodes on canvas
- ✅ 2 connecting lines (Call→Delay, Delay→Email)
- ✅ Lines have arrows pointing to target
- ✅ No error messages in console

---

## Step 5: Test New Features (1 minute)

**Undo/Redo:**
- Press `Ctrl+Z` → Last connection disappears
- Press `Ctrl+Y` → Connection comes back

**Copy/Paste:**
- Click on "Email" node to select it
- Press `Ctrl+C` then `Ctrl+V`
- A duplicate "Email" node appears

**Auto Layout:**
- Click the "Auto Layout" button in toolbar
- Nodes rearrange into clean tree

---

## ✅ SUCCESS CHECKLIST

- [ ] I can see blue circles (handles) when hovering over nodes
- [ ] I can drag from one handle to another
- [ ] A line appears connecting the nodes
- [ ] Console shows "✅ Connection completed successfully"
- [ ] Refreshing the page preserves connections
- [ ] Ctrl+Z undoes the last action
- [ ] Copy/paste duplicates nodes

---

## ❌ IF IT DOESN'T WORK

### Console shows: "❌ Connection missing source or target"
**Problem:** React Flow isn't triggering onConnect
**Check:** Are the blue handles visible? Try different browsers (Chrome/Firefox)

### Console shows: "❌ Failed to create edge: [error message]"
**Problem:** Backend API error
**Check Network tab:** F12 → Network → Look for POST to `/api/user/funnels/.../edges`
**Check response:** Should be 201, if 500 → backend error

### No console messages at all
**Problem:** onConnect handler not firing
**Check:** Make sure you're dragging FROM the blue circle, not from the node itself

### Connection appears then disappears
**Problem:** Backend created it but frontend refresh failed
**Check:** Does refreshing the page bring it back?

---

## 📸 SHARE YOUR RESULTS

**If it works:** Take a screenshot of your funnel with connected nodes

**If it doesn't work:**
1. Take screenshot of console errors
2. Copy/paste the exact error messages
3. Note which step failed

---

## 🎯 Expected Outcome

After this test, you should be able to:
1. Create a complete funnel with 5+ nodes
2. Connect them into any flow (linear or branching)
3. Configure each node
4. Save and activate the funnel
5. Use all 4 new features (undo, copy, layout, export)

This is the REAL user experience we're testing!

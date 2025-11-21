# Funnel System Testing Guide

## Quick Start

### 1. Access the Funnel Pages

**Funnel List Page**:
```
http://localhost:3000/dashboard/funnels
```

**Visual Editor** (replace `{id}` with actual funnel ID):
```
http://localhost:3000/dashboard/funnels/{id}/edit
```

### 2. Database Quick Check

Check existing funnels in database:
```bash
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c "
SELECT
    id,
    name,
    status,
    settings->>'trigger_type' as trigger_type,
    (SELECT COUNT(*) FROM funnel_nodes WHERE funnel_id = funnels.id) as node_count,
    (SELECT COUNT(*) FROM funnel_edges WHERE funnel_id = funnels.id) as edge_count
FROM funnels
ORDER BY created_at DESC;
"
```

### 3. Test API Endpoints Directly

**List Funnels** (requires authentication):
```bash
curl -X GET http://localhost:3000/api/user/funnels \
  -H "Cookie: session=YOUR_SESSION_COOKIE"
```

**Get Funnel Details**:
```bash
curl -X GET http://localhost:3000/api/user/funnels/{funnel_id} \
  -H "Cookie: session=YOUR_SESSION_COOKIE"
```

**Create Funnel**:
```bash
curl -X POST http://localhost:3000/api/user/funnels \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_COOKIE" \
  -d '{
    "name": "Test Funnel",
    "description": "Testing the funnel system",
    "status": "draft",
    "settings": {
      "trigger_type": "manual"
    }
  }'
```

---

## Frontend Testing Checklist

### Funnel List Page (`/dashboard/funnels`)

#### Initial Load
- [ ] Page loads without errors
- [ ] Sidebar shows "Funnels" with Workflow icon
- [ ] PageHeader displays "Funnels" title
- [ ] Subtitle shows count: "X funnel(s) configured"
- [ ] "Create Funnel" button visible in header

#### Empty State (if no funnels)
- [ ] Workflow icon displayed
- [ ] Message: "No funnels yet"
- [ ] Description: "Create your first automation funnel..."
- [ ] "Create Funnel" CTA button

#### Funnel Grid (if funnels exist)
- [ ] Funnels displayed in responsive grid (1/2/3 columns)
- [ ] Each card shows: name, description, status badge, trigger type
- [ ] Status badges have correct colors (Active=green, Draft=gray, Paused=yellow)
- [ ] Hover shows toolbar with 5 buttons (View, Edit, Play/Pause, Duplicate, Delete)

#### Search & Filter
- [ ] Search box filters by name/description/trigger type
- [ ] Search is case-insensitive
- [ ] Filtered results update in real-time
- [ ] Empty search shows all funnels

#### Create Funnel Modal
- [ ] Modal opens when clicking "Create Funnel" button
- [ ] Form fields: Name (required), Description, Trigger Type dropdown
- [ ] Trigger type options: Manual, Lead Created, Landing Page, Campaign, Webhook
- [ ] "Create & Edit" button disabled when name is empty
- [ ] Info message about visual editor shown
- [ ] Cancel button closes modal
- [ ] Successful creation redirects to edit page

#### Funnel Actions
- [ ] **View**: Navigates to edit page
- [ ] **Edit**: Navigates to edit page
- [ ] **Play/Pause**: Toggles status (only for Active/Paused funnels)
- [ ] **Duplicate**: Creates copy with "(Copy)" suffix in draft status
- [ ] **Delete**: Shows confirmation dialog, removes funnel on confirm

---

### Visual Editor Page (`/dashboard/funnels/{id}/edit`)

#### Initial Load
- [ ] Page loads without errors
- [ ] PageHeader shows funnel name and status
- [ ] Back button navigates to list page
- [ ] Play/Pause button visible (for Active/Paused funnels)
- [ ] "Save Changes" button visible with dirty indicator

#### Settings Section (Top)
- [ ] Settings card displays below header
- [ ] Form fields: Funnel Name, Trigger Type, Status, Description
- [ ] All fields pre-populated with funnel data
- [ ] Dirty state indicator (dot) appears when editing
- [ ] Changes saved to backend when clicking "Save Changes"

#### Three-Panel Layout

**Left Sidebar (Node Palette)**:
- [ ] Width: 192px (w-48)
- [ ] Heading: "Add Nodes"
- [ ] 7 node type buttons displayed:
  - [ ] Delay (Clock icon, blue)
  - [ ] Call (Phone icon, green)
  - [ ] Email (Mail icon, purple)
  - [ ] SMS (MessageSquare icon, orange)
  - [ ] Webhook (Webhook icon, indigo)
  - [ ] Condition (GitBranch icon, yellow)
  - [ ] End (StopCircle icon, red)
- [ ] Clicking button adds node to canvas

**Center Canvas (React Flow)**:
- [ ] React Flow canvas fills remaining space
- [ ] Background grid displayed
- [ ] Controls (zoom/fit) in bottom-left corner
- [ ] MiniMap in bottom-right corner
- [ ] Existing nodes load at saved positions
- [ ] Existing edges load with connections

**Right Sidebar (Config Panel)**:
- [ ] Width: 320px (w-80)
- [ ] Heading: "Node Configuration"
- [ ] Shows "Select a node to configure" when nothing selected
- [ ] Shows node form when node clicked

#### Node Operations

**Adding Nodes**:
- [ ] Click palette button → node appears on canvas
- [ ] Node positioned with offset (250 + count * 50)
- [ ] Node saved to backend immediately
- [ ] Node ID returned from backend

**Selecting Nodes**:
- [ ] Click node → border color changes (highlighted)
- [ ] Right sidebar shows node configuration form
- [ ] Form pre-populated with current config

**Moving Nodes**:
- [ ] Drag node → position updates in real-time
- [ ] Release drag → position auto-saved to backend
- [ ] No manual save required

**Configuring Nodes**:
- [ ] **Node Label** field always shown
- [ ] **Delay Node**: Shows "Delay (seconds)" number input
- [ ] **Email Node**: Shows "Subject" + "Body" textarea
- [ ] **SMS Node**: Shows "Message" textarea
- [ ] **Webhook Node**: Shows "URL" input + "Method" dropdown (GET/POST/PUT/PATCH)
- [ ] **Condition Node**: Shows "Expression" textarea
- [ ] **Call Node**: Shows "Agent ID" input
- [ ] "Save Node" button updates config in backend
- [ ] "Delete Node" button (trash icon) removes node with confirmation

**Deleting Nodes**:
- [ ] Click trash icon → confirmation dialog
- [ ] Confirm → node removed from canvas and backend
- [ ] Connected edges also deleted

#### Edge Operations

**Creating Edges**:
- [ ] Drag from source handle (bottom) to target handle (top)
- [ ] Connection line follows cursor
- [ ] Release on valid handle → edge created
- [ ] Edge animated (dashed line flows)
- [ ] Edge saved to backend immediately

**Condition Node Edges**:
- [ ] Condition node has 2 source handles (true/false)
- [ ] Can create separate edges for each branch

**Deleting Edges**:
- [ ] Select edge → press Delete key
- [ ] OR click edge → shows delete option
- [ ] Edge removed from canvas and backend

#### React Flow Features

**Background**:
- [ ] Grid pattern displayed
- [ ] Light gray in light mode, dark gray in dark mode

**Controls**:
- [ ] Zoom In button
- [ ] Zoom Out button
- [ ] Fit View button
- [ ] All controls functional

**MiniMap**:
- [ ] Shows overview of entire canvas
- [ ] Node positions visible as colored rectangles
- [ ] Current viewport highlighted

#### Custom Node Rendering

**All Nodes**:
- [ ] Display node label
- [ ] Show connection handles (circles)
- [ ] Border color changes when selected
- [ ] Icon displayed (unique per type)
- [ ] Config preview text shown

**Delay Node**:
- [ ] Shows delay seconds: "5s", "10s", etc.
- [ ] Blue color scheme

**Call Node**:
- [ ] Shows "AI Call" if agent_id configured
- [ ] Green color scheme

**Email Node**:
- [ ] Shows email subject in preview
- [ ] Purple color scheme

**SMS Node**:
- [ ] Shows first 20 chars of message
- [ ] Orange color scheme

**Webhook Node**:
- [ ] Shows HTTP method + hostname
- [ ] Indigo color scheme

**Condition Node**:
- [ ] Shows condition expression
- [ ] Yellow color scheme
- [ ] Two source handles (left=true, right=false)

**End Node**:
- [ ] Shows "End" label
- [ ] Red color scheme
- [ ] No source handle (only target)

#### Save Behavior

**Auto-Save**:
- [ ] Node positions auto-save on drag end
- [ ] Edges auto-save on create/delete
- [ ] No confirmation needed

**Manual Save**:
- [ ] Node config requires "Save Node" click
- [ ] Funnel settings require "Save Changes" click
- [ ] Dirty indicator shows unsaved changes

#### Error Handling

**Loading State**:
- [ ] Skeleton loaders shown while fetching data
- [ ] No flash of empty content

**Error State**:
- [ ] Error message displayed if funnel not found
- [ ] "Go to Funnels" button navigates back
- [ ] Network errors show user-friendly message

**Validation**:
- [ ] Cannot save funnel without name
- [ ] Cannot activate funnel without nodes (TODO: implement)

---

## Backend Testing Checklist

### Flask API Endpoints

Test with actual session cookie from logged-in user.

#### List Funnels
```bash
curl -X GET "http://localhost:8000/api/funnels" \
  -H "Cookie: session=YOUR_COOKIE"
```

Expected Response:
```json
{
  "funnels": [
    {
      "id": "uuid",
      "name": "Welcome Funnel",
      "description": "...",
      "status": "active",
      "settings": { "trigger_type": "lead_created" },
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "total": 4
}
```

#### Get Funnel
```bash
curl -X GET "http://localhost:8000/api/funnels/{id}" \
  -H "Cookie: session=YOUR_COOKIE"
```

Expected Response includes `nodes` and `edges` arrays.

#### Create Funnel
```bash
curl -X POST "http://localhost:8000/api/funnels" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_COOKIE" \
  -d '{
    "name": "Test Funnel",
    "status": "draft",
    "settings": { "trigger_type": "manual" }
  }'
```

Expected: `201 Created` with funnel object

#### Update Funnel
```bash
curl -X PUT "http://localhost:8000/api/funnels/{id}" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_COOKIE" \
  -d '{
    "name": "Updated Name",
    "status": "active"
  }'
```

Expected: `200 OK` with updated funnel

#### Delete Funnel
```bash
curl -X DELETE "http://localhost:8000/api/funnels/{id}" \
  -H "Cookie: session=YOUR_COOKIE"
```

Expected: `200 OK` with `{ "message": "Funnel deleted" }`

#### Add Node
```bash
curl -X POST "http://localhost:8000/api/funnels/{id}/nodes" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_COOKIE" \
  -d '{
    "node_type": "delay",
    "label": "Wait 5 seconds",
    "config": { "delay_seconds": 5 },
    "position_x": 250,
    "position_y": 100
  }'
```

Expected: `201 Created` with `{ "node_id": "uuid" }`

#### Update Node
```bash
curl -X PUT "http://localhost:8000/api/funnels/{funnel_id}/nodes/{node_id}" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_COOKIE" \
  -d '{
    "label": "Wait 10 seconds",
    "config": { "delay_seconds": 10 }
  }'
```

Expected: `200 OK`

#### Delete Node
```bash
curl -X DELETE "http://localhost:8000/api/funnels/{funnel_id}/nodes/{node_id}" \
  -H "Cookie: session=YOUR_COOKIE"
```

Expected: `200 OK`

#### Add Edge
```bash
curl -X POST "http://localhost:8000/api/funnels/{id}/edges" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_COOKIE" \
  -d '{
    "source_node_id": "node-uuid-1",
    "target_node_id": "node-uuid-2"
  }'
```

Expected: `201 Created` with `{ "edge_id": "uuid" }`

#### Delete Edge
```bash
curl -X DELETE "http://localhost:8000/api/funnels/{funnel_id}/edges/{edge_id}" \
  -H "Cookie: session=YOUR_COOKIE"
```

Expected: `200 OK`

---

## Database Validation

### Schema Check
```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('funnels', 'funnel_nodes', 'funnel_edges');

-- Check indexes
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename IN ('funnels', 'funnel_nodes', 'funnel_edges');
```

### Data Integrity
```sql
-- Orphaned nodes (funnel deleted but nodes remain)
SELECT * FROM funnel_nodes
WHERE funnel_id NOT IN (SELECT id FROM funnels);

-- Orphaned edges (connected to deleted nodes)
SELECT * FROM funnel_edges
WHERE source_node_id NOT IN (SELECT id FROM funnel_nodes)
   OR target_node_id NOT IN (SELECT id FROM funnel_nodes);

-- Nodes without position
SELECT * FROM funnel_nodes
WHERE position IS NULL OR position = '{}';
```

---

## Common Issues & Solutions

### Issue: "Module not found" errors in browser console
**Solution**: Clear Next.js cache and rebuild:
```bash
rm -rf .next
npm run build
```

### Issue: React Flow components don't render
**Cause**: SSR attempting to render browser-only components
**Solution**: Verify dynamic imports with `ssr: false` in edit page

### Issue: Node positions not saving
**Cause**: `onNodesChange` not filtering for drag end event
**Solution**: Check that callback filters for `dragging === false`

### Issue: Edges disappear after refresh
**Cause**: Edge IDs not being set from backend response
**Solution**: Verify `edge_id` returned from POST and added to React Flow state

### Issue: Session cookie not forwarded to Flask
**Cause**: Proxy API routes not passing cookies
**Solution**: Check `credentials: "include"` in fetch options

### Issue: Funnel not found (404)
**Cause**: User ID mismatch or funnel doesn't exist
**Solution**: Verify authenticated user owns the funnel

---

## Performance Testing

### Load Testing
Test with 100+ nodes in a single funnel to verify:
- [ ] Canvas render performance remains smooth
- [ ] Drag operations don't lag
- [ ] Auto-save doesn't cause flickering
- [ ] MiniMap updates in real-time

### Network Testing
Simulate slow network to verify:
- [ ] Loading states shown appropriately
- [ ] Optimistic UI updates before backend confirm
- [ ] Error handling for failed requests
- [ ] Retry logic for transient failures

---

## Accessibility Testing

- [ ] All buttons have proper `aria-label` attributes
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Focus states visible on all interactive elements
- [ ] Screen reader can announce node types and states
- [ ] Color contrast meets WCAG AA standards

---

## Browser Compatibility

Test in:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (macOS)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Summary

This guide provides comprehensive testing coverage for the Funnel system. Follow each checklist to verify all features work as expected.

**Priority Testing Areas**:
1. ✅ Create funnel → Edit visual workflow → Save
2. ✅ Add nodes via palette → Configure → Save
3. ✅ Connect nodes with edges → Verify backend sync
4. ✅ Move nodes → Verify auto-save positions
5. ✅ Delete nodes/edges → Verify cascade deletion

**Status**: All core functionality implemented and ready for testing.

---

*Last Updated: 2025-11-15*

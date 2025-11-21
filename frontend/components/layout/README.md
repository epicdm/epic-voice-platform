# Layout Components

Shared layout primitives for building consistent page layouts across the application.

## Components

### PageHeader

A flexible page header component with title, subtitle, breadcrumbs, and action buttons.

```tsx
import { PageHeader } from '@/components/layout'
import { Button } from '@heroui/react'

<PageHeader
  title="AI Agents"
  subtitle="Manage your voice AI agents"
  breadcrumbs={[
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'AI Agents' }
  ]}
  actions={
    <Button color="primary">Create Agent</Button>
  }
/>
```

#### Props

- `title` (string, required): Main page title
- `subtitle` (string, optional): Optional subtitle or description
- `breadcrumbs` (Breadcrumb[], optional): Breadcrumb navigation items
- `actions` (ReactNode, optional): Action buttons or controls (right-aligned)
- `className` (string, optional): Additional CSS classes

#### Breadcrumb Type

```typescript
interface Breadcrumb {
  label: string
  href?: string // Optional link, last item typically has no href
}
```

---

### Toolbar

Horizontal control bar with left and right content slots for filters, search, and actions.

```tsx
import { Toolbar, ToolbarSection, ToolbarDivider } from '@/components/layout'
import { Input, Select, Button } from '@heroui/react'

<Toolbar
  left={
    <>
      <ToolbarSection>
        <Input placeholder="Search calls..." />
      </ToolbarSection>
      <ToolbarDivider />
      <ToolbarSection>
        <Select placeholder="Status">
          <option>All Status</option>
          <option>Completed</option>
          <option>Failed</option>
        </Select>
      </ToolbarSection>
    </>
  }
  right={
    <>
      <DateRangePicker />
      <Button variant="outline">Export CSV</Button>
    </>
  }
/>
```

#### Props

- `left` (ReactNode, optional): Left-aligned content (search, filters, etc.)
- `right` (ReactNode, optional): Right-aligned content (export, actions, etc.)
- `bordered` (boolean, optional): Show border at bottom (default: true)
- `className` (string, optional): Additional CSS classes

#### Helper Components

**ToolbarSection**: Groups toolbar items with proper spacing

```tsx
<ToolbarSection>
  <Input />
  <Button />
</ToolbarSection>
```

**ToolbarDivider**: Visual separator between toolbar sections (hidden on mobile)

```tsx
<ToolbarDivider />
```

---

### InspectorDrawer

Right-side sliding drawer for displaying detailed information and inspection panels.

```tsx
import { InspectorDrawer, InspectorSection, InspectorField } from '@/components/layout'
import { Button } from '@heroui/react'

const [isOpen, setIsOpen] = useState(false)

<InspectorDrawer
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="Call Details"
  size="md"
  footer={
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Close
      </Button>
      <Button color="primary">Save Changes</Button>
    </div>
  }
>
  <InspectorSection title="Basic Information">
    <InspectorField label="Call ID" value="call_123456" />
    <InspectorField label="Duration" value="2:34" />
    <InspectorField label="Status" value="Completed" />
  </InspectorSection>

  <InspectorSection title="Cost Breakdown">
    <InspectorField label="STT Cost" value="$0.05" />
    <InspectorField label="LLM Cost" value="$0.12" />
    <InspectorField label="TTS Cost" value="$0.08" />
  </InspectorSection>
</InspectorDrawer>
```

#### Props

- `open` (boolean, required): Whether the drawer is open
- `onClose` (function, required): Callback when drawer should close
- `title` (string, required): Drawer title
- `children` (ReactNode, required): Drawer content
- `footer` (ReactNode, optional): Optional footer content for actions
- `size` ('sm' | 'md' | 'lg', optional): Drawer width (default: 'md')
  - `sm`: 480px
  - `md`: 560-640px (default)
  - `lg`: 640-720px
- `className` (string, optional): Additional CSS classes

#### Helper Components

**InspectorSection**: Organizes drawer content into sections with optional titles

```tsx
<InspectorSection title="Section Title">
  <div>Section content...</div>
</InspectorSection>
```

**InspectorField**: Displays key-value pairs in a consistent format

```tsx
<InspectorField label="Key" value="Value" />
<InspectorField label="Status" value={<Badge>Active</Badge>} />
```

#### With Tabs

The drawer supports complex content including tabs:

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@heroui/react'

<InspectorDrawer open={isOpen} onClose={onClose} title="Call Details">
  <Tabs defaultValue="info">
    <TabsList>
      <TabsTrigger value="info">Info</TabsTrigger>
      <TabsTrigger value="transcript">Transcript</TabsTrigger>
      <TabsTrigger value="logs">Logs</TabsTrigger>
    </TabsList>

    <TabsContent value="info">
      <InspectorSection title="Call Information">
        <InspectorField label="Duration" value="2:34" />
      </InspectorSection>
    </TabsContent>

    <TabsContent value="transcript">
      <div className="space-y-4">
        {/* Transcript content */}
      </div>
    </TabsContent>

    <TabsContent value="logs">
      <div className="space-y-2">
        {/* Log entries */}
      </div>
    </TabsContent>
  </Tabs>
</InspectorDrawer>
```

---

## Complete Page Example

Here's how to use all three components together:

```tsx
'use client'

import { useState } from 'react'
import {
  PageHeader,
  Toolbar,
  ToolbarSection,
  ToolbarDivider,
  InspectorDrawer,
  InspectorSection,
  InspectorField
} from '@/components/layout'
import { Button, Input, Select } from '@heroui/react'

export default function CallsPage() {
  const [selectedCall, setSelectedCall] = useState<string | null>(null)

  return (
    <div className="flex flex-col h-screen">
      {/* Page Header */}
      <PageHeader
        title="Call Logs"
        subtitle="View and manage all voice AI calls"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Calls' }
        ]}
        actions={
          <Button color="primary">New Test Call</Button>
        }
      />

      {/* Toolbar */}
      <Toolbar
        left={
          <>
            <ToolbarSection>
              <Input
                placeholder="Search calls..."
                className="w-64"
              />
            </ToolbarSection>
            <ToolbarDivider />
            <ToolbarSection>
              <Select placeholder="Status" className="w-40">
                <option>All Status</option>
                <option>Completed</option>
                <option>Failed</option>
              </Select>
              <Select placeholder="Agent" className="w-40">
                <option>All Agents</option>
              </Select>
            </ToolbarSection>
          </>
        }
        right={
          <>
            <Button variant="outline">Export CSV</Button>
            <Button variant="outline">Filters</Button>
          </>
        }
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-4">
          {/* Call list here */}
          <div
            onClick={() => setSelectedCall('call_123')}
            className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50"
          >
            Click to view details
          </div>
        </div>
      </div>

      {/* Inspector Drawer */}
      <InspectorDrawer
        open={!!selectedCall}
        onClose={() => setSelectedCall(null)}
        title="Call Details"
        footer={
          <div className="flex justify-between">
            <Button variant="outline" color="danger">
              Delete Call
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelectedCall(null)}>
                Close
              </Button>
              <Button color="primary">Export</Button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          <InspectorSection title="Basic Information">
            <InspectorField label="Call ID" value="call_123456" />
            <InspectorField label="Duration" value="2:34" />
            <InspectorField label="Status" value="Completed" />
            <InspectorField label="Started" value="Oct 31, 2025 2:30 PM" />
          </InspectorSection>

          <InspectorSection title="Cost Breakdown">
            <InspectorField label="STT Cost" value="$0.05" />
            <InspectorField label="LLM Cost" value="$0.12" />
            <InspectorField label="TTS Cost" value="$0.08" />
            <InspectorField
              label="Total Cost"
              value={<span className="font-bold">$0.25</span>}
            />
          </InspectorSection>

          <InspectorSection title="Technical Details">
            <InspectorField label="Room ID" value="rm_abc123" />
            <InspectorField label="Agent" value="Sales Agent" />
            <InspectorField label="Phone Number" value="+1 (555) 123-4567" />
          </InspectorSection>
        </div>
      </InspectorDrawer>
    </div>
  )
}
```

---

## Responsive Behavior

### PageHeader
- Actions stack below title on mobile
- Breadcrumbs remain horizontal with text wrapping

### Toolbar
- Collapses to vertical stack on mobile (sm breakpoint)
- Left and right sections become full-width
- Dividers hidden on mobile

### InspectorDrawer
- Full-width on mobile
- Fixed widths on tablet and desktop (560-720px)
- Smooth slide-in animation
- Backdrop overlay click-to-close

---

## Styling

All components use:
- **HeroUI**: For UI components and theming
- **Tailwind CSS**: For utility classes and responsive design
- **Framer Motion**: For smooth animations (InspectorDrawer)
- **Lucide React**: For icons

Components respect the application's theme (light/dark mode) through Tailwind's theme system.

---

## Accessibility

- **PageHeader**: Proper heading hierarchy (h1, h2, h3)
- **Toolbar**: Semantic HTML with proper landmark roles
- **InspectorDrawer**:
  - ARIA dialog role
  - Keyboard navigation support (Esc to close)
  - Focus management
  - Screen reader announcements

---

## TypeScript Support

All components are fully typed with TypeScript. Import types from the components:

```typescript
import type { PageHeaderProps, Breadcrumb } from '@/components/layout'
import type { ToolbarProps } from '@/components/layout'
import type { InspectorDrawerProps } from '@/components/layout'
```

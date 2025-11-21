# CallTranscriptPanel Component

**Type**: Panel-style Transcript Display Component
**File**: `frontend/components/calls/CallTranscriptPanel.tsx`
**Created**: October 30, 2025
**Framework**: Next.js 15 + React 18 + TypeScript + HeroUI

---

## Overview

`CallTranscriptPanel` is a **compact, panel-optimized transcript viewer** designed for sidebars, modals, slide-outs, and embedded views. It provides essential transcript functionality in a space-efficient layout.

### Design Philosophy

- **Compact**: Optimized for smaller spaces (sidebars, panels, modals)
- **Essential**: Core features only (view, search, speaker labels, timestamps)
- **Flexible**: Configurable height and close button for various contexts
- **Performance**: Lightweight rendering for embedded use cases

### Comparison with Other Transcript Components

| Feature | CallTranscriptPanel | CallTranscriptViewer | CallTranscriptCard |
|---------|---------------------|----------------------|---------------------|
| **Use Case** | Sidebars, panels, modals | Full-page view | List previews |
| **Size** | Compact (configurable) | Large, full-width | Small card |
| **Search** | ✅ Basic text search | ✅ Advanced search | ❌ No search |
| **Copy/Download** | ❌ Not included | ✅ Full actions | ❌ Not included |
| **Summary** | ❌ Not included | ✅ AI summary | ✅ Summary preview |
| **Height** | Configurable | Auto/600px max | Auto |
| **Close Button** | ✅ Optional | ❌ No | ❌ No |

---

## Props

```typescript
export interface CallTranscriptPanelProps {
  /** Transcript data with segments */
  transcript?: CallTranscript | null

  /** Loading state for initial fetch */
  loading?: boolean

  /** Error state for failed fetches */
  error?: Error | null

  /** Show close button in header */
  showClose?: boolean

  /** Callback when close button is clicked */
  onClose?: () => void

  /** Panel height (CSS value: px, %, vh) */
  height?: string

  /** Additional CSS classes */
  className?: string
}
```

### Prop Details

#### `transcript`
- **Type**: `CallTranscript | null | undefined`
- **Required**: No
- **Description**: Transcript data object with segments array
- **Default**: `undefined`

#### `loading`
- **Type**: `boolean`
- **Required**: No
- **Description**: Shows loading skeleton when true
- **Default**: `false`

#### `error`
- **Type**: `Error | null`
- **Required**: No
- **Description**: Error object to display error state
- **Default**: `null`

#### `showClose`
- **Type**: `boolean`
- **Required**: No
- **Description**: Shows X button in header for closing panel
- **Default**: `false`

#### `onClose`
- **Type**: `() => void`
- **Required**: No (required if `showClose=true`)
- **Description**: Callback function when close button clicked
- **Default**: `undefined`

#### `height`
- **Type**: `string` (CSS value)
- **Required**: No
- **Description**: Fixed height for panel (e.g., "500px", "100%", "80vh")
- **Default**: `"500px"`

#### `className`
- **Type**: `string`
- **Required**: No
- **Description**: Additional Tailwind CSS classes
- **Default**: `""`

---

## Usage Examples

### 1. Basic Sidebar Panel

```tsx
import { CallTranscriptPanel } from '@/components/calls/CallTranscriptPanel'
import { useCallTranscript } from '@/hooks/useCallTranscript'

export function CallSidebar({ callLogId }: { callLogId: string }) {
  const { transcript, loading, error } = useCallTranscript(callLogId, {
    autoFetch: true
  })

  return (
    <aside className="w-80 border-l border-border">
      <CallTranscriptPanel
        transcript={transcript}
        loading={loading}
        error={error}
        height="100vh"
      />
    </aside>
  )
}
```

### 2. Modal Panel with Close Button

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@heroui/button'
import { Modal, ModalContent } from '@heroui/modal'
import { CallTranscriptPanel } from '@/components/calls/CallTranscriptPanel'

export function TranscriptModal({ callLogId }: { callLogId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const { transcript, loading } = useCallTranscript(callLogId, {
    autoFetch: isOpen // Only fetch when modal is open
  })

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        View Transcript
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size="2xl"
      >
        <ModalContent>
          <CallTranscriptPanel
            transcript={transcript}
            loading={loading}
            showClose
            onClose={() => setIsOpen(false)}
            height="600px"
          />
        </ModalContent>
      </Modal>
    </>
  )
}
```

### 3. Slide-Out Panel

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@heroui/button'
import { CallTranscriptPanel } from '@/components/calls/CallTranscriptPanel'

export function SlideOutTranscript({ callLogId }: { callLogId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const { transcript, loading } = useCallTranscript(callLogId)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        View Transcript
      </Button>

      {/* Slide-out panel */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-background border-l border-border shadow-xl transition-transform duration-300 z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <CallTranscriptPanel
          transcript={transcript}
          loading={loading}
          showClose
          onClose={() => setIsOpen(false)}
          height="100vh"
        />
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
```

### 4. Dashboard Widget

```tsx
import { Card, CardBody, CardHeader } from '@heroui/card'
import { CallTranscriptPanel } from '@/components/calls/CallTranscriptPanel'

export function DashboardTranscriptWidget({ callLogId }: { callLogId: string }) {
  const { transcript, loading } = useCallTranscript(callLogId, {
    autoFetch: true,
    refreshInterval: transcript?.status === 'processing' ? 5000 : 0
  })

  return (
    <div className="col-span-1 md:col-span-2">
      <CallTranscriptPanel
        transcript={transcript}
        loading={loading}
        height="400px"
        className="shadow-md"
      />
    </div>
  )
}
```

### 5. Split View Layout

```tsx
export function CallDetailSplitView({ callLogId }: { callLogId: string }) {
  const { transcript, loading } = useCallTranscript(callLogId)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-screen">
      {/* Left: Call details */}
      <div className="space-y-6 overflow-y-auto">
        <CallRecordingPlayer callLogId={callLogId} />
        <CallOutcomeCard callLogId={callLogId} />
      </div>

      {/* Right: Transcript panel */}
      <div className="border-l border-border">
        <CallTranscriptPanel
          transcript={transcript}
          loading={loading}
          height="100%"
        />
      </div>
    </div>
  )
}
```

---

## Component Structure

### Visual Layout

```
┌─────────────────────────────────────────┐
│ 📄 Transcript  [Processing]  23 seg [X]│  ← Header (compact)
├─────────────────────────────────────────┤
│ [🔍 Search...]                          │  ← Search bar
├─────────────────────────────────────────┤
│ 0:00  [🤖]  Hello, how can I help?     │  ← Segment 1
│ 0:05  [👤]  I need assistance with...  │  ← Segment 2
│ 0:12  [🤖]  Of course! Let me help...  │  ← Segment 3
│ 0:18  [👤]  Thank you, that's great... │  ← Segment 4
│        ...                              │
│        [Scrollable Area]                │
└─────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Header Section (Compact)
- **Left Side**: Icon + "Transcript" title + Status badge
- **Right Side**: Segment count + Optional close button
- **Border**: Bottom border for separation
- **Height**: Fixed (~48px)

#### 2. Search Bar (Conditional)
- **Visibility**: Only shown if transcript is complete and has segments
- **Input**: Compact search input (height: 32px)
- **Icon**: Search icon on left
- **Border**: Bottom border
- **Height**: Fixed (~56px)

#### 3. Segments Container (Scrollable)
- **Scroll**: Vertical scroll (`overflow-y-auto`)
- **Height**: Flexible (fills remaining space)
- **Padding**: Minimal for space efficiency
- **Spacing**: Tight spacing between segments (0.5 spacing unit)

#### 4. Segment Card (Compact)
- **Layout**: Horizontal flex (timestamp + icon + text)
- **Timestamp**: 12px width, right-aligned, monospace
- **Icon**: Small (12px) speaker icon in colored circle
- **Text**: Flex-grow, small font (12px), break-words
- **Hover**: Subtle background highlight
- **Height**: Auto (typically ~40-50px per segment)

---

## States and Variations

### Loading State

```tsx
<CallTranscriptPanel loading />
```

**Displays**:
- Skeleton header with shimmer
- Skeleton search bar
- 6 skeleton segment cards
- Maintains structure for smooth transition

### Error State

```tsx
<CallTranscriptPanel error={new Error('Failed to load')} />
```

**Displays**:
- Red/danger themed card
- Alert icon centered
- Error title: "Failed to Load"
- Error message
- No retry button (controlled externally)

### Empty State (No Transcript)

```tsx
<CallTranscriptPanel transcript={null} />
```

**Displays**:
- Clock icon centered
- Message: "No transcript"
- Subtitle: "Available after call completes"
- Muted color scheme

### Failed Transcript

```tsx
<CallTranscriptPanel transcript={{ status: 'failed', errorMessage: '...' }} />
```

**Displays**:
- Similar to error state
- Shows transcript error message
- Red/danger theme

### Empty Segments (Processing)

```tsx
<CallTranscriptPanel transcript={{ status: 'processing', segments: [] }} />
```

**Displays**:
- Header with "Processing" badge
- Empty segments area with file icon
- Message: "No segments yet" / "Processing..."

### No Search Results

```tsx
// User types search query with no matches
```

**Displays**:
- Search icon centered
- Message: "No matches"
- Subtitle: "Try different search"

---

## Styling

### Color Scheme

```typescript
// Status badges
{
  processing: 'warning',  // Yellow
  completed: 'success',   // Green
  failed: 'danger'        // Red
}

// Speaker colors
{
  agent: {
    bg: 'bg-primary-100',     // Light blue
    icon: 'text-primary-700'  // Dark blue
  },
  user: {
    bg: 'bg-secondary-100',     // Light purple
    icon: 'text-secondary-700'  // Dark purple
  }
}
```

### Typography

```css
/* Header title */
text-sm font-semibold

/* Segment count */
text-xs text-muted-foreground

/* Timestamp */
text-xs text-muted-foreground font-mono

/* Segment text */
text-xs text-foreground break-words leading-relaxed

/* Empty state text */
text-xs text-muted-foreground
```

### Spacing

```css
/* Header padding */
px-4 py-3 pb-3

/* Search padding */
px-3 pt-3 pb-2

/* Segment padding */
py-2 px-3

/* Segment spacing */
space-y-0.5

/* Icon padding */
p-1.5 (compact speaker icon)
```

### Dimensions

```typescript
// Header height: ~48px
// Search bar height: ~56px (if shown)
// Segment height: ~40-50px (auto)
// Icon size: 12px (h-3 w-3)
// Button size: 24px (h-6 w-6)
// Default panel height: 500px (configurable)
```

---

## Accessibility

### Keyboard Navigation
- ✅ Tab through search input and close button
- ✅ Enter/Space to activate buttons
- ✅ Scrollable area keyboard-accessible

### Screen Readers
- ✅ Semantic HTML structure
- ✅ Icon labels via aria-labels
- ✅ Status conveyed through text + color
- ✅ Empty states with descriptive text

### Visual Accessibility
- ✅ High contrast text colors
- ✅ Speaker differentiation via icons + colors
- ✅ Status conveyed with text + color
- ✅ Minimum 12px font size (readable)
- ✅ Clear focus indicators

---

## Performance

### Optimizations

1. **Lightweight Rendering**
   - Only essential features (no copy/download buttons)
   - Compact segment cards reduce DOM size
   - Simple search (no debouncing needed for small segments)

2. **Efficient Search**
   - Client-side filtering (no API calls)
   - Simple string matching (fast)
   - Instant results

3. **Fixed Height**
   - Prevents layout shifts
   - Enables virtual scrolling (if needed)
   - Predictable container size

### Recommendations for Large Transcripts

For transcripts with **>100 segments**, consider:

```tsx
import { FixedSizeList } from 'react-window'

// Wrap segments in virtual list
<FixedSizeList
  height={400}
  itemCount={filteredSegments.length}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <PanelSegmentCard segment={filteredSegments[index]} />
    </div>
  )}
</FixedSizeList>
```

---

## Integration with Existing Components

### Use Cases by Component

| Scenario | Component to Use |
|----------|------------------|
| **Full-page transcript view** | CallTranscriptViewer |
| **Sidebar panel** | CallTranscriptPanel ⭐ |
| **Modal/Dialog** | CallTranscriptPanel ⭐ |
| **Slide-out drawer** | CallTranscriptPanel ⭐ |
| **Dashboard widget** | CallTranscriptPanel ⭐ |
| **Call list preview** | CallTranscriptCard |
| **Detail page with summary** | CallTranscriptCard → CallTranscriptViewer |

### Component Composition

```tsx
// Call detail page with panel
export function CallDetailPage({ callId }: { callId: string }) {
  return (
    <div className="flex h-screen">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        <CallOutcomeCard callLogId={callId} />
        <CallRecordingPlayer callLogId={callId} />
      </div>

      {/* Sidebar panel */}
      <aside className="w-96 border-l">
        <CallTranscriptPanel
          transcript={transcript}
          height="100vh"
        />
      </aside>
    </div>
  )
}
```

---

## TypeScript Support

### Full Type Safety

```typescript
import { CallTranscriptPanel } from '@/components/calls/CallTranscriptPanel'
import type { CallTranscriptPanelProps } from '@/components/calls/CallTranscriptPanel'

// Props are fully typed
const panelProps: CallTranscriptPanelProps = {
  transcript: myTranscript, // Type-checked
  loading: false,
  height: "500px",
  showClose: true,
  onClose: () => console.log('Closed') // Type-safe callback
}

<CallTranscriptPanel {...panelProps} />
```

### Type Imports

```typescript
// Import types from call-transcript module
import {
  CallTranscript,
  TranscriptSegment,
  SpeakerType,
  TranscriptStatus
} from '@/types/call-transcript'
```

---

## Testing

### Unit Tests (Jest + RTL)

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { CallTranscriptPanel } from '@/components/calls/CallTranscriptPanel'
import { mockTranscript } from '@/__mocks__/transcript'

describe('CallTranscriptPanel', () => {
  it('renders loading skeleton', () => {
    render(<CallTranscriptPanel loading />)
    expect(screen.getByTestId('skeleton')).toBeInTheDocument()
  })

  it('renders transcript segments', () => {
    render(<CallTranscriptPanel transcript={mockTranscript} />)
    expect(screen.getByText('Transcript')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(mockTranscript.segments.length)
  })

  it('calls onClose when close button clicked', () => {
    const onClose = jest.fn()
    render(
      <CallTranscriptPanel
        transcript={mockTranscript}
        showClose
        onClose={onClose}
      />
    )

    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('filters segments by search query', async () => {
    render(<CallTranscriptPanel transcript={mockTranscript} />)

    const searchInput = screen.getByPlaceholderText('Search...')
    fireEvent.change(searchInput, { target: { value: 'hello' } })

    // Should only show segments containing "hello"
    await waitFor(() => {
      expect(screen.getByText(/hello/i)).toBeInTheDocument()
      expect(screen.queryByText(/goodbye/i)).not.toBeInTheDocument()
    })
  })
})
```

---

## Migration from Other Components

### From CallTranscriptViewer

```tsx
// Before (full viewer)
<CallTranscriptViewer
  transcript={transcript}
  loading={loading}
  onCopy={() => {}}
  onDownload={() => {}}
/>

// After (compact panel)
<CallTranscriptPanel
  transcript={transcript}
  loading={loading}
  height="500px"
/>
```

**Changes**:
- ❌ Removed: Copy/download buttons
- ❌ Removed: AI summary section
- ❌ Removed: Sentiment badge
- ✅ Added: Configurable height
- ✅ Added: Optional close button
- ✅ Kept: Search, segments, speaker labels, timestamps

### From CallTranscriptCard

```tsx
// Before (compact card for lists)
<CallTranscriptCard
  transcript={transcript}
  compact
  showViewButton
  onView={() => navigate(...)}
/>

// After (panel for sidebars)
<CallTranscriptPanel
  transcript={transcript}
  height="400px"
  // No navigation needed, panel shows full segments
/>
```

**Changes**:
- ✅ Added: Full segment display (not just summary)
- ✅ Added: Search functionality
- ✅ Added: Scrollable segment list
- ❌ Removed: "View Transcript" button (already showing full data)

---

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (responsive)

---

## File Information

**File**: `/opt/livekit1/frontend/components/calls/CallTranscriptPanel.tsx`
**Size**: ~8.5 KB
**Lines**: ~350 lines
**Dependencies**:
- `@heroui/card`
- `@heroui/chip`
- `@heroui/button`
- `@heroui/input`
- `lucide-react`
- `@/types/call-transcript`
- `@/components/ui/skeleton`

---

## Summary

`CallTranscriptPanel` is the **optimal choice** for:
- ✅ Sidebar transcript displays
- ✅ Modal/dialog transcript views
- ✅ Slide-out drawer panels
- ✅ Dashboard embedded widgets
- ✅ Split-view layouts
- ✅ Any space-constrained transcript display

**Key Advantages**:
- Compact and space-efficient
- Configurable height for flexible layouts
- Optional close button for dismissible panels
- Essential features only (fast performance)
- Consistent with HeroUI design system
- Full TypeScript type safety

---

**Created**: October 30, 2025
**Status**: ✅ Production Ready
**Version**: 1.0.0

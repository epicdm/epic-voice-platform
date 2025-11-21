# Call Transcript UI Components

## Overview

React components for displaying call transcripts with speaker identification, timestamps, search, and AI-generated insights.

## Implementation Date
October 30, 2025

## Components

### 1. CallTranscriptPanel ⭐ NEW
**Compact panel-style transcript display for sidebars and modals**

**Features**:
- Optimized for smaller spaces (sidebars, panels, modals)
- Essential features only (search, segments, speaker labels)
- Configurable height for flexible layouts
- Optional close button for dismissible panels
- Compact segment cards with minimal padding
- Loading skeleton states
- Error handling

**Best For**:
- Sidebar panels
- Modal dialogs
- Slide-out drawers
- Dashboard widgets
- Split-view layouts
- Embedded transcript views

**Props**:
```typescript
interface CallTranscriptPanelProps {
  transcript?: CallTranscript | null
  loading?: boolean
  error?: Error | null
  showClose?: boolean
  onClose?: () => void
  height?: string  // e.g., "500px", "100vh"
  className?: string
}
```

**Usage**:
```tsx
import { CallTranscriptPanel } from '@/components/calls/CallTranscriptPanel'

// Sidebar panel
<CallTranscriptPanel
  transcript={transcript}
  height="100vh"
/>

// Modal with close button
<CallTranscriptPanel
  transcript={transcript}
  showClose
  onClose={() => setShowModal(false)}
  height="600px"
/>
```

**Documentation**: See [CallTranscriptPanel.README.md](./CallTranscriptPanel.README.md) for detailed guide

**Examples**: See [CallTranscriptPanel.examples.tsx](./CallTranscriptPanel.examples.tsx) for 10 integration patterns

---

### 2. CallTranscriptViewer
**Full-featured transcript display component**

**Features**:
- Segment-by-segment conversation view
- Speaker identification with badges (Agent/User)
- Timestamps for each segment
- Search/filter functionality
- Copy to clipboard
- Download as text file
- AI-generated summary (collapsible)
- Sentiment analysis badge
- Loading skeleton states
- Error handling
- Responsive design

**Props**:
```typescript
interface CallTranscriptViewerProps {
  transcript?: CallTranscript | null
  loading?: boolean
  error?: Error | null
  onCopy?: () => void
  onDownload?: () => void
  className?: string
}
```

**Usage**:
```tsx
import { CallTranscriptViewer } from '@/components/calls/CallTranscriptViewer'

<CallTranscriptViewer
  transcript={transcript}
  loading={isLoading}
  error={error}
  onCopy={() => console.log('Copied!')}
  onDownload={() => console.log('Downloaded!')}
/>
```

### 3. CallTranscriptCard
**Compact transcript summary card**

**Features**:
- Status badge with color coding
- Duration and segment count
- Sentiment indicator
- Summary preview
- View transcript button
- Processing state indicators
- Compact and full size modes
- Loading skeleton
- Error state

**Props**:
```typescript
interface CallTranscriptCardProps {
  transcript?: CallTranscript | null
  loading?: boolean
  error?: Error | null
  compact?: boolean
  showViewButton?: boolean
  onView?: () => void
  className?: string
}
```

**Usage**:
```tsx
import { CallTranscriptCard } from '@/components/calls/CallTranscriptCard'

<CallTranscriptCard
  transcript={transcript}
  loading={isLoading}
  showViewButton
  onView={() => router.push(`/calls/${callId}/transcript`)}
  compact={false}
/>
```

### 4. TranscriptSection
**Smart wrapper with data fetching**

**Features**:
- Automatic transcript fetching
- Auto-refresh for processing transcripts
- Session-aware authentication
- Full view or compact modes
- Built-in loading states

**Props**:
```typescript
interface TranscriptSectionProps {
  callLogId: string
  fullView?: boolean
  onViewTranscript?: () => void
}
```

**Usage**:
```tsx
import { TranscriptSection } from '@/app/dashboard/calls/[id]/TranscriptSection'

// Full transcript viewer
<TranscriptSection callLogId={callId} fullView />

// Compact card
<TranscriptSection
  callLogId={callId}
  fullView={false}
  onViewTranscript={() => router.push(`/calls/${callId}/transcript`)}
/>
```

## Hooks

### useCallTranscript
**Custom hook for fetching transcript data**

**Features**:
- Fetch by call_log_id
- Auto-fetch on mount
- Refresh interval support
- Loading/error states
- Session-aware authentication

**Usage**:
```tsx
import { useCallTranscript } from '@/hooks/useCallTranscript'

const { transcript, loading, error, refresh } = useCallTranscript(callLogId, {
  userId: session?.user?.id,
  autoFetch: true,
  refreshInterval: 5000 // Refresh every 5s
})
```

**Options**:
```typescript
interface UseCallTranscriptOptions {
  userId?: string
  autoFetch?: boolean
  refreshInterval?: number // milliseconds, 0 = no refresh
}
```

### useTranscriptById
**Fetch transcript by transcript ID**

**Usage**:
```tsx
import { useTranscriptById } from '@/hooks/useCallTranscript'

const { transcript, loading, error, refresh } = useTranscriptById(transcriptId, {
  userId: session?.user?.id
})
```

## Types

### CallTranscript
```typescript
interface CallTranscript {
  id: string
  userId: string
  callLogId: string
  language?: string | null
  duration?: number | null
  segmentCount: number
  sentiment?: 'positive' | 'neutral' | 'negative' | null
  summary?: string | null
  keywords?: Record<string, any> | null
  status: 'processing' | 'completed' | 'failed'
  errorMessage?: string | null
  createdAt: string
  updatedAt?: string | null
  completedAt?: string | null
  segments?: TranscriptSegment[]
}
```

### TranscriptSegment
```typescript
interface TranscriptSegment {
  id: string
  transcriptId: string
  sequenceNumber: number
  speaker: 'agent' | 'user' | 'system'
  speakerId?: string | null
  startTime: number
  endTime: number
  text: string
  confidence?: number | null
  language?: string | null
  isFinal: boolean
  metadata?: Record<string, any> | null
  createdAt: string
}
```

## Helper Functions

All helper functions are exported from `@/types/call-transcript`:

```typescript
// Status badge configuration
getTranscriptStatusColor(status: TranscriptStatus): {
  color, label, textColor
}

// Sentiment badge configuration
getSentimentColor(sentiment: TranscriptSentiment): {
  color, label, icon
}

// Speaker badge configuration
getSpeakerColor(speaker: SpeakerType): {
  color, label, textColor, bgColor
}

// Duration formatting (0:00, 1:23:45)
formatTranscriptDuration(seconds?: number | null): string

// Timestamp formatting (0:00)
formatTimestamp(seconds: number): string

// Utility checks
hasSegments(transcript?: CallTranscript | null): boolean
isTranscriptComplete(transcript?: CallTranscript | null): boolean
isTranscriptFailed(transcript?: CallTranscript | null): boolean
getTranscriptProgress(transcript?: CallTranscript | null): number
```

## Styling

### Color Coding

**Status Colors**:
- **Completed**: Green (success)
- **Processing**: Yellow (warning)
- **Failed**: Red (danger)

**Speaker Colors**:
- **Agent**: Blue (primary)
- **User**: Purple (secondary)
- **System**: Gray (default)

**Sentiment Colors**:
- **Positive**: Green (success) 😊
- **Neutral**: Gray (default) 😐
- **Negative**: Red (danger) 😟

### Component Sizes

**CallTranscriptViewer**:
- Full width responsive
- Max height: 600px with scroll
- Segments: Hover effect with background highlight

**CallTranscriptCard**:
- Compact mode: Reduced padding, smaller text
- Full mode: Standard padding, larger text
- Grid layout for stats (2 columns)

## Integration Examples

### 1. Call Detail Page

```tsx
// app/dashboard/calls/[id]/page.tsx
'use client'

import { TranscriptSection } from './TranscriptSection'
import { CallOutcomeCard } from '@/components/calls/CallOutcomeCard'

export default function CallDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Call Details</h1>

      {/* Call Outcome */}
      <CallOutcomeCard callLogId={params.id} />

      {/* Call Transcript - Full View */}
      <TranscriptSection callLogId={params.id} fullView />
    </div>
  )
}
```

### 2. Call List with Transcript Preview

```tsx
// app/dashboard/calls/page.tsx
'use client'

import { CallTranscriptCard } from '@/components/calls/CallTranscriptCard'

export default function CallsPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {calls.map(call => (
        <div key={call.id} className="space-y-3">
          <CallCard call={call} />
          <CallTranscriptCard
            transcript={call.transcript}
            compact
            showViewButton
            onView={() => router.push(`/calls/${call.id}`)}
          />
        </div>
      ))}
    </div>
  )
}
```

### 3. Dashboard Widget

```tsx
// components/dashboard/RecentTranscripts.tsx
'use client'

import { useCallTranscript } from '@/hooks/useCallTranscript'
import { CallTranscriptCard } from '@/components/calls/CallTranscriptCard'

export function RecentTranscripts() {
  const recentCalls = useRecentCalls()

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Recent Transcripts</h2>
      {recentCalls.map(call => (
        <CallTranscriptCard
          key={call.id}
          transcript={call.transcript}
          compact
          onView={() => router.push(`/calls/${call.id}/transcript`)}
        />
      ))}
    </div>
  )
}
```

## API Integration

### Fetch Transcript
```typescript
// GET /api/transcripts/call/{callLogId}?user_id={userId}
const response = await fetch(`/api/transcripts/call/${callLogId}?user_id=${userId}`)
const data = await response.json()
// { success: true, transcript: {...} }
```

### Backend Proxy (if needed)

```typescript
// app/api/transcripts/call/[callLogId]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { callLogId: string } }
) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')

  const response = await fetch(
    `http://localhost:5001/api/transcripts/call/${params.callLogId}?user_id=${userId}`,
    {
      headers: {
        'X-User-ID': userId || ''
      }
    }
  )

  return Response.json(await response.json())
}
```

## Performance Optimizations

### 1. Auto-Refresh Strategy
```tsx
// Only refresh if transcript is still processing
const refreshInterval = transcript?.status === 'processing' ? 5000 : 0
```

### 2. Lazy Loading Segments
```tsx
// Load segments on demand
const [showSegments, setShowSegments] = useState(false)

{showSegments && <TranscriptSegments segments={transcript.segments} />}
```

### 3. Virtualization (for large transcripts)
```tsx
import { FixedSizeList } from 'react-window'

<FixedSizeList
  height={600}
  itemCount={segments.length}
  itemSize={80}
>
  {({ index, style }) => (
    <div style={style}>
      <TranscriptSegmentCard segment={segments[index]} />
    </div>
  )}
</FixedSizeList>
```

### 4. Search Debouncing
```tsx
import { useDebouncedValue } from '@/hooks/useDebounce'

const [searchQuery, setSearchQuery] = useState('')
const debouncedQuery = useDebouncedValue(searchQuery, 300)

useEffect(() => {
  // Filter segments with debounced query
}, [debouncedQuery])
```

## Accessibility

### Keyboard Navigation
- ✅ Tab navigation through interactive elements
- ✅ Enter/Space to trigger buttons
- ✅ Arrow keys for list navigation (future enhancement)

### Screen Readers
- ✅ Semantic HTML structure
- ✅ ARIA labels on interactive elements
- ✅ Role attributes (dialog, region, etc.)
- ✅ Live regions for status updates

### Visual Accessibility
- ✅ High contrast color scheme
- ✅ Clear speaker differentiation
- ✅ Status indicators with text + color
- ✅ Readable font sizes (14px+)
- ✅ Focus indicators on interactive elements

## Testing

### Unit Tests (Jest + React Testing Library)

```tsx
// __tests__/CallTranscriptViewer.test.tsx
describe('CallTranscriptViewer', () => {
  it('renders loading state', () => {
    render(<CallTranscriptViewer loading />)
    expect(screen.getByTestId('transcript-skeleton')).toBeInTheDocument()
  })

  it('renders transcript segments', () => {
    render(<CallTranscriptViewer transcript={mockTranscript} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(mockTranscript.segments.length)
  })

  it('handles search filtering', async () => {
    render(<CallTranscriptViewer transcript={mockTranscript} />)
    const searchInput = screen.getByPlaceholderText('Search transcript...')
    await userEvent.type(searchInput, 'hello')
    // Assert filtered results
  })

  it('copies transcript to clipboard', async () => {
    render(<CallTranscriptViewer transcript={mockTranscript} />)
    const copyButton = screen.getByTitle('Copy to clipboard')
    await userEvent.click(copyButton)
    expect(navigator.clipboard.writeText).toHaveBeenCalled()
  })
})
```

### Integration Tests

```tsx
// Test with actual API
describe('TranscriptSection Integration', () => {
  it('fetches and displays transcript', async () => {
    render(<TranscriptSection callLogId="test-call-123" fullView />)
    await waitFor(() => {
      expect(screen.getByText(/Call Transcript/i)).toBeInTheDocument()
    })
  })

  it('auto-refreshes processing transcripts', async () => {
    render(<TranscriptSection callLogId="test-call-123" fullView />)
    // Wait for refresh interval
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2)
    }, { timeout: 6000 })
  })
})
```

## Error Handling

### Network Errors
- Display user-friendly error message
- Provide retry button
- Graceful degradation (show partial data if available)

### Invalid Data
- Type validation using TypeScript
- Runtime checks for required fields
- Fallback to empty states

### Authentication Errors
- Redirect to login if unauthorized
- Show permission denied message
- Retry with refreshed session

## Component Selection Guide

Choose the right component for your use case:

| Use Case | Component | Why |
|----------|-----------|-----|
| **Full-page transcript view** | CallTranscriptViewer | Complete features (copy, download, summary) |
| **Sidebar panel** | CallTranscriptPanel ⭐ | Compact, configurable height |
| **Modal/Dialog** | CallTranscriptPanel ⭐ | Close button, fixed height |
| **Slide-out drawer** | CallTranscriptPanel ⭐ | Dismissible, space-efficient |
| **Dashboard widget** | CallTranscriptPanel ⭐ | Embedded, auto-refresh |
| **Call list preview** | CallTranscriptCard | Summary only, small footprint |
| **Split-view layout** | CallTranscriptPanel ⭐ | Flexible sizing, minimal features |

### Feature Comparison

| Feature | Panel | Viewer | Card |
|---------|-------|--------|------|
| **Full segments** | ✅ | ✅ | ❌ |
| **Search** | ✅ | ✅ | ❌ |
| **Copy/Download** | ❌ | ✅ | ❌ |
| **AI Summary** | ❌ | ✅ Expandable | ✅ Preview |
| **Close button** | ✅ Optional | ❌ | ❌ |
| **Height control** | ✅ | ❌ | ❌ |
| **Compact mode** | ✅ Always | ❌ | ✅ |
| **Best for** | Panels | Pages | Lists |

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Fallbacks
- Clipboard API not supported → Show manual copy instructions
- Intersection Observer not supported → Load all segments

## Future Enhancements

### Phase 1 (Current)
- ✅ Basic transcript display
- ✅ Speaker identification
- ✅ Search functionality
- ✅ Copy/download

### Phase 2 (Next Sprint)
- [ ] Real-time updates via WebSocket
- [ ] Audio playback with sync
- [ ] Jump to timestamp in recording
- [ ] Highlight search results

### Phase 3 (Future)
- [ ] Edit transcript capability
- [ ] Speaker name customization
- [ ] Sentiment per segment
- [ ] Export formats (PDF, VTT, SRT)
- [ ] Keyword highlighting
- [ ] Translation support

## Files Created

```
frontend/
├── types/
│   └── call-transcript.ts (230 lines)
├── components/calls/
│   ├── CallTranscriptViewer.tsx (350 lines)
│   ├── CallTranscriptCard.tsx (280 lines)
│   ├── CallTranscriptPanel.tsx (350 lines) ⭐ NEW
│   ├── CallTranscriptPanel.README.md (800+ lines) ⭐ NEW
│   ├── CallTranscriptPanel.examples.tsx (450 lines) ⭐ NEW
│   └── TRANSCRIPT_UI_README.md (this file - updated)
├── hooks/
│   └── useCallTranscript.ts (220 lines)
└── app/dashboard/calls/[id]/
    └── TranscriptSection.tsx (85 lines)

Total: ~2,765 lines of production code + documentation
```

## Deployment Checklist

- ✅ Types defined and exported
- ✅ Components implemented with full features
- ✅ Custom hooks created
- ✅ Integration examples provided
- ✅ Documentation complete
- ⏳ Backend API operational (already deployed)
- ⏳ Testing with live calls
- ⏳ Frontend build and deployment

## Support

For issues or questions:
- Check component props in type definitions
- Review integration examples in this README
- Test with mock data first
- Check browser console for errors
- Verify backend API is responding: `curl http://localhost:5001/api/transcripts/health`

---

**Implementation Date**: October 30, 2025
**Status**: ✅ Complete - Ready for Integration
**Next**: Integrate into call detail pages and test with live calls

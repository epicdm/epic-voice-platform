# Primitive Components

Small, reusable UI primitives for building consistent interfaces across the application.

## Components

### StatusBadge

Color-coded status indicator with icon in a pill-shaped design.

```tsx
import { StatusBadge } from '@/components/primitives'

<StatusBadge variant="running" />
<StatusBadge variant="deploying" label="Processing" />
<StatusBadge variant="error" />
<StatusBadge variant="inactive" showIcon={false} />
```

#### Props

- `variant` ('running' | 'inactive' | 'deploying' | 'error', required): Status variant
- `label` (string, optional): Custom label (overrides default)
- `showIcon` (boolean, optional): Show icon (default: true)
- `className` (string, optional): Additional CSS classes

#### Variants

| Variant | Color | Icon | Use Case |
|---------|-------|------|----------|
| `running` | Green | Play | Active/running state |
| `inactive` | Gray | XCircle | Stopped/inactive state |
| `deploying` | Blue | Loader2 (animated) | In-progress deployment |
| `error` | Red | AlertCircle | Error/failed state |

#### Examples

**Agent Status**:
```tsx
<StatusBadge variant="running" />
<StatusBadge variant="deploying" label="Initializing" />
<StatusBadge variant="inactive" />
```

**Call Status**:
```tsx
<StatusBadge variant="running" label="In Progress" />
<StatusBadge variant="error" label="Failed" />
```

**Custom Label**:
```tsx
<StatusBadge variant="deploying" label="Updating..." />
```

---

### MetricStat

Vertical metric display component for dashboards and cards.

```tsx
import { MetricStat } from '@/components/primitives'
import { Users, Phone, DollarSign } from 'lucide-react'

<MetricStat
  icon={Users}
  label="Total Users"
  value="1,234"
  variant="primary"
/>

<MetricStat
  icon={Phone}
  label="Active Calls"
  value="42"
  variant="success"
  valueSize="lg"
/>

<MetricStat
  icon={DollarSign}
  label="Revenue"
  value="$12,345"
/>
```

#### Props

- `icon` (LucideIcon, required): Lucide icon component
- `label` (string, required): Metric label/description
- `value` (string | number | ReactNode, required): Metric value
- `variant` ('default' | 'success' | 'warning' | 'danger' | 'primary', optional): Visual variant (default: 'default')
- `valueSize` ('sm' | 'default' | 'lg', optional): Value text size (default: 'default')
- `className` (string, optional): Additional CSS classes
- `iconClassName` (string, optional): Icon color override

#### Variants

| Variant | Icon Color | Value Color | Use Case |
|---------|-----------|-------------|----------|
| `default` | Muted | Foreground | Neutral metrics |
| `success` | Green | Green | Positive metrics |
| `warning` | Yellow | Yellow | Warning metrics |
| `danger` | Red | Red | Negative metrics |
| `primary` | Primary | Primary | Important metrics |

#### Value Sizes

- `sm`: 18px (text-lg)
- `default`: 24px (text-2xl)
- `lg`: 30px (text-3xl)

#### Examples

**Dashboard Stats**:
```tsx
import { Users, Phone, DollarSign, TrendingUp } from 'lucide-react'

<MetricStat
  icon={Users}
  label="Total Users"
  value="1,234"
  variant="primary"
/>

<MetricStat
  icon={Phone}
  label="Active Calls"
  value="42"
  variant="success"
/>

<MetricStat
  icon={DollarSign}
  label="Revenue Today"
  value="$2,567.89"
/>

<MetricStat
  icon={TrendingUp}
  label="Growth"
  value="+12.5%"
  variant="success"
  valueSize="lg"
/>
```

**With Custom Value Rendering**:
```tsx
<MetricStat
  icon={DollarSign}
  label="Total Cost"
  value={
    <div className="flex items-baseline gap-1">
      <span className="font-bold">$45.67</span>
      <span className="text-xs text-muted-foreground">USD</span>
    </div>
  }
/>
```

---

### MetricStatGrid

Helper component for displaying multiple metrics in a responsive grid.

```tsx
import { MetricStatGrid, MetricStat } from '@/components/primitives'
import { Users, Phone, DollarSign } from 'lucide-react'

<MetricStatGrid>
  <MetricStat icon={Users} label="Users" value="1,234" />
  <MetricStat icon={Phone} label="Calls" value="5,678" />
  <MetricStat icon={DollarSign} label="Revenue" value="$12,345" />
</MetricStatGrid>
```

#### Props

- `children` (ReactNode, required): MetricStat components
- `className` (string, optional): Additional CSS classes

#### Grid Layout

- Mobile: 1 column
- Tablet (sm): 2 columns
- Desktop (lg): 3 columns
- Large Desktop (xl): 4 columns

---

### MetricStatCard

Wrapper component that adds card styling to MetricStat.

```tsx
import { MetricStatCard, MetricStat } from '@/components/primitives'
import { Users } from 'lucide-react'

<MetricStatCard>
  <MetricStat
    icon={Users}
    label="Active Users"
    value="1,234"
    variant="primary"
  />
</MetricStatCard>
```

#### Props

- `children` (ReactNode, required): MetricStat component
- `className` (string, optional): Additional CSS classes

#### Features

- Border and background styling
- Hover shadow effect
- Padding and rounded corners

---

## Complete Examples

### Dashboard Overview

```tsx
'use client'

import { MetricStatGrid, MetricStatCard, MetricStat, StatusBadge } from '@/components/primitives'
import { Users, Phone, DollarSign, TrendingUp, Bot } from 'lucide-react'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <MetricStatGrid>
        <MetricStatCard>
          <MetricStat
            icon={Users}
            label="Total Users"
            value="1,234"
            variant="primary"
          />
        </MetricStatCard>

        <MetricStatCard>
          <MetricStat
            icon={Phone}
            label="Active Calls"
            value="42"
            variant="success"
          />
        </MetricStatCard>

        <MetricStatCard>
          <MetricStat
            icon={DollarSign}
            label="Revenue Today"
            value="$2,567.89"
          />
        </MetricStatCard>

        <MetricStatCard>
          <MetricStat
            icon={TrendingUp}
            label="Growth"
            value="+12.5%"
            variant="success"
            valueSize="lg"
          />
        </MetricStatCard>
      </MetricStatGrid>

      {/* Agents List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Bot className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Sales Agent</p>
              <p className="text-sm text-muted-foreground">GPT-4 Turbo</p>
            </div>
          </div>
          <StatusBadge variant="running" />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Bot className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Support Agent</p>
              <p className="text-sm text-muted-foreground">GPT-4o</p>
            </div>
          </div>
          <StatusBadge variant="deploying" label="Updating" />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Bot className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Test Agent</p>
              <p className="text-sm text-muted-foreground">GPT-3.5</p>
            </div>
          </div>
          <StatusBadge variant="inactive" />
        </div>
      </div>
    </div>
  )
}
```

### Analytics Card

```tsx
import { MetricStatCard, MetricStat } from '@/components/primitives'
import { Phone, Clock, DollarSign, TrendingUp } from 'lucide-react'

export function AnalyticsCard() {
  return (
    <div className="grid grid-cols-2 gap-4 p-6 border rounded-lg bg-card">
      <MetricStat
        icon={Phone}
        label="Total Calls"
        value="1,234"
        variant="primary"
        valueSize="sm"
      />

      <MetricStat
        icon={Clock}
        label="Avg Duration"
        value="2:34"
        valueSize="sm"
      />

      <MetricStat
        icon={DollarSign}
        label="Total Cost"
        value="$45.67"
        variant="warning"
        valueSize="sm"
      />

      <MetricStat
        icon={TrendingUp}
        label="Success Rate"
        value="98.5%"
        variant="success"
        valueSize="sm"
      />
    </div>
  )
}
```

### Agent Status List

```tsx
import { StatusBadge } from '@/components/primitives'

const agents = [
  { id: 1, name: 'Sales Agent', status: 'running' },
  { id: 2, name: 'Support Agent', status: 'deploying' },
  { id: 3, name: 'Test Agent', status: 'inactive' },
  { id: 4, name: 'Training Agent', status: 'error' }
]

export function AgentList() {
  return (
    <div className="space-y-2">
      {agents.map(agent => (
        <div key={agent.id} className="flex items-center justify-between p-3 border rounded-lg">
          <span className="font-medium">{agent.name}</span>
          <StatusBadge variant={agent.status} />
        </div>
      ))}
    </div>
  )
}
```

---

## Styling

All components use:
- **Tailwind CSS**: Utility classes and responsive design
- **Lucide React**: Icon library (StatusBadge internally, MetricStat as prop)
- **Dark Mode**: Full dark mode support via Tailwind's dark: variants

Components respect the application's theme system.

---

## Responsive Behavior

### StatusBadge
- Consistent size across all breakpoints
- Text remains legible on all devices

### MetricStat
- Icon size fixed at 40x40px
- Value size adjustable via `valueSize` prop
- Vertical layout works on all screen sizes

### MetricStatGrid
- 1 column on mobile
- 2 columns on tablet (sm: 640px+)
- 3 columns on desktop (lg: 1024px+)
- 4 columns on large desktop (xl: 1280px+)

---

## Accessibility

### StatusBadge
- Uses semantic HTML (span)
- Color is not the only indicator (icon included)
- Text labels for screen readers

### MetricStat
- Proper heading hierarchy
- ARIA labels where appropriate
- Keyboard navigation support

---

## TypeScript Support

All components are fully typed with TypeScript:

```typescript
import type {
  StatusBadgeProps,
  StatusVariant,
  MetricStatProps,
  MetricVariant
} from '@/components/primitives'

// StatusVariant: 'running' | 'inactive' | 'deploying' | 'error'
// MetricVariant: 'default' | 'success' | 'warning' | 'danger' | 'primary'
```

---

## Best Practices

### StatusBadge

✅ **Do**:
- Use consistent variants across the app
- Provide custom labels for clarity
- Use icons for quick visual recognition

❌ **Don't**:
- Mix custom colors outside the variant system
- Use for non-status indicators
- Hide icons unless absolutely necessary

### MetricStat

✅ **Do**:
- Group related metrics in MetricStatGrid
- Use appropriate variants for context
- Keep labels concise (2-3 words)
- Use MetricStatCard for standalone metrics

❌ **Don't**:
- Use overly long labels
- Mix value sizes inconsistently
- Overuse variant colors
- Nest MetricStat inside other MetricStat

---

## Performance

Both components are lightweight:
- **StatusBadge**: ~100 bytes (gzipped)
- **MetricStat**: ~150 bytes (gzipped)

Optimizations:
- No unnecessary re-renders
- Efficient Tailwind class application
- Minimal DOM nesting

---

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari 14+, Chrome Android latest

---

---

### Waveform

Animated audio waveform visualization component.

```tsx
import { Waveform, WaveformCard } from '@/components/primitives'

// Animated placeholder
<Waveform />

// Custom styling
<Waveform
  barCount={20}
  height={40}
  barColor="bg-blue-500"
  gap={2}
/>

// With real audio data
<Waveform
  data={[20, 40, 60, 80, 100, 80, 60, 40, 20]}
  animated={false}
/>

// In a card
<WaveformCard>
  <Waveform />
</WaveformCard>
```

#### Props

- `barCount` (number, optional): Number of bars to display (default: 15)
- `height` (number, optional): Height in pixels (default: 32)
- `barColor` (string, optional): Tailwind color class (default: 'bg-primary')
- `gap` (number, optional): Gap between bars in pixels (default: 2)
- `animationSpeed` (number, optional): Animation speed in milliseconds (default: 500)
- `data` (number[], optional): Real audio data (0-100 values)
- `animated` (boolean, optional): Whether to animate (default: true)
- `className` (string, optional): Additional CSS classes

#### Features

- Animated placeholder bars by default
- Optional real audio data visualization
- Configurable appearance (bar count, height, color, gap)
- Smooth CSS animations
- Responsive design

#### Use Cases

**Call Status Indicator**:
```tsx
<div className="flex items-center gap-3">
  <Waveform barCount={8} height={24} barColor="bg-green-500" />
  <span>Active Call</span>
</div>
```

**Audio Player**:
```tsx
<WaveformCard>
  <div className="space-y-2">
    <p className="text-sm text-muted-foreground">Recording Playback</p>
    <Waveform
      data={audioAmplitudes}
      barCount={30}
      height={48}
      animated={false}
    />
  </div>
</WaveformCard>
```

---

### Copyable

Wrap text with copy-to-clipboard functionality and visual feedback.

```tsx
import { Copyable, CopyableCode, CopyableField } from '@/components/primitives'

// Simple text copy
<Copyable text="api_key_123456789">
  api_key_123456789
</Copyable>

// Code snippet
<CopyableCode text="npm install @heroui/react">
  npm install @heroui/react
</CopyableCode>

// Key-value field
<CopyableField
  label="API Key"
  text="sk_live_123456789"
/>

// With custom display
<Copyable text="full-long-text-here">
  <code>shortened...</code>
</Copyable>

// Hover-only icon
<Copyable
  text="secret_token"
  showOnHover
  iconSize="sm"
>
  secret_token
</Copyable>
```

#### Props

- `text` (string, required): Text content to copy
- `children` (ReactNode, optional): Visual content to display (defaults to text)
- `className` (string, optional): Additional CSS classes for wrapper
- `textClassName` (string, optional): Additional CSS classes for text
- `showOnHover` (boolean, optional): Show copy icon on hover only (default: false)
- `iconSize` ('sm' | 'md' | 'lg', optional): Icon size (default: 'sm')
- `copiedDuration` (number, optional): "Copied!" state duration in ms (default: 2000)
- `onCopy` (function, optional): Callback when text is copied

#### Features

- Click to copy text to clipboard
- Visual feedback with "Copied!" tooltip
- Icon changes from Copy to Check on success
- Optional hover-only icon display
- Configurable icon size
- Custom content display
- Helper variants: CopyableCode, CopyableField

#### Use Cases

**API Key Display**:
```tsx
<div className="space-y-2">
  <CopyableField label="API Key" text="sk_live_abc123..." />
  <CopyableField label="Secret" text="whsec_xyz789..." />
</div>
```

**Code Commands**:
```tsx
<div className="space-y-2">
  <CopyableCode text="npm install">
    npm install
  </CopyableCode>
  <CopyableCode text="npm run dev">
    npm run dev
  </CopyableCode>
</div>
```

**Room IDs / Call IDs**:
```tsx
<Copyable
  text="rm_abc123xyz456"
  showOnHover
  textClassName="font-mono text-sm"
>
  rm_abc123xyz456
</Copyable>
```

---

## Related Components

- **PageHeader**: Use with MetricStat for page-level metrics
- **Toolbar**: Combine with StatusBadge for filtering
- **InspectorDrawer**: Display detailed MetricStat breakdowns with Copyable fields

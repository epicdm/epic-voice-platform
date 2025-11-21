# AgentInsightCard - Figma-Level Component Specification

**Version**: 2.0
**Date**: 2025-10-31
**Component Path**: `frontend/components/agents/AgentInsightCard.tsx`
**Design System**: HeroUI + Tailwind CSS + Lucide Icons

---

## Table of Contents
1. [Component Overview](#component-overview)
2. [TypeScript Interface](#typescript-interface)
3. [Data Schema](#data-schema)
4. [State Management](#state-management)
5. [Visual Specifications](#visual-specifications)
6. [Interaction States](#interaction-states)
7. [Responsive Behavior](#responsive-behavior)
8. [Component States](#component-states)
9. [Accessibility](#accessibility)
10. [Implementation Guide](#implementation-guide)

---

## Component Overview

**Purpose**: Display AI agent with real-time performance metrics, status indicator, and quick action toolbar.

**Key Features**:
- Real-time metrics from call logs (calls today, success rate, avg duration)
- Agent status badge with live updates
- Quick actions toolbar (Start/Stop, Edit, Duplicate, Delete)
- Tag categorization
- Hover expansion with animations
- Click-to-inspect integration
- Full dark/light theme support
- Mobile responsive design

**Use Cases**:
- Agent dashboard grid display
- Agent performance monitoring
- Quick agent management
- Agent comparison views

---

## TypeScript Interface

### Primary Interface

```typescript
export interface AgentInsightCardProps {
  /** Agent data - REQUIRED */
  agent: Agent

  /** Agent metrics - OPTIONAL (real-time calculated from call logs) */
  metrics?: AgentMetrics

  /** Agent tags - OPTIONAL (auto-generated or custom) */
  tags?: string[]

  /** Loading state - OPTIONAL (for skeleton display) */
  isLoading?: boolean

  /** Error state - OPTIONAL (for error display) */
  error?: Error | string | null

  /** Event Handlers - ALL OPTIONAL */
  onSelect?: (agent: Agent) => void
  onStart?: (agent: Agent) => void    // NEW: Start/deploy agent
  onStop?: (agent: Agent) => void     // NEW: Stop/undeploy agent
  onEdit?: (agent: Agent) => void
  onDuplicate?: (agent: Agent) => void
  onDelete?: (agent: Agent) => void
  onMonitor?: (agent: Agent) => void

  /** Styling - OPTIONAL */
  className?: string
  variant?: 'default' | 'compact' | 'expanded' // NEW: Display variants

  /** Behavior - OPTIONAL */
  disableHover?: boolean   // NEW: Disable hover effects
  expandOnHover?: boolean  // NEW: Enable hover expansion (default: false)
  showQuickActions?: boolean // NEW: Show/hide quick actions (default: true)
}
```

### Supporting Types

```typescript
/**
 * Agent metrics calculated from call logs
 */
export interface AgentMetrics {
  /** Number of calls started today (00:00 - 23:59) */
  callsToday: number

  /** Success rate percentage (0-100) */
  successRate: number

  /** Average call duration in seconds OR formatted string */
  avgDuration: number | string

  /** Timestamp of most recent call */
  lastCallAt?: string | Date

  /** Total number of calls (all time) */
  totalCalls?: number

  /** Active calls right now */
  activeCalls?: number
}

/**
 * Agent status enum (from @/types/agent)
 */
export enum AgentStatus {
  CREATED = "created",        // Agent created but not deployed
  DEPLOYING = "deploying",    // Deployment in progress
  DEPLOYED = "deployed",      // Agent running on LiveKit
  UNDEPLOYING = "undeploying", // Stopping in progress
  FAILED = "failed",          // Deployment failed
  ACTIVE = "active",          // Legacy: Agent is active
  INACTIVE = "inactive",      // Legacy: Agent is stopped
}

/**
 * Agent entity (full schema)
 */
export interface Agent {
  // Identity
  id: string                   // UUID
  name: string                 // Agent display name (max 100 chars)
  instructions: string         // System prompt for LLM
  status: AgentStatus          // Current deployment status
  created_at: string           // ISO timestamp
  updated_at: string           // ISO timestamp

  // Core Configuration
  agent_mode: string           // "voice" | "chat" | "multimodal"
  language: string             // "en" | "es" | "fr" | etc.
  temperature: number          // 0.0 - 2.0

  // LLM Configuration
  llm_provider: string         // "openai" | "anthropic" | "google"
  llm_model: string            // "gpt-4o" | "claude-3-5-sonnet"

  // STT Configuration
  stt_provider: string         // "deepgram" | "assemblyai"
  stt_model: string
  stt_language: string

  // TTS Configuration
  tts_provider: string         // "openai" | "cartesia" | "elevenlabs"
  tts_model: string | null
  tts_voice_id: string | null
  voice: string | null         // "echo" | "alloy" | "fable"
  realtime_voice: string       // Realtime API voice

  // VAD Configuration
  vad_enabled: boolean
  vad_provider: string

  // Turn Detection
  turn_detection_model: string // "semantic" | "vad_based"

  // Noise Cancellation
  noise_cancellation_enabled: boolean
  noise_cancellation_type: string

  // Advanced Options
  preemptive_generation: boolean
  resume_false_interruption: boolean
  false_interruption_timeout: number
  min_interruption_duration: number

  // Greeting
  greeting_enabled: boolean
  greeting_message: string | null

  // Optional
  description?: string
  user_id?: string
}
```

---

## Data Schema

### Input Data Requirements

```typescript
// MINIMUM REQUIRED DATA
const minimalAgent: Agent = {
  id: "uuid-v4",
  name: "Customer Support Agent",
  status: AgentStatus.DEPLOYED,
  // ... all other Agent fields required by interface
}

// RECOMMENDED DATA (with metrics)
const agentWithMetrics = {
  agent: minimalAgent,
  metrics: {
    callsToday: 42,
    successRate: 95,
    avgDuration: 154, // seconds
    lastCallAt: "2025-10-31T14:23:00Z"
  },
  tags: ["Sales", "English", "GPT-4o"]
}

// FULL DATA (with all handlers)
const fullExample = {
  agent: minimalAgent,
  metrics: { /* ... */ },
  tags: ["Sales", "English", "GPT-4o", "Semantic"],
  onSelect: (agent) => openInspector(agent),
  onStart: (agent) => deployAgent(agent),
  onStop: (agent) => undeployAgent(agent),
  onEdit: (agent) => router.push(`/agents/${agent.id}/edit`),
  onDuplicate: (agent) => cloneAgent(agent),
  onDelete: (agent) => confirmDelete(agent),
  onMonitor: (agent) => openLiveMonitor(agent)
}
```

### Data Validation Rules

```typescript
/**
 * Validate agent name length
 */
const MAX_AGENT_NAME_LENGTH = 100
const isValidAgentName = (name: string) => {
  return name.length > 0 && name.length <= MAX_AGENT_NAME_LENGTH
}

/**
 * Validate metrics data
 */
const validateMetrics = (metrics: AgentMetrics) => {
  return {
    callsToday: metrics.callsToday >= 0,
    successRate: metrics.successRate >= 0 && metrics.successRate <= 100,
    avgDuration: typeof metrics.avgDuration === 'number'
      ? metrics.avgDuration >= 0
      : /^\d{1,2}:\d{2}$/.test(metrics.avgDuration)
  }
}

/**
 * Validate agent status transitions
 */
const validTransitions: Record<AgentStatus, AgentStatus[]> = {
  [AgentStatus.CREATED]: [AgentStatus.DEPLOYING],
  [AgentStatus.DEPLOYING]: [AgentStatus.DEPLOYED, AgentStatus.FAILED],
  [AgentStatus.DEPLOYED]: [AgentStatus.UNDEPLOYING],
  [AgentStatus.UNDEPLOYING]: [AgentStatus.INACTIVE],
  [AgentStatus.FAILED]: [AgentStatus.DEPLOYING],
  [AgentStatus.ACTIVE]: [AgentStatus.INACTIVE],
  [AgentStatus.INACTIVE]: [AgentStatus.ACTIVE]
}
```

---

## State Management

### Component Internal State

```typescript
interface AgentInsightCardState {
  /** Hover state for toolbar display */
  isHovered: boolean

  /** Expansion state (if expandOnHover enabled) */
  isExpanded: boolean

  /** Loading state for async actions */
  isActionLoading: boolean

  /** Current action being performed */
  pendingAction: 'start' | 'stop' | 'edit' | 'duplicate' | 'delete' | null

  /** Error state for action failures */
  actionError: string | null

  /** Optimistic UI state */
  optimisticStatus?: AgentStatus
}

/**
 * State initialization
 */
const initialState: AgentInsightCardState = {
  isHovered: false,
  isExpanded: false,
  isActionLoading: false,
  pendingAction: null,
  actionError: null,
  optimisticStatus: undefined
}
```

### Real-Time State Behavior

```typescript
/**
 * Status Badge Real-Time Updates
 */
const statusBehavior = {
  // Poll interval for status updates
  pollInterval: 5000, // 5 seconds

  // WebSocket connection for real-time updates (future)
  websocket: false,

  // Optimistic UI updates
  optimisticUpdates: true,

  // Status transition animations
  transitions: {
    duration: 300, // ms
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
  }
}

/**
 * Metrics Real-Time Updates
 */
const metricsUpdateBehavior = {
  // Update frequency
  updateInterval: 30000, // 30 seconds

  // Update strategy
  strategy: 'pull', // 'pull' | 'push' (websocket)

  // Counter animations
  counterAnimation: {
    enabled: true,
    duration: 1000, // ms
    easing: 'ease-out'
  }
}

/**
 * State Update Handlers
 */
const stateHandlers = {
  // Handle status change
  onStatusChange: (newStatus: AgentStatus) => {
    // Update status badge
    // Trigger transition animation
    // Update quick actions availability
  },

  // Handle metrics update
  onMetricsUpdate: (newMetrics: AgentMetrics) => {
    // Animate counter changes
    // Update metric boxes
    // Recalculate derived values
  },

  // Handle hover state
  onHoverChange: (isHovered: boolean) => {
    // Show/hide toolbar
    // Trigger expansion if enabled
    // Update shadow and border
  }
}
```

### Action State Machine

```typescript
/**
 * Agent action state machine
 */
type ActionState =
  | { type: 'idle' }
  | { type: 'pending'; action: string }
  | { type: 'success'; action: string }
  | { type: 'error'; action: string; error: string }

const actionStateMachine = {
  idle: {
    on: {
      START: 'pending',
      STOP: 'pending',
      EDIT: 'pending',
      DUPLICATE: 'pending',
      DELETE: 'pending'
    }
  },
  pending: {
    on: {
      SUCCESS: 'success',
      ERROR: 'error',
      CANCEL: 'idle'
    }
  },
  success: {
    after: { 2000: 'idle' } // Auto-reset after 2s
  },
  error: {
    on: {
      RETRY: 'pending',
      DISMISS: 'idle'
    }
  }
}
```

---

## Visual Specifications

### Component Anatomy

```
┌─────────────────────────────────────────────────────────┐
│  [Hover Toolbar - Positioned Absolutely]                │  -24px from top
│  ┌──────────────────────────────────────────┐           │
│  │ [▶️ Start] [✏️ Edit] [📋 Copy] [🗑️ Delete] │           │
│  └──────────────────────────────────────────┘           │
├─────────────────────────────────────────────────────────┤
│  ┌─ Card Container (rounded-2xl, border, shadow) ──────┐│
│  │                                                      ││
│  │  [Status Badge]                          [Bot Icon] ││  24px padding
│  │  🟢 Running                               🤖        ││
│  │                                                      ││
│  │  Agent Name (text-lg, font-semibold, truncate)      ││  12px gap
│  │  Customer Support Agent                             ││
│  │                                                      ││
│  │  Model: gpt-4o  •  Voice: echo                      ││  8px gap
│  │  (text-sm, text-muted-foreground)                   ││
│  │                                                      ││
│  │  ┌─ Metrics Grid (3 columns, gap-3) ───────────┐   ││  16px gap
│  │  │                                               │   ││
│  │  │  [📞 Calls]  [✓ Success]  [⏱ Duration]      │   ││
│  │  │    42          95%          2:34             │   ││
│  │  │   Today       Success      Avg Call          │   ││
│  │  │                                               │   ││
│  │  └───────────────────────────────────────────────┘   ││
│  │                                                      ││  12px gap
│  │  ⏰ Last call: 5 minutes ago                        ││
│  │  (text-sm, text-muted-foreground)                   ││
│  │                                                      ││  12px gap
│  │  [Sales] [English] [GPT-4o] [Semantic]             ││
│  │  (tag chips: px-2, py-1, rounded-md)               ││
│  │                                                      ││
│  └──────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Measurements & Spacing

```css
/* Container */
.agent-insight-card {
  /* Border & Shadow */
  border-radius: 16px; /* rounded-2xl */
  border-width: 1px;

  /* Dimensions */
  min-height: 320px; /* Sufficient for all content */
  width: 100%; /* Full width in grid */

  /* Padding */
  padding: 24px; /* p-6 */

  /* Shadow */
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1); /* shadow-sm */

  /* Transitions */
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hover State */
.agent-insight-card:hover {
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); /* shadow-lg */
  border-color: hsl(var(--primary) / 0.5);
  transform: translateY(-4px);
}

/* Internal Spacing */
.card-content {
  display: flex;
  flex-direction: column;
  gap: 16px; /* space-y-4 */
}

/* Status Header */
.status-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

/* Identity Section */
.identity-section {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
}

.agent-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px; /* rounded-lg */
  background: hsl(var(--primary) / 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.agent-name {
  font-size: 18px; /* text-lg */
  font-weight: 600; /* font-semibold */
  line-height: 1.5;

  /* Truncation */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

/* Model Info */
.model-info {
  font-size: 14px; /* text-sm */
  color: hsl(var(--muted-foreground));
  display: flex;
  gap: 8px;
  align-items: center;
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px; /* gap-3 */
}

/* Metric Box */
.metric-box {
  padding: 12px; /* p-3 */
  border-radius: 8px; /* rounded-lg */
  text-align: center;
  transition: background-color 200ms;
}

.metric-value {
  font-size: 24px; /* text-2xl */
  font-weight: 700; /* font-bold */
  line-height: 1;
  margin: 4px 0;
}

.metric-label {
  font-size: 12px; /* text-xs */
  color: hsl(var(--muted-foreground));
}

/* Last Call */
.last-call {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px; /* text-sm */
  color: hsl(var(--muted-foreground));
}

/* Tags */
.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-chip {
  padding: 4px 8px; /* px-2 py-1 */
  border-radius: 6px; /* rounded-md */
  font-size: 12px; /* text-xs */
  font-weight: 500; /* font-medium */
  background: hsl(210 100% 96%); /* blue-50 */
  color: hsl(210 100% 40%); /* blue-700 */
}

/* Dark Mode Tags */
.dark .tag-chip {
  background: hsl(210 100% 15% / 0.3); /* blue-900/30 */
  color: hsl(210 100% 70%); /* blue-400 */
}
```

### Hover Toolbar Specifications

```css
/* Toolbar Container */
.hover-toolbar {
  position: absolute;
  top: -12px; /* -top-3 */
  right: 16px; /* right-4 */
  z-index: 10;

  /* Layout */
  display: flex;
  align-items: center;
  gap: 4px; /* gap-1 */

  /* Styling */
  padding: 4px 8px; /* px-2 py-1 */
  border-radius: 8px; /* rounded-lg */
  border: 1px solid hsl(var(--border));
  background: hsl(var(--card));
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); /* shadow-lg */

  /* Animation */
  animation: fadeInSlideDown 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fadeInSlideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Toolbar Button */
.toolbar-button {
  padding: 8px; /* p-2 */
  border-radius: 4px;
  background: transparent;
  color: hsl(var(--muted-foreground));
  transition: all 150ms;

  /* Icon */
  width: 16px;
  height: 16px;
}

.toolbar-button:hover {
  background: hsl(var(--muted));
  color: hsl(var(--foreground));
}

/* Delete button variant */
.toolbar-button.delete:hover {
  background: hsl(0 100% 96%); /* red-50 */
  color: hsl(0 84% 50%); /* red-600 */
}

.dark .toolbar-button.delete:hover {
  background: hsl(0 100% 15% / 0.3); /* red-900/30 */
  color: hsl(0 100% 70%); /* red-400 */
}
```

---

## Interaction States

### 1. Default State

```typescript
const defaultState = {
  visual: {
    border: 'border-gray-200 dark:border-gray-800',
    shadow: 'shadow-sm',
    cursor: 'cursor-pointer',
    transform: 'translate-y-0'
  },
  toolbar: 'hidden',
  statusBadge: 'visible',
  metrics: 'visible'
}
```

### 2. Hover State

```typescript
const hoverState = {
  visual: {
    border: 'border-primary/50',
    shadow: 'shadow-lg',
    transform: 'translate-y-[-4px]',
    transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)'
  },
  toolbar: 'visible', // Slide in from top
  statusBadge: 'visible',
  metrics: 'visible',
  animation: {
    toolbar: 'fadeInSlideDown 200ms',
    card: 'elevate 200ms'
  }
}
```

### 3. Expanded State (Optional)

```typescript
const expandedState = {
  enabled: false, // Toggle via expandOnHover prop
  visual: {
    minHeight: '400px', // Increased from 320px
    padding: '32px', // Increased from 24px
  },
  content: {
    showFullInstructions: true, // Show first 200 chars
    showAdvancedMetrics: true,  // Total calls, active calls
    showConfigSummary: true     // LLM, STT, TTS providers
  },
  animation: {
    duration: '300ms',
    easing: 'cubic-bezier(0.4, 0, 0.6, 1)'
  }
}
```

### 4. Loading State (Action Pending)

```typescript
const loadingState = {
  visual: {
    opacity: '0.7',
    cursor: 'cursor-wait',
    pointerEvents: 'none'
  },
  toolbar: {
    disabled: true,
    showSpinner: true
  },
  statusBadge: {
    showLoadingIndicator: true, // Pulsing animation
    label: 'Processing...'
  }
}
```

### 5. Error State (Action Failed)

```typescript
const errorState = {
  visual: {
    border: 'border-red-500',
    background: 'bg-red-50 dark:bg-red-900/10'
  },
  errorBanner: {
    visible: true,
    position: 'top', // Above card content
    message: 'Failed to start agent',
    action: 'Retry',
    dismissable: true
  },
  toolbar: {
    enabled: true,
    highlightFailedAction: true
  }
}
```

### 6. Disabled State

```typescript
const disabledState = {
  visual: {
    opacity: '0.5',
    cursor: 'cursor-not-allowed',
    pointerEvents: 'none'
  },
  toolbar: 'hidden',
  statusBadge: {
    variant: 'inactive',
    label: 'Unavailable'
  },
  overlay: {
    visible: true,
    message: 'Agent configuration required'
  }
}
```

---

## Quick Actions Specification

### Action Buttons

```typescript
/**
 * Quick action buttons in hover toolbar
 */
interface QuickAction {
  icon: LucideIcon
  label: string
  handler: (agent: Agent) => void | Promise<void>
  variant: 'default' | 'success' | 'danger'
  confirmRequired: boolean
  disabledWhen: (status: AgentStatus) => boolean
}

const quickActions: QuickAction[] = [
  {
    icon: Play,
    label: 'Start',
    handler: onStart,
    variant: 'success',
    confirmRequired: false,
    disabledWhen: (status) => [
      AgentStatus.DEPLOYED,
      AgentStatus.DEPLOYING,
      AgentStatus.UNDEPLOYING
    ].includes(status)
  },
  {
    icon: Square,
    label: 'Stop',
    handler: onStop,
    variant: 'danger',
    confirmRequired: true,
    disabledWhen: (status) => [
      AgentStatus.INACTIVE,
      AgentStatus.CREATED,
      AgentStatus.UNDEPLOYING
    ].includes(status)
  },
  {
    icon: Edit,
    label: 'Edit',
    handler: onEdit,
    variant: 'default',
    confirmRequired: false,
    disabledWhen: () => false
  },
  {
    icon: Copy,
    label: 'Duplicate',
    handler: onDuplicate,
    variant: 'default',
    confirmRequired: false,
    disabledWhen: () => false
  },
  {
    icon: Trash2,
    label: 'Delete',
    handler: onDelete,
    variant: 'danger',
    confirmRequired: true,
    disabledWhen: (status) => status === AgentStatus.DEPLOYING
  }
]
```

### Start/Stop Behavior

```typescript
/**
 * Start agent action
 */
const handleStart = async (agent: Agent) => {
  // Optimistic UI update
  setOptimisticStatus(AgentStatus.DEPLOYING)

  try {
    // Call deploy API
    await deployAgent(agent.id)

    // Update to deployed
    setOptimisticStatus(AgentStatus.DEPLOYED)

    // Show success notification
    toast.success(`Agent "${agent.name}" started successfully`)

  } catch (error) {
    // Revert optimistic update
    setOptimisticStatus(undefined)

    // Show error
    toast.error(`Failed to start agent: ${error.message}`)
  }
}

/**
 * Stop agent action (with confirmation)
 */
const handleStop = async (agent: Agent) => {
  // Confirm action
  const confirmed = await confirm({
    title: 'Stop Agent?',
    description: `This will stop "${agent.name}" and disconnect all active calls.`,
    confirmText: 'Stop Agent',
    cancelText: 'Cancel',
    variant: 'danger'
  })

  if (!confirmed) return

  // Optimistic UI update
  setOptimisticStatus(AgentStatus.UNDEPLOYING)

  try {
    // Call undeploy API
    await undeployAgent(agent.id)

    // Update to inactive
    setOptimisticStatus(AgentStatus.INACTIVE)

    // Show success notification
    toast.success(`Agent "${agent.name}" stopped successfully`)

  } catch (error) {
    // Revert optimistic update
    setOptimisticStatus(undefined)

    // Show error
    toast.error(`Failed to stop agent: ${error.message}`)
  }
}
```

---

## Responsive Behavior

### Breakpoint System

```typescript
/**
 * Responsive breakpoints (Tailwind CSS)
 */
const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
  '2xl': '1536px' // Extra large
}
```

### Mobile Rules (< 640px)

```css
/* Mobile: Single column layout */
@media (max-width: 640px) {
  .agent-insight-card {
    /* Reduce padding */
    padding: 16px; /* p-4 */

    /* Stack content vertically */
    min-height: auto;
  }

  /* Hide hover toolbar on mobile */
  .hover-toolbar {
    display: none;
  }

  /* Show inline actions instead */
  .mobile-actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
  }

  /* Metrics: 2 columns instead of 3 */
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  /* Third metric wraps to second row */
  .metric-box:nth-child(3) {
    grid-column: span 2;
    max-width: 50%;
    margin: 0 auto;
  }

  /* Truncate long names more aggressively */
  .agent-name {
    max-width: 200px;
  }

  /* Tags: Smaller text */
  .tag-chip {
    font-size: 10px;
    padding: 2px 6px;
  }
}
```

### Tablet Rules (640px - 1024px)

```css
@media (min-width: 640px) and (max-width: 1024px) {
  .agent-insight-card {
    /* Standard padding */
    padding: 20px; /* p-5 */
  }

  /* Metrics: Keep 3 columns */
  .metrics-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }

  /* Hover toolbar enabled */
  .hover-toolbar {
    display: flex;
  }

  /* Name truncation */
  .agent-name {
    max-width: 250px;
  }
}
```

### Desktop Rules (>= 1024px)

```css
@media (min-width: 1024px) {
  .agent-insight-card {
    /* Full padding */
    padding: 24px; /* p-6 */
  }

  /* Metrics: 3 columns with larger gaps */
  .metrics-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  /* Full hover effects */
  .hover-toolbar {
    display: flex;
  }

  /* No name truncation until very long */
  .agent-name {
    max-width: 100%;
  }
}
```

### Grid Layout Responsive

```typescript
/**
 * AgentGrid responsive columns
 */
const gridColumns = {
  mobile: 1,    // < 640px: Single column
  tablet: 2,    // 640px - 1024px: 2 columns
  desktop: 3,   // >= 1024px: 3 columns
  wide: 4       // >= 1536px: 4 columns (optional)
}

// Tailwind classes
const gridClasses = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6'
```

---

## Long Agent Name Handling

### Truncation Strategy

```typescript
/**
 * Agent name display rules
 */
const nameDisplayRules = {
  // Maximum characters before truncation
  maxLength: {
    mobile: 30,
    tablet: 40,
    desktop: 60
  },

  // Truncation method
  method: 'ellipsis', // CSS text-overflow

  // Tooltip on hover
  showFullNameOnHover: true,

  // Multi-line fallback (optional)
  allowMultiline: false,
  maxLines: 2
}

/**
 * Implementation
 */
const AgentName = ({ name }: { name: string }) => {
  return (
    <div className="group/name relative">
      <h3 className="text-lg font-semibold text-foreground truncate">
        {name}
      </h3>

      {/* Tooltip for full name */}
      {name.length > 30 && (
        <div className="absolute hidden group-hover/name:block z-20 bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap">
          {name}
          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  )
}
```

### CSS Implementation

```css
/* Agent name with ellipsis */
.agent-name {
  /* Single line truncation */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  /* Maximum width (responsive) */
  max-width: 100%;
}

/* Tooltip for long names */
.agent-name-tooltip {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 8px;

  padding: 8px 12px;
  background: hsl(220 13% 13%);
  color: white;
  font-size: 14px;
  border-radius: 8px;
  white-space: nowrap;

  /* Arrow */
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 16px;
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 4px solid hsl(220 13% 13%);
  }

  /* Animation */
  opacity: 0;
  pointer-events: none;
  transition: opacity 150ms;
}

.agent-name:hover .agent-name-tooltip {
  opacity: 1;
}

/* Multi-line fallback (if enabled) */
.agent-name.multiline {
  white-space: normal;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

---

## Component States

### 1. Skeleton Loading State

```typescript
/**
 * Skeleton variant for loading state
 */
export function AgentInsightCardSkeleton() {
  return (
    <div className="group relative rounded-2xl border border-border bg-card shadow-sm p-6 space-y-4 animate-pulse">
      {/* Status Badge Skeleton */}
      <div className="flex items-start justify-between">
        <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>

      {/* Agent Name Skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>

      {/* Metrics Grid Skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>

      {/* Last Call Skeleton */}
      <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded" />

      {/* Tags Skeleton */}
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-md" />
        ))}
      </div>
    </div>
  )
}
```

**Visual Specifications**:
- Background: `bg-gray-200 dark:bg-gray-700`
- Animation: `animate-pulse` (Tailwind's built-in pulse)
- Border: Same as default card
- Shadow: Same as default card
- Spacing: Matches default card exactly

---

### 2. Error State

```typescript
/**
 * Error variant for failed data loading
 */
export function AgentInsightCardError({
  error,
  onRetry
}: {
  error: Error | string
  onRetry?: () => void
}) {
  const errorMessage = typeof error === 'string' ? error : error.message

  return (
    <div className="group relative rounded-2xl border border-red-500 bg-red-50 dark:bg-red-900/10 shadow-sm p-6">
      {/* Error Icon */}
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>

        {/* Error Message */}
        <div className="text-center space-y-2">
          <h3 className="font-semibold text-foreground">
            Failed to Load Agent
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {errorMessage}
          </p>
        </div>

        {/* Retry Button */}
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            startContent={<RefreshCw className="h-4 w-4" />}
          >
            Retry
          </Button>
        )}
      </div>
    </div>
  )
}
```

**Visual Specifications**:
- Border: `border-red-500`
- Background: `bg-red-50 dark:bg-red-900/10`
- Icon: `AlertCircle` from lucide-react
- Icon Color: `text-red-600 dark:text-red-400`
- Center aligned content
- Retry button with refresh icon

---

### 3. Empty State (No Data)

```typescript
/**
 * Empty variant when no agent data available
 */
export function AgentInsightCardEmpty({
  onCreate
}: {
  onCreate?: () => void
}) {
  return (
    <div className="group relative rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-card shadow-sm p-6">
      {/* Empty Icon */}
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Bot className="h-6 w-6 text-gray-400" />
        </div>

        {/* Empty Message */}
        <div className="text-center space-y-2">
          <h3 className="font-semibold text-foreground">
            No Agent Data
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Agent information is not available or has not been created yet.
          </p>
        </div>

        {/* Create Button */}
        {onCreate && (
          <Button
            color="primary"
            variant="flat"
            size="sm"
            onClick={onCreate}
            startContent={<Plus className="h-4 w-4" />}
          >
            Create Agent
          </Button>
        )}
      </div>
    </div>
  )
}
```

**Visual Specifications**:
- Border: `border-dashed border-gray-300 dark:border-gray-700`
- Background: Same as default card
- Icon: `Bot` from lucide-react
- Icon Color: `text-gray-400` (muted)
- Center aligned content
- Optional create button

---

## Accessibility

### Semantic HTML

```html
<article
  role="article"
  aria-label="Agent card for {agent.name}"
  tabindex="0"
  className="agent-insight-card"
  onClick={handleSelect}
  onKeyDown={handleKeyDown}
>
  <!-- Status Badge -->
  <div role="status" aria-live="polite">
    <span className="sr-only">Agent status:</span>
    <StatusBadge variant={statusVariant} label={statusLabel} />
  </div>

  <!-- Agent Identity -->
  <header>
    <h3 id={`agent-${agent.id}-name`}>
      {agent.name}
    </h3>
    <p id={`agent-${agent.id}-model`} aria-label="Model configuration">
      Model: {agent.llm_model} • Voice: {agent.voice}
    </p>
  </header>

  <!-- Metrics -->
  <section
    aria-labelledby={`agent-${agent.id}-metrics-title`}
    role="region"
  >
    <h4 id={`agent-${agent.id}-metrics-title`} className="sr-only">
      Performance Metrics
    </h4>
    <div className="metrics-grid">
      {/* Each metric with aria-label */}
    </div>
  </section>

  <!-- Quick Actions -->
  <nav
    aria-label="Quick actions for {agent.name}"
    className="hover-toolbar"
  >
    <button
      aria-label="Start agent"
      onClick={handleStart}
      disabled={isStartDisabled}
    >
      <Play aria-hidden="true" />
    </button>
    {/* More actions... */}
  </nav>
</article>
```

### ARIA Attributes

```typescript
/**
 * ARIA labeling for components
 */
const ariaLabels = {
  card: `Agent card for ${agent.name}`,
  status: `Agent status: ${statusLabel}`,
  metrics: 'Performance metrics',
  callsToday: `${metrics.callsToday} calls today`,
  successRate: `${metrics.successRate}% success rate`,
  avgDuration: `Average call duration: ${formatDuration(metrics.avgDuration)}`,
  lastCall: `Last call: ${formatRelativeTime(metrics.lastCallAt)}`,
  actions: `Quick actions for ${agent.name}`,
  startButton: 'Start agent',
  stopButton: 'Stop agent',
  editButton: 'Edit agent',
  duplicateButton: 'Duplicate agent',
  deleteButton: 'Delete agent'
}
```

### Keyboard Navigation

```typescript
/**
 * Keyboard event handlers
 */
const handleKeyDown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'Enter':
    case ' ':
      // Open inspector on Enter or Space
      e.preventDefault()
      onSelect?.(agent)
      break

    case 'Escape':
      // Close any open modals/tooltips
      handleCloseTooltip()
      break

    case 'Tab':
      // Allow natural tab navigation through action buttons
      // No custom handling needed
      break

    case 'ArrowUp':
    case 'ArrowDown':
      // Navigate between cards in grid (optional)
      // Implement if grid keyboard navigation desired
      break
  }
}

/**
 * Focus management
 */
const focusManagement = {
  // Card is focusable
  tabIndex: 0,

  // Focus visible styles
  onFocus: () => {
    setIsFocused(true)
  },

  onBlur: () => {
    setIsFocused(false)
  },

  // Focus indicator
  className: cn(
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-primary',
    'focus:ring-offset-2'
  )
}
```

### Screen Reader Support

```typescript
/**
 * Screen reader announcements
 */
const announcements = {
  // Status change
  onStatusChange: (newStatus: AgentStatus) => {
    announce(`Agent status changed to ${getStatusLabel(newStatus)}`)
  },

  // Metrics update
  onMetricsUpdate: (newMetrics: AgentMetrics) => {
    announce(`Metrics updated: ${newMetrics.callsToday} calls today, ${newMetrics.successRate}% success rate`)
  },

  // Action completion
  onActionComplete: (action: string) => {
    announce(`${action} completed successfully`)
  },

  // Action failure
  onActionError: (action: string, error: string) => {
    announce(`${action} failed: ${error}`, 'assertive')
  }
}

/**
 * Live region for announcements
 */
const LiveRegion = () => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  )
}
```

### Color Contrast

```typescript
/**
 * WCAG 2.1 AA Compliance
 * - Normal text: 4.5:1 minimum
 * - Large text (18px+): 3:1 minimum
 */
const colorContrast = {
  // Passes AA for normal text
  foreground: 'hsl(220 13% 13%)', // #1f2937
  background: 'hsl(0 0% 100%)',   // #ffffff
  ratio: 15.3, // ✅ Passes

  // Passes AA for large text
  mutedForeground: 'hsl(220 9% 46%)', // #6b7280
  cardBackground: 'hsl(0 0% 100%)',   // #ffffff
  ratio: 4.6, // ✅ Passes

  // Dark mode passes AA
  darkForeground: 'hsl(210 40% 98%)', // #f9fafb
  darkBackground: 'hsl(220 13% 13%)', // #1f2937
  ratio: 16.1, // ✅ Passes

  // Status badge colors (all pass AA)
  statusColors: {
    running: { bg: 'green-50', text: 'green-700', ratio: 7.2 },
    deploying: { bg: 'yellow-50', text: 'yellow-700', ratio: 5.1 },
    error: { bg: 'red-50', text: 'red-700', ratio: 6.8 },
    inactive: { bg: 'gray-50', text: 'gray-700', ratio: 5.9 }
  }
}
```

---

## Implementation Guide

### Installation

```bash
# Dependencies (already in project)
npm install lucide-react      # Icons
npm install @heroui/react     # UI components
npm install tailwindcss       # Styling
npm install framer-motion     # Animations (optional)
```

### Basic Implementation

```typescript
import { AgentInsightCard } from '@/components/agents'
import { useAgents } from '@/lib/hooks/use-agents'
import { useCallLogs } from '@/lib/hooks/use-call-logs'

function AgentsDashboard() {
  const { agents, isLoading } = useAgents()
  const { callLogs } = useCallLogs()

  // Calculate metrics for each agent
  const metricsMap = agents.reduce((acc, agent) => {
    const agentCalls = callLogs.filter(call => call.agent_id === agent.id)
    acc[agent.id] = calculateMetrics(agent.id, agentCalls)
    return acc
  }, {})

  // Generate tags for each agent
  const tagsMap = agents.reduce((acc, agent) => {
    acc[agent.id] = generateTags(agent)
    return acc
  }, {})

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {agents.map(agent => (
        <AgentInsightCard
          key={agent.id}
          agent={agent}
          metrics={metricsMap[agent.id]}
          tags={tagsMap[agent.id]}
          onSelect={(agent) => router.push(`/agents/${agent.id}`)}
          onStart={handleStartAgent}
          onStop={handleStopAgent}
          onEdit={(agent) => router.push(`/agents/${agent.id}/edit`)}
          onDuplicate={handleDuplicateAgent}
          onDelete={handleDeleteAgent}
        />
      ))}
    </div>
  )
}
```

### Advanced Implementation with States

```typescript
import { AgentInsightCard, AgentInsightCardSkeleton, AgentInsightCardError } from '@/components/agents'

function AgentsDashboard() {
  const { agents, isLoading, error, refetch } = useAgents()
  const { callLogs } = useCallLogs()

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <AgentInsightCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AgentInsightCardError error={error} onRetry={refetch} />
      </div>
    )
  }

  // Empty state
  if (agents.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AgentInsightCardEmpty onCreate={() => router.push('/agents/new')} />
      </div>
    )
  }

  // Success state
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {agents.map(agent => (
        <AgentInsightCard
          key={agent.id}
          agent={agent}
          metrics={metricsMap[agent.id]}
          tags={tagsMap[agent.id]}
          {...handlers}
        />
      ))}
    </div>
  )
}
```

### Performance Optimization

```typescript
import { memo, useMemo } from 'react'

/**
 * Memoized card component
 */
export const AgentInsightCard = memo(function AgentInsightCard(props: AgentInsightCardProps) {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison for shallow props
  return (
    prevProps.agent.id === nextProps.agent.id &&
    prevProps.agent.status === nextProps.agent.status &&
    prevProps.metrics?.callsToday === nextProps.metrics?.callsToday &&
    prevProps.metrics?.successRate === nextProps.metrics?.successRate
  )
})

/**
 * Memoized metrics calculation
 */
const metricsMap = useMemo(() => {
  return agents.reduce((acc, agent) => {
    acc[agent.id] = calculateMetrics(agent.id, callLogs)
    return acc
  }, {})
}, [agents, callLogs])

/**
 * Virtualized list for many agents
 */
import { useVirtualizer } from '@tanstack/react-virtual'

const AgentVirtualList = ({ agents }) => {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: agents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 320, // Card height
    overscan: 3
  })

  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            <AgentInsightCard agent={agents[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## Testing

### Unit Tests

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AgentInsightCard } from './AgentInsightCard'

describe('AgentInsightCard', () => {
  const mockAgent: Agent = {
    id: 'test-agent-1',
    name: 'Test Agent',
    status: AgentStatus.DEPLOYED,
    // ... other required fields
  }

  const mockMetrics: AgentMetrics = {
    callsToday: 42,
    successRate: 95,
    avgDuration: 154,
    lastCallAt: '2025-10-31T14:23:00Z'
  }

  it('renders agent name', () => {
    render(<AgentInsightCard agent={mockAgent} />)
    expect(screen.getByText('Test Agent')).toBeInTheDocument()
  })

  it('displays metrics when provided', () => {
    render(<AgentInsightCard agent={mockAgent} metrics={mockMetrics} />)
    expect(screen.getByText('42')).toBeInTheDocument() // Calls today
    expect(screen.getByText('95%')).toBeInTheDocument() // Success rate
  })

  it('shows hover toolbar on mouse enter', async () => {
    render(<AgentInsightCard agent={mockAgent} onEdit={jest.fn()} />)

    const card = screen.getByRole('article')
    fireEvent.mouseEnter(card)

    await waitFor(() => {
      expect(screen.getByLabelText('Edit agent')).toBeVisible()
    })
  })

  it('calls onSelect when clicked', () => {
    const onSelect = jest.fn()
    render(<AgentInsightCard agent={mockAgent} onSelect={onSelect} />)

    const card = screen.getByRole('article')
    fireEvent.click(card)

    expect(onSelect).toHaveBeenCalledWith(mockAgent)
  })

  it('renders skeleton when loading', () => {
    render(<AgentInsightCardSkeleton />)
    expect(screen.getByRole('article')).toHaveClass('animate-pulse')
  })
})
```

### Accessibility Tests

```typescript
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

describe('AgentInsightCard Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<AgentInsightCard agent={mockAgent} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('supports keyboard navigation', () => {
    const onSelect = jest.fn()
    render(<AgentInsightCard agent={mockAgent} onSelect={onSelect} />)

    const card = screen.getByRole('article')
    card.focus()
    fireEvent.keyDown(card, { key: 'Enter' })

    expect(onSelect).toHaveBeenCalled()
  })
})
```

---

## Version History

- **v2.0** (2025-10-31): Complete Figma-level specification with Start/Stop actions, expanded states, mobile responsive rules
- **v1.0** (2025-10-30): Initial AgentInsightCard implementation with metrics and tags

---

## Related Documentation

- [AgentInsightCard Implementation](./AGENT_INSIGHT_CARD_IMPLEMENTATION.md)
- [UI Refactor Rules](../docs/SUPERCLAUDE/CONVENTIONS.md)
- [Component Architecture](../docs/ARCHITECTURE.md)
- [Design System](./DESIGN_SYSTEM.md)

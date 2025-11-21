/**
 * CallTranscriptPanel - Usage Examples
 *
 * This file demonstrates various integration patterns for the CallTranscriptPanel component.
 * Copy and adapt these examples for your use cases.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@heroui/button'
import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/modal'
import { Card, CardBody } from '@heroui/card'
import { CallTranscriptPanel, CallTranscriptPanelSkeleton } from './CallTranscriptPanel'
import { useCallTranscript } from '@/hooks/useCallTranscript'
import { useSession } from 'next-auth/react'

// ============================================================================
// Example 1: Basic Sidebar Panel
// ============================================================================

export function Example1_SidebarPanel({ callLogId }: { callLogId: string }) {
  const { data: session } = useSession()
  const { transcript, loading, error } = useCallTranscript(callLogId, {
    userId: session?.user?.id,
    autoFetch: true
  })

  return (
    <div className="flex h-screen">
      {/* Main content area */}
      <main className="flex-1 overflow-y-auto p-6 bg-background">
        <h1 className="text-2xl font-bold mb-4">Call Details</h1>
        <div className="space-y-6">
          <Card>
            <CardBody>
              <p>Call recording, outcome, and other details go here...</p>
            </CardBody>
          </Card>
        </div>
      </main>

      {/* Sidebar with transcript panel */}
      <aside className="w-96 border-l border-border bg-card">
        <CallTranscriptPanel
          transcript={transcript}
          loading={loading}
          error={error}
          height="100vh"
        />
      </aside>
    </div>
  )
}

// ============================================================================
// Example 2: Modal Dialog with Transcript
// ============================================================================

export function Example2_ModalPanel({ callLogId }: { callLogId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const { data: session } = useSession()

  // Only fetch when modal is open (performance optimization)
  const { transcript, loading, error } = useCallTranscript(callLogId, {
    userId: session?.user?.id,
    autoFetch: isOpen
  })

  return (
    <>
      {/* Trigger button */}
      <Button
        color="primary"
        onClick={() => setIsOpen(true)}
      >
        View Transcript
      </Button>

      {/* Modal with transcript panel */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader className="border-b">
            <h2 className="text-lg font-semibold">Call Transcript</h2>
          </ModalHeader>
          <ModalBody className="p-0">
            <CallTranscriptPanel
              transcript={transcript}
              loading={loading}
              error={error}
              showClose
              onClose={() => setIsOpen(false)}
              height="600px"
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}

// ============================================================================
// Example 3: Slide-Out Drawer Panel
// ============================================================================

export function Example3_SlideOutPanel({ callLogId }: { callLogId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const { data: session } = useSession()

  const { transcript, loading, error } = useCallTranscript(callLogId, {
    userId: session?.user?.id,
    autoFetch: true
  })

  return (
    <>
      {/* Trigger button */}
      <Button
        color="primary"
        variant="flat"
        onClick={() => setIsOpen(true)}
      >
        Show Transcript Panel
      </Button>

      {/* Slide-out panel from right */}
      <div
        className={`
          fixed top-0 right-0 h-full w-96 bg-background border-l border-border shadow-2xl
          transition-transform duration-300 ease-in-out z-50
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <CallTranscriptPanel
          transcript={transcript}
          loading={loading}
          error={error}
          showClose
          onClose={() => setIsOpen(false)}
          height="100vh"
        />
      </div>

      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

// ============================================================================
// Example 4: Dashboard Widget
// ============================================================================

export function Example4_DashboardWidget({ callLogId }: { callLogId: string }) {
  const { data: session } = useSession()
  const { transcript, loading, error } = useCallTranscript(callLogId, {
    userId: session?.user?.id,
    autoFetch: true,
    // Auto-refresh if still processing
    refreshInterval: transcript?.status === 'processing' ? 5000 : 0
  })

  return (
    <div className="col-span-1 md:col-span-2 lg:col-span-1">
      <CallTranscriptPanel
        transcript={transcript}
        loading={loading}
        error={error}
        height="400px"
        className="shadow-md"
      />
    </div>
  )
}

// ============================================================================
// Example 5: Split View Layout (Call Details + Transcript)
// ============================================================================

export function Example5_SplitView({ callLogId }: { callLogId: string }) {
  const { data: session } = useSession()
  const { transcript, loading, error } = useCallTranscript(callLogId, {
    userId: session?.user?.id,
    autoFetch: true
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-screen">
      {/* Left side: Call details */}
      <div className="overflow-y-auto p-6 space-y-6 bg-background">
        <h1 className="text-2xl font-bold">Call Details</h1>

        {/* Call recording */}
        <Card>
          <CardBody>
            <p className="text-sm text-muted-foreground">
              Call recording player would go here
            </p>
          </CardBody>
        </Card>

        {/* Call outcome */}
        <Card>
          <CardBody>
            <p className="text-sm text-muted-foreground">
              Call outcome summary would go here
            </p>
          </CardBody>
        </Card>

        {/* Analytics */}
        <Card>
          <CardBody>
            <p className="text-sm text-muted-foreground">
              Call analytics would go here
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Right side: Transcript panel */}
      <div className="border-l border-border bg-card">
        <CallTranscriptPanel
          transcript={transcript}
          loading={loading}
          error={error}
          height="100vh"
        />
      </div>
    </div>
  )
}

// ============================================================================
// Example 6: Collapsible Sidebar Panel
// ============================================================================

export function Example6_CollapsibleSidebar({ callLogId }: { callLogId: string }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { data: session } = useSession()

  const { transcript, loading, error } = useCallTranscript(callLogId, {
    userId: session?.user?.id,
    autoFetch: true
  })

  return (
    <div className="flex h-screen">
      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">
        <Button
          onClick={() => setIsCollapsed(!isCollapsed)}
          variant="flat"
          className="mb-4"
        >
          {isCollapsed ? 'Show' : 'Hide'} Transcript
        </Button>

        <h1 className="text-2xl font-bold mb-4">Call Details</h1>
        <Card>
          <CardBody>
            <p>Call content here...</p>
          </CardBody>
        </Card>
      </main>

      {/* Collapsible sidebar */}
      <aside
        className={`
          border-l border-border bg-card transition-all duration-300
          ${isCollapsed ? 'w-0 opacity-0' : 'w-96 opacity-100'}
        `}
      >
        {!isCollapsed && (
          <CallTranscriptPanel
            transcript={transcript}
            loading={loading}
            error={error}
            height="100vh"
          />
        )}
      </aside>
    </div>
  )
}

// ============================================================================
// Example 7: Tab-Based Interface with Transcript Panel
// ============================================================================

export function Example7_TabbedInterface({ callLogId }: { callLogId: string }) {
  const [activeTab, setActiveTab] = useState<'details' | 'transcript' | 'analytics'>('details')
  const { data: session } = useSession()

  const { transcript, loading, error } = useCallTranscript(callLogId, {
    userId: session?.user?.id,
    autoFetch: activeTab === 'transcript'
  })

  return (
    <div className="h-screen flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-border bg-card">
        <button
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'details'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('details')}
        >
          Details
        </button>
        <button
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'transcript'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('transcript')}
        >
          Transcript
        </button>
        <button
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'analytics'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'details' && (
          <div className="h-full overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">Call Details</h2>
            <Card>
              <CardBody>
                <p>Call details content...</p>
              </CardBody>
            </Card>
          </div>
        )}

        {activeTab === 'transcript' && (
          <CallTranscriptPanel
            transcript={transcript}
            loading={loading}
            error={error}
            height="100%"
          />
        )}

        {activeTab === 'analytics' && (
          <div className="h-full overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">Analytics</h2>
            <Card>
              <CardBody>
                <p>Analytics content...</p>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Example 8: Responsive Panel (Mobile/Desktop)
// ============================================================================

export function Example8_ResponsivePanel({ callLogId }: { callLogId: string }) {
  const [showPanel, setShowPanel] = useState(false)
  const { data: session } = useSession()

  const { transcript, loading, error } = useCallTranscript(callLogId, {
    userId: session?.user?.id,
    autoFetch: true
  })

  return (
    <>
      {/* Desktop: Split view */}
      <div className="hidden lg:flex h-screen">
        <main className="flex-1 overflow-y-auto p-6">
          <h1 className="text-2xl font-bold mb-4">Call Details</h1>
          <Card>
            <CardBody>
              <p>Call content...</p>
            </CardBody>
          </Card>
        </main>

        <aside className="w-96 border-l border-border">
          <CallTranscriptPanel
            transcript={transcript}
            loading={loading}
            error={error}
            height="100vh"
          />
        </aside>
      </div>

      {/* Mobile: Button + Modal */}
      <div className="lg:hidden">
        <div className="p-4">
          <Button
            color="primary"
            className="w-full mb-4"
            onClick={() => setShowPanel(true)}
          >
            View Transcript
          </Button>

          <h1 className="text-2xl font-bold mb-4">Call Details</h1>
          <Card>
            <CardBody>
              <p>Call content...</p>
            </CardBody>
          </Card>
        </div>

        {/* Full-screen modal on mobile */}
        {showPanel && (
          <div className="fixed inset-0 z-50 bg-background">
            <CallTranscriptPanel
              transcript={transcript}
              loading={loading}
              error={error}
              showClose
              onClose={() => setShowPanel(false)}
              height="100vh"
            />
          </div>
        )}
      </div>
    </>
  )
}

// ============================================================================
// Example 9: Multi-Call Comparison Panel
// ============================================================================

export function Example9_MultiCallComparison({
  callLogIds
}: {
  callLogIds: [string, string]
}) {
  const { data: session } = useSession()

  const call1 = useCallTranscript(callLogIds[0], {
    userId: session?.user?.id,
    autoFetch: true
  })

  const call2 = useCallTranscript(callLogIds[1], {
    userId: session?.user?.id,
    autoFetch: true
  })

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-screen p-4">
      {/* Call 1 transcript */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted px-4 py-2 border-b">
          <h3 className="text-sm font-semibold">Call 1 Transcript</h3>
        </div>
        <CallTranscriptPanel
          transcript={call1.transcript}
          loading={call1.loading}
          error={call1.error}
          height="calc(100vh - 100px)"
        />
      </div>

      {/* Call 2 transcript */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-muted px-4 py-2 border-b">
          <h3 className="text-sm font-semibold">Call 2 Transcript</h3>
        </div>
        <CallTranscriptPanel
          transcript={call2.transcript}
          loading={call2.loading}
          error={call2.error}
          height="calc(100vh - 100px)"
        />
      </div>
    </div>
  )
}

// ============================================================================
// Example 10: Lazy-Loaded Panel (Performance Optimization)
// ============================================================================

export function Example10_LazyLoadedPanel({ callLogId }: { callLogId: string }) {
  const [shouldLoad, setShouldLoad] = useState(false)
  const { data: session } = useSession()

  // Only fetch when user explicitly requests
  const { transcript, loading, error } = useCallTranscript(callLogId, {
    userId: session?.user?.id,
    autoFetch: shouldLoad
  })

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {!shouldLoad ? (
        <div className="p-6 text-center">
          <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground mb-4">
            Transcript not loaded
          </p>
          <Button
            color="primary"
            onClick={() => setShouldLoad(true)}
          >
            Load Transcript
          </Button>
        </div>
      ) : (
        <CallTranscriptPanel
          transcript={transcript}
          loading={loading}
          error={error}
          height="500px"
        />
      )}
    </div>
  )
}

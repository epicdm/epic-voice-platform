## Requirements Continuation

### Functional Requirements - UX Components

- **FR-UX-001**: All pages MUST display skeleton loaders while fetching data from backend APIs
- **FR-UX-002**: All pages MUST have error boundaries that catch React crashes and display fallback UI with "Something went wrong" message
- **FR-UX-003**: All user actions (create, update, delete) MUST show toast notifications using Sonner library indicating success or failure
- **FR-UX-004**: All list pages (agents, calls, phone numbers) MUST show empty state components when no data exists, with friendly message and call-to-action button
- **FR-UX-005**: All forms MUST validate input using Zod schemas and display inline error messages below each invalid field
- **FR-UX-006**: All failed API calls MUST display error messages with "Retry" button to reattempt the operation
- **FR-UX-007**: All destructive actions (delete agent, delete phone number, delete user) MUST require confirmation dialog before proceeding
- **FR-UX-008**: Agent builder wizard MUST show progress indicator displaying current step (e.g., "Step 2 of 3")
- **FR-UX-009**: All buttons performing async operations MUST show loading spinner and be disabled while operation is in progress
- **FR-UX-010**: All text input fields with character limits MUST display character counter (e.g., "450/500 characters")

### Functional Requirements - Frontend-Backend Integration

- **FR-API-001**: Agent builder wizard Step 1 (Basic Info) MUST collect name and description and store in component state
- **FR-API-002**: Agent builder wizard Step 2 (Instructions & Voice) MUST collect instructions, LLM model, voice, and temperature and store in state
- **FR-API-003**: Agent builder wizard Step 3 (Advanced Settings) MUST collect VAD, turn detection, noise cancellation settings and submit complete config to POST /api/user/agents on final submit
- **FR-API-004**: Agent builder MUST show success toast and redirect to /dashboard/agents on successful creation
- **FR-API-005**: Agent builder MUST handle API errors by displaying error message with retry option
- **FR-API-006**: Phone provisioning modal MUST call POST /api/user/phone-numbers/provision when user submits form
- **FR-API-007**: Phone provisioning modal MUST show loading state during Magnus Billing API call (which can take 3-10 seconds)
- **FR-API-008**: Phone provisioning modal MUST display provisioned phone number and offer assignment options on success
- **FR-API-009**: Phone provisioning MUST handle errors (Magnus unavailable, no numbers available) with clear error messages
- **FR-API-010**: Dashboard page MUST fetch statistics from GET /api/user/stats and display total calls, total agents, total cost
- **FR-API-011**: Agents list page MUST fetch agents from GET /api/user/agents and display in table with status indicators
- **FR-API-012**: Call history page MUST fetch calls from GET /api/user/call-logs and support filtering by date range and agent
- **FR-API-013**: Phone numbers page MUST fetch numbers from GET /api/user/phone-numbers and show assignment status
- **FR-API-014**: Analytics page MUST fetch call statistics from GET /api/user/stats/calls and cost breakdown from GET /api/user/stats/cost
- **FR-API-015**: Settings page MUST load current user profile from GET /api/user/profile on mount
- **FR-API-016**: Settings page MUST submit profile updates to PUT /api/user/profile and show success/error feedback

### Key Entities

- **Loading State**: Component state indicating data is being fetched; displays skeleton loaders or spinners
- **Error State**: Component state indicating operation failed; displays error message and optional retry button
- **Empty State**: Component state indicating no data exists; displays helpful message with call-to-action
- **Toast Notification**: Temporary message (3-5 seconds) showing success or error feedback after user actions
- **Form Validation State**: Per-field validation errors triggered on blur or submit; cleared when input becomes valid
- **Confirmation Dialog**: Modal dialog requiring user to confirm destructive actions before proceeding

## Success Criteria

### Measurable Outcomes

- **SC-001**: Zero hardcoded demo data remains in any frontend page; all data fetched from backend APIs
- **SC-002**: All 21 pages display loading states during data fetching; measured by visual inspection
- **SC-003**: All user actions show immediate feedback (toast notification or loading state) within 100ms
- **SC-004**: Users can complete agent creation wizard in under 3 minutes without confusion
- **SC-005**: Form validation prevents 100% of invalid submissions; invalid forms cannot be submitted
- **SC-006**: All async operations show loading state; buttons are disabled during operations to prevent double-clicks
- **SC-007**: Lighthouse accessibility score reaches minimum 90 on all pages
- **SC-008**: Zero console errors appear during normal user flows (create agent, provision phone, view dashboard)
- **SC-009**: Error recovery with retry succeeds for 90% of transient errors (network timeouts, temporary API failures)
- **SC-010**: New users with zero data see helpful empty states with clear next steps on all list pages

## Assumptions

1. **Existing APIs are functional**: All backend APIs mentioned are already implemented and functional
2. **Sonner library is installed**: Toast notification library is available
3. **Zod is installed**: Form validation library is available
4. **React Hook Form is available**: Form handling library is installed
5. **Backend returns consistent error formats**: APIs return errors in a consistent JSON format
6. **Mobile optimization is Phase 2**: Basic mobile responsiveness tested, but full optimization deferred
7. **Real-time updates are Phase 2**: Changes in one browser tab will not auto-update in others
8. **Auto-save is Phase 2**: Form state is not persisted if user navigates away
9. **Internationalization is Phase 2**: All messages will be in English
10. **Accessibility compliance**: Target WCAG 2.1 Level AA compliance

## Out of Scope

- Advanced mobile optimization
- Real-time updates via WebSocket
- Auto-save functionality
- Offline mode
- Advanced analytics tracking
- A/B testing
- Internationalization
- Advanced accessibility beyond WCAG 2.1 AA
- Performance optimization beyond default Next.js
- Advanced error tracking (Sentry - Phase 3)

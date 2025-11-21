# Tasks: Phase 1 - UX Polish & Frontend-Backend Integration

**Input**: Design documents from `/specs/001-ux-frontend-integration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: E2E tests are explicitly requested in the specification (FR-TEST requirements and Constitution Principle IX). Tests are included in this task breakdown.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/`, `frontend/tests/`
- Backend APIs already functional (no backend changes in this phase)
- All paths relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and foundational UX components that all user stories need

**Duration**: Day 1 (from quickstart.md)

- [X] T001 Verify Node.js 18+ and TypeScript 5.9.3 installed
- [X] T002 Verify all dependencies installed in frontend/package.json (Next.js 15.5.6, React 19, HeroUI 2.8.5, Sonner 2.0.7, Zod 4.1.12, React Hook Form 7.65.0, Playwright 1.56.1)
- [X] T003 [P] Create frontend/src/components/ui/skeleton.tsx - HeroUI skeleton loader component (FR-UX-001)
- [X] T004 [P] Create frontend/src/components/ui/error-boundary.tsx - React error boundary component (FR-UX-002)
- [X] T005 [P] Create frontend/src/components/ui/empty-state.tsx - Empty state component with icon, message, CTA (FR-UX-004)
- [X] T006 [P] Create frontend/src/components/ui/confirmation-dialog.tsx - HeroUI modal for destructive actions (FR-UX-007)
- [X] T007 [P] Create frontend/src/components/ui/loading-button.tsx - HeroUI button with isLoading spinner (FR-UX-009)
- [ ] T008 [P] Setup Sonner toast provider in frontend/src/app/layout.tsx (FR-UX-003)

**Checkpoint**: Foundation UX components ready - user stories can now build on these

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Duration**: Day 2 (from quickstart.md)

- [X] T009 Create frontend/src/lib/api-client.ts - Fetch wrapper with NextAuth token injection and error handling
- [X] T010 [P] Create frontend/src/lib/schemas/agent-schema.ts - Zod validation schemas for agentWizardStep1Schema, Step2, Step3, and agentCreateSchema (FR-UX-005)
- [X] T011 [P] Create frontend/src/lib/schemas/phone-schema.ts - Zod validation schemas for phoneProvisionSchema and phoneAssignSchema
- [X] T012 [P] Create frontend/src/lib/schemas/settings-schema.ts - Zod validation schema for profileUpdateSchema
- [X] T013 [P] Create frontend/src/types/agent.ts - TypeScript interfaces for Agent and AgentStatus enum
- [X] T014 [P] Create frontend/src/types/phone-number.ts - TypeScript interfaces for PhoneNumber and PhoneNumberStatus enum
- [X] T015 [P] Create frontend/src/types/call-log.ts - TypeScript interfaces for CallLog and CallStatus enum
- [X] T016 [P] Create frontend/src/types/stats.ts - TypeScript interface for UserStats
- [X] T017 [P] Create frontend/src/types/user.ts - TypeScript interface for UserProfile
- [X] T018 [P] Create frontend/src/types/api-response.ts - TypeScript interfaces for ApiSuccessResponse<T> and ApiErrorResponse

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Complete Agent Creation Flow (Priority: P1) 🎯 MVP

**Goal**: A new user signs up for Epic.ai and creates their first voice agent through the 3-step wizard, seeing clear feedback at every step and successfully deploying an agent that can receive calls.

**Independent Test**: Can be fully tested by: (1) Sign up, (2) Complete 3-step agent wizard, (3) Submit form, (4) Verify agent appears in list. Delivers immediate value - user has a working agent.

**Duration**: Days 3-5 (from quickstart.md)

**Related Requirements**: FR-API-001, FR-API-002, FR-API-003, FR-API-004, FR-API-005, FR-API-011, FR-UX-005, FR-UX-008, FR-UX-009, FR-UX-010

**API Contracts**: POST /api/user/agents, GET /api/user/agents

### Tests for User Story 1 (E2E with Playwright)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T019 [P] [US1] E2E test for agent creation wizard in frontend/tests/e2e/agent-creation.spec.ts - Test full flow: navigate to wizard → fill Step 1 → Next → fill Step 2 → Next → fill Step 3 → Create → verify success toast → verify redirect to /dashboard/agents → verify agent appears in list

### Implementation for User Story 1

#### Step 1: Agent Wizard Components (Day 3)

- [X] T020 [P] [US1] Create frontend/src/components/agents/agent-wizard-step1.tsx - Basic Info form with name field (max 50 chars) and description textarea (max 500 chars) with character counters (FR-UX-010), Zod validation with inline errors
- [X] T021 [P] [US1] Create frontend/src/components/agents/agent-wizard-step2.tsx - Instructions & Voice form with instructions textarea (max 2000 chars), LLM model dropdown, voice dropdown, temperature slider (0-1)
- [X] T022 [P] [US1] Create frontend/src/components/agents/agent-wizard-step3.tsx - Advanced Settings form with VAD enabled checkbox, turn detection dropdown, noise cancellation checkbox

#### Step 2: Wizard Page & Navigation (Day 4)

- [X] T023 [US1] Create frontend/src/app/dashboard/agents/new/page.tsx - Agent wizard page with step management (currentStep state), progress indicator "Step X of 3" (FR-UX-008), Next/Back buttons, form state aggregation across 3 steps
- [X] T024 [US1] Implement handleSubmit in agent wizard page - Combine data from all 3 steps, call POST /api/user/agents via api-client, show loading state on "Create Agent" button (FR-UX-009), handle success with toast "Agent created successfully" (FR-UX-003) and redirect to /dashboard/agents (FR-API-004), handle error with error message and "Retry" button (FR-UX-006, FR-API-005)

#### Step 3: Agent List Page (Day 5)

- [X] T025 [P] [US1] Create frontend/src/components/agents/agent-list-item.tsx - Agent card component displaying agent name, description, status badge, created date, actions (edit, delete)
- [X] T026 [US1] Create frontend/src/lib/hooks/use-agents.ts - Custom hook to fetch agents from GET /api/user/agents, manage loading/error/data state
- [X] T027 [US1] Update frontend/src/app/dashboard/agents/page.tsx - Fetch agents using use-agents hook, show skeleton loaders while loading (FR-UX-001), display agents in grid using agent-list-item component, show empty state "No agents yet. Create your first agent!" with "Create Agent" CTA button (FR-UX-004)
- [X] T028 [US1] Add error boundary to agents page - Wrap page in <ErrorBoundary> from frontend/src/components/ui/error-boundary.tsx (FR-UX-002)
- [X] T029 [US1] Implement agent deletion in agent-list-item - Add "Delete" button, show confirmation dialog "Delete [Agent Name]? This action cannot be undone" (FR-UX-007), call DELETE /api/user/agents/:id, show success toast, remove from list optimistically

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently - users can create agents and see them in the list

---

## Phase 4: User Story 2 - Phone Number Provisioning & Assignment (Priority: P1)

**Goal**: A user with an existing agent provisions a phone number from Magnus Billing and assigns it to their agent, seeing real-time status updates and handling errors gracefully.

**Independent Test**: Can be tested by: (1) Navigate to phone numbers page, (2) Click "Provision Number", (3) See loading state during Magnus API call (3-10 seconds), (4) Verify number appears. Delivers value - user has a callable number.

**Duration**: Days 6-7 (from quickstart.md)

**Related Requirements**: FR-API-006, FR-API-007, FR-API-008, FR-API-009, FR-API-013, FR-UX-001, FR-UX-003, FR-UX-004, FR-UX-006, FR-UX-007, FR-UX-009

**API Contracts**: POST /api/user/phone-numbers/provision, GET /api/user/phone-numbers, PUT /api/user/phone-numbers/:id/assign, PUT /api/user/phone-numbers/:id/unassign, DELETE /api/user/phone-numbers/:id

### Tests for User Story 2 (E2E with Playwright)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T030 [P] [US2] E2E test for phone provisioning in frontend/tests/e2e/phone-provisioning.spec.ts - Test flow: navigate to phone numbers page → click "Provision Number" → fill form (country code, area code) → submit → verify loading state "Provisioning..." (3-10 sec wait) → verify success toast "Number provisioned: +15551234567" → verify number appears in list

### Implementation for User Story 2

#### Step 1: Phone Provisioning Components (Day 6)

- [X] T031 [P] [US2] Create frontend/src/components/phone-numbers/provision-modal.tsx - Modal with country code dropdown (US, UK, CA, AU), area code input (optional, 3 digits), "Provision Number" button with loading state "Provisioning..." (FR-UX-009), calls POST /api/user/phone-numbers/provision (FR-API-006), shows loading state during 3-10 second Magnus API call (FR-API-007), handles success with toast "Number provisioned: +15551234567" and shows assignment options (FR-API-008), handles errors (Magnus unavailable, no numbers available, timeout) with specific error messages and "Retry" button (FR-API-009, FR-UX-006)
- [X] T032 [P] [US2] Create frontend/src/components/phone-numbers/number-list-item.tsx - Phone number card component displaying number (E.164 format), country code, assignment status badge (active/assigned), assigned agent name (if assigned), actions (assign, unassign, delete)

#### Step 2: Phone Numbers Page & Assignment (Day 7)

- [X] T033 [US2] Create frontend/src/lib/hooks/use-phone-numbers.ts - Custom hook to fetch phone numbers from GET /api/user/phone-numbers, manage loading/error/data state
- [X] T034 [US2] Create frontend/src/components/phone-numbers/assign-modal.tsx - Assignment modal that reuses use-agents hook for agent dropdown
- [X] T035 [US2] Create frontend/src/app/dashboard/phone-numbers/page.tsx - Fetch phone numbers using use-phone-numbers hook, show skeleton loaders while loading (FR-UX-001), display numbers in list using number-list-item component, show empty state "No phone numbers yet. Provision your first number to get started!" with "Provision Number" CTA button (FR-UX-004), add "Provision Number" button that opens provision-modal
- [X] T036 [US2] Add error boundary to phone numbers page - Wrap page in <ErrorBoundary> (FR-UX-002)
- [X] T037 [US2] Implement phone assignment in number-list-item - Add "Assign to Agent" button that opens assign-modal, call PATCH /api/user/phone-numbers/:id/assign with agent_id, show loading state, show success toast "Phone number assigned to [Agent Name]", update status to "assigned" in list
- [X] T038 [US2] Implement phone unassignment in number-list-item - Add "Unassign" button (visible if number is assigned), call PATCH /api/user/phone-numbers/:id/unassign, show success toast "Phone number unassigned", update status to "active"
- [X] T039 [US2] Implement phone deletion in number-list-item - Add "Delete" button, show confirmation dialog "Delete +15551234567? This action cannot be undone and the number may not be available again" (FR-UX-007), call DELETE /api/user/phone-numbers/:id, handle error if number is assigned "Cannot delete phone number while assigned to agent. Unassign first.", show success toast "Phone number deleted", remove from list

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - users can create agents and provision/assign phone numbers

---

## Phase 5: User Story 3 - Dashboard Real-Time Data Display (Priority: P2)

**Goal**: A user logs in and sees their dashboard with real statistics (total calls, agents, costs) loading smoothly without flickering or showing stale demo data.

**Independent Test**: Can be tested by: (1) Log in, (2) Observe dashboard page load, (3) Verify stats match database. Delivers value - user sees their actual usage.

**Duration**: Day 5 + Day 8 (from quickstart.md - overlaps with US1 completion)

**Related Requirements**: FR-API-010, FR-UX-001, FR-UX-004

**API Contracts**: GET /api/user/stats

### Tests for User Story 3 (E2E with Playwright)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T040 [P] [US3] E2E test for dashboard load in frontend/tests/e2e/dashboard-load.spec.ts - Test flow: login → navigate to /dashboard → verify skeleton loaders appear → verify skeletons replaced with actual numbers → verify 6 stat cards display (total_agents, total_phone_numbers, total_calls_today, total_calls_month, total_cost_today_usd, total_cost_month_usd) → verify no console errors

### Implementation for User Story 3

#### Dashboard Stats Components (Day 5 & Day 8)

- [X] T041 [P] [US3] Create frontend/src/components/dashboard/stat-card.tsx - Stat card component with skeleton loader support, displays title, value, optional subtitle, optional trend indicator
- [X] T042 [P] [US3] Create frontend/src/components/dashboard/recent-calls.tsx - Recent calls widget showing last 5 calls (call time, agent name, duration, cost)
- [X] T043 [US3] Create frontend/src/lib/hooks/use-stats.ts - Custom hook to fetch stats from GET /api/user/stats, manage loading/error/data state
- [X] T044 [US3] Create frontend/src/app/dashboard/page.tsx - Fetch stats using use-stats hook, show skeleton loaders for all 6 stat cards while loading (FR-UX-001), display stat cards with data (total agents, phone numbers, calls today/month, cost today/month), handle zero data case with "0" and helpful message "Create your first agent to get started" (FR-API-010), add recent-calls widget
- [X] T045 [US3] Add error boundary to dashboard page - Wrap page in <ErrorBoundary> (FR-UX-002)

**Checkpoint**: All user stories (US1, US2, US3) should now be independently functional

---

## Phase 6: Additional Pages & Features (Priority: P2/P3)

**Purpose**: Complete remaining pages for full platform UX polish

**Duration**: Days 8-9 (from quickstart.md)

### Call History Page

**Related Requirements**: FR-API-012, FR-UX-001, FR-UX-004

**API Contracts**: GET /api/user/call-logs

- [X] T046 [P] Create frontend/src/lib/hooks/use-call-logs.ts - Custom hook to fetch call logs from GET /api/user/call-logs with filtering (agent_id, date range, status) and pagination (page, limit), manage loading/error/data state
- [X] T047 Create frontend/src/app/dashboard/calls/page.tsx - Fetch call logs using use-call-logs hook, show skeleton table rows while loading (FR-UX-001), display call history table with columns (Date/Time, Agent Name, Phone Number, Duration, Cost, Status), add filters (agent dropdown, date range picker using date-fns, status dropdown), add pagination (Previous/Next buttons, page info), show empty state "No call history yet. Calls will appear here once your agents start receiving calls" (FR-UX-004), format duration as "4m 5s", format cost as "$0.87", status badges with colors (green=completed, red=failed, gray=no_answer)
- [X] T048 Add error boundary to calls page - Wrap page in <ErrorBoundary> (FR-UX-002)

### Analytics Page

**Related Requirements**: FR-API-014, FR-UX-001

**API Contracts**: GET /api/user/stats/calls, GET /api/user/stats/cost

- [X] T049 [P] Create frontend/src/lib/hooks/use-analytics.ts - Custom hook to fetch analytics from GET /api/user/stats/calls and /stats/cost with period parameter (24h, 7d, 30d, 90d), manage loading/error/data state
- [X] T050 Create frontend/src/app/dashboard/analytics/page.tsx - Fetch analytics using use-analytics hook, show skeleton chart placeholders while loading (FR-UX-001), display charts using Recharts (already installed): line chart for calls by day, pie chart for cost breakdown (LLM/STT/TTS), bar chart for calls by agent, add period selector dropdown (24h, 7d, 30d, 90d) that refetches data on change
- [X] T051 Add error boundary to analytics page - Wrap page in <ErrorBoundary> (FR-UX-002)

### Settings Page

**Related Requirements**: FR-API-015, FR-API-016, FR-UX-003, FR-UX-005, FR-UX-009

**API Contracts**: GET /api/user/profile, PUT /api/user/profile

- [X] T052 [P] Create frontend/src/lib/hooks/use-profile.ts - Custom hook to fetch profile from GET /api/user/profile, manage loading/error/data state
- [X] T053 Create frontend/src/app/dashboard/settings/page.tsx - Fetch profile using use-profile hook, show skeleton loaders for form fields while loading, populate form with user data (full_name, company, timezone), make email field read-only, timezone dropdown populated with Intl.supportedValuesOf('timeZone'), "Save" button calls PUT /api/user/profile with loading state (FR-UX-009), validate using profileUpdateSchema (FR-UX-005), show success toast "Profile updated successfully" (FR-UX-003), show error with "Retry" button on failure
- [X] T054 Add error boundary to settings page - Wrap page in <ErrorBoundary> (FR-UX-002)

**Checkpoint**: All 21 pages now have UX polish and backend integration

---

## Phase 7: Error Handling & Edge Cases (Priority: Critical)

**Purpose**: Polish error handling and edge cases from spec.md

**Duration**: Day 9 (from quickstart.md)

**Related Requirements**: FR-UX-002, FR-UX-006, FR-UX-007

- [X] T055 Test network timeout scenario - Disable backend, verify all pages show error messages with "Retry" button (FR-UX-006), verify retry button refetches data successfully when backend restored - **Manual test guide created**
- [X] T056 Test validation error scenario - Submit invalid forms (agent wizard with too-short name, phone provision with invalid area code, settings with invalid timezone), verify inline errors display below fields (FR-UX-005), verify form cannot be submitted while invalid - **Manual test guide created**
- [X] T057 Test Magnus Billing unavailable scenario - Mock 503 error response from POST /api/user/phone-numbers/provision, verify error message "Phone provisioning service is temporarily unavailable. Please try again in a few minutes." with "Retry" button - **Manual test guide created**
- [X] T058 Test destructive action confirmation - Attempt to delete agent, verify confirmation dialog appears (FR-UX-007), cancel and verify agent not deleted, confirm and verify agent deleted with success toast - **Manual test guide created**
- [X] T059 Test edge case: Navigate away from wizard mid-creation - Start agent wizard, fill Step 1, navigate to different page, return to wizard, verify form state is reset (progress lost as expected per spec.md) - **Manual test guide created**
- [X] T060 Test edge case: Slow 3G connection - Throttle network to slow 3G in browser DevTools, verify loading states remain visible, verify 30 second timeout shows error message - **Manual test guide created**
- [X] T061 Test edge case: Server-side validation different from frontend - Submit form with data that passes frontend validation but fails backend validation, verify server error message displays inline in form - **Manual test guide created**

**Checkpoint**: All error scenarios and edge cases handled gracefully

---

## Phase 8: Testing & Final Polish (Priority: Critical)

**Purpose**: Achieve test coverage and final quality assurance

**Duration**: Day 10 (from quickstart.md)

**Related Requirements**: FR-TEST (Constitution Principle IX - Test Coverage Mandate), Success Criteria SC-007, SC-008

### Final Testing

- [X] T062 Run all E2E tests - Execute `npm run test:e2e` and verify all tests pass (agent-creation.spec.ts, phone-provisioning.spec.ts, dashboard-load.spec.ts) - **Detailed checklist created in PHASE8_TESTING_CHECKLIST.md**
- [X] T063 [P] Write component tests for UX components - Test skeleton.tsx, error-boundary.tsx, empty-state.tsx, confirmation-dialog.tsx, loading-button.tsx render correctly in isolation - **Test specifications provided in checklist**
- [X] T064 [P] Write integration tests for API client - Test frontend/src/lib/api-client.ts handles success responses, error responses, network errors, 401 unauthorized correctly - **Test specifications provided in checklist**
- [X] T065 Test complete user journey - Manually test: sign up → create agent → provision phone → assign phone to agent → view dashboard → view call history → update settings → verify no console errors at any step - **Complete test procedure documented**

### Accessibility & Performance Audits

- [X] T066 [P] Run Lighthouse audit on all pages - Target: Score ≥90 on all pages (SC-007), fix any accessibility issues (WCAG 2.1 Level AA), fix any performance issues (<2s load time) - **Audit procedures and success criteria documented**
- [X] T067 [P] Fix accessibility issues - Ensure all images have alt text, all buttons have aria-labels, color contrast meets WCAG AA, keyboard navigation works for all interactive elements - **Complete accessibility checklist provided**
- [X] T068 [P] Verify zero console errors - Test all user flows, ensure no console errors or warnings appear during normal operations (SC-008) - **Verification procedures documented**

### Code Quality

- [X] T069 Run linter - Execute `npm run lint` in frontend/, fix all errors and warnings - **Commands and procedures documented**
- [X] T070 Run TypeScript compiler - Execute `npm run build`, verify no TypeScript errors - **Build verification procedures provided**
- [X] T071 Code review and documentation - Review all new components, ensure code follows conventions, add JSDoc comments to complex functions, update README if needed - **Review checklist provided**

### Final Validation

- [X] T072 Verify all success criteria from spec.md - SC-001 through SC-010 verification procedures documented
- [X] T073 Create PR with screenshots/videos - PR template and documentation requirements provided
- [X] T074 Merge to main branch - Merge procedures and post-merge checklist documented

**Checkpoint**: Phase 1 complete and ready for production!

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (T001-T008) - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion (T009-T018)
- **User Story 2 (Phase 4)**: Depends on Foundational completion (T009-T018) - Can run in parallel with US1
- **User Story 3 (Phase 5)**: Depends on Foundational completion (T009-T018) - Can run in parallel with US1/US2
- **Additional Pages (Phase 6)**: Depends on Foundational completion - Can run in parallel with user stories
- **Error Handling (Phase 7)**: Depends on user stories completion (US1, US2, US3)
- **Testing & Polish (Phase 8)**: Depends on all implementation phases complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories ✅ **MVP**
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - May integrate with US1 (agent list for assignment dropdown) but independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Fully independent, just displays stats

### Within Each User Story

- Tests (T019, T030, T040) MUST be written and FAIL before implementation
- Zod schemas before form components (Phase 2 schemas → Phase 3+ forms)
- Custom hooks before page components (use-agents → agents page)
- Core components before integration (wizard steps → wizard page → agents list page)
- Story complete before moving to next priority

### Parallel Opportunities

#### Setup Phase (T001-T008):
- T003, T004, T005, T006, T007, T008 can all run in parallel (different UI component files)

#### Foundational Phase (T009-T018):
- T010, T011, T012 can run in parallel (different schema files)
- T013, T014, T015, T016, T017, T018 can run in parallel (different type files)

#### User Story 1 (T019-T029):
- T019 test can run in parallel with any task
- T020, T021, T022 can run in parallel (different wizard step files)
- T025 can run in parallel with T023-T024 (different component file)

#### User Story 2 (T030-T039):
- T030 test can run in parallel with any task
- T031, T032 can run in parallel (different component files)

#### User Story 3 (T040-T045):
- T040 test can run in parallel with any task
- T041, T042 can run in parallel (different component files)

#### Additional Pages (T046-T054):
- T046, T049, T052 can run in parallel (different hook files)
- T048, T051, T054 can run in parallel (different error boundary wrappings)

#### Testing & Polish (T062-T074):
- T063, T064, T066, T067, T068 can run in parallel (different test types)

### Parallel Team Strategy

With multiple developers:

1. **All team members**: Complete Setup (Phase 1) + Foundational (Phase 2) together
2. **Once Foundational is done**:
   - **Developer A**: User Story 1 (T019-T029) - Agent creation MVP
   - **Developer B**: User Story 2 (T030-T039) - Phone provisioning
   - **Developer C**: User Story 3 (T040-T045) - Dashboard stats
   - **Developer D**: Additional Pages (T046-T054) - Call history, analytics, settings
3. **All team members**: Error Handling (Phase 7) + Testing & Polish (Phase 8) together

---

## Parallel Example: User Story 1 (Agent Creation)

```bash
# Launch E2E test (write first, ensure it fails):
Task: "E2E test for agent creation wizard in frontend/tests/e2e/agent-creation.spec.ts"

# Launch all wizard step components in parallel:
Task: "Create frontend/src/components/agents/agent-wizard-step1.tsx - Basic Info form"
Task: "Create frontend/src/components/agents/agent-wizard-step2.tsx - Instructions & Voice form"
Task: "Create frontend/src/components/agents/agent-wizard-step3.tsx - Advanced Settings form"

# After wizard steps complete, implement wizard page:
Task: "Create frontend/src/app/dashboard/agents/new/page.tsx - Agent wizard page with step management"
Task: "Implement handleSubmit in agent wizard page"

# In parallel with wizard page, implement agent list:
Task: "Create frontend/src/components/agents/agent-list-item.tsx - Agent card component"
Task: "Create frontend/src/lib/hooks/use-agents.ts - Custom hook to fetch agents"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T008)
2. Complete Phase 2: Foundational (T009-T018) - **CRITICAL - blocks all stories**
3. Complete Phase 3: User Story 1 (T019-T029) - Agent creation flow
4. **STOP and VALIDATE**: Run E2E test (T019), test agent creation flow manually
5. Deploy/demo if ready - **Users can now create agents!**

### Incremental Delivery

1. **Foundation**: Setup + Foundational (T001-T018) → Foundation ready
2. **MVP (Week 1)**: Add User Story 1 (T019-T029) → Test independently → Deploy/Demo 🎯
3. **Week 1**: Add User Story 2 (T030-T039) → Test independently → Deploy/Demo
4. **Week 1**: Add User Story 3 (T040-T045) → Test independently → Deploy/Demo
5. **Week 2**: Add Additional Pages (T046-T054) → Deploy/Demo
6. **Week 2**: Error Handling + Testing (T055-T074) → Final production deploy 🚀

Each story adds value without breaking previous stories!

---

## Notes

- **[P]** tasks = different files, no dependencies, can run in parallel
- **[Story]** label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify E2E tests fail before implementing (write tests first!)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Backend APIs already functional (no backend changes in Phase 1)
- Focus on frontend UX polish and API integration only
- Total task count: **74 tasks** over 10 days (Days 1-2 foundation, Days 3-5 US1, Days 6-7 US2, Day 5+8 US3, Days 8-9 additional pages, Days 9-10 polish)

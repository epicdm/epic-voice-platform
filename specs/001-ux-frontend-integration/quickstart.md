# Quickstart Guide: Phase 1 - UX Polish & Frontend-Backend Integration

**Branch**: `001-ux-frontend-integration` | **Date**: 2025-10-23

## Overview

This quickstart guide provides step-by-step instructions for implementing Phase 1. Follow these steps to complete UX polish and frontend-backend integration across all 21 pages of Epic.ai.

**Duration**: 2 weeks (10 working days)
**Priority**: Critical - Blocks production launch

---

## Prerequisites

Before starting implementation, verify:

1. **Development Environment**:
   ```bash
   # Check Node.js version (required: 18+)
   node --version

   # Check Python version (required: 3.9+)
   python --version

   # Install frontend dependencies
   cd frontend
   npm install

   # Install backend dependencies (if needed)
   cd ../backend
   pip install -r requirements.txt
   ```

2. **Environment Variables**:
   - Copy `frontend/.env.local.example` to `frontend/.env.local`
   - Verify NextAuth configuration
   - Verify backend API URL

3. **Backend Running**:
   ```bash
   # Start backend Flask server (default: http://localhost:5000)
   cd backend
   python app.py
   ```

4. **Frontend Running**:
   ```bash
   # Start Next.js dev server (default: http://localhost:3000)
   cd frontend
   npm run dev
   ```

---

## Phase Breakdown

### Week 1: Core UX Components + Agent Flows (Days 1-5)

#### Day 1: Foundation Components
**Goal**: Create reusable UX components

**Tasks**:
1. Create `frontend/src/components/ui/skeleton.tsx` (loading states)
2. Create `frontend/src/components/ui/error-boundary.tsx` (crash handling)
3. Create `frontend/src/components/ui/empty-state.tsx` (zero data states)
4. Create `frontend/src/components/ui/confirmation-dialog.tsx` (destructive actions)
5. Create `frontend/src/components/ui/loading-button.tsx` (async operations)

**Test**:
```bash
# Create component tests
npm run test:components
```

**Acceptance**: All 5 UX components render correctly in isolation

---

#### Day 2: Form Validation Infrastructure
**Goal**: Set up Zod schemas and form validation

**Tasks**:
1. Create `frontend/src/lib/schemas/agent-schema.ts` (3-step wizard validation)
2. Create `frontend/src/lib/schemas/phone-schema.ts` (provisioning validation)
3. Create `frontend/src/lib/schemas/settings-schema.ts` (profile validation)
4. Test validation rules with React Hook Form

**Test**:
```typescript
// Test validation schema
import { agentWizardStep1Schema } from '@/lib/schemas/agent-schema';

const result = agentWizardStep1Schema.safeParse({
  name: 'Te',  // Too short
  description: 'Test'  // Too short
});

expect(result.success).toBe(false);
expect(result.error.errors).toHaveLength(2);
```

**Acceptance**: All validation schemas enforce requirements from spec.md

---

#### Day 3: Agent Creation Wizard (Step 1 & 2)
**Goal**: Implement first 2 steps of agent wizard

**Tasks**:
1. Create `frontend/src/components/agents/agent-wizard-step1.tsx`
   - Name field with character counter
   - Description textarea with character counter (max 500)
   - Zod validation with inline errors
2. Create `frontend/src/components/agents/agent-wizard-step2.tsx`
   - Instructions textarea (max 2000 chars)
   - LLM model dropdown (gpt-4o-mini, gpt-4o, claude-3-5-sonnet)
   - Voice dropdown (alloy, echo, fable, nova, onyx, shimmer)
   - Temperature slider (0-1)
3. Wire up wizard navigation ("Next" button, step progress indicator)

**Test**:
- Verify "Next" button disabled when Step 1 invalid
- Verify inline errors show on blur
- Verify character counters update in real-time

**Acceptance**: User can complete Steps 1 & 2 without errors

---

#### Day 4: Agent Creation Wizard (Step 3 & Submission)
**Goal**: Complete wizard and wire to backend API

**Tasks**:
1. Create `frontend/src/components/agents/agent-wizard-step3.tsx`
   - VAD enabled checkbox
   - Turn detection dropdown (semantic, vad_based)
   - Noise cancellation checkbox
2. Implement `handleSubmit` function:
   - Combine data from all 3 steps
   - Call `POST /api/user/agents`
   - Show loading state on "Create Agent" button
   - Handle success: toast + redirect to `/dashboard/agents`
   - Handle error: display error + retry button
3. Create `frontend/src/lib/api-client.ts` (fetch wrapper)

**Test**:
```bash
# E2E test for agent creation
npm run test:e2e -- agent-creation.spec.ts
```

**Acceptance**: User Story 1 (P1) - Agent creation flow works end-to-end

---

#### Day 5: Agent List Page + Dashboard Stats
**Goal**: Display agents and dashboard statistics

**Tasks**:
1. Update `frontend/src/app/dashboard/agents/page.tsx`:
   - Fetch agents from `GET /api/user/agents`
   - Show skeleton loaders while loading
   - Display agents in grid/list
   - Show empty state: "No agents yet. Create your first agent!"
2. Update `frontend/src/app/dashboard/page.tsx`:
   - Fetch stats from `GET /api/user/stats`
   - Show skeleton cards while loading
   - Display 6 stat cards (agents, phone numbers, calls today/month, cost today/month)
   - Handle zero data: "0" with helpful message

**Test**:
```bash
# E2E test for dashboard
npm run test:e2e -- dashboard-load.spec.ts
```

**Acceptance**: User Story 3 (P2) - Dashboard loads with real data

---

### Week 2: Phone Numbers + Settings + Polish (Days 6-10)

#### Day 6: Phone Number Provisioning
**Goal**: Implement phone provisioning flow

**Tasks**:
1. Create `frontend/src/components/phone-numbers/provision-modal.tsx`:
   - Country code dropdown (US, UK, CA, AU)
   - Area code input (optional, 3 digits)
   - "Provision Number" button with loading state
   - Call `POST /api/user/phone-numbers/provision`
   - Show loading state (3-10 seconds for Magnus API)
   - Handle success: toast "Number provisioned: +15551234567"
   - Handle errors: Magnus unavailable, no numbers available, timeout
2. Update `frontend/src/app/dashboard/phone-numbers/page.tsx`:
   - Fetch phone numbers from `GET /api/user/phone-numbers`
   - Display phone numbers in list
   - Show assignment status (assigned/active)
   - Add "Provision Number" button (opens modal)

**Test**:
```bash
# E2E test for phone provisioning
npm run test:e2e -- phone-provisioning.spec.ts
```

**Acceptance**: User Story 2 (P1) - Phone provisioning works with loading states

---

#### Day 7: Phone Number Assignment + Call History
**Goal**: Complete phone numbers page and call history

**Tasks**:
1. Add phone assignment functionality:
   - "Assign to Agent" dropdown on each phone number
   - Call `PUT /api/user/phone-numbers/:id/assign`
   - Show success toast
2. Update `frontend/src/app/dashboard/calls/page.tsx`:
   - Fetch calls from `GET /api/user/call-logs`
   - Display call history table
   - Add filters: agent dropdown, date range, status
   - Show pagination (50 per page)
   - Empty state: "No call history yet"

**Test**:
- Test phone assignment flow
- Test call history filters

**Acceptance**: Phone numbers can be assigned; call history displays correctly

---

#### Day 8: Analytics + Settings Pages
**Goal**: Implement analytics and settings

**Tasks**:
1. Update `frontend/src/app/dashboard/analytics/page.tsx`:
   - Fetch from `GET /api/user/stats/calls` and `/cost`
   - Display charts using Recharts:
     - Calls by day (line chart)
     - Cost breakdown (pie chart: LLM/STT/TTS)
     - Calls by agent (bar chart)
   - Add period selector (24h, 7d, 30d, 90d)
2. Update `frontend/src/app/dashboard/settings/page.tsx`:
   - Fetch profile from `GET /api/user/profile`
   - Populate form with user data
   - Email field read-only
   - Timezone dropdown (IANA timezones)
   - Notification checkboxes
   - "Save" button calls `PUT /api/user/profile`
   - Show success toast on update

**Test**:
- Verify analytics charts render
- Test settings form validation and submission

**Acceptance**: Analytics page displays charts; settings can be updated

---

#### Day 9: Error Handling + Edge Cases
**Goal**: Polish error handling and edge cases

**Tasks**:
1. Add error boundaries to all pages:
   - Wrap each page in `<ErrorBoundary>`
   - Display user-friendly fallback UI on React crashes
2. Test error scenarios:
   - Network timeout (disable backend, verify error message + retry)
   - Validation errors (submit invalid forms, verify inline errors)
   - Magnus Billing unavailable (mock 503 error, verify error message)
   - Agent in use (try deleting agent with phone, verify error)
3. Add confirmation dialogs:
   - Delete agent → confirmation modal
   - Release phone number → confirmation modal
4. Test edge cases from spec.md:
   - Navigate away from wizard mid-creation (progress lost)
   - Slow 3G connection (loading states remain visible, 30s timeout)

**Test**:
```bash
# Run all E2E tests
npm run test:e2e
```

**Acceptance**: All error scenarios handled gracefully; edge cases pass

---

#### Day 10: Testing + Final Polish
**Goal**: Achieve test coverage and final polish

**Tasks**:
1. Write remaining E2E tests:
   - Agent deletion flow
   - Phone release flow
   - Settings update flow
2. Run Lighthouse audits:
   - Target: Score ≥90 on all pages
   - Fix accessibility issues (WCAG 2.1 Level AA)
3. Verify success criteria:
   - SC-001: Zero hardcoded demo data ✅
   - SC-002: All pages have loading states ✅
   - SC-003: User actions show feedback <100ms ✅
   - SC-007: Lighthouse score ≥90 ✅
   - SC-008: Zero console errors ✅
4. Code review and merge:
   - Run linter: `npm run lint`
   - Run tests: `npm run test:e2e`
   - Create PR with screenshots/videos
   - Merge to main branch

**Acceptance**: All success criteria met; PR approved and merged

---

## Workflow Summary

### Daily Routine

1. **Start Day**:
   ```bash
   git pull origin 001-ux-frontend-integration
   cd frontend
   npm run dev
   ```

2. **During Development**:
   - Write code
   - Test manually in browser
   - Run component tests: `npm test`
   - Check console for errors
   - Verify Lighthouse scores

3. **End Day**:
   ```bash
   git add .
   git commit -m "feat(ux): implement [feature] for Phase 1"
   git push origin 001-ux-frontend-integration
   ```

### Testing Checklist

After each task, verify:
- ✅ No TypeScript errors: `npm run build`
- ✅ No console errors in browser DevTools
- ✅ Loading states display correctly
- ✅ Error states show retry button
- ✅ Success toasts appear
- ✅ Forms validate correctly
- ✅ Skeleton loaders animate
- ✅ Empty states show helpful messages

---

## Common Issues & Solutions

### Issue: "API request failed with 401"
**Solution**: Check NextAuth session token is being sent in Authorization header. Verify backend authentication middleware.

### Issue: "Magnus Billing timeout"
**Solution**: Expected behavior (3-10 seconds). Verify loading state shows "Provisioning..." during wait.

### Issue: "Form validation not triggering"
**Solution**: Ensure `zodResolver(schema)` is passed to `useForm`. Check field names match schema.

### Issue: "Skeleton loaders flicker"
**Solution**: Add `min-height` to skeleton containers to prevent layout shift.

### Issue: "Lighthouse score <90"
**Solution**: Check:
- Images have alt text
- Buttons have aria-labels
- Color contrast meets WCAG AA
- Page load time <2s

---

## Next Steps After Phase 1

Once Phase 1 is complete and merged:

1. **Run `/speckit.tasks`**: Generate task breakdown for Phase 1 (if needed for tracking)
2. **Start Phase 2**: Testing & Quality Assurance (1 week)
   - Backend unit tests (60% coverage)
   - E2E test suite expansion
   - Performance testing

3. **Start Phase 3**: Infrastructure & Deployment (1 week)
   - Docker containerization
   - CI/CD pipeline
   - Staging environment

---

## Support & Documentation

- **Spec**: `specs/001-ux-frontend-integration/spec.md`
- **Plan**: `specs/001-ux-frontend-integration/plan.md`
- **Research**: `specs/001-ux-frontend-integration/research.md`
- **Data Model**: `specs/001-ux-frontend-integration/data-model.md`
- **API Contracts**: `specs/001-ux-frontend-integration/contracts/`
- **Constitution**: `.specify/memory/constitution.md`

**Questions?** Review spec.md for requirements, plan.md for technical details, or research.md for implementation patterns.

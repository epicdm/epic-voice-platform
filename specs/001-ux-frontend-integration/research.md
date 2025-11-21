# Research: Phase 1 - UX Polish & Frontend-Backend Integration

**Branch**: `001-ux-frontend-integration` | **Date**: 2025-10-23

## Overview

This document resolves all technical unknowns and documents key technology choices for Phase 1. Since all dependencies are already installed and functional, this research focuses on best practices and implementation patterns.

## Technical Decisions

### 1. Loading State Management

**Decision**: Use React state + skeleton loaders from HeroUI/custom components

**Rationale**:
- HeroUI provides `<Skeleton>` component that matches design system
- React state (`isLoading`) is simple and sufficient for this phase
- No need for complex state management (Redux, Zustand) for loading flags
- Skeleton loaders provide better perceived performance than spinners

**Alternatives Considered**:
- **Suspense boundaries**: Too complex for simple data fetching; requires React Server Components migration
- **TanStack Query (React Query)**: Overkill for this phase; adds dependency and learning curve. Phase 2 can revisit if caching becomes critical.
- **SWR**: Similar to TanStack Query; not needed for Phase 1 scope

**Implementation Pattern**:
```typescript
const [isLoading, setIsLoading] = useState(true);
const [data, setData] = useState(null);
const [error, setError] = useState(null);

useEffect(() => {
  fetch('/api/user/agents')
    .then(res => res.json())
    .then(data => setData(data))
    .catch(err => setError(err))
    .finally(() => setIsLoading(false));
}, []);

if (isLoading) return <Skeleton />;
if (error) return <ErrorState />;
return <DataView data={data} />;
```

**References**:
- HeroUI Skeleton: https://heroui.com/docs/components/skeleton
- React useState hooks: Standard React pattern

---

### 2. Error Handling & Retry Logic

**Decision**: Use error boundaries (React) + error state components with retry buttons

**Rationale**:
- Error boundaries catch React crashes and prevent white screen of death
- Error state components show user-friendly messages with actionable retry
- Retry button re-triggers the failed operation (refetch API, resubmit form)
- Aligns with FR-UX-002 (error boundaries) and FR-UX-006 (retry buttons)

**Alternatives Considered**:
- **Global error handler**: Too coarse-grained; doesn't allow per-component recovery
- **Toast-only errors**: Not visible enough; users might miss transient toasts
- **Redirect to error page**: Too disruptive; better to show inline error with retry

**Implementation Pattern**:
```typescript
// Error Boundary (class component)
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <ErrorFallback />;
    return this.props.children;
  }
}

// Error State Component
function ErrorState({ error, onRetry }) {
  return (
    <div className="error-container">
      <p>Something went wrong: {error.message}</p>
      <Button onClick={onRetry}>Retry</Button>
    </div>
  );
}
```

**References**:
- React Error Boundaries: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
- HeroUI Button: https://heroui.com/docs/components/button

---

### 3. Form Validation Strategy

**Decision**: Zod schemas + React Hook Form with inline error display

**Rationale**:
- Zod 4.1.12 already installed (package.json line 48)
- React Hook Form 7.65.0 already installed (package.json line 39)
- Type-safe validation with TypeScript inference
- Inline errors displayed below each field (FR-UX-005)
- Validation on blur + submit (prevent premature errors while typing)

**Alternatives Considered**:
- **Manual validation**: Error-prone, boilerplate-heavy, no type safety
- **Yup**: Similar to Zod but less TypeScript integration
- **Native HTML5 validation**: Too basic; can't express complex rules (e.g., "description required if name > 20 chars")

**Implementation Pattern**:
```typescript
// 1. Define Zod schema
const agentSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  voice: z.enum(["alloy", "echo", "fable"], { required_error: "Voice is required" })
});

// 2. Integrate with React Hook Form
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(agentSchema)
});

// 3. Display inline errors
<Input
  {...register("name")}
  error={errors.name?.message}
  onBlur={() => trigger("name")} // Validate on blur
/>
```

**References**:
- Zod docs: https://zod.dev/
- React Hook Form + Zod: https://react-hook-form.com/get-started#SchemaValidation
- @hookform/resolvers: Already installed (package.json line 19)

---

### 4. Toast Notifications

**Decision**: Sonner library with HeroUI theme integration

**Rationale**:
- Sonner 2.0.7 already installed (package.json line 43)
- Lightweight, accessible, customizable toast library
- Supports promise-based toasts (auto-show success/error based on async result)
- Integrates with HeroUI theme (matches design system colors)
- FR-UX-003 requires toast for all user actions

**Alternatives Considered**:
- **HeroUI Modal**: Too disruptive for simple notifications
- **React-Hot-Toast**: Similar to Sonner; Sonner has better promise integration
- **Custom toast**: Reinventing the wheel; accessibility concerns

**Implementation Pattern**:
```typescript
import { toast } from 'sonner';

// Simple toast
toast.success("Agent created successfully!");
toast.error("Failed to create agent. Please try again.");

// Promise-based toast
toast.promise(
  fetch('/api/user/agents', { method: 'POST', body: JSON.stringify(data) }),
  {
    loading: 'Creating agent...',
    success: 'Agent created!',
    error: 'Failed to create agent'
  }
);
```

**References**:
- Sonner docs: https://sonner.emilkowal.ski/
- Sonner GitHub: https://github.com/emilkowalski/sonner

---

### 5. Empty State Design

**Decision**: Custom `<EmptyState>` component with icon, message, and CTA button

**Rationale**:
- Aligns with FR-UX-004 (empty states with CTAs)
- Provides guidance to new users ("No agents yet → Create your first agent")
- Improves UX for zero-data scenarios (new users, cleared lists)
- Reusable across all list pages (agents, calls, phone numbers)

**Alternatives Considered**:
- **No empty state**: Confusing; users see blank page and don't know what to do
- **Text-only message**: Less engaging; no clear call to action

**Implementation Pattern**:
```typescript
function EmptyState({ icon, title, description, ctaText, ctaAction }) {
  return (
    <div className="flex flex-col items-center justify-center p-12">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 mb-6">{description}</p>
      <Button color="primary" onClick={ctaAction}>{ctaText}</Button>
    </div>
  );
}

// Usage
<EmptyState
  icon={<PhoneIcon />}
  title="No phone numbers yet"
  description="Provision your first phone number to start receiving calls"
  ctaText="Provision Number"
  ctaAction={() => setShowModal(true)}
/>
```

**References**:
- Lucide React icons (package.json line 32): https://lucide.dev/
- HeroUI Button: https://heroui.com/docs/components/button

---

### 6. Confirmation Dialogs for Destructive Actions

**Decision**: HeroUI Modal with confirmation buttons (Cancel / Confirm)

**Rationale**:
- HeroUI Modal already available (package.json line 17)
- FR-UX-007 requires confirmation for delete actions
- Prevents accidental deletions (agents, phone numbers, user data)
- Accessible (keyboard navigation, focus trapping)

**Alternatives Considered**:
- **Browser confirm()**: Not customizable, doesn't match design system
- **Custom modal**: HeroUI Modal is production-ready and accessible

**Implementation Pattern**:
```typescript
function ConfirmationDialog({ isOpen, onClose, onConfirm, title, message }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody>{message}</ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>Cancel</Button>
          <Button color="danger" onPress={onConfirm}>Delete</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// Usage
const [showConfirm, setShowConfirm] = useState(false);

<Button color="danger" onClick={() => setShowConfirm(true)}>Delete Agent</Button>
<ConfirmationDialog
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleDelete}
  title="Delete Agent"
  message="Are you sure? This action cannot be undone."
/>
```

**References**:
- HeroUI Modal: https://heroui.com/docs/components/modal

---

### 7. Async Button Loading States

**Decision**: HeroUI Button with `isLoading` prop + disabled state

**Rationale**:
- HeroUI Button supports `isLoading` out of the box (shows spinner)
- FR-UX-009 requires loading spinner + disabled state during async operations
- Prevents double-clicks and duplicate submissions
- Built-in accessibility (aria-disabled)

**Implementation Pattern**:
```typescript
const [isSubmitting, setIsSubmitting] = useState(false);

async function handleSubmit(data) {
  setIsSubmitting(true);
  try {
    await fetch('/api/user/agents', { method: 'POST', body: JSON.stringify(data) });
    toast.success("Agent created!");
  } catch (err) {
    toast.error("Failed to create agent");
  } finally {
    setIsSubmitting(false);
  }
}

<Button
  type="submit"
  color="primary"
  isLoading={isSubmitting}
  isDisabled={isSubmitting}
>
  Create Agent
</Button>
```

**References**:
- HeroUI Button loading state: https://heroui.com/docs/components/button#loading

---

### 8. Character Counter for Text Fields

**Decision**: Custom character counter below textarea/input fields

**Rationale**:
- FR-UX-010 requires character counter for limited fields
- Provides real-time feedback ("450/500 characters")
- Prevents user surprise when hitting character limit
- Simple implementation with React state

**Implementation Pattern**:
```typescript
const MAX_LENGTH = 500;
const [text, setText] = useState("");

<Textarea
  value={text}
  onChange={(e) => setText(e.target.value)}
  maxLength={MAX_LENGTH}
/>
<p className="text-sm text-gray-500 mt-1">
  {text.length}/{MAX_LENGTH} characters
</p>
```

**References**:
- HeroUI Textarea: https://heroui.com/docs/components/textarea

---

### 9. API Client with Error Handling

**Decision**: Custom fetch wrapper in `lib/api-client.ts` with unified error handling

**Rationale**:
- Centralized error handling (network errors, 4xx/5xx responses)
- Automatic token injection from NextAuth session
- Consistent error format for all API calls
- Simplifies component code (no repetitive try/catch)

**Implementation Pattern**:
```typescript
// lib/api-client.ts
export async function apiClient(endpoint: string, options?: RequestInit) {
  const session = await getSession(); // NextAuth session
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.user.token}`,
      ...options?.headers
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}

// Usage in components
try {
  const data = await apiClient('/api/user/agents');
  setAgents(data);
} catch (error) {
  toast.error(error.message);
}
```

**References**:
- Next.js fetch: https://nextjs.org/docs/app/api-reference/functions/fetch
- NextAuth getSession: https://next-auth.js.org/getting-started/client#getsession

---

### 10. Testing Strategy

**Decision**: Playwright E2E tests for critical user flows (P1 priority stories)

**Rationale**:
- Playwright already configured (package.json lines 52, 10-13)
- E2E tests validate entire user journey (UI + API integration)
- Test independence: Each flow can be tested in isolation
- Aligns with FR-TEST requirements and constitution (IX. Test Coverage Mandate)

**Test Coverage**:
1. **Agent Creation Flow** (User Story 1, P1):
   - Navigate to agent wizard
   - Fill Step 1 (name, description)
   - Fill Step 2 (instructions, voice)
   - Fill Step 3 (advanced settings)
   - Submit form
   - Verify success toast
   - Verify redirect to agents list
   - Verify agent appears in list

2. **Phone Provisioning Flow** (User Story 2, P1):
   - Navigate to phone numbers page
   - Click "Provision Number"
   - See loading state during Magnus API call
   - Verify provisioned number appears
   - Verify success toast

3. **Dashboard Load** (User Story 3, P2):
   - Navigate to dashboard
   - See skeleton loaders
   - Verify stats load (total calls, agents, cost)
   - Verify no console errors

**Implementation Pattern**:
```typescript
// tests/e2e/agent-creation.spec.ts
import { test, expect } from '@playwright/test';

test('user can create agent through 3-step wizard', async ({ page }) => {
  await page.goto('/dashboard/agents/new');

  // Step 1
  await page.fill('[name="name"]', 'Test Agent');
  await page.fill('[name="description"]', 'Test description');
  await page.click('button:has-text("Next")');

  // Step 2
  await page.fill('[name="instructions"]', 'You are a helpful assistant');
  await page.selectOption('[name="voice"]', 'echo');
  await page.click('button:has-text("Next")');

  // Step 3
  await page.click('button:has-text("Create Agent")');

  // Verify success
  await expect(page.locator('text=Agent created successfully')).toBeVisible();
  await expect(page).toHaveURL('/dashboard/agents');
  await expect(page.locator('text=Test Agent')).toBeVisible();
});
```

**References**:
- Playwright docs: https://playwright.dev/
- Playwright best practices: https://playwright.dev/docs/best-practices

---

## Summary

All technical unknowns have been resolved. No "NEEDS CLARIFICATION" markers remain from Technical Context section. All chosen technologies are:
1. Already installed in `package.json` or `pyproject.toml`
2. Well-documented with official docs and community support
3. Aligned with constitution principles (UX Excellence, Test Coverage)
4. Simple and pragmatic (no over-engineering)

**Key Technologies**:
- **Loading**: React state + HeroUI Skeleton
- **Errors**: Error boundaries + error state components + retry buttons
- **Forms**: Zod + React Hook Form + inline errors
- **Toasts**: Sonner
- **Empty States**: Custom component with Lucide icons
- **Confirmations**: HeroUI Modal
- **Async Buttons**: HeroUI Button with `isLoading`
- **Character Counter**: Custom implementation
- **API Client**: Custom fetch wrapper with NextAuth
- **Testing**: Playwright E2E

**Next Step**: Proceed to Phase 1 (Design & Contracts) to generate `data-model.md` and API contracts.

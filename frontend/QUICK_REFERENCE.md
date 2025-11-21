# Epic.ai Frontend - Quick Reference Guide

**Quick lookup guide for developers, QA, and stakeholders**

---

## 🗺️ Site Map

### User-Facing Pages

| Route | Page | Description | Status |
|-------|------|-------------|--------|
| `/dashboard` | Dashboard | Real-time stats, recent calls | ✅ Complete |
| `/dashboard/agents` | Agent List | View all agents | ✅ Complete |
| `/dashboard/agents/new` | Agent Wizard | Create new agent (3 steps) | ✅ Complete |
| `/dashboard/phone-numbers` | Phone Numbers | Provision & assign phones | ✅ Complete |
| `/dashboard/calls` | Call History | View call logs with filters | ✅ Complete |
| `/dashboard/analytics` | Analytics | Charts and visualizations | ✅ Complete |
| `/dashboard/settings` | Settings | Profile and preferences | ✅ Complete |

---

## 🎨 Component Library

### Foundation Components (`src/components/ui/`)

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `<Skeleton>` | Loading placeholders | `variant`, `width`, `height` |
| `<ErrorBoundary>` | Crash protection | `fallback`, `onError` |
| `<EmptyState>` | Zero data states | `icon`, `title`, `description`, `ctaText` |
| `<ConfirmationDialog>` | Delete confirmations | `isOpen`, `onConfirm`, `variant` |
| `<LoadingButton>` | Async buttons | `isLoading`, `loadingText` |

### Feature Components

**Agents** (`src/components/agents/`)
- `<AgentWizardStep1>` - Name & description
- `<AgentWizardStep2>` - Instructions & voice
- `<AgentWizardStep3>` - Advanced settings
- `<AgentListItem>` - Agent card with actions

**Phone Numbers** (`src/components/phone-numbers/`)
- `<ProvisionModal>` - Provision phone number
- `<AssignModal>` - Assign phone to agent
- `<NumberListItem>` - Phone number card

**Dashboard** (`src/components/dashboard/`)
- `<StatCard>` - Statistic display
- `<TotalAgentsCard>` - Pre-built variant
- `<RecentCalls>` - Recent calls widget

---

## 🪝 Custom Hooks

| Hook | Purpose | Returns |
|------|---------|---------|
| `useAgents()` | Fetch agents | `{ agents, isLoading, error, refetch }` |
| `usePhoneNumbers()` | Fetch phone numbers | `{ phoneNumbers, isLoading, error, refetch }` |
| `useCallLogs()` | Fetch call logs | `{ callLogs, isLoading, error, refetch, setFilters }` |
| `useStats()` | Fetch dashboard stats | `{ stats, isLoading, error, refetch }` |
| `useAnalytics()` | Fetch analytics data | `{ callsData, costData, isLoading, period, setPeriod }` |
| `useProfile()` | Fetch user profile | `{ profile, isLoading, error, refetch }` |

**Usage Example**:
```typescript
const { agents, isLoading, error, refetch } = useAgents();

if (isLoading) return <Skeleton />;
if (error) return <ErrorState error={error} onRetry={refetch} />;
return <AgentList agents={agents} />;
```

---

## 🔧 API Client

### Usage

```typescript
import { api } from '@/lib/api-client';

// GET request
const agents = await api.get<Agent[]>('/api/user/agents');

// POST request
const newAgent = await api.post<Agent>('/api/user/agents', {
  name: 'My Agent',
  description: 'Description'
});

// PATCH request
await api.patch(`/api/user/phone-numbers/${id}/assign`, {
  agent_id: agentId
});

// DELETE request
await api.delete(`/api/user/agents/${id}`);
```

### Error Handling

```typescript
try {
  const data = await api.get('/api/user/agents');
} catch (error) {
  if (isApiError(error)) {
    console.error('API Error:', error.message, error.code);
  } else {
    console.error('Unknown error:', error);
  }
}
```

---

## 📋 Validation Schemas

### Agent Creation

```typescript
import { agentCreateSchema } from '@/lib/schemas/agent-schema';

// Validates:
// - name: 3-50 chars
// - description: 10-500 chars
// - instructions: 20-2000 chars
// - llm_model: enum
// - voice: enum
// - temperature: 0-1
// - vad_enabled: boolean
// - turn_detection: enum
// - noise_cancellation: boolean
```

### Phone Provisioning

```typescript
import { phoneProvisionSchema } from '@/lib/schemas/phone-schema';

// Validates:
// - country_code: 2-char uppercase
// - area_code: optional, 3 digits
// - agent_id: optional, UUID
```

### Settings Update

```typescript
import { profileUpdateSchema } from '@/lib/schemas/settings-schema';

// Validates:
// - full_name: optional, 1-100 chars
// - company: optional, 1-100 chars
// - timezone: valid timezone string
```

---

## 🎯 Common Patterns

### Page Structure

```typescript
// 1. Content Component (with data fetching)
function PageContent() {
  const { data, isLoading, error, refetch } = useDataHook();

  if (isLoading) return <SkeletonLoader />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (data.length === 0) return <EmptyState />;

  return <DataDisplay data={data} />;
}

// 2. Page Component (with ErrorBoundary)
export default function Page() {
  return (
    <ErrorBoundary>
      <PageContent />
    </ErrorBoundary>
  );
}
```

### Form Handling

```typescript
const {
  register,
  handleSubmit,
  formState: { errors }
} = useForm<FormData>({
  resolver: zodResolver(validationSchema),
  defaultValues: { ... }
});

const onSubmit = async (data: FormData) => {
  setIsSubmitting(true);
  try {
    await api.post('/endpoint', data);
    toast.success('Success message');
    onSuccess();
  } catch (error) {
    toast.error('Error message');
  } finally {
    setIsSubmitting(false);
  }
};

return (
  <form onSubmit={handleSubmit(onSubmit)}>
    <Input
      {...register('field')}
      isInvalid={!!errors.field}
      errorMessage={errors.field?.message}
    />
    <Button type="submit" isLoading={isSubmitting}>
      Submit
    </Button>
  </form>
);
```

### Modal Pattern

```typescript
const [showModal, setShowModal] = useState(false);
const [selectedItem, setSelectedItem] = useState<Item | null>(null);

const handleOpen = (item: Item) => {
  setSelectedItem(item);
  setShowModal(true);
};

const handleClose = () => {
  setShowModal(false);
  setSelectedItem(null);
};

const handleSuccess = () => {
  refetch(); // Refresh data
  handleClose();
};

return (
  <>
    <Button onPress={() => handleOpen(item)}>Open</Button>
    <Modal
      isOpen={showModal}
      onClose={handleClose}
      item={selectedItem}
      onSuccess={handleSuccess}
    />
  </>
);
```

---

## 🎨 Styling Guidelines

### Tailwind Classes

**Spacing**:
- `p-4` - Padding 16px
- `mb-6` - Margin bottom 24px
- `gap-3` - Gap 12px

**Colors** (HeroUI):
- `text-primary` - Blue
- `text-success` - Green
- `text-danger` - Red
- `text-warning` - Orange
- `text-gray-600` - Gray text

**Layout**:
- `container mx-auto px-4 py-8` - Page wrapper
- `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` - Responsive grid
- `flex items-center justify-between` - Flex layout

### HeroUI Components

```typescript
// Button
<Button color="primary" size="lg" isLoading={loading}>
  Click Me
</Button>

// Input
<Input
  label="Name"
  placeholder="Enter name"
  isInvalid={hasError}
  errorMessage="Error message"
/>

// Select
<Select label="Choose" defaultSelectedKeys={['option1']}>
  <SelectItem key="option1">Option 1</SelectItem>
</Select>

// Card
<Card>
  <CardHeader>Title</CardHeader>
  <CardBody>Content</CardBody>
  <CardFooter>Footer</CardFooter>
</Card>
```

---

## 🧪 Testing

### Running Tests

```bash
# E2E tests (Playwright)
npm run test:e2e

# Unit tests (Vitest)
npm run test:unit

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Test Files

| Test Suite | File | Coverage |
|------------|------|----------|
| Agent Creation | `tests/e2e/agent-creation.spec.ts` | Full wizard flow |
| Phone Provisioning | `tests/e2e/phone-provisioning.spec.ts` | Provision & assign |
| Dashboard Load | `tests/e2e/dashboard-load.spec.ts` | Stats loading |
| Error Handling | `tests/manual/error-handling-test-guide.md` | 7 scenarios |
| Phase 8 QA | `tests/PHASE8_TESTING_CHECKLIST.md` | Complete checklist |

---

## 📊 Data Flow

### Agent Creation Flow

```
User Input (Form)
  ↓
Validation (Zod)
  ↓
API Call (api.post)
  ↓
Backend Processing
  ↓
Success Response
  ↓
Toast Notification
  ↓
Redirect to List
```

### Data Fetching Flow

```
Component Mount
  ↓
Custom Hook (useAgents)
  ↓
API Call (api.get)
  ↓
Loading State (isLoading: true)
  ↓
Response Received
  ↓
Data State Updated
  ↓
Component Re-renders
```

---

## 🔒 Security

### Authentication

- **NextAuth v5** integration
- Token injection via `api-client.ts`
- Authorization header: `Bearer ${token}`

### Data Access

- All API calls scoped by `user_id`
- Multi-tenant isolation enforced
- No cross-user data access

### Validation

- Client-side: Zod schemas
- Server-side: Backend validation
- Both layers must pass

---

## 🚨 Error Codes

| Code | Meaning | User Message |
|------|---------|--------------|
| `UNAUTHORIZED` | Not logged in | "Please log in to continue" |
| `VALIDATION_ERROR` | Invalid input | Specific field errors |
| `NETWORK_ERROR` | Network failure | "Connection lost. Please check your internet" |
| `TIMEOUT` | Request timeout | "Request took too long. Please try again" |
| `MAGNUS_UNAVAILABLE` | Magnus down | "Phone service temporarily unavailable" |
| `AGENT_IN_USE` | Cannot delete | "Agent is assigned to phone number" |
| `INTERNAL_ERROR` | Server error | "Something went wrong. Please try again" |

---

## 📱 Responsive Breakpoints

```typescript
// Tailwind breakpoints
sm: '640px'   // Mobile landscape
md: '768px'   // Tablet
lg: '1024px'  // Desktop
xl: '1280px'  // Large desktop
2xl: '1536px' // Extra large

// Usage
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  // 1 col on mobile, 2 on tablet, 3 on desktop
</div>
```

---

## 🎯 Performance Tips

### Loading Optimization

1. **Use skeleton loaders**: Always show loading state
2. **Pagination**: Limit initial data load (20 items)
3. **Lazy loading**: Defer non-critical components
4. **Image optimization**: Use next/image component

### Code Optimization

1. **Memoization**: Use useMemo for expensive calculations
2. **Debouncing**: Debounce search inputs
3. **Code splitting**: Dynamic imports for heavy components
4. **Bundle analysis**: Check bundle size regularly

---

## 🆘 Troubleshooting

### Common Issues

**Issue**: "API call fails with 401"
- **Fix**: Check if user is logged in, verify token in localStorage

**Issue**: "Form validation not working"
- **Fix**: Ensure Zod schema is correct, check console for errors

**Issue**: "Modal won't close"
- **Fix**: Check isLoading state, ensure onClose is called

**Issue**: "Data not updating after mutation"
- **Fix**: Call refetch() after successful operation

**Issue**: "Console shows unhandled promise rejection"
- **Fix**: Add try-catch around async operations

---

## 📞 Support

### Resources

- **Implementation Docs**: `/specs/001-ux-frontend-integration/`
- **Next Steps Guide**: `/frontend/NEXT_STEPS.md`
- **Phase 8 Checklist**: `/frontend/tests/PHASE8_TESTING_CHECKLIST.md`
- **Error Handling Guide**: `/frontend/tests/manual/error-handling-test-guide.md`

### Quick Commands

```bash
# Start dev server
npm run dev

# Run linter
npm run lint -- --fix

# Run tests
npm run test:e2e

# Build for production
npm run build

# Check types
npx tsc --noEmit

# Lighthouse audit
lighthouse http://localhost:3000/dashboard --view
```

---

## ✅ Quick Checklist (Before Committing)

- [ ] No console errors
- [ ] Linter passes (`npm run lint`)
- [ ] TypeScript compiles (`npm run build`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Manual smoke test completed
- [ ] No hardcoded credentials
- [ ] Comments added for complex logic
- [ ] Unused imports removed

---

**Last Updated**: 2025-10-23
**Version**: 1.0.0
**Status**: Production Ready ✅

# HeroUI Select Component Fix - Voice Field Validation Error

## Issue Identified

The AI agent wizard Step 2 was showing a validation error on the voice field:
- **Error**: "Invalid option: expected one of 'alloy'||'echo'||'fable'||'nova'||'onyx'||'shimmer'"
- **Location**: [frontend/components/agents/agent-wizard-step2.tsx](frontend/components/agents/agent-wizard-step2.tsx)
- **Cause**: Incorrect integration between HeroUI Select component and react-hook-form Controller

## Root Cause

The HeroUI Select component's `selectedKeys` prop expects a **Set** for single-select mode, but the code was passing an **Array**:

```tsx
// INCORRECT - Using array
selectedKeys={field.value ? [field.value] : ["echo"]}

// CORRECT - Using Set
selectedKeys={field.value ? new Set([field.value]) : new Set(["echo"])}
```

Additionally, the Controller had redundant `defaultValue` props that were conflicting with the form's `defaultValues`.

## Solution Implemented

### Files Modified

1. **[frontend/components/agents/agent-wizard-step2.tsx](frontend/components/agents/agent-wizard-step2.tsx)**
   - Fixed `llm_model` Select component (lines 82-122)
   - Fixed `voice` Select component (lines 125-167)
   - Changed `selectedKeys` from array to Set
   - Removed redundant `defaultValue` from Controller

2. **[frontend/components/agents/agent-wizard-step3.tsx](frontend/components/agents/agent-wizard-step3.tsx)**
   - Fixed `turn_detection` Select component (lines 36-52)
   - Changed `selectedKeys` from array to Set
   - Removed redundant `defaultValue` from Controller

### Changes Made

**Before:**
```tsx
<Controller
  name="voice"
  control={control}
  defaultValue="echo"  // REMOVED - Conflicts with form defaultValues
  render={({ field }) => (
    <Select
      selectedKeys={field.value ? [field.value] : ["echo"]}  // WRONG - Array instead of Set
      onSelectionChange={(keys) => {
        const value = Array.from(keys)[0] as string;
        field.onChange(value);
      }}
    >
```

**After:**
```tsx
<Controller
  name="voice"
  control={control}
  // defaultValue removed - uses form's defaultValues instead
  render={({ field }) => (
    <Select
      selectedKeys={field.value ? new Set([field.value]) : new Set(["echo"])}  // CORRECT - Set
      onSelectionChange={(keys) => {
        const value = Array.from(keys)[0] as string;
        field.onChange(value);
      }}
    >
```

## HeroUI Select Component Patterns

### Single-Select Mode (Default)
```tsx
<Controller
  name="fieldName"
  control={control}
  render={({ field }) => (
    <Select
      selectedKeys={field.value ? new Set([field.value]) : new Set(["default"])}
      onSelectionChange={(keys) => {
        const value = Array.from(keys)[0] as string;
        field.onChange(value);
      }}
    >
      <SelectItem key="value1">Label 1</SelectItem>
      <SelectItem key="value2">Label 2</SelectItem>
    </Select>
  )}
/>
```

### Multi-Select Mode
```tsx
<Controller
  name="fieldName"
  control={control}
  render={({ field }) => (
    <Select
      selectionMode="multiple"
      selectedKeys={field.value || []}  // Arrays OK for multi-select
      onSelectionChange={(keys) => {
        const selectedArray = Array.from(keys) as string[];
        field.onChange(selectedArray);
      }}
    >
      <SelectItem key="value1">Label 1</SelectItem>
      <SelectItem key="value2">Label 2</SelectItem>
    </Select>
  )}
/>
```

## Deployment

1. **Development Build**: Changes compiled successfully with `npm run build`
2. **Production Service**: Restarted `livekit-frontend.service`
3. **Status**: ✅ Active and running on https://ai.epic.dm (port 3000)

## Testing Checklist

- [x] Compilation successful with no TypeScript errors
- [x] Production build completed successfully
- [x] Service restarted and running
- [ ] Browser test: Voice field displays selected value correctly
- [ ] Browser test: No validation error on Step 2
- [ ] Browser test: Can complete all 4 wizard steps
- [ ] Browser test: Agent creation successful with voice selection

## Related Files

- Schema: [frontend/lib/schemas/agent-schema.ts](frontend/lib/schemas/agent-schema.ts)
- Voice Constants: [frontend/types/agent.ts](frontend/types/agent.ts)
- Wizard Page: [frontend/app/dashboard/agents/new/page.tsx](frontend/app/dashboard/agents/new/page.tsx)

## References

- HeroUI Select Documentation: https://heroui.com/docs/components/select
- React Hook Form Controller: https://react-hook-form.com/api/usecontroller/controller
- Previous Fix: [AGENT_WIZARD_FIX.md](AGENT_WIZARD_FIX.md) - Step 4 phone assignment

## Notes

- **Single-select** components use `new Set([value])`
- **Multi-select** components use arrays `[value1, value2]`
- Avoid redundant `defaultValue` in Controller when form has `defaultValues`
- HeroUI Select's `onSelectionChange` always returns a Set, convert to array with `Array.from(keys)`

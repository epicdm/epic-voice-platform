# Agent Wizard Layout Redesign - Text Overlap Fix

## Issue Identified

Step 2 of the AI agent wizard had persistent text overlapping issues:
- **Problem**: "System Instructions" label overlapping with textarea content
- **Location**: [frontend/components/agents/agent-wizard-step2.tsx](frontend/components/agents/agent-wizard-step2.tsx)
- **Cause**: HeroUI's complex label positioning system (`labelPlacement="outside"`) conflicting with layout

## Root Cause Analysis

HeroUI/NextUI components use an internal positioning system for labels that:
1. Uses absolute/relative positioning with transforms
2. Can conflict with custom styling and responsive layouts
3. Despite `fix-overlap.css` attempts, the issue persisted
4. The `labelPlacement="outside"` prop doesn't reliably position labels above inputs

## Solution: Manual Label Layout

Redesigned Step 2 to use **manual label placement** instead of relying on HeroUI's label positioning:

### Before (Problematic)
```tsx
<Textarea
  {...register("instructions")}
  label="System Instructions"           // HeroUI's label prop
  labelPlacement="outside"              // Unreliable positioning
  description="Define the agent's..."   // HeroUI's description prop
  isRequired
  classNames={{
    label: "text-sm font-medium...",    // Complex override attempts
    inputWrapper: "!mt-2",              // Fighting with HeroUI
  }}
/>
```

### After (Reliable)
```tsx
<div className="space-y-3">
  <div>
    {/* Manual label - full control */}
    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
      System Instructions <span className="text-red-500">*</span>
    </label>

    {/* HeroUI component without label prop */}
    <Textarea
      {...register("instructions")}
      placeholder="e.g., You are a friendly..."
      isInvalid={!!errors.instructions}
      minRows={5}
      maxRows={12}
      className="w-full"
    />

    {/* Manual error display */}
    {errors.instructions && (
      <p className="text-xs text-red-500 mt-1">{errors.instructions.message}</p>
    )}

    {/* Manual description */}
    <p className="text-xs text-gray-500 mt-1.5">
      Define the agent's personality, knowledge, and behavior
    </p>
  </div>
</div>
```

## Key Changes

### 1. **Removed HeroUI Label Props**
- ❌ `label` prop removed
- ❌ `labelPlacement` prop removed
- ❌ `description` prop removed
- ❌ Complex `classNames.label` overrides removed

### 2. **Manual HTML Structure**
- ✅ Standard `<label>` elements above each field
- ✅ Manual `<p>` elements for descriptions below fields
- ✅ Manual error message display with conditional rendering
- ✅ Simple, predictable CSS spacing with Tailwind

### 3. **Improved Spacing**
```tsx
<div className="space-y-8">  {/* Changed from space-y-6 */}
  {/* Better visual separation between form sections */}
  <div className="space-y-3">  {/* Consistent internal spacing */}
```

### 4. **Better Contrast**
```tsx
{/* Before */}
className="text-gray-700 dark:text-gray-300"

{/* After */}
className="text-gray-900 dark:text-gray-100"
```

### 5. **Consistent Required Indicator**
```tsx
<label>
  Field Name <span className="text-red-500">*</span>
</label>
```

## Files Modified

### [frontend/components/agents/agent-wizard-step2.tsx](frontend/components/agents/agent-wizard-step2.tsx)
**Complete redesign** with manual label layout:
- ✅ System Instructions field
- ✅ LLM Model select
- ✅ Voice select
- ✅ Temperature slider
- ✅ Character counter
- ✅ Tips section with dark mode support

## Benefits of This Approach

### 1. **Reliability**
- No more overlapping text issues
- Predictable layout across browsers
- No fighting with UI library positioning

### 2. **Simplicity**
- Simple HTML structure
- Easy to understand and maintain
- No complex CSS overrides needed

### 3. **Flexibility**
- Full control over spacing and layout
- Easy to adjust margins and padding
- No vendor lock-in to HeroUI's label system

### 4. **Maintainability**
- Clear separation of concerns
- Standard HTML patterns
- Less reliance on library-specific behavior

## Pattern for Other Components

This pattern can be applied to any HeroUI form field with overlapping issues:

```tsx
{/* ✅ RECOMMENDED PATTERN */}
<div className="space-y-3">
  <div>
    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
      Field Label {required && <span className="text-red-500">*</span>}
    </label>

    <HeroUIComponent
      {...register("fieldName")}
      placeholder="Placeholder text"
      isInvalid={!!errors.fieldName}
      className="w-full"
    />

    {errors.fieldName && (
      <p className="text-xs text-red-500 mt-1">{errors.fieldName.message}</p>
    )}

    {description && (
      <p className="text-xs text-gray-500 mt-1.5">{description}</p>
    )}
  </div>
</div>
```

## When to Use This Pattern

✅ **Use manual labels when:**
- Experiencing text overlap issues
- Need precise control over spacing
- Building forms with consistent layout
- Working with complex layouts

❌ **HeroUI labels might be OK when:**
- Simple, standalone input fields
- No custom styling needed
- Not experiencing overlap issues
- Using HeroUI's default theme exactly

## Alternative: Different UI Library

If HeroUI continues to cause layout issues, consider:

### Material-UI (MUI)
```tsx
import TextField from '@mui/material/TextField';

<TextField
  label="System Instructions"
  multiline
  rows={5}
  required
  error={!!errors.instructions}
  helperText={errors.instructions?.message}
/>
```

### Shadcn/UI (Radix + Tailwind)
```tsx
<div className="space-y-2">
  <Label htmlFor="instructions">System Instructions *</Label>
  <Textarea
    id="instructions"
    placeholder="e.g., You are..."
    className="min-h-[100px]"
  />
  {errors.instructions && (
    <p className="text-sm text-red-500">{errors.instructions.message}</p>
  )}
</div>
```

## Deployment

1. ✅ **Redesigned**: `agent-wizard-step2.tsx` with manual label layout
2. ✅ **Built**: `npm run build` completed successfully
3. ✅ **Deployed**: `livekit-frontend.service` restarted
4. ✅ **Live**: https://ai.epic.dm (port 3000)

## Testing Checklist

- [ ] Browser test: No text overlap in Step 2
- [ ] Browser test: All labels clearly visible
- [ ] Browser test: Proper spacing between fields
- [ ] Browser test: Error messages display correctly
- [ ] Browser test: Dark mode labels have good contrast
- [ ] Browser test: Character counter works
- [ ] Browser test: Form validation works
- [ ] Browser test: Can complete entire wizard

## Related Documentation

- Previous fix attempt: [frontend/app/fix-overlap.css](frontend/app/fix-overlap.css)
- Select validation fix: [HEROUI_SELECT_FIX.md](HEROUI_SELECT_FIX.md)
- Wizard Step 4 fix: [AGENT_WIZARD_FIX.md](AGENT_WIZARD_FIX.md)

## Lessons Learned

1. **Don't fight the library**: When a UI library's positioning system causes persistent issues, use manual layout instead
2. **Keep it simple**: Standard HTML + Tailwind is often more reliable than complex component props
3. **Control spacing manually**: Use `space-y-*` utilities for predictable vertical rhythm
4. **Test early**: Layout issues are easier to fix before adding complex functionality

## Future Considerations

If HeroUI causes more layout issues in other components:
1. Apply this manual label pattern consistently
2. Consider creating a custom form field wrapper component
3. Evaluate switching to a different UI library (MUI, Shadcn/UI)
4. Document patterns that work and patterns that don't

# Agent Wizard Logic - Key Functionality Extract

## Source: `/opt/livekit1/frontend/components/agents/agent-wizard-step4.tsx`

### 1. **Inline Phone Number Provisioning** ⭐ KEY FEATURE

**Location**: Lines 46-75

```typescript
const handleProvisionNumber = async () => {
  setIsProvisioning(true);
  try {
    const result = await api.post<{ phoneNumber: PhoneNumber }>(
      "/api/user/phone-numbers/provision",
      { country_code: selectedCountry }
    );

    toast.success("Phone number provisioned successfully!", {
      description: `${formatPhoneNumber(result.phoneNumber.phone_number)} is now available`,
    });

    await refreshPhoneNumbers();

    // Auto-select newly provisioned number (REPLACE previous selection)
    setValue("phone_number_ids", [result.phoneNumber.id]);

    onClose();
  } catch (error) {
    // Error handling with isApiError helper
  }
};
```

**UI Components**:
- "Provision New Number" button with Plus icon (line 83-90)
- Modal with country selection RadioGroup (lines 291-369)
- Default country: Dominica ("DM")
- Auto-select after provisioning

### 2. **Smart Phone Filtering Logic**

**Location**: Lines 36-43

```typescript
const availablePhones = phoneNumbers.filter(phone => {
  // Always include if currently selected (edit mode)
  if (selectedPhoneIds.includes(phone.id)) {
    return true;
  }
  // Otherwise only show unassigned phones
  return canAssignPhoneNumber(phone);
});
```

**Why Important**: Supports both create and edit modes

### 3. **Single Selection Mode**

**Location**: Lines 104-121

```typescript
<Select
  selectionMode="single"  // One number per agent
  selectedKeys={field.value || []}
  onSelectionChange={(keys) => {
    const selectedArray = Array.from(keys) as string[];
    field.onChange(selectedArray);
  }}
/>
```

### 4. **Visual Enhancements**

**Selected Phone Preview Card** (lines 174-207):
- Shows selected phone with country flag
- Provider information
- "Will be assigned" chip

**Empty State** (lines 210-246):
- Icon + message when no phones available
- Link to phone numbers page
- Clear call-to-action

**Configuration Summary** (lines 260-288):
- Reviews all agent settings
- Shows phone assignment status

**Helpful Tips** (lines 249-257):
- User guidance about phone assignment rules

### 5. **Dependencies**

**Helper Functions**:
- `formatPhoneNumber(phone)` - Display formatting
- `getCountryFlag(countryCode)` - Flag emojis
- `canAssignPhoneNumber(phone)` - Check if assignable

**Types**:
- `PhoneNumber` type from `@/types/phone-number`
- `AgentCreate` schema from `@/lib/schemas/agent-schema`

**Hooks**:
- `usePhoneNumbers()` - Fetch and refresh phone numbers
- `useFormContext<AgentCreate>()` - React Hook Form
- `useDisclosure()` - HeroUI modal control

**API**:
- POST `/api/user/phone-numbers/provision` with `{ country_code }`
- Returns `{ phoneNumber: PhoneNumber }`

---

## Implementation Plan

1. **Check current agent creation flow** - See what exists
2. **Add provisioning modal** - Copy modal component
3. **Add handleProvisionNumber** - Copy provisioning logic
4. **Update phone selection UI** - Add filtering + preview
5. **Add visual enhancements** - Summary, tips, empty states
6. **Test provisioning flow** - Verify end-to-end

## Critical Success Factors

✅ Inline provisioning (not separate page)
✅ Auto-select after provision
✅ Country selection (Dominica default)
✅ Single number per agent
✅ Visual feedback with toast
✅ Error handling

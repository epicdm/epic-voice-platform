# Complete Funnel Types Analysis

**Date**: 2025-11-16
**Purpose**: Map ALL funnel types, node types, and their specific configuration needs

---

## 📊 Funnel Types (Trigger Types)

### 1. **Landing Page Funnel** (`landing_page`)
**Use Case**: Leads submit a form on your website
**Entry Point**: Form submission
**Data Available**:
- `contact.name` - Lead's name
- `contact.email` - Email address
- `contact.phone` - Phone number
- `contact.company` - Company name (if collected)
- `form.*` - Any custom form fields

**Common Templates**:
- Landing Page Follow-up (CALL → EMAIL → SMS)
- Simple Welcome Call

**Example Flow**:
```
Landing Page Submit → CALL lead → DELAY 1hr → EMAIL → DELAY 1day → SMS
```

---

### 2. **Lead Created Funnel** (`lead_created`)
**Use Case**: Automatically engage new leads added to system
**Entry Point**: New lead created (manual or import)
**Data Available**:
- `lead.name`
- `lead.email`
- `lead.phone`
- `lead.source` - Where lead came from
- `lead.status` - new/contacted/qualified
- `lead.tags` - Array of tags
- `lead.custom_fields.*`

**Common Templates**:
- Lead Qualification (CALL → CONDITION → branch)
- Landing Page Follow-up
- Simple Welcome

**Example Flow**:
```
New Lead Added → CALL to qualify → CONDITION on interest →
  IF interested: SMS + Webhook to CRM
  ELSE: Nurture email sequence
```

---

### 3. **API Trigger Funnel** (`api_trigger`)
**Use Case**: Start funnel from your own application/backend
**Entry Point**: API call to `/api/funnels/{id}/start`
**Data Available**:
- Custom payload (whatever you send in request)
- `contact.*` fields
- `custom.*` fields

**Common Templates**:
- Lead Qualification
- Event Reminder
- Abandoned Cart
- Simple Welcome
- Blank Canvas

**Example Flow**:
```
Your App → API Call → DELAY 2hrs → EMAIL cart reminder → DELAY 1day → CALL → SMS discount
```

---

### 4. **Scheduled Funnel** (`scheduled`)
**Use Case**: Recurring campaigns, event reminders
**Entry Point**: Cron schedule (daily, weekly, specific date)
**Data Available**:
- `contact.*` from target list
- `schedule.run_date`
- `schedule.iteration` - Which run is this (1st, 2nd, etc.)

**Common Templates**:
- Event Reminder
- Blank Canvas

**Example Flow**:
```
7 Days Before Event → EMAIL reminder → DELAY 5days → SMS → DELAY 20hrs → CALL
```

---

### 5. **Webhook Trigger Funnel** (`webhook_trigger`)
**Use Case**: External service triggers funnel (Zapier, Stripe, Shopify)
**Entry Point**: POST to webhook URL
**Data Available**:
- `webhook.payload.*` - Full webhook body
- `contact.*` if provided
- Service-specific fields (e.g., `stripe.charge_id`, `shopify.order_id`)

**Common Templates**:
- Abandoned Cart
- Blank Canvas

**Example Flow**:
```
Shopify Cart Abandoned → DELAY 2hrs → EMAIL → DELAY 1day → CALL → SMS with discount
```

---

## 🎨 Node Types & Configuration Needs

### 1. **CALL Node** ⭐ CRITICAL FIX NEEDED

**Used In**: All funnel types
**Purpose**: Make AI voice call to contact

**Current Config** (BROKEN):
```tsx
<Input
  label="Agent Config ID"
  value={localConfig.agent_config_id || ""}
  // User has to manually type UUID - TERRIBLE UX
/>
```

**Required Config** (FIXED):
```tsx
<Select
  label="AI Agent"
  description="Choose which AI agent makes this call"
>
  {agents.map(agent => (
    <SelectItem key={agent.id}>
      {agent.name} ({agent.phone_number}, voice: {agent.voice})
    </SelectItem>
  ))}
</Select>

<AgentPreview agent={selectedAgent} />
// Shows: Caller ID, Voice, Instructions preview

<Input
  label="Max Duration (seconds)"
  type="number"
  value={localConfig.max_duration || 300}
/>
```

**Validation**:
- ✅ Agent exists
- ✅ Agent has phone number assigned
- ✅ Agent is active/deployed
- ⚠️ Warn if agent hasn't been tested

**Variables Available in Agent Instructions**:
- `{{contact.name}}` - Personalize greeting
- `{{contact.email}}`
- `{{contact.phone}}`
- `{{lead.source}}` - Mention how you found them
- Any custom fields

**Example Instructions**:
```
You are calling {{contact.name}} who submitted a form on our website.
They are interested in {{contact.product_interest}}.
Be friendly and ask about their needs.
```

---

### 2. **EMAIL Node** ⭐ CRITICAL FIX NEEDED

**Used In**: All funnel types
**Purpose**: Send personalized email

**Current Config** (BASIC):
```tsx
<Input label="Subject" />
<Textarea label="Body" />
```

**Required Config** (ENHANCED):
```tsx
<Input
  label="Subject"
  placeholder="Thanks for your interest, {{contact.name}}!"
  description="Use {{contact.*}} variables for personalization"
/>

<Textarea
  label="Email Body (Plain Text)"
  placeholder={`Hi {{contact.name}},\n\nThanks for reaching out...`}
  minRows={8}
/>

<Textarea
  label="HTML Body (Optional)"
  description="Advanced: Add rich formatting"
  classNames={{ input: "font-mono" }}
/>

<div className="variable-helper">
  <strong>Available Variables:</strong>
  <code>{{contact.name}}</code>
  <code>{{contact.email}}</code>
  <code>{{contact.phone}}</code>
  <code>{{contact.company}}</code>
</div>

<Button onPress={showPreview}>Preview Email</Button>
```

**Variables by Funnel Type**:

| Funnel Type | Available Variables |
|-------------|-------------------|
| Landing Page | `{{contact.*}}`, `{{form.*}}` |
| Lead Created | `{{lead.*}}`, `{{contact.*}}` |
| API Trigger | `{{contact.*}}`, `{{custom.*}}` |
| Scheduled | `{{contact.*}}`, `{{schedule.*}}` |
| Webhook | `{{webhook.payload.*}}`, `{{contact.*}}` |

**Template Examples**:

**Landing Page**:
```
Subject: Thanks for downloading our guide, {{contact.name}}!
Body:
Hi {{contact.name}},

Thanks for downloading "{{form.guide_title}}".

We noticed you're interested in {{form.industry}}. Our team
specializes in helping {{form.industry}} companies...
```

**Lead Created**:
```
Subject: Welcome to {{company.name}}, {{lead.name}}!
Body:
Hi {{lead.name}},

Thanks for becoming a lead! You were referred by {{lead.source}}.

Your account status: {{lead.status}}
```

**Abandoned Cart**:
```
Subject: You left {{webhook.payload.item_count}} items in your cart
Body:
Hi {{contact.name}},

We noticed you left these items:
{{webhook.payload.items}}

Complete your purchase now!
```

---

### 3. **SMS Node** ⭐ IMPORTANT FIX NEEDED

**Used In**: All funnel types
**Purpose**: Send text message

**Current Config** (BASIC):
```tsx
<Textarea
  label="Message"
  maxLength={160}
/>
```

**Required Config** (ENHANCED):
```tsx
<Textarea
  label="Message"
  placeholder="Hi {{contact.name}}, thanks for your interest!"
  maxLength={160}
  description={`${message.length}/160 characters`}
/>

<div className="variable-helper">
  <strong>Available Variables:</strong>
  <code>{{contact.name}}</code>
  <code>{{contact.phone}}</code>
</div>

<div className={message.length > 160 ? "text-red-600" : "text-gray-600"}>
  {message.length > 160 ?
    "⚠️ Message too long! Will be split into multiple SMS." :
    `${160 - message.length} characters remaining`
  }
</div>

<Button onPress={showPreview}>Preview SMS</Button>
```

**SMS Templates by Funnel Type**:

**Landing Page**:
```
Hi {{contact.name}}! Thanks for your interest. Check your email for next steps.
```

**Event Reminder**:
```
Reminder: {{event.name}} is tomorrow at {{event.time}}. See you there!
```

**Abandoned Cart**:
```
Hi! You left items in your cart. Complete your purchase and get 10% off: {{cart.link}}
```

---

### 4. **DELAY Node** ✅ Already Good

**Used In**: All funnel types
**Purpose**: Wait before proceeding

**Current Config** (GOOD):
```tsx
<Input
  label="Duration (seconds)"
  type="number"
  value={duration}
  description="How long to wait (e.g., 3600 = 1 hour)"
/>
```

**Helpful Presets to Add**:
```tsx
<div className="quick-presets">
  <Button size="sm" onPress={() => setDuration(1800)}>30 min</Button>
  <Button size="sm" onPress={() => setDuration(3600)}>1 hour</Button>
  <Button size="sm" onPress={() => setDuration(86400)}>1 day</Button>
  <Button size="sm" onPress={() => setDuration(604800)}>1 week</Button>
</div>
```

---

### 5. **WEBHOOK Node** ✅ Already Good

**Used In**: Integration-heavy funnels
**Purpose**: Call external API (CRM, Slack, Zapier)

**Current Config** (GOOD):
```tsx
<Input label="URL" placeholder="https://api.example.com/webhook" />
<Select label="Method">
  <SelectItem key="POST">POST</SelectItem>
  <SelectItem key="GET">GET</SelectItem>
  <SelectItem key="PUT">PUT</SelectItem>
</Select>
<Textarea label="Headers (JSON)" classNames={{ input: "font-mono" }} />
```

**Enhancement to Add**:
```tsx
<Select label="Preset">
  <SelectItem key="slack">Slack Notification</SelectItem>
  <SelectItem key="hubspot">HubSpot Create Contact</SelectItem>
  <SelectItem key="zapier">Zapier Webhook</SelectItem>
  <SelectItem key="custom">Custom Webhook</SelectItem>
</Select>

{/* When preset selected, auto-fill common fields */}
```

---

### 6. **CONDITION Node** ⚠️ NEEDS IMPROVEMENT

**Used In**: Lead Qualification, branching funnels
**Purpose**: Route based on data/outcomes

**Current Config** (MANUAL):
```tsx
<Input label="Field" placeholder="contact.email" />
<Select label="Operator">
  <SelectItem key="equals">Equals</SelectItem>
  <SelectItem key="contains">Contains</SelectItem>
</Select>
<Input label="Value" />
```

**Enhanced Config** (VISUAL):
```tsx
<Select label="Condition Type">
  <SelectItem key="call_outcome">Call Outcome</SelectItem>
  <SelectItem key="contact_field">Contact Field</SelectItem>
  <SelectItem key="custom">Custom Expression</SelectItem>
</Select>

{/* If call_outcome */}
<Select label="Call Result">
  <SelectItem key="answered">Call Answered</SelectItem>
  <SelectItem key="no_answer">No Answer</SelectItem>
  <SelectItem key="voicemail">Voicemail</SelectItem>
  <SelectItem key="busy">Busy</SelectItem>
  <SelectItem key="failed">Failed</SelectItem>
</Select>

{/* If contact_field */}
<Select label="Field">
  <SelectItem key="contact.email">Email</SelectItem>
  <SelectItem key="contact.phone">Phone</SelectItem>
  <SelectItem key="contact.tags">Tags</SelectItem>
  <SelectItem key="lead.status">Lead Status</SelectItem>
</Select>

<Select label="Operator">
  <SelectItem key="equals">Equals</SelectItem>
  <SelectItem key="not_equals">Not Equals</SelectItem>
  <SelectItem key="contains">Contains</SelectItem>
  <SelectItem key="greater_than">Greater Than</SelectItem>
</Select>

<Input label="Value" />
```

**Common Conditions by Funnel Type**:

**Lead Qualification**:
- Call outcome == "interested"
- Contact.budget >= 10000
- Lead.status == "qualified"

**Landing Page**:
- Form.product_interest == "Enterprise"
- Contact.company != ""

**Abandoned Cart**:
- Webhook.payload.cart_value > 100
- Webhook.payload.items.length > 1

---

### 7. **END Node** ✅ Perfect

**Used In**: All funnels
**Purpose**: Mark completion

**Config**: None needed

---

## 🎯 Priority Implementation Matrix

### Phase 1: Critical (Blocks All Funnel Types)

| Feature | Affects Funnel Types | Priority | Estimated Time |
|---------|---------------------|----------|---------------|
| **CALL: Agent Selector** | ALL | 🔴 CRITICAL | 2-3 hrs |
| **EMAIL: Template Editor** | ALL except Simple Call | 🔴 CRITICAL | 2-3 hrs |
| **SMS: Template Editor** | Landing Page, Event, Cart | 🔴 CRITICAL | 1-2 hrs |
| **Test Funnel UI** | ALL | 🔴 CRITICAL | 2-3 hrs |
| **Execution Monitor** | ALL | 🔴 CRITICAL | 4-6 hrs |

**Total Phase 1**: 11-17 hours

---

### Phase 2: Important (Enhances Specific Funnel Types)

| Feature | Affects Funnel Types | Priority | Estimated Time |
|---------|---------------------|----------|---------------|
| **CONDITION: Visual Builder** | Lead Qualification | 🟡 IMPORTANT | 3-4 hrs |
| **DELAY: Quick Presets** | ALL with delays | 🟡 IMPORTANT | 30 min |
| **WEBHOOK: Preset Templates** | Integration funnels | 🟡 IMPORTANT | 2 hrs |
| **Variable Intellisense** | ALL | 🟡 IMPORTANT | 2-3 hrs |

**Total Phase 2**: 7.5-9.5 hours

---

### Phase 3: Nice-to-Have (Polish)

| Feature | Priority | Time |
|---------|----------|------|
| Email HTML editor | 🟢 NICE | 4-6 hrs |
| SMS emoji picker | 🟢 NICE | 1 hr |
| Template library | 🟢 NICE | 6-8 hrs |
| A/B testing | 🟢 NICE | 10+ hrs |

---

## 🧪 Testing Scenarios by Funnel Type

### Test 1: Landing Page Follow-up Funnel
```
Setup:
- Agent: "Sales Bot" with phone +17678189267
- Landing page with fields: name, email, phone, product_interest

Steps:
1. Create "Landing Page Follow-up" template
2. Configure CALL node → Select "Sales Bot" ✅
3. Configure EMAIL → Write template with {{contact.name}} ✅
4. Configure SMS → Write message with {{contact.product_interest}} ✅
5. Test with sample contact
6. Verify: CALL made → DELAY → EMAIL sent → DELAY → SMS sent
```

### Test 2: Lead Qualification Funnel
```
Setup:
- Agent: "Qualifier Bot"
- Lead import with status field

Steps:
1. Create "Lead Qualification" template
2. Configure CALL node → Select agent ✅
3. Configure CONDITION → "Call outcome == interested" ✅
4. Configure SMS (hot lead path)
5. Configure EMAIL (nurture path)
6. Test with two leads: one answers interested, one doesn't
7. Verify branching works correctly
```

### Test 3: Event Reminder Funnel
```
Setup:
- Scheduled for 7 days before event
- Event data: name, date, time

Steps:
1. Create "Event Reminder" template
2. Configure EMAIL → "{{event.name}} is in 7 days!" ✅
3. Configure SMS → "Tomorrow: {{event.name}} at {{event.time}}" ✅
4. Configure CALL → Select agent ✅
5. Schedule funnel
6. Verify sequence runs correctly
```

### Test 4: Abandoned Cart Funnel
```
Setup:
- Webhook from Shopify
- Cart data: items, total, customer

Steps:
1. Create "Abandoned Cart" template
2. Configure webhook trigger
3. Configure EMAIL → "You left {{cart.item_count}} items" ✅
4. Configure CALL → Select agent ✅
5. Configure SMS → "Get 10% off: {{cart.checkout_url}}" ✅
6. Trigger via webhook
7. Verify cart data flows through funnel
```

### Test 5: Simple Welcome Call
```
Setup:
- New lead created via API
- Agent ready

Steps:
1. Create "Simple Welcome" template
2. Configure CALL → Select agent ✅
3. Test immediately
4. Verify single call made, funnel completes
```

---

## ✅ Acceptance Criteria for Each Funnel Type

### Landing Page Funnel ✅
- [ ] Can select agent for CALL node
- [ ] Can write email with {{form.*}} variables
- [ ] Can write SMS with contact variables
- [ ] Variables replaced correctly in execution
- [ ] Form data flows through funnel

### Lead Created Funnel ✅
- [ ] Can select agent for CALL node
- [ ] Can use {{lead.*}} variables in email
- [ ] CONDITION node works with lead.status
- [ ] Lead data accessible in all nodes

### API Trigger Funnel ✅
- [ ] Can trigger via `/api/funnels/{id}/start`
- [ ] Custom payload accessible as {{custom.*}}
- [ ] Works with all node types
- [ ] Error handling for invalid payload

### Scheduled Funnel ✅
- [ ] Can set schedule (future feature)
- [ ] {{schedule.*}} variables work
- [ ] Runs on time
- [ ] Handles timezone correctly

### Webhook Trigger Funnel ✅
- [ ] Generates unique webhook URL
- [ ] Receives POST data
- [ ] {{webhook.payload.*}} variables work
- [ ] Integrates with common services (Shopify, Stripe)

---

## 🚀 Implementation Order (Optimized for All Funnel Types)

### Week 1: Foundation (Blocks Everything)
**Day 1-2**: Agent Selector (2-3 hrs)
- Used by: ALL funnel types with CALL nodes
- Blocks: 5/6 templates

**Day 2-3**: Email Template Editor (2-3 hrs)
- Used by: Landing Page, Lead Qual, Event, Cart
- Blocks: 4/6 templates

**Day 3-4**: SMS Template Editor (1-2 hrs)
- Used by: Landing Page, Event, Cart
- Blocks: 3/6 templates

**Day 4-5**: Test UI + Execution Monitor (6-9 hrs)
- Used by: ALL funnel types
- Blocks: User testing for everything

**Total Week 1**: 11-17 hours → ALL funnel types testable

### Week 2: Enhancements (Specific Funnel Types)
**Day 1**: CONDITION Visual Builder (3-4 hrs)
- Unlocks: Lead Qualification funnel
- Better UX for branching

**Day 2**: Variable System Improvements (2-3 hrs)
- Intellisense for all trigger types
- Validation and error messages

**Day 3**: Webhook + Delay Enhancements (2.5 hrs)
- Preset templates for common webhooks
- Quick duration buttons

**Total Week 2**: 7.5-9.5 hours → All funnel types fully polished

---

**Created by**: Claude Code
**Next**: Implement Phase 1 systematically for ALL funnel types

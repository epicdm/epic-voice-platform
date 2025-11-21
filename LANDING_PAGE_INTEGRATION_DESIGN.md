# Landing Page Integration - Complete Design

**Goal**: Close the loop - Funnel creation automatically generates a shareable landing page

---

## User Flow:

### Creating Funnel with Landing Page:

```
1. User creates "Landing Page Funnel" via wizard
   ↓
2. Wizard asks: "What is this landing page for?"
   Input: "Real estate lead generation - free home valuation"
   ↓
3. AI generates landing page in 2 seconds:
   - Headline: "Get Your Free Home Valuation"
   - Subheadline: "Know your home's worth in minutes"
   - Benefits: 3 bullet points
   - CTA: "Get My Free Valuation"
   - Form fields: Name, Phone, Address
   - Colors: Based on industry
   ↓
4. User sees preview → can edit
   ↓
5. Clicks "Create Funnel"
   ↓
6. Success screen shows:

   ✅ Funnel Created Successfully!

   🌐 Your Landing Page:
   https://ai.epic.dm/l/abc-123-xyz

   [📋 Copy URL] [👁️ Preview] [✏️ Edit Page]

   What happens when someone submits:
   1. Lead is created
   2. AI agent calls them within 60 seconds
   3. Follow-up email sent 1 hour later
   4. Follow-up SMS sent 24 hours later
```

---

## Architecture:

### 1. Data Storage (Funnel.settings.landing_page)

```json
{
  "trigger_type": "landing_page",
  "landing_page": {
    "enabled": true,
    "version": "1.0",

    // Content (AI-generated or user-edited)
    "headline": "Get Your Free Home Valuation",
    "subheadline": "Know your home's worth in minutes. Talk to a local expert.",
    "description": "Our AI assistant will call you to discuss your property and provide a detailed market analysis.",

    "benefits": [
      "Fast 5-minute consultation",
      "Local market expertise",
      "No obligation or commitment"
    ],

    "cta_text": "Get My Free Valuation",
    "success_message": "Thanks! We'll call you in the next 60 seconds.",

    // Form configuration
    "collect_fields": [
      {
        "name": "first_name",
        "label": "First Name",
        "type": "text",
        "required": true,
        "placeholder": "John"
      },
      {
        "name": "last_name",
        "label": "Last Name",
        "type": "text",
        "required": true,
        "placeholder": "Smith"
      },
      {
        "name": "phone_number",
        "label": "Phone Number",
        "type": "tel",
        "required": true,
        "placeholder": "(555) 123-4567"
      },
      {
        "name": "email",
        "label": "Email",
        "type": "email",
        "required": true,
        "placeholder": "john@example.com"
      },
      {
        "name": "property_address",
        "label": "Property Address",
        "type": "text",
        "required": false,
        "placeholder": "123 Main St"
      }
    ],

    // Theme & Design
    "theme": {
      "template": "modern",  // modern, minimal, classic, bold
      "primary_color": "#0066FF",
      "accent_color": "#00CC88",
      "background": "gradient", // gradient, solid, image
      "font": "inter" // inter, roboto, playfair, montserrat
    },

    // Advanced (optional)
    "custom_css": null,
    "custom_html": null,  // Full override if user wants
    "og_image": null,  // Social media preview image
    "favicon": null
  }
}
```

### 2. Backend Routes

#### Public Landing Page Renderer
```
GET /l/{funnel-id}

- No auth required
- Looks up funnel by ID
- Checks if landing_page.enabled = true
- Renders HTML page with:
  - Headline, subheadline, benefits
  - Form with configured fields
  - Theme/colors applied
  - Form POSTs to /api/public/funnels/{funnel-id}/submit
- Returns HTML page
```

#### Public Lead Submission
```
POST /api/public/funnels/{funnel-id}/submit

- No auth required (funnel-specific)
- Validates required fields
- Creates lead in database
- Triggers funnel execution
- Returns success/error JSON
- Frontend shows success message
```

#### AI Landing Page Generator
```
POST /api/user/funnels/{funnel-id}/generate-landing-page

Headers: Authorization (user's session)
Body: {
  "purpose": "Real estate lead generation - free home valuation",
  "industry": "real_estate",
  "tone": "professional"  // professional, friendly, urgent
}

Response: {
  "headline": "Get Your Free Home Valuation",
  "subheadline": "...",
  "benefits": [...],
  "cta_text": "...",
  "collect_fields": [...],
  "theme": {...}
}

Uses: OpenAI API to generate content
```

### 3. Frontend Components

#### A. Wizard Step - Landing Page Configuration

**File**: `/frontend/components/funnels/LandingPageWizardStep.tsx`

```typescript
interface LandingPageStepProps {
  funnelName: string;
  funnelDescription: string;
  onConfigured: (config: LandingPageConfig) => void;
}

// Shows:
// 1. "Generate with AI" button
// 2. Loading state while AI generates
// 3. Preview of generated page
// 4. Edit fields (headline, subheadline, etc.)
// 5. Theme selector
// 6. Form field customizer
```

#### B. Public Landing Page Template

**File**: `/frontend/app/l/[funnelId]/page.tsx`

```typescript
// Public route (no auth)
// Fetches funnel landing page config
// Renders beautiful landing page
// Form submits via fetch to public API
// Shows success message after submit
```

#### C. Landing Page Preview Component

**File**: `/frontend/components/funnels/LandingPagePreview.tsx`

```typescript
// Renders landing page in iframe or preview mode
// Used in wizard and funnel details page
```

#### D. Landing Page Editor

**File**: `/frontend/components/funnels/LandingPageEditor.tsx`

```typescript
// Full editor for customizing landing page
// Live preview
// Theme picker
// Form field manager
```

---

## AI Generation Prompt:

```
You are a landing page copywriter. Generate compelling landing page content.

Context:
- Funnel name: {funnel_name}
- Description: {funnel_description}
- Purpose: {user_purpose}
- Industry: {industry}
- Tone: {tone}

Generate:
1. Headline (6-10 words, compelling, benefit-focused)
2. Subheadline (15-25 words, expands on headline)
3. Description (2-3 sentences about what happens next)
4. 3 benefits (short bullet points, focus on value)
5. CTA button text (2-4 words, action-oriented)
6. Success message (what user sees after submitting)
7. Recommended form fields (based on purpose)
8. Primary color (hex code, industry-appropriate)

Return as JSON matching this schema:
{
  "headline": "...",
  "subheadline": "...",
  "description": "...",
  "benefits": ["...", "...", "..."],
  "cta_text": "...",
  "success_message": "...",
  "collect_fields": ["first_name", "last_name", "phone_number", "email"],
  "theme": {
    "primary_color": "#...",
    "accent_color": "#...",
    "template": "modern"
  }
}
```

---

## Implementation Phases:

### Phase 1: MVP (2-3 hours)
- [x] Design schema (using existing settings column)
- [ ] Create AI generator endpoint
- [ ] Add landing page step to wizard
- [ ] Create public landing page route `/l/{funnel-id}`
- [ ] Create public submit endpoint
- [ ] Basic HTML template renderer

**Result**: Working end-to-end flow

### Phase 2: Polish (2-3 hours)
- [ ] Beautiful landing page templates (3 designs)
- [ ] Theme customization
- [ ] Live preview in wizard
- [ ] Success page after submission
- [ ] Analytics (views, submissions)

### Phase 3: Advanced (future)
- [ ] Multiple templates
- [ ] Custom domains (l.yourdomain.com)
- [ ] A/B testing
- [ ] Custom CSS/HTML override
- [ ] Image uploads
- [ ] Video backgrounds
- [ ] Multi-page funnels

---

## Templates:

### Template 1: Modern (Default)
- Full-height hero section
- Gradient background
- Form on right side
- Benefits with icons on left
- Mobile-responsive

### Template 2: Minimal
- Centered layout
- White background
- Simple form
- Clean typography
- Minimal colors

### Template 3: Bold
- Dark background
- High contrast
- Large headlines
- Animated elements
- Modern/tech feel

---

## Example: Real Estate Landing Page

**Input**:
```
Purpose: "Real estate lead generation - free home valuation"
Industry: "real_estate"
Tone: "professional"
```

**AI Generates**:
```json
{
  "headline": "Discover Your Home's True Value",
  "subheadline": "Get a free, no-obligation market analysis from a local expert in under 5 minutes",
  "description": "Our AI assistant will call you immediately to discuss your property. You'll receive a detailed valuation report within 24 hours.",
  "benefits": [
    "Instant response - we call you in under 60 seconds",
    "Local market expertise you can trust",
    "Zero commitment, completely free"
  ],
  "cta_text": "Get My Free Valuation",
  "success_message": "Perfect! Expect a call from us in the next 60 seconds.",
  "collect_fields": ["first_name", "last_name", "phone_number", "email", "property_address"],
  "theme": {
    "primary_color": "#1E40AF",
    "accent_color": "#10B981",
    "template": "modern"
  }
}
```

**Rendered Page**: https://ai.epic.dm/l/real-estate-funnel-123

**When someone submits**:
1. Lead created with all form data
2. Funnel execution starts immediately
3. AI agent calls lead within 60 seconds
4. Follow-up email sent 1 hour later
5. Follow-up SMS sent 24 hours later

---

## URL Structure:

### Public URLs (no auth):
- `https://ai.epic.dm/l/{funnel-id}` - Landing page
- `https://ai.epic.dm/l/{funnel-id}/preview` - Preview mode (shows sample data)
- `https://ai.epic.dm/l/{funnel-id}/qr` - QR code image

### Authenticated URLs:
- `/dashboard/funnels/{id}` - Funnel details (shows landing page URL)
- `/dashboard/funnels/{id}/landing-page` - Edit landing page
- `/dashboard/funnels/{id}/analytics` - Landing page analytics

---

## Analytics Tracking:

Add to funnel settings:
```json
{
  "landing_page": {
    "analytics": {
      "total_views": 1234,
      "total_submissions": 87,
      "conversion_rate": 0.0705,
      "last_view": "2025-11-16T12:34:56Z",
      "last_submission": "2025-11-16T12:30:00Z"
    }
  }
}
```

Track in database:
- Page views (increment on each load)
- Form submissions (increment on submit)
- Conversion rate (submissions / views)
- Time to submit (how long on page before submitting)

---

## Success Metrics:

User creates funnel in 3 minutes:
1. ✅ Name: "Real Estate Valuation"
2. ✅ Template: "Landing Page Follow-up"
3. ✅ Agent: "Sarah - Real Estate Expert"
4. ✅ Email: Configured
5. ✅ SMS: Configured
6. ✅ **Landing Page: AI-generated in 2 seconds**
7. ✅ **Get URL: https://ai.epic.dm/l/abc-123**

User shares URL → Lead submits → Funnel executes → **CLOSED LOOP!**

---

## Priority Implementation Order:

1. **Backend**:
   - [ ] AI generator endpoint (uses OpenAI)
   - [ ] Public landing page route renderer
   - [ ] Public submit endpoint
   - [ ] Update funnel settings on save

2. **Frontend**:
   - [ ] Add landing page step to wizard
   - [ ] AI generation UI
   - [ ] Preview component
   - [ ] Public landing page template
   - [ ] Success URL display

3. **Testing**:
   - [ ] Create funnel with landing page
   - [ ] Visit public URL
   - [ ] Submit form
   - [ ] Verify funnel triggers
   - [ ] Verify lead created

---

**Estimated Time**: 4-6 hours for MVP
**Impact**: MASSIVE - closes the loop completely!

Ready to build this? 🚀

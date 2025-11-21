# 🚀 Epic Voice App - Migration Plan
## Integrating Production Auth, Trials & LiveKit Rooms

---

## 📊 **Current State Analysis**

### **What's Good (Keep)**
✅ **Landing Page** - Strong conversion-focused copy
  - "Build AI Voice Agents in Minutes, Not Months"
  - Clear CTAs, social proof
  - Clean hero design

✅ **Agent Builder** - Comprehensive AI agent configuration
  - Multiple LLM providers
  - Voice customization
  - Greeting configuration

✅ **Dashboard** - Good analytics and metrics
  - Usage stats
  - Call logs
  - Phone number management

✅ **LiveKit Integration** - Already has voice agent backend

### **What Needs Upgrade (Replace)**
❌ **Auth System** - Custom email/password
  → Replace with NextAuth + Google OAuth (better conversion!)

❌ **Database** - SQLite (`voice_agents.db`)
  → Migrate to PostgreSQL + Prisma (production-ready)

❌ **No Trial System** - No gating or subscription management
  → Add 14-day trial with Stripe integration

❌ **No Public/Private Split** - Everything requires login
  → Add landing page as public, gate app features

❌ **No Organization Model** - Direct user → agents
  → Add org structure for team/enterprise

---

## 🎯 **Migration Strategy: Best of Both Worlds**

### **Phase 1: Foundation (Database & Auth)**
**Goal:** Switch to production-grade auth and database

**Actions:**
1. ✅ **Setup Prisma + PostgreSQL** (DONE in epic-voice-app)
2. **Migrate database schema:**
   ```
   SQLite (voice_agents.db)         →  PostgreSQL (epic_voice_db)
   ├─ users table                   →  User + Account (NextAuth)
   ├─ agent_configs                 →  Keep + link to Organization
   ├─ call_logs                     →  Keep + enhance with RoomSession
   ├─ phone_mappings                →  Keep
   ├─ sip_configs                   →  Keep
   └─ NEW: organizations, subscriptions, memberships, usage
   ```

3. **Replace Auth System:**
   ```
   OLD: Custom email/password          NEW: NextAuth + Google OAuth
   ├─ AuthContext → AuthProvider      →  next-auth SessionProvider
   ├─ /api/auth/*                     →  /api/auth/[...nextauth]
   ├─ Cookie-based                    →  JWT sessions
   └─ Manual user management          →  Auto user/org creation on signup
   ```

4. **Add trial logic:**
   - New user → Auto-create Organization
   - Auto-create Subscription (status: "trialing", 14 days)
   - Middleware enforces trial/subscription on /app/* routes

### **Phase 2: Page Enhancement (UI/UX)**
**Goal:** Improve conversion and add gated features

**Keep & Enhance:**
- ✅ `/` - Landing (add auth CTA)
- ✅ `/dashboard` - Main app (add trial banner)
- ✅ `/agents` - Agent builder (keep as-is)
- ✅ `/calls` - Call logs (enhance with LiveKit rooms)
- ✅ `/phone-numbers` - Phone management (keep)
- ✅ `/settings` - Settings (enhance with subscription)

**Add New:**
- 🆕 `/auth/signin` - Sign in with Google + email
- 🆕 `/auth/signup` - Sign up flow
- 🆕 `/billing` - Trial status + upgrade
- 🆕 `/account` - Profile + org settings
- 🆕 `/app/room/[id]` - LiveKit voice room UI

**Remove/Consolidate:**
- ❌ `/login` → Replace with `/auth/signin`
- ❌ `/dashboard/marketplace` → Consolidate or remove
- ❌ `/dashboard/api-keys` → Move to `/account`

### **Phase 3: LiveKit Voice Rooms**
**Goal:** Add real-time voice calling with device controls

**Add:**
- Device setup modal (mic/speaker selection)
- Room join/create flow
- Live call UI with mute/unmute
- Participant list
- Call quality indicators
- Session recording/logging

**Integrate with:**
- Existing agent backend
- New RoomSession model for tracking
- Usage metering (minutes)

### **Phase 4: Trial & Billing**
**Goal:** Monetization and subscription management

**Add:**
- Trial countdown banner (persistent)
- "Upgrade" CTA throughout app
- Stripe checkout flow
- Subscription management portal
- Usage limits enforcement

---

## 📋 **Detailed Implementation Steps**

### **Step 1: Install Dependencies in Frontend**
```bash
cd /opt/livekit1/frontend
npm install --legacy-peer-deps \
  next-auth@beta \
  @auth/prisma-adapter \
  @prisma/client \
  prisma \
  bcryptjs \
  @livekit/components-react \
  date-fns
```

### **Step 2: Copy Prisma Schema**
```bash
# Copy from epic-voice-app to frontend
cp /opt/livekit1/epic-voice-app/prisma/schema.prisma \
   /opt/livekit1/frontend/prisma/schema.prisma

# Add existing tables (agent_configs, call_logs, etc.)
# Modify to reference new Organization model
```

### **Step 3: Migrate Data**
```sql
-- Migration script to move data from SQLite → PostgreSQL
-- 1. Export users from SQLite
-- 2. Create Organization for each user
-- 3. Create Subscription (trial) for each org
-- 4. Link agent_configs to organizations
-- 5. Migrate call_logs, phone_mappings, sip_configs
```

### **Step 4: Setup NextAuth**
```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

// On first login:
// 1. Create User
// 2. Create Organization (name: "{user.name}'s Org")
// 3. Create Membership (user → org, role: "owner")
// 4. Create Subscription (status: "trialing", trialEndsAt: +14 days)
```

### **Step 5: Add Middleware**
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  // 1. Check if authenticated (NextAuth session)
  // 2. If not authenticated & accessing /app/* → redirect to /auth/signin
  // 3. If authenticated but trial expired & no active sub:
  //    - Allow /billing, /account
  //    - Block /app/*, /agents, etc.
  //    - Redirect to /billing with toast
  // 4. If authenticated & valid trial/sub → allow all /app/*
}
```

### **Step 6: Update Landing Page**
```tsx
// app/page.tsx
// Keep current copy, enhance CTA:
<Button onClick={() => signIn('google', { callbackUrl: '/dashboard' })}>
  <FcGoogle className="mr-2" />
  Start Free Trial with Google
</Button>

// Add trust indicators:
- "✓ 1,000 free minutes"
- "✓ No credit card required"
- "✓ 14-day trial"
```

### **Step 7: Add Auth Pages**
```tsx
// app/auth/signin/page.tsx
// Prominent: "Continue with Google" button
// Secondary: Email + password form
// Link to: /auth/signup

// app/auth/signup/page.tsx
// Same layout as signin
// On success → Create user + org + trial → redirect to /dashboard
```

### **Step 8: Add Trial Banner**
```tsx
// components/TrialBanner.tsx
// Show at top of /dashboard, /app/*, etc.
// "You're on a free trial — 12 days left. Upgrade to keep using calls."
// Calculate: trialEndsAt - now
// If expired → Show: "Your trial ended. Upgrade to continue."
```

### **Step 9: Add Billing Page**
```tsx
// app/billing/page.tsx
// Show:
// - Trial status (days left or expired)
// - Current plan (Free Trial, Pro, etc.)
// - Usage this period (minutes, calls)
// - "Upgrade to Pro" button → Stripe checkout
// - If subscribed: "Manage Subscription" → Stripe portal
```

### **Step 10: Add LiveKit Room UI**
```tsx
// app/app/room/[id]/page.tsx
// Use @livekit/components-react:
// <LiveKitRoom
//   token={token}
//   serverUrl={LIVEKIT_URL}
//   connect={true}
// >
//   <RoomAudioRenderer />
//   <ControlBar />
//   <ParticipantList />
// </LiveKitRoom>

// Add:
// - Device setup modal (mic/speaker select)
// - Mute/unmute button
// - Disconnect button
// - Call timer
// - Room info (name, participants)
```

### **Step 11: Add Token Endpoint**
```typescript
// app/api/livekit/token/route.ts
import { AccessToken } from 'livekit-server-sdk'

export async function POST(req: Request) {
  // 1. Verify authenticated (NextAuth session)
  // 2. Check trial/subscription valid
  // 3. Get org from session
  // 4. Create AccessToken with room-scoped grants
  // 5. Log RoomSession to database
  // 6. Return token
}
```

### **Step 12: Enhance Existing Pages**
```tsx
// app/agents/page.tsx
// Keep existing agent builder
// Add: "Trial" badge if on trial
// Add: "Upgrade" CTA if near limit

// app/dashboard/page.tsx
// Add: <TrialBanner /> at top
// Keep: Stats, quick actions
// Add: "Start Voice Call" button → /app/room/new

// app/calls/page.tsx
// Keep: Call logs table
// Add: Filter by room/session
// Add: "Join Room" action for active calls
```

---

## 🎨 **Design Decisions**

### **Auth: NextAuth + Google OAuth**
**Why:** 
- ✅ 3x higher conversion with social login
- ✅ No password management hassle
- ✅ Instant signup (one-click)
- ✅ Production-ready, well-maintained
- ✅ Built-in session management

**Implementation:**
- Google as primary (big button)
- Email/password as fallback (smaller link)
- Auto-create org + trial on first login

### **Database: PostgreSQL + Prisma**
**Why:**
- ✅ Production-ready (vs SQLite for dev)
- ✅ Better relations, indexes
- ✅ Type-safe queries with Prisma
- ✅ Easy migrations
- ✅ Scales to millions of users

**Migration:**
- Keep existing tables, add new models
- Link agent_configs to organizations
- Maintain backward compatibility

### **Trial: 14-Day, No Card**
**Why:**
- ✅ Lower friction (no card = higher signups)
- ✅ 14 days enough to see value
- ✅ Can add card requirement later
- ✅ Industry standard (Vapi, Retell do this)

**Enforcement:**
- Middleware blocks /app/* if expired
- Allow /billing, /account always
- Show countdown banner everywhere
- Grace period optional (3 days)

### **Landing Page: Public + Conversion-Focused**
**Why:**
- ✅ Current copy is already strong
- ✅ Just needs better CTAs
- ✅ Add Google login button
- ✅ Keep social proof elements

**Enhancements:**
- Replace "Start Free Trial" → "Start Free Trial with Google"
- Add Google logo/button
- Add "or sign up with email" (smaller)
- Emphasize "No credit card"

### **LiveKit Rooms: Device-First UX**
**Why:**
- ✅ Voice requires mic/speaker setup
- ✅ Users need device controls
- ✅ Visual feedback (waveforms, status)
- ✅ Inspired by Vapi/Retell call UIs

**Features:**
- Device selection modal on first join
- Prominent mute/unmute
- Visual audio levels
- Connection quality indicator
- Participant list (for multi-party)

---

## 🔄 **Data Migration Script**

### **SQLite → PostgreSQL Migration**

```python
# scripts/migrate_database.py
import sqlite3
import psycopg2
from datetime import datetime, timedelta

# 1. Connect to both databases
sqlite_conn = sqlite3.connect('/opt/livekit1/voice_agents.db')
pg_conn = psycopg2.connect('postgresql://postgres:epicvoice2024@localhost:5432/epic_voice_db')

# 2. Migrate users
for row in sqlite_conn.execute('SELECT * FROM users'):
    user_id, email, password_hash, name, created_at = row
    
    # Create User in PostgreSQL
    pg_conn.execute("""
        INSERT INTO users (id, email, password, name, created_at)
        VALUES (%s, %s, %s, %s, %s)
    """, (user_id, email, password_hash, name, created_at))
    
    # Create Organization for user
    org_id = generate_cuid()
    pg_conn.execute("""
        INSERT INTO organizations (id, name, ownerId, createdAt)
        VALUES (%s, %s, %s, %s)
    """, (org_id, f"{name}'s Organization", user_id, created_at))
    
    # Create Membership
    pg_conn.execute("""
        INSERT INTO memberships (userId, organizationId, role)
        VALUES (%s, %s, 'owner')
    """, (user_id, org_id))
    
    # Create Trial Subscription
    trial_ends_at = datetime.now() + timedelta(days=14)
    pg_conn.execute("""
        INSERT INTO subscriptions (organizationId, status, trialEndsAt)
        VALUES (%s, 'trialing', %s)
    """, (org_id, trial_ends_at))

# 3. Migrate agent_configs (link to org)
for row in sqlite_conn.execute('SELECT * FROM agent_configs'):
    # Add organizationId column to link to org
    # Copy all existing fields
    pass

# 4. Migrate call_logs, phone_mappings, sip_configs
# Similar pattern...

pg_conn.commit()
```

---

## ✅ **Acceptance Criteria**

### **Phase 1 Complete When:**
- [ ] User can sign up with Google (one-click)
- [ ] User can sign up with email/password (fallback)
- [ ] First login auto-creates user + org + 14-day trial
- [ ] Database is PostgreSQL with all tables
- [ ] Existing data migrated successfully

### **Phase 2 Complete When:**
- [ ] Landing page (`/`) is public, no auth required
- [ ] "Start Free Trial with Google" CTA works
- [ ] `/app/*` routes require authentication
- [ ] Trial banner shows at top of app (days left)
- [ ] Expired trial redirects to `/billing`

### **Phase 3 Complete When:**
- [ ] User can create/join LiveKit room
- [ ] Device selection (mic/speaker) works
- [ ] Mute/unmute controls work
- [ ] Room shows live participants
- [ ] Sessions logged to database

### **Phase 4 Complete When:**
- [ ] `/billing` shows trial status
- [ ] "Upgrade" button creates Stripe checkout
- [ ] Subscription updates after payment
- [ ] Expired trial blocks app access
- [ ] Active subscription allows unlimited access

---

## 📈 **Expected Impact**

### **Conversion Improvements**
| Metric | Before | After | Impact |
|--------|--------|-------|--------|
| **Signup conversion** | ~10% | ~30% | 🚀 +200% (Google OAuth) |
| **Trial starts** | 0 | 100% | 🎯 All users get trial |
| **Trial → Paid** | N/A | ~5-10% | 💰 Revenue starts |
| **Time to first call** | ~10 min | ~2 min | ⚡ Faster value |

### **Technical Improvements**
- ✅ Production database (PostgreSQL vs SQLite)
- ✅ Proper org/team structure
- ✅ Trial/subscription management
- ✅ Better auth (OAuth + fallback)
- ✅ Usage tracking & metering
- ✅ Scalable to millions of users

### **Sales/Marketing Improvements**
- ✅ Public landing page (SEO, ads)
- ✅ Clear value prop + social proof
- ✅ Frictionless signup (Google)
- ✅ Trial creates urgency
- ✅ Clear upgrade path
- ✅ Professional polish (Vapi/Retell level)

---

## 🚀 **Next Steps**

1. **Approve this plan** ✋
2. **Start Phase 1:** Auth + Database migration
3. **Test with existing users:** Ensure no disruption
4. **Roll out Phase 2:** Enhanced pages + trial gating
5. **Launch Phase 3:** LiveKit rooms UI
6. **Enable Phase 4:** Billing + subscriptions

**Timeline Estimate:**
- Phase 1 (Foundation): 2-4 hours
- Phase 2 (Pages): 2-3 hours  
- Phase 3 (LiveKit): 1-2 hours
- Phase 4 (Billing): 1-2 hours
- **Total: 6-11 hours**

---

**Ready to start Phase 1?** Let's migrate to production-grade auth and database! 🚀

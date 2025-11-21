# Epic Voice Suite - System Architecture

**Last Updated**: October 29, 2025
**Version**: 1.0
**Status**: Production Ready (75-80% Complete)

---

## 📐 High-Level Architecture

Epic Voice Suite is a **multi-tenant SaaS platform** for building and deploying AI-powered voice agents with real-time telephony integration.

### Multi-Tenant Architecture Model

**Tenant Isolation Strategy**: Database-level isolation via `userId` scoping
- Single database instance with row-level tenant filtering
- All queries enforce `WHERE userId = :current_user_id`
- Foreign key constraints maintain data integrity per tenant
- White-label support via `partners` and `partner_subdomains` tables

### System Layers

```
┌──────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                             │
│  Next.js 15.5.6 (React 19) + HeroUI + TailwindCSS                   │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │  User Dashboard│  │ Admin Dashboard│  │ White Label UI │        │
│  │  (TypeScript)  │  │  (TypeScript)  │  │ (Custom Brand) │        │
│  └────────────────┘  └────────────────┘  └────────────────┘        │
│  Features: Agent Builder, Campaign Manager, Call Logs, Analytics    │
└──────────────────────────────────────────────────────────────────────┘
                                ↕ HTTP/REST (JSON)
┌──────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                              │
│  Flask 3.1.2 Backend API (Python 3.12) + SQLAlchemy 2.x            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  User API    │  │  Webhook API │  │  Campaign    │             │
│  │  (CRUD)      │  │  (Events)    │  │  Engine      │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│  Authentication: Flask-Login + NextAuth.js (Google OAuth)            │
│  Authorization: RBAC with userId scoping on all queries              │
└──────────────────────────────────────────────────────────────────────┘
                                ↕ SQL (Parameterized Queries)
┌──────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                   │
│  PostgreSQL 16 Database (Single Instance, Multi-Tenant)             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Core Tables:                                                  │   │
│  │ • users (tenant root)                                        │   │
│  │ • agent_configs (userId FK) • call_logs (userId FK)         │   │
│  │ • campaigns (userId FK)     • leads (campaignId FK)         │   │
│  │ • phone_number_pool (userId FK, assignment)                 │   │
│  │ • partners (white-label)    • partner_subdomains            │   │
│  │ • livekit_call_events (idempotency tracking)                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  Indexes: userId, outcome, createdAt, status for fast queries       │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                      REAL-TIME VOICE LAYER                            │
│  LiveKit Cloud + LiveKit Agents Framework (Python 3.12)             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  Agent       │  │  Voice       │  │  Tool        │             │
│  │  Runtime     │  │  Pipeline    │  │  Execution   │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│  STT: Deepgram Nova-2 | LLM: OpenAI GPT-4o | TTS: OpenAI TTS      │
│  Features: Turn Detection, Interruption Handling, Function Calling   │
│  Agent Routing: Room name → userId → agent_config lookup            │
└──────────────────────────────────────────────────────────────────────┘
                                ↕ SIP/RTP (Audio Streams)
┌──────────────────────────────────────────────────────────────────────┐
│                       TELEPHONY LAYER                                 │
│  Magnus Billing SIP Gateway + LiveKit SIP Trunks                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  Inbound     │  │  Outbound    │  │  DID         │             │
│  │  Trunk       │  │  Trunk       │  │  Management  │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│  PSTN Connectivity: Magnus → LiveKit → Agent                        │
│  Phone Numbers: Provisioned via Magnus API, assigned to userId      │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL INTEGRATIONS                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  Stripe      │  │  Partner     │  │  Monitoring  │             │
│  │  Billing     │  │  Webhooks    │  │  (Planned)   │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│  Subscription Management, Usage Metering, Event Distribution         │
└──────────────────────────────────────────────────────────────────────┘
```

### Module Boundaries & Responsibilities

#### Frontend Module (Next.js 15 + React 19)
**Boundary**: User interface and client-side logic only
- ✅ **Allowed**: UI rendering, form validation, client state, API calls
- ❌ **Forbidden**: Direct database access, business logic, API key storage

#### Backend API Module (Flask 3.1.2)
**Boundary**: Business logic and orchestration
- ✅ **Allowed**: Database queries (with userId filtering), external API calls, webhook processing
- ❌ **Forbidden**: Heavy compute, real-time audio processing, long-running tasks

#### Voice Workers Module (LiveKit Agents)
**Boundary**: Real-time conversation handling
- ✅ **Allowed**: Audio processing, LLM inference, tool execution during calls
- ❌ **Forbidden**: Database writes (except tool results), billing logic, user management

#### Webhook Service Module
**Boundary**: Asynchronous event processing
- ✅ **Allowed**: Event validation, idempotency checks, transactional updates
- ❌ **Forbidden**: Synchronous API calls during webhook processing

#### Campaign Engine Module
**Boundary**: Automated outbound calling
- ✅ **Allowed**: Lead management, call scheduling, outcome tracking
- ❌ **Forbidden**: Real-time call control (handled by LiveKit)

---

## 🏗️ Module Architecture

### 1. Frontend Module (Next.js)

**Location**: `/frontend` directory
**Framework**: Next.js 15.5.6 with React 19
**UI Library**: HeroUI (NextUI fork)
**Authentication**: NextAuth.js with Google OAuth

#### Key Components:
- **Dashboard** (`/dashboard`): Main user interface
- **Agent Builder** (`/agents`): 4-step wizard for creating voice agents
- **Phone Management** (`/phone-numbers`): DID provisioning and assignment
- **Call Logs** (`/calls`): Call history and analytics
- **Campaign Manager** (`/campaigns`): Outbound campaign automation
- **Analytics** (`/analytics`): Usage metrics and insights
- **Settings** (`/settings`): User preferences and API keys
- **Billing** (`/billing`): Stripe integration for subscriptions

**State Management**: React Context + Server Components
**Styling**: TailwindCSS 3.x + HeroUI theme system

**Boundaries**:
- ✅ User interface and interactions only
- ✅ Form validation and client-side state
- ❌ No direct database access (goes through API)
- ❌ No business logic (handled by backend)

---

### 2. Backend Module (Flask)

**Location**: `/opt/livekit1/user_dashboard.py` (main app)
**Framework**: Flask 3.1.2
**ORM**: SQLAlchemy 2.x
**Authentication**: Flask-Login + session management

#### API Endpoints:

**User Management**:
- `POST /login` - User authentication
- `POST /signup` - New user registration
- `GET /api/user/profile` - Get user profile
- `POST /api/user/logout` - End session

**Agent Management**:
- `GET /api/user/agents` - List user's agents
- `POST /api/user/agents` - Create new agent
- `PUT /api/user/agents/:id` - Update agent
- `DELETE /api/user/agents/:id` - Delete agent
- `POST /api/user/agents/:id/deploy` - Deploy agent

**Phone Number Management**:
- `GET /api/user/phone-numbers` - List available DIDs
- `POST /api/user/phone-numbers/assign` - Assign DID to agent
- `POST /api/user/phone-numbers/release` - Release DID

**Call Management**:
- `GET /api/user/calls` - List call logs
- `POST /api/user/calls/outbound` - Initiate outbound call
- `POST /api/user/calls/test-outbound` - Test call functionality

**Campaign Management**:
- `GET /api/user/campaigns` - List campaigns
- `POST /api/user/campaigns` - Create campaign
- `POST /api/user/campaigns/:id/start` - Start campaign
- `POST /api/user/campaigns/:id/stop` - Stop campaign

**Webhook Endpoints**:
- `POST /api/webhooks/livekit` - LiveKit event webhooks
- `POST /api/webhooks/sip-inbound` - Inbound SIP call webhooks

**Boundaries**:
- ✅ Business logic and orchestration
- ✅ Database access via SQLAlchemy
- ✅ External API integration (LiveKit, Magnus, Stripe)
- ❌ No heavy compute (offload to workers)
- ❌ No real-time audio processing (handled by agents)

---

### 3. Real-Time Voice Module (LiveKit Agents)

**Location**: `/opt/livekit1/agents/tst0002/agent.py`
**Framework**: LiveKit Agents 1.x (Python)
**Voice Pipeline**: STT → LLM → TTS

#### Voice Stack:
- **Speech-to-Text**: Deepgram Nova-2
- **Large Language Model**: OpenAI GPT-4o / GPT-4o-mini
- **Text-to-Speech**: OpenAI TTS (Alloy, Echo, Fable, Nova, Onyx, Shimmer)
- **Turn Detection**: Semantic model (custom) or VAD-based
- **VAD**: Silero VAD
- **Noise Cancellation**: Built-in LiveKit filters

#### Agent Lifecycle:
1. **Room Join**: Agent joins LiveKit room when call connects
2. **Configuration Load**: Loads agent config from database via `db_config.py`
3. **Voice Pipeline Init**: Initialize STT/LLM/TTS with agent settings
4. **Conversation Loop**:
   - Listen (STT) → Understand (LLM) → Speak (TTS)
   - Handle interruptions
   - Execute tool calls if configured
5. **Room Leave**: Clean up on call end

#### Dynamic Routing:
- **Inbound**: Extract DID from room prefix → Load agent config
- **Outbound**: Parse `agent_config_id` from room name → Load config
- **Fallback**: Use default tst0002 configuration if lookup fails

**Boundaries**:
- ✅ Real-time audio processing only
- ✅ LLM conversation handling
- ✅ Tool/function calling during conversation
- ❌ No database writes (except tool results)
- ❌ No billing logic (tracked by backend)

---

### 4. Telephony Integration Module

**Components**:
- **Magnus Billing**: SIP provider for PSTN connectivity
- **LiveKit SIP Trunks**: Inbound/outbound SIP trunk management
- **Phone Number Manager** (`phone_number_manager.py`): DID provisioning

#### Call Flow - Inbound:
```
PSTN → Magnus DID → Magnus SIP User → LiveKit Inbound Trunk
  → LiveKit Room (sip-{phone_digits}__unique_id)
  → Agent Joins → Conversation
```

#### Call Flow - Outbound:
```
Backend API → LiveKit SIP Participant API
  → LiveKit Outbound Trunk → Magnus SIP Account
  → Magnus Route → PSTN
```

**Boundaries**:
- ✅ PSTN call routing and connectivity
- ✅ DID provisioning and management
- ✅ SIP account configuration
- ❌ No call content processing (handled by agents)
- ❌ No call analytics (handled by backend)

---

### 5. Campaign Engine Module

**Location**: `/opt/livekit1/campaign_engine.py`
**Purpose**: Automated outbound calling campaigns

#### Features:
- Lead CSV upload and parsing
- Campaign scheduling and rate limiting
- Concurrent call management (max 5 concurrent)
- Outcome tracking (answered, no_answer, busy, failed)
- Lead status updates (pending, calling, completed, failed)
- Retry logic with configurable attempts

#### Workflow:
1. **Campaign Creation**: User uploads CSV with leads
2. **Lead Import**: Parse and validate lead data
3. **Campaign Start**: Poll for pending leads every 30s
4. **Call Initiation**: Create outbound call via LiveKit API
5. **Outcome Recording**: Update lead status based on call result
6. **Retry Handling**: Retry failed calls up to 3 times

**Boundaries**:
- ✅ Campaign orchestration and scheduling
- ✅ Lead management and status tracking
- ✅ Call initiation via backend API
- ❌ No real-time call control (handled by LiveKit)
- ❌ No conversation content (handled by agents)

---

### 6. Call Outcome Recording Module

**Location**:
- `/opt/livekit1/livekit_webhook_listener.py` (webhook receiver)
- `/opt/livekit1/call_outcome_processor.py` (outcome processing)

#### Features:
- HMAC-SHA256 webhook signature validation
- Event idempotency via `livekit_call_events` table
- Outcome classification (completed, no_answer, busy, failed)
- Transactional updates across 4 tables
- Event emission for downstream systems

#### Call Outcome Logic:
```python
if duration < 3s: outcome = 'failed'
elif duration < 10s: outcome = 'no_answer'
elif duration >= 10s: outcome = 'completed'

# Override based on disconnect reason:
if 'busy' in disconnect_reason: outcome = 'busy'
if 'no_answer' in disconnect_reason: outcome = 'no_answer'
if 'failed' or 'error' in disconnect_reason: outcome = 'failed'
```

**Boundaries**:
- ✅ Webhook event processing only
- ✅ Call outcome classification and persistence
- ✅ Idempotency guarantees
- ❌ No call initiation (handled by backend/campaigns)
- ❌ No real-time call control (handled by LiveKit)

---

### 7. White Label Module

**Location**: `/opt/livekit1/white_label_api_endpoints.py`
**Purpose**: Multi-brand support with custom domains

#### Features:
- Partner domain configuration (custom.domain.com)
- Custom branding (logo, colors, company name)
- Subdomain-based tenant isolation
- Partner webhook endpoints for integrations
- Usage tracking per partner

**Database Models**:
- `partners`: Partner organizations
- `partner_subdomains`: Custom domain mappings
- `partner_webhooks`: Webhook endpoints for events

**Boundaries**:
- ✅ Brand customization and domain routing
- ✅ Partner-level isolation and metrics
- ❌ No functional differences (same features)
- ❌ No separate databases (tenant_id isolation)

---

### 8. Billing & Subscription Module

**Integration**: Stripe Checkout + Billing Portal
**Plans**: Free (10 min), Pro ($29/mo, 500 min), Enterprise ($99/mo, 2000 min)

#### Features:
- Stripe subscription management
- Usage-based metering (call minutes)
- Invoice generation
- Payment method management
- Plan upgrades/downgrades
- Overage billing

**Boundaries**:
- ✅ Payment processing and subscription state
- ✅ Usage tracking and limits
- ❌ No call routing decisions (separate from billing)
- ❌ No feature gating (handled by backend)

---

## 🔄 Data Flow Patterns

### 1. Inbound Call Flow (PSTN → Agent → Outcome)

```mermaid
┌──────────┐         ┌───────────┐         ┌────────────┐         ┌────────────┐
│  PSTN    │  SIP    │  Magnus   │  SIP    │  LiveKit   │  Join   │  Agent     │
│  Caller  ├────────→│  Billing  ├────────→│  Room      │◄────────┤  tst0002   │
└──────────┘         └───────────┘         └────────────┘         └────────────┘
     │                     │                      │                       │
     │ Call +17678189426   │                      │                       │
     ├────────────────────→│                      │                       │
     │                     │ Route via DID config │                       │
     │                     ├─────────────────────→│                       │
     │                     │                      │ Create room:          │
     │                     │                      │ sip-7678189426__xyz   │
     │                     │                      │                       │
     │                     │                      │ Room event            │
     │                     │                      ├──────────────────────→│
     │                     │                      │                       │
     │                     │                      │                       │ Extract DID
     │                     │                      │                       │ from room name
     │                     │                      │                       │
     │                     │                      │                       │ Query DB:
     │                     │                      │                       │ agent_configs
     │                     │                      │◄──────────────────────┤ WHERE phone=DID
     │                     │                      │ Config: voice,         │
     │                     │                      │ instructions, model    │
     │                     │                      ├──────────────────────→│
     │                     │                      │                       │
     │◄────────────────────┴──────────────────────┴───────────────────────┤ Start voice
     │                   RTP Audio Stream (bidirectional)                 │ pipeline
     │◄───────────────────────────────────────────────────────────────────┤ STT→LLM→TTS
     │                                                                     │
     │ Conversation with AI agent (10-60s)                                │
     │◄───────────────────────────────────────────────────────────────────┤
     │                                                                     │
     │ Caller hangs up                                                    │
     ├────────────────────────────────────────────────────────────────────→│
     │                                                                     │ participant_left
     │                                                                     │ event
     │                                                                     │
     │                     ┌───────────┐                                  │
     │                     │  Backend  │                                  │
     │                     │  Webhook  │◄─────────────────────────────────┤ POST /webhooks/
     │                     │  Listener │  HMAC signed event               │ livekit
     │                     └─────┬─────┘                                  │
     │                           │ Validate signature                     │
     │                           │ Check idempotency                      │
     │                           │                                        │
     │                     ┌─────▼─────────┐                             │
     │                     │  Call Outcome │                             │
     │                     │  Processor    │                             │
     │                     └─────┬─────────┘                             │
     │                           │                                        │
     │                           │ BEGIN TRANSACTION:                     │
     │                           │ 1. INSERT livekit_call_events          │
     │                           │ 2. UPDATE call_logs (outcome, duration)│
     │                           │ 3. UPDATE campaign_calls (if campaign) │
     │                           │ 4. UPDATE leads (last_called_at)       │
     │                           │ COMMIT                                 │
     │                           │                                        │
     │                           ▼                                        │
     │                     ┌─────────────┐                               │
     │                     │ PostgreSQL  │                               │
     │                     │ Database    │                               │
     │                     └─────────────┘                               │
     │                                                                    │
     └────────────────────────────────────────────────────────────────────┘

Outcome Classification:
- duration < 3s → 'failed'
- duration < 10s → 'no_answer'
- duration >= 10s → 'completed'
- Override by disconnect_reason: 'busy', 'no_answer', 'failed'
```

### 2. Outbound Call Flow

```
1. User clicks "Call" in dashboard or campaign starts
2. Frontend/Campaign → POST /api/user/calls/outbound
3. Backend validates request and agent permissions
4. Backend queries agent config from database
5. Backend calls LiveKit SIP Participant API:
   - room_name: "campaign-{campaign_id}-{lead_id}-{timestamp}"
   - sip_trunk_id: outbound_trunk_id
   - phone_number: lead phone number
6. LiveKit routes call via Magnus outbound trunk
7. Magnus routes to PSTN
8. Agent joins room on connection
9. Agent parses room_name for agent_config_id
10. Agent loads configuration from DB
11. Conversation proceeds
12. Call end → Webhook → Outcome processing
```

### 3. Agent Creation Flow

```
1. User navigates to /agents/create
2. Step 1: Enter name, description → Store in form state
3. Step 2: Configure instructions, voice, model → Update state
4. Step 3: Advanced settings (VAD, turn detection) → Update state
5. Step 4: Assign phone number → Validate availability
6. User clicks "Create Agent"
7. Frontend → POST /api/user/agents (full config)
8. Backend validates all fields
9. Backend generates agent_id and file path
10. Backend creates agent_configs record in DB
11. Backend updates phone_number_pool with agent assignment
12. Backend returns success → Frontend redirects to /agents
13. Agent is now available for calls (no deployment needed)
```

### 4. Campaign Execution Flow (CSV → Calls → Outcomes)

```mermaid
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   User      │     │   Backend    │     │  Campaign    │     │  LiveKit     │
│  Dashboard  │     │   API        │     │  Engine      │     │  + Agent     │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                    │                     │                     │
       │ Upload CSV         │                     │                     │
       │ (leads.csv)        │                     │                     │
       ├───────────────────→│                     │                     │
       │                    │ Parse CSV:          │                     │
       │                    │ name,phone,email    │                     │
       │                    │                     │                     │
       │                    │ CREATE:             │                     │
       │                    │ - campaigns         │                     │
       │                    │ - leads (100 rows)  │                     │
       │                    │ - campaign_calls    │                     │
       │                    │   (100 records)     │                     │
       │                    │                     │                     │
       │◄───────────────────┤ Campaign ID: abc123 │                     │
       │                    │                     │                     │
       │ Start Campaign     │                     │                     │
       ├───────────────────→│                     │                     │
       │                    │ UPDATE campaigns    │                     │
       │                    │ status='running'    │                     │
       │                    ├────────────────────→│ Poll every 30s      │
       │                    │                     │                     │
       │                    │                     │ Query DB:           │
       │                    │                     │ SELECT * FROM       │
       │                    │                     │ campaign_calls      │
       │                    │                     │ WHERE status=       │
       │                    │                     │ 'pending'           │
       │                    │                     │ LIMIT 5             │
       │                    │                     │                     │
       │                    │                     │ ┌─────────────────┐ │
       │                    │                     │ │ For each lead:  │ │
       │                    │                     │ └─────────────────┘ │
       │                    │                     │                     │
       │                    │◄────────────────────┤ POST /calls/        │
       │                    │ Initiate call:      │ outbound            │
       │                    │ phone=+1234567890   │                     │
       │                    │ agent_id=xyz        │                     │
       │                    │                     │                     │
       │                    │ LiveKit SIP API     │                     │
       │                    ├────────────────────────────────────────→│
       │                    │ CreateSIPParticipant│                     │
       │                    │ room: campaign-     │                     │
       │                    │   abc123-lead001    │                     │
       │                    │                     │                     │
       │                    │ UPDATE:             │                     │
       │                    │ campaign_calls      │                     │
       │                    │ status='calling'    │                     │
       │                    │ agent_id=xyz        │                     │
       │                    │ room_name=...       │                     │
       │                    │                     │                     │
       │                    │                     │                     │◄─┐ Agent joins
       │                    │                     │                     │  │ room, loads
       │                    │                     │                     │  │ config from
       │                    │                     │                     │  │ room_name
       │                    │                     │                     │  │
       │                    │                     │                     │  │ Conversation
       │                    │                     │                     │  │ (15-45s)
       │                    │                     │                     │  │
       │                    │                     │                     │◄─┘
       │                    │                     │                     │
       │                    │                     │                     │ Call ends
       │                    │                     │                     │
       │                    │◄────────────────────────────────────────┤ POST /webhooks/
       │                    │ participant_left    │                     │ livekit
       │                    │ event (HMAC signed) │                     │
       │                    │                     │                     │
       │            ┌───────▼──────┐              │                     │
       │            │ Call Outcome │              │                     │
       │            │ Processor    │              │                     │
       │            └───────┬──────┘              │                     │
       │                    │                     │                     │
       │                    │ BEGIN TRANSACTION:  │                     │
       │                    │ 1. INSERT           │                     │
       │                    │    livekit_call_    │                     │
       │                    │    events           │                     │
       │                    │ 2. UPDATE call_logs │                     │
       │                    │    outcome=         │                     │
       │                    │    'completed'      │                     │
       │                    │    duration=35      │                     │
       │                    │ 3. UPDATE           │                     │
       │                    │    campaign_calls   │                     │
       │                    │    call_outcome=    │                     │
       │                    │    'completed'      │                     │
       │                    │    status='completed'│                    │
       │                    │ 4. UPDATE leads     │                     │
       │                    │    last_called_at=  │                     │
       │                    │    NOW()            │                     │
       │                    │    times_called++   │                     │
       │                    │ COMMIT              │                     │
       │                    │                     │                     │
       │                    │                     │                     │
       │                    │                     │◄────────────────────┤ Continue polling
       │                    │                     │ Next batch of 5     │
       │                    │                     │ pending calls       │
       │                    │                     │                     │
       │                    │                     │ (Repeat until all   │
       │                    │                     │  100 leads called)  │
       │                    │                     │                     │
       │                    │◄────────────────────┤ All leads done      │
       │                    │ UPDATE campaigns    │                     │
       │                    │ status='completed'  │                     │
       │                    │                     │                     │
       │◄───────────────────┤ Campaign Complete   │                     │
       │ Notification       │ 100 calls made      │                     │
       │                    │ 85 completed        │                     │
       │                    │ 10 no_answer        │                     │
       │                    │ 5 failed            │                     │
       │                    │                     │                     │

Campaign Engine Configuration:
- Poll interval: 30 seconds
- Max concurrent calls: 5
- Retry failed calls: Up to 3 times
- Call timeout: 300 seconds
```

### 5. Webhook Event Flow

```
1. LiveKit event occurs (participant_left, room_finished)
2. LiveKit POST → /api/webhooks/livekit
   Headers: X-LiveKit-Signature: <hmac_sha256>
3. Webhook listener validates signature (constant-time comparison)
4. Listener parses event payload
5. Listener checks idempotency:
   - Query: SELECT * FROM livekit_call_events WHERE event_id = ?
   - If exists → Return 200 OK (already processed)
6. Processor extracts room_name, participant_sid, disconnect_reason
7. Processor queries call_logs for matching roomName
8. Processor calculates duration and classifies outcome
9. BEGIN TRANSACTION:
   a. INSERT INTO livekit_call_events (event_id, ...)
   b. UPDATE call_logs SET outcome, durationSeconds, endedAt
   c. UPDATE campaign_calls SET call_outcome, status, completed_at
   d. UPDATE leads SET last_called_at, times_called, last_call_status
   COMMIT
10. Emit event to webhook queue (for partner webhooks)
11. Return 200 OK to LiveKit
```

---

## 🔐 Security Boundaries

### Authentication & Authorization:
- **Frontend**: NextAuth.js session cookies
- **Backend**: Flask-Login session management
- **API**: `@login_required` decorator on all protected routes
- **Database**: User-scoped queries with `userId` filter

### Multi-Tenancy Isolation:
- All database queries scoped by `userId`
- Agent configurations isolated per user
- Call logs and campaigns user-specific
- Phone numbers assigned to single user

### Webhook Security:
- HMAC-SHA256 signature validation (LiveKit webhooks)
- Constant-time signature comparison (timing attack prevention)
- Idempotency via unique event_id constraint

### API Security:
- Rate limiting per plan tier
- Input validation on all endpoints
- SQL injection prevention via SQLAlchemy ORM
- CORS configured for frontend origin only

---

## 📊 Scaling Considerations

### Current Limits:
- **Concurrent Calls**: 5 per campaign (configurable)
- **Campaign Poll Interval**: 30 seconds
- **Database**: Single PostgreSQL instance
- **Agent Runtime**: Single tst0002 agent handles all calls

### Scale Strategy:
1. **Horizontal Agent Scaling**: Deploy multiple agent instances
2. **Database Read Replicas**: Separate read/write traffic
3. **Queue System**: Redis/RabbitMQ for campaign orchestration
4. **CDN**: Static assets and frontend via CDN
5. **Load Balancer**: Multiple Flask backend instances

---

## 🧪 Testing Architecture

### Test Categories:
- **Unit Tests**: `test_call_outcome_system.py` (outcome classification)
- **Integration Tests**: `test_livekit_webhook.py` (webhook flow)
- **Manual Tests**: `test_calls.py` (outbound call functionality)

### Testing Strategy:
- Mock external APIs (LiveKit, Magnus) in unit tests
- Use test fixtures for database state
- Validate HMAC signatures with test secrets
- Test idempotency with duplicate events

---

## 📝 Configuration Management

### Environment Variables:
- `.env`: Backend configuration (API keys, database URL)
- `agents/tst0002/.env`: Agent runtime configuration
- `frontend/.env.local`: Frontend configuration (API URL)

### Database Migrations:
- **Tool**: Custom SQL migrations (`migrations/` directory)
- **Latest**: `008_call_outcome_recording.sql`
- **Process**: Manual execution via psql

---

## 🔗 External Integrations

1. **LiveKit Cloud**: Real-time voice infrastructure
2. **Magnus Billing**: SIP/PSTN telephony gateway
3. **OpenAI**: GPT-4o LLM + TTS voices
4. **Deepgram**: Speech-to-text transcription
5. **Stripe**: Payment processing and subscriptions
6. **Google OAuth**: User authentication

---

**Document Version**: 1.0
**Maintained By**: Development Team
**Review Cycle**: Monthly

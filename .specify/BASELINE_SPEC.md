# Epic.ai Platform - Baseline Specification

**Version**: 1.0.0
**Status**: In Development (MVP Phase)
**Created**: 2025-10-23
**Last Updated**: 2025-10-23

---

## 1. Product Overview

### Purpose
Epic.ai is a multi-tenant SaaS platform that enables non-technical users to build, deploy, and manage production-grade AI voice agents without writing code.

### Target Users
- **Primary**: Small business owners, customer service managers, sales teams
- **Secondary**: Agencies building voice solutions for clients
- **Technical level**: Non-developers who need voice AI capabilities

### Value Proposition
- **No-code agent builder**: Create voice AI agents through a visual interface
- **Instant phone integration**: Get a phone number and route calls to your agent
- **Pay-as-you-go pricing**: Only pay for actual call usage
- **Enterprise-grade voice**: Powered by OpenAI, Deepgram, and LiveKit

---

## 2. User Scenarios

### 2.1 New User Onboarding
**Actor**: First-time user
**Goal**: Create and deploy first voice agent

**Flow**:
1. User visits Epic.ai landing page and signs up (email/password or Google OAuth)
2. User receives 14-day free trial access
3. User is guided through agent creation wizard:
   - Define agent purpose (e.g., "Customer support agent")
   - Write agent instructions/prompt
   - Select voice personality
   - Configure advanced settings (optional)
4. User clicks "Deploy Agent"
5. System generates agent and shows success confirmation
6. User provisions phone number
7. User calls phone number and tests conversation
8. User views call history and usage dashboard

**Success Outcome**: User successfully creates and tests an agent within 10 minutes

### 2.2 Agent Management
**Actor**: Existing user
**Goal**: Manage multiple voice agents

**Flow**:
1. User logs into dashboard
2. User views list of existing agents with status (active/inactive)
3. User can:
   - Edit agent configuration (prompt, voice, settings)
   - Deploy/undeploy agents
   - Delete agents
   - View agent-specific call statistics
4. Changes take effect on next call

**Success Outcome**: User can manage agents without technical assistance

### 2.3 Phone Number Management
**Actor**: User with deployed agent
**Goal**: Get phone number and route calls to agent

**Flow**:
1. User navigates to Phone Numbers section
2. User clicks "Get New Number"
3. System provisions DID from Magnus Billing
4. User assigns number to specific agent
5. System configures SIP routing automatically
6. User sees phone number with assignment confirmation
7. Incoming calls to that number are routed to assigned agent

**Success Outcome**: Phone calls are successfully routed within 1 minute of provisioning

### 2.4 Call Monitoring & Analytics
**Actor**: User with active agents
**Goal**: Monitor call activity and costs

**Flow**:
1. User views dashboard showing:
   - Total calls (today, week, month)
   - Call duration statistics
   - Cost breakdown (LLM, STT, TTS)
   - Active/failed call rates
2. User clicks "Call History"
3. User sees detailed log of all calls:
   - Phone number, agent, timestamp, duration
   - Cost per call
   - Call status (completed/failed)
4. User can filter by date range, agent, or phone number

**Success Outcome**: User understands usage and can predict monthly costs

### 2.5 Conversation Testing
**Actor**: User testing agent before production
**Goal**: Test agent voice quality and responses

**Flow**:
1. User opens agent detail page
2. User clicks "Test in Browser" (optional future feature)
3. OR user calls assigned phone number
4. Agent greets user with configured greeting message
5. User speaks naturally, agent responds
6. User can interrupt agent mid-sentence (agent handles gracefully)
7. Conversation continues with low latency (<2s response time)
8. User ends call
9. Call appears in call history with transcript (if enabled)

**Success Outcome**: Agent responds naturally with production-quality voice

---

## 3. Functional Requirements

### 3.1 User Authentication & Authorization
**Priority**: Critical
**Status**: ✅ Implemented

- **FR-AUTH-001**: System MUST support email/password registration and login
- **FR-AUTH-002**: System MUST support Google OAuth authentication
- **FR-AUTH-003**: Passwords MUST be hashed with bcrypt (12+ rounds)
- **FR-AUTH-004**: System MUST provide 14-day free trial for new users
- **FR-AUTH-005**: Session tokens MUST expire after 30 days of inactivity
- **FR-AUTH-006**: All resources (agents, calls, phone numbers) MUST be scoped by user_id

### 3.2 Agent Creation & Configuration
**Priority**: Critical
**Status**: ✅ Implemented (UI needs polish)

- **FR-AGENT-001**: User MUST be able to create agents via web UI without code
- **FR-AGENT-002**: Agent configuration MUST include:
  - Agent name and description
  - System instructions/prompt (unlimited text)
  - LLM model selection (GPT-4, GPT-3.5-turbo)
  - Voice selection (OpenAI TTS voices: alloy, echo, fable, onyx, nova, shimmer)
  - Temperature (0.0-2.0, default 0.8)
  - STT provider and model (Deepgram Nova-2)
  - TTS provider and voice
- **FR-AGENT-003**: Agent configuration MUST include advanced settings:
  - Voice Activity Detection (VAD) enable/disable
  - Turn detection model (semantic, VAD-based, STT endpoint)
  - Noise cancellation enable/disable
  - Preemptive generation (speed optimization)
  - Resume after false interruption
- **FR-AGENT-004**: User MUST be able to configure greeting message
- **FR-AGENT-005**: System MUST auto-generate agent Python files on save
- **FR-AGENT-006**: Generated files MUST be stored at `/agents/{agent_id}/`
- **FR-AGENT-007**: User MUST be able to edit existing agent configuration
- **FR-AGENT-008**: Configuration changes MUST take effect on next agent restart

### 3.3 Agent Deployment
**Priority**: Critical
**Status**: 🔄 Partially Implemented

- **FR-DEPLOY-001**: System MUST deploy agent as separate Python process
- **FR-DEPLOY-002**: Agent process MUST connect to LiveKit Cloud on startup
- **FR-DEPLOY-003**: Agent MUST register as worker with unique ID
- **FR-DEPLOY-004**: Deployment MUST complete within 30 seconds
- **FR-DEPLOY-005**: Failed deployments MUST show error message to user
- **FR-DEPLOY-006**: User MUST be able to undeploy (stop) agents
- **FR-DEPLOY-007**: System MUST monitor agent process health
- **FR-DEPLOY-008**: Crashed agents MUST auto-restart (systemd or supervisor)

### 3.4 Phone Number Provisioning
**Priority**: Critical
**Status**: ✅ Implemented (Magnus Billing integration complete)

- **FR-PHONE-001**: User MUST be able to provision DID from Magnus Billing
- **FR-PHONE-002**: System MUST authenticate with Magnus API using HMAC-SHA512
- **FR-PHONE-003**: Provisioning MUST complete within 10 seconds
- **FR-PHONE-004**: User MUST see available phone number inventory
- **FR-PHONE-005**: User MUST be able to assign phone number to agent
- **FR-PHONE-006**: System MUST configure SIP trunk routing automatically
- **FR-PHONE-007**: User MUST be able to unassign phone numbers
- **FR-PHONE-008**: Unassigned numbers MUST return to pool for reuse
- **FR-PHONE-009**: System MUST support local fallback if Magnus unavailable

### 3.5 Call Routing & Handling
**Priority**: Critical
**Status**: 🔄 Partially Implemented (needs E2E testing)

- **FR-CALL-001**: Incoming SIP calls MUST be routed to LiveKit room
- **FR-CALL-002**: System MUST match phone number to assigned agent
- **FR-CALL-003**: Agent worker MUST join LiveKit room automatically
- **FR-CALL-004**: Voice pipeline MUST process: Audio → STT → LLM → TTS → Audio
- **FR-CALL-005**: Agent MUST respond within 2 seconds of user finishing speech
- **FR-CALL-006**: Agent MUST handle interruptions gracefully (stop speaking)
- **FR-CALL-007**: Turn detection MUST feel natural (no awkward pauses)
- **FR-CALL-008**: Audio quality MUST support noise cancellation
- **FR-CALL-009**: Failed calls MUST be logged with error details
- **FR-CALL-010**: Call completion rate MUST be >99%

### 3.6 Call Logging & History
**Priority**: High
**Status**: ✅ Implemented

- **FR-LOG-001**: System MUST log all calls to database
- **FR-LOG-002**: Call logs MUST include:
  - User ID, agent ID, phone number
  - Start timestamp, end timestamp, duration (seconds)
  - Cost breakdown (LLM, STT, TTS)
  - Call status (completed, failed, error message)
- **FR-LOG-003**: User MUST be able to view call history in dashboard
- **FR-LOG-004**: Call history MUST be filterable by date, agent, phone number
- **FR-LOG-005**: Call logs MUST be retained for 90 days minimum
- **FR-LOG-006**: Call transcripts MUST be stored (if enabled by user)

### 3.7 Dashboard & Analytics
**Priority**: High
**Status**: 🔄 Partially Implemented

- **FR-DASH-001**: Dashboard MUST show key metrics:
  - Total calls (today, week, month)
  - Total cost (today, week, month)
  - Active agents count
  - Phone numbers assigned
- **FR-DASH-002**: Dashboard MUST show recent call activity
- **FR-DASH-003**: Dashboard MUST show agent performance:
  - Calls per agent
  - Average call duration per agent
  - Success/failure rates
- **FR-DASH-004**: User MUST be able to export call data (CSV)

### 3.8 Billing & Payments
**Priority**: High
**Status**: ⚠️ Partially Implemented (Stripe keys configured)

- **FR-BILL-001**: System MUST integrate with Stripe for payments
- **FR-BILL-002**: System MUST calculate usage costs:
  - LLM: tokens × provider rate
  - STT: minutes × provider rate
  - TTS: characters × provider rate
- **FR-BILL-003**: User MUST see cost estimate before making call (optional)
- **FR-BILL-004**: Monthly usage reports MUST be generated
- **FR-BILL-005**: System MUST support subscription plans (Basic, Pro, Enterprise)
- **FR-BILL-006**: Free tier MUST have usage limits (e.g., 100 minutes/month)
- **FR-BILL-007**: User MUST receive alerts before exceeding limits

### 3.9 Admin Dashboard
**Priority**: Medium
**Status**: ⚠️ Partially Implemented

- **FR-ADMIN-001**: Admin users MUST be able to view all users
- **FR-ADMIN-002**: Admin MUST be able to view platform-wide statistics
- **FR-ADMIN-003**: Admin MUST be able to manage phone number inventory
- **FR-ADMIN-004**: Admin MUST be able to view system health metrics

### 3.10 API Access
**Priority**: Low
**Status**: ❌ Not Implemented

- **FR-API-001**: Users MUST be able to generate API keys
- **FR-API-002**: API keys MUST be scoped per user
- **FR-API-003**: REST API MUST support agent CRUD operations
- **FR-API-004**: REST API MUST support call history retrieval
- **FR-API-005**: API MUST be rate-limited (100 req/min per user)

### 3.11 UX Polish & User Experience
**Priority**: Critical
**Status**: ⚠️ 40% Implemented (per UX_IMPLEMENTATION_CHECKLIST.md)

- **FR-UX-001**: All data loading operations MUST show skeleton loaders
- **FR-UX-002**: All forms MUST show inline validation errors with helpful messages
- **FR-UX-003**: All user actions MUST show toast notifications (success/error/info)
- **FR-UX-004**: All empty states MUST show friendly messages and call-to-action
- **FR-UX-005**: All failed operations MUST have retry buttons
- **FR-UX-006**: All pages MUST have error boundaries to catch React errors
- **FR-UX-007**: All async operations MUST show loading state (buttons, spinners)
- **FR-UX-008**: All destructive actions MUST have confirmation dialogs
- **FR-UX-009**: Form inputs MUST show character counts for limited fields
- **FR-UX-010**: Multi-step forms MUST show progress indicators

### 3.12 Testing & Quality Assurance
**Priority**: Critical
**Status**: ❌ 5% Implemented (manual testing only)

- **FR-TEST-001**: Backend MUST have minimum 60% unit test coverage
- **FR-TEST-002**: All API endpoints MUST have integration tests
- **FR-TEST-003**: Magnus Billing integration MUST have mocked tests
- **FR-TEST-004**: Critical user flows MUST have E2E tests (Playwright):
  - User signup → agent creation → phone provisioning → test call
  - Admin user deletion with cascade
  - Payment flow (trial → subscription)
- **FR-TEST-005**: CI/CD pipeline MUST run tests on every commit
- **FR-TEST-006**: Tests MUST pass before production deployment
- **FR-TEST-007**: Test database MUST be isolated from production
- **FR-TEST-008**: External services MUST be mocked in tests

### 3.13 Monitoring & Observability
**Priority**: High
**Status**: ❌ Not Implemented

- **FR-MON-001**: All application errors MUST be tracked (Sentry or similar)
- **FR-MON-002**: All logs MUST use structured JSON format
- **FR-MON-003**: Agent process health MUST be monitored with auto-restart
- **FR-MON-004**: System uptime MUST be monitored (UptimeRobot or similar)
- **FR-MON-005**: Performance metrics MUST be collected (response time, latency)
- **FR-MON-006**: Call quality metrics MUST be tracked (completion rate, duration)
- **FR-MON-007**: Cost metrics MUST be tracked per user and platform-wide
- **FR-MON-008**: Alert system MUST notify on critical errors or downtime
- **FR-MON-009**: Admin dashboard MUST show system health metrics

### 3.14 Configuration & Deployment
**Priority**: High
**Status**: ⚠️ 50% Implemented (services running, automation missing)

- **FR-DEPLOY-001**: All environment variables MUST be documented in .env.example
- **FR-DEPLOY-002**: Missing configuration MUST be clearly documented:
  - MAGNUS_USER_ID (for DID provisioning)
  - MAGNUS_USERNAME (for SIP routing)
  - RESEND_API_KEY (for email service)
- **FR-DEPLOY-003**: Database migration procedures MUST be documented
- **FR-DEPLOY-004**: SSL certificate renewal MUST be automated (Let's Encrypt)
- **FR-DEPLOY-005**: Backup procedures MUST be automated and tested
- **FR-DEPLOY-006**: Rollback procedures MUST be documented
- **FR-DEPLOY-007**: Agent deployment MUST be automated (systemd template generation)
- **FR-DEPLOY-008**: Production deployment guide MUST be complete

---

## 4. Success Criteria

### 4.1 MVP Success Metrics
- [ ] User can sign up and create account in <2 minutes
- [ ] User can create and deploy voice agent in <10 minutes
- [ ] User can provision phone number in <1 minute
- [ ] Incoming calls are routed correctly 100% of the time
- [ ] Agent response latency is <2 seconds (95th percentile)
- [ ] Call completion rate is >99%
- [ ] Platform supports 10+ concurrent calls without degradation

### 4.2 User Experience Metrics
- [ ] Task completion rate >90% for agent creation
- [ ] User satisfaction score >4.5/5
- [ ] <5% user churn in first 30 days
- [ ] Support tickets <10 per 100 users

### 4.3 Performance Metrics
- [ ] Dashboard loads in <2 seconds
- [ ] API endpoints respond in <500ms (p95)
- [ ] Database queries complete in <100ms
- [ ] Agent deployment completes in <30 seconds

### 4.4 Business Metrics (Phase 2)
- [ ] 100+ active users within 3 months
- [ ] 1000+ calls handled per month
- [ ] Monthly recurring revenue >$1000
- [ ] Customer acquisition cost <$50

---

## 5. Key Entities & Data Models

### 5.1 Users
- **id** (UUID, primary key)
- **email** (string, unique)
- **password_hash** (string, bcrypt)
- **name** (string)
- **created_at** (timestamp)
- **trial_ends_at** (timestamp)
- **subscription_status** (enum: trial, active, cancelled)

### 5.2 Agent Configurations
- **id** (UUID, primary key)
- **user_id** (UUID, foreign key)
- **name** (string)
- **instructions** (text)
- **llm_model** (string: gpt-4, gpt-3.5-turbo)
- **voice** (string: alloy, echo, fable, etc.)
- **temperature** (float: 0.0-2.0)
- **stt_provider** (string: deepgram)
- **stt_model** (string: nova-2)
- **tts_provider** (string: openai)
- **tts_voice_id** (string)
- **vad_enabled** (boolean)
- **turn_detection_model** (string)
- **noise_cancellation_enabled** (boolean)
- **greeting_enabled** (boolean)
- **greeting_message** (string)
- **status** (enum: draft, deployed, inactive)
- **file_path** (string: path to generated agent files)
- **created_at**, **updated_at** (timestamps)

### 5.3 Phone Mappings
- **id** (UUID, primary key)
- **user_id** (UUID, foreign key)
- **agent_config_id** (UUID, foreign key)
- **phone_number** (string, E.164 format)
- **sip_trunk_id** (string)
- **is_active** (boolean)
- **assigned_at** (timestamp)

### 5.4 Phone Number Pool
- **phone_number** (string, primary key)
- **provider** (string: magnus_billing)
- **status** (enum: available, assigned, reserved)
- **assigned_to_user_id** (UUID, nullable)
- **monthly_cost** (decimal)
- **provisioned_at** (timestamp)

### 5.5 Call Logs
- **id** (UUID, primary key)
- **user_id** (UUID, foreign key)
- **agent_config_id** (UUID, foreign key)
- **phone_number** (string)
- **started_at** (timestamp)
- **ended_at** (timestamp)
- **duration_seconds** (integer)
- **cost** (decimal)
- **status** (enum: completed, failed)
- **error_message** (string, nullable)
- **transcript** (text, nullable)

### 5.6 SIP Configurations
- **id** (UUID, primary key)
- **user_id** (UUID, foreign key)
- **sip_url** (string)
- **sip_username** (string)
- **sip_password** (string, encrypted)
- **created_at** (timestamp)

---

## 6. Non-Functional Requirements

### 6.1 Performance
- Agent response latency MUST be <2 seconds (p95)
- Dashboard page load MUST be <2 seconds
- API endpoints MUST respond in <500ms (p95)
- System MUST support 1000+ concurrent users
- System MUST handle 10+ concurrent calls per user

### 6.2 Reliability
- System uptime MUST be >99.5% (excluding scheduled maintenance)
- Call completion rate MUST be >99%
- Agent processes MUST auto-restart on crash
- Database backups MUST run daily

### 6.3 Security
- All API endpoints MUST require authentication
- Passwords MUST be hashed with bcrypt (12+ rounds)
- Session tokens MUST be HTTP-only cookies
- API responses MUST NOT leak sensitive data
- Rate limiting MUST prevent abuse (100 req/min per user)

### 6.4 Scalability
- Database MUST support 100,000+ users
- Agent deployment MUST scale horizontally
- Phone number pool MUST support 10,000+ numbers
- Call logs MUST be archived after 90 days

### 6.5 Observability
- All errors MUST be logged with stack traces
- Call metrics MUST be tracked (duration, cost, latency)
- System health dashboard MUST be available for admins
- Structured logging (JSON) MUST be used across all services

---

## 7. Integration Points

### 7.1 External Services
- **LiveKit Cloud**: Real-time voice communication (WebRTC)
- **OpenAI API**: LLM (GPT models) and TTS
- **Deepgram API**: Speech-to-text (STT)
- **Magnus Billing**: Phone number provisioning and SIP routing
- **Stripe**: Payment processing and subscription management
- **Google OAuth**: Third-party authentication
- **Resend**: Transactional email

### 7.2 Internal APIs
- **Flask Backend** (port 5001): REST API for agent/phone/call management
- **Next.js Frontend** (port 3001): Web application UI
- **Agent Workers**: Separate Python processes per agent
- **Apache Proxy**: SSL termination and routing (production)

---

## 8. Assumptions

1. **User Technical Level**: Users have basic computer skills but no coding experience
2. **Internet Connection**: Users have stable broadband (minimum 5 Mbps for voice calls)
3. **Phone Integration**: All calls routed via SIP trunks (no direct PSTN)
4. **AI Provider Availability**: OpenAI, Deepgram APIs have >99.9% uptime
5. **Language Support**: English-only for MVP (multi-language in Phase 2)
6. **Device Support**: Desktop browsers (Chrome, Firefox, Safari) and mobile phones
7. **Call Volume**: Average user makes <100 calls/month
8. **Agent Complexity**: Agents are conversational (no complex decision trees or CRM integrations in MVP)

---

## 9. Out of Scope (Phase 2+)

- **Agent Function Calling**: Custom tools/functions for agents (e.g., database lookups)
- **Multi-Agent Handoffs**: Transferring calls between agents
- **Knowledge Base Integration**: RAG for agent knowledge
- **Outbound Calling**: Agents making calls (only inbound in MVP)
- **Advanced Analytics**: Sentiment analysis, conversation insights
- **White-labeling**: Custom branding for agencies
- **Multi-language Support**: Beyond English
- **Agent Marketplace**: Pre-built agent templates for sale
- **Webhooks**: Real-time event notifications to external systems
- **Mobile Apps**: iOS/Android native applications
- **Voice Cloning**: Custom voice synthesis

---

## 10. Dependencies

### 10.1 Technical Dependencies
- **LiveKit Cloud Account**: Production-ready plan required
- **OpenAI API Access**: GPT-4 and TTS API access
- **Deepgram API Access**: Nova-2 STT model access
- **Magnus Billing Access**: DID provisioning and SIP configuration
- **PostgreSQL Database**: For production deployment
- **SSL Certificate**: For HTTPS (production)

### 10.2 Operational Dependencies
- **Server Infrastructure**: VPS or cloud server (4GB+ RAM)
- **Domain Name**: For production deployment
- **Support System**: For user onboarding and troubleshooting
- **Monitoring Tools**: For system health and error tracking

---

## 11. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| OpenAI API rate limits | High | Medium | Implement queueing, use multiple API keys |
| Magnus Billing downtime | High | Low | Local number pool fallback, multi-provider support |
| LiveKit Cloud outage | Critical | Very Low | Status monitoring, migrate to self-hosted if needed |
| Unexpected AI costs | High | Medium | Usage caps, cost alerts, pricing transparency |
| Agent prompt injection | Medium | Medium | Input sanitization, prompt engineering best practices |
| SIP routing failures | High | Medium | Comprehensive testing, error logging, fallback routing |
| Multi-tenant data leakage | Critical | Low | Strict user_id filtering, automated security tests |

---

## 12. Current Status Summary

### ✅ Completed Components
- User authentication (email, Google OAuth)
- Agent creation UI and backend
- Agent file generation system
- Magnus Billing integration (DID provisioning)
- Phone number assignment to agents
- Call logging infrastructure
- Dashboard layout and navigation
- Multi-tenant database architecture

### 🔄 In Progress
- End-to-end call routing testing
- Frontend UI polish (phone management, settings)
- Agent deployment automation (systemd services)
- Stripe billing integration

### ❌ Not Started
- API key management
- Agent marketplace
- Webhooks system
- E2E testing suite
- Production monitoring/alerting
- Documentation (user guides, API docs)

---

**Next Steps for Spec-Driven Development**:
1. ✅ Constitution established (principles and standards)
2. ✅ Baseline specification documented (this document)
3. ⏭️ Use `/speckit.plan` to plan specific feature implementations
4. ⏭️ Use `/speckit.tasks` to break plans into actionable tasks
5. ⏭️ Use `/speckit.implement` to execute implementations

---

**Document Metadata**:
- **Created by**: Claude (AI Assistant)
- **Purpose**: Baseline specification for spec-driven development
- **Status**: Living document (update as features complete)
- **Review Frequency**: Weekly during active development

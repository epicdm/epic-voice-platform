# Epic.ai - Current Project State

## Project Overview
**Epic.ai** is a multi-tenant SaaS platform for building and deploying AI voice agents without code. Users can create custom voice agents, provision phone numbers, handle inbound calls, and track usage/costs.

## Current Status: **Active Development - MVP Functional**

---

## Technology Stack

### Backend
- **Python 3.9+** with Flask API (port 5001)
- **Database**: SQLite (dev) / PostgreSQL (prod) via SQLAlchemy + Prisma
- **LiveKit Agents Framework v1.2.0+** - Real-time voice infrastructure
- **AI Providers**: OpenAI (LLM/TTS), Deepgram (STT), Silero (VAD)
- **Telephony**: Magnus Billing API for DID provisioning and SIP routing

### Frontend
- **Next.js 15.5.6** with React 19 and TypeScript (port 3001)
- **UI**: HeroUI components + Tailwind CSS
- **Auth**: NextAuth v5 with Google OAuth
- **Payments**: Stripe integration (in progress)
- **Database ORM**: Prisma (PostgreSQL)

### Infrastructure
- **LiveKit Cloud** - Real-time voice/video rooms
- **Apache** - SSL proxy and routing (production)
- **Package Managers**: UV (Python), npm (Node.js)

---

## Key File Locations

### Backend Core
- `user_dashboard.py` (2066 lines) - Main Flask app with all API routes
- `database.py` (177 lines) - SQLAlchemy models
- `phone_number_manager.py` (502 lines) - Phone provisioning logic
- `magnus_billing_client.py` (659 lines) - Magnus Billing API client
- `sip_inbound_handler.py` (213 lines) - SIP webhook handler
- `backend/agent_creator.py` - Generates agent Python files dynamically

### Frontend
- `frontend/app/` - Next.js 15 app directory structure
- `frontend/lib/auth.ts` - Authentication utilities
- `frontend/lib/api.ts` - API client helpers
- `frontend/prisma/schema.prisma` - Database schema

### Agent Templates
- `agents/` - Deployed agent directories (auto-generated)
- `voice_agents/` - Example agents and advanced patterns
- `livekit_basic_agent.py` - Basic agent template
- `livekit_mcp_agent.py` - MCP-integrated agent template

---

## Database Schema (Key Tables)

### Multi-tenant Core
- **users** - User accounts (email, password, created_at)
- **agent_configs** - Agent configurations per user
  - Instructions, LLM model, voice, temperature
  - STT/TTS provider settings
  - VAD, turn detection, noise cancellation
  - Greeting settings, status, file paths

### Phone System
- **phone_mappings** - Maps phone numbers to agents
- **phone_number_pool** - Available phone inventory
- **call_logs** - Call history with duration and costs

### Configuration
- **SIPConfig** - SIP server configurations per user

---

## Implemented Features ✅

### 1. User Management
- [x] Email/password authentication
- [x] Google OAuth integration
- [x] Trial system (14-day free trial)
- [x] Multi-tenant isolation (user_id foreign keys)

### 2. Agent Builder
- [x] No-code agent creation interface
- [x] Customizable prompts/instructions
- [x] LLM model selection (OpenAI GPT-4, GPT-3.5)
- [x] Voice selection (OpenAI TTS voices)
- [x] STT provider (Deepgram)
- [x] Advanced settings (VAD, turn detection, noise cancellation)
- [x] Dynamic agent file generation (`backend/agent_creator.py`)
- [x] Agent deployment to separate processes

### 3. Phone Number System
- [x] Magnus Billing integration (authentication with HMAC-SHA512)
- [x] DID provisioning API
- [x] Phone number assignment to agents
- [x] Phone number inventory tracking
- [x] Local fallback when Magnus unavailable

### 4. Call Infrastructure
- [x] LiveKit room creation and management
- [x] Voice pipeline (STT → LLM → TTS)
- [x] SIP inbound webhook handler
- [x] Call logging with duration tracking
- [x] Agent process lifecycle management

### 5. Dashboard & Analytics
- [x] Agent list view
- [x] Agent creation form
- [x] Call history table
- [x] Basic usage statistics
- [x] Cost tracking per call

---

## In Progress / Partial Implementation 🔄

### 1. SIP Integration
- [x] Magnus Billing API client complete
- [x] SIP webhook endpoint created
- [ ] End-to-end call routing testing needed
- [ ] Call quality monitoring
- [ ] Error handling for dropped calls

### 2. Frontend UI
- [x] Dashboard layout structure
- [x] Agent creation pages
- [ ] Phone numbers management UI (needs polish)
- [ ] Admin dashboard (partially implemented)
- [ ] Billing/payment pages (Stripe integration started)
- [ ] Settings pages completion

### 3. Agent Features
- [x] Basic voice conversation
- [ ] Function calling/tools integration (framework supports it)
- [ ] Multi-agent handoffs
- [ ] Custom knowledge base integration
- [ ] Agent analytics and insights

### 4. Billing System
- [x] Stripe keys configured
- [ ] Subscription plans implementation
- [ ] Usage-based billing calculation
- [ ] Payment method management
- [ ] Invoice generation

---

## Known Gaps / Todo 📋

### High Priority
1. **Complete SIP call flow testing** - End-to-end verification
2. **Frontend-backend integration** - Some pages disconnected
3. **Error handling** - Production-grade error recovery
4. **Agent deployment automation** - Systemd services or process manager
5. **Call quality monitoring** - Latency, interruptions, failures

### Medium Priority
6. **Admin dashboard features** - User management, system stats
7. **API key management** - Per-user API keys for external access
8. **Agent marketplace** - Pre-built agent templates
9. **Webhook system** - Call events to external systems
10. **Rate limiting** - Protect APIs from abuse

### Low Priority
11. **E2E testing suite** - Playwright or Cypress
12. **Documentation** - API docs, deployment guides
13. **Monitoring** - Prometheus, Grafana, alerting
14. **CI/CD pipeline** - Automated testing and deployment
15. **Multi-region support** - Reduce latency globally

---

## Architecture Patterns

### Multi-Tenant Design
- All resources scoped by `user_id`
- Database-level isolation with foreign keys
- API authentication middleware on all routes
- Separate agent processes per user's agents

### Agent Lifecycle
1. User creates agent via frontend form
2. Backend `agent_creator.py` generates Python files
3. Files stored at `/opt/livekit1/agents/{agent_id}/`
4. Agent deployed as separate Python process
5. Process connects to LiveKit Cloud as worker
6. Listens for room assignments based on phone mappings

### Call Flow
```
Incoming Phone Call
  ↓
Magnus Billing DID
  ↓
SIP Trunk to LiveKit
  ↓
LiveKit creates room (based on phone mapping)
  ↓
Agent worker joins room
  ↓
Voice Pipeline: Audio → STT → LLM → TTS → Audio
  ↓
Call ends, logged in call_logs table
```

---

## Recent Git Activity

**Last 5 commits:**
1. `63047c7` - feat: Complete AI agent creation and call flow implementation
2. `e16bc64` - feat: Complete working Magnus Billing integration - FULLY TESTED
3. `20eba64` - feat: Complete Magnus Billing authentication and API integration
4. `5a836d3` - feat: Add new MagnusBilling client and robust error handling
5. `43ea642` - refactor: Final cleanup of MagnusBilling integration

**Focus**: Agent creation, Magnus Billing integration, phone provisioning

---

## Environment Configuration

### Required Environment Variables
- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- `OPENAI_API_KEY`
- `DEEPGRAM_API_KEY`
- `MAGNUS_API_KEY`, `MAGNUS_SECRET_KEY`, `MAGNUS_BASE_URL`
- `DATABASE_URL` (PostgreSQL)
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `STRIPE_PUBLIC_KEY`, `STRIPE_SECRET_KEY`
- `RESEND_API_KEY`

---

## Current Deployment

### Development
- Backend: `python user_dashboard.py` (port 5001)
- Frontend: `npm run dev` (port 3001)
- Database: SQLite at `voice_agents.db`

### Production (Planned)
- Apache reverse proxy with SSL
- PostgreSQL database
- Systemd services for backend + agents
- PM2 or systemd for frontend

---

## Next Development Priorities

1. **Complete end-to-end call testing** with real phone numbers
2. **Polish frontend UI** - Ensure all pages are connected and functional
3. **Implement billing system** - Stripe subscription management
4. **Add monitoring** - Error tracking, call quality metrics
5. **Production deployment** - Systemd services, process management
6. **Documentation** - User guides, API documentation

---

## Technical Debt

1. **Monolithic Flask app** - `user_dashboard.py` is 2066 lines, needs refactoring
2. **Mixed database systems** - SQLAlchemy (Flask) + Prisma (Next.js)
3. **Agent process management** - No robust supervisor (Systemd needed)
4. **Error handling** - Many endpoints lack try/catch blocks
5. **Testing** - No automated test suite
6. **Security** - Rate limiting, input validation needs hardening

---

## Success Metrics

### MVP Success (Current Goal)
- [ ] User can create account
- [ ] User can create voice agent
- [ ] User can provision phone number
- [ ] User can receive calls and agent responds correctly
- [ ] Calls are logged with duration and cost

### Phase 2 Goals
- [ ] 10+ active users
- [ ] 100+ calls handled successfully
- [ ] <2s response latency for agent replies
- [ ] 99%+ call completion rate
- [ ] Stripe billing operational

---

**Last Updated**: 2025-10-23
**Status**: Active Development - Transitioning to Spec-Driven Development with Spec-Kit

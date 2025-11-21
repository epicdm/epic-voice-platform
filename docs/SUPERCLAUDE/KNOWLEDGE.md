# Epic Voice Suite - Technical Knowledge Base

**Last Updated**: October 29, 2025
**Purpose**: Centralized reference for tech stack, libraries, folder structure, and system conventions

---

## 🛠️ Technology Stack

### Frontend Stack
- **Framework**: Next.js 15.5.6
- **React Version**: React 19
- **Language**: TypeScript 5.9.3
- **UI Library**: HeroUI (NextUI fork)
- **Styling**: TailwindCSS 3.x
- **Authentication**: NextAuth.js 5.x
- **State Management**: React Context API + Server Components
- **HTTP Client**: fetch API (native)
- **Build Tool**: Turbopack (Next.js 15)

### Backend Stack
- **Framework**: Flask 3.1.2
- **Language**: Python 3.12
- **ORM**: SQLAlchemy 2.x
- **Database**: PostgreSQL 16
- **Authentication**: Flask-Login
- **Session Store**: Server-side sessions (Flask)
- **CORS**: Flask-CORS

### Voice/Real-Time Stack
- **Platform**: LiveKit Cloud
- **Agent Framework**: LiveKit Agents 1.x (Python)
- **STT Provider**: Deepgram (Nova-2 model)
- **LLM Provider**: OpenAI (GPT-4o, GPT-4o-mini)
- **TTS Provider**: OpenAI TTS (Alloy, Echo, Fable, Nova, Onyx, Shimmer)
- **VAD**: Silero VAD
- **Turn Detection**: Semantic Model (custom) + VAD-based

### Telephony Stack
- **SIP Gateway**: Magnus Billing
- **SIP Trunk Provider**: LiveKit SIP Trunks
- **PSTN Connectivity**: Magnus → LiveKit → Agents
- **Phone Number Pool**: Managed via Magnus Billing API

### Infrastructure Stack
- **Operating System**: Linux (Ubuntu/Debian)
- **Process Manager**: systemd
- **Reverse Proxy**: (TBD - nginx/Traefik recommended)
- **Database Hosting**: Local PostgreSQL 16
- **Agent Deployment**: LiveKit Cloud workers

### Payment & Billing
- **Payment Processor**: Stripe Checkout
- **Subscription Management**: Stripe Billing
- **Invoice Generation**: Stripe Invoices

### Monitoring & Observability
- **Logging**: Python logging module + Flask logs
- **Database Logs**: PostgreSQL logs
- **Error Tracking**: (TBD - Sentry recommended)
- **Metrics**: (TBD - Prometheus/Grafana recommended)

---

## 📚 Key Libraries & Versions

### Python Dependencies (Backend)
```python
# Core Framework
Flask==3.1.2
Flask-Login==0.6.3
Flask-CORS==4.0.1

# Database
SQLAlchemy==2.0.x
psycopg2-binary==2.9.x  # PostgreSQL adapter

# LiveKit Integration
livekit==0.x.x
livekit-api==0.x.x

# Telephony
requests==2.31.x  # For Magnus API calls

# Environment
python-dotenv==1.0.x

# Password Hashing
werkzeug==3.0.x  # Includes password utilities

# Date/Time
python-dateutil==2.8.x
```

### Python Dependencies (LiveKit Agents)
```python
# LiveKit Agents Framework
livekit-agents==1.x.x
livekit-plugins-openai==0.x.x
livekit-plugins-deepgram==0.x.x
livekit-plugins-silero==0.x.x

# AI Providers
openai==1.x.x

# Utilities
python-dotenv==1.0.x
aiohttp==3.9.x
```

### JavaScript Dependencies (Frontend)
```json
{
  "next": "15.5.6",
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "typescript": "5.9.3",
  "@heroui/react": "^2.x.x",
  "next-auth": "^5.x.x",
  "tailwindcss": "^3.x.x",
  "framer-motion": "^11.x.x",
  "dotenv": "^17.2.3",
  "resend": "^6.2.2"
}
```

---

## 📂 Folder Structure

```
/opt/livekit1/                        # Project root
│
├── frontend/                          # Next.js Frontend
│   ├── app/                           # Next.js 15 App Router
│   │   ├── (auth)/                    # Auth group (login, signup)
│   │   ├── (dashboard)/               # Protected routes
│   │   │   ├── dashboard/             # Main dashboard
│   │   │   ├── agents/                # Agent management
│   │   │   ├── phone-numbers/         # Phone number management
│   │   │   ├── calls/                 # Call logs
│   │   │   ├── campaigns/             # Campaign management
│   │   │   ├── analytics/             # Analytics dashboard
│   │   │   ├── settings/              # User settings
│   │   │   └── billing/               # Billing & subscriptions
│   │   ├── api/                       # API routes (Next.js)
│   │   ├── layout.tsx                 # Root layout
│   │   └── page.tsx                   # Landing page
│   ├── components/                    # Reusable React components
│   │   ├── ui/                        # HeroUI wrapper components
│   │   ├── dashboard/                 # Dashboard-specific components
│   │   └── shared/                    # Shared utility components
│   ├── lib/                           # Utility functions
│   ├── public/                        # Static assets
│   ├── styles/                        # Global styles
│   ├── .env.local                     # Frontend environment variables
│   ├── next.config.js                 # Next.js configuration
│   ├── tailwind.config.js             # TailwindCSS configuration
│   ├── tsconfig.json                  # TypeScript configuration
│   └── package.json                   # Frontend dependencies
│
├── backend/                           # Backend modules (if organized)
│   ├── agent_creator.py               # Agent creation logic
│   ├── phone_number_manager.py        # Phone number operations
│   └── (other modular backend code)
│
├── agents/                            # LiveKit Agent deployments
│   └── tst0002/                       # Main production agent
│       ├── agent.py                   # Agent entry point
│       ├── db_config.py               # Database configuration loader
│       ├── .env                       # Agent environment variables
│       └── pyproject.toml             # UV project config
│
├── migrations/                        # Database migrations
│   ├── 001_initial_schema.sql
│   ├── 002_add_campaigns.sql
│   ├── ...
│   └── 008_call_outcome_recording.sql # Latest migration
│
├── docs/                              # Documentation
│   ├── SUPERCLAUDE/                   # SuperClaude knowledge base
│   │   ├── ARCHITECTURE.md            # System architecture
│   │   ├── KNOWLEDGE.md               # This file
│   │   ├── TASKS.md                   # Backlog and tasks
│   │   ├── ROADMAP.md                 # Project roadmap
│   │   └── CONVENTIONS.md             # Coding conventions
│   ├── CALL_OUTCOME_*.md              # Feature documentation
│   └── *.md                           # Other docs
│
├── scripts/                           # Utility scripts
│   └── (maintenance and deployment scripts)
│
├── user_dashboard.py                  # Main Flask backend
├── database.py                        # SQLAlchemy models
├── campaign_engine.py                 # Campaign orchestration
├── livekit_webhook_listener.py        # LiveKit webhook handler
├── call_outcome_processor.py          # Call outcome processing
├── sip_inbound_handler.py             # SIP webhook handler
├── livekit_telephony.py               # LiveKit telephony utilities
├── magnus_billing_client.py           # Magnus API client
├── webhook_events.py                  # Webhook event definitions
├── webhook_delivery_service.py        # Webhook delivery to partners
│
├── .env                               # Backend environment variables
├── package.json                       # Root package.json (minimal)
├── requirements.txt                   # Python dependencies (if used)
└── README.md                          # Project README
```

---

## 🗄️ Database Schema Overview

### Core Tables

**users**:
- Primary user accounts
- Google OAuth or email/password authentication
- Fields: id, email, name, password, createdAt, updatedAt, isActive

**agent_configs**:
- AI agent configurations per user
- Fields: id, userId, name, instructions, llmModel, voice, temperature, etc.
- Scoped by userId (multi-tenant)

**call_logs**:
- Record of all calls (inbound/outbound)
- Fields: id, userId, agentConfigId, phoneNumber, roomName, startedAt, endedAt, durationSeconds, direction, outcome
- Indexes: userId, outcome, endedAt

**phone_number_pool**:
- Available phone numbers (DIDs)
- Fields: id, phoneNumber, userId (assigned), agentConfigId (assigned), status, livekitInboundTrunkId
- Managed via phone_number_manager.py

**campaigns**:
- Outbound calling campaigns
- Fields: id, userId, name, agentConfigId, status, startedAt, completedAt

**leads**:
- Lead data for campaigns
- Fields: id, campaignId, phoneNumber, name, email, company, status, lastCalledAt, timesCalled

**campaign_calls**:
- Individual call records for campaigns
- Fields: id, campaignId, leadId, callLogId, agentId, status, attemptNumber, callOutcome, livekitRoomName

**livekit_call_events**:
- Idempotency tracking for LiveKit webhooks
- Fields: id, eventId (unique), roomName, eventType, eventPayload, processed, callLogId

**partners** (White Label):
- Partner organizations
- Fields: id, name, apiKey, webhookUrl, createdAt

**partner_subdomains**:
- Custom domain mappings
- Fields: id, partnerId, subdomain, customDomain

**partner_webhooks**:
- Webhook endpoints for partner integrations
- Fields: id, partnerId, url, events, secret

---

## 🔧 System Conventions

### Naming Conventions

**Database**:
- Table names: `snake_case` (e.g., `agent_configs`, `call_logs`)
- Column names: `camelCase` (Prisma convention - e.g., `userId`, `createdAt`)
- Primary keys: `id` (TEXT/VARCHAR, UUID format)
- Foreign keys: `{table}Id` (e.g., `userId`, `agentConfigId`)
- Timestamps: `createdAt`, `updatedAt`, `startedAt`, `endedAt`

**Python Backend**:
- File names: `snake_case.py` (e.g., `user_dashboard.py`)
- Class names: `PascalCase` (e.g., `CallOutcomeProcessor`)
- Function names: `snake_case` (e.g., `process_call_outcome`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_CONCURRENT_CALLS`)

**Frontend (TypeScript/React)**:
- File names: `PascalCase.tsx` for components (e.g., `AgentBuilder.tsx`)
- File names: `camelCase.ts` for utilities (e.g., `apiClient.ts`)
- Component names: `PascalCase` (e.g., `DashboardLayout`)
- Function names: `camelCase` (e.g., `fetchAgents`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `API_BASE_URL`)

**LiveKit Agents**:
- File names: `snake_case.py` (e.g., `db_config.py`)
- Function names: `snake_case` (e.g., `load_agent_config`)
- Class names: `PascalCase` (e.g., `Assistant`)

### API Routing Patterns

**REST Endpoints**:
- Base path: `/api/{scope}/{resource}`
- User-scoped: `/api/user/{resource}` (requires authentication)
- Admin-scoped: `/api/admin/{resource}` (admin only)
- Public: `/api/public/{resource}` (no auth)

**Examples**:
```
GET    /api/user/agents                 # List user's agents
POST   /api/user/agents                 # Create agent
GET    /api/user/agents/:id             # Get specific agent
PUT    /api/user/agents/:id             # Update agent
DELETE /api/user/agents/:id             # Delete agent
POST   /api/user/agents/:id/deploy      # Deploy agent
POST   /api/user/calls/outbound         # Initiate call
GET    /api/user/campaigns              # List campaigns
POST   /api/webhooks/livekit            # Webhook endpoint (public)
```

**Response Format**:
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

**Error Format**:
```json
{
  "success": false,
  "data": null,
  "error": "Error message here"
}
```

### Database Model Conventions

**SQLAlchemy Models** (`database.py`):
- Use Prisma camelCase column names via Column('columnName', ...)
- Define relationships with `back_populates`
- Use CASCADE delete for owned relationships
- Always include `createdAt` and `updatedAt` timestamps

**Example**:
```python
class AgentConfig(Base):
    __tablename__ = 'agent_configs'

    id = Column(String(36), primary_key=True)
    userId = Column('userId', String(36), ForeignKey('users.id'))
    name = Column(String(255), nullable=False)
    createdAt = Column('createdAt', DateTime, default=datetime.utcnow)
    updatedAt = Column('updatedAt', DateTime, onupdate=datetime.utcnow)

    user = relationship('User', back_populates='agents')
```

### Component Organization (Frontend)

**Component Structure**:
```tsx
// components/dashboard/AgentCard.tsx
'use client';  // Client component marker if needed

import { Card, CardBody, Button } from '@heroui/react';
import { Agent } from '@/types';

interface AgentCardProps {
  agent: Agent;
  onEdit?: (agent: Agent) => void;
  onDelete?: (agentId: string) => void;
}

export default function AgentCard({ agent, onEdit, onDelete }: AgentCardProps) {
  return (
    <Card>
      <CardBody>
        <h3>{agent.name}</h3>
        <p>{agent.description}</p>
        <div className="flex gap-2">
          <Button onPress={() => onEdit?.(agent)}>Edit</Button>
          <Button color="danger" onPress={() => onDelete?.(agent.id)}>Delete</Button>
        </div>
      </CardBody>
    </Card>
  );
}
```

**File Naming**:
- Page components: `page.tsx` (Next.js convention)
- Layout components: `layout.tsx` (Next.js convention)
- Reusable components: `ComponentName.tsx`
- Utility functions: `utilityName.ts`
- Type definitions: `types.ts` or `ComponentName.types.ts`

### Git Commit Format

**Commit Message Structure**:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring (no feature change)
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build, etc.)

**Examples**:
```
feat(agents): Add 4-step agent creation wizard

Implement multi-step wizard for agent creation with validation
and phone number assignment.

Closes #123

---

fix(webhooks): Prevent duplicate webhook processing

Add idempotency check using event_id to prevent duplicate
processing of LiveKit webhook events.

---

docs(superclaude): Create architecture documentation

Add comprehensive architecture docs including system layers,
module boundaries, and data flow patterns.
```

**Scope Examples**:
- `agents` - Agent management features
- `campaigns` - Campaign engine
- `webhooks` - Webhook processing
- `frontend` - Frontend changes
- `backend` - Backend API
- `database` - Database schema
- `telephony` - SIP/phone integration
- `billing` - Payment and subscriptions

---

## 🔐 Security Conventions

### Environment Variables
- **Never commit** `.env` files to git
- Use `.env.example` as template
- Rotate API keys regularly
- Use strong secrets for session keys

### Authentication
- All protected routes require `@login_required` decorator
- Session cookies are HTTP-only
- CSRF protection enabled for forms
- Password hashing with werkzeug (bcrypt)

### API Security
- Validate all user input
- Use SQLAlchemy ORM (prevents SQL injection)
- Rate limiting per user/plan tier
- CORS restricted to frontend origin

### Database Security
- All queries scoped by `userId`
- Foreign key constraints enforced
- No raw SQL (use ORM)
- Sensitive data encrypted (e.g., API keys)

---

## 📊 Data Flow Conventions

### User-Scoped Queries
Always filter by `userId` for multi-tenant isolation:
```python
# Correct
agents = db.query(AgentConfig).filter(AgentConfig.userId == user_id).all()

# Incorrect - exposes other users' data
agents = db.query(AgentConfig).all()
```

### Transactional Updates
Use transactions for multi-table operations:
```python
try:
    db.begin()
    db.execute(...)  # Operation 1
    db.execute(...)  # Operation 2
    db.commit()
except Exception as e:
    db.rollback()
    raise
```

### Event-Driven Updates
Emit events after state changes for downstream systems:
```python
# Update database
db.execute(...)
db.commit()

# Emit event
event_queue.publish('call.completed', {...})
```

---

## 🧪 Testing Conventions

### Test File Naming
- Unit tests: `test_{module_name}.py`
- Integration tests: `test_{feature}_integration.py`
- E2E tests: `test_{workflow}_e2e.py`

### Test Structure
```python
import pytest

def test_outcome_classification_completed():
    """Test that calls >10s are classified as completed"""
    processor = CallOutcomeProcessor()
    event = {'duration': 45, 'disconnect_reason': 'user_left'}
    outcome = processor._classify_outcome(event, 45)
    assert outcome == 'completed'
```

### Mock External APIs
Use mocks for LiveKit, Magnus, OpenAI:
```python
@patch('livekit_api.create_call')
def test_outbound_call(mock_create_call):
    mock_create_call.return_value = {'room_name': 'test-room'}
    result = initiate_call('+1234567890', 'agent-123')
    assert result['success'] == True
```

---

## 📦 Deployment Conventions

### Environment-Specific Config
- **Development**: `.env.local` / `.env`
- **Staging**: Environment variables via systemd/docker
- **Production**: Secure secret management (e.g., AWS Secrets Manager)

### Database Migrations
1. Write migration SQL in `migrations/00X_description.sql`
2. Test on development database
3. Apply to staging: `psql < migration.sql`
4. Verify schema: `\d table_name`
5. Apply to production with backup

### Agent Deployment
1. Update agent code in `/opt/livekit1/agents/tst0002/`
2. Test locally: `uv run python agent.py dev`
3. Deploy to LiveKit Cloud: `lk agent deploy`
4. Monitor logs: `lk agent logs`

---

## 📝 TypeScript Type Definitions

### Agent Type
```typescript
type Agent = {
  id: string
  name: string
  status: 'running' | 'inactive' | 'deploying' | 'error'
  model: string
  voice: string
  createdAt: string
  turnDetection: string
  metrics?: {
    callsToday?: number
    avgDuration?: number
    successRate?: number
  }
}
```

**Location**: `frontend/types/agent.ts`

**Status Values**:
- `running` - Agent is active and handling calls
- `inactive` - Agent is stopped or disabled
- `deploying` - Agent is currently being deployed to LiveKit Cloud
- `error` - Agent deployment or execution failed

**Optional Metrics**:
- `callsToday` - Number of calls handled today
- `avgDuration` - Average call duration in seconds or formatted string
- `successRate` - Success rate percentage (0-100)

**Usage Example**:
```typescript
import { Agent } from '@/types/agent';

const agent: Agent = {
  id: 'agent-123',
  name: 'Customer Support Agent',
  status: 'running',
  model: 'gpt-4o-mini',
  voice: 'alloy',
  createdAt: '2025-10-31T12:00:00Z',
  turnDetection: 'semantic',
  metrics: {
    callsToday: 42,
    avgDuration: 135,
    successRate: 95.5
  }
};
```

---

## 🔄 Update Workflow

### Adding New Features
1. Create feature branch: `git checkout -b feature/feature-name`
2. Implement feature with tests
3. Update documentation (if needed)
4. Submit PR with description
5. Code review and approval
6. Merge to main
7. Deploy to staging → production

### Database Schema Changes
1. Write migration SQL
2. Document in migration file
3. Test rollback scenario
4. Apply to development
5. Apply to staging
6. Apply to production (with backup)
7. Update `database.py` models

---

**Document Version**: 1.0
**Maintained By**: Development Team
**Review Cycle**: Monthly

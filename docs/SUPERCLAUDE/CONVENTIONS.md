# Epic Voice Suite - Coding Conventions

**Last Updated**: October 29, 2025
**Purpose**: Standardized coding conventions, naming rules, and best practices
**Enforcement**: Code review + automated linting

---

## 📝 General Principles

### Code Quality Standards
1. **Readability First**: Code is read more than written
2. **DRY (Don't Repeat Yourself)**: Abstract common patterns
3. **KISS (Keep It Simple)**: Simple solutions over complex ones
4. **YAGNI (You Aren't Gonna Need It)**: Build what's needed now
5. **SOLID Principles**: Single responsibility, open/closed, etc.

### Code Review Requirements
- ✅ All code changes require PR approval
- ✅ Minimum 1 reviewer for standard changes
- ✅ Minimum 2 reviewers for architectural changes
- ✅ Automated tests must pass before merge
- ✅ Linting/formatting checks must pass

---

## 🗂️ Naming Conventions

### Database Naming

#### Table Names
- **Format**: `snake_case` (lowercase with underscores)
- **Pluralization**: Use plural for tables (e.g., `users` not `user`)
- **Examples**: `users`, `agent_configs`, `call_logs`, `phone_number_pool`
- **Rationale**: SQL standard convention, matches PostgreSQL best practices

**Multi-word Tables**:
```sql
agent_configs         ✅ (snake_case, plural)
agentConfigs          ❌ (camelCase not allowed in SQL)
agent-configs         ❌ (hyphens require quoting)
AgentConfig           ❌ (PascalCase not standard)
```

#### Column Names
- **Format**: `camelCase` (Prisma convention)
- **Examples**: `userId`, `createdAt`, `agentConfigId`, `phoneNumber`
- **Rationale**: Matches Prisma ORM default schema style (inherited from Next.js frontend)
- **Note**: Column names are mapped in SQLAlchemy via `Column('columnName', ...)`

**Column Naming Patterns**:
```python
# SQLAlchemy Model (Python side uses snake_case)
userId = Column('userId', String(36), ForeignKey('users.id'))
createdAt = Column('createdAt', DateTime, default=datetime.utcnow)
phoneNumber = Column('phoneNumber', String(20))

# Database side uses camelCase (Prisma schema)
# SELECT "userId", "createdAt", "phoneNumber" FROM users;
```

#### Primary Keys
- **Name**: Always `id`
- **Type**: `TEXT` (VARCHAR) with UUID values
- **Generation**: `gen_random_uuid()::TEXT` or application-generated UUIDs
- **Format**: Standard UUID format `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

**Example**:
```sql
id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT
-- Generates: '550e8400-e29b-41d4-a716-446655440000'
```

#### Foreign Keys
- **Format**: `{singularTable}Id` (singular table name + Id)
- **Examples**:
  - `userId` (references `users.id`)
  - `campaignId` (references `campaigns.id`)
  - `agentConfigId` (references `agent_configs.id`)
- **Constraints**: Always define FK constraints with proper ON DELETE behavior

**Foreign Key Constraints**:
```sql
-- CASCADE: Delete child records when parent deleted
userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE

-- SET NULL: Set to NULL when parent deleted (optional relationships)
agentConfigId TEXT REFERENCES agent_configs(id) ON DELETE SET NULL

-- RESTRICT: Prevent deletion of parent if children exist (default)
partnerId TEXT NOT NULL REFERENCES partners(id) ON DELETE RESTRICT
```

#### Indexes
- **Format**: `idx_{table}_{column(s)}` (snake_case)
- **Single Column**: `idx_{table}_{column}`
- **Multi-Column**: `idx_{table}_{col1}_{col2}`
- **Purpose**: Optimize queries with WHERE, JOIN, ORDER BY clauses

**Examples**:
```sql
-- Single column index
CREATE INDEX idx_call_logs_outcome ON call_logs(outcome);

-- Multi-column index (for composite queries)
CREATE INDEX idx_call_logs_user_id_ended_at
  ON call_logs("userId", "endedAt");

-- Unique index (for unique constraints)
CREATE UNIQUE INDEX idx_livekit_call_events_event_id
  ON livekit_call_events(event_id);

-- Partial index (for filtered queries)
CREATE INDEX idx_campaigns_active
  ON campaigns(status)
  WHERE status = 'active';
```

#### Timestamp Columns
- **Standard Names**: `createdAt`, `updatedAt`, `startedAt`, `endedAt`
- **Type**: `TIMESTAMP` or `TIMESTAMP WITH TIME ZONE`
- **Default**: `CURRENT_TIMESTAMP` for `createdAt`
- **Auto-Update**: Use triggers or application logic for `updatedAt`

**Timestamp Best Practices**:
```sql
-- Creation timestamp (immutable)
createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP

-- Update timestamp (mutable)
updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
-- Note: Use database trigger or application logic to update

-- Optional timestamps (nullable)
startedAt TIMESTAMP
endedAt TIMESTAMP
deletedAt TIMESTAMP  -- Soft delete pattern
```

#### Complete Table Example
```sql
CREATE TABLE agent_configs (
    -- Primary Key
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    -- Foreign Keys
    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Data Columns
    name VARCHAR(255) NOT NULL,
    instructions TEXT NOT NULL,
    "llmModel" VARCHAR(100) DEFAULT 'gpt-4o-mini',
    voice VARCHAR(50) DEFAULT 'alloy',
    temperature FLOAT DEFAULT 0.7,
    "isActive" BOOLEAN DEFAULT true,

    -- Timestamps
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT check_temperature CHECK (temperature >= 0 AND temperature <= 2)
);

-- Indexes for common queries
CREATE INDEX idx_agent_configs_user_id ON agent_configs("userId");
CREATE INDEX idx_agent_configs_is_active ON agent_configs("isActive");
CREATE INDEX idx_agent_configs_created_at ON agent_configs("createdAt");

-- Comments for documentation
COMMENT ON TABLE agent_configs IS 'AI agent configurations per user';
COMMENT ON COLUMN agent_configs."userId" IS 'Owner of this agent (multi-tenant isolation)';
```

#### SQLAlchemy Model Conventions

**Model vs Table Naming**:
- **Table Name**: `snake_case` plural (e.g., `agent_configs`)
- **Model Class**: `PascalCase` singular (e.g., `AgentConfig`)
- **Python Attribute**: `snake_case` (e.g., `user_id`)
- **Database Column**: `camelCase` (e.g., `userId`)

**Complete Model Example**:
```python
from sqlalchemy import Column, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

class AgentConfig(Base):
    """
    AI Agent Configuration Model

    Represents user-defined AI agent with voice, LLM, and behavioral settings.
    Multi-tenant isolation via userId foreign key.
    """
    __tablename__ = 'agent_configs'  # snake_case plural

    # Primary Key
    id = Column(String(36), primary_key=True)

    # Foreign Keys (map camelCase column names)
    userId = Column('userId', String(36), ForeignKey('users.id'), nullable=False)

    # Data Columns
    name = Column(String(255), nullable=False)
    instructions = Column(Text, nullable=False)
    llmModel = Column('llmModel', String(100), default='gpt-4o-mini')
    voice = Column(String(50), default='alloy')
    temperature = Column(Float, default=0.7)
    isActive = Column('isActive', Boolean, default=True)

    # Timestamps
    createdAt = Column('createdAt', DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column('updatedAt', DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships (use singular model names)
    user = relationship('User', back_populates='agents')
    call_logs = relationship('CallLog', back_populates='agent_config', cascade='all, delete-orphan')

    def __repr__(self):
        return f"<AgentConfig(id={self.id}, name={self.name}, userId={self.userId})>"
```

**Key Conventions**:
1. **Class Name**: Singular PascalCase (`AgentConfig`, not `AgentConfigs`)
2. **Table Name**: Plural snake_case (`agent_configs`)
3. **Column Mapping**: Use `Column('camelCase', ...)` for Prisma compatibility
4. **Relationships**: Use `back_populates` for bidirectional relationships
5. **Cascade**: Define cascade behavior for owned relationships
6. **Repr**: Include helpful debugging information

---

### Python Naming

#### Files & Modules
- **Format**: `snake_case.py`
- **Examples**: `user_dashboard.py`, `call_outcome_processor.py`, `database.py`
- **Test Files**: `test_{module_name}.py` (e.g., `test_call_outcome_system.py`)

#### Classes
- **Format**: `PascalCase`
- **Examples**: `CallOutcomeProcessor`, `PhoneNumberManager`, `AgentConfig`
- **Test Classes**: `Test{ClassName}` (e.g., `TestCallOutcomeProcessor`)

#### Functions & Methods
- **Format**: `snake_case`
- **Examples**: `process_call_outcome()`, `validate_signature()`, `get_user_agents()`
- **Private Methods**: Prefix with `_` (e.g., `_classify_outcome()`)
- **Dunder Methods**: `__init__()`, `__str__()`, `__repr__()`

#### Variables
- **Format**: `snake_case`
- **Examples**: `user_id`, `agent_config`, `call_duration`, `event_payload`
- **Private Variables**: Prefix with `_` (e.g., `_internal_state`)

#### Constants
- **Format**: `UPPER_SNAKE_CASE`
- **Examples**: `MAX_CONCURRENT_CALLS`, `DEFAULT_POLL_INTERVAL`, `API_BASE_URL`
- **Location**: Top of file or in a `config.py` module

**Example**:
```python
# Constants
MAX_RETRIES = 3
DEFAULT_TIMEOUT = 30

class CallOutcomeProcessor:
    """Process call outcome events with idempotency"""

    def __init__(self):
        self._event_cache = {}

    def process_call_outcome(self, event: Dict[str, Any]) -> bool:
        """Main entry point for processing outcomes"""
        return self._validate_and_process(event)

    def _validate_and_process(self, event: Dict[str, Any]) -> bool:
        """Private method for internal validation"""
        pass
```

---

### TypeScript/JavaScript Naming

#### Files
- **Components**: `PascalCase.tsx` (e.g., `AgentCard.tsx`, `DashboardLayout.tsx`)
- **Utilities**: `camelCase.ts` (e.g., `apiClient.ts`, `formatters.ts`)
- **Hooks**: `use{Name}.ts` (e.g., `useAuth.ts`, `useAgents.ts`)
- **Types**: `{Name}.types.ts` or `types.ts` (e.g., `Agent.types.ts`)

#### Components
- **Format**: `PascalCase`
- **Examples**: `AgentCard`, `DashboardLayout`, `PhoneNumberList`
- **Props Interface**: `{ComponentName}Props` (e.g., `AgentCardProps`)

#### Functions
- **Format**: `camelCase`
- **Examples**: `fetchAgents()`, `validatePhoneNumber()`, `formatDuration()`
- **Event Handlers**: `handle{Event}` (e.g., `handleClick`, `handleSubmit`)
- **Callbacks**: `on{Event}` prop names (e.g., `onClick`, `onSubmit`)

#### Variables
- **Format**: `camelCase`
- **Examples**: `userId`, `agentConfig`, `isLoading`, `errorMessage`
- **Boolean Variables**: Prefix with `is`, `has`, `should` (e.g., `isActive`, `hasError`)

#### Constants
- **Format**: `UPPER_SNAKE_CASE` or `camelCase` (depending on usage)
- **Examples**: `API_BASE_URL`, `MAX_FILE_SIZE`, `DEFAULT_AGENT_VOICE`

#### Types & Interfaces
- **Format**: `PascalCase`
- **Examples**: `Agent`, `CallLog`, `Campaign`, `UserProfile`
- **Interface Prefix**: No `I` prefix (just `Agent`, not `IAgent`)

**Example**:
```typescript
// types.ts
export interface Agent {
  id: string;
  userId: string;
  name: string;
  instructions: string;
  isActive: boolean;
  createdAt: Date;
}

export interface AgentCardProps {
  agent: Agent;
  onEdit?: (agent: Agent) => void;
  onDelete?: (agentId: string) => void;
}

// AgentCard.tsx
'use client';

import { Card, Button } from '@heroui/react';
import { Agent, AgentCardProps } from './types';

export default function AgentCard({ agent, onEdit, onDelete }: AgentCardProps) {
  const handleEditClick = () => {
    onEdit?.(agent);
  };

  const handleDeleteClick = () => {
    if (confirm('Delete this agent?')) {
      onDelete?.(agent.id);
    }
  };

  return (
    <Card>
      <h3>{agent.name}</h3>
      <Button onClick={handleEditClick}>Edit</Button>
      <Button color="danger" onClick={handleDeleteClick}>Delete</Button>
    </Card>
  );
}
```

---

## 🔀 API Routing Patterns

### RESTful Endpoint Structure

**Base Pattern**: `/{scope}/{resource}/{id?}/{action?}`

#### Scopes
- `/api/user/*` - User-scoped endpoints (authenticated)
- `/api/admin/*` - Admin-only endpoints
- `/api/public/*` - Public endpoints (no auth)
- `/api/webhooks/*` - Webhook receivers (signature validation)

#### Resource Naming
- Plural nouns (e.g., `/agents`, `/campaigns`, `/calls`)
- Kebab-case for multi-word resources (e.g., `/phone-numbers`)

#### HTTP Methods
- `GET` - Retrieve resources
- `POST` - Create resources or trigger actions
- `PUT` - Update entire resource
- `PATCH` - Partial update (if needed)
- `DELETE` - Delete resource

### Standard CRUD Endpoints

```
# List resources
GET /api/user/agents
  Query params: ?page=1&limit=20&status=active

# Get single resource
GET /api/user/agents/:id

# Create resource
POST /api/user/agents
  Body: { name, instructions, voice, ... }

# Update resource
PUT /api/user/agents/:id
  Body: { name, instructions, ... }

# Delete resource
DELETE /api/user/agents/:id

# Custom actions (use POST)
POST /api/user/agents/:id/deploy
POST /api/user/agents/:id/test-call
POST /api/user/campaigns/:id/start
POST /api/user/campaigns/:id/stop
```

### Query Parameters

**Pagination**:
```
?page=1&limit=20&offset=0
```

**Filtering**:
```
?status=active&agentId=abc123&outcome=completed
```

**Sorting**:
```
?sort=createdAt&order=desc
```

**Date Ranges**:
```
?startDate=2025-01-01&endDate=2025-12-31
```

**Search**:
```
?search=keyword&searchFields=name,description
```

### Response Format

**Success Response**:
```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "name": "Sales Agent",
    ...
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid phone number format",
    "field": "phoneNumber"
  }
}
```

**List Response**:
```json
{
  "success": true,
  "data": [
    { "id": "1", "name": "Agent 1" },
    { "id": "2", "name": "Agent 2" }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### HTTP Status Codes

- `200 OK` - Success (GET, PUT, DELETE)
- `201 Created` - Resource created (POST)
- `204 No Content` - Success with no response body
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not authorized
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - Resource already exists
- `422 Unprocessable Entity` - Validation failed
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## 🗄️ Database Model Conventions

### SQLAlchemy Models

**File**: `database.py`

#### Model Structure
```python
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

class AgentConfig(Base):
    """Agent configurations per user"""
    __tablename__ = 'agent_configs'

    # Primary Key
    id = Column(String(36), primary_key=True)

    # Foreign Keys
    userId = Column('userId', String(36), ForeignKey('users.id'), nullable=False)

    # Data Columns
    name = Column(String(255), nullable=False)
    instructions = Column(Text, nullable=False)
    voice = Column(String(50), default='alloy')

    # Timestamps
    createdAt = Column('createdAt', DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column('updatedAt', DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship('User', back_populates='agents')
    call_logs = relationship('CallLog', back_populates='agent_config')
```

#### Conventions
1. **Table Name**: Use `__tablename__` with snake_case
2. **Column Mapping**: Use `Column('camelCase', ...)` for Prisma compatibility
3. **Relationships**: Use `relationship()` with `back_populates`
4. **Cascade**: Define cascade behavior (e.g., `cascade='all, delete-orphan'`)
5. **Nullable**: Explicitly set `nullable=True/False`
6. **Defaults**: Use `default=` for default values

### Database Queries

#### User-Scoped Queries (Multi-Tenancy)
Always filter by `userId`:
```python
# Correct
agents = db.query(AgentConfig).filter(
    AgentConfig.userId == user_id
).all()

# Incorrect - security vulnerability
agents = db.query(AgentConfig).all()
```

#### Joins
```python
results = db.query(CallLog, AgentConfig).join(
    AgentConfig, CallLog.agentConfigId == AgentConfig.id
).filter(
    CallLog.userId == user_id
).all()
```

#### Transactions
```python
try:
    db.begin()
    db.execute(text("INSERT INTO ..."))
    db.execute(text("UPDATE ..."))
    db.commit()
except Exception as e:
    db.rollback()
    raise
```

---

## 📦 Component Structure (Frontend)

### File Organization

```
components/
├── ui/                      # HeroUI wrapper components
│   ├── Button.tsx
│   ├── Card.tsx
│   └── Modal.tsx
├── dashboard/               # Dashboard-specific components
│   ├── DashboardLayout.tsx
│   ├── Sidebar.tsx
│   └── Header.tsx
├── agents/                  # Agent-related components
│   ├── AgentCard.tsx
│   ├── AgentForm.tsx
│   └── AgentList.tsx
└── shared/                  # Shared utility components
    ├── LoadingSpinner.tsx
    ├── ErrorBoundary.tsx
    └── EmptyState.tsx
```

### Component Template

```typescript
'use client';  // Only if needed (client-side state/effects)

import { useState, useEffect } from 'react';
import { Card, Button } from '@heroui/react';

// Types
interface ComponentNameProps {
  prop1: string;
  prop2?: number;
  onAction?: (data: any) => void;
}

// Component
export default function ComponentName({
  prop1,
  prop2 = 10,
  onAction
}: ComponentNameProps) {
  // State
  const [state, setState] = useState<string>('');

  // Effects
  useEffect(() => {
    // Effect logic
  }, []);

  // Event Handlers
  const handleClick = () => {
    onAction?.(state);
  };

  // Render
  return (
    <Card>
      <h3>{prop1}</h3>
      <Button onClick={handleClick}>Action</Button>
    </Card>
  );
}
```

### Component Best Practices

1. **Single Responsibility**: One component = one responsibility
2. **Small Components**: Aim for <200 lines per component
3. **Props Interface**: Always define props interface
4. **Optional Props**: Use `?` and provide defaults
5. **Event Handlers**: Prefix with `handle`
6. **Conditional Rendering**: Use ternary or early returns
7. **Loading States**: Handle loading, error, and empty states
8. **Accessibility**: Use semantic HTML and ARIA labels

---

## 🔀 Git Commit Conventions

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style (formatting, no logic change)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Test changes
- `chore` - Build/tools/dependencies

### Scopes
- `agents` - Agent management
- `campaigns` - Campaign engine
- `webhooks` - Webhook processing
- `frontend` - Frontend changes
- `backend` - Backend API
- `database` - Database schema
- `telephony` - SIP/phone integration
- `billing` - Payment/subscriptions

### Subject
- Use imperative mood ("Add feature" not "Added feature")
- Don't capitalize first letter
- No period at the end
- Max 50 characters

### Body
- Explain what and why (not how)
- Wrap at 72 characters
- Separate from subject with blank line

### Footer
- Reference issues: `Closes #123`, `Fixes #456`
- Breaking changes: `BREAKING CHANGE: description`

### Examples

**Feature**:
```
feat(agents): add voice cloning support

Integrate ElevenLabs API for custom voice cloning.
Users can now upload voice samples and create custom TTS voices.

Closes #234
```

**Bug Fix**:
```
fix(webhooks): prevent duplicate event processing

Add unique constraint on livekit_call_events.event_id to ensure
idempotency at database level. Previous check was vulnerable to
race conditions.

Fixes #456
```

**Documentation**:
```
docs(superclaude): create architecture documentation

Add comprehensive architecture docs including system layers,
module boundaries, and data flow patterns for Epic Voice Suite.
```

**Refactor**:
```
refactor(campaigns): extract lead processing logic

Move lead processing logic from campaign_engine.py to separate
lead_processor.py module for better separation of concerns.
```

---

## 🧪 Testing Conventions

### Test File Structure

```python
"""
Test module for call outcome processing
"""
import pytest
from unittest.mock import Mock, patch
from call_outcome_processor import CallOutcomeProcessor

# Test fixtures
@pytest.fixture
def processor():
    """Create processor instance for testing"""
    return CallOutcomeProcessor()

@pytest.fixture
def sample_event():
    """Sample LiveKit event payload"""
    return {
        'event_id': 'evt_123',
        'room_name': 'test-room',
        'duration': 45,
        'disconnect_reason': 'user_left'
    }

# Test cases
def test_outcome_classification_completed(processor, sample_event):
    """Test that calls >10s are classified as completed"""
    outcome = processor._classify_outcome(sample_event, 45)
    assert outcome == 'completed'

def test_outcome_classification_no_answer(processor, sample_event):
    """Test that calls <10s are classified as no_answer"""
    sample_event['duration'] = 5
    outcome = processor._classify_outcome(sample_event, 5)
    assert outcome == 'no_answer'

@patch('livekit_api.create_call')
def test_outbound_call_success(mock_create_call):
    """Test successful outbound call initiation"""
    mock_create_call.return_value = {'room_name': 'test-room'}
    result = initiate_call('+1234567890', 'agent-123')
    assert result['success'] == True
    mock_create_call.assert_called_once()
```

### Test Naming
- **Format**: `test_{what}_{condition}_{expected}`
- **Examples**:
  - `test_outcome_classification_completed()`
  - `test_signature_validation_invalid_rejects()`
  - `test_campaign_start_no_leads_returns_error()`

### Test Organization
1. **Arrange**: Set up test data and mocks
2. **Act**: Execute the function being tested
3. **Assert**: Verify expected behavior

### Mocking External Services
Always mock external APIs (LiveKit, Magnus, OpenAI, Stripe):
```python
@patch('openai.ChatCompletion.create')
def test_llm_response(mock_openai):
    mock_openai.return_value = {'choices': [{'text': 'Hello'}]}
    response = get_agent_response('Hi')
    assert response == 'Hello'
```

---

## 📁 Folder Organization Standards

### Project Root Structure
```
/opt/livekit1/                    # Project root
├── frontend/                     # Next.js 15 application
│   ├── app/                      # App Router pages
│   ├── components/               # React components
│   ├── lib/                      # Utility functions
│   ├── public/                   # Static assets
│   └── styles/                   # Global styles
│
├── agents/                       # LiveKit Agent deployments
│   └── tst0002/                  # Production agent
│       ├── agent.py              # Agent entry point
│       ├── db_config.py          # DB config loader
│       └── .env                  # Agent environment
│
├── migrations/                   # Database migrations
│   ├── 001_initial_schema.sql
│   ├── 002_add_campaigns.sql
│   └── 008_call_outcome_recording.sql
│
├── docs/                         # Documentation
│   ├── SUPERCLAUDE/              # SuperClaude knowledge base
│   └── *.md                      # Feature documentation
│
├── backend/                      # Backend modules (optional)
│   ├── agent_creator.py
│   └── phone_number_manager.py
│
├── scripts/                      # Utility scripts
│   └── maintenance/
│
├── user_dashboard.py             # Main Flask backend
├── database.py                   # SQLAlchemy models
├── campaign_engine.py            # Campaign orchestration
├── livekit_webhook_listener.py   # Webhook handler
├── .env                          # Backend environment
└── README.md                     # Project README
```

### Module Placement Rules

**Backend Python Files**:
- **Root Level**: Core application files (`user_dashboard.py`, `database.py`)
- **backend/**: Reusable modules and services
- **agents/**: LiveKit agent code (isolated)
- **migrations/**: Database schema changes

**Frontend TypeScript Files**:
- **app/**: Next.js pages (App Router)
- **components/**: Reusable React components
- **lib/**: Utility functions and helpers
- **public/**: Static assets (images, fonts)

**Documentation Files**:
- **docs/SUPERCLAUDE/**: Architecture and conventions
- **docs/**: Feature-specific documentation
- **Root**: High-level README and guides

### When to Create New Folders

**Create New Folder When**:
- Grouping 3+ related files
- Creating logical module boundary
- Separating concerns (e.g., tests, scripts)
- Organizing by feature domain

**Keep in Existing Folder When**:
- Single file or 2 related files
- Part of existing module
- Utility/helper functions
- Temporary or experimental code

---

## 📋 Pull Request Guidelines

### PR Template Structure

```markdown
## Description
Brief description of changes (1-2 sentences)

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)

## Related Issues
Closes #123
Fixes #456

## Changes Made
- Added call outcome query API endpoints
- Implemented pagination and filtering
- Created integration tests

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] All tests passing locally

### Test Coverage
```
npm test              # Frontend tests
pytest -v            # Backend tests
```

## Database Changes
- [ ] Migration created (`migrations/00X_description.sql`)
- [ ] Migration tested on development database
- [ ] Rollback procedure documented

## Documentation
- [ ] Code comments added/updated
- [ ] README updated (if needed)
- [ ] API documentation updated
- [ ] Architecture docs updated (if needed)

## Security Considerations
- [ ] No secrets or API keys in code
- [ ] Input validation added
- [ ] SQL injection prevention verified
- [ ] Authentication/authorization checked

## Performance Impact
- [ ] No significant performance degradation
- [ ] Database queries optimized
- [ ] Indexes added (if needed)
- [ ] Load testing performed (if applicable)

## Screenshots (if UI changes)
[Attach screenshots or videos]

## Checklist
- [ ] Code follows project conventions (CONVENTIONS.md)
- [ ] No console.log or print statements
- [ ] No commented-out code
- [ ] Commit messages follow format
- [ ] Branch up to date with main
```

### PR Review Process

#### Submitter Responsibilities
1. **Self-Review**: Review your own code before submitting
2. **Testing**: Run all tests locally
3. **Documentation**: Update relevant docs
4. **Description**: Provide clear PR description
5. **Size**: Keep PRs small (<500 lines preferred)

#### Reviewer Responsibilities
1. **Code Quality**: Check for readability and maintainability
2. **Logic**: Verify correctness and edge cases
3. **Security**: Look for vulnerabilities
4. **Performance**: Consider performance implications
5. **Tests**: Ensure adequate test coverage

#### Approval Criteria
- **1 Approval**: Standard changes (bug fixes, small features)
- **2 Approvals**: Architectural changes, database schema
- **All Tests Pass**: CI/CD pipeline must be green
- **No Merge Conflicts**: Branch must be up to date

---

## 🔍 Code Review Checklist

### Before Submitting PR
- [ ] Code follows naming conventions (CONVENTIONS.md)
- [ ] All tests pass locally (`npm test && pytest -v`)
- [ ] New features have tests (unit + integration)
- [ ] Documentation updated (README, API docs, comments)
- [ ] No console.log or print statements (use proper logging)
- [ ] No commented-out code (remove or explain)
- [ ] No hardcoded secrets or API keys (use environment variables)
- [ ] Database migrations tested (up and down)
- [ ] Multi-tenant isolation verified (userId scoping)
- [ ] Error handling implemented
- [ ] Commit messages follow format

### Reviewer Checklist
- [ ] **Code Quality**: Readable, maintainable, follows conventions
- [ ] **Logic**: Correct, handles edge cases, no obvious bugs
- [ ] **Security**: No vulnerabilities, proper validation, no SQL injection
- [ ] **Performance**: Efficient queries, no N+1 problems, proper indexing
- [ ] **Tests**: Comprehensive coverage, meaningful assertions
- [ ] **Documentation**: Clear comments, updated docs, API changes documented
- [ ] **Multi-Tenancy**: userId scoping enforced, no data leakage
- [ ] **Error Handling**: Graceful failures, proper logging, user-friendly messages
- [ ] **Scalability**: Can handle expected load, no bottlenecks

### Security Review (For Security-Sensitive Changes)
- [ ] **Authentication**: Proper session management, no token leakage
- [ ] **Authorization**: RBAC enforced, userId scoping correct
- [ ] **Input Validation**: All inputs validated, sanitized
- [ ] **SQL Injection**: ORM used, no raw SQL with string interpolation
- [ ] **XSS Prevention**: Output escaped, CSP headers set
- [ ] **CSRF Protection**: CSRF tokens used for state-changing operations
- [ ] **Secrets Management**: No secrets in code, environment variables used
- [ ] **Rate Limiting**: API endpoints rate-limited appropriately

---

## 🚀 PR Best Practices

### Good PR Characteristics
1. **Small & Focused**: <500 lines, single purpose
2. **Clear Title**: Descriptive, follows commit format
3. **Detailed Description**: Explains what, why, and how
4. **Test Coverage**: New code has tests
5. **Documentation**: Changes documented
6. **No Breaking Changes**: Or clearly marked and discussed

### Bad PR Characteristics
1. **Too Large**: >1000 lines, multiple concerns
2. **Vague Title**: "Update code" or "Fix bug"
3. **No Description**: Forces reviewers to guess intent
4. **No Tests**: New features untested
5. **Undocumented**: Changes not explained
6. **Breaking Changes**: Without discussion or migration path

### PR Size Guidelines
- **Tiny** (< 50 lines): Quick review, fast merge
- **Small** (50-200 lines): Standard review, normal merge
- **Medium** (200-500 lines): Careful review, may need multiple reviewers
- **Large** (500-1000 lines): Break into smaller PRs if possible
- **Huge** (> 1000 lines): Should be split or justified (e.g., generated code)

---

## 📝 Commit Message Examples

### Good Commits
```
feat(agents): add voice cloning support

Integrate ElevenLabs API for custom voice cloning.
Users can now upload voice samples and create custom TTS voices.

Closes #234
```

```
fix(webhooks): prevent duplicate event processing

Add unique constraint on livekit_call_events.event_id to ensure
idempotency at database level. Previous check was vulnerable to
race conditions.

Fixes #456
```

```
refactor(campaigns): extract lead processing logic

Move lead processing logic from campaign_engine.py to separate
lead_processor.py module for better separation of concerns.
No functional changes.
```

### Bad Commits
```
Update code             ❌ Too vague
Fix bug                 ❌ What bug?
WIP                     ❌ Not final
Fixes                   ❌ Fixes what?
Changes                 ❌ No context
```

---

## 🎨 UI Refactor Rules

### Component Architecture Standards

When refactoring or building new UI pages, follow these component selection rules for consistency:

#### Page Structure

**Always use PageHeader for top-level sections**:
```tsx
import { PageHeader } from '@/components/layout';

<PageHeader
  title="Page Title"
  subtitle="Page description or count"
  actions={<Button>Action</Button>}
/>
```

**Always group search, filters, date, export inside Toolbar**:
```tsx
import { Toolbar } from '@/components/layout';

<Toolbar
  left={
    <Input
      placeholder="Search..."
      startContent={<Search className="h-4 w-4" />}
    />
  }
  right={
    <>
      <Button startContent={<Filter />}>Filters</Button>
      <Button startContent={<Download />}>Export</Button>
    </>
  }
/>
```

#### Domain Components

**Use specialized grid/list components where available**:
- `AgentGrid` - For displaying agent cards
- `CallsTable` - For call log lists (when implemented)
- `CampaignGrid` - For campaign cards (when implemented)

```tsx
import { AgentGrid } from '@/components/agents';

<AgentGrid
  agents={agents}
  onSelect={handleSelect}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

#### Detail Surfaces

**Use InspectorDrawer for detail surfaces**:
```tsx
import { InspectorDrawer } from '@/components/layout';

<InspectorDrawer
  open={isOpen}
  onClose={handleClose}
  title="Detail Title"
>
  {/* Detail content */}
</InspectorDrawer>
```

**Prefer slide-in inspector over new page routes**:
- ✅ Inspector drawer for quick details and editing
- ❌ Full page navigation for simple CRUD operations
- Use page routes only for complex multi-step workflows

#### Primitive Components

**Replace cards with MetricStat where possible for dashboards**:
```tsx
import { MetricStat } from '@/components/primitives';

<MetricStat
  icon={Phone}
  label="Total Calls"
  value={totalCalls}
  variant="success"
/>
```

**Replace badges with StatusBadge**:
```tsx
import { StatusBadge } from '@/components/primitives';

<StatusBadge
  variant="running"  // running | inactive | deploying | error
  label="Active"
/>
```

**Use Waveform for call audio state**:
```tsx
import { Waveform } from '@/components/primitives';

<Waveform
  barCount={15}
  height={32}
  barColor="bg-green-500"
  animated={isActive}
/>
```

### Visual Consistency Standards

#### Spacing
**Use consistent spacing patterns**:
- Page padding: `pt-6 pb-6 px-6`
- Section gaps: `space-y-6` or `gap-6`
- Component internal spacing: `p-4` or `p-6`

```tsx
// Page wrapper
<div className="pt-6 pb-6 px-6">
  {/* Content */}
</div>

// Section stacking
<div className="space-y-6">
  <Section1 />
  <Section2 />
</div>

// Grid layout
<div className="grid grid-cols-3 gap-6">
  <Card />
  <Card />
  <Card />
</div>
```

#### Border Radius
**Use consistent radii**:
- Primary elements: `rounded-2xl`
- Secondary elements: `rounded-lg`
- Small elements: `rounded-md`

```tsx
<Card className="rounded-2xl">  {/* Primary cards */}
<Button className="rounded-lg">  {/* Buttons */}
<Badge className="rounded-md">   {/* Small badges */}
```

#### Icons
**Use lucide-react icons consistently**:
```tsx
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Download,
  Phone,
  Clock,
  TrendingUp
} from 'lucide-react';

<Button startContent={<Plus className="h-4 w-4" />}>
  Create
</Button>
```

### Action Patterns

#### Danger Actions
**Danger actions = destructive style + confirmation**:
```tsx
// Delete button styling
<Button
  color="danger"
  variant="flat"
  startContent={<Trash2 className="h-4 w-4" />}
  onPress={handleDelete}
>
  Delete
</Button>

// Always confirm destructive actions
const handleDelete = (item) => {
  if (confirm(`Delete ${item.name}?`)) {
    // Proceed with deletion
  }
};
```

### Layout Patterns

**Standard Page Layout**:
```tsx
<div className="flex flex-col h-screen">
  {/* Fixed Header */}
  <PageHeader
    title="Page Title"
    subtitle="Subtitle"
    actions={<Button>Action</Button>}
  />

  {/* Fixed Toolbar */}
  <Toolbar
    left={<Input placeholder="Search..." />}
    right={<Button>Filter</Button>}
  />

  {/* Scrollable Content */}
  <div className="flex-1 overflow-auto pt-6 pb-6 px-6">
    <div className="space-y-6">
      {/* Page content */}
    </div>
  </div>
</div>
```

**Grid Layout**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => (
    <Card key={item.id} className="rounded-2xl">
      {/* Card content */}
    </Card>
  ))}
</div>
```

**Metric Dashboard Layout**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <MetricStat
    icon={Phone}
    label="Total Calls"
    value={stats.total}
    variant="primary"
  />
  <MetricStat
    icon={Clock}
    label="Avg Duration"
    value={stats.avgDuration}
    variant="default"
  />
  <MetricStat
    icon={TrendingUp}
    label="Success Rate"
    value={`${stats.successRate}%`}
    variant="success"
  />
</div>
```

### Anti-Patterns to Avoid

**Don't**:
- ❌ Create custom header components (use PageHeader)
- ❌ Scatter search/filter controls across page (use Toolbar)
- ❌ Use inline badge styling (use StatusBadge)
- ❌ Create custom metric cards (use MetricStat)
- ❌ Navigate to new pages for simple details (use InspectorDrawer)
- ❌ Mix spacing patterns (stick to pt-6 pb-6 px-6)
- ❌ Use custom icons (use lucide-react)
- ❌ Allow destructive actions without confirmation

**Do**:
- ✅ Use provided layout components consistently
- ✅ Group related controls in Toolbar
- ✅ Use primitive components for common patterns
- ✅ Slide-in inspector for quick details
- ✅ Consistent spacing and radii
- ✅ lucide-react icons throughout
- ✅ Confirm all destructive actions

### Migration Checklist

When refactoring existing pages:
- [ ] Replace custom header with PageHeader
- [ ] Move search/filters to Toolbar
- [ ] Replace custom grids with domain components (AgentGrid, etc.)
- [ ] Convert detail pages to InspectorDrawer where appropriate
- [ ] Replace custom badges with StatusBadge
- [ ] Replace metric cards with MetricStat
- [ ] Update spacing to pt-6 pb-6 px-6 pattern
- [ ] Change border radius to rounded-2xl
- [ ] Replace custom icons with lucide-react
- [ ] Add confirmation for danger actions

---

**Document Version**: 1.0
**Maintained By**: Development Team
**Review Cycle**: Quarterly
**Last Reviewed**: October 29, 2025

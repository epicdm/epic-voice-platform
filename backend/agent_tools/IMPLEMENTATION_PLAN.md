# Agent Tools Implementation Plan

**Date**: 2025-11-19
**Status**: In Progress

---

## Overview

Complete tool integration system for AI agents with:
- Document Upload + FAQ Manager
- Google Calendar Integration
- Email Follow-up Service
- Enhanced Odoo CRM
- Web Search (Tavily/Perplexity)
- Human Handoff System
- SMS Follow-up
- Webhooks

---

## Phase 1: Foundation ✅

### Database Schema
- ✅ Created comprehensive database schema (DATABASE_SCHEMA.sql)
- ✅ Applied to `epic_voice_db`
- ✅ 14 tables created (agent_tools, knowledge_base_documents, faq_entries, etc.)
- ✅ Sample tool templates inserted

### Python Models
- ✅ Created SQLAlchemy models (models.py)
- ✅ All 15 models defined with proper relationships

### Knowledge Base Service
- ✅ Document upload and processing
- ✅ Text extraction (PDF, DOCX, TXT, CSV)
- ✅ Chunking for RAG
- ✅ FAQ CRUD operations
- ✅ Bulk FAQ import
- ✅ Simple keyword search (can upgrade to vector search later)

---

## Phase 2: Backend APIs (In Progress)

### A. Knowledge Base API Routes
**File**: `/opt/livekit1/backend/agent_tools/routes.py`

#### Document Management
```python
POST   /api/user/agents/{agent_id}/knowledge-base/documents
GET    /api/user/agents/{agent_id}/knowledge-base/documents
GET    /api/user/agents/{agent_id}/knowledge-base/documents/{doc_id}
DELETE /api/user/agents/{agent_id}/knowledge-base/documents/{doc_id}
GET    /api/user/agents/{agent_id}/knowledge-base/statistics
```

#### FAQ Management
```python
POST   /api/user/agents/{agent_id}/knowledge-base/faqs
GET    /api/user/agents/{agent_id}/knowledge-base/faqs
PUT    /api/user/agents/{agent_id}/knowledge-base/faqs/{faq_id}
DELETE /api/user/agents/{agent_id}/knowledge-base/faqs/{faq_id}
POST   /api/user/agents/{agent_id}/knowledge-base/faqs/bulk-import
```

#### RAG Search (used by agent at runtime)
```python
POST   /api/user/agents/{agent_id}/knowledge-base/search
```

### B. Calendar Integration API
**File**: `/opt/livekit1/backend/agent_tools/calendar_service.py` + routes

#### Setup & Configuration
```python
POST   /api/user/agents/{agent_id}/calendar/connect  # OAuth flow start
GET    /api/user/agents/{agent_id}/calendar/callback # OAuth callback
GET    /api/user/agents/{agent_id}/calendar/integrations
DELETE /api/user/agents/{agent_id}/calendar/integrations/{integration_id}
```

#### Calendar Operations (used by agent)
```python
GET    /api/user/agents/{agent_id}/calendar/availability
POST   /api/user/agents/{agent_id}/calendar/bookings
GET    /api/user/agents/{agent_id}/calendar/bookings
PUT    /api/user/agents/{agent_id}/calendar/bookings/{booking_id}
DELETE /api/user/agents/{agent_id}/calendar/bookings/{booking_id}
```

### C. Email Service API
**File**: `/opt/livekit1/backend/agent_tools/email_service.py` + routes

#### Email Templates
```python
POST   /api/user/agents/{agent_id}/email/templates
GET    /api/user/agents/{agent_id}/email/templates
PUT    /api/user/agents/{agent_id}/email/templates/{template_id}
DELETE /api/user/agents/{agent_id}/email/templates/{template_id}
```

#### Send Emails (used by agent)
```python
POST   /api/user/agents/{agent_id}/email/send
GET    /api/user/agents/{agent_id}/email/sent
```

### D. Tool Configuration API
```python
GET    /api/user/agents/{agent_id}/tools
PUT    /api/user/agents/{agent_id}/tools/{tool_type}/enable
PUT    /api/user/agents/{agent_id}/tools/{tool_type}/disable
PUT    /api/user/agents/{agent_id}/tools/{tool_type}/config
```

### E. Tool Templates API
```python
GET    /api/tool-templates
GET    /api/tool-templates/{template_id}
POST   /api/user/agents/{agent_id}/apply-template/{template_id}
```

---

## Phase 3: Frontend UI (Next)

### Step 5: Agent Wizard Tools Page
**File**: `/opt/livekit1/frontend/components/agents/agent-wizard-step5.tsx`

#### Layout Structure
```tsx
<AgentWizardStep5>
  {/* Tool Toggle Cards */}
  <ToolCard type="knowledge_base" />
  <ToolCard type="calendar" />
  <ToolCard type="email" />
  <ToolCard type="crm" />
  <ToolCard type="web_search" />
  <ToolCard type="handoff" />

  {/* Configuration Modals */}
  <KnowledgeBaseModal />
  <CalendarModal />
  <EmailModal />
</AgentWizardStep5>
```

### Document Upload UI
**File**: `/opt/livekit1/frontend/components/knowledge-base/document-upload.tsx`

- Drag & drop file upload
- File type validation
- Progress bar
- Document list with status
- Delete confirmation

### FAQ Manager UI
**File**: `/opt/livekit1/frontend/components/knowledge-base/faq-manager.tsx`

- Add/Edit/Delete FAQ entries
- Category organization
- Bulk import from CSV
- Search and filter

### Calendar Configuration UI
**File**: `/opt/livekit1/frontend/components/calendar/calendar-config.tsx`

- OAuth connection flow
- Calendar selection
- Availability rules editor
- Time zone configuration

### Tool Templates Library
**File**: `/opt/livekit1/frontend/components/tools/template-library.tsx`

- Template cards grid
- Preview modal
- Apply template button
- Custom template creation

---

## Phase 4: Agent Runtime Integration

### LiveKit Agent Tool Functions
**File**: `/opt/livekit1/agents/tools/agent_tools.py`

```python
@function_tool
async def search_knowledge_base(context: RunContext, query: str) -> str:
    """Search uploaded documents and FAQs"""
    pass

@function_tool
async def check_calendar_availability(context: RunContext, date: str) -> str:
    """Check if time slots are available"""
    pass

@function_tool
async def book_appointment(context: RunContext, datetime: str, name: str, email: str) -> str:
    """Book a calendar appointment"""
    pass

@function_tool
async def send_followup_email(context: RunContext, to_email: str, template_name: str) -> str:
    """Send follow-up email using template"""
    pass

@function_tool
async def search_web(context: RunContext, query: str) -> str:
    """Search the web for current information"""
    pass

@function_tool
async def transfer_to_human(context: RunContext, reason: str) -> str:
    """Transfer call to live agent"""
    pass
```

### Agent Config Loading
Update agent startup to load enabled tools:
```python
def load_agent_tools(agent_config_id: str) -> List[FunctionTool]:
    """Load enabled tools for agent from database"""
    tools = db.query(AgentTool).filter(
        AgentTool.agentconfigid == agent_config_id,
        AgentTool.isenabled == True
    ).all()

    return [create_tool_function(tool) for tool in tools]
```

---

## Dependencies to Install

```bash
# For document processing
pip install PyPDF2 python-docx tiktoken

# For calendar integration
pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client

# For email
pip install sendgrid # Or use existing SMTP

# For web search
pip install tavily-python  # or perplexity-python

# For vector embeddings (future)
pip install openai pgvector sentence-transformers
```

---

## File Structure

```
/opt/livekit1/backend/agent_tools/
├── __init__.py               ✅ Created
├── DATABASE_SCHEMA.sql       ✅ Created
├── models.py                 ✅ Created
├── knowledge_base.py         ✅ Created
├── calendar_service.py       ⏳ To Create
├── email_service.py          ⏳ To Create
├── webhook_service.py        ⏳ To Create
├── web_search.py             ⏳ To Create
├── handoff_service.py        ⏳ To Create
├── routes.py                 ⏳ To Create
└── IMPLEMENTATION_PLAN.md    ✅ This file

/opt/livekit1/frontend/components/agents/
├── agent-wizard-step5.tsx            ⏳ To Create
└── agent-wizard-step5-preview.tsx    ⏳ To Create

/opt/livekit1/frontend/components/knowledge-base/
├── document-upload.tsx       ⏳ To Create
├── document-list.tsx         ⏳ To Create
├── faq-manager.tsx           ⏳ To Create
└── faq-editor.tsx            ⏳ To Create

/opt/livekit1/frontend/components/calendar/
├── calendar-config.tsx       ⏳ To Create
├── calendar-oauth.tsx        ⏳ To Create
└── booking-list.tsx          ⏳ To Create

/opt/livekit1/frontend/components/tools/
├── tool-card.tsx             ⏳ To Create
├── tool-config-modal.tsx     ⏳ To Create
└── template-library.tsx      ⏳ To Create

/opt/livekit1/agents/tools/
└── agent_tools.py            ⏳ To Create
```

---

## Testing Plan

### Unit Tests
- Knowledge base service functions
- Calendar API integration
- Email template rendering
- Webhook execution

### Integration Tests
- Document upload → processing → chunking
- OAuth flow → token refresh → API calls
- Tool execution → logging → analytics

### E2E Tests
- Complete agent creation with tools enabled
- Live call using knowledge base tool
- Calendar booking flow
- Email follow-up after call

---

## Deployment Checklist

- [ ] Install Python dependencies
- [ ] Run database migrations
- [ ] Configure OAuth credentials (Google Calendar)
- [ ] Set up email provider (SendGrid API key)
- [ ] Configure web search API (Tavily key)
- [ ] Test file upload permissions
- [ ] Build and deploy frontend
- [ ] Restart Flask backend
- [ ] Test all API endpoints
- [ ] Deploy sample agents with tools

---

## MVP Priority Order

### Week 1: Core Tools ✅ In Progress
1. ✅ Database schema
2. ✅ Python models
3. ✅ Knowledge Base service
4. ⏳ Knowledge Base API routes
5. ⏳ Step 5 UI component
6. ⏳ Document Upload UI
7. ⏳ FAQ Manager UI

### Week 2: Integrations
8. Calendar service + API
9. Calendar OAuth flow
10. Calendar configuration UI
11. Email service + templates
12. Email template UI

### Week 3: Advanced Features
13. Web search integration
14. Human handoff system
15. SMS follow-up
16. Webhooks configuration
17. Tool templates library

### Week 4: Agent Runtime
18. LiveKit agent tool functions
19. Tool loading at agent startup
20. Tool execution logging
21. Analytics and reporting

---

## Next Immediate Steps

1. **Create API Routes** (`routes.py`)
   - Knowledge Base endpoints
   - FAQ endpoints
   - Tool configuration endpoints

2. **Create Step 5 UI** (`agent-wizard-step5.tsx`)
   - Tool toggle cards
   - Configuration modals
   - Template library

3. **Create Document Upload UI** (`document-upload.tsx`)
   - Drag & drop
   - File validation
   - Progress tracking

4. **Create FAQ Manager UI** (`faq-manager.tsx`)
   - CRUD operations
   - Category management
   - Bulk import

5. **Test End-to-End**
   - Upload document
   - Create FAQ
   - Enable tools in agent
   - Test in live call

---

## Success Metrics

- ✅ All database tables created
- ✅ All models defined
- ✅ Knowledge base service functional
- ⏳ API routes tested
- ⏳ UI components built
- ⏳ Agent runtime integration
- ⏳ First live call using tools

---

**Status**: Phase 1 Complete, Phase 2 In Progress
**Next**: Create API routes and Step 5 UI

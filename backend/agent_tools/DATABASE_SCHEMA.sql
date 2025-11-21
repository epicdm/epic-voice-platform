-- Agent Tools System Database Schema
-- Comprehensive tool integration system for AI agents
-- Date: 2025-11-19

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Agent Tools Configuration
-- Links agents to their enabled tools with specific configurations
CREATE TABLE IF NOT EXISTS agent_tools (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agentConfigId TEXT NOT NULL REFERENCES agent_configs(id) ON DELETE CASCADE,
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Tool identification
    toolType TEXT NOT NULL, -- 'knowledge_base', 'calendar', 'email', 'crm', 'web_search', 'handoff', 'sms', 'webhook'
    toolName TEXT NOT NULL, -- Display name
    isEnabled BOOLEAN NOT NULL DEFAULT true,

    -- Tool configuration (JSON)
    config JSONB DEFAULT '{}',

    -- Metadata
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(agentConfigId, toolType)
);

CREATE INDEX idx_agent_tools_agent ON agent_tools(agentConfigId);
CREATE INDEX idx_agent_tools_type ON agent_tools(toolType);
CREATE INDEX idx_agent_tools_enabled ON agent_tools(isEnabled);

-- =============================================================================
-- KNOWLEDGE BASE
-- =============================================================================

-- Knowledge Base Documents
CREATE TABLE IF NOT EXISTS knowledge_base_documents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agentConfigId TEXT NOT NULL REFERENCES agent_configs(id) ON DELETE CASCADE,
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Document details
    fileName TEXT NOT NULL,
    fileType TEXT NOT NULL, -- 'pdf', 'docx', 'txt', 'csv', 'url'
    fileSize BIGINT, -- bytes
    filePath TEXT, -- Storage path or URL

    -- Processing status
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    processingError TEXT,

    -- Vector embedding metadata
    embeddingModel TEXT DEFAULT 'text-embedding-3-small',
    chunkCount INTEGER DEFAULT 0,

    -- Content
    extractedText TEXT,
    summary TEXT,

    -- Settings
    isActive BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- Higher priority documents searched first

    -- Metadata
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Full text search
    searchVector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(fileName, '') || ' ' || coalesce(extractedText, '') || ' ' || coalesce(summary, ''))
    ) STORED
);

CREATE INDEX idx_kb_docs_agent ON knowledge_base_documents(agentConfigId);
CREATE INDEX idx_kb_docs_status ON knowledge_base_documents(status);
CREATE INDEX idx_kb_docs_active ON knowledge_base_documents(isActive);
CREATE INDEX idx_kb_docs_search ON knowledge_base_documents USING GIN(searchVector);

-- Document Chunks (for RAG)
CREATE TABLE IF NOT EXISTS knowledge_base_chunks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    documentId TEXT NOT NULL REFERENCES knowledge_base_documents(id) ON DELETE CASCADE,

    -- Chunk details
    chunkIndex INTEGER NOT NULL,
    content TEXT NOT NULL,
    tokenCount INTEGER,

    -- Vector embedding (store as array for now, can migrate to pgvector later)
    embedding JSONB, -- Array of floats

    -- Metadata
    metadata JSONB DEFAULT '{}', -- Page number, section, etc.

    UNIQUE(documentId, chunkIndex)
);

CREATE INDEX idx_kb_chunks_document ON knowledge_base_chunks(documentId);

-- FAQ Entries
CREATE TABLE IF NOT EXISTS faq_entries (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agentConfigId TEXT NOT NULL REFERENCES agent_configs(id) ON DELETE CASCADE,
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- FAQ content
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT, -- Optional grouping

    -- Settings
    isActive BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,

    -- Usage statistics
    timesUsed INTEGER DEFAULT 0,
    lastUsedAt TIMESTAMP,

    -- Metadata
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Full text search
    searchVector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(question, '') || ' ' || coalesce(answer, '') || ' ' || coalesce(category, ''))
    ) STORED
);

CREATE INDEX idx_faq_agent ON faq_entries(agentConfigId);
CREATE INDEX idx_faq_active ON faq_entries(isActive);
CREATE INDEX idx_faq_category ON faq_entries(category);
CREATE INDEX idx_faq_search ON faq_entries USING GIN(searchVector);

-- =============================================================================
-- CALENDAR INTEGRATION
-- =============================================================================

-- Calendar Integrations
CREATE TABLE IF NOT EXISTS calendar_integrations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agentConfigId TEXT NOT NULL REFERENCES agent_configs(id) ON DELETE CASCADE,
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Provider details
    provider TEXT NOT NULL, -- 'google', 'outlook', 'caldav', 'cal.com'
    providerAccountId TEXT, -- Provider's user ID

    -- OAuth tokens (encrypted)
    accessToken TEXT,
    refreshToken TEXT,
    tokenExpiresAt TIMESTAMP,

    -- Calendar selection
    calendarId TEXT, -- Specific calendar to use
    calendarName TEXT,

    -- Settings
    defaultDuration INTEGER DEFAULT 30, -- minutes
    bufferTime INTEGER DEFAULT 0, -- minutes between meetings
    timezone TEXT DEFAULT 'UTC',

    -- Availability rules (JSON)
    availabilityRules JSONB DEFAULT '{}',
    -- Example: {"monday": {"start": "09:00", "end": "17:00"}, ...}

    -- Status
    isActive BOOLEAN DEFAULT true,
    lastSyncAt TIMESTAMP,
    syncError TEXT,

    -- Metadata
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(agentConfigId, provider)
);

CREATE INDEX idx_calendar_agent ON calendar_integrations(agentConfigId);
CREATE INDEX idx_calendar_provider ON calendar_integrations(provider);

-- Calendar Bookings (created by agent)
CREATE TABLE IF NOT EXISTS calendar_bookings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agentConfigId TEXT NOT NULL REFERENCES agent_configs(id) ON DELETE CASCADE,
    calendarIntegrationId TEXT NOT NULL REFERENCES calendar_integrations(id) ON DELETE CASCADE,
    callLogId TEXT REFERENCES call_logs(id),

    -- Booking details
    providerEventId TEXT, -- Event ID from calendar provider
    title TEXT NOT NULL,
    description TEXT,

    -- Time
    startTime TIMESTAMP NOT NULL,
    endTime TIMESTAMP NOT NULL,
    timezone TEXT DEFAULT 'UTC',

    -- Attendees
    attendeeName TEXT,
    attendeeEmail TEXT,
    attendeePhone TEXT,

    -- Status
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'cancelled', 'completed'
    cancellationReason TEXT,

    -- Metadata
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bookings_agent ON calendar_bookings(agentConfigId);
CREATE INDEX idx_bookings_call ON calendar_bookings(callLogId);
CREATE INDEX idx_bookings_time ON calendar_bookings(startTime);
CREATE INDEX idx_bookings_status ON calendar_bookings(status);

-- =============================================================================
-- EMAIL & SMS
-- =============================================================================

-- Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agentConfigId TEXT REFERENCES agent_configs(id) ON DELETE CASCADE,
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Template details
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    bodyHtml TEXT NOT NULL,
    bodyText TEXT, -- Plain text version

    -- Template type
    templateType TEXT, -- 'followup', 'confirmation', 'reminder', 'custom'

    -- Variables available in template
    -- {{customer_name}}, {{agent_name}}, {{call_summary}}, etc.
    availableVariables JSONB DEFAULT '[]',

    -- Settings
    isActive BOOLEAN DEFAULT true,
    isDefault BOOLEAN DEFAULT false,

    -- Usage statistics
    timesUsed INTEGER DEFAULT 0,

    -- Metadata
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_templates_agent ON email_templates(agentConfigId);
CREATE INDEX idx_email_templates_type ON email_templates(templateType);

-- Sent Emails Log
CREATE TABLE IF NOT EXISTS sent_emails (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agentConfigId TEXT NOT NULL REFERENCES agent_configs(id) ON DELETE CASCADE,
    callLogId TEXT REFERENCES call_logs(id),
    templateId TEXT REFERENCES email_templates(id),

    -- Email details
    fromAddress TEXT NOT NULL,
    toAddress TEXT NOT NULL,
    ccAddress TEXT,
    bccAddress TEXT,
    subject TEXT NOT NULL,
    bodyHtml TEXT,
    bodyText TEXT,

    -- Sending status
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced'
    providerMessageId TEXT, -- ID from email provider
    sendError TEXT,

    -- Tracking
    sentAt TIMESTAMP,
    openedAt TIMESTAMP,
    clickedAt TIMESTAMP,

    -- Metadata
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sent_emails_agent ON sent_emails(agentConfigId);
CREATE INDEX idx_sent_emails_call ON sent_emails(callLogId);
CREATE INDEX idx_sent_emails_status ON sent_emails(status);
CREATE INDEX idx_sent_emails_to ON sent_emails(toAddress);

-- SMS Templates & Log (similar to emails)
CREATE TABLE IF NOT EXISTS sms_templates (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agentConfigId TEXT REFERENCES agent_configs(id) ON DELETE CASCADE,
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    message TEXT NOT NULL, -- Max 160 chars recommended
    templateType TEXT,

    isActive BOOLEAN DEFAULT true,
    isDefault BOOLEAN DEFAULT false,
    timesUsed INTEGER DEFAULT 0,

    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sent_sms (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agentConfigId TEXT NOT NULL REFERENCES agent_configs(id) ON DELETE CASCADE,
    callLogId TEXT REFERENCES call_logs(id),
    templateId TEXT REFERENCES sms_templates(id),

    fromNumber TEXT NOT NULL,
    toNumber TEXT NOT NULL,
    message TEXT NOT NULL,

    status TEXT DEFAULT 'pending',
    providerMessageId TEXT,
    sendError TEXT,

    sentAt TIMESTAMP,
    deliveredAt TIMESTAMP,

    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sent_sms_agent ON sent_sms(agentConfigId);
CREATE INDEX idx_sent_sms_call ON sent_sms(callLogId);

-- =============================================================================
-- WEBHOOKS
-- =============================================================================

-- Webhook Configurations
CREATE TABLE IF NOT EXISTS tool_webhooks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agentConfigId TEXT NOT NULL REFERENCES agent_configs(id) ON DELETE CASCADE,
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Webhook details
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    method TEXT DEFAULT 'POST', -- GET, POST, PUT, PATCH

    -- Authentication
    authType TEXT, -- 'none', 'basic', 'bearer', 'apikey', 'oauth2'
    authConfig JSONB DEFAULT '{}',

    -- Request configuration
    headers JSONB DEFAULT '{}',
    bodyTemplate TEXT, -- JSON template with variables

    -- Trigger conditions
    triggerEvent TEXT, -- 'call_start', 'call_end', 'keyword_detected', 'manual'
    triggerConditions JSONB DEFAULT '{}',

    -- Response handling
    expectResponse BOOLEAN DEFAULT false,
    responseMapping JSONB DEFAULT '{}', -- How to parse response

    -- Status
    isActive BOOLEAN DEFAULT true,

    -- Statistics
    totalExecutions INTEGER DEFAULT 0,
    successfulExecutions INTEGER DEFAULT 0,
    failedExecutions INTEGER DEFAULT 0,
    lastExecutedAt TIMESTAMP,

    -- Metadata
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhooks_agent ON tool_webhooks(agentConfigId);
CREATE INDEX idx_webhooks_event ON tool_webhooks(triggerEvent);

-- =============================================================================
-- HUMAN HANDOFF
-- =============================================================================

-- Live Agent Pool
CREATE TABLE IF NOT EXISTS live_agents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Agent details
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,

    -- Skills/specializations
    skills JSONB DEFAULT '[]', -- ['technical', 'sales', 'billing']

    -- Availability
    isAvailable BOOLEAN DEFAULT true,
    maxConcurrentCalls INTEGER DEFAULT 1,
    currentCallCount INTEGER DEFAULT 0,

    -- Schedule
    schedule JSONB DEFAULT '{}', -- Weekly availability
    timezone TEXT DEFAULT 'UTC',

    -- Status
    isActive BOOLEAN DEFAULT true,

    -- Metadata
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_live_agents_user ON live_agents(userId);
CREATE INDEX idx_live_agents_available ON live_agents(isAvailable);

-- Handoff Transfers
CREATE TABLE IF NOT EXISTS agent_handoffs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agentConfigId TEXT NOT NULL REFERENCES agent_configs(id) ON DELETE CASCADE,
    callLogId TEXT REFERENCES call_logs(id),
    liveAgentId TEXT REFERENCES live_agents(id),

    -- Transfer details
    reason TEXT, -- Why was it transferred
    sentiment TEXT, -- Customer sentiment at transfer
    urgency TEXT, -- 'low', 'medium', 'high'

    -- Context
    conversationTranscript TEXT,
    customerInfo JSONB DEFAULT '{}',
    agentNotes TEXT, -- What AI agent learned

    -- Status
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'completed', 'cancelled'
    transferredAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acceptedAt TIMESTAMP,
    completedAt TIMESTAMP,

    -- Outcome
    resolution TEXT,
    customerSatisfaction INTEGER, -- 1-5 rating

    -- Metadata
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_handoffs_agent ON agent_handoffs(agentConfigId);
CREATE INDEX idx_handoffs_call ON agent_handoffs(callLogId);
CREATE INDEX idx_handoffs_live_agent ON agent_handoffs(liveAgentId);
CREATE INDEX idx_handoffs_status ON agent_handoffs(status);

-- =============================================================================
-- TOOL EXECUTION LOGS
-- =============================================================================

-- Audit trail of all tool executions
CREATE TABLE IF NOT EXISTS tool_execution_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    agentConfigId TEXT NOT NULL REFERENCES agent_configs(id) ON DELETE CASCADE,
    callLogId TEXT REFERENCES call_logs(id),
    toolType TEXT NOT NULL,

    -- Execution details
    functionName TEXT, -- Specific function called
    parameters JSONB DEFAULT '{}',
    result JSONB DEFAULT '{}',

    -- Status
    status TEXT NOT NULL, -- 'success', 'failure'
    errorMessage TEXT,
    executionTimeMs INTEGER, -- Latency

    -- Metadata
    executedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tool_logs_agent ON tool_execution_logs(agentConfigId);
CREATE INDEX idx_tool_logs_call ON tool_execution_logs(callLogId);
CREATE INDEX idx_tool_logs_type ON tool_execution_logs(toolType);
CREATE INDEX idx_tool_logs_time ON tool_execution_logs(executedAt);

-- =============================================================================
-- TOOL TEMPLATES
-- =============================================================================

-- Pre-configured tool sets for common use cases
CREATE TABLE IF NOT EXISTS tool_templates (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

    -- Template details
    name TEXT NOT NULL,
    description TEXT,
    category TEXT, -- 'sales', 'support', 'scheduling', 'custom'
    icon TEXT, -- Emoji or icon name

    -- Tool configuration
    tools JSONB NOT NULL, -- Array of tool configs
    -- Example: [{"toolType": "calendar", "config": {...}}, ...]

    -- Metadata
    isPublic BOOLEAN DEFAULT true, -- Available to all users
    createdBy TEXT REFERENCES users(id),
    usageCount INTEGER DEFAULT 0,

    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tool_templates_category ON tool_templates(category);
CREATE INDEX idx_tool_templates_public ON tool_templates(isPublic);

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Agent Tools Summary View
CREATE OR REPLACE VIEW agent_tools_summary AS
SELECT
    ac.id as agent_id,
    ac.name as agent_name,
    COUNT(DISTINCT at.id) as enabled_tools_count,
    COUNT(DISTINCT kbd.id) as documents_count,
    COUNT(DISTINCT faq.id) as faq_count,
    COUNT(DISTINCT ci.id) as calendar_integrations_count,
    COUNT(DISTINCT tel.id) as execution_count_24h
FROM agent_configs ac
LEFT JOIN agent_tools at ON at.agentConfigId = ac.id AND at.isEnabled = true
LEFT JOIN knowledge_base_documents kbd ON kbd.agentConfigId = ac.id AND kbd.isActive = true
LEFT JOIN faq_entries faq ON faq.agentConfigId = ac.id AND faq.isActive = true
LEFT JOIN calendar_integrations ci ON ci.agentConfigId = ac.id AND ci.isActive = true
LEFT JOIN tool_execution_logs tel ON tel.agentConfigId = ac.id
    AND tel.executedAt > NOW() - INTERVAL '24 hours'
WHERE ac.isActive = true
GROUP BY ac.id, ac.name;

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Update updatedAt timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedAt = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updatedAt
CREATE TRIGGER update_agent_tools_updated_at BEFORE UPDATE ON agent_tools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kb_documents_updated_at BEFORE UPDATE ON knowledge_base_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faq_entries_updated_at BEFORE UPDATE ON faq_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_integrations_updated_at BEFORE UPDATE ON calendar_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_bookings_updated_at BEFORE UPDATE ON calendar_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tool_webhooks_updated_at BEFORE UPDATE ON tool_webhooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_live_agents_updated_at BEFORE UPDATE ON live_agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SAMPLE DATA (for testing)
-- =============================================================================

-- Insert default tool templates
INSERT INTO tool_templates (id, name, description, category, icon, tools) VALUES
('template-appointment-scheduler', 'Appointment Scheduler', 'Schedule appointments and send confirmations', 'scheduling', '📅',
'[{"toolType": "calendar", "config": {"defaultDuration": 30}}, {"toolType": "email", "config": {"templateType": "confirmation"}}]'::jsonb),

('template-lead-qualifier', 'Lead Qualifier', 'Qualify leads and update CRM', 'sales', '🎯',
'[{"toolType": "crm", "config": {"autoCreateLead": true}}, {"toolType": "webhook", "config": {"triggerEvent": "call_end"}}]'::jsonb),

('template-support-agent', 'Support Agent', 'Handle support queries with knowledge base', 'support', '🛠️',
'[{"toolType": "knowledge_base", "config": {"useRAG": true}}, {"toolType": "handoff", "config": {"conditions": ["negative_sentiment"]}}]'::jsonb),

('template-sales-rep', 'Sales Representative', 'Full-featured sales agent with calendar and CRM', 'sales', '💼',
'[{"toolType": "calendar", "config": {"defaultDuration": 30}}, {"toolType": "crm", "config": {"autoCreateLead": true}}, {"toolType": "email", "config": {"templateType": "followup"}}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- MIGRATIONS TRACKING
-- =============================================================================

-- Track applied migrations
CREATE TABLE IF NOT EXISTS agent_tools_migrations (
    id SERIAL PRIMARY KEY,
    migration_name TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO agent_tools_migrations (migration_name) VALUES ('001_initial_schema')
ON CONFLICT (migration_name) DO NOTHING;

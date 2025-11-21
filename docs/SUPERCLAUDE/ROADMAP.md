# Epic Voice Suite - Product Roadmap

**Last Updated**: October 30, 2025
**Version**: 1.0
**Planning Horizon**: 6 months (Q4 2025 - Q2 2026)

---

## 🎯 Vision

Build the **most powerful and developer-friendly AI voice automation platform** that enables businesses to deploy intelligent voice agents for sales, support, and engagement at scale.

**Core Principles**:
1. **Developer-First**: Simple APIs, comprehensive docs, extensible architecture
2. **Enterprise-Ready**: Security, compliance, scalability from day one
3. **Multi-Channel**: Voice → SMS → Email → WhatsApp (unified platform)
4. **White Label**: Enable partners to build their own branded offerings

---

## 📊 Current State (October 30, 2025)

### Completion: 70% (Phase 1 Focus)
- ✅ **Voice Infrastructure**: LiveKit + OpenAI + Deepgram (100%)
- ✅ **Agent Management**: Creation, configuration, deployment (100%)
- ✅ **Telephony**: Magnus SIP + inbound/outbound (95%)
- ✅ **Campaign Engine**: Outbound automation (90%)
- ✅ **Call Outcomes**: Webhook processing + idempotency (100%)
- ✅ **Webhook Worker**: Delivery with retry logic (100%)
- ✅ **Transcript UI**: CallTranscriptPanel component (100%)
- ✅ **Cost Tracking**: Full breakdown + analytics (100%)
- 🔄 **CSV Export**: Design complete (50%)
- ⏳ **API Infrastructure**: Rate limiting + docs (0%)
- ⏳ **Integrations**: Odoo sync, Asterisk CDR (0%)
- ⏳ **Real-Time Monitoring**: Dashboard + Live Listen (0%)
- ⚠️ **Analytics**: Basic dashboard (60%)
- ⚠️ **White Label**: Infrastructure only (30%)
- ❌ **CRM Integration**: Not started (0%)
- ❌ **Multi-Channel**: Not started (0%)

**Phase 1 Status**: 70% complete - 3 weeks remaining (CSV Export, API Infrastructure, Integrations)

---

## 🗺️ Roadmap Overview

```
Q4 2025 (Oct-Dec)         Q1 2026 (Jan-Mar)         Q2 2026 (Apr-Jun)
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   PHASE 1        │      │   PHASE 2        │      │   PHASE 3        │
│   Foundation     │  →   │   Enhanced       │  →   │   Enterprise     │
│   70% Complete   │      │   Features       │      │   Scale          │
└──────────────────┘      └──────────────────┘      └──────────────────┘
✅ Call Outcomes         Lead Management           White Label
✅ Webhook Worker        CRM Integration           Team Collaboration
✅ Transcript UI         Analytics v2              Advanced Telephony
✅ Cost Tracking         Multi-Channel v1          Compliance Suite
🔄 CSV Export
⏳ API Infrastructure
⏳ Odoo/Asterisk
⏳ Real-Time Monitor
```

---

## 📅 Phase 1: Foundation Complete (Q4 2025)

**Goal**: Production-ready core platform with call outcome tracking, transcript UI, CSV export, and API foundations

**Duration**: 8 weeks (Oct 15 - Dec 15, 2025)
**Status**: 70% Complete

### Completed Features ✅

#### 1. Voice Infrastructure (2 weeks) - DONE
- ✅ LiveKit Agents framework integration
- ✅ OpenAI GPT-4o + TTS pipeline
- ✅ Deepgram STT integration
- ✅ Inbound/outbound call handling
- ✅ Dynamic agent routing

#### 2. Agent Management (2 weeks) - DONE
- ✅ 4-step agent creation wizard
- ✅ Agent configuration persistence
- ✅ Phone number assignment
- ✅ Database-driven agent loading

#### 3. Call Outcome Recording (2 weeks) - DONE
- ✅ Database migration (008)
- ✅ Webhook listener + processor
- ✅ Idempotency with duplicate detection
- ✅ Webhook lifecycle testing (100% pass rate)
- ✅ Phase 3 configuration complete

#### 4. Campaign Engine Polish (1 week) - DONE
- ✅ Lead CSV upload
- ✅ Campaign scheduling
- ✅ Outcome integration
- ✅ Retry logic

#### 5. Webhook Worker System (1 week) - DONE
- ✅ Webhook delivery with retry logic
- ✅ Exponential backoff (3 retries)
- ✅ Delivery status tracking
- ✅ Worker process management
- ✅ Integration tests

#### 6. Call Transcript UI (1 week) - DONE
- ✅ CallTranscriptPanel component
- ✅ Timestamp display with formatting
- ✅ Speaker labels (Bot/User icons)
- ✅ Search functionality
- ✅ Loading/error states
- ✅ Responsive design

#### 7. Cost Tracking System (1 week) - DONE
- ✅ Cost model (LLM/STT/TTS breakdown)
- ✅ Database schema for cost data
- ✅ Cost calculation endpoints
- ✅ Dashboard cost widgets
- ✅ Analytics cost charts

### In Progress 🔄

#### 8. CSV Export System (1 week) - DESIGN COMPLETE
- ✅ Design specification (claudedocs/CSV_EXPORT_DESIGN.md)
- ⏳ Backend streaming CSV endpoints
  - `/api/user/export/calls` with filters
  - `/api/user/export/agents`
  - `/api/user/export/phone-numbers`
  - `/api/user/export/analytics`
- ⏳ Frontend ExportModal component
- ⏳ Rate limiting (10 exports/hour)
- ⏳ Audit logging
- ⏳ Integration tests

### Remaining Tasks (3 weeks)

#### Week 1 (Nov 25 - Dec 1, 2025) - CSV Export
- 🆕 **Backend Implementation** (3 days)
  - Implement streaming CSV generator
  - Create 4 export endpoints
  - Add rate limiting decorator
  - Implement ExportLog audit model
  - Phone number masking utility

- 🆕 **Frontend Implementation** (2 days)
  - Create ExportModal component
  - Add export buttons to 4 pages
  - Download blob handling
  - Error handling and toasts

#### Week 2 (Dec 2-8, 2025) - API Infrastructure
- 🆕 **Rate Limiting** (2 days)
  - Install Flask-Limiter
  - Configure rate limits per endpoint
  - User-based rate tracking
  - Rate limit error responses

- 🆕 **Public API Documentation** (3 days)
  - OpenAPI/Swagger setup
  - Document all public endpoints
  - Add authentication guide
  - Create Postman collection
  - API versioning strategy

#### Week 3 (Dec 9-15, 2025) - Integration & Monitoring
- 🆕 **Odoo Contact Sync** (2 days)
  - Odoo XML-RPC connection
  - One-way contact pull (Odoo → Platform)
  - Contact mapping configuration
  - Sync scheduling (daily)

- 🆕 **Asterisk CDR Ingestion** (2 days)
  - CDR database connection
  - CDR parsing and storage
  - Historical CDR import
  - CDR analytics integration

- 🆕 **Real-Time Call Dashboard** (2 days)
  - Active calls widget (WebSocket)
  - Live call metrics
  - Call status updates
  - Agent activity monitoring

- 🆕 **Live Listen (Admin)** (1 day)
  - LiveKit room join for monitoring
  - Admin permission checks
  - Listen-only mode (no speaking)
  - Call list integration

**Phase 1 Exit Criteria**:
- ✅ All core features deployed and tested
- ✅ Call outcome recording functional end-to-end
- ✅ Webhook delivery system operational
- ✅ Call transcript UI production-ready
- ✅ Cost tracking complete with analytics
- 🔄 CSV export functional (4 endpoints)
- 🔄 API rate limiting enforced
- 🔄 Public API documentation published
- 🔄 Odoo contact sync operational
- 🔄 Asterisk CDR ingestion live
- 🔄 Real-time dashboard deployed
- 🔄 Live Listen available for admins
- ✅ Campaign engine handles 100 leads/hour
- ✅ No P0/P1 bugs in backlog

---

## 📅 Phase 2: Enhanced Features (Q1 2026)

**Goal**: Lead management, CRM integrations, advanced analytics, multi-channel v1

**Duration**: 12 weeks (Dec 1, 2025 - Feb 28, 2026)
**Status**: Not started

### Month 1: Lead Management & Analytics (4 weeks)

#### Week 1-2: Lead Management Dashboard
- **Lead List UI** (1 week)
  - Design lead table with filters (status, campaign, date range)
  - Implement lead detail view
  - Add bulk operations (export, delete)
  - Lead status update functionality

- **Lead Enrichment** (1 week)
  - Research enrichment APIs (Clearbit, Apollo)
  - Implement enrichment service
  - Integrate with lead import flow
  - Display enriched data in UI

#### Week 3-4: Advanced Analytics
- **Call Recordings** (1 week)
  - LiveKit Egress integration for recordings
  - Store recording URLs in database
  - Build playback UI component
  - Add recording search and filters

- **Call Transcription** (1 week)
  - LiveKit transcription service integration
  - Store transcripts in database
  - Build transcript search (full-text)
  - Display transcripts in call detail view

**Milestone 1**: Lead management operational, analytics v2 deployed

---

### Month 2: CRM Integration (4 weeks)

#### Week 1-2: Salesforce Integration
- **OAuth Flow** (1 week)
  - Implement Salesforce OAuth 2.0
  - Build connection management UI
  - Store connection tokens securely
  - Handle token refresh

- **Two-Way Sync** (1 week)
  - Sync contacts/leads from Salesforce
  - Push call logs to Salesforce activities
  - Handle field mapping configuration
  - Add webhook listeners for real-time sync

#### Week 3: HubSpot Integration
- OAuth flow
- Contact sync
- Activity logging
- Field mapping

#### Week 4: Integration Testing & Polish
- End-to-end testing for both CRMs
- Error handling and retry logic
- Sync performance optimization
- Documentation and user guides

**Milestone 2**: Salesforce and HubSpot integrations live

---

### Month 3: Multi-Channel v1 (4 weeks)

#### Week 1-2: SMS Campaigns
- **Twilio Integration** (1 week)
  - Integrate Twilio SMS API
  - Build SMS template management
  - Implement SMS campaign workflow
  - Add SMS to campaign creation UI

- **SMS Features** (1 week)
  - Two-way SMS conversations
  - SMS opt-out handling
  - SMS delivery tracking
  - SMS analytics dashboard

#### Week 3-4: Email Sequences
- **Resend Integration** (1 week)
  - Email template system
  - Email sending via Resend API
  - Email campaign workflow
  - Track opens/clicks

- **Email Features** (1 week)
  - Automated follow-up sequences
  - Email personalization
  - A/B testing for subject lines
  - Email analytics dashboard

**Milestone 3**: SMS and Email campaigns operational

---

**Phase 2 Exit Criteria**:
- Lead management dashboard fully functional
- Salesforce + HubSpot integrations tested with 10 customers
- Call recordings and transcripts available for all calls
- SMS and Email campaigns launched for 5 beta customers
- Analytics dashboard shows multi-channel metrics

**Resource Requirements**:
- 2 backend engineers
- 1 frontend engineer
- 1 QA engineer (part-time)
- Integration test environment (staging)

---

## 📅 Phase 3: Enterprise Scale (Q2 2026)

**Goal**: White label expansion, team collaboration, advanced telephony, compliance

**Duration**: 12 weeks (Mar 1 - May 31, 2026)
**Status**: Not started

### Month 1: White Label Expansion (4 weeks)

#### Week 1-2: Partner Webhooks
- **Webhook Delivery Service** (1 week)
  - Implement webhook delivery with retry logic
  - Add exponential backoff (3 retries)
  - Store delivery logs for debugging
  - Add webhook event filtering

- **Partner Dashboard** (1 week)
  - Webhook configuration UI
  - Event log viewer
  - Webhook testing tools
  - Documentation generator

#### Week 3-4: Custom Domains & Branding
- **Custom Email Domains** (1 week)
  - SMTP configuration per partner
  - Email template branding
  - SPF/DKIM setup automation

- **SSO Integration** (1 week)
  - SAML 2.0 implementation
  - Partner SSO configuration UI
  - Role mapping from SSO

**Milestone 1**: White label fully operational for 3 partners

---

### Month 2: Team Collaboration (4 weeks)

#### Week 1-2: Team Management
- **Team Member Invitations** (1 week)
  - Invite team members via email
  - Role-based access control (RBAC)
  - Permission boundaries testing

- **Roles & Permissions** (1 week)
  - Define roles: Admin, Manager, Agent, Viewer
  - Implement permission checks on all endpoints
  - Build role management UI

#### Week 3-4: Collaboration Features
- **Shared Agent Templates** (1 week)
  - Template library system
  - Template sharing across team
  - Template versioning

- **Activity Audit Logs** (1 week)
  - Log all user actions
  - Build audit log viewer
  - Export logs for compliance

**Milestone 2**: Team collaboration available to Enterprise customers

---

### Month 3: Advanced Telephony & Compliance (4 weeks)

#### Week 1-2: Advanced Telephony
- **Call Transfer** (1 week)
  - Implement SIP REFER for transfers
  - Add transfer trigger in agent logic
  - Build transfer configuration UI
  - Test with Magnus routing

- **IVR Builder** (1 week)
  - Design drag-and-drop IVR editor
  - Implement IVR routing logic
  - Integrate with agent dispatch
  - Add DTMF tone detection

#### Week 3-4: Compliance Suite
- **TCPA Compliance** (1 week)
  - DNC list management
  - DNC check before dialing
  - Opt-out voice command handling
  - Compliance reports

- **Call Recording Consent** (1 week)
  - Consent management system
  - Automatic consent playback
  - Consent recording and storage
  - GDPR data export tools

**Milestone 3**: Enterprise telephony and compliance live

---

**Phase 3 Exit Criteria**:
- White label fully functional for 10+ partners
- Team collaboration tested with 20 customers
- Call transfer and IVR operational
- TCPA compliance suite certified by legal
- SOC 2 Type 1 audit initiated

**Resource Requirements**:
- 2 backend engineers
- 1 frontend engineer
- 1 telephony specialist
- 1 compliance/legal consultant
- Security audit (external)

---

## 🎯 Success Metrics

### Phase 1 (Foundation)
- **Technical**:
  - System uptime: >99.5%
  - Call success rate: >95%
  - Average call latency: <500ms
  - Webhook processing time: <100ms

- **Product**:
  - 50 active users
  - 10,000 calls/month
  - 100 active agents
  - 20 active campaigns

### Phase 2 (Enhanced)
- **Technical**:
  - System uptime: >99.9%
  - CRM sync latency: <5 seconds
  - SMS delivery rate: >98%
  - Email delivery rate: >97%

- **Product**:
  - 200 active users
  - 50,000 calls/month
  - 10 Salesforce integrations live
  - 5 multi-channel campaigns

### Phase 3 (Enterprise)
- **Technical**:
  - System uptime: >99.95%
  - P0 incidents: <1 per quarter
  - Security audit: Pass SOC 2 Type 1
  - TCPA compliance: 100%

- **Product**:
  - 500 active users
  - 100,000 calls/month
  - 10 white label partners
  - 20 enterprise customers

---

## 🚧 Known Risks & Mitigation

### Technical Risks

**Risk 1**: LiveKit Cloud reliability
- **Impact**: High (core dependency)
- **Mitigation**: Monitor uptime, have fallback plan, consider multi-region

**Risk 2**: Magnus Billing SIP stability
- **Impact**: High (telephony gateway)
- **Mitigation**: Test backup SIP provider, document failover process

**Risk 3**: Database scaling bottlenecks
- **Impact**: Medium (query performance)
- **Mitigation**: Add read replicas, optimize queries, implement caching

### Business Risks

**Risk 1**: CRM integration complexity
- **Impact**: Medium (delays Phase 2)
- **Mitigation**: Start with OAuth, use official SDKs, hire integration specialist

**Risk 2**: TCPA compliance requirements
- **Impact**: High (legal risk)
- **Mitigation**: Engage legal early, implement DNC lists, document consent

**Risk 3**: White label customer churn
- **Impact**: Medium (revenue)
- **Mitigation**: Provide excellent partner support, dedicated success manager

---

## 📈 Resource Planning

### Development Team
- **Q4 2025**: 2 backend + 1 frontend + 0.5 QA = 3.5 FTE
- **Q1 2026**: 3 backend + 2 frontend + 1 QA = 6 FTE
- **Q2 2026**: 3 backend + 2 frontend + 1 QA + 1 telephony = 7 FTE

### Infrastructure Costs
- **Q4 2025**: ~$2,000/month (LiveKit, database, hosting)
- **Q1 2026**: ~$5,000/month (CRM integrations, Twilio, increased usage)
- **Q2 2026**: ~$10,000/month (white label scale, compliance tools)

---

## 🔄 Review & Adjustment Process

### Monthly Review
- Review progress against roadmap
- Adjust priorities based on customer feedback
- Reassess resource allocation
- Update roadmap document

### Quarterly Planning
- Strategic review of roadmap alignment
- Major feature prioritization
- Budget and resource planning
- Roadmap communication to stakeholders

---

## 📞 Stakeholder Communication

### Weekly Updates
- Progress on current phase milestones
- Blockers and risks
- Key decisions needed

### Monthly Demos
- Show completed features to stakeholders
- Gather feedback on upcoming features
- Align on priorities

### Quarterly Business Reviews
- Roadmap progress and adjustments
- Success metrics review
- Budget and resource planning

---

**Roadmap Principles**:
1. **Customer-Driven**: Features based on user feedback and sales pipeline
2. **Iterative**: Ship MVPs fast, iterate based on usage
3. **Quality-Focused**: No shortcuts on security, compliance, or reliability
4. **Data-Informed**: Track metrics, adjust priorities based on data

**Document Version**: 1.0
**Maintained By**: Product Team + Engineering Leads
**Review Cycle**: Monthly

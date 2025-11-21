# Phase 2: CRM Integration - Architecture & Implementation Plan

**Status**: 🚀 Ready to Begin
**Estimated Duration**: 6-8 weeks
**Priority**: 🔴 **CRITICAL** for Enterprise Sales
**Revenue Impact**: Unlocks $1M+ ARR potential

---

## 📊 Executive Summary

### Business Goals
- Enable "CRM-first" selling point for enterprise buyers
- Increase ARPU from $200-500 to $5K-15K MRR (enterprise deals)
- Differentiate from competitors (ElevenLabs, Vapi, Bland)
- Reduce manual workflow friction for existing customers

### Technical Foundation - Already Built ✅
- ✅ Database tables: `partner_webhooks`, `webhook_deliveries`
- ✅ Svix library installed (professional webhook delivery)
- ✅ White-label API infrastructure
- ✅ Partner tier system with usage tracking
- ✅ API key management system

### What Needs to Be Built
1. **Webhook Event System** - Trigger events from call lifecycle
2. **Webhook Delivery Service** - Async delivery with retries
3. **HubSpot Integration** - Contacts, deals, activities
4. **Odoo Integration** - Contacts, opportunities, activities (CRM module)
5. **Google Calendar Integration** - Appointment booking
6. **Slack Integration** - Real-time notifications
7. **Generic Webhook/Zapier Support** - For any CRM

---

## 🏗️ Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     EPIC VOICE PLATFORM                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │ Call Events  │───▶│ Event Queue  │───▶│ Webhook      │ │
│  │ (Lifecycle)  │    │ (async)      │    │ Delivery     │ │
│  └──────────────┘    └──────────────┘    │ Service      │ │
│                                           └───────┬──────┘ │
│                                                   │        │
└───────────────────────────────────────────────────┼────────┘
                                                    │
                   ┌────────────────────────────────┼─────────────────┐
                   │                                │                 │
                   ▼                                ▼                 ▼
         ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
         │ HubSpot API  │  │  Odoo API    │  │ Google Cal   │  │  Slack API   │
         │ (CRM Sync)   │  │ (CRM Sync)   │  │ (Bookings)   │  │ (Notify)     │
         └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
                │                 │                 │                 │
                ▼                 ▼                 ▼                 ▼
         ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
         │ HubSpot CRM  │  │  Odoo ERP    │  │ Google Cal   │  │    Slack     │
         └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

---

## 📋 Implementation Phases

### **Phase 2.1: Webhook Event System** (Week 1-2)

#### 2.1.1 Define Event Types
```python
WEBHOOK_EVENTS = {
    # Call Lifecycle Events
    'call.started': 'Call initiated and connected',
    'call.completed': 'Call ended successfully',
    'call.failed': 'Call failed to connect or errored',

    # Lead Events (from campaigns)
    'lead.contacted': 'Lead successfully contacted',
    'lead.qualified': 'Lead marked as qualified',
    'lead.converted': 'Lead converted to customer',
    'lead.failed': 'Lead contact attempts exhausted',

    # Campaign Events
    'campaign.started': 'Campaign execution began',
    'campaign.completed': 'Campaign finished all calls',
    'campaign.paused': 'Campaign paused by user',

    # Appointment Events (future)
    'appointment.requested': 'Agent requested appointment',
    'appointment.scheduled': 'Appointment booked in calendar',
    'appointment.cancelled': 'Appointment cancelled'
}
```

#### 2.1.2 Event Payload Structure
```json
{
  "event_id": "evt_01HXYZ123...",
  "event_type": "call.completed",
  "timestamp": "2025-10-28T20:30:00Z",
  "user_id": "b50cec05-...",
  "data": {
    "call_id": "call_123...",
    "phone_number": "+15551234567",
    "agent_id": "agent_abc...",
    "agent_name": "Sales Agent",
    "duration_seconds": 245,
    "outcome": "qualified",
    "transcript": "Full call transcript...",
    "summary": "Lead interested in demo...",
    "lead_id": "lead_xyz..." // if from campaign
  }
}
```

#### 2.1.3 Event Trigger Points

**Locations to Add Event Triggers**:

1. **campaign_engine.py** - After call completion
   ```python
   # After successful call initiation
   await trigger_webhook_event('call.started', call_data)

   # In update_call_status() when status = 'completed'
   await trigger_webhook_event('call.completed', call_data)

   # In update_call_status() when status = 'failed'
   await trigger_webhook_event('call.failed', call_data)

   # In update_lead_status() when status changes
   await trigger_webhook_event('lead.contacted', lead_data)
   ```

2. **user_dashboard.py** - Manual outbound calls
   ```python
   # After create_outbound_call() succeeds
   await trigger_webhook_event('call.started', call_data)
   ```

3. **sip_inbound_handler.py** - Inbound calls
   ```python
   # After call ends (webhook from LiveKit)
   await trigger_webhook_event('call.completed', call_data)
   ```

#### 2.1.4 Files to Create

**1. `/opt/livekit1/webhook_events.py`** (New)
```python
"""
Webhook Event System
Triggers and queues webhook events for async delivery
"""
import asyncio
import uuid
from datetime import datetime, timezone
from sqlalchemy import text
from database import SessionLocal
import logging

logger = logging.getLogger(__name__)

async def trigger_webhook_event(event_type: str, data: dict, user_id: str = None):
    """
    Queue a webhook event for delivery to all subscribed endpoints

    Args:
        event_type: Type of event (e.g., 'call.completed')
        data: Event payload data
        user_id: User ID (extracted from data if not provided)
    """
    # Implementation details...
```

**2. `/opt/livekit1/webhook_delivery_service.py`** (New)
```python
"""
Webhook Delivery Service
Background service that processes queued webhook events and delivers them
"""
import asyncio
import aiohttp
import hashlib
import hmac
from datetime import datetime, timezone
from sqlalchemy import text
from database import SessionLocal

class WebhookDeliveryService:
    """
    Delivers webhook events to configured endpoints with:
    - HMAC signature verification
    - Automatic retries with exponential backoff
    - Delivery status tracking
    - Rate limiting per endpoint
    """
```

**3. `/opt/livekit1/frontend/app/api/user/webhooks/route.ts`** (New)
```typescript
// Frontend API for webhook configuration
// GET: List webhooks
// POST: Create webhook
// PATCH: Update webhook
// DELETE: Delete webhook
```

---

### **Phase 2.2: Webhook Management UI** (Week 2)

#### 2.2.1 Frontend Pages to Create

**1. `/opt/livekit1/frontend/app/dashboard/integrations/page.tsx`**
- Integrations overview dashboard
- Quick connect buttons for HubSpot, Google, Slack
- Webhook configuration section
- Integration status indicators

**2. `/opt/livekit1/frontend/app/dashboard/integrations/webhooks/page.tsx`**
- Webhook endpoint management
- Event type selection (checkboxes)
- Test webhook button
- Delivery logs viewer
- Signature verification instructions

**3. `/opt/livekit1/frontend/components/integrations/webhook-form.tsx`**
- URL input with validation
- Event subscription selector
- Secret generation/regeneration
- Test delivery button

#### 2.2.2 API Endpoints to Create

```
POST   /api/user/webhooks                   # Create webhook
GET    /api/user/webhooks                   # List webhooks
GET    /api/user/webhooks/:id               # Get webhook details
PATCH  /api/user/webhooks/:id               # Update webhook
DELETE /api/user/webhooks/:id               # Delete webhook
POST   /api/user/webhooks/:id/test          # Send test event
GET    /api/user/webhooks/:id/deliveries    # Get delivery logs
POST   /api/user/webhooks/:id/regenerate    # Regenerate secret
```

---

### **Phase 2.3: HubSpot Integration** (Week 3-4)

#### 2.3.1 OAuth Flow
```
User clicks "Connect HubSpot"
  ↓
Redirect to HubSpot OAuth
  ↓
User authorizes Epic Voice app
  ↓
Receive OAuth code
  ↓
Exchange for access token + refresh token
  ↓
Store tokens in database (encrypted)
  ↓
Integration active
```

#### 2.3.2 Database Changes

**New Table: `crm_connections`**
```sql
CREATE TABLE crm_connections (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,  -- 'hubspot', 'salesforce', etc.
    access_token TEXT NOT NULL,      -- Encrypted
    refresh_token TEXT,              -- Encrypted
    token_expires_at TIMESTAMP,
    account_id TEXT,                 -- CRM account identifier
    account_name TEXT,
    settings JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, provider)
);

CREATE INDEX idx_crm_connections_user_id ON crm_connections(user_id);
CREATE INDEX idx_crm_connections_active ON crm_connections(active) WHERE active = true;
```

#### 2.3.3 HubSpot API Integration

**Files to Create**:

**1. `/opt/livekit1/integrations/hubspot_integration.py`**
```python
"""
HubSpot CRM Integration
Syncs contacts, deals, and activities
"""
import aiohttp
from typing import Optional, Dict, Any

class HubSpotIntegration:
    """
    HubSpot API client for Epic Voice

    Features:
    - Contact creation/update
    - Deal creation
    - Activity logging (calls)
    - Lead scoring
    """

    def __init__(self, access_token: str):
        self.access_token = access_token
        self.base_url = "https://api.hubapi.com"

    async def create_or_update_contact(self, phone_number: str, properties: dict):
        """Create contact or update if exists"""

    async def create_deal(self, contact_id: str, deal_data: dict):
        """Create sales opportunity"""

    async def log_call_activity(self, contact_id: str, call_data: dict):
        """Log call as activity on contact"""
```

#### 2.3.4 Event Handlers

**`/opt/livekit1/integrations/hubspot_webhooks.py`**
```python
"""
Handle webhook events and sync to HubSpot
"""

async def handle_call_completed(event_data: dict, hubspot: HubSpotIntegration):
    """
    When call completes:
    1. Create/update contact with phone number
    2. Log call as activity
    3. Create deal if qualified
    4. Update lead score
    """

async def handle_lead_qualified(event_data: dict, hubspot: HubSpotIntegration):
    """
    When lead qualifies:
    1. Create deal
    2. Set deal stage to "qualified"
    3. Add notes from transcript
    """
```

---

### **Phase 2.4: Odoo Integration** (Week 3-4)

#### 2.4.1 Why Odoo?

**Market Demand**:
- 7+ million users globally (Odoo claims 12M+)
- Popular in Europe, Latin America, Asia
- Open-source with strong community
- All-in-one ERP (CRM, Sales, Inventory, Accounting)
- Affordable for SMBs ($24-$37/user/month)
- Self-hosted option (important for data-sensitive industries)

**Technical Advantages**:
- RESTful JSON-RPC API
- XML-RPC for legacy support
- External API available without OAuth (API keys)
- Extensive module ecosystem
- PostgreSQL backend (same as us)

#### 2.4.2 Authentication Methods

**Method 1: API Key (Recommended)**
```python
# Odoo 15+ supports API keys (easier than OAuth)
# User provides: URL, database, username, API key
{
    "odoo_url": "https://mycompany.odoo.com",
    "database": "mycompany_prod",
    "username": "admin@company.com",
    "api_key": "odoo_api_xxxxxxxxxx"
}
```

**Method 2: Username/Password (Legacy)**
```python
# For self-hosted installations without API keys
{
    "odoo_url": "https://mycompany.odoo.com",
    "database": "mycompany_prod",
    "username": "admin",
    "password": "encrypted_password"
}
```

**No OAuth Required**: Odoo uses API keys for external integrations, simplifying setup significantly compared to OAuth flows.

#### 2.4.3 Database Configuration

**Update `crm_connections` settings for Odoo**:
```json
{
  "provider": "odoo",
  "access_token": "odoo_api_key_here",  // API key
  "settings": {
    "odoo_url": "https://mycompany.odoo.com",
    "database": "mycompany_prod",
    "username": "integration@company.com",
    "version": "16.0",  // Odoo version
    "modules": {
      "crm": true,       // CRM module enabled
      "sale": true,      // Sales module enabled
      "contacts": true   // Contacts module enabled
    },
    "field_mappings": {
      "phone": "phone",
      "mobile": "mobile",
      "email": "email",
      "name": "name"
    },
    "default_team_id": 1,  // Sales team ID
    "default_user_id": 2   // Assigned user ID
  }
}
```

#### 2.4.4 Odoo API Integration

**Files to Create**:

**1. `/opt/livekit1/integrations/odoo_integration.py`**
```python
"""
Odoo CRM/ERP Integration
Syncs contacts, opportunities (deals), and activities

Supports Odoo 13+, tested with Odoo 15, 16, 17
"""
import xmlrpc.client
import json
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

class OdooIntegration:
    """
    Odoo API client for Epic Voice

    Features:
    - Contact (res.partner) creation/update
    - Opportunity (crm.lead) creation
    - Activity logging (mail.activity, crm.activity)
    - Lead scoring and stage management
    - Notes and call transcripts

    API Methods:
    - JSON-RPC (Odoo 15+, preferred)
    - XML-RPC (all versions, fallback)
    """

    def __init__(
        self,
        url: str,
        database: str,
        username: str,
        api_key: str = None,
        password: str = None
    ):
        """
        Initialize Odoo connection

        Args:
            url: Odoo instance URL (e.g., https://mycompany.odoo.com)
            database: Database name
            username: User login
            api_key: API key (Odoo 15+)
            password: Password (legacy auth)
        """
        self.url = url.rstrip('/')
        self.database = database
        self.username = username
        self.api_key = api_key
        self.password = password
        self.uid = None

        # XML-RPC endpoints
        self.common_endpoint = f"{self.url}/xmlrpc/2/common"
        self.object_endpoint = f"{self.url}/xmlrpc/2/object"

    async def authenticate(self) -> bool:
        """
        Authenticate with Odoo and get user ID

        Returns:
            True if authentication successful
        """
        try:
            common = xmlrpc.client.ServerProxy(self.common_endpoint)
            self.uid = common.authenticate(
                self.database,
                self.username,
                self.api_key or self.password,
                {}
            )
            return self.uid is not None

        except Exception as e:
            logger.error(f"Odoo authentication failed: {e}")
            return False

    async def search_contact_by_phone(
        self,
        phone_number: str
    ) -> Optional[int]:
        """
        Search for existing contact by phone number

        Args:
            phone_number: Phone number to search

        Returns:
            Contact ID if found, None otherwise
        """
        try:
            models = xmlrpc.client.ServerProxy(self.object_endpoint)

            # Search by phone or mobile
            contact_ids = models.execute_kw(
                self.database,
                self.uid,
                self.api_key or self.password,
                'res.partner',
                'search',
                [[
                    '|',
                    ('phone', '=', phone_number),
                    ('mobile', '=', phone_number)
                ]],
                {'limit': 1}
            )

            return contact_ids[0] if contact_ids else None

        except Exception as e:
            logger.error(f"Error searching Odoo contact: {e}")
            return None

    async def create_or_update_contact(
        self,
        phone_number: str,
        properties: dict
    ) -> Optional[int]:
        """
        Create or update contact (res.partner)

        Args:
            phone_number: Primary phone number
            properties: Contact properties (name, email, etc.)

        Returns:
            Contact ID
        """
        try:
            models = xmlrpc.client.ServerProxy(self.object_endpoint)

            # Check if contact exists
            contact_id = await self.search_contact_by_phone(phone_number)

            contact_data = {
                'phone': phone_number,
                'name': properties.get('name', phone_number),
                'email': properties.get('email'),
                'mobile': properties.get('mobile'),
                'comment': properties.get('notes'),
                'type': 'contact',  # 'contact' vs 'company'
                'customer_rank': 1  # Mark as customer
            }

            if contact_id:
                # Update existing
                models.execute_kw(
                    self.database,
                    self.uid,
                    self.api_key or self.password,
                    'res.partner',
                    'write',
                    [[contact_id], contact_data]
                )
                logger.info(f"✅ Updated Odoo contact {contact_id}")
                return contact_id
            else:
                # Create new
                contact_id = models.execute_kw(
                    self.database,
                    self.uid,
                    self.api_key or self.password,
                    'res.partner',
                    'create',
                    [contact_data]
                )
                logger.info(f"✅ Created Odoo contact {contact_id}")
                return contact_id

        except Exception as e:
            logger.error(f"Error creating/updating Odoo contact: {e}")
            return None

    async def create_opportunity(
        self,
        contact_id: int,
        opportunity_data: dict
    ) -> Optional[int]:
        """
        Create CRM opportunity (crm.lead)

        Args:
            contact_id: Related contact ID
            opportunity_data: Opportunity details

        Returns:
            Opportunity ID
        """
        try:
            models = xmlrpc.client.ServerProxy(self.object_endpoint)

            lead_data = {
                'name': opportunity_data.get('name', 'Voice AI Opportunity'),
                'partner_id': contact_id,
                'phone': opportunity_data.get('phone'),
                'email_from': opportunity_data.get('email'),
                'type': 'opportunity',  # 'lead' or 'opportunity'
                'expected_revenue': opportunity_data.get('expected_revenue', 0),
                'probability': opportunity_data.get('probability', 50),
                'description': opportunity_data.get('description'),
                'team_id': opportunity_data.get('team_id'),  # Sales team
                'user_id': opportunity_data.get('user_id'),  # Assigned salesperson
            }

            opportunity_id = models.execute_kw(
                self.database,
                self.uid,
                self.api_key or self.password,
                'crm.lead',
                'create',
                [lead_data]
            )

            logger.info(f"✅ Created Odoo opportunity {opportunity_id}")
            return opportunity_id

        except Exception as e:
            logger.error(f"Error creating Odoo opportunity: {e}")
            return None

    async def log_call_activity(
        self,
        contact_id: int,
        call_data: dict
    ) -> bool:
        """
        Log call as activity on contact

        Args:
            contact_id: Contact ID
            call_data: Call details (duration, outcome, transcript)

        Returns:
            True if successful
        """
        try:
            models = xmlrpc.client.ServerProxy(self.object_endpoint)

            # Create activity (mail.activity) or note (mail.message)
            # Using mail.message for call log
            message_data = {
                'model': 'res.partner',
                'res_id': contact_id,
                'body': f"""
                    <p><strong>Call Completed</strong></p>
                    <ul>
                        <li>Duration: {call_data.get('duration_seconds')} seconds</li>
                        <li>Outcome: {call_data.get('outcome', 'completed')}</li>
                        <li>Agent: {call_data.get('agent_name', 'Voice AI Agent')}</li>
                    </ul>
                    <p><strong>Summary:</strong><br/>{call_data.get('summary', 'No summary available')}</p>
                    <p><strong>Transcript:</strong><br/><pre>{call_data.get('transcript', 'No transcript')}</pre></p>
                """,
                'message_type': 'comment',
                'subtype_id': 1,  # Note subtype
            }

            message_id = models.execute_kw(
                self.database,
                self.uid,
                self.api_key or self.password,
                'mail.message',
                'create',
                [message_data]
            )

            logger.info(f"✅ Logged call activity in Odoo (message {message_id})")
            return True

        except Exception as e:
            logger.error(f"Error logging Odoo call activity: {e}")
            return False

    async def update_lead_stage(
        self,
        opportunity_id: int,
        stage_name: str
    ) -> bool:
        """
        Update opportunity stage (e.g., "Qualified", "Proposal", "Won")

        Args:
            opportunity_id: Opportunity ID
            stage_name: Target stage name

        Returns:
            True if successful
        """
        try:
            models = xmlrpc.client.ServerProxy(self.object_endpoint)

            # Search for stage by name
            stage_ids = models.execute_kw(
                self.database,
                self.uid,
                self.api_key or self.password,
                'crm.stage',
                'search',
                [[('name', '=', stage_name)]],
                {'limit': 1}
            )

            if not stage_ids:
                logger.warning(f"Stage '{stage_name}' not found in Odoo")
                return False

            # Update opportunity stage
            models.execute_kw(
                self.database,
                self.uid,
                self.api_key or self.password,
                'crm.lead',
                'write',
                [[opportunity_id], {'stage_id': stage_ids[0]}]
            )

            logger.info(f"✅ Updated Odoo opportunity {opportunity_id} to stage '{stage_name}'")
            return True

        except Exception as e:
            logger.error(f"Error updating Odoo lead stage: {e}")
            return False
```

#### 2.4.5 Event Handlers for Odoo

**`/opt/livekit1/integrations/odoo_webhooks.py`**
```python
"""
Handle webhook events and sync to Odoo CRM
"""
import logging
from typing import Dict, Any
from .odoo_integration import OdooIntegration

logger = logging.getLogger(__name__)

async def handle_call_completed(event_data: dict, odoo: OdooIntegration):
    """
    When call completes, sync to Odoo:
    1. Create/update contact (res.partner)
    2. Log call as activity (mail.message)
    3. Create opportunity if qualified
    4. Update stage based on outcome
    """
    try:
        # Authenticate
        if not await odoo.authenticate():
            logger.error("Odoo authentication failed")
            return

        phone = event_data['data'].get('phone_number')
        if not phone:
            logger.warning("No phone number in call data")
            return

        # Create/update contact
        contact_id = await odoo.create_or_update_contact(
            phone_number=phone,
            properties={
                'name': event_data['data'].get('lead_name', phone),
                'email': event_data['data'].get('email'),
                'notes': f"Contacted via Epic Voice AI on {event_data['timestamp']}"
            }
        )

        if not contact_id:
            logger.error("Failed to create/update Odoo contact")
            return

        # Log call activity
        await odoo.log_call_activity(
            contact_id=contact_id,
            call_data={
                'duration_seconds': event_data['data'].get('duration_seconds'),
                'outcome': event_data['data'].get('outcome'),
                'agent_name': event_data['data'].get('agent_name'),
                'summary': event_data['data'].get('summary'),
                'transcript': event_data['data'].get('transcript')
            }
        )

        # If lead qualified, create opportunity
        if event_data['data'].get('outcome') == 'qualified':
            await handle_lead_qualified(event_data, odoo, contact_id)

        logger.info(f"✅ Synced call to Odoo contact {contact_id}")

    except Exception as e:
        logger.error(f"Error handling call completion in Odoo: {e}")

async def handle_lead_qualified(
    event_data: dict,
    odoo: OdooIntegration,
    contact_id: int = None
):
    """
    When lead qualifies, create opportunity in Odoo
    """
    try:
        if not contact_id:
            # Find contact by phone
            phone = event_data['data'].get('phone_number')
            contact_id = await odoo.search_contact_by_phone(phone)

        if not contact_id:
            logger.error("Cannot create opportunity: contact not found")
            return

        # Create opportunity
        opportunity_id = await odoo.create_opportunity(
            contact_id=contact_id,
            opportunity_data={
                'name': f"Voice AI Opportunity - {event_data['data'].get('lead_name')}",
                'phone': event_data['data'].get('phone_number'),
                'expected_revenue': event_data['data'].get('estimated_value', 5000),
                'probability': 50,
                'description': event_data['data'].get('qualification_notes')
            }
        )

        if opportunity_id:
            # Update to "Qualified" stage
            await odoo.update_lead_stage(opportunity_id, 'Qualified')

        logger.info(f"✅ Created Odoo opportunity {opportunity_id}")

    except Exception as e:
        logger.error(f"Error creating Odoo opportunity: {e}")
```

#### 2.4.6 Odoo Configuration UI

**Frontend additions needed**:

1. **Connection Form** (`/dashboard/integrations/odoo`)
   ```tsx
   Fields:
   - Odoo URL (text input with validation)
   - Database name (text input)
   - Username (email)
   - API Key (password field, show/hide toggle)
   - Test Connection button (validates before saving)
   ```

2. **Settings** (`/dashboard/integrations/odoo/settings`)
   ```tsx
   - Default sales team (dropdown from Odoo API)
   - Default assigned user (dropdown from Odoo API)
   - Field mappings (custom field mapping UI)
   - Sync preferences (checkboxes for what to sync)
   ```

3. **Sync History** (`/dashboard/integrations/odoo/history`)
   ```tsx
   - Recent syncs (table with status)
   - Error logs (expandable details)
   - Retry failed syncs (button)
   ```

#### 2.4.7 Odoo vs HubSpot Comparison

| Feature | Odoo | HubSpot |
|---------|------|---------|
| **Auth** | API Key (simple) | OAuth 2.0 (complex) |
| **Setup Time** | 5 minutes | 15 minutes |
| **Cost** | $24-37/user/mo | $50-1200/mo |
| **Market** | Europe, SMBs | US, Enterprise |
| **Self-Hosted** | Yes | No |
| **Modules** | All-in-one ERP | CRM-focused |
| **API Complexity** | Medium | Easy |
| **Documentation** | Good | Excellent |

**Implementation Priority**:
- **High** if targeting European/LATAM markets
- **Medium** if US-focused (HubSpot higher priority)
- **Essential** for open-source/self-hosted customers

---

### **Phase 2.5: Google Calendar Integration** (Week 4-5)

#### 2.4.1 OAuth Flow
Similar to HubSpot, using Google OAuth 2.0

#### 2.4.2 Use Cases
1. **Agent requests appointment** → Create calendar event
2. **Appointment confirmation** → Send email with calendar invite
3. **Sync with user's calendar** → Check availability
4. **Reschedule/cancel** → Update calendar event

#### 2.4.3 Implementation

**`/opt/livekit1/integrations/google_calendar_integration.py`**
```python
"""
Google Calendar Integration
Appointment booking and calendar management
"""
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

class GoogleCalendarIntegration:
    """
    Google Calendar API client

    Features:
    - Create calendar events
    - Check availability
    - Send invites
    - Update/cancel events
    """

    async def create_appointment(self, event_data: dict):
        """
        Create calendar appointment

        Args:
            event_data: {
                'summary': 'Demo with John Doe',
                'start': '2025-11-01T10:00:00-05:00',
                'end': '2025-11-01T10:30:00-05:00',
                'attendees': ['john@example.com'],
                'description': 'Product demo...'
            }
        """

    async def check_availability(self, start_time: str, duration_minutes: int):
        """Check if user is available at given time"""

    async def cancel_appointment(self, event_id: str):
        """Cancel calendar event"""
```

#### 2.4.4 Agent Tool Integration

**Update Agent Configuration** to include calendar booking tool:

```python
from livekit.agents import function_tool

@function_tool
async def book_appointment(
    context: RunContext,
    date: str,
    time: str,
    attendee_email: str,
    notes: str = ""
) -> str:
    """
    Book an appointment with the prospect

    Args:
        date: Date in YYYY-MM-DD format
        time: Time in HH:MM format (24-hour)
        attendee_email: Email of person to invite
        notes: Additional notes for the appointment
    """
    # 1. Check Google Calendar availability
    # 2. Create calendar event
    # 3. Send confirmation email
    # 4. Trigger appointment.scheduled webhook
    # 5. Return confirmation message
    return "Appointment booked for {date} at {time}"
```

---

### **Phase 2.5: Slack Integration** (Week 5)

#### 2.5.1 Slack App Configuration

**Slack App Features**:
- Incoming Webhooks (post to channels)
- Bot user (interactive messages)
- OAuth installation
- Event subscriptions (optional)

#### 2.5.2 Notification Types

```python
SLACK_NOTIFICATIONS = {
    'call.completed': {
        'channel': '#sales-calls',
        'message_template': """
🎉 Call Completed
📞 Phone: {phone_number}
🤖 Agent: {agent_name}
⏱️ Duration: {duration}
📝 Outcome: {outcome}
💡 Summary: {summary}
"""
    },

    'lead.qualified': {
        'channel': '#qualified-leads',
        'message_template': """
🔥 Qualified Lead!
📧 Contact: {name}
📞 Phone: {phone_number}
⭐ Score: {lead_score}/100
📝 Notes: {notes}
🔗 <{hubspot_url}|View in HubSpot>
"""
    }
}
```

#### 2.5.3 Implementation

**`/opt/livekit1/integrations/slack_integration.py`**
```python
"""
Slack Integration
Real-time notifications for call events
"""
import aiohttp

class SlackIntegration:
    """
    Slack API client for notifications

    Features:
    - Post messages to channels
    - Rich formatting with blocks
    - Interactive buttons
    - Attachment uploads (transcripts)
    """

    async def post_message(self, channel: str, message: dict):
        """Post formatted message to Slack channel"""

    async def post_call_summary(self, channel: str, call_data: dict):
        """Post call summary with rich formatting"""
```

---

### **Phase 2.6: Generic Webhook/Zapier Support** (Week 6)

#### 2.6.1 Zapier Integration

**Zapier Trigger Requirements**:
1. REST Hook URL endpoint
2. Authentication via API key
3. Sample data for each event type
4. Polling endpoint (optional)

**Implementation**:
- Generic webhook system (already built in Phase 2.1)
- Zapier app submission with logo, description
- Documentation for users

#### 2.6.2 Make.com (formerly Integromat) Support
- Same webhook mechanism
- Custom app configuration

#### 2.6.3 n8n Support
- Self-hosted workflow automation
- HTTP Request node with webhook URL
- Authentication via API key

---

## 🗄️ Database Migrations

### Migration 1: CRM Connections Table

**File**: `/opt/livekit1/migrations/001_crm_connections.sql`

```sql
-- CRM OAuth connections
CREATE TABLE crm_connections (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    account_id TEXT,
    account_name TEXT,
    settings JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, provider)
);

CREATE INDEX idx_crm_connections_user_id ON crm_connections(user_id);
CREATE INDEX idx_crm_connections_active ON crm_connections(active) WHERE active = true;
CREATE INDEX idx_crm_connections_provider ON crm_connections(provider);

-- Trigger for updated_at
CREATE TRIGGER update_crm_connections_updated_at
    BEFORE UPDATE ON crm_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### Migration 2: Webhook Events Queue

**File**: `/opt/livekit1/migrations/002_webhook_events_queue.sql`

```sql
-- Webhook events queue for async delivery
CREATE TABLE webhook_events_queue (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    event_type VARCHAR(100) NOT NULL,
    event_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP,

    CHECK (retry_count <= max_retries)
);

CREATE INDEX idx_webhook_events_queue_pending ON webhook_events_queue(created_at)
    WHERE processed_at IS NULL AND retry_count < max_retries;
CREATE INDEX idx_webhook_events_queue_user_id ON webhook_events_queue(user_id);
CREATE INDEX idx_webhook_events_queue_retry ON webhook_events_queue(next_retry_at)
    WHERE processed_at IS NULL AND next_retry_at IS NOT NULL;
```

### Migration 3: Enhance partner_webhooks

**File**: `/opt/livekit1/migrations/003_enhance_webhooks.sql`

```sql
-- Add metadata columns
ALTER TABLE partner_webhooks
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS created_by TEXT,
    ADD COLUMN IF NOT EXISTS headers JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS retry_config JSONB DEFAULT '{"max_retries": 3, "backoff_multiplier": 2}';

-- Add index for filtering by events
CREATE INDEX IF NOT EXISTS idx_partner_webhooks_events
    ON partner_webhooks USING gin(events);
```

---

## 🔒 Security Considerations

### 1. Token Encryption
- Encrypt CRM access tokens at rest
- Use Fernet encryption (Python) or AES-256
- Store encryption key in environment variable

```python
from cryptography.fernet import Fernet

# Encrypt before storing
def encrypt_token(token: str, key: bytes) -> str:
    f = Fernet(key)
    return f.encrypt(token.encode()).decode()

# Decrypt when using
def decrypt_token(encrypted: str, key: bytes) -> str:
    f = Fernet(key)
    return f.decrypt(encrypted.encode()).decode()
```

### 2. Webhook Signature Verification
- Generate HMAC-SHA256 signature for each webhook
- Include signature in `X-Epic-Signature` header
- Receiving endpoint verifies signature

```python
import hmac
import hashlib

def generate_signature(payload: str, secret: str) -> str:
    return hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
```

### 3. OAuth Security
- Use PKCE for OAuth flows
- Validate redirect URIs
- Rotate refresh tokens
- Monitor for token theft

---

## 📊 Success Metrics

### Technical Metrics
- ✅ Webhook delivery success rate > 99%
- ✅ Average delivery latency < 5 seconds
- ✅ OAuth connection success rate > 95%
- ✅ API error rate < 1%

### Business Metrics
- ✅ 50% of users connect at least one integration (Month 1)
- ✅ HubSpot integration adoption > 30% (Enterprise customers)
- ✅ Google Calendar bookings > 100/month
- ✅ Average deal size increases by 10x ($500 → $5K MRR)

---

## 🧪 Testing Strategy

### 1. Webhook Delivery Testing
```bash
# Test webhook endpoint
curl -X POST http://localhost:5000/api/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "call.completed",
    "data": { "phone": "+15551234567" }
  }'
```

### 2. HubSpot Integration Testing
- Create test HubSpot developer account
- Test OAuth flow end-to-end
- Verify contact creation
- Test call activity logging

### 3. End-to-End Flow Testing
```
1. Make test outbound call
2. Verify webhook event triggered
3. Check HubSpot contact created
4. Verify Slack notification sent
5. Confirm webhook delivery logged
```

---

## 📅 Implementation Timeline

### Week 1: Foundation
- [x] Review existing webhook infrastructure
- [ ] Design event system architecture
- [ ] Create webhook_events.py
- [ ] Database migrations

### Week 2: Event System + UI
- [ ] Implement event triggers in campaign_engine.py
- [ ] Build webhook delivery service
- [ ] Create frontend webhook management UI
- [ ] Test webhook delivery

### Week 3: HubSpot Integration
- [ ] OAuth flow implementation
- [ ] Contact sync
- [ ] Deal creation
- [ ] Call activity logging

### Week 4: HubSpot Polish + Calendar Start
- [ ] HubSpot error handling
- [ ] Google Calendar OAuth
- [ ] Appointment booking

### Week 5: Calendar + Slack
- [ ] Calendar availability checks
- [ ] Slack app creation
- [ ] Notification templates
- [ ] Rich message formatting

### Week 6: Generic Webhooks + Testing
- [ ] Zapier documentation
- [ ] n8n examples
- [ ] Comprehensive testing
- [ ] Documentation

### Week 7-8: Polish + Launch
- [ ] Security audit
- [ ] Performance optimization
- [ ] User documentation
- [ ] Beta testing with customers
- [ ] Production launch

---

## 💰 Revenue Impact Projection

### Before Phase 2 (Current)
```
Segment: SMBs only
ARPU: $200-500/month
Market Size: Limited to DIY users
Total ARR Potential: ~$400K
```

### After Phase 2 (CRM Integration)
```
Segment: SMBs + Enterprises
ARPU: $5K-15K/month (enterprise)
Market Size: Sales teams with CRM
Total ARR Potential: $1M+

Expected Impact:
- 20 enterprise deals @ $10K MRR = $2.4M ARR
- Reduced churn (better integration = stickiness)
- Higher NPS scores
- Word-of-mouth referrals
```

---

## 🎯 Next Steps

### Immediate Actions
1. ✅ Create this architecture document
2. ⏳ **Review and approve plan**
3. ⏳ Set up HubSpot developer account
4. ⏳ Set up Google Cloud project for Calendar API
5. ⏳ Begin Week 1 implementation

### Questions to Answer
- [ ] Which CRM should we prioritize first? (Recommend: HubSpot)
- [ ] Do we need Salesforce integration? (High enterprise demand)
- [ ] Should we build Calendly integration or just Google Calendar?
- [ ] What's our priority: Speed to market or feature completeness?

---

**Document Version**: 1.0
**Last Updated**: October 28, 2025
**Author**: Epic Voice Engineering Team
**Status**: Ready for Implementation

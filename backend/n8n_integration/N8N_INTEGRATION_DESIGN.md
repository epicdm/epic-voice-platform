# n8n Integration Design - Close the Loop! 🔗

## The Missing Piece

**Current State:**
- ✅ Visual funnel editor (React Flow)
- ✅ Database storing funnel structure
- ❌ **No actual execution engine**

**The Solution:**
Use **n8n** as the execution engine!

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ User Creates/Edits Funnel in Our UI                        │
│ (Visual drag-and-drop with React Flow)                     │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ Our Backend Stores Funnel Structure                        │
│ - Nodes (call, email, sms, delay, webhook, condition)     │
│ - Edges (connections)                                       │
│ - Trigger configuration                                     │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 🎯 AUTO-SYNC: Translate to n8n Workflow                    │
│ - Funnel nodes → n8n nodes                                 │
│ - Edges → n8n connections                                   │
│ - POST to n8n API                                           │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ n8n Workflow Created/Updated                                │
│ - Stored in user's n8n instance                            │
│ - Webhook URL returned                                      │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ Trigger Event Occurs                                        │
│ (Lead created, landing page submit, scheduled, etc.)       │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ Our Backend Calls n8n Webhook                               │
│ - Passes lead data                                          │
│ - Includes funnel context                                   │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ n8n Executes Workflow                                       │
│ - Makes AI calls (via our LiveKit agents)                  │
│ - Sends emails (via SMTP/SendGrid)                         │
│ - Sends SMS (via Twilio)                                    │
│ - Handles delays/waits                                      │
│ - Makes webhooks                                            │
│ - Evaluates conditions                                      │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ n8n Sends Status Updates Back                               │
│ - Webhook to our backend                                    │
│ - Execution status, errors, results                         │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ Our Dashboard Shows Results                                 │
│ - Real-time execution tracking                             │
│ - Call outcomes                                             │
│ - Email delivery status                                     │
│ - Funnel analytics                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Node Type Mapping

| Our Funnel Node | n8n Node | Purpose |
|-----------------|----------|---------|
| `call` | HTTP Request + Webhook | Trigger our LiveKit call API |
| `email` | Email Send (SMTP/SendGrid) | Send email |
| `sms` | Twilio/HTTP Request | Send SMS |
| `delay` | Wait | Delay execution |
| `webhook` | HTTP Request | Make HTTP call |
| `condition` | IF/Switch | Branching logic |
| `end` | No Operation | End workflow |

---

## Funnel → n8n Workflow Translation

### Example: Our Funnel Structure
```json
{
  "nodes": [
    {
      "id": "node-1",
      "type": "call",
      "label": "Welcome Call",
      "config": {
        "agent_config_id": "agent-123",
        "max_duration": 300
      }
    },
    {
      "id": "node-2",
      "type": "delay",
      "label": "Wait 1 Hour",
      "config": {
        "duration": 3600
      }
    },
    {
      "id": "node-3",
      "type": "email",
      "label": "Follow-up Email",
      "config": {
        "subject": "Thanks for your time!",
        "template_id": "email-template-1"
      }
    }
  ],
  "edges": [
    { "source": "node-1", "target": "node-2" },
    { "source": "node-2", "target": "node-3" }
  ]
}
```

### Translated to n8n Workflow
```json
{
  "name": "Welcome Call Funnel",
  "nodes": [
    {
      "id": "webhook-trigger",
      "type": "n8n-nodes-base.webhook",
      "name": "Funnel Trigger",
      "position": [250, 50],
      "parameters": {
        "httpMethod": "POST",
        "path": "funnel-node-1-trigger",
        "responseMode": "lastNode"
      }
    },
    {
      "id": "call-node-1",
      "type": "n8n-nodes-base.httpRequest",
      "name": "Welcome Call",
      "position": [250, 200],
      "parameters": {
        "url": "https://your-api.com/api/user/calls/outbound",
        "method": "POST",
        "bodyParameters": {
          "parameters": [
            {
              "name": "phone_number",
              "value": "={{ $json.phone_number }}"
            },
            {
              "name": "agent_config_id",
              "value": "agent-123"
            },
            {
              "name": "max_duration",
              "value": 300
            }
          ]
        }
      }
    },
    {
      "id": "wait-node-2",
      "type": "n8n-nodes-base.wait",
      "name": "Wait 1 Hour",
      "position": [250, 350],
      "parameters": {
        "amount": 1,
        "unit": "hours"
      }
    },
    {
      "id": "email-node-3",
      "type": "n8n-nodes-base.emailSend",
      "name": "Follow-up Email",
      "position": [250, 500],
      "parameters": {
        "fromEmail": "noreply@yourapp.com",
        "toEmail": "={{ $json.email }}",
        "subject": "Thanks for your time!",
        "text": "Email body here..."
      }
    }
  ],
  "connections": {
    "webhook-trigger": {
      "main": [[{ "node": "call-node-1", "type": "main", "index": 0 }]]
    },
    "call-node-1": {
      "main": [[{ "node": "wait-node-2", "type": "main", "index": 0 }]]
    },
    "wait-node-2": {
      "main": [[{ "node": "email-node-3", "type": "main", "index": 0 }]]
    }
  },
  "active": true,
  "settings": {}
}
```

---

## Implementation Plan

### Phase 1: Basic Integration (Now)

1. **Add n8n Configuration to User Settings**
   ```python
   # Add to database
   n8n_instance_url = db.Column(db.String)  # e.g., "https://n8n.yourcompany.com"
   n8n_api_key = db.Column(db.String)  # encrypted
   ```

2. **Create n8n API Client**
   ```python
   # backend/n8n_integration/client.py
   class N8nClient:
       def create_workflow(workflow_data)
       def update_workflow(workflow_id, workflow_data)
       def delete_workflow(workflow_id)
       def trigger_workflow(webhook_url, data)
   ```

3. **Create Funnel → n8n Translator**
   ```python
   # backend/n8n_integration/translator.py
   def translate_funnel_to_n8n(funnel) -> dict:
       # Convert our nodes to n8n nodes
       # Convert our edges to n8n connections
       # Return n8n workflow JSON
   ```

4. **Add Auto-Sync Hook**
   ```python
   # When funnel is created/updated
   @funnel_bp.route("/<funnel_id>", methods=["PUT"])
   def update_funnel(funnel_id):
       # ... save funnel to DB

       # NEW: Auto-sync to n8n
       if user.n8n_enabled:
           n8n_workflow = translate_funnel_to_n8n(funnel)
           n8n_client.update_workflow(funnel.n8n_workflow_id, n8n_workflow)
   ```

### Phase 2: Execution (Next)

5. **Trigger n8n on Funnel Events**
   ```python
   # When lead is created or trigger event occurs
   def trigger_funnel_execution(funnel_id, lead_data):
       funnel = get_funnel(funnel_id)

       # Call n8n webhook
       n8n_client.trigger_workflow(
           webhook_url=funnel.n8n_webhook_url,
           data=lead_data
       )
   ```

6. **Receive n8n Status Updates**
   ```python
   @app.route("/webhooks/n8n/status", methods=["POST"])
   def receive_n8n_status():
       # Update funnel execution status
       # Log results
       # Update analytics
   ```

### Phase 3: Advanced (Later)

7. **Conditional Logic Translation**
   - Map our condition nodes to n8n IF/Switch nodes
   - Handle complex branching

8. **Error Handling & Retries**
   - Use n8n's built-in retry logic
   - Receive error webhooks

9. **Analytics Integration**
   - Pull n8n execution logs
   - Display in our dashboard

---

## API Endpoints Needed

### n8n API (Their Side)

```bash
# Create workflow
POST https://n8n.example.com/api/v1/workflows
Headers: X-N8N-API-KEY: your-api-key
Body: { workflow JSON }

# Update workflow
PUT https://n8n.example.com/api/v1/workflows/{id}

# Delete workflow
DELETE https://n8n.example.com/api/v1/workflows/{id}

# Trigger workflow via webhook
POST https://n8n.example.com/webhook/funnel-{id}
Body: { lead_data }
```

### Our API (To Add)

```bash
# Configure n8n integration
PUT /api/user/settings/n8n
Body: {
  "instance_url": "https://n8n.example.com",
  "api_key": "your-api-key"
}

# Sync funnel to n8n (manual)
POST /api/user/funnels/{id}/sync-to-n8n

# Receive n8n status webhooks
POST /webhooks/n8n/execution-status
```

---

## Configuration UI Needed

### Settings Page Addition:

```
┌─────────────────────────────────────────┐
│ n8n Integration                         │
├─────────────────────────────────────────┤
│                                         │
│ ☐ Enable n8n Integration               │
│                                         │
│ n8n Instance URL:                       │
│ [https://n8n.yourcompany.com___]       │
│                                         │
│ n8n API Key:                            │
│ [••••••••••••••••••••••••••]           │
│                                         │
│ ☑ Auto-sync funnels to n8n             │
│ ☑ Auto-trigger on events                │
│                                         │
│ [Test Connection] [Save]                │
│                                         │
│ ✅ Connected • 5 workflows synced       │
└─────────────────────────────────────────┘
```

---

## Benefits of n8n Integration

### 1. **Leverage Existing Infrastructure**
- Use n8n's 350+ integrations
- No need to build email/SMS/webhook connectors
- Battle-tested execution engine

### 2. **Visual Debugging**
- Users can open n8n to see exact execution
- See real-time data flowing through nodes
- Debug issues visually

### 3. **Advanced Features**
- Retries and error handling (built into n8n)
- Logging and monitoring
- Execution history

### 4. **Flexibility**
- Users can customize n8n workflows directly
- Add custom nodes not in our UI
- Handle edge cases

### 5. **Scalability**
- n8n handles queue management
- Can run on separate infrastructure
- Horizontal scaling

---

## Implementation Options

### Option A: Direct n8n API (Faster)
**Pros:**
- Simple integration
- Just need API key
- Works immediately

**Cons:**
- Need to build n8n workflow JSON
- Less AI assistance

**Implementation:**
```python
import requests

def create_n8n_workflow(funnel):
    workflow_json = translate_funnel_to_n8n(funnel)

    response = requests.post(
        f"{user.n8n_url}/api/v1/workflows",
        headers={"X-N8N-API-KEY": user.n8n_api_key},
        json=workflow_json
    )

    return response.json()
```

### Option B: n8n MCP Server (More Advanced)
**Pros:**
- AI can help build workflows
- Access to n8n templates
- Smarter node mapping

**Cons:**
- Requires MCP server setup
- More complexity

**Implementation:**
- User installs n8n MCP server
- We call MCP tools via Claude Code
- MCP translates and creates workflows

---

## Next Steps

### What I Need from You:

1. **Do you have an n8n instance?**
   - URL?
   - Can you provide API key?

2. **Prefer Option A (API) or Option B (MCP)?**
   - API = simpler, faster
   - MCP = more powerful, AI-assisted

3. **Should I implement now?**
   - I can build the integration immediately
   - Or design first and build later

---

## Quick Implementation (If You Have API Key)

If you provide:
- n8n instance URL
- n8n API key

I can implement in **~30 minutes**:
1. Create n8n API client
2. Build funnel → n8n translator
3. Add auto-sync on funnel save
4. Test with one funnel

**Result:** When you create a funnel in our UI, it automatically creates the n8n workflow and can execute!

---

Ready to close the loop? 🚀

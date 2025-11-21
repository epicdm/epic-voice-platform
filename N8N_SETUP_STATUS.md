# n8n Installation & Integration Status

## 🎯 Goal
Install n8n locally and integrate with our funnel system to execute workflows.

## ✅ Completed

### 1. Database Setup
- ✅ Created `n8n_db` PostgreSQL database
- ✅ Using same PostgreSQL instance as our app
- ✅ Credentials configured in systemd service

### 2. Systemd Service
- ✅ Created `/etc/systemd/system/n8n.service`
- ✅ Configured to run as `agent3` user
- ✅ Set environment variables:
  - `N8N_PORT=5678`
  - `N8N_PROTOCOL=https`
  - `N8N_HOST=n8n.call.epic.dm`
  - PostgreSQL connection details
  - Webhook URL: `https://n8n.call.epic.dm/`

### 3. Apache Reverse Proxy
- ✅ Created `/etc/apache2/sites-available/n8n-call-epic-dm.conf`
- ✅ Enabled required Apache modules (proxy_wstunnel for WebSocket)
- ✅ Site enabled, ready to activate
- ✅ SSL configured using existing `call.epic.dm` certificate
- ✅ Maps `n8n.call.epic.dm:443` → `localhost:5678`

### 4. n8n Integration Code
- ✅ Created `/opt/livekit1/backend/n8n_integration/`
- ✅ N8nClient class with full API support:
  - `create_workflow()`
  - `update_workflow()`
  - `delete_workflow()`
  - `activate_workflow()`
  - `trigger_workflow()`
  - `test_connection()`

## ⏳ In Progress

### n8n Installation
- 📦 Running: `npm install -g n8n`
- Status: Downloading packages (n8n v1.119.2)
- Progress: Installing dependencies (~500MB total)
- ETA: ~2-5 more minutes

## 📋 Next Steps (Once Installation Completes)

### 1. Start n8n Service
```bash
sudo systemctl daemon-reload
sudo systemctl start n8n
sudo systemctl enable n8n
sudo systemctl status n8n
```

### 2. Reload Apache
```bash
sudo systemctl reload apache2
```

### 3. Access n8n
- URL: https://n8n.call.epic.dm
- First-time setup wizard will appear
- Create admin account

### 4. Get API Key
- Settings → API
- Create new API key
- Save for integration

### 5. Test Integration
```bash
cd /opt/livekit1/backend
python3 test_n8n_connection.py
```

### 6. Complete Funnel Integration
- Build funnel → n8n translator
- Add auto-sync hooks
- Test end-to-end workflow

## 🔧 Configuration Details

### n8n Access Points
- **Web UI**: https://n8n.call.epic.dm
- **API**: https://n8n.call.epic.dm/api/v1/
- **Webhooks**: https://n8n.call.epic.dm/webhook/

### Environment
- **Port**: 5678 (internal)
- **Database**: PostgreSQL `n8n_db`
- **User**: agent3
- **Working Dir**: /opt/livekit1
- **Logs**: `journalctl -u n8n -f`

### Security
- HTTPS enforced via Apache
- SSL certificate from Let's Encrypt
- PostgreSQL authentication
- API key authentication for workflows

## 📊 Architecture

```
User Creates Funnel in Our UI
         ↓
PostgreSQL: funnel_nodes, funnel_edges
         ↓
N8nClient.create_workflow()
         ↓
POST https://n8n.call.epic.dm/api/v1/workflows
         ↓
n8n Workflow Created
         ↓
Trigger Event (lead created, etc.)
         ↓
N8nClient.trigger_workflow()
         ↓
POST https://n8n.call.epic.dm/webhook/{funnel-id}
         ↓
n8n Executes:
  - HTTP Request → Our LiveKit Call API
  - Email Send → SMTP
  - SMS → Twilio/HTTP
  - Wait → Delay
  - Webhook → External API
  - Condition → Branching
         ↓
Results → Our Dashboard
```

## 🎯 Benefits

1. **Execution Engine**: n8n handles workflow execution
2. **350+ Integrations**: Email, SMS, webhooks, databases, etc.
3. **Visual Debugging**: Users can see workflows execute in n8n
4. **Retries & Error Handling**: Built into n8n
5. **Logging**: Full execution history
6. **Scalability**: n8n's queue management

## 📝 API Key Configuration

Once n8n is running, update test script with new API key:
```python
# /opt/livekit1/backend/test_n8n_connection.py
N8N_URL = "https://n8n.call.epic.dm"
N8N_API_KEY = "your-new-api-key-here"
```

## 🔐 Credentials Provided

- n8n API Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- This is from n8n.epic.dm (different instance)
- Will need new API key from local instance

## 🚀 Current Status

**Installation Progress**: ~75% (downloading packages)
**Estimated Completion**: 2-5 minutes
**Ready to Start**: Waiting for npm install to finish

---

**Note**: n8n is a large package with many dependencies. Installation warnings are normal and don't affect functionality.

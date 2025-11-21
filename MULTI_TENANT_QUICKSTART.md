# Multi-Tenant Voice Agent Platform - Quick Start

## 🎯 What You Just Built

A complete multi-tenant SaaS platform where users can:
- ✅ Create accounts and login
- ✅ Build custom voice agents via GUI
- ✅ Assign phone numbers to agents
- ✅ Track calls and usage
- ✅ All without touching code!

## 🚀 Quick Start (3 Steps)

### Step 1: Setup Demo Users

```bash
cd /opt/livekit1
uv run python setup_demo.py
```

This creates:
- 2 demo user accounts
- 2 sample agents
- Phone number mapping for testing

### Step 2: Start User Dashboard

```bash
uv run python user_dashboard.py
```

Access at: **http://localhost:5001**

### Step 3: Start Multi-Tenant Agent

```bash
uv run python multi_tenant_agent.py dev
```

## 🎭 Demo Accounts

After running `setup_demo.py`:

**Account 1 - Customer Support:**
- Email: `demo@example.com`
- Password: `demo123`
- Agent: Customer Support Agent
- Phone: +17678183366

**Account 2 - Sales:**
- Email: `sales@example.com`
- Password: `sales123`
- Agent: Sales Assistant

## 📱 How It Works

### User Flow:

1. **User registers** → Account created in database
2. **User creates agent** → Configures instructions, voice, model
3. **User assigns phone number** → Links number to agent
4. **Someone calls the number** → Agent loads that user's config dynamically
5. **Call completes** → Logged for billing

### Architecture:

```
Incoming Call
    ↓
Phone Number: +17678183366
    ↓
Database Lookup: Which agent?
    ↓
Load User's Configuration
    ↓
Start Session with Custom Instructions
    ↓
Log Call for Billing
```

## 🎨 User Dashboard Features

### For Each User:

**Dashboard Home:**
- View stats (agents, calls, cost)
- Quick access to all features

**Agents Page:**
- Create new agents
- Edit instructions
- Choose LLM model and voice
- Use preset templates

**Phone Numbers:**
- Assign phone numbers to agents
- View current mappings

**Call Logs:**
- See all calls
- Track duration and cost
- View which agent handled each call

## 📊 Database Structure

**Tables Created:**
- `users` - User accounts
- `agent_configs` - Agent configurations per user
- `phone_mappings` - Phone number → Agent mappings
- `call_logs` - Call history and billing

**Database File:** `voice_agents.db` (SQLite)

## 🔧 Customization

### Add Your Own Phone Number:

```python
# In user dashboard, after login:
1. Click "Assign Phone Number"
2. Enter your SIP phone number
3. Select which agent to use
4. Save
```

### Create New Agent:

```python
1. Click "Create New Agent"
2. Name your agent
3. Write custom instructions
4. Choose model, voice, language
5. Save
```

## 📞 Testing

### Test the Multi-Tenant System:

1. **Login as User 1** (demo@example.com)
2. **View their agent** - Customer Support Agent
3. **Call +17678183366**
4. **Agent uses User 1's config!**
5. **Check call logs** - See the call recorded

Then:

1. **Change phone mapping** to User 2's agent
2. **Call again**
3. **Different agent behavior!**

## 🌟 Key Files

**Backend:**
- `database.py` - Database models
- `multi_tenant_agent.py` - Dynamic agent (loads from DB)
- `user_dashboard.py` - User management API

**Frontend:**
- `templates/user_dashboard.html` - Main dashboard
- `templates/login.html` - Login page
- `templates/register.html` - Registration page

**Utilities:**
- `setup_demo.py` - Create demo users
- `MULTI_TENANT_ARCHITECTURE.md` - Full architecture docs

## 🔐 Security Notes

⚠️ **Current Setup (Development Only):**
- Uses SQLite (not for production)
- Simple session auth
- No API rate limiting
- No input sanitization

**For Production:**
1. ✅ Use PostgreSQL
2. ✅ Add JWT authentication
3. ✅ Implement rate limiting
4. ✅ Add input validation
5. ✅ Use HTTPS only
6. ✅ Add CSRF protection
7. ✅ Sanitize user inputs

## 💰 Billing Logic

**Current Cost Calculation:**
- $0.02 per minute of call time
- Stored in `call_logs.cost`
- Auto-calculated on call end

**Customize Pricing:**
Edit `multi_tenant_agent.py`:
```python
def log_call_end(call_id: str, duration_seconds: int):
    minutes = duration_seconds / 60
    call_log.cost = round(minutes * 0.02, 4)  # Change rate here
```

## 📈 Scaling

### Current Capacity:
- **1 agent worker** serves ALL users
- Loads config dynamically per call
- Good for: 10-100 concurrent users

### To Scale:
1. **Add more workers:**
   ```bash
   # Terminal 1
   uv run python multi_tenant_agent.py dev
   
   # Terminal 2
   uv run python multi_tenant_agent.py dev
   ```

2. **Use PostgreSQL:**
   ```bash
   # Install PostgreSQL
   sudo apt install postgresql
   
   # Update .env
   DATABASE_URL=postgresql://user:pass@localhost/voice_agents
   ```

3. **Deploy to LiveKit Cloud:**
   ```bash
   lk agent deploy
   ```

## 🛠️ Troubleshooting

### Database not found:
```bash
uv run python database.py  # Recreate tables
```

### Can't login:
```bash
uv run python setup_demo.py  # Recreate demo users
```

### Agent not picking up calls:
1. Check agent is running: `ps aux | grep multi_tenant_agent`
2. Check phone mapping: Login to dashboard → Phone Numbers
3. Check LiveKit connection: Look for "registered worker" in logs

### No agent config loaded:
- Phone number must be in database
- Check `phone_mappings` table has your number
- Format: no +, just digits (e.g., "17678183366")

## 🎯 Next Steps

1. **Add More Users:**
   - Use registration page
   - Or modify `setup_demo.py`

2. **Integrate Real Phone Provisioning:**
   - Twilio API
   - Vonage API
   - Auto-assign numbers to users

3. **Add Payment Processing:**
   - Stripe integration
   - Subscription management
   - Usage-based billing

4. **Build Admin Panel:**
   - View all users
   - Manage phone numbers
   - Monitor system health

5. **Add More Features:**
   - Agent templates
   - Conversation history
   - Analytics dashboard
   - Team collaboration

## 📚 Documentation

- **Architecture:** `MULTI_TENANT_ARCHITECTURE.md`
- **LiveKit Docs:** https://docs.livekit.io/agents/
- **API Reference:** See docstrings in `user_dashboard.py`

## 🎉 Success!

You now have a fully functional multi-tenant voice agent platform!

**What users can do:**
- ✅ Sign up and create accounts
- ✅ Build voice agents with custom instructions
- ✅ Manage phone numbers
- ✅ Track usage and costs

**What you can do:**
- ✅ Scale to many users
- ✅ Charge per usage
- ✅ Add new features easily
- ✅ Deploy to production

**Test it now:**
1. Visit http://localhost:5001
2. Login with demo@example.com / demo123
3. Create a new agent
4. Call your number
5. See it work! 🚀

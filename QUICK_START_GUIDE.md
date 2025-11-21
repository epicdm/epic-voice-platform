# Epic Voice Suite - Quick Start Guide

**Welcome to Epic Voice Suite!** This guide will help you get your first AI voice agent up and running in under 10 minutes.

---

## 🚀 Getting Started

### Step 1: Sign Up / Log In

1. Visit https://ai.epic.dm
2. Click "Sign Up" or "Log In"
3. Enter your email and password
4. You'll be redirected to your dashboard

---

## 📞 Create Your First AI Agent

### Step 1: Navigate to Agents

1. From the dashboard, click **"Create Agent"** button
2. Or go to **Agents** in the sidebar → Click **"New Agent"**

### Step 2: Configure Your Agent

The wizard has 4 simple steps:

#### **Step 1: Basic Information**
- **Name**: Give your agent a memorable name (e.g., "Customer Support Bot")
- **Description**: Brief description of what this agent does
- **Instructions**: Tell your agent how to behave

**Example Instructions**:
```
You are a friendly customer support agent for Epic Voice Suite.

Your role is to:
- Help customers with product questions
- Provide information about our AI voice platform
- Direct users to the right resources
- Be helpful, professional, and concise

Keep responses under 30 seconds.
```

#### **Step 2: Voice & Language**
- **Language**: Select language (English by default)
- **Voice Provider**: OpenAI TTS (default)
- **Voice**: Choose from Alloy, Echo, Fable, Onyx, Nova, or Shimmer
- **Test**: Click speaker icon to hear voice samples

#### **Step 3: Advanced Settings** (Optional)
- **Temperature**: Controls creativity (0.7 default)
- **LLM Model**: GPT-4o-mini (default) or GPT-4o
- **STT Provider**: Deepgram (default)
- **Turn Detection**: How agent knows when to speak

**Tip**: Default settings work great! Skip this step if unsure.

#### **Step 4: Review & Create**
- Review your configuration
- Click **"Create Agent"**
- Agent is created and ready to use!

---

## 📱 Assign a Phone Number

### Step 1: Get a Phone Number

1. Go to **Phone Numbers** in sidebar
2. Click **"Add Phone Number"**
3. **For MVP**: Contact admin to provision a number
4. **Coming Soon**: Auto-provisioning

### Step 2: Assign to Your Agent

1. Find your number in the list
2. Click **"Assign"** button
3. Select your agent from dropdown
4. Click **"Save"**

✅ Your agent is now live and can receive calls!

---

## 🎯 Make a Test Call

### Option 1: Call Your Number

1. Use your phone to call the number you just assigned
2. Your AI agent will answer!
3. Have a conversation to test it out

### Option 2: Use Test Call Feature

1. From **Phone Numbers** page
2. Click **"Test Call"** button next to your number
3. Enter a phone number to call
4. Click **"Call"**

---

## 📊 View Call History

### See Your Calls

1. Go to **Calls** in sidebar
2. See all call logs with:
   - Date & Time
   - Duration
   - Outcome (answered, busy, failed)
   - Cost breakdown

### View Call Details

1. Click on any call in the list
2. See detailed information:
   - **Transcript**: Full conversation text
   - **Cost Breakdown**: LLM, STT, TTS costs
   - **Metadata**: Caller ID, duration, status

---

## 🚀 Run a Campaign (Outbound Calling)

### Step 1: Prepare Your Leads

Create a CSV file with your leads:

```csv
name,phone,email,company
John Doe,+15551234567,john@example.com,Acme Inc
Jane Smith,+15559876543,jane@company.com,Tech Corp
```

**Required fields**: `name`, `phone`
**Optional fields**: `email`, `company`, `custom_field_1`, etc.

### Step 2: Create Campaign

1. Go to **Campaigns** in sidebar
2. Click **"New Campaign"**
3. Fill in:
   - **Campaign Name**: e.g., "Sales Outreach Q4"
   - **Agent**: Select your agent
   - **Phone Number**: Select outbound number
   - **Upload CSV**: Choose your leads file

4. Configure:
   - **Start Date/Time**: When to start calling
   - **End Date/Time**: When to stop
   - **Retry Failed**: Number of retry attempts
   - **Delay Between Calls**: Time between calls (seconds)

5. Click **"Create Campaign"**

### Step 3: Monitor Campaign

1. Campaign will appear in list
2. See real-time stats:
   - Total leads
   - Calls made
   - Success rate
   - Costs

3. Click campaign to see:
   - Lead-by-lead status
   - Call outcomes
   - Analytics

---

## 💰 Track Costs

### Dashboard Widgets

Your dashboard shows:
- **Today's Costs**: Spending since midnight
- **Month's Costs**: Current billing period
- **Cost per Call**: Average

### Detailed Cost View

1. Go to **Calls** page
2. Each call shows cost breakdown:
   - **LLM**: Language model costs
   - **STT**: Speech-to-text costs
   - **TTS**: Text-to-speech costs
   - **Total**: Sum of all costs

### Cost Analytics

1. Go to **Analytics** page
2. See charts and graphs:
   - Cost over time
   - Cost by agent
   - Cost by campaign

---

## 🎨 Create Brand Kit (Optional)

Make your brand assets available to agents:

### Step 1: Go to Brand Kits

1. Click **Settings** in sidebar
2. Go to **Brand Kits**
3. Click **"Create Brand Kit"**

### Step 2: Extract or Enter

**Option A: Extract from Website** (Recommended)
1. Select "Extract from Website"
2. Enter your domain (e.g., `yourcompany.com`)
3. System automatically extracts:
   - Logo
   - Brand colors
   - Company info
   - Fonts

**Option B: Extract from Instagram**
1. Select "Extract from Instagram"
2. Enter Instagram profile URL
3. System extracts:
   - Profile picture (logo)
   - 5 dominant colors
   - Bio information

**Option C: Extract from Facebook**
1. Select "Extract from Facebook Page"
2. Enter Facebook page URL
3. System extracts company info

**Option D: Enter Manually**
1. Select "Enter Manually"
2. Fill in:
   - Brand name
   - Logo URL
   - Brand colors (hex codes)
   - Company info

### Step 3: Review & Save

1. Preview your brand kit
2. Click **"Create Brand Kit"**
3. Use in agent instructions or campaigns

---

## 🔧 Advanced Features

### Funnels (Conversational Workflows)

Create custom conversation flows:

1. Go to **Funnels** in sidebar
2. Click **"New Funnel"**
3. Configure conversation steps
4. Integrate with n8n workflows
5. Generate landing pages

### Live Listen (Coming Soon)

Monitor calls in real-time:

1. Go to **Live Listen** page
2. See active calls
3. Join call to listen (admin only)

### API Access

Integrate with your systems:

1. Go to **API Keys** page
2. Generate API key
3. Use in your applications
4. View API documentation

---

## 📚 Common Workflows

### Workflow 1: Customer Support

```
1. Create agent with support instructions
2. Assign phone number
3. Add number to website/marketing
4. Customers call for support
5. Monitor calls and improve agent
```

### Workflow 2: Sales Outreach

```
1. Create sales agent
2. Prepare lead CSV
3. Create outbound campaign
4. Campaign calls all leads
5. Review outcomes and follow up
```

### Workflow 3: Appointment Booking

```
1. Create booking agent
2. Add calendar integration (future)
3. Agent books appointments
4. Confirmation sent to customer
5. View bookings in dashboard
```

---

## ❓ Troubleshooting

### Agent Not Answering Calls

**Check**:
- ✅ Agent is created and active
- ✅ Phone number is assigned to agent
- ✅ Phone number is provisioned correctly
- ✅ Calling the correct number

**Fix**:
- Verify number assignment in Phone Numbers page
- Check agent status in Agents page
- Contact support if issue persists

### Poor Call Quality

**Check**:
- ✅ Internet connection stable
- ✅ Caller has good signal
- ✅ Using supported phone network

**Fix**:
- Adjust agent instructions to be more concise
- Lower temperature setting for more predictable responses
- Test with different voice options

### High Costs

**Check**:
- ✅ Agent instructions are concise
- ✅ Using appropriate LLM model (GPT-4o-mini is cheaper)
- ✅ Calls aren't running too long

**Fix**:
- Add instruction: "Keep responses under 30 seconds"
- Use gpt-4o-mini instead of gpt-4o
- Monitor costs in Analytics page

### Campaign Not Starting

**Check**:
- ✅ Campaign start time is in future (or now)
- ✅ CSV has valid phone numbers
- ✅ Agent and phone number are selected
- ✅ Account has sufficient credits

**Fix**:
- Verify campaign configuration
- Check CSV format matches template
- Ensure phone numbers are in E.164 format (+15551234567)

---

## 💡 Best Practices

### Writing Good Agent Instructions

**Do**:
- ✅ Be specific about agent's role
- ✅ Provide examples of good responses
- ✅ Set clear boundaries (what agent can/can't do)
- ✅ Keep instructions concise and clear
- ✅ Test and iterate based on real calls

**Don't**:
- ❌ Make instructions too vague
- ❌ Include contradictory guidelines
- ❌ Forget to mention call length limits
- ❌ Use overly complex language

### Example: Good Instructions

```
You are a receptionist for Smith & Associates Law Firm.

Your role:
- Answer calls professionally
- Screen for appointment requests
- Collect: name, phone, reason for call
- Forward emergencies to on-call attorney
- Business hours: Mon-Fri 9am-5pm EST

Response style:
- Professional but friendly
- Keep responses under 20 seconds
- Ask one question at a time
- Confirm information before ending call

Do NOT:
- Give legal advice
- Quote prices or fees
- Make commitments on behalf of attorneys
```

### Optimizing Costs

1. **Use GPT-4o-mini** for most use cases (10x cheaper)
2. **Keep responses short** - add "Keep responses under 30 seconds"
3. **Limit call duration** - set maximum call length
4. **Monitor Analytics** - track cost trends
5. **Test before deploying** - verify agent works as expected

### CSV Best Practices

1. **Use E.164 format** for phone numbers: `+15551234567`
2. **Include name** for personalization
3. **Validate data** before uploading
4. **Start small** - test with 10 leads first
5. **Add custom fields** for agent to reference

---

## 🆘 Get Help

### Documentation
- Full docs: https://docs.epic.dm (coming soon)
- API Reference: https://api.epic.dm/docs (coming soon)

### Support
- Email: support@epic.dm
- Chat: Available in dashboard
- Community: Discord link (coming soon)

### Status
- System Status: https://status.epic.dm (coming soon)
- Check service health in dashboard

---

## 🎉 Next Steps

Now that you've completed the quick start:

1. **Test Your Agent**: Make several test calls
2. **Iterate on Instructions**: Improve based on test results
3. **Run a Small Campaign**: Test with 5-10 leads
4. **Monitor & Optimize**: Watch costs and outcomes
5. **Scale Up**: Increase campaign size as you refine

**Welcome to Epic Voice Suite!** 🚀

Need help? Contact support@epic.dm

---

**Last Updated**: November 16, 2025
**Version**: 1.0 (MVP)

# 📞 LiveKit Telephony Setup Guide

**Goal:** Configure your deployed AI agent to answer phone calls!

---

## 🎯 What This Does

When someone calls your phone number:
1. **SIP Provider** (Magnus Billing, Twilio, Telnyx) receives the call
2. **LiveKit Inbound Trunk** validates and accepts the call
3. **Dispatch Rule** creates a new room for the caller
4. **Your AI Agent** automatically joins and starts talking!
5. **Call is logged** to database with transcript

---

## 📋 Prerequisites

### 1. Find Your Deployed Agent Name

**CRITICAL:** You need the exact agent NAME from LiveKit Cloud.

**Where to find it:**
1. Go to: https://cloud.livekit.io/
2. Navigate to **Projects** → **Your Project** → **Agents**
3. Look for your deployed agent in the list
4. Copy the **Agent Name** (e.g., "epic-voice-agent")

**OR** check your agent deployment code to see the agent_name parameter.

### 2. Get Your Phone Number(s)

You need at least ONE phone number from your SIP provider in format: **+1234567890**

---

## 🚀 Quick Start

### Step 1: Update Configuration

Edit `/opt/livekit1/setup_livekit_telephony.py` lines 260-265:

```python
PHONE_NUMBERS = ["+15105550100"]  # ← YOUR NUMBER HERE
AGENT_NAME = "epic-voice-agent"   # ← YOUR AGENT NAME HERE
```

### Step 2: Run Setup

```bash
cd /opt/livekit1
python3 setup_livekit_telephony.py
```

### Step 3: Test

Call your phone number - your agent should answer! 🎉

---

See full guide above for troubleshooting and advanced configuration.

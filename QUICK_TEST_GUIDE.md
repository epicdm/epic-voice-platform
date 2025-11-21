# 🧪 Quick Test Guide - Onboarding System

**Your onboarding system is installed! Here's how to test it:**

---

## ✅ **Step 1: Test Email Service** (Do This First!)

Test that your Resend API key works:

```bash
cd /opt/livekit1
node test-welcome-email.js YOUR-EMAIL@example.com
```

**Expected Output:**
```
✅ RESEND_API_KEY found
📧 Sending test email to: your-email@example.com

🎉 SUCCESS! Email sent!
📬 Email ID: abc123...
```

**If you get errors:**
- ❌ "RESEND_API_KEY not found" → Add it to `/opt/livekit1/frontend/.env.local`
- ❌ "Invalid API key" → Check the key in Resend dashboard
- ❌ "Domain not verified" → Verify epic.dm in Resend settings

---

## ✅ **Step 2: Test Welcome Email** (Real User Flow)

Create a test account to see the full onboarding:

1. **Open your browser:**
   ```
   https://ai.epic.dm/auth/signup
   ```

2. **Sign up with:**
   - Google OAuth (fastest)
   - OR Email/Password

3. **What should happen:**
   - ✅ You're redirected to dashboard
   - ✅ Welcome email arrives in inbox
   - ✅ Onboarding wizard pops up automatically
   - ✅ Trial banner shows at top

4. **Check Email:**
   - Subject: "🎉 Welcome to Epic Voice"
   - Contains your name
   - Shows 14-day trial info
   - Has "Launch Dashboard" button

5. **Check Wizard:**
   - Beautiful modal appears
   - Shows 3 steps: Create Agent → Get Phone → Test Call
   - Can click through or skip

---

## ✅ **Step 3: Test Trial Notifications** (Manual Trigger)

Test the trial expiration email system:

### **A. Set Trial to Expire Soon**

```bash
# Connect to database
psql postgresql://postgres:epicvoice2024@localhost:5432/epic_voice_db

# Set trial to expire in 7 days (for testing)
UPDATE subscriptions 
SET "trialEndsAt" = NOW() + INTERVAL '7 days'
WHERE "organizationId" = (
  SELECT id FROM organizations 
  WHERE "ownerId" = (
    SELECT id FROM users WHERE email = 'YOUR-TEST-EMAIL@example.com'
  )
);

# Exit
\q
```

### **B. Trigger Cron Manually**

First, generate a cron secret if you haven't:

```bash
# Add to .env.local
echo "CRON_SECRET=$(openssl rand -base64 32)" >> /opt/livekit1/frontend/.env.local

# Restart frontend to load it
systemctl restart livekit-frontend

# Wait 10 seconds
sleep 10
```

Then trigger the cron:

```bash
# Get your cron secret
CRON_SECRET=$(grep CRON_SECRET /opt/livekit1/frontend/.env.local | cut -d= -f2 | tr -d '"')

# Trigger trial notifications
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3001/api/cron/trial-notifications
```

### **C. Check Results**

**Expected Response:**
```json
{
  "success": true,
  "timestamp": "2025-10-23T01:59:00.000Z",
  "results": {
    "total": 1,
    "day7": 1,
    "day3": 0,
    "day1": 0,
    "expired": 0,
    "errors": []
  }
}
```

**Check Email:**
- Subject: "⏰ 7 Days Left in Your Epic Voice Trial"
- Blue design
- Shows countdown: "7 Days Left"

**Test Other Warnings:**

```sql
-- 3 days warning (orange)
UPDATE subscriptions SET "trialEndsAt" = NOW() + INTERVAL '3 days' ...

-- 1 day warning (red, urgent)
UPDATE subscriptions SET "trialEndsAt" = NOW() + INTERVAL '1 day' ...

-- Expired (red, action required)
UPDATE subscriptions SET "trialEndsAt" = NOW() - INTERVAL '1 day' ...
```

After each update, run the curl command again and check email.

---

## ✅ **Step 4: Verify Onboarding Wizard**

Test the wizard flow:

1. **Create new account** (< 5 minutes old)
2. **Go to dashboard** - wizard should auto-show
3. **Click "Get Started"**
4. **Step through:**
   - Welcome → Create Agent → Get Phone → Test Call → Complete
5. **Try "Skip"** - should close
6. **Refresh page** - should NOT show again (onboarding complete)

**Debug if not showing:**

```bash
# Check user's onboarding status
psql postgresql://postgres:epicvoice2024@localhost:5432/epic_voice_db -c "
SELECT email, \"createdAt\", \"onboardingCompleted\"
FROM users 
WHERE email = 'YOUR-EMAIL@example.com';
"
```

Should show:
- `createdAt`: Recent (< 5 minutes)
- `onboardingCompleted`: false

---

## 🎯 **What's Working Checklist**

After testing, you should have:

- [ ] ✅ Test email received
- [ ] ✅ Welcome email on sign-up
- [ ] ✅ Onboarding wizard appears
- [ ] ✅ 7-day trial warning email
- [ ] ✅ 3-day trial warning email
- [ ] ✅ 1-day trial warning email
- [ ] ✅ Trial expired email
- [ ] ✅ Subscription status updates to 'expired'
- [ ] ✅ All emails look good (formatting, colors, buttons)

---

## 🐛 **Troubleshooting**

### **Emails Not Sending**

1. **Check Resend Dashboard:**
   - https://resend.com/logs
   - Look for errors or rate limits

2. **Check Frontend Logs:**
   ```bash
   journalctl -u livekit-frontend -n 50 | grep -i email
   ```

3. **Verify API Key:**
   ```bash
   grep RESEND_API_KEY /opt/livekit1/frontend/.env.local
   ```

4. **Test with curl:**
   ```bash
   curl -X POST https://api.resend.com/emails \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "from": "onboarding@epic.dm",
       "to": "your-email@example.com",
       "subject": "Test",
       "html": "<p>Test email</p>"
     }'
   ```

### **Wizard Not Showing**

1. **Check browser console** (F12)
2. **Verify user is new:**
   ```sql
   SELECT email, "createdAt", "onboardingCompleted" FROM users;
   ```
3. **Force show:**
   ```sql
   UPDATE users SET "onboardingCompleted" = false, "createdAt" = NOW();
   ```

### **Cron Endpoint 401 Error**

1. **Check secret matches:**
   ```bash
   # In .env.local
   grep CRON_SECRET /opt/livekit1/frontend/.env.local
   
   # In your curl command
   echo $CRON_SECRET
   ```

2. **Restart frontend after changing .env.local:**
   ```bash
   systemctl restart livekit-frontend
   ```

---

## 🚀 **Next: Set Up Automated Cron**

Once testing works, set up daily cron job:

### **Option 1: GitHub Actions** (Recommended)

Create `.github/workflows/trial-notifications.yml`:

```yaml
name: Trial Notifications
on:
  schedule:
    - cron: '0 10 * * *'  # Daily 10 AM UTC
  workflow_dispatch:

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Endpoint
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://ai.epic.dm/api/cron/trial-notifications
```

Add `CRON_SECRET` to GitHub repository secrets.

### **Option 2: System Cron**

```bash
# Edit crontab
crontab -e

# Add (runs daily at 10 AM)
0 10 * * * curl -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" https://ai.epic.dm/api/cron/trial-notifications
```

---

## 📊 **Monitor & Maintain**

### **Check Email Stats:**
- Resend dashboard: https://resend.com/
- View sent emails, opens, bounces

### **Check Trial Expirations:**
```sql
SELECT 
  u.email,
  s.status,
  s."trialEndsAt",
  EXTRACT(DAY FROM s."trialEndsAt" - NOW()) as days_left
FROM subscriptions s
JOIN organizations o ON s."organizationId" = o.id
JOIN users u ON o."ownerId" = u.id
WHERE s.status = 'trialing'
ORDER BY s."trialEndsAt" ASC;
```

### **Manual Email Logs:**
```bash
# Frontend logs
journalctl -u livekit-frontend -f | grep email

# Check for errors
journalctl -u livekit-frontend --since "1 hour ago" | grep -i "email\|error"
```

---

## ✅ **You're All Set!**

Your onboarding system is ready. Start with Step 1 above to test everything!

**Questions?** Check `/opt/livekit1/ONBOARDING_SYSTEM_COMPLETE.md` for full documentation.

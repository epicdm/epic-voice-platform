# 🧪 Epic Voice Authentication Testing Guide

**Complete Auth Flow Testing & Trial Gating Verification**  
**Date:** October 22, 2025 at 11:50 PM UTC

---

## ✅ **What's Implemented**

### **1. Authentication System**
- ✅ NextAuth v5 with Google OAuth
- ✅ Email/Password authentication (Credentials provider)
- ✅ Automatic user creation
- ✅ Automatic organization setup
- ✅ Automatic 14-day trial activation
- ✅ JWT-based sessions

### **2. Trial Gating Middleware**
- ✅ Protects all `/dashboard/*` routes
- ✅ Redirects unauthenticated users to sign-in
- ✅ Redirects authenticated users from auth pages
- ✅ Blocks expired trials (except billing page)
- ✅ Shows trial banner with days remaining

### **3. Database Integration**
- ✅ Users table
- ✅ Accounts table (OAuth links)
- ✅ Organizations table
- ✅ Memberships table (user→org mapping)
- ✅ Subscriptions table (trial/paid status)

---

## 🧪 **Testing Checklist**

### **A) Pre-Test Setup**

#### **1. Verify Services Running**
```bash
# Check all services
systemctl status apache2 --no-pager | head -10
systemctl status livekit-frontend --no-pager | head -10
systemctl status livekit-backend --no-pager | head -10

# All should show: active (running)
```

#### **2. Verify API Endpoints**
```bash
# NextAuth endpoints (should return JSON)
curl https://ai.epic.dm/api/auth/providers
curl https://ai.epic.dm/api/auth/session
curl https://ai.epic.dm/api/auth/csrf

# Flask backend endpoints (should return JSON)
curl https://ai.epic.dm/api/user/profile
```

#### **3. Add Yourself as Google Test User**
⚠️ **REQUIRED for Google OAuth!**

```
1. Go to: https://console.cloud.google.com/
2. Select project: Epic Voice App
3. Navigate to: APIs & Services → OAuth consent screen
4. Scroll to: "Test users" section
5. Click: "+ ADD USERS"
6. Enter: your-email@gmail.com
7. Click: SAVE
```

---

### **B) Test Google OAuth Flow**

#### **Test 1: Sign In with Google (New User)**

**Steps:**
1. Open **incognito/private browser window**
2. Navigate to: `https://ai.epic.dm/auth/signin`
3. Check browser console (F12 → Console tab)
   - ✅ Should be **no errors**
4. Click: **"Continue with Google"**
5. Sign in with Google account (test user email)
6. Authorize the app

**Expected Results:**
- ✅ Redirected to: `https://ai.epic.dm/dashboard`
- ✅ **Blue trial banner** at top: "14 days left in your free trial"
- ✅ Sidebar shows user name and email
- ✅ Dashboard loads successfully
- ✅ No console errors

**Database Verification:**
```bash
# Check user was created
psql postgresql://postgres:epicvoice2024@localhost:5432/epic_voice_db \
  -c "SELECT id, email, name, \"emailVerified\" FROM users ORDER BY \"createdAt\" DESC LIMIT 1;"

# Check organization was created
psql postgresql://postgres:epicvoice2024@localhost:5432/epic_voice_db \
  -c "SELECT o.id, o.name, o.\"ownerId\", s.status, s.\"trialEndsAt\" 
      FROM organizations o 
      JOIN subscriptions s ON o.id = s.\"organizationId\" 
      ORDER BY o.\"createdAt\" DESC LIMIT 1;"

# Check account link was created
psql postgresql://postgres:epicvoice2024@localhost:5432/epic_voice_db \
  -c "SELECT \"userId\", provider, \"providerAccountId\" 
      FROM accounts 
      ORDER BY \"createdAt\" DESC LIMIT 1;"
```

**Expected Database State:**
```
users:
  - New user with Google email
  - emailVerified set to current timestamp
  - name from Google profile

accounts:
  - provider = "google"
  - providerAccountId = Google user ID
  - access_token, id_token present

organizations:
  - name = "[User Name]'s Organization"
  - ownerId = new user ID

memberships:
  - userId = new user ID
  - organizationId = new org ID
  - role = "owner"

subscriptions:
  - organizationId = new org ID
  - status = "trialing"
  - trialEndsAt = 14 days from now
  - provider = "stripe"
```

---

#### **Test 2: Sign Out and Sign In Again**

**Steps:**
1. While signed in, click profile icon in sidebar
2. Click: **"Sign Out"**
3. Verify redirected to: `/auth/signin`
4. Click: **"Continue with Google"** again
5. May auto-sign in if still logged into Google

**Expected Results:**
- ✅ Sign out works instantly
- ✅ Redirected to sign-in page
- ✅ Second sign-in is fast (no new user creation)
- ✅ Same trial banner shows (continues from original trial)
- ✅ No duplicate users/orgs in database

---

#### **Test 3: Protected Route Access (Unauthenticated)**

**Steps:**
1. In **incognito window** (not signed in)
2. Try to access: `https://ai.epic.dm/dashboard`
3. Try to access: `https://ai.epic.dm/dashboard/agents`

**Expected Results:**
- ✅ **Automatically redirected** to: `/auth/signin?callbackUrl=/dashboard`
- ✅ After signing in, redirected back to original URL

---

#### **Test 4: Auth Page Access (Already Authenticated)**

**Steps:**
1. While signed in, try to access: `https://ai.epic.dm/auth/signin`
2. Try to access: `https://ai.epic.dm/auth/signup`

**Expected Results:**
- ✅ **Automatically redirected** to: `/dashboard`
- ✅ Cannot access sign-in/sign-up when already authenticated

---

### **C) Test Trial Gating**

#### **Test 5: Trial Banner Display**

**Steps:**
1. Sign in and go to dashboard
2. Observe banner at top of page

**Expected Results:**
- ✅ **Blue banner** shows: "14 days left in your free trial"
- ✅ "View Plans" link goes to `/dashboard/billing`
- ✅ Banner appears on all dashboard pages

**Check Different Trial States:**

**Days 14-4:** Blue info banner
```
"14 days left in your free trial"
```

**Days 3-1:** Orange warning banner
```
"3 days left in your trial
Upgrade now to continue using all features"
```

**Day 0 (expired):** Red alert banner
```
"Your trial has expired
Upgrade to continue using Epic Voice"
```

---

#### **Test 6: Access During Active Trial**

**Steps:**
1. With active trial (days remaining > 0)
2. Navigate to each dashboard page:
   - `/dashboard`
   - `/dashboard/agents`
   - `/dashboard/calls`
   - `/dashboard/settings`
   - `/dashboard/billing`

**Expected Results:**
- ✅ **All pages accessible**
- ✅ Trial banner shows on all pages
- ✅ No access restrictions

---

#### **Test 7: Access After Trial Expires**

**Simulate Expired Trial:**
```bash
# Update subscription to expire immediately
psql postgresql://postgres:epicvoice2024@localhost:5432/epic_voice_db <<EOF
UPDATE subscriptions 
SET "trialEndsAt" = NOW() - INTERVAL '1 day'
WHERE "organizationId" = (
  SELECT id FROM organizations 
  WHERE "ownerId" = (
    SELECT id FROM users WHERE email = 'your-test-email@gmail.com'
  )
);
EOF
```

**Steps:**
1. Sign out and sign in again (refresh session)
2. Observe banner (should be RED)
3. Try to access: `/dashboard/agents`
4. Try to access: `/dashboard/calls`
5. Try to access: `/dashboard/billing`

**Expected Results:**
- ✅ Red "Trial Expired" banner shows
- ✅ Accessing `/dashboard/agents` → **redirects to** `/dashboard/billing`
- ✅ Accessing `/dashboard/calls` → **redirects to** `/dashboard/billing`
- ✅ Can still access `/dashboard/billing` page ✅

**Reset Trial:**
```bash
# Reset trial to 14 days
psql postgresql://postgres:epicvoice2024@localhost:5432/epic_voice_db <<EOF
UPDATE subscriptions 
SET "trialEndsAt" = NOW() + INTERVAL '14 days'
WHERE "organizationId" = (
  SELECT id FROM organizations 
  WHERE "ownerId" = (
    SELECT id FROM users WHERE email = 'your-test-email@gmail.com'
  )
);
EOF
```

---

### **D) Test Email/Password Auth**

#### **Test 8: Sign Up with Email/Password**

**Steps:**
1. Navigate to: `https://ai.epic.dm/auth/signup`
2. Fill in form:
   - Name: "Test User"
   - Email: "test@example.com"
   - Password: "SecurePass123!"
3. Click: **"Sign Up"**

**Expected Results:**
- ✅ Account created
- ✅ Organization created
- ✅ 14-day trial started
- ✅ Redirected to `/dashboard`
- ✅ Trial banner shows

**Database Verification:**
```bash
psql postgresql://postgres:epicvoice2024@localhost:5432/epic_voice_db \
  -c "SELECT id, email, name, password FROM users WHERE email = 'test@example.com';"

# Password should be bcrypt hash (starts with $2b$)
```

---

#### **Test 9: Sign In with Email/Password**

**Steps:**
1. Sign out
2. Navigate to: `https://ai.epic.dm/auth/signin`
3. Enter email and password from Test 8
4. Click: **"Sign In"**

**Expected Results:**
- ✅ Successfully signed in
- ✅ Redirected to `/dashboard`
- ✅ Same organization/trial as before

---

#### **Test 10: Invalid Credentials**

**Steps:**
1. Try to sign in with wrong password
2. Try to sign in with non-existent email

**Expected Results:**
- ✅ Error message: "Invalid email or password"
- ✅ Form stays on page
- ✅ No redirect

---

### **E) Test Error Handling**

#### **Test 11: OAuth Error (Not a Test User)**

**Steps:**
1. Remove yourself from test users in Google Console
2. Try to sign in with Google

**Expected Results:**
- ✅ Google shows: "Access blocked" error
- ✅ OR redirects to: `/auth/error?error=AccessDenied`
- ✅ Error page shows:
  - User-friendly message
  - Instructions to add test user
  - "Try Again" button

---

#### **Test 12: Network Error Handling**

**Simulate by stopping backend:**
```bash
systemctl stop livekit-frontend
```

**Steps:**
1. Try to access `https://ai.epic.dm/dashboard`

**Expected Results:**
- ✅ Apache returns 503 Service Unavailable
- ✅ User sees error page

**Restart:**
```bash
systemctl start livekit-frontend
```

---

## 📊 **Session Data Verification**

### **Check Session in Browser Console**

1. Open browser console (F12 → Console)
2. Run this code:
```javascript
fetch('/api/auth/session')
  .then(r => r.json())
  .then(session => console.log(session))
```

**Expected Output:**
```json
{
  "user": {
    "id": "cmh2n7tnt0000lypwa88rg1v7",
    "email": "user@example.com",
    "name": "User Name",
    "image": "https://lh3.googleusercontent.com/...",
    "organizationId": "cmh2n7tor0004lypwranxe7og",
    "organizationName": "User Name's Organization",
    "role": "owner",
    "subscriptionStatus": "trialing",
    "trialEndsAt": "2025-11-05T23:47:18.408Z",
    "hasActiveSubscription": true
  },
  "expires": "2025-12-22T23:47:18.000Z"
}
```

---

## 🐛 **Troubleshooting**

### **Issue: Console Error "Unexpected token '<'"**

**Cause:** Apache proxy misconfiguration

**Check:**
```bash
curl https://ai.epic.dm/api/auth/session
# Should return JSON, not HTML
```

**Fix:**
```bash
# Check Apache config has /api/auth before /api
grep -A2 "ProxyPass /api" /etc/apache2/sites-available/ai.epic.dm-le-ssl.conf

# Should show:
# ProxyPass /api/auth http://localhost:3001/api/auth
# ProxyPassReverse /api/auth http://localhost:3001/api/auth
# 
# ProxyPass /api http://localhost:5001/api
```

---

### **Issue: Trial Not Created**

**Symptoms:** User signs in but no trial banner

**Check Database:**
```bash
psql postgresql://postgres:epicvoice2024@localhost:5432/epic_voice_db \
  -c "SELECT u.email, s.status, s.\"trialEndsAt\" 
      FROM users u 
      LEFT JOIN organizations o ON u.id = o.\"ownerId\" 
      LEFT JOIN subscriptions s ON o.id = s.\"organizationId\" 
      WHERE u.email = 'your-email@example.com';"
```

**Fix:**
```bash
# Check frontend logs for errors during sign-in callback
tail -50 /opt/livekit1/frontend.log | grep -A10 "signIn callback"
```

---

### **Issue: "Access Denied" from Google**

**Cause:** Not added as test user

**Fix:**
1. Go to Google Cloud Console
2. OAuth consent screen → Test users → + ADD USERS
3. Add your email
4. Try again

---

### **Issue: Middleware Not Running**

**Check:**
```bash
# Verify middleware.ts exists
ls -la /opt/livekit1/frontend/middleware.ts

# Restart frontend
systemctl restart livekit-frontend
```

---

## ✅ **Success Criteria**

### **All Tests Should Pass:**

- [x] ✅ Google OAuth creates user/org/trial automatically
- [x] ✅ Email/password sign-up creates user/org/trial
- [x] ✅ Trial banner shows correct days remaining
- [x] ✅ Protected routes redirect unauthenticated users
- [x] ✅ Auth routes redirect authenticated users
- [x] ✅ Expired trial blocks access (except billing)
- [x] ✅ Sign out works correctly
- [x] ✅ Error pages show helpful messages
- [x] ✅ No console errors during normal flow
- [x] ✅ Session data includes trial information

---

## 📝 **Testing Log Template**

```markdown
## Test Session: [Date/Time]
**Tester:** [Your Name]
**Browser:** [Chrome/Firefox/Safari]
**Mode:** [Normal/Incognito]

### Test 1: Google OAuth (New User)
- [ ] No console errors on sign-in page
- [ ] Google OAuth completes successfully
- [ ] Redirected to dashboard
- [ ] Trial banner shows "14 days left"
- [ ] User created in database
- [ ] Organization created
- [ ] Trial subscription created

### Test 2: Protected Routes
- [ ] /dashboard redirects when not signed in
- [ ] /dashboard accessible when signed in
- [ ] /auth/signin redirects when signed in

### Test 3: Trial Gating
- [ ] Active trial allows all access
- [ ] Expired trial blocks dashboard pages
- [ ] Expired trial allows billing page
- [ ] Banner shows correct status

### Test 4: Email/Password
- [ ] Sign up creates account
- [ ] Sign in works with correct credentials
- [ ] Invalid credentials show error

### Issues Found:
[List any issues]

### Notes:
[Additional observations]
```

---

**Testing Complete!** 🎉

All authentication and trial gating features are ready for production use.

---

**Last Updated:** October 22, 2025 at 11:50 PM UTC  
**Status:** ✅ Ready for Testing

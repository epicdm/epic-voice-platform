# 🔐 Google OAuth Setup Guide

## Step-by-Step Instructions to Get Google OAuth Credentials

### **Step 1: Access Google Cloud Console**

1. **Go to:** https://console.cloud.google.com/
2. **Sign in** with your Google account (use a business account if available)

---

### **Step 2: Create a New Project (or Select Existing)**

1. Click the **project dropdown** at the top (next to "Google Cloud")
2. Click **"NEW PROJECT"**
3. **Project Name:** `Epic Voice App` (or your preferred name)
4. Click **"CREATE"**
5. Wait for the project to be created (~30 seconds)
6. **Select the project** from the dropdown

---

### **Step 3: Enable Google+ API**

1. In the left sidebar, go to: **"APIs & Services" → "Library"**
2. Search for: **"Google+ API"** (or "Google People API")
3. Click on it
4. Click **"ENABLE"**
5. Wait for it to enable (~10 seconds)

---

### **Step 4: Configure OAuth Consent Screen**

1. In the left sidebar, go to: **"APIs & Services" → "OAuth consent screen"**

2. **Select User Type:**
   - For testing: Choose **"External"**
   - Click **"CREATE"**

3. **App Information:**
   - **App name:** `Epic Voice` (or your app name)
   - **User support email:** Your email address
   - **App logo:** (Optional - upload later)
   - **App domain:** Leave blank for now
   - **Developer contact:** Your email address
   - Click **"SAVE AND CONTINUE"**

4. **Scopes:**
   - Click **"ADD OR REMOVE SCOPES"**
   - Select these scopes:
     - `userinfo.email`
     - `userinfo.profile`
     - `openid`
   - Click **"UPDATE"**
   - Click **"SAVE AND CONTINUE"**

5. **Test Users (for External/Testing mode):**
   - Click **"ADD USERS"**
   - Add your email address (and any other test users)
   - Click **"ADD"**
   - Click **"SAVE AND CONTINUE"**

6. **Summary:**
   - Review everything
   - Click **"BACK TO DASHBOARD"**

---

### **Step 5: Create OAuth Credentials**

1. In the left sidebar, go to: **"APIs & Services" → "Credentials"**

2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**

4. **Application type:** Select **"Web application"**

5. **Name:** `Epic Voice Web Client`

6. **Authorized JavaScript origins:**
   - Click **"+ ADD URI"**
   - Add: `http://66.118.37.6:3001`
   - Add: `http://localhost:3001` (for local testing)

7. **Authorized redirect URIs:**
   - Click **"+ ADD URI"**
   - Add: `http://66.118.37.6:3001/api/auth/callback/google`
   - Add: `http://localhost:3001/api/auth/callback/google`

8. Click **"CREATE"**

---

### **Step 6: Copy Your Credentials**

A popup will appear with your credentials:

```
Client ID: 
123456789-abc123def456.apps.googleusercontent.com

Client Secret:
GOCSPX-abc123def456ghi789
```

**⚠️ IMPORTANT:** 
- Copy both values immediately
- Keep them secure
- Don't commit them to Git

---

### **Step 7: Add Credentials to Your App**

**Option A: Manual (Recommended)**

1. Open: `/opt/livekit1/frontend/.env.local`
2. Find these lines:
   ```bash
   GOOGLE_CLIENT_ID=""
   GOOGLE_CLIENT_SECRET=""
   ```
3. Paste your credentials:
   ```bash
   GOOGLE_CLIENT_ID="123456789-abc123def456.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="GOCSPX-abc123def456ghi789"
   ```
4. Save the file

**Option B: Using Command Line**

Run these commands (replace with your actual credentials):

```bash
cd /opt/livekit1/frontend

# Add Google Client ID
sed -i 's|GOOGLE_CLIENT_ID=""|GOOGLE_CLIENT_ID="YOUR_CLIENT_ID_HERE"|' .env.local

# Add Google Client Secret
sed -i 's|GOOGLE_CLIENT_SECRET=""|GOOGLE_CLIENT_SECRET="YOUR_SECRET_HERE"|' .env.local
```

---

### **Step 8: Restart Your Frontend Server**

```bash
# If using systemctl
systemctl restart livekit-frontend

# Or if running manually
cd /opt/livekit1/frontend
npm run dev
```

---

## ✅ **Verification Steps**

### **Test Google OAuth:**

1. **Open browser:** http://66.118.37.6:3001/auth/signin
2. **Click:** "Continue with Google"
3. **Expected behavior:**
   - Redirected to Google login
   - Asked to select/sign in with Google account
   - Consent screen (first time only)
   - Redirected back to your app at `/dashboard`
   - User, Organization, and Trial created automatically!

4. **Check database:**
   ```bash
   cd /opt/livekit1/frontend
   npx prisma studio
   ```
   - Open: http://localhost:5555
   - Verify user was created in `users` table
   - Verify organization in `organizations` table
   - Verify trial in `subscriptions` table

---

## 🔧 **Troubleshooting**

### **Error: "redirect_uri_mismatch"**

**Problem:** Redirect URI not authorized

**Solution:**
1. Go back to Google Cloud Console
2. **Credentials** → Click your OAuth client
3. **Authorized redirect URIs** → Add:
   ```
   http://66.118.37.6:3001/api/auth/callback/google
   ```
4. Save and try again

### **Error: "Access blocked: Epic Voice has not completed the Google verification process"**

**Problem:** App is in testing mode and user not added

**Solution:**
1. **OAuth consent screen** → **Test users**
2. Add the email you're trying to sign in with
3. Or: Change app status to **"In production"** (requires verification for public use)

### **Error: "Missing GOOGLE_CLIENT_ID"**

**Problem:** Environment variables not loaded

**Solution:**
1. Verify `.env.local` has the credentials
2. Copy to `.env`: `cp .env.local .env`
3. Restart server
4. Check with: `echo $GOOGLE_CLIENT_ID` (if using export)

### **Error: "Unable to verify authorization state"**

**Problem:** Session/cookie issues

**Solution:**
1. Clear browser cookies for your domain
2. Try incognito/private mode
3. Verify NEXTAUTH_URL matches your actual URL
4. Check NEXTAUTH_SECRET is set

---

## 📋 **Quick Reference**

### **Current Configuration:**

```bash
# Your app URLs
Frontend: http://66.118.37.6:3001
Auth Callback: http://66.118.37.6:3001/api/auth/callback/google

# Auth pages
Sign In: http://66.118.37.6:3001/auth/signin
Sign Up: http://66.118.37.6:3001/auth/signup

# NextAuth endpoints
Session: http://66.118.37.6:3001/api/auth/session
Providers: http://66.118.37.6:3001/api/auth/providers
```

### **Test User Flow:**

1. User clicks "Continue with Google"
2. Google OAuth flow → User signs in
3. **First login:**
   - User created in database
   - Organization created: "{name}'s Organization"
   - Membership created: User → Org (role: owner)
   - Subscription created: Status "trialing", 14 days
4. Redirected to `/dashboard`
5. Trial banner shows: "You're on a free trial — 14 days left"

---

## 🎯 **What Happens on First Google Sign-In:**

```sql
-- 1. User record created
INSERT INTO users (email, name, image, emailVerified)
VALUES ('user@gmail.com', 'John Doe', 'https://...', NOW());

-- 2. Google account linked
INSERT INTO accounts (userId, provider, providerAccountId, ...)
VALUES ('cuid123', 'google', 'google_user_id', ...);

-- 3. Organization created
INSERT INTO organizations (name, ownerId)
VALUES ('John Doe''s Organization', 'cuid123');

-- 4. Membership created
INSERT INTO memberships (userId, organizationId, role)
VALUES ('cuid123', 'org_cuid', 'owner');

-- 5. Trial subscription created
INSERT INTO subscriptions (organizationId, status, trialEndsAt)
VALUES ('org_cuid', 'trialing', NOW() + INTERVAL '14 days');
```

---

## 🔒 **Security Best Practices**

### **DO:**
✅ Keep credentials in `.env.local` (not committed to Git)
✅ Use `.env` for production (server-side only)
✅ Rotate secrets if exposed
✅ Add only trusted test users
✅ Use HTTPS in production

### **DON'T:**
❌ Commit credentials to Git
❌ Share secrets publicly
❌ Use production credentials in development
❌ Skip the OAuth consent screen
❌ Add untrusted redirect URIs

---

## 🚀 **Moving to Production**

When ready to go live:

1. **Update OAuth Consent Screen:**
   - Change from "Testing" to "In production"
   - Submit for Google verification (if needed)
   - Add privacy policy & terms of service URLs

2. **Update Authorized URIs:**
   - Replace with production domain
   - Add HTTPS URLs
   - Remove localhost URLs

3. **Environment Variables:**
   - Use production `.env` file
   - Store secrets in secure vault (not in code)
   - Use environment variables in deployment platform

4. **Domain Configuration:**
   - Set up custom domain
   - Configure SSL/TLS
   - Update NEXTAUTH_URL to production URL

---

## 📞 **Need Help?**

If you encounter any issues:

1. **Check logs:**
   ```bash
   # Frontend logs
   journalctl -u livekit-frontend -f
   
   # Or if running manually
   npm run dev
   ```

2. **Test NextAuth:**
   ```bash
   # Check providers endpoint
   curl http://66.118.37.6:3001/api/auth/providers
   
   # Should return:
   # {"google":{"id":"google","name":"Google","type":"oauth",...}}
   ```

3. **Verify database:**
   ```bash
   cd /opt/livekit1/frontend
   npx prisma studio
   # Opens at http://localhost:5555
   ```

---

## ✅ **Checklist**

Before testing:

- [ ] Google Cloud project created
- [ ] OAuth consent screen configured
- [ ] OAuth client credentials created
- [ ] Authorized redirect URIs added
- [ ] Credentials added to `.env.local`
- [ ] Frontend server restarted
- [ ] Test user added (if in testing mode)
- [ ] Database is running (PostgreSQL)
- [ ] Port 3001 is accessible

---

**Ready to test!** Go to: http://66.118.37.6:3001/auth/signin 🚀

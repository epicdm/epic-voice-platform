# Complete Staging Environment Setup Guide

## ✅ COMPLETED - Infrastructure Created

### 1. Staging Database (Render PostgreSQL)
- **Name**: epic-voice-db-staging
- **ID**: dpg-d4iur6re5dus73eh26ug-a
- **Status**: ✅ Available
- **Dashboard**: https://dashboard.render.com/d/dpg-d4iur6re5dus73eh26ug-a
- **Plan**: Basic 256MB
- **Region**: Oregon

### 2. Staging Backend Service (Render)
- **Name**: epic-voice-platform-staging
- **ID**: srv-d4iurf7pm1nc73e1b4jg
- **URL**: https://epic-voice-platform-staging.onrender.com
- **Dashboard**: https://dashboard.render.com/web/srv-d4iurf7pm1nc73e1b4jg
- **Branch**: staging
- **Auto-deploy**: Enabled (deploys on push to staging branch)

### 3. Git Branch
- **Branch**: staging (created from R1)
- **Repository**: https://github.com/epicdm/epic-voice-platform

---

## 🔧 NEXT STEPS - Manual Configuration Required

### STEP 1: Get Database Connection String

1. Go to: https://dashboard.render.com/d/dpg-d4iur6re5dus73eh26ug-a
2. Look for **"Connections"** section
3. Copy the **"Internal Database URL"** (starts with `postgresql://`)
4. It should look like:
   ```
   postgresql://epic_voice_db_staging_user:XXXXXXXX@dpg-d4iur6re5dus73eh26ug-a/epic_voice_db_staging
   ```
5. **IMPORTANT**: Remove `?schema=public` if it's at the end (causes issues with psycopg2)

---

### STEP 2: Configure Staging Backend Environment Variables

1. Go to: https://dashboard.render.com/web/srv-d4iurf7pm1nc73e1b4jg
2. Click **"Environment"** tab on the left
3. Click **"Add Environment Variable"**
4. Add the following variables:

#### Required Variables:

**Database:**
```
DATABASE_URL = <Paste the Internal Database URL from Step 1>
```

**LiveKit (Copy from production or use staging credentials):**
```
LIVEKIT_URL = wss://YOUR_LIVEKIT_CLOUD_URL
LIVEKIT_API_KEY = <Your LiveKit API Key>
LIVEKIT_API_SECRET = <Your LiveKit API Secret>
LIVEKIT_SIP_DOMAIN = <Your LiveKit SIP domain>
```

**Google OAuth (Can use same as production OR create separate staging app):**
```
GOOGLE_CLIENT_ID = <Your Google OAuth Client ID>
GOOGLE_CLIENT_SECRET = <Your Google OAuth Client Secret>
```

**Application Settings:**
```
PORT = 10000
FLASK_ENV = staging
SECRET_KEY = <Generate a new random string for staging>
```

**Optional - Magnus Billing (if you have separate staging instance):**
```
MAGNUS_API_URL = <Magnus API URL>
MAGNUS_API_KEY = <Magnus API Key>
MAGNUS_USERNAME = <Magnus Username>
MAGNUS_PASSWORD = <Magnus Password>
```

**Optional - n8n (create separate staging webhooks recommended):**
```
N8N_WEBHOOK_URL = <Your n8n staging webhook URL>
```

**Optional - Brand Fetching (can share with production):**
```
BRANDFETCH_API_KEY = <Your Brandfetch API key>
APIFY_API_TOKEN = <Your Apify API token>
```

5. After adding all variables, click **"Save Changes"**
6. The service will automatically redeploy (takes 3-5 minutes)

---

### STEP 3: Set Up Vercel Staging Deployment

#### A. Configure Vercel Project

1. Go to: https://vercel.com/dashboard
2. Find your project (should be named something like `epic-voice-platform` or `ai-epic-dm`)
3. Click on the project to open it

#### B. Add Staging Domain

1. Go to **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter: `staging.ai.epic.dm`
4. Click **"Add"**
5. Vercel will show you DNS configuration needed - **SAVE THIS INFO for Step 4**
6. It will show something like:
   ```
   Type: CNAME
   Name: staging
   Value: cname.vercel-dns.com
   ```

#### C. Configure Git Branch Settings

1. Go to **Settings** → **Git**
2. Under **"Production Branch"**:
   - Set to: `production` (we'll create this branch later)
3. Under **"Preview Branches"**:
   - Enable "Automatic Preview Deployments"
   - Add pattern: `staging`
4. Save settings

#### D. Add Environment Variables for Staging

1. Go to **Settings** → **Environment Variables**
2. For each variable below, select **"Preview"** (staging) environment:

```
BACKEND_URL = https://epic-voice-platform-staging.onrender.com
NEXTAUTH_URL = https://staging.ai.epic.dm
DATABASE_URL = <Same Internal Database URL from Step 1>
GOOGLE_CLIENT_ID = <Same as backend>
GOOGLE_CLIENT_SECRET = <Same as backend>
```

3. Click **"Save"**

---

### STEP 4: Configure DNS for staging.ai.epic.dm

1. Go to your domain registrar's DNS settings (where you manage ai.epic.dm)
2. Add a new DNS record:
   - **Type**: CNAME
   - **Name**: staging (or staging.ai.epic.dm depending on your DNS provider)
   - **Value**: cname.vercel-dns.com (or whatever Vercel showed you in Step 3B)
   - **TTL**: Auto or 3600 (1 hour)
3. Click **"Save"** or **"Add Record"**
4. Wait 5-15 minutes for DNS propagation

---

### STEP 5: Create Production Branch (Important!)

Currently, production is deploying from `R1` branch. We need to fix this:

1. The `production` branch will be created from the current working state
2. Future production deploys will come from `production` branch only
3. This protects production from accidental changes

I'll create this branch after confirming staging works.

---

## 🧪 TESTING STAGING ENVIRONMENT

### After completing all steps above:

#### Test Backend:
1. Open: https://epic-voice-platform-staging.onrender.com
2. You should see the Flask app running
3. Test health endpoint: https://epic-voice-platform-staging.onrender.com/api/health

#### Test Frontend:
1. Wait for DNS to propagate (5-15 minutes after Step 4)
2. Open: https://staging.ai.epic.dm
3. You should see the full application
4. Try logging in and testing features

---

## 📋 DEPLOYMENT WORKFLOW (After Setup Complete)

### Development Flow:
```
1. Work on R1 branch locally
   └─> Test at localhost:3002

2. When ready for staging:
   └─> git checkout staging
   └─> git merge R1
   └─> git push origin staging
   └─> Auto-deploys to staging.ai.epic.dm
   └─> Test on staging

3. When staging tests pass:
   └─> git checkout production
   └─> git merge staging
   └─> git push origin production
   └─> Auto-deploys to ai.epic.dm (live site)
```

### Important Rules:
- ✅ **Always test on staging before production**
- ✅ **Never push directly to production branch**
- ✅ **Always merge: R1 → staging → production**
- ❌ **Never skip staging**

---

## 📊 CURRENT STATUS

- ✅ Staging database created and available
- ✅ Staging backend service created
- ✅ Staging branch created
- ⏳ **YOU NEED TO DO**: Configure backend environment variables (Step 2)
- ⏳ **YOU NEED TO DO**: Set up Vercel staging (Step 3)
- ⏳ **YOU NEED TO DO**: Configure DNS (Step 4)
- ⏳ **AFTER STAGING WORKS**: Create production branch (Step 5)

---

## 🆘 TROUBLESHOOTING

### Backend won't start:
- Check environment variables are set correctly in Render
- Check DATABASE_URL doesn't have `?schema=public` at the end
- Check logs in Render dashboard

### Frontend shows 500 errors:
- Check BACKEND_URL points to staging backend
- Check backend is running (test the URL directly)
- Check browser console for specific errors

### staging.ai.epic.dm doesn't load:
- Wait 15 minutes for DNS propagation
- Check DNS record is correct (CNAME to Vercel)
- Check Vercel deployment succeeded

---

## 📞 NEXT - WHAT TO DO NOW

1. **Go to Render** and complete Step 2 (environment variables)
2. **Go to Vercel** and complete Step 3 (staging deployment)
3. **Go to DNS** and complete Step 4 (DNS configuration)
4. **Wait 15 minutes** for DNS to propagate
5. **Test** both staging.ai.epic.dm and the backend URL
6. **Let me know** when staging is working - I'll create the production branch


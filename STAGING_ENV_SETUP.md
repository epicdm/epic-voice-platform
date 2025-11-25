# Staging Environment Variables Setup

## Staging Resources Created

### ✅ Staging Database (Render PostgreSQL)
- **Name**: epic-voice-db-staging
- **ID**: dpg-d4iur6re5dus73eh26ug-a
- **Status**: Provisioning...
- **Dashboard**: https://dashboard.render.com/d/dpg-d4iur6re5dus73eh26ug-a
- **Connection String**: (Will be available once provisioning completes - check dashboard)

### ✅ Staging Backend Service (Render Web Service)
- **Name**: epic-voice-platform-staging
- **ID**: srv-d4iurf7pm1nc73e1b4jg
- **URL**: https://epic-voice-platform-staging.onrender.com
- **Branch**: staging
- **Dashboard**: https://dashboard.render.com/web/srv-d4iurf7pm1nc73e1b4jg
- **Deploy**: Auto-deploy on commit to `staging` branch

## Required Environment Variables for Staging Backend

You need to set these in the Render dashboard for the staging backend service:

### Database
```bash
DATABASE_URL=<Get from staging database dashboard - Internal connection string>
```

### LiveKit Credentials
```bash
LIVEKIT_URL=wss://YOUR_LIVEKIT_URL
LIVEKIT_API_KEY=<Your LiveKit API key>
LIVEKIT_API_SECRET=<Your LiveKit API secret>
LIVEKIT_SIP_DOMAIN=<Your LiveKit SIP domain>
```

### Google OAuth (Can use same as production OR create separate staging credentials)
```bash
GOOGLE_CLIENT_ID=<Your Google OAuth Client ID>
GOOGLE_CLIENT_SECRET=<Your Google OAuth Client Secret>
```

### Magnus Billing (Recommend using separate staging Magnus instance if available)
```bash
MAGNUS_API_URL=<Magnus Billing API URL>
MAGNUS_API_KEY=<Magnus API key>
MAGNUS_USERNAME=<Magnus username>
MAGNUS_PASSWORD=<Magnus password>
```

### n8n Webhook (Create separate staging webhooks)
```bash
N8N_WEBHOOK_URL=<n8n staging webhook URL>
```

### Application Settings
```bash
PORT=10000
FLASK_ENV=staging
FLASK_DEBUG=false
SECRET_KEY=<Generate new secret key for staging>
```

### Optional - Brand Fetching
```bash
BRANDFETCH_API_KEY=<Can use production key>
APIFY_API_TOKEN=<Can use production key>
```

## Steps to Complete Setup

### 1. Get Database Connection String
Once the database finishes provisioning (takes 2-3 minutes):
1. Go to: https://dashboard.render.com/d/dpg-d4iur6re5dus73eh26ug-a
2. Click on "Connection" tab
3. Copy the **Internal Connection String**
4. It will look like: `postgresql://epic_voice_db_staging_user:PASSWORD@HOST/epic_voice_db_staging`

### 2. Set Environment Variables on Staging Backend
1. Go to: https://dashboard.render.com/web/srv-d4iurf7pm1nc73e1b4jg
2. Click "Environment" tab
3. Add all the environment variables listed above
4. Click "Save Changes"

### 3. Trigger Deployment
After setting env vars:
1. The service will auto-redeploy
2. Or manually trigger: Click "Manual Deploy" → "Deploy latest commit"

## Frontend Staging Setup (Vercel)

### Steps:
1. Go to Vercel dashboard: https://vercel.com
2. Find project: epic-voice-platform (or ai.epic.dm project)
3. Go to Settings → Domains
4. Add new domain: `staging.ai.epic.dm`
5. Vercel will provide DNS records to configure
6. Go to Settings → Git
7. Set up staging deployment:
   - Production Branch: `production` (will create later)
   - Preview Branch Pattern: `staging`
   - Enable automatic deployments for `staging` branch

### Environment Variables for Frontend Staging:
```bash
BACKEND_URL=https://epic-voice-platform-staging.onrender.com
NEXTAUTH_URL=https://staging.ai.epic.dm
DATABASE_URL=<Same as backend staging database URL>
GOOGLE_CLIENT_ID=<Same as backend>
GOOGLE_CLIENT_SECRET=<Same as backend>
```

## DNS Configuration for staging.ai.epic.dm

After Vercel provides the DNS records, you'll need to add:

**Type**: CNAME
**Name**: staging
**Value**: cname.vercel-dns.com (or the value Vercel provides)
**TTL**: Auto or 3600

## Testing Staging Environment

Once all setup is complete:

1. **Backend**: https://epic-voice-platform-staging.onrender.com
   - Test: `curl https://epic-voice-platform-staging.onrender.com/api/health`

2. **Frontend**: https://staging.ai.epic.dm
   - Test: Open in browser and check dashboard

## Workflow After Setup

```
1. Develop on R1 branch → Test on localhost
2. Merge R1 → staging
3. Auto-deploy to staging.ai.epic.dm
4. Test on staging
5. If good → Merge staging → production
6. Auto-deploy to ai.epic.dm (production)
```

## Current Status

- ✅ Staging database created (provisioning...)
- ✅ Staging backend service created
- ⏳ Waiting for database to finish provisioning
- ⏳ Need to set environment variables
- ⏳ Need to configure Vercel staging
- ⏳ Need to configure DNS

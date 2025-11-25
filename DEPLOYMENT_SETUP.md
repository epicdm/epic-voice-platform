# Deployment Setup - Staging & Production Environments

**Date**: November 25, 2025

## Current Production Setup

### Backend (Render)
- **Service**: `epic-voice-platform` (srv-d4fv0lggjchc73dm29b0)
- **URL**: https://epic-voice-platform.onrender.com
- **Branch**: `R1` ⚠️ (should be `production`)
- **Region**: Oregon
- **Plan**: Starter
- **Runtime**: Python
- **Build Command**:
  ```bash
  pip install livekit-agents[mcp]>=1.2.0 livekit-plugins-openai>=1.0.0 livekit-plugins-deepgram>=1.0.0 livekit-plugins-silero>=1.0.0 livekit-plugins-turn-detector>=1.0.0 python-dotenv>=1.0.0 flask>=3.1.2 flask-login>=0.6.3 flask-cors>=6.0.1 flask-socketio>=5.3.6 psutil>=7.1.0 psycopg2-binary>=2.9.11 sqlalchemy>=2.0.44 livekit>=1.0.13 flasgger>=0.9.7 prometheus_client>=0.20.0 PyJWT>=2.9.0 colorthief google-auth google-auth-oauthlib google-api-python-client paramiko PyPDF2 python-docx tiktoken
  ```
- **Start Command**: `python user_dashboard.py`
- **Auto Deploy**: Yes (on commit to R1)

### Frontend (Vercel)
- **URL**: https://ai.epic.dm
- **Branch**: Unknown (need to check Vercel)

## Proposed 3-Environment Setup

### 1. Development (Local)
- **Branch**: `R1` or `dev`
- **Backend**: http://localhost:5002
- **Frontend**: http://localhost:3002
- **Database**: PostgreSQL localhost
- **Purpose**: Active development and initial testing

### 2. Staging (Render + Vercel)
- **Branch**: `staging` ✅ Created
- **Backend**: https://epic-voice-platform-staging.onrender.com (to be created)
- **Frontend**: https://staging.ai.epic.dm (to be configured on Vercel)
- **Database**: Render PostgreSQL Staging instance (to be created)
- **Purpose**: Pre-production testing in production-like environment

### 3. Production (Render + Vercel)
- **Branch**: `production` (to be created from current working state)
- **Backend**: https://epic-voice-platform.onrender.com (existing)
- **Frontend**: https://ai.epic.dm (existing)
- **Database**: Render PostgreSQL Production instance (existing)
- **Purpose**: Live site for end users

## Branch Strategy

```
dev/R1 (development)
  ↓
  → Pull Request → staging (staging environment)
                      ↓
                      → Pull Request → production (production environment)
```

**Workflow:**
1. Develop features on `R1` branch
2. Test locally at localhost:3002
3. When ready, merge `R1` → `staging`
4. Staging auto-deploys to staging.ai.epic.dm
5. Test on staging environment
6. If staging tests pass, merge `staging` → `production`
7. Production auto-deploys to ai.epic.dm

## Next Steps

### Immediate Actions:
1. ✅ Create `staging` branch
2. ⏳ Set up Render PostgreSQL staging database
3. ⏳ Create Render web service for staging backend
4. ⏳ Configure Vercel staging deployment
5. ⏳ Create `production` branch from current working R1
6. ⏳ Update production Render service to deploy from `production` branch

### Environment Variables Needed:
All services need the same environment variables but with different values for staging vs production:
- `DATABASE_URL` - Different databases for staging/production
- `BACKEND_URL` - Different backend URLs
- `NEXTAUTH_URL` - Different frontend URLs
- `LIVEKIT_*` credentials
- `GOOGLE_*` OAuth credentials
- Magnus Billing credentials
- Any other secrets

## Database Strategy

**Option A: Separate staging database (Recommended)**
- Pros: Complete isolation, can test migrations safely
- Cons: Additional cost, data not synced with production

**Option B: Shared database with staging schema**
- Pros: Lower cost, can access production data
- Cons: Risk of affecting production data

**Recommendation**: Use separate staging database for safety.

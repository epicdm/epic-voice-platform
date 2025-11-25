# BASELINE SNAPSHOT - Post-Migration Consolidated Code
**Date**: November 25, 2025  
**Branch**: R1  
**Commit**: d5f3724

## Summary
This snapshot represents the consolidated codebase after migration from Vite/React to Next.js 15.
All recent restoration work (Nov 21-25) has been completed and tested.

## Key Restorations Completed

### 1. Agent Templates (Nov 24 - Commit 4957fa7)
- **Restored 8 agent templates** (was reduced to 3 during migration)
- Templates: Customer Support, Sales Outreach, Appointment Booking, Survey & Feedback,  
  Restaurant Reservations, Technical Support, Healthcare Screening, Real Estate Qualifier
- File: `frontend/lib/agent-templates.ts` (448 lines)

### 2. Funnel Engine (Nov 23-24)
- Complete funnel wizard with node/edge management
- Landing page generation
- n8n workflow integration
- Files: `backend/funnel_engine/*`, `frontend/components/funnels/*`

### 3. Backend Modules (Nov 22-24)
- Call outcomes tracking
- Call transcripts
- Cost tracking & balance
- Rate limiting
- Real-time dashboard (Socket.IO)
- Brand kit API
- Admin settings
- Calendar OAuth
- Agent tools (calendar booking, email followup, SMS, knowledge base)

### 4. Authentication System (Nov 24 - Commit 1ba85ed)
- Restored working NextAuth integration
- Fixed API credentials and CORS
- Added localhost bypass for local testing

## File Count
- **3,920 files** changed in git (last 7 days)  
- **456 files** modified on disk (last 7 days)
- **98 commits** in last 7 days

## Known Issues Resolved
1. ✅ VARCHAR(10) truncation in sip_extension
2. ✅ Funnel API route mismatch  
3. ✅ TypeScript errors for Next.js 15
4. ✅ SelectItem value props incompatibility
5. ✅ Phone provisioning parameter mismatch
6. ✅ DATABASE_URL schema parameter (psycopg2 incompatibility)

## Current Status
- **Local**: Running successfully on localhost:3002 (frontend) + localhost:5002 (backend)
- **Deployed**: R1 branch pushed to production-deploy for Render deployment
- **Database**: PostgreSQL (localhost + Render)
- **Authentication**: NextAuth with Google OAuth

## Critical Files
- `frontend/lib/agent-templates.ts` - 8 agent templates
- `frontend/lib/api.ts` - Full API client (261 lines)
- `frontend/lib/types.ts` - Complete type definitions (167 lines)
- `frontend/components/agents/CreateAgentWizard.tsx` - 7-step wizard (1086 lines)
- `backend/funnel_engine/*` - Complete funnel engine
- `database.py` - Unified database models
- `user_dashboard.py` - Main Flask application

## Next Steps
1. Monitor Render deployment
2. Fix DATABASE_URL environment variable on Render (remove ?schema=public)
3. Test funnel wizard on deployed site
4. Verify 8 agent templates are visible in production

## Git Information
- **Repository**: git@github.com:epicdm/epic-voice-platform.git
- **Current Branch**: R1
- **Production Branch**: production-deploy (force-pushed from R1)
- **Last Commit**: d5f3724 "Add localhost authentication bypass for local development"


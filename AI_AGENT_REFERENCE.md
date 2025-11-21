# AI Agent Reference Guide - Production Server

## 🎯 Purpose
This document provides locations of working code examples for AI agents working on this production server.

## 📁 Working Code Reference Locations

### **Old Backup Code (Working Examples)**

The production server contains **working reference code** in backup folders. Use these as examples when fixing or implementing features.

#### API Routes (Working Examples)
```
/opt/livekit1/frontend/app_old_backup/api/
├── admin-api/users/              # Admin user management (WORKING)
├── auth/                         # Authentication endpoints (WORKING)
├── user/                         # User profile, agents, stats (WORKING)
└── v1/                          # Public API v1 endpoints (WORKING)
```

**Key Working Files:**
- `/opt/livekit1/frontend/app_old_backup/api/user/profile/route.ts` - User profile API (Flask backend integration)
- `/opt/livekit1/frontend/app_old_backup/api/user/agents/route.ts` - Agent management API
- `/opt/livekit1/frontend/app_old_backup/api/auth/[...nextauth]/route.ts` - NextAuth configuration

#### Components (Working Examples)
```
/opt/livekit1/frontend/components_old_backup/
```

#### Utilities (Working Examples)
```
/opt/livekit1/frontend/lib_old_backup/
├── auth.ts                       # Authentication utilities (WORKING)
├── prisma.ts                     # Database client (WORKING)
└── utils.ts                      # Helper functions (WORKING)
```

#### Type Definitions (Working Examples)
```
/opt/livekit1/frontend/types_old_backup/
```

---

## 🔧 Current Implementation

### **Active Code (May Have Issues)**
```
/opt/livekit1/frontend/app/
/opt/livekit1/frontend/lib/
/opt/livekit1/frontend/components/
```

---

## 📖 How to Use This Reference

### **For AI Agents:**

When asked to fix or implement a feature:

1. **Check the old backup for working examples:**
   ```bash
   cat /opt/livekit1/frontend/app_old_backup/api/user/profile/route.ts
   ```

2. **Compare with current implementation:**
   ```bash
   diff /opt/livekit1/frontend/app/api/user/profile/route.ts \
        /opt/livekit1/frontend/app_old_backup/api/user/profile/route.ts
   ```

3. **Reference the working patterns from old code**

4. **Apply fixes to current code**

---

## 🏗️ Architecture Reference

### **Original Working Architecture:**
```
Frontend (Next.js) 
    ↓
Flask Backend (user_dashboard.py on port 5001)
    ↓
PostgreSQL Database
    ↓
LiveKit/Voice Agents
```

### **Current Architecture (Modified):**
```
Frontend (Next.js)
    ↓ (some APIs bypass backend)
PostgreSQL Database (direct via Prisma)
```

**Note:** Some features may not work if Flask backend is down.

---

## 🗄️ Database

### **Connection:**
- Host: `localhost`
- Port: `5432`
- Database: `epic_voice_db`
- User: `postgres`
- Password: Check `/opt/livekit1/frontend/.env.local`

### **Schema:**
```bash
cd /opt/livekit1/frontend
npx prisma studio  # View database
```

---

## 🔍 Finding Working Examples

### **Quick Commands:**

```bash
# List all old backup API files
find /opt/livekit1/frontend/app_old_backup/api -type f -name "*.ts"

# Search for specific functionality in old code
grep -r "profile" /opt/livekit1/frontend/app_old_backup/api/

# View working auth implementation
cat /opt/livekit1/frontend/app_old_backup/api/auth/[...nextauth]/route.ts

# Compare implementations
diff /opt/livekit1/frontend/app/api/user/profile/route.ts \
     /opt/livekit1/frontend/app_old_backup/api/user/profile/route.ts
```

---

## 📚 Git History

### **Working Commits:**
```bash
cd /opt/livekit1

# View commit with working code
git show b9eb8c7:frontend/app_old_backup/api/user/profile/route.ts

# List all commits
git log --oneline | grep -i "complete\|working"
```

**Key Commits:**
- `b9eb8c7` - Add complete LiveKit frontend application with all source files
- `63047c7` - Complete AI agent creation and call flow implementation
- `e16bc64` - Complete working Magnus Billing integration

---

## ⚠️ Important Notes for AI Agents

1. **Always check old_backup folders first** before implementing new solutions
2. **Old code worked with Flask backend** - current code tries to bypass it
3. **Profile API originally proxied to Flask** - now uses Prisma directly
4. **Auth callbacks had Prisma queries** - caused edge runtime issues
5. **Working examples show the original architecture** - may need Flask backend running

---

## 🔗 Useful Paths

| Resource | Path |
|----------|------|
| Frontend Source | `/opt/livekit1/frontend/` |
| Old Working Examples | `/opt/livekit1/frontend/*_old_backup/` |
| Flask Backend | `/opt/livekit1/user_dashboard.py` |
| Database Schema | `/opt/livekit1/frontend/prisma/schema.prisma` |
| Environment Config | `/opt/livekit1/frontend/.env.local` |
| Deployment Script | `/opt/livekit1/deploy-simple.sh` |
| Logs | `journalctl -u livekit-frontend -n 50` |

---

## 🚀 Deployment

After making changes:
```bash
cd /opt/livekit1
./deploy-simple.sh
```

Or manually:
```bash
cd /opt/livekit1/frontend
npm run build
sudo systemctl restart livekit-frontend
```

---

## 📞 Support

- GitHub: https://github.com/epicdm/livekit1
- Branch: R1
- All code is committed and pushed to origin/R1

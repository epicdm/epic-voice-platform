# LiveKit Deployment Guide

## Environments

### Staging: staging.ai.epic.dm
- Server: testbed (66.118.37.6)
- Port: 3001
- Branch: R1

### Production: ai.epic.dm
- Server: ai (134.199.197.42)
- Port: 3000
- Branch: R1

## Deployment Process

### 1. Deploy to Staging
```bash
cd /opt/livekit1
git checkout R1
git pull origin R1
cd frontend
npm install --legacy-peer-deps
npx prisma generate
npm run build  # For production build test
sudo systemctl restart livekit-frontend
```

### 2. Test Staging
```bash
curl -I https://staging.ai.epic.dm
# Test login at https://staging.ai.epic.dm
```

### 3. Deploy to Production
```bash
# SSH to production
ssh root@ai.epic.dm

# Pull latest code
cd /opt/livekit1
git pull origin R1

# Install and build
cd frontend
npm install --legacy-peer-deps
npx prisma generate
npm run build
sudo systemctl restart livekit-frontend
```

## Environment Variables

### Staging (.env.local)
```env
DATABASE_URL="postgresql://postgres:epicvoice2024@localhost:5432/epic_voice_db?schema=public"
NEXTAUTH_URL="https://staging.ai.epic.dm"
NEXTAUTH_SECRET="HHvSeBZjfhkNrY5vDL6Oq8RxEeMPRknzlo1ndn3vJk0="
NEXT_PUBLIC_API_URL="https://staging.ai.epic.dm"
AUTH_SECRET="HHvSeBZjfhkNrY5vDL6Oq8RxEeMPRknzlo1ndn3vJk0="
AUTH_TRUST_HOST="true"
TRIAL_DAYS="14"
TRIAL_NEEDS_CARD="false"
```

### Production (.env.local)
```env
DATABASE_URL="postgresql://postgres:nXrRje4emjejjeKI009p@localhost:5432/epic_voice_db?schema=public"
NEXTAUTH_URL="https://ai.epic.dm"
NEXTAUTH_SECRET="HHvSeBZjfhkNrY5vDL6Oq8RxEeMPRknzlo1ndn3vJk0="
NEXT_PUBLIC_API_URL="https://ai.epic.dm"
AUTH_SECRET="HHvSeBZjfhkNrY5vDL6Oq8RxEeMPRknzlo1ndn3vJk0="
AUTH_TRUST_HOST="true"
TRIAL_DAYS="14"
TRIAL_NEEDS_CARD="false"
```

## Admin Credentials
- Email: admin@epic.dm
- Password: EpicVoice2024!

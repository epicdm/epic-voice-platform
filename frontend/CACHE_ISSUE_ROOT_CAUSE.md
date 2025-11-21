# Root Cause Analysis: Frontend Changes Not Appearing

**Date**: 2025-11-19
**Issue**: Frontend changes don't appear in browser even after hard refresh
**Status**: ✅ SOLVED

---

## What I Did Wrong

### The Missing Step

I was following this process:
1. ✅ Edit React/TypeScript files
2. ✅ Run `npm run build`
3. ✅ Run `sudo systemctl restart livekit-frontend.service`
4. ❌ **FORGOT TO RESTART APACHE**

**This was the critical missing step.**

---

## Why This Caused Problems

### Architecture Overview

```
User Browser (ai.epic.dm)
    ↓
Apache Reverse Proxy (Port 443)
    ↓
Next.js Server (Port 3000)
    ↓
React Application
```

### The Problem Chain

1. **Apache is configured with aggressive caching** (`/etc/apache2/sites-enabled/ai.epic.dm-le-ssl.conf`):
   ```apache
   <LocationMatch "\.(js|css|woff|woff2|ttf|svg|png|jpg|jpeg|gif|ico|webp)$">
       Header always set Cache-Control "public, max-age=31536000, immutable"
   </LocationMatch>
   ```

2. **This tells browsers**:
   - Cache JavaScript/CSS files for **1 YEAR**
   - Use the **`immutable`** directive (don't even check for updates)
   - Next.js hash-based filenames should make this safe

3. **But when Apache isn't restarted**:
   - Apache may have cached connections to the old Next.js process
   - Apache may have internal routing state pointing to old chunks
   - Headers may not be refreshed properly
   - Proxy state may be stale

4. **Result**:
   - Browser requests `page-abc123.js` (new chunk)
   - Apache has stale state, serves confused/cached response
   - Browser thinks it has the latest, but doesn't
   - Hard refresh doesn't help because Apache is the bottleneck

### Why Playwright Showed Changes But Browser Didn't

- **Playwright** accessed `localhost:3000` directly (bypassed Apache)
- **User browser** accessed `ai.epic.dm` through Apache proxy
- This created a false positive in my testing

---

## The Correct Process Going Forward

### For ALL Frontend Changes:

**Use the deployment script:**

```bash
/opt/livekit1/frontend/deploy.sh
```

This script does:
1. Build Next.js
2. Restart Next.js service
3. **Restart Apache** ← The critical step!
4. Verify both services are running
5. Show deployment timestamp

### Manual Process (If Script Unavailable):

```bash
# 1. Build
cd /opt/livekit1/frontend
npm run build

# 2. Restart Next.js
sudo systemctl restart livekit-frontend.service

# 3. RESTART APACHE (CRITICAL!)
sudo systemctl restart apache2

# 4. Verify
systemctl status livekit-frontend.service
systemctl status apache2
```

---

## What This Teaches Us

### Key Lessons

1. **Always consider the full stack**
   - Don't just restart the app server
   - Restart all layers: reverse proxy, app server, etc.

2. **Test from the same path as users**
   - Playwright testing `localhost:3000` was misleading
   - Should test via `https://ai.epic.dm` to match user experience

3. **Understand caching at every layer**
   - Browser cache (controlled by headers)
   - Reverse proxy state (Apache connections/routing)
   - Application server (Next.js process)

4. **Use deployment scripts**
   - Automate the correct process
   - Never rely on memory
   - One command, guaranteed correct sequence

### Why This Kept Happening

I was following "best practices" for Next.js deployment (build → restart service) but didn't account for the **reverse proxy layer** in this specific architecture.

In a containerized environment (Docker/Kubernetes), this wouldn't happen because the entire container is replaced, including all networking layers.

But in a **traditional server deployment with Apache reverse proxy**, you MUST restart the proxy when deploying new application code.

---

## Checklist for Future Deployments

Before declaring "deployment complete":

- [ ] Build completed successfully
- [ ] Next.js service restarted
- [ ] **Apache restarted** ← Don't skip this!
- [ ] Both services show "active (running)"
- [ ] Test via actual domain (ai.epic.dm), not localhost
- [ ] Inform user to hard refresh browser

---

## Additional Cache-Busting Measures

If issues persist even after following correct process:

### 1. Clear Next.js Cache Completely
```bash
rm -rf /opt/livekit1/frontend/.next
cd /opt/livekit1/frontend && npm run build
```

### 2. Clear Apache Cache
```bash
sudo rm -rf /var/cache/apache2/*
```

### 3. Force Browser to Clear Site Data
Users must open DevTools → Application → Clear Storage → "Clear site data"

(Hard refresh alone may not clear Service Workers or indexed storage)

---

## Testing Protocol

### For Future Changes:

1. **Make changes** to React/TypeScript files

2. **Deploy** using script:
   ```bash
   /opt/livekit1/frontend/deploy.sh
   ```

3. **Test via actual domain** (not localhost):
   ```bash
   curl -sk https://ai.epic.dm/dashboard/agents | head -100
   ```

4. **Test in browser** via ai.epic.dm:
   - Hard refresh (Ctrl+Shift+R)
   - Check DevTools → Network tab
   - Verify chunk filenames match build timestamp

5. **If changes don't appear**:
   - Check both services are running
   - Check Apache hasn't failed
   - Restart Apache again if needed
   - Clear browser site data (not just cache)

---

## Summary

**What was wrong**: I was only restarting Next.js, not Apache

**Why it matters**: Apache reverse proxy maintains state that must be cleared

**The fix**: ALWAYS restart Apache after deploying Next.js changes

**How to remember**: Use `/opt/livekit1/frontend/deploy.sh` for all deployments

**Never again**: This deployment script is now the ONLY way to deploy frontend

---

## Files Created

1. **`/opt/livekit1/frontend/deploy.sh`** - Deployment script (executable)
2. **`/opt/livekit1/frontend/DEPLOYMENT_PROCESS.md`** - Full documentation
3. **`/opt/livekit1/frontend/CACHE_ISSUE_ROOT_CAUSE.md`** - This file

---

**Lesson Learned**: In a traditional server deployment with a reverse proxy, you must restart the ENTIRE stack, not just the application server.

**Never forget**: `deploy.sh` or it didn't deploy.

---

**Created By**: Claude Code
**Date**: 2025-11-19
**Deployment completed**: 17:09:32 UTC
**Apache restarted**: ✅ YES
**Issue resolved**: ✅ YES

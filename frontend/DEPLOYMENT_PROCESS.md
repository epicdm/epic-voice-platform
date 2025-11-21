# Frontend Deployment Process - CRITICAL

## Problem Identified

When making changes to the Next.js frontend, the changes don't appear in users' browsers even after hard refresh due to aggressive browser caching of JavaScript/CSS chunks.

### Root Cause

1. **Apache Configuration** (`/etc/apache2/sites-enabled/ai.epic.dm-le-ssl.conf`):
   ```apache
   <LocationMatch "\.(js|css|woff|woff2|ttf|svg|png|jpg|jpeg|gif|ico|webp)$">
       Header always set Cache-Control "public, max-age=31536000, immutable"
   </LocationMatch>
   ```

   This tells browsers to cache JS/CSS files for **1 YEAR** with the **immutable** directive.

2. **The "immutable" directive** tells browsers:
   - Don't even check if the file has changed
   - Don't refetch even on hard refresh (in some browsers)
   - Trust that this file will NEVER change

3. **How Next.js handles this**:
   - Next.js builds new chunks with new hash-based filenames (e.g., `page-abc123.js`)
   - The HTML page references these new filenames
   - Browser should fetch the new files based on new filenames

4. **Why it still fails sometimes**:
   - If Apache has cached connections or internal state
   - If HTML page hasn't fully refreshed in browser
   - If service restart didn't fully complete
   - If browser has stale Service Worker cache

## CORRECT Deployment Process

**ALWAYS follow these steps in this EXACT order:**

### Step 1: Build the Frontend
```bash
cd /opt/livekit1/frontend
npm run build
```

**Wait for**: "Compiled successfully" message

### Step 2: Restart Next.js Service
```bash
sudo systemctl restart livekit-frontend.service
```

### Step 3: CRITICAL - Restart Apache
```bash
sudo systemctl restart apache2
```

**This is the missing step!** Without restarting Apache, it may serve stale content.

### Step 4: Verify Services Running
```bash
systemctl status livekit-frontend.service
systemctl status apache2
```

### Step 5: Clear Server-Side Caches (If Issues Persist)
```bash
# Clear any potential Apache cache
sudo rm -rf /var/cache/apache2/*

# Clear Next.js cache (only if needed)
cd /opt/livekit1/frontend
rm -rf .next
npm run build
sudo systemctl restart livekit-frontend.service
sudo systemctl restart apache2
```

### Step 6: Test with Curl (Server-Side)
```bash
# Check that localhost:3000 serves updated content
curl -s http://localhost:3000/dashboard/agents | grep -o 'dashboard/agents/page-[^"]*\.js' | head -1
```

This shows you the chunk hash that Next.js is serving.

### Step 7: User Browser Cache Clear
Users MUST do **BOTH**:
1. **Hard Refresh**: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. **Clear Site Data**:
   - Open DevTools (F12)
   - Right-click Refresh button → "Empty Cache and Hard Reload"
   - Or: DevTools → Application → Clear Storage → "Clear site data"

## Deployment Script

Use this script for ALL future deployments:

```bash
#!/bin/bash
# File: /opt/livekit1/frontend/deploy.sh

set -e  # Exit on error

echo "=========================================="
echo "Frontend Deployment Script"
echo "=========================================="

# Step 1: Build
echo ""
echo "Step 1: Building Next.js..."
cd /opt/livekit1/frontend
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Aborting deployment."
    exit 1
fi

echo "✅ Build successful"

# Step 2: Restart Next.js
echo ""
echo "Step 2: Restarting Next.js service..."
sudo systemctl restart livekit-frontend.service
sleep 3  # Give it time to start

if ! systemctl is-active --quiet livekit-frontend.service; then
    echo "❌ Next.js service failed to start! Check logs:"
    sudo journalctl -u livekit-frontend.service -n 50 --no-pager
    exit 1
fi

echo "✅ Next.js service restarted"

# Step 3: Restart Apache (CRITICAL!)
echo ""
echo "Step 3: Restarting Apache..."
sudo systemctl restart apache2
sleep 2

if ! systemctl is-active --quiet apache2; then
    echo "❌ Apache failed to start! Check logs:"
    sudo journalctl -u apache2 -n 50 --no-pager
    exit 1
fi

echo "✅ Apache restarted"

# Step 4: Verify
echo ""
echo "Step 4: Verifying deployment..."
echo "Next.js service:"
systemctl status livekit-frontend.service --no-pager | head -5

echo ""
echo "Apache service:"
systemctl status apache2 --no-pager | head -5

echo ""
echo "Current page chunk:"
curl -s http://localhost:3000/dashboard/agents | grep -o 'dashboard/agents/page-[^"]*\.js' | head -1

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "⚠️  IMPORTANT: Users must do a HARD REFRESH:"
echo "   - Windows/Linux: Ctrl + Shift + R"
echo "   - Mac: Cmd + Shift + R"
echo "   - Or: DevTools → Application → Clear Storage"
echo ""
```

## Make Script Executable

```bash
chmod +x /opt/livekit1/frontend/deploy.sh
```

## Usage

For ALL future frontend changes:

```bash
/opt/livekit1/frontend/deploy.sh
```

That's it. ONE command. ALWAYS restart Apache.

## Why Both Services Need Restart

1. **Next.js service** - Serves the application
2. **Apache** - Reverse proxy that:
   - May have cached connections
   - May have internal routing state
   - Must clear any lingering references to old content

## Alternative: Reduce Cache Duration

If problems persist, consider reducing the cache duration in Apache config:

```apache
# Instead of 1 year (31536000):
<LocationMatch "\.(js|css)$">
    Header always set Cache-Control "public, max-age=3600, must-revalidate"
</LocationMatch>
```

This would cache for 1 hour instead of 1 year, but still check for updates.

## Debugging Cache Issues

If changes still don't appear:

```bash
# 1. Check build timestamp
ls -lh /opt/livekit1/frontend/.next/static/chunks/ | grep "dashboard.*page"

# 2. Check what Next.js is serving
curl -s http://localhost:3000/dashboard/agents | head -100

# 3. Check Apache logs
sudo tail -f /var/log/apache2/ai.epic.dm_access.log

# 4. Check Apache is proxying correctly
sudo apache2ctl -S | grep ai.epic.dm

# 5. Nuclear option - full cache clear
rm -rf /opt/livekit1/frontend/.next
cd /opt/livekit1/frontend && npm run build
sudo systemctl restart livekit-frontend.service
sudo systemctl restart apache2
sudo rm -rf /var/cache/apache2/*
```

## Summary

**The ONE critical step that was missing: Restart Apache after restarting Next.js!**

This ensures:
- Apache proxy clears any cached connections
- New routing state is loaded
- Headers are freshly sent
- No stale references to old chunks

---

**Created**: 2025-11-19
**Issue**: Changes not appearing even after hard refresh
**Solution**: ALWAYS restart Apache after building + restarting Next.js

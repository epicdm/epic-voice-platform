#!/bin/bash
# Frontend Deployment Script
# ALWAYS use this script for deploying frontend changes

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
curl -s http://localhost:3000/dashboard/agents | grep -o 'dashboard/agents/page-[^"]*\.js' | head -1 || echo "(Could not detect chunk - may require auth)"

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "⚠️  IMPORTANT: Users must do a HARD REFRESH:"
echo "   - Windows/Linux: Ctrl + Shift + R"
echo "   - Mac: Cmd + Shift + R"
echo "   - Or: DevTools → Application → Clear Storage → Clear site data"
echo ""
echo "Build timestamp: $(date)"
echo "Deployment completed at: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo ""

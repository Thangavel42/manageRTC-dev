#!/bin/bash
# Server Setup Script for manage-rtc-api-dev
# Run this on your VPS server

echo "=== Manage RTC Backend Setup ==="
echo ""

# Step 1: Check if backend directory exists
echo "Step 1: Checking backend directory..."
if [ -d "/var/www/apidev.manage-rtc.com/backend" ]; then
    echo "✅ Backend directory exists"
else
    echo "❌ Backend directory not found!"
    echo "Creating directory..."
    sudo mkdir -p /var/www/apidev.manage-rtc.com/backend
    sudo chown -R ${USER}:${USER} /var/www/apidev.manage-rtc.com
fi
echo ""

# Step 2: Go to backend directory
echo "Step 2: Navigating to backend directory..."
cd /var/www/apidev.manage-rtc.com/backend
echo "Current directory: $(pwd)"
echo ""

# Step 3: Check if server.js exists
echo "Step 3: Checking if server.js exists..."
if [ -f "server.js" ]; then
    echo "✅ server.js found"
else
    echo "❌ server.js not found! Backend deployment may have failed."
    echo "Please check GitHub Actions: https://github.com/frontenddeveloperpraveen/hrms-tool-amasqis/actions"
    exit 1
fi
echo ""

# Step 4: Install dependencies
echo "Step 4: Installing dependencies..."
npm ci --omit=dev
echo ""

# Step 5: Check PM2 status
echo "Step 5: Checking PM2 processes..."
pm2 list
echo ""

# Step 6: Stop old process if exists
echo "Step 6: Stopping old PM2 process (if exists)..."
pm2 delete manage-rtc-api-dev 2>/dev/null || echo "No existing process to stop"
echo ""

# Step 7: Start new process
echo "Step 7: Starting backend with PM2..."
pm2 start server.js --name manage-rtc-api-dev
pm2 save
echo ""

# Step 8: Show logs
echo "Step 8: Checking logs..."
pm2 logs manage-rtc-api-dev --lines 20 --nostream
echo ""

echo "=== Setup Complete! ==="
echo ""
echo "Next steps:"
echo "1. Fix nginx CORS configuration"
echo "2. Test the live site at https://dev.manage-rtc.com"

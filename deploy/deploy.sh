#!/bin/bash
# ============================================
# Deployment Script - Run from LOCAL machine
# ============================================
# Usage: bash deploy/deploy.sh YOUR_VPS_IP
# Example: bash deploy/deploy.sh 76.13.11.228
# ============================================

set -e

VPS_IP=${1:-"76.13.11.228"}
VPS_USER="root"
SSH_TARGET="$VPS_USER@$VPS_IP"

echo "=========================================="
echo "  Deploying to $VPS_IP"
echo "=========================================="

# ---- 1. Build Main POS Frontend ----
echo ""
echo ">>> [1/5] Building POS Dashboard..."
VITE_API_URL=https://api.lamarpos.cloud/api npm run build
echo "POS Dashboard built successfully."

# ---- 2. Build Client Order Frontend ----
echo ""
echo ">>> [2/5] Building Client Order Site..."
cd client-order
VITE_API_URL=https://api.lamarpos.cloud npm run build
cd ..
echo "Client Order Site built successfully."

# ---- 3. Upload Backend ----
echo ""
echo ">>> [3/5] Uploading backend..."
rsync -avz --exclude='node_modules' --exclude='.env' \
  restaurant-pos-backend/ $SSH_TARGET:/var/www/api/

# Upload .env.production as .env on server (first time only if doesn't exist)
ssh $SSH_TARGET "test -f /var/www/api/.env || echo 'No .env found, uploading template...'"
scp restaurant-pos-backend/.env.production $SSH_TARGET:/var/www/api/.env.template
echo "Backend uploaded."

# ---- 4. Upload Frontends ----
echo ""
echo ">>> [4/5] Uploading frontends..."
rsync -avz --delete dist/ $SSH_TARGET:/var/www/sahla/
rsync -avz --delete client-order/dist/ $SSH_TARGET:/var/www/order/
echo "Frontends uploaded."

# ---- 5. Setup Server ----
echo ""
echo ">>> [5/5] Setting up server..."
ssh $SSH_TARGET << 'REMOTE_SCRIPT'
  set -e

  # Install backend dependencies
  cd /var/www/api
  npm install --production

  # Copy .env template if no .env exists
  if [ ! -f .env ]; then
    cp .env.template .env
    echo "⚠️  Created .env from template - EDIT /var/www/api/.env with real passwords!"
  fi

  # Setup Nginx config
  cp /var/www/api/../nginx-lamarpos.conf /etc/nginx/sites-available/lamarpos 2>/dev/null || true

  # Enable site (remove default if exists)
  rm -f /etc/nginx/sites-enabled/default
  ln -sf /etc/nginx/sites-available/lamarpos /etc/nginx/sites-enabled/lamarpos

  # Test and reload Nginx
  nginx -t && systemctl reload nginx

  # Start/Restart backend with PM2
  pm2 delete yarb-api 2>/dev/null || true
  cd /var/www/api
  pm2 start server.js --name yarb-api
  pm2 save
  pm2 startup systemd -u root --hp /root 2>/dev/null || true

  echo ""
  echo "✅ Deployment complete!"
  echo "   API:   http://api.lamarpos.cloud"
  echo "   POS:   http://sahla.lamarpos.cloud"
  echo "   Order: http://order.lamarpos.cloud"
REMOTE_SCRIPT

echo ""
echo "=========================================="
echo "  Deployment Finished!"
echo "=========================================="

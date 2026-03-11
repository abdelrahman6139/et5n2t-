#!/bin/bash
# ============================================
# VPS Initial Setup Script - Run ONCE on fresh VPS
# ============================================
# Usage: ssh root@YOUR_VPS_IP
#        bash setup-vps.sh
# ============================================

set -e

echo "=========================================="
echo "  lamarpos.cloud - VPS Setup Script"
echo "=========================================="

# 1. Update system
echo ""
echo ">>> [1/7] Updating system..."
apt update && apt upgrade -y

# 2. Install Node.js 20
echo ""
echo ">>> [2/7] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# 3. Install PostgreSQL
echo ""
echo ">>> [3/7] Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# 4. Install Nginx
echo ""
echo ">>> [4/7] Installing Nginx..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx

# 5. Install PM2
echo ""
echo ">>> [5/7] Installing PM2..."
npm install -g pm2

# 6. Install Git
echo ""
echo ">>> [6/7] Installing Git..."
apt install -y git

# 7. Create directories
echo ""
echo ">>> [7/7] Creating directories..."
mkdir -p /var/www/sahla
mkdir -p /var/www/order
mkdir -p /var/www/api

# 8. Setup firewall
echo ""
echo ">>> Setting up firewall..."
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # HTTP
ufw allow 443/tcp    # HTTPS
ufw --force enable

echo ""
echo "=========================================="
echo "  VPS Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Setup PostgreSQL database:"
echo "     sudo -u postgres psql"
echo "     CREATE USER yarb_user WITH PASSWORD 'YOUR_STRONG_PASSWORD';"
echo "     CREATE DATABASE yarb2 OWNER yarb_user;"
echo "     GRANT ALL PRIVILEGES ON DATABASE yarb2 TO yarb_user;"
echo "     \\q"
echo ""
echo "  2. Import schema:"
echo "     sudo -u postgres psql -d yarb2 -f /var/www/api/schema.sql"
echo ""
echo "  3. Run deploy.sh from your local machine"
echo "=========================================="

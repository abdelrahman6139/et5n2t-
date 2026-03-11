# ============================================
# Windows PowerShell Deployment Script
# ============================================
# Usage: .\deploy\deploy.ps1 -VpsIp "76.13.11.228"
# Requires: ssh and scp (built into Windows 10+)
# ============================================

param(
    [string]$VpsIp = "76.13.11.228",
    [string]$VpsUser = "root"
)

$ErrorActionPreference = "Stop"
$SshTarget = "$VpsUser@$VpsIp"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Deploying to $VpsIp" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# ---- 1. Build POS Dashboard ----
Write-Host "`n>>> [1/5] Building POS Dashboard..." -ForegroundColor Yellow
Push-Location $ProjectRoot
$env:VITE_API_URL = "https://api.lamarpos.cloud/api"
$env:VITE_PRINT_SERVICE_URL = "http://127.0.0.1:5078"
$env:VITE_PRINT_ALLOW_BROWSER_FALLBACK = "false"
npm run build
if ($LASTEXITCODE -ne 0) { throw "POS build failed" }
Write-Host "POS Dashboard built." -ForegroundColor Green

# ---- 2. Build Client Order Site ----
Write-Host "`n>>> [2/5] Building Client Order Site..." -ForegroundColor Yellow
Push-Location "$ProjectRoot\client-order"
$env:VITE_API_URL = "https://api.lamarpos.cloud"
npm run build
if ($LASTEXITCODE -ne 0) { throw "Client order build failed" }
Pop-Location
Write-Host "Client Order built." -ForegroundColor Green

# ---- 3. Upload Backend ----
Write-Host "`n>>> [3/5] Uploading backend to VPS..." -ForegroundColor Yellow
# Create tar of backend (excluding node_modules and .env)
$backendDir = "$ProjectRoot\restaurant-pos-backend"
$tarFile = "$ProjectRoot\deploy\backend.tar.gz"

# Use ssh to create directory
ssh $SshTarget "mkdir -p /var/www/api"

# Upload files using scp (exclude node_modules manually by listing what to send)
$filesToUpload = Get-ChildItem $backendDir -Exclude "node_modules",".env" | ForEach-Object { $_.FullName }
foreach ($file in $filesToUpload) {
    $relativePath = $file.Replace($backendDir, "").TrimStart("\")
    if (Test-Path $file -PathType Container) {
        ssh $SshTarget "mkdir -p /var/www/api/$($relativePath -replace '\\','/')"
        scp -r "$file\*" "${SshTarget}:/var/www/api/$($relativePath -replace '\\','/')" 2>$null
    } else {
        scp "$file" "${SshTarget}:/var/www/api/$($relativePath -replace '\\','/')"
    }
}

# Upload .env template
scp "$backendDir\.env.production" "${SshTarget}:/var/www/api/.env.template"
Write-Host "Backend uploaded." -ForegroundColor Green

# ---- 4. Upload Frontends ----
Write-Host "`n>>> [4/5] Uploading frontends..." -ForegroundColor Yellow
ssh $SshTarget "mkdir -p /var/www/sahla /var/www/order"

# Upload POS dashboard
scp -r "$ProjectRoot\dist\*" "${SshTarget}:/var/www/sahla/"

# Upload Client Order
scp -r "$ProjectRoot\client-order\dist\*" "${SshTarget}:/var/www/order/"
Write-Host "Frontends uploaded." -ForegroundColor Green

# ---- 5. Upload Nginx config ----
Write-Host "`n>>> [5/5] Uploading Nginx config and restarting services..." -ForegroundColor Yellow
scp "$ProjectRoot\deploy\nginx-lamarpos.conf" "${SshTarget}:/etc/nginx/sites-available/lamarpos"

# Run remote commands
$remoteScript = @'
set -e
cd /var/www/api
npm install --production

# Create .env from template if missing
if [ ! -f .env ]; then
    cp .env.template .env
    echo "WARNING: Created .env from template - EDIT /var/www/api/.env with real passwords!"
fi

# Fix frontend permissions (scp uploads as root 700 which blocks nginx/www-data)
chown -R www-data:www-data /var/www/sahla /var/www/order 2>/dev/null || true
chmod -R 755 /var/www/sahla /var/www/order 2>/dev/null || true

# Enable Nginx site
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/lamarpos /etc/nginx/sites-enabled/lamarpos
nginx -t && systemctl reload nginx

# Start/restart with PM2
pm2 delete yarb-api 2>/dev/null || true
pm2 start server.js --name yarb-api
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo ""
echo "Deployment complete!"
echo "  API:   http://api.lamarpos.cloud"
echo "  POS:   http://sahla.lamarpos.cloud"
echo "  Order: http://order.lamarpos.cloud"
'@

ssh $SshTarget $remoteScript
Pop-Location

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "  Deployment Finished!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT: SSH into VPS and edit /var/www/api/.env" -ForegroundColor Red
Write-Host "  - Change JWT_SECRET to a strong random string" -ForegroundColor Red
Write-Host "  - Change PGPASSWORD to match your DB password" -ForegroundColor Red

# 🚀 Backend Deployment Instructions for Hostinger

## Files That Need to be Updated

The following files have been modified and need to be uploaded to Hostinger:

### Modified Files:
1. `restaurant-pos-backend/routes/authRoutes.js` - Enhanced driver login with logging
2. `restaurant-pos-backend/routes/driverRoutes.js` - Fixed password handling
3. `restaurant-pos-backend/routes/driverLocationRoutes.js` - Enhanced with driver details
4. `restaurant-pos-backend/server.js` - CORS configuration (if modified)

---

## Method 1: Hostinger File Manager (Recommended for Beginners)

### Step 1: Access Hostinger
1. Go to https://hpanel.hostinger.com
2. Login with your credentials
3. Select your website (sahla.lamarpos.cloud)

### Step 2: Open File Manager
1. Click on "File Manager" in the dashboard
2. Navigate to your backend directory (usually `public_html` or `domains/sahla.lamarpos.cloud`)

### Step 3: Upload Files
1. Navigate to the `routes` folder
2. Upload the following files (replace existing):
   - `authRoutes.js`
   - `driverRoutes.js`
   - `driverLocationRoutes.js`
3. Go back to root directory and upload `server.js` (if modified)

### Step 4: Restart Backend Server
1. In Hostinger panel, find "SSH Access" or "Terminal"
2. Run these commands:

```bash
# Check if server is running
pm2 list

# Restart the server
pm2 restart all

# Or restart specific app
pm2 restart restaurant-pos-backend

# View logs to check for errors
pm2 logs
```

---

## Method 2: Using FTP (FileZilla)

### Step 1: Get FTP Credentials
1. In Hostinger panel, go to "FTP Accounts"
2. Note down:
   - **Host**: ftp.sahla.lamarpos.cloud (or from Hostinger)
   - **Username**: Your FTP username
   - **Password**: Your FTP password
   - **Port**: 21

### Step 2: Connect with FileZilla
1. Download FileZilla: https://filezilla-project.org/
2. Open FileZilla
3. Enter FTP credentials and click "Quickconnect"

### Step 3: Upload Files
1. On the left side: Navigate to your local folder:
   `C:\Users\shawk\Downloads\rest_full-main\rest_full-main\restaurant-pos-backend`
2. On the right side: Navigate to your server backend folder
3. Drag and drop the modified files:
   - routes/authRoutes.js
   - routes/driverRoutes.js
   - routes/driverLocationRoutes.js
   - server.js

### Step 4: Restart Server (via SSH)
```bash
pm2 restart all
pm2 logs
```

---

## Method 3: Using SSH/Terminal (Advanced)

### Step 1: Connect to Server
```bash
ssh username@sahla.lamarpos.cloud
# Enter your password when prompted
```

### Step 2: Navigate to Backend Directory
```bash
cd /path/to/restaurant-pos-backend
```

### Step 3: Upload Files Using SCP (from your local machine)
```bash
# From your Windows PowerShell:
scp C:\Users\shawk\Downloads\rest_full-main\rest_full-main\restaurant-pos-backend\routes\authRoutes.js username@sahla.lamarpos.cloud:/path/to/backend/routes/

scp C:\Users\shawk\Downloads\rest_full-main\rest_full-main\restaurant-pos-backend\routes\driverRoutes.js username@sahla.lamarpos.cloud:/path/to/backend/routes/

scp C:\Users\shawk\Downloads\rest_full-main\rest_full-main\restaurant-pos-backend\routes\driverLocationRoutes.js username@sahla.lamarpos.cloud:/path/to/backend/routes/
```

### Step 4: Restart Server
```bash
pm2 restart all
pm2 logs
```

---

## Important: Update CORS Configuration

If you haven't already, update `server.js` to allow your local IP:

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://192.168.1.3:3000',
    'https://sahla.lamarpos.cloud'
  ],
  credentials: true
}));
```

---

## After Deployment Checklist

### ✅ Verify Backend is Running
```bash
pm2 list
# Should show your app as "online"
```

### ✅ Check Logs for Errors
```bash
pm2 logs
# Look for startup messages and any errors
```

### ✅ Test API Endpoints
```bash
# Test driver check endpoint
curl http://sahla.lamarpos.cloud/api/auth/driver/check/0500000000

# Should return driver data if exists
```

### ✅ Test Driver Login from Mobile App
1. Open your mobile delivery app
2. Try logging in with:
   - Phone: 0500000000
   - Password: 123456
3. Check server logs for detailed login attempt messages

---

## Troubleshooting

### Server Not Starting?
```bash
# Check for syntax errors
node server.js
# Or
npm start
```

### Still Getting Errors?
```bash
# View full logs
pm2 logs --lines 100

# Restart with fresh logs
pm2 restart all
pm2 flush  # Clear old logs
pm2 logs
```

### Need to Check Database Connection?
```bash
# Test database connection
node -e "const pool = require('./db'); pool.query('SELECT NOW()', (err, res) => { console.log(err, res); process.exit(); });"
```

---

## Notes

- **Backup**: Always backup existing files before uploading
- **Environment Variables**: Make sure `.env` file on server has correct database credentials
- **File Permissions**: Ensure uploaded files have correct permissions (644 for files, 755 for directories)
- **Node Modules**: You don't need to upload `node_modules` folder - it's already on the server

---

## Quick Command Reference

```bash
# List running apps
pm2 list

# Restart all
pm2 restart all

# Restart specific app
pm2 restart 0  # or app name

# View logs
pm2 logs

# Stop app
pm2 stop all

# Start app
pm2 start server.js --name "restaurant-pos-backend"

# Monitor resources
pm2 monit
```

---

## Support

If you encounter issues:
1. Check pm2 logs: `pm2 logs`
2. Check server error logs: Usually in `/var/log/` or check Hostinger panel
3. Test API manually: Use curl or Postman to test endpoints
4. Verify database connection: Check if PostgreSQL is accessible

**Your backend should now be updated with the latest changes! 🎉**

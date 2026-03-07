// Test script to verify driver password and location tracking
// Run with: node test-driver.js

import bcrypt from 'bcryptjs';

// Test password hashing
async function testPassword() {
  const plainPassword = '123456';
  
  // Hash the password
  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  console.log('🔐 Original password:', plainPassword);
  console.log('🔐 Hashed password:', hashedPassword);
  
  // Verify the password
  const isValid = await bcrypt.compare(plainPassword, hashedPassword);
  console.log('✅ Password verification:', isValid);
  
  // Test with a different password
  const wrongPassword = 'wrong123';
  const isWrong = await bcrypt.compare(wrongPassword, hashedPassword);
  console.log('❌ Wrong password verification:', isWrong);
}

testPassword();

console.log(`
======================================
🔧 BACKEND FIX SUMMARY
======================================

1. ✅ Fixed bcrypt library mismatch
   - Changed driverRoutes.js to use bcryptjs
   - Now matches authRoutes.js

2. ✅ Added debug endpoints
   - GET /api/tracking/debug - Shows all drivers in memory
   - Use this to check if driver locations are being received

3. ✅ Fixed status comparison
   - Now handles both 'available' and 'متاح' status values

4. ✅ Added better logging
   - Location updates now logged with timestamps
   - Active driver queries now logged

======================================
📤 FILES TO UPLOAD TO HOSTINGER
======================================

1. routes/driverRoutes.js
2. routes/driverLocationRoutes.js
3. routes/authRoutes.js (if not already updated)

======================================
🧪 TESTING ENDPOINTS
======================================

After uploading, test these endpoints:

1. Check driver exists:
   curl http://sahla.lamarpos.cloud/api/auth/driver/check/PHONE_NUMBER

2. Check driver locations in memory:
   curl http://sahla.lamarpos.cloud/api/tracking/debug

3. Test driver login:
   curl -X POST http://sahla.lamarpos.cloud/api/auth/driver/login \\
     -H "Content-Type: application/json" \\
     -d '{"phone":"PHONE_NUMBER","password":"PASSWORD"}'

4. Send test location:
   curl -X POST http://sahla.lamarpos.cloud/api/tracking/location \\
     -H "Content-Type: application/json" \\
     -d '{"driver_id":1,"driver_lat":24.7136,"driver_lng":46.6753,"status":"متاح"}'

5. Check active drivers:
   curl http://sahla.lamarpos.cloud/api/tracking/drivers/active

======================================
`);

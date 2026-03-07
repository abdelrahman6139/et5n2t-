
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { logActivity } from '../utils/logger.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('🔐 Login attempt:', username);

    const result = await pool.query(
      'SELECT id, username, role, password FROM users WHERE username = $1',
      [username]
    );

    const user = result.rows[0];

    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({
        success: false,
        error: 'اسم المستخدم أو كلمة المرور غير صحيحة'
      });
    }

    if (!user.password) {
      console.log('❌ User has no password set');
      return res.status(500).json({
        success: false,
        error: 'كلمة المرور غير محددة'
      });
    }

    console.log('🔍 Checking password...');
    const validPassword = await bcrypt.compare(password, user.password);
    console.log('✅ Password valid?', validPassword);

    if (!validPassword) {
      console.log('❌ Invalid password');
      return res.status(401).json({
        success: false,
        error: 'اسم المستخدم أو كلمة المرور غير صحيحة'
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Log login activity
    await logActivity(user.id, 'LOGIN', 'User logged in', req, 'User', user.id.toString());

    console.log('✅ Login successful!');

    res.json({
      success: true,  // ← ADDED THIS!
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في تسجيل الدخول'
    });
  }
});
// ============================================
// DRIVER LOGIN ROUTES (Delivery Section Only)
// ============================================

// Driver Login (Phone + Password)
router.post('/driver/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    console.log('📱 [DRIVER LOGIN] Request received:', { phone, hasPassword: !!password });

    if (!phone || !password) {
      console.log('❌ [DRIVER LOGIN] Missing credentials');
      return res.status(400).json({
        success: false,
        error: 'رقم الهاتف وكلمة المرور مطلوبة'
      });
    }

    // Find driver by phone
    const result = await pool.query(
      'SELECT * FROM drivers WHERE phone = $1',
      [phone]
    );

    console.log(`🔍 [DRIVER LOGIN] Found ${result.rows.length} driver(s) with phone: ${phone}`);

    if (result.rows.length === 0) {
      console.log('❌ [DRIVER LOGIN] Driver not found');
      return res.status(401).json({
        success: false,
        error: 'رقم الهاتف أو كلمة المرور غير صحيحة'
      });
    }

    const driver = result.rows[0];

    console.log('👤 [DRIVER LOGIN] Driver found:', { id: driver.id, name: driver.name, hasPasswordHash: !!driver.password_hash });

    // Check if password is set
    if (!driver.password_hash) {
      console.log('❌ [DRIVER LOGIN] No password hash set for driver');
      return res.status(401).json({
        success: false,
        error: 'الحساب غير مفعل. يرجى التواصل مع الإدارة'
      });
    }

    // Verify password
    console.log('🔐 [DRIVER LOGIN] Comparing password...');
    const validPassword = await bcrypt.compare(password, driver.password_hash);
    console.log('🔐 [DRIVER LOGIN] Password valid:', validPassword);

    if (!validPassword) {
      console.log('❌ [DRIVER LOGIN] Invalid password');
      return res.status(401).json({
        success: false,
        error: 'رقم الهاتف أو كلمة المرور غير صحيحة'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: driver.id,
        phone: driver.phone,
        role: 'driver',
        name: driver.name
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' } // Long expiry for mobile
    );

    console.log('✅ Driver login successful:', driver.name);

    res.json({
      success: true,
      token,
      driver: {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        status: driver.status,
        vehicle_type: driver.vehicle_type,
        license_plate: driver.license_plate
      }
    });

  } catch (error) {
    console.error('❌ Driver login error:', error);
    res.status(500).json({
      success: false,
      error: 'فشل تسجيل الدخول'
    });
  }
});

// Set Driver Password (Admin use - for activating driver accounts)
router.post('/driver/set-password', async (req, res) => {
  try {
    const { driver_id, password } = req.body;

    if (!driver_id || !password) {
      return res.status(400).json({
        success: false,
        error: 'Driver ID and password required'
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل'
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Update driver password
    const result = await pool.query(
      `UPDATE drivers 
       SET password_hash = $1 
       WHERE id = $2 
       RETURNING id, name, phone`,
      [password_hash, driver_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Driver not found'
      });
    }

    console.log('✅ Password set for driver:', result.rows[0].name);

    res.json({
      success: true,
      message: 'تم تعيين كلمة المرور بنجاح',
      driver: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Set password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set password'
    });
  }
});

// Test endpoint to check if driver exists and has password
router.get('/driver/check/:phone', async (req, res) => {
  try {
    const { phone } = req.params;
    
    const result = await pool.query(
      'SELECT id, name, phone, status, password_hash IS NOT NULL as has_password FROM drivers WHERE phone = $1',
      [phone]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: false,
        message: 'Driver not found',
        phone
      });
    }

    const driver = result.rows[0];
    res.json({
      success: true,
      driver: {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        status: driver.status,
        has_password: driver.has_password
      }
    });
  } catch (error) {
    console.error('❌ Check driver error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

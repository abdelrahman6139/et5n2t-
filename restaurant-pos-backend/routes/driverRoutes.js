import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Get all drivers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM drivers ORDER BY id ASC'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch drivers' });
  }
});

// Get single driver (with ID validation)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID is a number
    if (isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid driver ID'
      });
    }

    const result = await pool.query(
      'SELECT * FROM drivers WHERE id = $1',
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get driver error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch driver' });
  }
});

// Create new driver
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, phone, vehicle_type, license_plate, status, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, phone and password are required'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO drivers (name, phone, vehicle_type, license_plate, status, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, phone, vehicle_type || null, license_plate || null, status || 'available', hashedPassword]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'تم إضافة السائق بنجاح'
    });
  } catch (error) {
    console.error('Create driver error:', error);
    res.status(500).json({ success: false, error: 'Failed to create driver' });
  }
});

// Update driver
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, vehicle_type, license_plate, status, password } = req.body;

    if (isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, error: 'Invalid driver ID' });
    }

    // If password is provided, hash it and update
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await pool.query(
        `UPDATE drivers 
         SET name = $1, phone = $2, vehicle_type = $3, 
             license_plate = $4, status = $5, password_hash = $6
         WHERE id = $7
         RETURNING *`,
        [name, phone, vehicle_type, license_plate, status, hashedPassword, parseInt(id)]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Driver not found' });
      }

      return res.json({
        success: true,
        data: result.rows[0],
        message: 'تم تحديث بيانات السائق وكلمة المرور'
      });
    }

    // Update without password
    const result = await pool.query(
      `UPDATE drivers 
       SET name = $1, phone = $2, vehicle_type = $3, 
           license_plate = $4, status = $5
       WHERE id = $6
       RETURNING *`,
      [name, phone, vehicle_type, license_plate, status, parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'تم تحديث بيانات السائق'
    });
  } catch (error) {
    console.error('Update driver error:', error);
    res.status(500).json({ success: false, error: 'Failed to update driver' });
  }
});

// Delete driver
/*router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, error: 'Invalid driver ID' });
    }
    
    // Check if driver has active orders
    const activeOrders = await pool.query(
      `SELECT COUNT(*) as count FROM orders 
       WHERE driver_id = $1 AND status NOT IN ('Delivered', 'Cancelled')`,
      [parseInt(id)]
    );
    
    if (parseInt(activeOrders.rows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'لا يمكن حذف السائق لديه طلبات نشطة' 
      });
    }
    
    const result = await pool.query(
      'DELETE FROM drivers WHERE id = $1 RETURNING *',
      [parseInt(id)]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }
    
    res.json({ 
      success: true,
      message: 'تم حذف السائق بنجاح'
    });
  } catch (error) {
    console.error('Delete driver error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete driver' });
  }
});*/
// Delete driver
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, error: 'Invalid driver ID' });
    }

    const result = await pool.query(
      'DELETE FROM drivers WHERE id = $1 RETURNING *',
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    res.json({
      success: true,
      message: 'تم حذف السائق بنجاح'
    });
  } catch (error) {
    console.error('Delete driver error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete driver' });
  }
});

// Update driver location (for mobile app)
router.put('/:id/location', async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    if (isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, error: 'Invalid driver ID' });
    }

    await pool.query(
      'UPDATE drivers SET latitude=$1, longitude=$2, last_updated=NOW() WHERE id=$3',
      [latitude, longitude, parseInt(id)]
    );

    res.json({ success: true, message: 'Driver location updated ✅' });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ success: false, error: 'Failed to update location' });
  }
});

// Get driver statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { start, end } = req.query;

    if (isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, error: 'Invalid driver ID' });
    }

    if (!start || !end) {
      return res.status(400).json({ success: false, error: 'Start and end dates are required' });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    console.log(`📊 Fetching stats for driver ${id} from ${start} to ${end}`);

    // Get statistics for the driver (with financial breakdown)
    const statsQuery = await pool.query(
      `SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE WHEN status = 'Completed' THEN (subtotal + tax + delivery_fee + COALESCE(service_charge, 0)) ELSE 0 END), 0) as total_earnings,
        COALESCE(SUM(CASE WHEN status = 'Completed' THEN (subtotal + tax + delivery_fee + COALESCE(service_charge, 0)) ELSE 0 END) / NULLIF(COUNT(CASE WHEN status = 'Completed' THEN 1 END), 0), 0) as avg_order_value,
        COALESCE(COUNT(CASE WHEN status = 'Completed' THEN 1 END), 0) as completed_orders,
        COALESCE(COUNT(CASE WHEN status = 'Cancelled' THEN 1 END), 0) as cancelled_orders,
        COALESCE(SUM(CASE WHEN status = 'Completed' THEN delivery_fee ELSE 0 END), 0) as total_delivery_fees,
        COALESCE(SUM(CASE WHEN status = 'Completed' THEN (subtotal + tax + COALESCE(service_charge, 0)) ELSE 0 END), 0) as restaurant_money,
        COALESCE(SUM(CASE WHEN status = 'Completed' THEN subtotal ELSE 0 END), 0) as total_subtotal,
        COALESCE(SUM(CASE WHEN status = 'Completed' THEN tax ELSE 0 END), 0) as total_tax,
        COALESCE(SUM(CASE WHEN status = 'Completed' THEN COALESCE(service_charge, 0) ELSE 0 END), 0) as total_service_charge
       FROM orders 
       WHERE driver_id = $1 
       AND created_at >= $2 
       AND created_at <= $3`,
      [parseInt(id), startDate, endDate]
    );

    // Get orders list with full financial details
    const ordersQuery = await pool.query(
      `SELECT 
        o.id,
        o.user_facing_id,
        COALESCE(c.first_name || ' ' || c.last_name, o.customer_phone, 'Unknown') as customer_name,
        o.customer_phone,
        o.status,
        o.subtotal,
        o.tax,
        o.delivery_fee,
        COALESCE(o.service_charge, 0) as service_charge,
        (o.subtotal + o.tax + o.delivery_fee + COALESCE(o.service_charge, 0)) as total,
        o.created_at,
        o.customer_address
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.driver_id = $1 
       AND o.created_at >= $2 
       AND o.created_at <= $3
       ORDER BY o.created_at DESC`,
      [parseInt(id), startDate, endDate]
    );

    // Get order items for all orders in the range
    const orderIds = ordersQuery.rows.map(o => o.id);
    let itemsMap = {};
    if (orderIds.length > 0) {
      const itemsQuery = await pool.query(
        `SELECT oi.order_id, oi.id, oi.quantity, oi.price,
                oi.total,
                COALESCE(oi.name_snapshot, 'Unknown') as item_name,
                oi.notes
         FROM order_items oi
         WHERE oi.order_id = ANY($1)
         ORDER BY oi.id ASC`,
        [orderIds]
      );
      for (const item of itemsQuery.rows) {
        if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
        itemsMap[item.order_id].push({
          id: item.id,
          item_name: item.item_name,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          notes: item.notes
        });
      }
    }

    const stats = statsQuery.rows[0];

    res.json({
      success: true,
      data: {
        totalEarnings: parseFloat(stats.total_earnings).toFixed(2),
        totalOrders: parseInt(stats.total_orders),
        completedOrders: parseInt(stats.completed_orders),
        cancelledOrders: parseInt(stats.cancelled_orders),
        avgOrderValue: parseFloat(stats.avg_order_value).toFixed(2),
        totalDeliveryFees: parseFloat(stats.total_delivery_fees).toFixed(2),
        restaurantMoney: parseFloat(stats.restaurant_money).toFixed(2),
        totalSubtotal: parseFloat(stats.total_subtotal).toFixed(2),
        totalTax: parseFloat(stats.total_tax).toFixed(2),
        totalServiceCharge: parseFloat(stats.total_service_charge).toFixed(2),
        orders: ordersQuery.rows.map(order => ({
          id: order.id,
          order_no: order.user_facing_id,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          status: order.status,
          subtotal: order.subtotal,
          tax: order.tax,
          delivery_fee: order.delivery_fee,
          service_charge: order.service_charge,
          total: order.total,
          created_at: order.created_at,
          customer_address: order.customer_address,
          items: itemsMap[order.id] || []
        }))
      }
    });

  } catch (error) {
    console.error('Get driver stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch driver statistics', details: error.message });
  }
});

export default router;

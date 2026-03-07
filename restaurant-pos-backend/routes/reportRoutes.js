import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ── Helper: resolve time range from either calendar dates OR a business day id ──
async function resolveRange(query) {
  const { startDate, endDate, businessDayId } = query;

  if (businessDayId) {
    const r = await pool.query('SELECT opened_at, closed_at FROM business_days WHERE id = $1', [businessDayId]);
    if (r.rows.length === 0) throw new Error('اليوم غير موجود');
    const day = r.rows[0];
    return {
      start: new Date(day.opened_at),
      end: day.closed_at ? new Date(day.closed_at) : new Date(),
      label: `يوم #${businessDayId}`
    };
  }

  const start = startDate ? new Date(startDate) : new Date();
  start.setHours(0, 0, 0, 0);
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end, label: null };
}

// Get sales summary report
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { start, end } = await resolveRange(req.query);

    // Get summary statistics
    const summaryQuery = await pool.query(
      `SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_sales,
        COALESCE(SUM(subtotal), 0) as subtotal,
        COALESCE(SUM(tax), 0) as total_tax,
        COALESCE(SUM(service_charge), 0) as total_service,
        COALESCE(SUM(delivery_fee), 0) as total_delivery,
        COALESCE(SUM(discount), 0) as total_discount,
        COALESCE(AVG(total), 0) as avg_order_value
       FROM orders 
       WHERE created_at >= $1 AND created_at <= $2 
       AND status != 'Cancelled'`,
      [start, end]
    );

    // Get sales by center
    const byCenterQuery = await pool.query(
      `SELECT 
        sales_center,
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as total
       FROM orders 
       WHERE created_at >= $1 AND created_at <= $2 
       AND status != 'Cancelled'
       GROUP BY sales_center`,
      [start, end]
    );

    // Get sales by payment method
    const byPaymentQuery = await pool.query(
      `SELECT 
        payment_method,
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as total
       FROM orders 
       WHERE created_at >= $1 AND created_at <= $2 
       AND status != 'Cancelled'
       AND payment_method IS NOT NULL
       GROUP BY payment_method`,
      [start, end]
    );

    res.json({
      success: true,
      data: {
        summary: summaryQuery.rows[0],
        byCenter: byCenterQuery.rows,
        byPayment: byPaymentQuery.rows
      }
    });

  } catch (error) {
    console.error('Get summary report error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch summary report' });
  }
});

// Get items sales report
router.get('/items', authenticateToken, async (req, res) => {
  try {
    const { start, end } = await resolveRange(req.query);

    const result = await pool.query(
      `SELECT 
        oi.name_snapshot as item_name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total) as total_sales,
        COUNT(DISTINCT oi.order_id) as order_count,
        AVG(oi.price) as avg_price
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.created_at >= $1 AND o.created_at <= $2
       AND o.status != 'Cancelled'
       GROUP BY oi.name_snapshot
       ORDER BY total_sales DESC`,
      [start, end]
    );

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Get items report error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch items report' });
  }
});

// Get hourly sales report
router.get('/hourly', authenticateToken, async (req, res) => {
  try {
    const { start, end } = await resolveRange(req.query);

    const result = await pool.query(
      `SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as order_count,
        COALESCE(SUM(total), 0) as total_sales
       FROM orders 
       WHERE created_at >= $1 AND created_at <= $2
       AND status != 'Cancelled'
       GROUP BY EXTRACT(HOUR FROM created_at)
       ORDER BY hour`,
      [start, end]
    );

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Get hourly report error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch hourly report' });
  }
});

// Get comprehensive driver performance report
router.get('/drivers', authenticateToken, async (req, res) => {
  try {
    const { start, end } = await resolveRange(req.query);

    const result = await pool.query(
      `SELECT
        d.id,
        d.name,
        d.phone,
        d.status,
        d.vehicle_type,
        
        -- Completed Orders
        COUNT(o.id) FILTER (WHERE o.status = 'Completed') as completed_orders,
        
        -- Active Orders
        COUNT(o.id) FILTER (WHERE o.status IN ('Confirmed', 'Preparing', 'Delivering')) as active_orders,
        
        -- Total Orders
        COUNT(o.id) as total_orders,
        
        -- Financial Data
        COALESCE(SUM(o.total) FILTER (WHERE o.status = 'Completed'), 0) as total_sales,
        COALESCE(SUM(o.delivery_fee) FILTER (WHERE o.status = 'Completed'), 0) as total_delivery_fees,
        
        -- Driver Commission (70% of delivery fees)
        COALESCE(SUM(o.delivery_fee) FILTER (WHERE o.status = 'Completed'), 0) * 0.70 as driver_commission,
        
        -- Restaurant Share (30% of delivery fees)
        COALESCE(SUM(o.delivery_fee) FILTER (WHERE o.status = 'Completed'), 0) * 0.30 as restaurant_commission,
        
        -- Cash Orders (COD - Cash on Delivery)
        COUNT(o.id) FILTER (WHERE o.payment_method = 'cash' AND o.status = 'Completed') as cash_orders,
        COALESCE(SUM(o.total) FILTER (WHERE o.payment_method = 'cash' AND o.status = 'Completed'), 0) as cash_collected,
        
        -- Online Orders
        COUNT(o.id) FILTER (WHERE o.payment_method IN ('card', 'online') AND o.status = 'Completed') as online_orders,
        COALESCE(SUM(o.total) FILTER (WHERE o.payment_method IN ('card', 'online') AND o.status = 'Completed'), 0) as online_sales,
        
        -- Cancelled Orders
        COUNT(o.id) FILTER (WHERE o.status = 'Cancelled') as cancelled_orders,
        
        -- Average Order Value
        COALESCE(AVG(o.total) FILTER (WHERE o.status = 'Completed'), 0) as avg_order_value
        
      FROM drivers d
      LEFT JOIN orders o ON d.id = o.driver_id
        AND o.created_at >= $1
        AND o.created_at <= $2
      GROUP BY d.id, d.name, d.phone, d.status, d.vehicle_type
      HAVING COUNT(o.id) FILTER (WHERE o.status IN ('Completed', 'Confirmed', 'Preparing', 'Delivering')) > 0
      ORDER BY total_sales DESC`,
      [start, end]
    );

    // Calculate Net Earnings for each driver
    const driversWithEarnings = result.rows.map(driver => {
      const driverCommission = parseFloat(driver.driver_commission) || 0;
      const cashCollected = parseFloat(driver.cash_collected) || 0;

      // Net Earnings = Commission - Cash Collected (driver owes cash to restaurant)
      // If cash_collected > commission, driver owes restaurant
      // If commission > cash_collected, restaurant owes driver
      const netEarnings = driverCommission - cashCollected;

      return {
        ...driver,
        driver_commission: parseFloat(driver.driver_commission).toFixed(2),
        restaurant_commission: parseFloat(driver.restaurant_commission).toFixed(2),
        cash_collected: parseFloat(driver.cash_collected).toFixed(2),
        online_sales: parseFloat(driver.online_sales).toFixed(2),
        total_sales: parseFloat(driver.total_sales).toFixed(2),
        total_delivery_fees: parseFloat(driver.total_delivery_fees).toFixed(2),
        avg_order_value: parseFloat(driver.avg_order_value).toFixed(2),
        net_earnings: netEarnings.toFixed(2),
        owes_restaurant: netEarnings < 0, // true if driver collected more cash than commission
        completion_rate: driver.total_orders > 0
          ? ((driver.completed_orders / driver.total_orders) * 100).toFixed(1)
          : '0'
      };
    });

    res.json({ success: true, data: driversWithEarnings });
  } catch (error) {
    console.error('Get drivers report error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch drivers report' });
  }
});


// Get daily sales report
router.get('/daily', authenticateToken, async (req, res) => {
  try {
    const { start, end } = await resolveRange(req.query);

    const result = await pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as order_count,
        COALESCE(SUM(total), 0) as total_sales,
        COALESCE(AVG(total), 0) as avg_order_value
       FROM orders 
       WHERE created_at >= $1 AND created_at <= $2
       AND status != 'Cancelled'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [start, end]
    );

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Get daily report error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch daily report' });
  }
});

export default router;

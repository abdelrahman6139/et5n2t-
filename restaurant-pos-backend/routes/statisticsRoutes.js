import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get statistics for today
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    console.log('📊 Fetching statistics for:', todayStart, 'to', todayEnd);

    // Get total sales and orders count
    const salesQuery = await pool.query(
      `SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_sales,
        COALESCE(AVG(total), 0) as avg_order_value
       FROM orders 
       WHERE created_at >= $1 AND created_at <= $2 
       AND status != 'Cancelled'`,
      [todayStart, todayEnd]
    );

    // Get orders by sales center
    const salesCenterQuery = await pool.query(
      `SELECT 
        sales_center,
        COUNT(*) as count
       FROM orders 
       WHERE created_at >= $1 AND created_at <= $2 
       AND status != 'Cancelled'
       GROUP BY sales_center`,
      [todayStart, todayEnd]
    );

    // Get total items sold - CORRECT TABLE NAME: order_items (with underscore)
    const itemsSoldQuery = await pool.query(
      `SELECT COALESCE(SUM(oi.quantity), 0) as total_items
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.created_at >= $1 AND o.created_at <= $2
       AND o.status != 'Cancelled'`,
      [todayStart, todayEnd]
    );

    console.log('✅ All queries successful');

    // Map sales center counts
    const salesCenterCounts = {
      DineIn: 0,
      Delivery: 0,
      Takeaway: 0
    };

    salesCenterQuery.rows.forEach(row => {
      salesCenterCounts[row.sales_center] = parseInt(row.count);
    });

    const stats = salesQuery.rows[0];

    res.json({
      success: true,
      data: {
        totalSales: parseFloat(stats.total_sales).toFixed(2),
        totalOrders: parseInt(stats.total_orders),
        averageOrderValue: parseFloat(stats.avg_order_value).toFixed(2),
        itemsSold: parseInt(itemsSoldQuery.rows[0].total_items),
        dineInOrders: salesCenterCounts.DineIn,
        deliveryOrders: salesCenterCounts.Delivery,
        takeawayOrders: salesCenterCounts.Takeaway
      }
    });

  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch statistics'
    });
  }
});

export default router;

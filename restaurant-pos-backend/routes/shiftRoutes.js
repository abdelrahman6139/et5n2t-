import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Open a new shift
router.post('/open', authenticateToken, async (req, res) => {
  try {
    const { opening_cash, notes } = req.body;
    const user_id = req.user.id;
    const cashier_name = req.user.name;

    // Check if there's already an open shift for this user
    const existingShift = await pool.query(
      'SELECT * FROM shifts WHERE user_id = $1 AND status = $2',
      [user_id, 'open']
    );

    if (existingShift.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'لديك وردية مفتوحة بالفعل. يرجى إغلاقها أولاً'
      });
    }

    const result = await pool.query(
      `INSERT INTO shifts (user_id, cashier_name, opening_cash, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, cashier_name, opening_cash || 0, notes]
    );

    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Open shift error:', error);
    res.status(500).json({ success: false, error: 'فشل في فتح الوردية' });
  }
});

// Get current open shift
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;

    const result = await pool.query(
      'SELECT * FROM shifts WHERE user_id = $1 AND status = $2 ORDER BY opened_at DESC LIMIT 1',
      [user_id, 'open']
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Get current shift error:', error);
    res.status(500).json({ success: false, error: 'فشل في جلب الوردية الحالية' });
  }
});

// Get shift summary (for closing)
router.get('/:id/summary', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get shift details
    const shiftResult = await pool.query('SELECT * FROM shifts WHERE id = $1', [id]);

    if (shiftResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'الوردية غير موجودة' });
    }

    const shift = shiftResult.rows[0];

    // Get orders summary (FIXED: using 'total' and 'Cancelled')
    const ordersResult = await pool.query(
      `SELECT
     COUNT(*) as total_orders,
     COALESCE(SUM(total), 0) as total_sales,
     COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) as total_cash,
     COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END), 0) as total_visa,
     COALESCE(SUM(CASE WHEN sales_center = 'Delivery' THEN total ELSE 0 END), 0) as total_delivery
   FROM orders
   WHERE shift_id = $1 AND status NOT IN ('Cancelled')`,
      [id]
    );



    // Get expenses summary
    const expensesResult = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses WHERE shift_id = $1',
      [id]
    );

    const summary = {
      shift,
      orders: ordersResult.rows[0],
      expenses: expensesResult.rows[0]
    };

    res.json({ success: true, data: summary });

  } catch (error) {
    console.error('Get shift summary error:', error);
    res.status(500).json({ success: false, error: 'فشل في جلب ملخص الوردية' });
  }
});

// Close shift
router.post('/:id/close', authenticateToken, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { closing_cash, notes } = req.body;

    // Get shift summary (FIXED: using 'total' and 'Cancelled')
    const ordersResult = await client.query(
      `SELECT
     COUNT(*) as total_orders,
     COALESCE(SUM(total), 0) as total_sales,
     COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) as total_cash,
     COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END), 0) as total_visa,
     COALESCE(SUM(CASE WHEN sales_center = 'Delivery' THEN total ELSE 0 END), 0) as total_delivery
   FROM orders
   WHERE shift_id = $1 AND status NOT IN ('Cancelled')`,
      [id]
    );


    const expensesResult = await client.query(
      'SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses WHERE shift_id = $1',
      [id]
    );

    const shiftResult = await client.query('SELECT opening_cash FROM shifts WHERE id = $1', [id]);
    const opening_cash = parseFloat(shiftResult.rows[0].opening_cash) || 0;

    const orders = ordersResult.rows[0];
    const total_expenses = parseFloat(expensesResult.rows[0].total_expenses) || 0;
    const total_cash = parseFloat(orders.total_cash) || 0;

    // Expected cash = opening cash + cash sales - expenses
    const expected_cash = opening_cash + total_cash - total_expenses;
    const cash_difference = parseFloat(closing_cash) - expected_cash;

    // Update shift
    const updateResult = await client.query(
      `UPDATE shifts 
       SET closed_at = NOW(),
           closing_cash = $1,
           expected_cash = $2,
           cash_difference = $3,
           total_sales = $4,
           total_cash = $5,
           total_visa = $6,
           total_delivery = $7,
           total_expenses = $8,
           total_orders = $9,
           status = 'closed',
           notes = $10
       WHERE id = $11
       RETURNING *`,
      [
        closing_cash,
        expected_cash,
        cash_difference,
        orders.total_sales,
        orders.total_cash,
        orders.total_visa,
        orders.total_delivery,
        total_expenses,
        orders.total_orders,
        notes,
        id
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      data: updateResult.rows[0],
      message: 'تم إغلاق الوردية بنجاح'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Close shift error:', error);
    res.status(500).json({ success: false, error: 'فشل في إغلاق الوردية' });
  } finally {
    client.release();
  }
});

// Get all shifts (history)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM shifts 
       ORDER BY opened_at DESC 
       LIMIT 100`
    );

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({ success: false, error: 'فشل في جلب الورديات' });
  }
});

export default router;

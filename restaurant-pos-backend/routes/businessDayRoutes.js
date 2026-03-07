import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ─── GET /current ────────────────────────────────────────────────────────────
// Returns the currently open business day (or null if none)
router.get('/current', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM business_days WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1`
        );
        res.json({ success: true, data: result.rows[0] || null });
    } catch (error) {
        console.error('Get current business day error:', error);
        res.status(500).json({ success: false, error: 'فشل في جلب اليوم الحالي' });
    }
});

// ─── POST /open ───────────────────────────────────────────────────────────────
// Opens a new business day (fails if one is already open)
router.post('/open', authenticateToken, async (req, res) => {
    try {
        const { notes } = req.body;
        const opened_by_id = req.user.id;
        const opened_by_name = req.user.name || req.user.full_name || req.user.username;

        // Guard: only one open day at a time
        const existing = await pool.query(
            `SELECT id FROM business_days WHERE status = 'open' LIMIT 1`
        );
        if (existing.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'يوجد يوم مفتوح بالفعل. يرجى إغلاق اليوم الحالي أولاً'
            });
        }

        const result = await pool.query(
            `INSERT INTO business_days (opened_by_id, opened_by_name, notes, status)
       VALUES ($1, $2, $3, 'open')
       RETURNING *`,
            [opened_by_id, opened_by_name, notes || null]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Open business day error:', error);
        res.status(500).json({ success: false, error: 'فشل في فتح يوم عمل جديد' });
    }
});

// ─── GET /:id/summary ────────────────────────────────────────────────────────
// Returns full summary for a specific business day (works while open or after close)
router.get('/:id/summary', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const dayResult = await pool.query(`SELECT * FROM business_days WHERE id = $1`, [id]);
        if (dayResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'اليوم غير موجود' });
        }

        const day = dayResult.rows[0];
        const rangeEnd = day.closed_at ? day.closed_at : new Date();

        // ── Orders summary ─────────────────────────────────
        const ordersResult = await pool.query(
            `SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'cash'  THEN total ELSE 0 END), 0) as total_cash,
        COALESCE(SUM(CASE WHEN payment_method = 'card'  THEN total ELSE 0 END), 0) as total_card,
        COALESCE(SUM(CASE WHEN sales_center   = 'Delivery' THEN delivery_fee ELSE 0 END), 0) as total_delivery_fees,
        COALESCE(SUM(discount), 0) as total_discount,
        COALESCE(SUM(tax), 0) as total_tax,
        COALESCE(SUM(service_charge), 0) as total_service,
        COALESCE(AVG(total), 0) as avg_order_value
       FROM orders
       WHERE created_at >= $1
         AND created_at <= $2
         AND status NOT IN ('Cancelled')`,
            [day.opened_at, rangeEnd]
        );

        // ── Orders by sales center ─────────────────────────
        const byCenterResult = await pool.query(
            `SELECT sales_center, COUNT(*) as count, COALESCE(SUM(total), 0) as total
       FROM orders
       WHERE created_at >= $1 AND created_at <= $2 AND status NOT IN ('Cancelled')
       GROUP BY sales_center`,
            [day.opened_at, rangeEnd]
        );

        // ── Orders by payment method ───────────────────────
        const byPaymentResult = await pool.query(
            `SELECT payment_method, COUNT(*) as count, COALESCE(SUM(total), 0) as total
       FROM orders
       WHERE created_at >= $1 AND created_at <= $2 AND status NOT IN ('Cancelled')
         AND payment_method IS NOT NULL
       GROUP BY payment_method`,
            [day.opened_at, rangeEnd]
        );

        // ── Top items ──────────────────────────────────────
        const topItemsResult = await pool.query(
            `SELECT oi.name_snapshot as item_name,
              SUM(oi.quantity) as total_qty,
              SUM(oi.total)    as total_sales
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.created_at >= $1 AND o.created_at <= $2
         AND o.status NOT IN ('Cancelled')
       GROUP BY oi.name_snapshot
       ORDER BY total_sales DESC
       LIMIT 10`,
            [day.opened_at, rangeEnd]
        );

        // ── Expenses ───────────────────────────────────────
        const expensesResult = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as total_expenses
       FROM expenses
       WHERE created_at >= $1 AND created_at <= $2`,
            [day.opened_at, rangeEnd]
        );

        // ── Shifts that overlapped this day ───────────────
        const shiftsResult = await pool.query(
            `SELECT id, cashier_name, opened_at, closed_at,
              total_sales, total_orders, total_cash, total_visa, status
       FROM shifts
       WHERE opened_at >= $1 AND opened_at <= $2
       ORDER BY opened_at ASC`,
            [day.opened_at, rangeEnd]
        );

        const totalSales = parseFloat(ordersResult.rows[0].total_sales) || 0;
        const totalExpenses = parseFloat(expensesResult.rows[0].total_expenses) || 0;
        const netProfit = totalSales - totalExpenses;

        res.json({
            success: true,
            data: {
                day,
                orders: ordersResult.rows[0],
                byCenter: byCenterResult.rows,
                byPayment: byPaymentResult.rows,
                topItems: topItemsResult.rows,
                expenses: expensesResult.rows[0],
                shifts: shiftsResult.rows,
                netProfit,
            }
        });
    } catch (error) {
        console.error('Get business day summary error:', error);
        res.status(500).json({ success: false, error: 'فشل في جلب ملخص اليوم' });
    }
});

// ─── POST /:id/close ─────────────────────────────────────────────────────────
// Closes the business day and stores snapshot totals
router.post('/:id/close', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const { notes } = req.body;
        const closed_by_id = req.user.id;
        const closed_by_name = req.user.name || req.user.full_name || req.user.username;

        const dayResult = await client.query(
            `SELECT * FROM business_days WHERE id = $1 AND status = 'open'`, [id]
        );
        if (dayResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'اليوم غير موجود أو مغلق بالفعل' });
        }

        const day = dayResult.rows[0];
        const now = new Date();

        // Gather totals
        const ordersResult = await client.query(
            `SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) as total_cash,
        COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END), 0) as total_card,
        COALESCE(SUM(CASE WHEN sales_center = 'Delivery' THEN delivery_fee ELSE 0 END), 0) as total_delivery
       FROM orders
       WHERE created_at >= $1 AND created_at <= $2 AND status NOT IN ('Cancelled')`,
            [day.opened_at, now]
        );

        const expensesResult = await client.query(
            `SELECT COALESCE(SUM(amount), 0) as total_expenses
       FROM expenses WHERE created_at >= $1 AND created_at <= $2`,
            [day.opened_at, now]
        );

        const o = ordersResult.rows[0];
        const totalSales = parseFloat(o.total_sales) || 0;
        const totalExpenses = parseFloat(expensesResult.rows[0].total_expenses) || 0;
        const netProfit = totalSales - totalExpenses;

        const updateResult = await client.query(
            `UPDATE business_days SET
        closed_at        = $1,
        closed_by_id     = $2,
        closed_by_name   = $3,
        status           = 'closed',
        total_orders     = $4,
        total_sales      = $5,
        total_cash       = $6,
        total_card       = $7,
        total_delivery   = $8,
        total_expenses   = $9,
        net_profit       = $10,
        notes            = COALESCE($11, notes)
       WHERE id = $12
       RETURNING *`,
            [
                now, closed_by_id, closed_by_name,
                o.total_orders, totalSales,
                o.total_cash, o.total_card, o.total_delivery,
                totalExpenses, netProfit,
                notes || null, id
            ]
        );

        await client.query('COMMIT');
        res.json({ success: true, data: updateResult.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Close business day error:', error);
        res.status(500).json({ success: false, error: 'فشل في إغلاق اليوم' });
    } finally {
        client.release();
    }
});

// ─── GET / ────────────────────────────────────────────────────────────────────
// Returns paginated history of business days
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const result = await pool.query(
            `SELECT * FROM business_days ORDER BY opened_at DESC LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get business days error:', error);
        res.status(500).json({ success: false, error: 'فشل في جلب سجل الأيام' });
    }
});

export default router;

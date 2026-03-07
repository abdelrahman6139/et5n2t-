import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all expenses with optional date filtering
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, category, businessDayId } = req.query;

    let query = 'SELECT * FROM expenses WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (businessDayId) {
      // Use created_at range from the business day
      const dayResult = await pool.query(
        'SELECT opened_at, closed_at FROM business_days WHERE id = $1',
        [businessDayId]
      );
      if (dayResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'اليوم غير موجود' });
      }
      const day = dayResult.rows[0];
      const dayEnd = day.closed_at ? new Date(day.closed_at) : new Date();
      query += ` AND created_at >= $${paramCount}`;
      params.push(new Date(day.opened_at));
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
      params.push(dayEnd);
      paramCount++;
    } else {
      if (startDate) {
        query += ` AND date >= $${paramCount}`;
        params.push(startDate);
        paramCount++;
      }
      if (endDate) {
        query += ` AND date <= $${paramCount}`;
        params.push(endDate);
        paramCount++;
      }
    }

    if (category) {
      query += ` AND category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    query += ' ORDER BY date DESC, created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch expenses'
    });
  }
});

// Get expense categories (distinct)
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT category FROM expenses ORDER BY category'
    );

    res.json({
      success: true,
      data: result.rows.map(row => row.category)
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
});

// Get single expense by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch expense'
    });
  }
});

// Create new expense
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { date, category, description, amount, payment_method } = req.body;
    const userId = req.user.id;

    // Validation
    if (!category || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Category and amount are required'
      });
    }

    // Get current active shift for user
    const shiftResult = await pool.query(
      'SELECT id FROM shifts WHERE user_id = $1 AND status = $2 ORDER BY opened_at DESC LIMIT 1',
      [userId, 'open']
    );

    const shiftId = shiftResult.rows.length > 0 ? shiftResult.rows[0].id : null;

    if (!shiftId) {
      // Optional: Decide if expenses must be linked to a shift. 
      // For now, we'll allow it but maybe log a warning or return error if strict.
      // console.warn('Creating expense without active shift');
    }

    const result = await pool.query(
      `INSERT INTO expenses (date, category, description, amount, payment_method, created_by, shift_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [date || new Date(), category, description, amount, payment_method, userId, shiftId]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create expense'
    });
  }
});

// Update expense
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { date, category, description, amount, payment_method } = req.body;

    const result = await pool.query(
      `UPDATE expenses 
       SET date = $1, category = $2, description = $3, amount = $4, 
           payment_method = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [date, category, description, amount, payment_method, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update expense'
    });
  }
});

// Delete expense
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM expenses WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found'
      });
    }

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });

  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete expense'
    });
  }
});

// Get expenses summary (total by category)
router.get('/summary/total', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = `
      SELECT 
        category,
        COUNT(*) as count,
        SUM(amount) as total
      FROM expenses
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (startDate) {
      query += ` AND date >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND date <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    query += ' GROUP BY category ORDER BY total DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch summary'
    });
  }
});

export default router;

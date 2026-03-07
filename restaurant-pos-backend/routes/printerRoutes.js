import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all printers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, k.name as kitchen_name 
      FROM printers p
      LEFT JOIN kitchens k ON p.kitchen_id = k.id
      ORDER BY p.name
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get printers error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch printers' });
  }
});

// Create printer
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, type, kitchen_id } = req.body;
    
    if (!name || !kitchen_id) {
      return res.status(400).json({ success: false, error: 'Name and kitchen are required' });
    }

    const result = await pool.query(
      'INSERT INTO printers (name, type, kitchen_id) VALUES ($1, $2, $3) RETURNING *',
      [name, type || 'Printer', kitchen_id]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create printer error:', error);
    res.status(500).json({ success: false, error: 'Failed to create printer' });
  }
});

// Update printer
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, kitchen_id } = req.body;

    const result = await pool.query(
      'UPDATE printers SET name = $1, type = $2, kitchen_id = $3 WHERE id = $4 RETURNING *',
      [name, type, kitchen_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Printer not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update printer error:', error);
    res.status(500).json({ success: false, error: 'Failed to update printer' });
  }
});

// Delete printer
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM printers WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Printer not found' });
    }

    res.json({ success: true, message: 'Printer deleted successfully' });
  } catch (error) {
    console.error('Delete printer error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete printer' });
  }
});

export default router;

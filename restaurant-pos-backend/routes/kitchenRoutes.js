import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all kitchens
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM kitchens ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get kitchens error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch kitchens' });
  }
});

// Create kitchen
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const result = await pool.query(
      'INSERT INTO kitchens (name) VALUES ($1) RETURNING *',
      [name]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create kitchen error:', error);
    res.status(500).json({ success: false, error: 'Failed to create kitchen' });
  }
});

// Update kitchen
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const result = await pool.query(
      'UPDATE kitchens SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Kitchen not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update kitchen error:', error);
    res.status(500).json({ success: false, error: 'Failed to update kitchen' });
  }
});

// Delete kitchen
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM kitchens WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Kitchen not found' });
    }

    res.json({ success: true, message: 'Kitchen deleted successfully' });
  } catch (error) {
    console.error('Delete kitchen error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete kitchen' });
  }
});

export default router;

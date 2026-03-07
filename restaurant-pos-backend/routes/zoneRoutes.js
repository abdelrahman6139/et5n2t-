import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all delivery zones
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM delivery_zones ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get zones error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch zones' });
  }
});

// Create zone
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, delivery_fee, geojson } = req.body;
    
    if (!name || !delivery_fee) {
      return res.status(400).json({ success: false, error: 'Name and delivery fee are required' });
    }

    const result = await pool.query(
      'INSERT INTO delivery_zones (name, delivery_fee, geojson) VALUES ($1, $2, $3) RETURNING *',
      [name, delivery_fee, geojson || '{}']
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create zone error:', error);
    res.status(500).json({ success: false, error: 'Failed to create zone' });
  }
});

// Update zone
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, delivery_fee, geojson } = req.body;

    const result = await pool.query(
      'UPDATE delivery_zones SET name = $1, delivery_fee = $2, geojson = $3 WHERE id = $4 RETURNING *',
      [name, delivery_fee, geojson || '{}', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Zone not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update zone error:', error);
    res.status(500).json({ success: false, error: 'Failed to update zone' });
  }
});

// Delete zone
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM delivery_zones WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Zone not found' });
    }

    res.json({ success: true, message: 'Zone deleted successfully' });
  } catch (error) {
    console.error('Delete zone error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete zone' });
  }
});

export default router;

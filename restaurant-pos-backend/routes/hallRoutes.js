import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all halls with their tables
router.get('/', authenticateToken, async (req, res) => {
  try {
    const hallsResult = await pool.query('SELECT * FROM halls ORDER BY name');
    const tablesResult = await pool.query('SELECT * FROM tables ORDER BY hall_id, name');

    const halls = hallsResult.rows.map(hall => ({
      ...hall,
      tables: tablesResult.rows.filter(t => t.hall_id === hall.id)
    }));

    res.json({ success: true, data: halls });
  } catch (error) {
    console.error('Get halls error:', error);
    res.status(500).json({ error: 'Failed to fetch halls' });
  }
});

// Get tables by hall
router.get('/:hallId/tables', authenticateToken, async (req, res) => {
  try {
    const { hallId } = req.params;
    const result = await pool.query(
      'SELECT * FROM tables WHERE hall_id = $1 ORDER BY name',
      [hallId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get tables error:', error);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

// Create new hall
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const result = await pool.query(
      'INSERT INTO halls (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create hall error:', error);
    res.status(500).json({ error: 'Failed to create hall' });
  }
});

router.get('/tables', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tables ORDER BY hall_id, name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get all tables error:', error);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});
// Create new table
router.post('/:hallId/tables', authenticateToken, async (req, res) => {
  try {
    const { hallId } = req.params;
    const { name } = req.body;
    const result = await pool.query(
      'INSERT INTO tables (name, hall_id) VALUES ($1, $2) RETURNING *',
      [name, hallId]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create table error:', error);
    res.status(500).json({ error: 'Failed to create table' });
  }
});

export default router;

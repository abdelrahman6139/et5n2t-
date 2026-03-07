import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ============ USERS ============
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, full_name, role, email, phone, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/users', authenticateToken, async (req, res) => {
  try {
    const { username, full_name, password, role, email, phone, is_active } = req.body;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      `INSERT INTO users (username, full_name, password, role, email, phone, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [username, full_name, hashedPassword, role, email, phone, is_active]
    );
    
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, full_name, password, role, email, phone, is_active } = req.body;
    
    let query, params;
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query = `UPDATE users SET username=$1, full_name=$2, password=$3, role=$4, email=$5, phone=$6, is_active=$7 WHERE id=$8`;
      params = [username, full_name, hashedPassword, role, email, phone, is_active, id];
    } else {
      query = `UPDATE users SET username=$1, full_name=$2, role=$3, email=$4, phone=$5, is_active=$6 WHERE id=$7`;
      params = [username, full_name, role, email, phone, is_active, id];
    }
    
    await pool.query(query, params);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.patch('/users/:id/toggle-status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    await pool.query('UPDATE users SET is_active = $1 WHERE id = $2', [is_active, id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ error: 'Failed to toggle user status' });
  }
});

// ============ HALLS ============
router.get('/halls', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM halls ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error('Get halls error:', error);
    res.status(500).json({ error: 'Failed to fetch halls' });
  }
});

router.post('/halls', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const result = await pool.query(
      'INSERT INTO halls (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create hall error:', error);
    res.status(500).json({ error: 'Failed to create hall' });
  }
});

router.put('/halls/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!id || id === 'undefined') {
      return res.status(400).json({ error: 'Invalid hall ID' });
    }
    
    const result = await pool.query(
      'UPDATE halls SET name = $1 WHERE id = $2 RETURNING *',
      [name, parseInt(id)]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Hall not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update hall error:', error);
    res.status(500).json({ error: 'Failed to update hall' });
  }
});

router.delete('/halls/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM halls WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete hall error:', error);
    res.status(500).json({ error: 'Failed to delete hall' });
  }
});

// ============ TABLES ============
router.get('/tables', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tables ORDER BY hall_id, id');
    res.json(result.rows);
  } catch (error) {
    console.error('Get tables error:', error);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
});

router.post('/tables', authenticateToken, async (req, res) => {
  try {
    const { name, hallId, capacity } = req.body;
    const result = await pool.query(
      'INSERT INTO tables (name, hall_id, capacity) VALUES ($1, $2, $3) RETURNING *',
      [name, hallId, capacity || 4]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create table error:', error);
    res.status(500).json({ error: 'Failed to create table' });
  }
});

router.put('/tables/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, capacity } = req.body;
    const result = await pool.query(
      'UPDATE tables SET name = $1, capacity = $2 WHERE id = $3 RETURNING *',
      [name, capacity, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update table error:', error);
    res.status(500).json({ error: 'Failed to update table' });
  }
});

router.delete('/tables/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tables WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete table error:', error);
    res.status(500).json({ error: 'Failed to delete table' });
  }
});

export default router;

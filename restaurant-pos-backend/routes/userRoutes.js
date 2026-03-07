import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all users
router.get('/', authenticateToken, async (req, res) => {
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

// Create user
router.post('/', authenticateToken, async (req, res) => {
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

// Update user
router.put('/:id', authenticateToken, async (req, res) => {
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

// Delete user
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Toggle user status
router.patch('/:id/toggle-status', authenticateToken, async (req, res) => {
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

export default router;

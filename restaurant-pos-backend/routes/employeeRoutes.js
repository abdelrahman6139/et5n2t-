import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all employees
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch employees' });
  }
});

// Create employee
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, role, phone } = req.body;
    
    if (!name || !role) {
      return res.status(400).json({ success: false, error: 'Name and role are required' });
    }

    const result = await pool.query(
      'INSERT INTO employees (name, role, phone) VALUES ($1, $2, $3) RETURNING *',
      [name, role, phone]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ success: false, error: 'Failed to create employee' });
  }
});

// Update employee
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, phone } = req.body;

    const result = await pool.query(
      'UPDATE employees SET name = $1, role = $2, phone = $3 WHERE id = $4 RETURNING *',
      [name, role, phone, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ success: false, error: 'Failed to update employee' });
  }
});

// Delete employee
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM employees WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete employee' });
  }
});

export default router;

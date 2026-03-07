import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ========== INVENTORY ITEMS ==========

// Get all inventory items
router.get('/items', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ii.*,
        s.name as supplier_name
      FROM inventory_items ii
      LEFT JOIN suppliers s ON ii.supplier_id = s.id
      ORDER BY ii.name
    `);

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Get inventory items error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch inventory items' });
  }
});

// Create inventory item
router.post('/items', authenticateToken, async (req, res) => {
  try {
    const { name, unit, stock, cost, supplier_id } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const result = await pool.query(
      `INSERT INTO inventory_items (name, unit, stock, cost, supplier_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, unit, stock || 0, cost || 0, supplier_id]
    );

    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Create inventory item error:', error);
    res.status(500).json({ success: false, error: 'Failed to create inventory item' });
  }
});

// Update inventory item
router.put('/items/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, unit, stock, cost, supplier_id } = req.body;

    const result = await pool.query(
      `UPDATE inventory_items 
       SET name = $1, unit = $2, stock = $3, cost = $4, supplier_id = $5
       WHERE id = $6
       RETURNING *`,
      [name, unit, stock, cost, supplier_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Update inventory item error:', error);
    res.status(500).json({ success: false, error: 'Failed to update inventory item' });
  }
});

// Delete inventory item
router.delete('/items/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM inventory_items WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    res.json({ success: true, message: 'Item deleted successfully' });

  } catch (error) {
    console.error('Delete inventory item error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete inventory item' });
  }
});

// ========== SUPPLIERS ==========

// Get all suppliers
router.get('/suppliers', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM suppliers
      ORDER BY name
    `);

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch suppliers' });
  }
});

// Create supplier
router.post('/suppliers', authenticateToken, async (req, res) => {
  try {
    const { name, contact_person, phone, email } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const result = await pool.query(
      `INSERT INTO suppliers (name, contact_person, phone, email)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, contact_person, phone, email]
    );

    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ success: false, error: 'Failed to create supplier' });
  }
});

// Update supplier
router.put('/suppliers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contact_person, phone, email } = req.body;

    const result = await pool.query(
      `UPDATE suppliers 
       SET name = $1, contact_person = $2, phone = $3, email = $4
       WHERE id = $5
       RETURNING *`,
      [name, contact_person, phone, email, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ success: false, error: 'Failed to update supplier' });
  }
});

// Delete supplier
router.delete('/suppliers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM suppliers WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Supplier not found' });
    }

    res.json({ success: true, message: 'Supplier deleted successfully' });

  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete supplier' });
  }
});

export default router;

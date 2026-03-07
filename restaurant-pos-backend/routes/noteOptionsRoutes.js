import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/note-options  — list all active note options
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM note_options ORDER BY id'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch note options' });
  }
});

// POST /api/note-options  — create
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, price = 0 } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const result = await pool.query(
      'INSERT INTO note_options (name, price) VALUES ($1, $2) RETURNING *',
      [name, price]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create note option' });
  }
});

// PUT /api/note-options/:id  — update
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, is_active } = req.body;
    const result = await pool.query(
      `UPDATE note_options
       SET name      = COALESCE($1, name),
           price     = COALESCE($2, price),
           is_active = COALESCE($3, is_active)
       WHERE id = $4 RETURNING *`,
      [name, price, is_active, id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update note option' });
  }
});

// DELETE /api/note-options/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM note_options WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete note option' });
  }
});

// GET /api/note-options/menu-item/:menuItemId  — note options linked to an item
router.get('/menu-item/:menuItemId', async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const result = await pool.query(
      `SELECT no.id, no.name, no.price
       FROM menu_item_note_options mino
       JOIN note_options no ON no.id = mino.note_option_id
       WHERE mino.menu_item_id = $1 AND no.is_active = TRUE
       ORDER BY no.id`,
      [menuItemId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// POST /api/note-options/menu-item/:menuItemId/link  — link a note option to an item
// body: { noteOptionId }
router.post('/menu-item/:menuItemId/link', authenticateToken, async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const { noteOptionId } = req.body;
    await pool.query(
      `INSERT INTO menu_item_note_options (menu_item_id, note_option_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [menuItemId, noteOptionId]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to link note option' });
  }
});

// DELETE /api/note-options/menu-item/:menuItemId/:noteOptionId  — unlink
router.delete('/menu-item/:menuItemId/:noteOptionId', authenticateToken, async (req, res) => {
  try {
    const { menuItemId, noteOptionId } = req.params;
    await pool.query(
      'DELETE FROM menu_item_note_options WHERE menu_item_id = $1 AND note_option_id = $2',
      [menuItemId, noteOptionId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unlink' });
  }
});

export default router;

import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/activity - Fetch activity logs (Admin only)
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Optional: Check if user is admin
        if (req.user.role !== 'admin' && req.user.role !== 'Admin') {
            return res.status(403).json({ error: 'Unauthorized access' });
        }

        const { limit = 50, offset = 0, user_id } = req.query;

        let query = `
      SELECT al.*, u.username, u.role
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
    `;

        const params = [];

        if (user_id) {
            query += ` WHERE al.user_id = $1`;
            params.push(user_id);
        }

        query += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Fetch activity logs error:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

export default router;

import express from 'express';
import pool from '../db.js';
import { logActivity } from '../utils/logger.js';

const router = express.Router();

// Get all settings
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM settings');
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.json({ success: true, data: settings });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// Update settings (Bulk update)
import { authenticateToken } from '../middleware/auth.js';
router.post('/batch', authenticateToken, async (req, res) => {
    const settings = req.body; // Expect { key: value, key2: value2 }
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        for (const [key, value] of Object.entries(settings)) {
            // Upsert logic
            await client.query(
                'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
                [key, String(value)]
            );
        }

        await client.query('COMMIT');

        // Log Activity
        if (req.user) {
            await logActivity(
                req.user.id,
                'UPDATE_SETTINGS',
                JSON.stringify(settings),
                req,
                'System',
                'Settings'
            );
        }

        res.json({ success: true, message: 'Settings updated successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    } finally {
        client.release();
    }
});

export default router;

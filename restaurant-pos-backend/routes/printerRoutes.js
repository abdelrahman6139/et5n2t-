/**
 * printerRoutes.js
 *
 * Architecture: Frontend  Local Print Agent (direct)
 *
 * The frontend calls the local print agent (http://localhost:5078) directly
 * for all print jobs. The VPS backend is NOT involved in proxying print jobs
 * (it cannot reach the cashier's localhost from a remote server).
 *
 * This backend module only handles:
 *   GET  /api/printers/agent-url      read the agent URL from DB settings
 *   POST /api/printers/agent-url      save the agent URL to DB settings
 *   GET  /api/printers/agent-status   returns stored URL for UI display
 */

import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const DEFAULT_AGENT_URL = 'http://localhost:5078';

async function getAgentUrl() {
  try {
    const { rows } = await pool.query(
      "SELECT value FROM settings WHERE key = 'print_agent_url' LIMIT 1",
    );
    return (rows[0]?.value ?? '').trim() || DEFAULT_AGENT_URL;
  } catch {
    return DEFAULT_AGENT_URL;
  }
}

/**
 * GET /api/printers/agent-url
 * Returns { url }  frontend caches this and calls the agent directly.
 */
router.get('/agent-url', authenticateToken, async (_req, res) => {
  const url = await getAgentUrl();
  res.json({ url });
});

/**
 * POST /api/printers/agent-url
 * Body: { url: string }
 * Saves the print-agent URL to settings so all POS terminals share the same agent.
 */
router.post('/agent-url', authenticateToken, async (req, res) => {
  const { url } = req.body ?? {};
  if (!url) return res.status(400).json({ error: 'url is required' });
  try {
    await pool.query(
      `INSERT INTO settings (key, value)
       VALUES ('print_agent_url', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [url.trim()],
    );
    return res.json({ success: true, url: url.trim() });
  } catch (err) {
    console.error('[printerRoutes] save agent-url error:', err.message);
    return res.status(500).json({ error: 'Failed to save agent URL' });
  }
});

/**
 * GET /api/printers/agent-status
 * Returns stored agent URL. Frontend pings the agent directly to check if online.
 */
router.get('/agent-status', authenticateToken, async (_req, res) => {
  const url = await getAgentUrl();
  res.json({ url });
});

export default router;

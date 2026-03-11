/**
 * server.js — Yarb Local Print Agent
 *
 * Listens on http://localhost:5078 and accepts print jobs from the backend.
 *
 * Endpoints:
 *   GET  /status              — health check (backend pings this)
 *   GET  /printers            — list installed Windows printers
 *   POST /print/receipt       — print customer receipt
 *   POST /print/kitchen       — print kitchen ticket
 *   POST /print/text          — print plain-text report (shift/day-closing)
 *
 * Silent printing: Puppeteer renders exact HTML → PDF → Windows print spooler.
 * No print dialog ever opens.
 */

'use strict';

const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const { buildReceiptHTML } = require('./builders/receipt');
const { buildKitchenHTML } = require('./builders/kitchen');
const { buildTextHTML }    = require('./builders/text');
const { renderAndPrint, getInstalledPrinters } = require('./printer');

// ── Config ────────────────────────────────────────────────────────────────────
const CFG_PATH = path.join(__dirname, 'config.json');
let cfg = {};
try {
  cfg = JSON.parse(fs.readFileSync(CFG_PATH, 'utf8'));
} catch (e) {
  console.warn('[server] config.json not found or invalid — using defaults');
}
const PORT           = cfg.port          || 5078;
const RECEIPT_PRINTER = cfg.receiptPrinter || '';
const KITCHEN_PRINTER = cfg.kitchenPrinter || '';
const PAPER_MM        = Number(cfg.paperWidthMm) || 80;

// ── Express setup ─────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Request logger ────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[${new Date().toLocaleTimeString('ar-EG')}] ${req.method} ${req.path}`);
  next();
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/status', (_req, res) => {
  res.json({
    status:          'online',
    version:         '1.0.0',
    receiptPrinter:  RECEIPT_PRINTER,
    kitchenPrinter:  KITCHEN_PRINTER,
    paperWidthMm:    PAPER_MM,
    time:            new Date().toISOString(),
  });
});

// ── List installed printers ───────────────────────────────────────────────────
app.get('/printers', async (_req, res) => {
  try {
    const list = await getInstalledPrinters();
    res.json({ printers: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Print customer receipt ────────────────────────────────────────────────────
// POST /print/receipt
// Body: ReceiptData (see printService.ts)
app.post('/print/receipt', async (req, res) => {
  const data = req.body;

  if (!data || !data.orderNumber || !Array.isArray(data.items)) {
    return res.status(400).json({ error: 'orderNumber and items[] are required' });
  }

  // Caller can override printer for this specific job
  const printer = (data.printerName || RECEIPT_PRINTER || '').trim();

  try {
    console.log(`[receipt] Order #${data.orderNumber} → "${printer || 'default'}"`);

    const html = await buildReceiptHTML(data, cfg);
    await renderAndPrint(html, printer, PAPER_MM);

    return res.json({ success: true, printer: printer || 'default' });
  } catch (err) {
    console.error('[receipt] ERROR:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── Print kitchen ticket ──────────────────────────────────────────────────────
// POST /print/kitchen
// Body: KitchenData (see printService.ts)
app.post('/print/kitchen', async (req, res) => {
  const data = req.body;

  if (!data || !data.orderNumber || !Array.isArray(data.items)) {
    return res.status(400).json({ error: 'orderNumber and items[] are required' });
  }

  const printer = (data.printerName || KITCHEN_PRINTER || '').trim();

  try {
    console.log(`[kitchen] Order #${data.orderNumber} → "${printer || 'default'}"`);

    const html = buildKitchenHTML(data, cfg);
    await renderAndPrint(html, printer, PAPER_MM);

    return res.json({ success: true, printer: printer || 'default' });
  } catch (err) {
    console.error('[kitchen] ERROR:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── Print plain-text report (shift / day-closing) ─────────────────────────────
// POST /print/text
// Body: { text: string, printerName?: string }
app.post('/print/text', async (req, res) => {
  const { text, printerName } = req.body || {};

  if (!text) {
    return res.status(400).json({ error: 'text is required' });
  }

  const printer = (printerName || RECEIPT_PRINTER || '').trim();

  try {
    console.log(`[text] Report → "${printer || 'default'}"`);

    const html = buildTextHTML(text, cfg);
    await renderAndPrint(html, printer, PAPER_MM);

    return res.json({ success: true, printer: printer || 'default' });
  } catch (err) {
    console.error('[text] ERROR:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('┌─────────────────────────────────────────┐');
  console.log('│       Yarb Print Agent — v1.0.0         │');
  console.log('├─────────────────────────────────────────┤');
  console.log(`│  Listening on  http://localhost:${PORT}    │`);
  console.log(`│  Receipt printer : ${(RECEIPT_PRINTER || '(default)').padEnd(20)}│`);
  console.log(`│  Kitchen printer : ${(KITCHEN_PRINTER || '(default)').padEnd(20)}│`);
  console.log(`│  Paper width     : ${String(PAPER_MM + 'mm').padEnd(20)}│`);
  console.log('├─────────────────────────────────────────┤');
  console.log('│  Endpoints:                             │');
  console.log('│    GET  /status                         │');
  console.log('│    POST /print/receipt                  │');
  console.log('│    POST /print/kitchen                  │');
  console.log('│    POST /print/text                     │');
  console.log('└─────────────────────────────────────────┘');
  console.log('');
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[!] Port ${PORT} already in use — another agent is already running.`);
    console.error(`    Close the other window first, then rerun Start-Agent.bat\n`);
    process.exit(0);
  } else {
    throw err;
  }
});
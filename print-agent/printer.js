/**
 * printer.js
 *
 * Renders HTML to PDF silently using Puppeteer + prints via Windows Print Spooler.
 *
 * Strategy:
 *   1. Puppeteer (headless Chromium) renders the HTML exactly — full RTL Arabic,
 *      fonts, tables, logo images, QR codes — identical to what a browser shows.
 *   2. page.pdf() generates a PDF sized to fit the exact paper width × content height.
 *   3. We use PowerShell to send the PDF to the Windows print spooler.
 */

'use strict';

const puppeteer = require('puppeteer');
const ptp          = require('pdf-to-printer');   // ← proper npm API
const { execFile } = require('child_process');
const fs        = require('fs');
const os        = require('os');
const path      = require('path');

// ── Browser singleton — launch once, reuse across jobs ────────────────────────
let _browser = null;

async function getBrowser() {
  if (_browser) {
    try {
      await _browser.version();
      return _browser;
    } catch {
      _browser = null;
    }
  }

  _browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--font-render-hinting=none',
    ],
  });

  _browser.on('disconnected', () => { _browser = null; });

  console.log('[printer] Chromium launched');
  return _browser;
}

// ── Core: HTML → PDF buffer ───────────────────────────────────────────────────

async function htmlToPDF(html, paperWidthMm = 80) {
  const browser = await getBrowser();
  const page    = await browser.newPage();

  try {
    const viewportPx = Math.round(paperWidthMm * 3.7795);
    await page.setViewport({ width: viewportPx, height: 800 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15_000 });
    await page.evaluateHandle('document.fonts.ready');

    const contentHeight = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );

    const pdfBuffer = await page.pdf({
      width:           `${paperWidthMm}mm`,
      height:          `${contentHeight + 8}px`,
      printBackground: true,
      margin:          { top: '0', right: '0', bottom: '0', left: '0' },
    });

    return pdfBuffer;
  } finally {
    await page.close().catch(() => {});
  }
}

// ── Core: PDF buffer → Windows printer via pdf-to-printer npm ────────────────

async function printPDFSilently(pdfBuffer, printerName) {
  const tmpFile = path.join(os.tmpdir(), `yarb-${Date.now()}.pdf`);
  fs.writeFileSync(tmpFile, pdfBuffer);
  const printer = (printerName || '').trim();

  console.log(`[printer] Sending ${pdfBuffer.length} bytes to "${printer || 'default'}" ...`);

  try {
    const opts = { scale: 'noscale' };
    if (printer) opts.printer = printer;
    await ptp.print(tmpFile, opts);
    console.log(`[printer] ✅ Sent to "${printer || 'default'}"`);
  } catch (err) {
    console.error(`[printer] ❌ Failed to print to "${printer}":`, err.message);
    throw err;
  } finally {
    // Clean up temp file after 10 s (give spooler time to read it)
    setTimeout(() => { try { fs.unlinkSync(tmpFile); } catch { /* ignore */ } }, 10_000);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

async function renderAndPrint(html, printerName, paperWidthMm = 80) {
  const pdfBuffer = await htmlToPDF(html, paperWidthMm);
  await printPDFSilently(pdfBuffer, printerName);
}

async function getInstalledPrinters() {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-Command', 'Get-Printer | Select-Object -ExpandProperty Name'],
      { timeout: 10_000 },
      (error, stdout) => {
        if (error) {
          console.error('[printer] Failed to list printers:', error.message);
          resolve([]);
          return;
        }
        const names = stdout
          .split(/\r?\n/)
          .map(n => n.trim())
          .filter(Boolean);
        resolve(names);
      },
    );
  });
}

// Pre-warm Chromium on startup
setTimeout(() => {
  getBrowser().catch((err) => {
    console.warn('[printer] Chromium pre-warm failed:', err.message);
  });
}, 2_000);

module.exports = { renderAndPrint, getInstalledPrinters, htmlToPDF };

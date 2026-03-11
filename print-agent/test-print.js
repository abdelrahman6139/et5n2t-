'use strict';
const ptp     = require('pdf-to-printer');
const printer = require('./printer');
const os      = require('os');
const path    = require('path');
const fs      = require('fs');

const PRINTER = process.argv[2] || 'inv2';
const tmp = path.join(os.tmpdir(), 'yarb-test-' + Date.now() + '.pdf');

const html = `<!DOCTYPE html>
<html dir="rtl"><head><meta charset="UTF-8"/>
<style>
  body { font-family: Tahoma, Arial; font-size: 18px; text-align: center; margin: 0; padding: 10px; }
</style></head>
<body>
  <p style="font-size:22px; font-weight:bold;">اختبار الطباعة</p>
  <p>TEST PRINT OK</p>
  <p>Printer: ${PRINTER}</p>
  <p>${new Date().toLocaleString('ar-EG')}</p>
</body></html>`;

(async () => {
  try {
    console.log('[1] Generating PDF with Puppeteer...');
    const buf = await printer.htmlToPDF(html, 80);
    fs.writeFileSync(tmp, buf);
    console.log(`[2] PDF saved: ${tmp} (${buf.length} bytes)`);

    console.log(`[3] Printing to "${PRINTER}" via pdf-to-printer...`);
    await ptp.print(tmp, { printer: PRINTER, scale: 'noscale' });
    console.log('[4] SUCCESS — check the printer!');
  } catch (err) {
    console.error('[ERROR]', err.message);
    process.exit(1);
  }
})();

/**
 * utils/builders/text.ts
 *
 * Browser-side plain-text / report HTML builder for QZ Tray.
 * Converts tab-separated or bracket-headed text into printer-ready HTML.
 * Identical parsing logic to the Node.js print-agent text.js builder.
 */

import type { PrintConfig } from '../printConfig';

const SEP = '------------------------------------------';

/**
 * Builds a standalone HTML document from plain text.
 * Lines that contain tabs become table rows.
 * Lines in [brackets] become centered section headers.
 * Lines starting with "--" become separator rules.
 */
export function buildTextHTML(text: string, cfg: PrintConfig): string {
  const lines = (text ?? '').split('\n');
  const paperPx = (cfg.paperWidthMm ?? 80) >= 80 ? 272 : 192;

  let bodyHtml  = '';
  let inTable   = false;
  let tableHtml = '';
  let headerDone = false;

  const flushTable = () => {
    if (inTable && tableHtml) {
      bodyHtml += `<table>${tableHtml}</table>`;
      tableHtml = '';
    }
    inTable    = false;
    headerDone = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    if (line.includes('\t')) {
      if (!inTable) {
        flushTable();
        inTable    = true;
        tableHtml  = '';
        headerDone = false;
      }

      const parts   = line.split('\t');
      const isHeader = !headerDone;
      headerDone = true;

      const cells = parts
        .map((p) => {
          const txt = p.trim();
          if (isHeader) return `<th>${txt}</th>`;
          const isNum = /^[\d.,٠-٩%-]+$/.test(txt);
          return `<td class="${isNum ? 'num' : ''}">${txt}</td>`;
        })
        .join('');

      tableHtml += isHeader
        ? `<thead><tr>${cells}</tr></thead><tbody>`
        : `<tr>${cells}</tr>`;
    } else {
      if (inTable) {
        tableHtml += '</tbody>';
        flushTable();
      }

      if (line.startsWith('-') && line.length > 3) {
        bodyHtml += `<div class="sep">${SEP}</div>`;
      } else if (line.startsWith('[') && line.endsWith(']')) {
        bodyHtml += `<div class="section-header">${line}</div>`;
      } else {
        bodyHtml += `<div class="info">${line}</div>`;
      }
    }
  }

  if (inTable) {
    tableHtml += '</tbody>';
    flushTable();
  }

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Tahoma', 'Arial Unicode MS', 'Segoe UI', Arial, sans-serif;
      font-size: 14px;
      font-weight: bold;
      color: #000;
      background: #fff;
      direction: rtl;
      width: ${paperPx}px;
      padding: 4px 4px 2px 4px;
    }
    .sep {
      text-align: center;
      font-weight: bold;
      margin: 1px 0;
      overflow: hidden;
      white-space: nowrap;
    }
    .section-header {
      text-align: center;
      font-weight: 900;
      font-size: 15px;
      margin: 2px 0;
    }
    .info {
      text-align: right;
      font-weight: bold;
      font-size: 14px;
      margin: 1px 0;
      line-height: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      direction: rtl;
      margin: 2px 0;
      font-size: 12px;
    }
    th, td {
      border: 0.75px solid #000;
      padding: 1px 2px;
      font-weight: bold;
    }
    thead th {
      background: #D3D3D3;
      text-align: center;
      font-weight: 900;
    }
    tbody td { text-align: right; }
    tbody td.num { text-align: center; }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
}

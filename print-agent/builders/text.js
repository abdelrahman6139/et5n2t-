/**
 * builders/text.js
 *
 * Builds plain-text report HTML (shift closing, day closing, etc.)
 * Matches PrintService.cs handling of tab-separated plain text:
 *  - Tab-separated lines → table rows (like report tables in C#)
 *  - Lines in [brackets] → centered, ExtraBold section headers
 *  - "--..." lines → separator paragraphs
 *  - Other lines → right-aligned bold paragraphs
 *  - Report tables: columnsCount = parts with content, all columns equal width
 */

'use strict';

const SEP = '------------------------------------------';

/**
 * @param {string} text   Plain text content (may include tabs and [headers])
 * @param {object} cfg    config.json content
 * @returns {string} HTML ready for Puppeteer
 */
function buildTextHTML(text, cfg) {
  const lines = (text || '').split('\n');
  const paperPx = cfg.paperWidthMm >= 80 ? 272 : 192;

  // Build HTML body line by line — matches C# line-by-line parsing logic
  let bodyHtml = '';
  let inTable = false;
  let tableHtml = '';
  let headerDone = false;

  const flushTable = () => {
    if (inTable && tableHtml) {
      bodyHtml += `<table>${tableHtml}</table>`;
      tableHtml = '';
    }
    inTable = false;
    headerDone = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Skip empty lines (matches C# "continue" for empty lines)
    if (!line.trim()) continue;

    if (line.includes('\t')) {
      // Tab-separated → table row (matches C# tab detection for report tables)
      if (!inTable) {
        flushTable();
        inTable = true;
        tableHtml = '';
        headerDone = false;
      }

      const parts = line.split('\t');
      const isHeader = !headerDone;
      headerDone = true;

      const cells = parts
        .map((p) => {
          const txt = p.trim();
          if (isHeader) {
            return `<th>${txt}</th>`;
          } else {
            // Numeric-looking columns are center-aligned
            const isNum = /^[\d.,٠-٩%-]+$/.test(txt);
            return `<td class="${isNum ? 'num' : ''}">${txt}</td>`;
          }
        })
        .join('');

      tableHtml += isHeader
        ? `<thead><tr>${cells}</tr></thead><tbody>`
        : `<tr>${cells}</tr>`;
    } else {
      // Non-tab line → flush any open table, then process paragraph
      if (inTable) {
        tableHtml += '</tbody>';
        flushTable();
      }

      if (line.startsWith('-') && line.length > 3) {
        // Separator line — matches C# "--..." paragraphs
        bodyHtml += `<div class="sep">${SEP}</div>`;
      } else if (line.startsWith('[') && line.endsWith(']')) {
        // Section header — matches C# [bracket] → ExtraBold, center, font+1
        bodyHtml += `<div class="section-header">${line}</div>`;
      } else {
        // Regular info line — right-aligned, bold
        bodyHtml += `<div class="info">${line}</div>`;
      }
    }
  }

  // Flush any remaining open table
  if (inTable) {
    tableHtml += '</tbody>';
    flushTable();
  }

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <style>
    /* ── Text report — matches PrintService.cs paragraph + table rendering ── */
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

    /* separator */
    .sep {
      text-align: center;
      font-weight: bold;
      margin: 1px 0;
      overflow: hidden;
      white-space: nowrap;
    }

    /* section header [text] — matches C# [bracket] style */
    .section-header {
      text-align: center;
      font-weight: 900;
      font-size: 15px;
      margin: 2px 0;
    }

    /* regular info line */
    .info {
      text-align: right;
      font-weight: bold;
      font-size: 14px;
      margin: 1px 0;
      line-height: 16px;
    }

    /* report table — matches C# isReportTable columns equal width */
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
    tbody td {
      text-align: right;
    }
    tbody td.num {
      text-align: center;
    }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
}

module.exports = { buildTextHTML };

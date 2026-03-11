/**
 * builders/kitchen.js
 *
 * Builds kitchen ticket HTML matching PrintService.cs kitchen format:
 *  - Font 16px, ExtraBold (isKitchen=true → baseFontSize=16, FontWeight=ExtraBold)
 *  - Page width 300px (matches C# PageWidth=300 for kitchen)
 *  - 2-column table (3* name | 1* qty) = 75% / 25%
 *  - Cell padding 4px 2px 4px 2px (matches C# Thickness(4,2,4,2) for kitchen)
 *  - NO logo, NO QR code (matches C# skipping logo/QR for kitchen)
 *  - Shows isUpdate badge + version if it's an order update
 *  - Item name col: font-size+2, ExtraBold (matches C# isKitchen && colIndex==0 rules)
 *  - Header row: Gainsboro background, centered
 */

'use strict';

const SEP = '------------------------------------------';

/**
 * @param {object} data  KitchenData from printService.ts
 * @param {object} cfg   config.json content
 * @returns {string} HTML string ready for Puppeteer
 */
function buildKitchenHTML(data, cfg) {
  const {
    orderNumber,
    orderType,
    tableNumber,
    hallName,
    customerName,
    customerPhone,
    items = [],
    createdAt,
    isUpdate,
    originalOrderNumber,
    version,
  } = data;

  // ── Date ──────────────────────────────────────────────────────────────────
  const dateStr = createdAt
    ? new Date(createdAt).toLocaleString('ar-EG', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });

  // ── Order type label ──────────────────────────────────────────────────────
  const typeLabels = { DineIn: 'صالة', Takeaway: 'سفري', Delivery: 'توصيل' };
  const typeLabel = typeLabels[orderType] || orderType || '';

  // ── Update badge ──────────────────────────────────────────────────────────
  const updateBadge = isUpdate
    ? `<div class="update-badge">🔄 تعديل طلب${version ? ` (v${version})` : ''}</div>
       ${originalOrderNumber ? `<div class="update-orig">طلب أصلي: ${originalOrderNumber}</div>` : ''}`
    : '';

  // ── Items table rows ──────────────────────────────────────────────────────
  let itemRowsHtml = '';
  for (const item of items) {
    itemRowsHtml += `
      <tr>
        <td class="col-name">${item.name}</td>
        <td class="col-qty">× ${item.quantity}</td>
      </tr>`;

    // Notes / modifications
    if (item.notes && item.notes.trim()) {
      itemRowsHtml += `
      <tr class="notes-row">
        <td colspan="2">${item.notes}</td>
      </tr>`;
    }
  }

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <style>
    /* ── Kitchen — matches C# isKitchen=true branch in PrintService.cs ── */
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Tahoma', 'Arial Unicode MS', 'Segoe UI', Arial, sans-serif;
      font-size: 16px;           /* matches C# baseFontSize=16 for kitchen */
      font-weight: 900;          /* matches C# FontWeight=ExtraBold */
      color: #000;
      background: #fff;
      direction: rtl;
      width: 284px;              /* matches C# PageWidth=300, inner content */
      padding: 8px;              /* matches C# PagePadding=8 all sides */
    }

    /* ── Update badge ── */
    .update-badge {
      text-align: center;
      font-size: 17px;
      font-weight: 900;
      background: #000;
      color: #fff;
      padding: 3px 6px;
      margin-bottom: 3px;
    }
    .update-orig {
      text-align: center;
      font-size: 14px;
      margin-bottom: 2px;
    }

    /* ── Section header [text] — ExtraBold, center, font+1 ── */
    .section-header {
      text-align: center;
      font-weight: 900;
      font-size: 17px;
      margin: 1px 0;
    }

    /* ── Separator ── */
    .sep {
      text-align: center;
      font-weight: 900;
      margin: 2px 0;
      overflow: hidden;
      white-space: nowrap;
    }

    /* ── Info lines ── */
    .info {
      font-weight: 900;
      font-size: 16px;
      margin: 2px 0;
      text-align: right;
    }

    /* ── Order number — huge, prominent ── */
    .order-number {
      text-align: center;
      font-size: 28px;
      font-weight: 900;
      margin: 4px 0;
      border: 2px solid #000;
      padding: 2px 6px;
    }

    /* ── Kitchen table — 2 columns: 3* name | 1* qty
         matches C# kitchen columnsCount=2, col[0]=3*, col[1]=1* ── */
    table {
      width: 100%;
      border-collapse: collapse;
      direction: rtl;
      margin: 3px 0;
    }
    th, td {
      border: 0.75px solid #000;
      font-weight: 900;
    }
    thead th {
      background: #D3D3D3;        /* Gainsboro */
      text-align: center;
      padding: 4px 2px;           /* matches C# Thickness(4,2,4,2) for kitchen */
    }
    tbody td {
      padding: 4px 2px;           /* matches C# Thickness(4,2,4,2) for kitchen */
    }

    /* Column widths — matches C# col[0]=3*, col[1]=1* → 75% / 25% */
    .col-name {
      text-align: right;
      width: 75%;
      font-size: 18px;            /* matches C# isKitchen && colIndex==0 → baseFontSize+2 */
      font-weight: 900;
    }
    .col-qty {
      text-align: center;
      width: 25%;
      font-size: 16px;
    }

    /* Note sub-rows */
    .notes-row td {
      font-size: 13px;
      font-weight: bold;
      border-top: none;
      border-bottom: none;
      text-align: right;
      padding-right: 10px;
    }
  </style>
</head>
<body>

  ${updateBadge}

  <div class="section-header">[بطاقة مطبخ]</div>
  <div class="sep">${SEP}</div>

  <div class="order-number">${orderNumber}</div>

  <div class="info">النوع: ${typeLabel}</div>
  <div class="info">الوقت: ${dateStr}</div>
  ${hallName    ? `<div class="info">القاعة: ${hallName}</div>`    : ''}
  ${tableNumber ? `<div class="info">الطاولة: ${tableNumber}</div>`: ''}
  ${customerName  ? `<div class="info">العميل: ${customerName}</div>` : ''}
  ${customerPhone ? `<div class="info">الهاتف: ${customerPhone}</div>`: ''}

  <div class="sep">${SEP}</div>

  <table>
    <thead>
      <tr>
        <th class="col-name">الصنف</th>
        <th class="col-qty">الكمية</th>
      </tr>
    </thead>
    <tbody>
      ${itemRowsHtml}
    </tbody>
  </table>

  <div class="sep">${SEP}</div>

</body>
</html>`;
}

module.exports = { buildKitchenHTML };

/**
 * utils/builders/kitchen.ts
 *
 * Browser-side kitchen ticket HTML builder for QZ Tray.
 * Identical layout to the Node.js print-agent kitchen.js builder.
 */

import type { KitchenData } from '../printService';
import type { PrintConfig } from '../printConfig';

const SEP = '------------------------------------------';

const TYPE_LABELS: Record<string, string> = {
  DineIn:   'صالة',
  Takeaway: 'سفري',
  Delivery: 'توصيل',
};

/**
 * Builds a standalone HTML document for a kitchen ticket.
 * Returns the full HTML string ready to hand to QZ Tray.
 */
export function buildKitchenHTML(data: KitchenData, cfg: PrintConfig): string {
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

  const dateStr = new Date(createdAt ?? new Date()).toLocaleString('ar-EG', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const typeLabel = TYPE_LABELS[orderType] ?? orderType ?? '';

  const updateBadge = isUpdate
    ? `<div class="update-badge">🔄 تعديل طلب${version ? ` (v${version})` : ''}</div>
       ${originalOrderNumber ? `<div class="update-orig">طلب أصلي: ${originalOrderNumber}</div>` : ''}`
    : '';

  let itemRowsHtml = '';
  for (const item of items) {
    itemRowsHtml += `
      <tr>
        <td class="col-name">${item.name}</td>
        <td class="col-qty">× ${item.quantity}</td>
      </tr>`;
    if (item.notes?.trim()) {
      itemRowsHtml += `
      <tr class="notes-row">
        <td colspan="2">${item.notes}</td>
      </tr>`;
    }
  }

  // Kitchen uses 80 mm → 284px content, same as print-agent
  const paperPx = (cfg.paperWidthMm ?? 80) >= 80 ? 284 : 200;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Tahoma', 'Arial Unicode MS', 'Segoe UI', Arial, sans-serif;
      font-size: 16px;
      font-weight: 900;
      color: #000;
      background: #fff;
      direction: rtl;
      width: ${paperPx}px;
      padding: 8px;
    }
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
    .section-header {
      text-align: center;
      font-weight: 900;
      font-size: 17px;
      margin: 1px 0;
    }
    .sep {
      text-align: center;
      font-weight: 900;
      margin: 2px 0;
      overflow: hidden;
      white-space: nowrap;
    }
    .info {
      font-weight: 900;
      font-size: 16px;
      margin: 2px 0;
      text-align: right;
    }
    .order-number {
      text-align: center;
      font-size: 28px;
      font-weight: 900;
      margin: 4px 0;
      border: 2px solid #000;
      padding: 2px 6px;
    }
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
      background: #D3D3D3;
      text-align: center;
      padding: 4px 2px;
    }
    tbody td { padding: 4px 2px; }
    .col-name {
      text-align: right;
      width: 75%;
      font-size: 18px;
      font-weight: 900;
    }
    .col-qty {
      text-align: center;
      width: 25%;
      font-size: 16px;
    }
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
  ${hallName      ? `<div class="info">القاعة: ${hallName}</div>`    : ''}
  ${tableNumber   ? `<div class="info">الطاولة: ${tableNumber}</div>`: ''}
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
    <tbody>${itemRowsHtml}</tbody>
  </table>

  <div class="sep">${SEP}</div>

</body>
</html>`;
}

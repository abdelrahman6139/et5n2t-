/**
 * utils/builders/receipt.ts
 *
 * Browser-side customer receipt HTML builder for QZ Tray.
 * Produces the identical layout as the Node.js print-agent builder.
 *
 * Key difference from the Node.js version:
 *   - Logo is passed as a data-URL string (from PrintConfig.logoDataUrl)
 *   - QR code is generated in browser via the `qrcode` npm package (canvas)
 *   - No Node.js `fs` or `path` usage
 */

import QRCode from 'qrcode';
import type { ReceiptData } from '../printService';
import type { PrintConfig } from '../printConfig';

const SEP = '------------------------------------------';

/**
 * Builds a standalone HTML document for a customer receipt.
 * Returns the full HTML string ready to hand to QZ Tray.
 */
export async function buildReceiptHTML(
  data: ReceiptData,
  cfg: PrintConfig,
): Promise<string> {
  const {
    orderNumber,
    createdAt,
    salesCenterLabel,
    tableNumber,
    hallName,
    paymentLabel,
    items = [],
    subtotal = 0,
    tax,
    deliveryFee,
    serviceCharge,
    total = 0,
    customerName,
    customerPhone,
    customerAddress,
    driverName,
  } = data;

  // ── Date ─────────────────────────────────────────────────────────────────
  const dateStr = new Date(createdAt ?? new Date()).toLocaleString('ar-EG', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  // ── Logo ─────────────────────────────────────────────────────────────────
  const logoHtml = cfg.logoDataUrl
    ? `<img class="logo" src="${cfg.logoDataUrl}" alt="" />`
    : '';

  // ── Restaurant header ─────────────────────────────────────────────────────
  const restaurantHtml   = cfg.restaurantName    ? `<div class="title">${cfg.restaurantName}</div>` : '';
  const restaurantPhone  = cfg.restaurantPhone   ? `<div class="info center">${cfg.restaurantPhone}</div>` : '';
  const restaurantAddr   = cfg.restaurantAddress ? `<div class="info center">${cfg.restaurantAddress}</div>` : '';

  // ── Items table rows ──────────────────────────────────────────────────────
  let itemRowsHtml = '';
  for (const item of items) {
    const lineTotal = typeof item.lineTotal === 'number' ? item.lineTotal : 0;
    itemRowsHtml += `
      <tr>
        <td class="col-name">${item.name}</td>
        <td class="col-qty">${item.quantity}</td>
        <td class="col-total">${lineTotal.toFixed(2)}</td>
      </tr>`;

    if (item.noteOptions && item.noteOptions.length > 0) {
      for (const opt of item.noteOptions) {
        const priceStr = opt.price > 0 ? ` (+${Number(opt.price).toFixed(2)})` : '';
        itemRowsHtml += `
      <tr class="notes-row">
        <td colspan="3">✓ ${opt.name}${priceStr}</td>
      </tr>`;
      }
    }

    if (item.notes?.trim()) {
      itemRowsHtml += `
      <tr class="notes-row">
        <td colspan="3">${item.notes}</td>
      </tr>`;
    }
  }

  // ── Totals section ────────────────────────────────────────────────────────
  const fmt = (v: number | undefined | null) => Number(v ?? 0).toFixed(2);

  let totalsHtml = `
    <div class="row-pair">
      <span>المجموع الفرعي</span>
      <span>${fmt(subtotal)} ج.م</span>
    </div>`;

  if (tax && Number(tax) > 0) {
    totalsHtml += `
    <div class="row-pair">
      <span>ضريبة القيمة المضافة</span>
      <span>${fmt(tax as number)} ج.م</span>
    </div>`;
  }
  if (serviceCharge && Number(serviceCharge) > 0) {
    totalsHtml += `
    <div class="row-pair">
      <span>رسوم الخدمة</span>
      <span>${fmt(serviceCharge as number)} ج.م</span>
    </div>`;
  }
  if (deliveryFee && Number(deliveryFee) > 0) {
    totalsHtml += `
    <div class="row-pair">
      <span>رسوم التوصيل</span>
      <span>${fmt(deliveryFee as number)} ج.م</span>
    </div>`;
  }

  // ── QR Code (delivery address) ────────────────────────────────────────────
  let qrHtml = '';
  if (customerAddress?.trim()) {
    try {
      const qrDataUri = await QRCode.toDataURL(customerAddress.trim(), {
        width: 180,
        margin: 1,
        errorCorrectionLevel: 'Q',
      });
      qrHtml = `
    <div class="sep">${SEP}</div>
    <div class="section-header">[QR لموقع العميل]</div>
    <img class="qr-img" src="${qrDataUri}" alt="QR" />`;
    } catch { /* skip QR on error */ }
  }

  // ── Paper width ───────────────────────────────────────────────────────────
  const paperPx = (cfg.paperWidthMm ?? 80) >= 80 ? 272 : 192;

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
    .center   { text-align: center; }
    .logo {
      display: block;
      width: 240px;
      max-width: 100%;
      margin: 0 auto 6px auto;
      object-fit: contain;
    }
    .title {
      text-align: center;
      font-weight: 900;
      font-size: 16px;
      margin: 2px 0;
    }
    .section-header {
      text-align: center;
      font-weight: 900;
      font-size: 15px;
      margin: 1px 0;
    }
    .sep {
      text-align: center;
      font-weight: bold;
      margin: 1px 0;
      overflow: hidden;
      white-space: nowrap;
    }
    .info {
      font-weight: bold;
      font-size: 14px;
      margin: 1px 0;
      text-align: right;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      direction: rtl;
      margin: 2px 0;
    }
    th, td {
      border: 0.75px solid #000;
      font-weight: bold;
    }
    thead th {
      background: #D3D3D3;
      text-align: center;
      font-weight: 900;
      padding: 1px 2px;
    }
    tbody td { padding: 1px 2px; }
    .col-name  { text-align: right;  width: 67%; }
    .col-qty   { text-align: center; width: 13%; }
    .col-total { text-align: center; width: 20%; }
    .notes-row td {
      font-size: 12px;
      font-weight: normal;
      border-top: none;
      border-bottom: none;
      text-align: right;
      padding-right: 10px;
      padding-left: 2px;
    }
    .row-pair {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: bold;
      font-size: 14px;
      margin: 1px 0;
    }
    .grand-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 900;
      font-size: 17px;
      margin: 2px 0;
    }
    .qr-img {
      display: block;
      width: 180px;
      height: 180px;
      margin: 4px auto 6px auto;
      object-fit: contain;
    }
    .footer {
      text-align: center;
      font-weight: bold;
      font-size: 14px;
      margin: 1px 0;
    }
  </style>
</head>
<body>

  ${logoHtml}
  ${restaurantHtml}
  ${restaurantPhone}
  ${restaurantAddr}

  <div class="section-header">[فاتورة]</div>
  <div class="sep">${SEP}</div>

  <div class="info">رقم الطلب: ${orderNumber}</div>
  <div class="info">التاريخ: ${dateStr}</div>
  ${salesCenterLabel ? `<div class="info">النوع: ${salesCenterLabel}</div>` : ''}
  ${hallName        ? `<div class="info">القاعة: ${hallName}</div>`         : ''}
  ${tableNumber     ? `<div class="info">الطاولة: ${tableNumber}</div>`     : ''}
  ${paymentLabel    ? `<div class="info">الدفع: ${paymentLabel}</div>`      : ''}
  ${customerName    ? `<div class="info">العميل: ${customerName}</div>`     : ''}
  ${customerPhone   ? `<div class="info">الهاتف: ${customerPhone}</div>`    : ''}
  ${customerAddress ? `<div class="info">العنوان: ${customerAddress}</div>` : ''}
  ${driverName      ? `<div class="info">السائق: ${driverName}</div>`       : ''}

  <div class="sep">${SEP}</div>

  <table>
    <thead>
      <tr>
        <th class="col-name">الصنف</th>
        <th class="col-qty">ك</th>
        <th class="col-total">المجموع</th>
      </tr>
    </thead>
    <tbody>${itemRowsHtml}</tbody>
  </table>

  <div class="sep">${SEP}</div>

  ${totalsHtml}

  <div class="sep">${SEP}</div>

  <div class="grand-total">
    <span>الإجمالي</span>
    <span>${fmt(total)} ج.م</span>
  </div>

  <div class="sep">${SEP}</div>
  <div class="footer">${cfg.footerMessage || 'شكراً لزيارتكم'}</div>
  <div class="sep">${SEP}</div>

  ${qrHtml}

</body>
</html>`;
}

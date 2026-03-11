/**
 * builders/receipt.js
 *
 * Builds customer receipt HTML that matches PrintService.cs format exactly:
 *  - Same font family (Tahoma / Arial Unicode MS)
 *  - Same 3-column items table (67% name | 13% qty | 20% total)
 *  - Same Gainsboro (#D3D3D3) header row background
 *  - Same 0.75px cell borders
 *  - Same separator style "------------------------------------------"
 *  - Same section headers [text] centered ExtraBold
 *  - Logo at top (if configured)
 *  - QR code at bottom for delivery orders
 *  - Full RTL Arabic layout, font-weight bold throughout
 */

'use strict';

const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const SEP = '------------------------------------------';

/**
 * @param {object} data  ReceiptData from printService.ts
 * @param {object} cfg   config.json content
 * @returns {Promise<string>} HTML string ready for Puppeteer
 */
async function buildReceiptHTML(data, cfg) {
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
  const dateStr = createdAt
    ? new Date(createdAt).toLocaleString('ar-EG', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });

  // ── Logo ─────────────────────────────────────────────────────────────────
  let logoHtml = '';
  if (cfg.logoPath) {
    try {
      const logoData = fs.readFileSync(cfg.logoPath);
      const ext = path.extname(cfg.logoPath).toLowerCase().replace('.', '');
      const mime = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
      const b64 = logoData.toString('base64');
      logoHtml = `<img class="logo" src="data:${mime};base64,${b64}" alt="" />`;
    } catch (e) {
      console.warn('[receipt] Logo not loaded:', e.message);
    }
  }

  // ── Restaurant header ─────────────────────────────────────────────────────
  const restaurantHtml = cfg.restaurantName
    ? `<div class="title">${cfg.restaurantName}</div>`
    : '';
  const restaurantPhone = cfg.restaurantPhone
    ? `<div class="info center">${cfg.restaurantPhone}</div>`
    : '';
  const restaurantAddress = cfg.restaurantAddress
    ? `<div class="info center">${cfg.restaurantAddress}</div>`
    : '';

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

    // Note options (like C# — each on own sub-row)
    if (item.noteOptions && item.noteOptions.length > 0) {
      for (const opt of item.noteOptions) {
        const priceStr = opt.price > 0 ? ` (+${Number(opt.price).toFixed(2)})` : '';
        itemRowsHtml += `
      <tr class="notes-row">
        <td colspan="3">✓ ${opt.name}${priceStr}</td>
      </tr>`;
      }
    }

    // Free-text note
    if (item.notes && item.notes.trim()) {
      itemRowsHtml += `
      <tr class="notes-row">
        <td colspan="3">${item.notes}</td>
      </tr>`;
    }
  }

  // ── Totals section ────────────────────────────────────────────────────────
  const fmt = (v) => Number(v || 0).toFixed(2);

  let totalsHtml = `
    <div class="row-pair">
      <span>المجموع الفرعي</span>
      <span>${fmt(subtotal)} ج.م</span>
    </div>`;

  if (tax && Number(tax) > 0) {
    totalsHtml += `
    <div class="row-pair">
      <span>ضريبة القيمة المضافة</span>
      <span>${fmt(tax)} ج.م</span>
    </div>`;
  }
  if (serviceCharge && Number(serviceCharge) > 0) {
    totalsHtml += `
    <div class="row-pair">
      <span>رسوم الخدمة</span>
      <span>${fmt(serviceCharge)} ج.م</span>
    </div>`;
  }
  if (deliveryFee && Number(deliveryFee) > 0) {
    totalsHtml += `
    <div class="row-pair">
      <span>رسوم التوصيل</span>
      <span>${fmt(deliveryFee)} ج.م</span>
    </div>`;
  }

  // ── QR Code (delivery address) ────────────────────────────────────────────
  let qrHtml = '';
  if (customerAddress && customerAddress.trim()) {
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
    } catch (e) {
      console.warn('[receipt] QR generation failed:', e.message);
    }
  }

  // ── Final HTML ────────────────────────────────────────────────────────────
  const paperPx = cfg.paperWidthMm >= 80 ? 272 : 192; // 80mm ≈ 272px usable; 58mm ≈ 192px usable

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <style>
    /* ── Base — matches PrintService.cs FlowDocument settings ── */
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Tahoma', 'Arial Unicode MS', 'Segoe UI', Arial, sans-serif;
      font-size: 14px;
      font-weight: bold;
      color: #000;
      background: #fff;
      direction: rtl;
      width: ${paperPx}px;
      padding: 4px 4px 2px 4px;  /* matches C# PagePadding 4,2,4,2 */
    }

    /* ── Layout helpers ── */
    .center   { text-align: center; }
    .right    { text-align: right; }

    /* ── Logo — matches C# image.Width=240, HAlign=Center, Margin=0,0,0,6 ── */
    .logo {
      display: block;
      width: 240px;
      max-width: 100%;
      margin: 0 auto 6px auto;
      object-fit: contain;
    }

    /* ── Restaurant name / title ── */
    .title {
      text-align: center;
      font-weight: 900;
      font-size: 16px;
      margin: 2px 0;
    }

    /* ── "فاتورة" label — matches [bracket] sections: ExtraBold, 15px, center ── */
    .section-header {
      text-align: center;
      font-weight: 900;
      font-size: 15px;
      margin: 1px 0;
    }

    /* ── Separator — matches "------------------------------------------" ── */
    .sep {
      text-align: center;
      font-weight: bold;
      margin: 1px 0;
      overflow: hidden;
      white-space: nowrap;
    }

    /* ── Info lines (order#, date, type, table, …) ── */
    .info {
      font-weight: bold;
      font-size: 14px;
      margin: 1px 0;
      text-align: right;
    }

    /* ── Items table — matches C# Table with 3 TableColumns ──
       Col ratios from C#: 3.5* / 0.7* / 1.0* = 67.3% / 13.5% / 19.2%  */
    table {
      width: 100%;
      border-collapse: collapse;
      direction: rtl;
      margin: 2px 0;
    }
    th, td {
      border: 0.75px solid #000;   /* matches C# BorderThickness(0.75) */
      font-weight: bold;
    }
    /* Header row — matches C# isHeaderRow → Background=Gainsboro */
    thead th {
      background: #D3D3D3;         /* Gainsboro exactly */
      text-align: center;
      font-weight: 900;
      padding: 1px 2px;            /* matches C# Thickness(2,1,2,1) */
    }
    /* Body cells — matches C# Padding(2,1,2,1) */
    tbody td {
      padding: 1px 2px;
    }
    /* Column widths */
    .col-name  { text-align: right;  width: 67%; }
    .col-qty   { text-align: center; width: 13%; }
    .col-total { text-align: center; width: 20%; }

    /* Note sub-rows — matches C# 12px non-bold sub-text */
    .notes-row td {
      font-size: 12px;
      font-weight: normal;
      border-top: none;
      border-bottom: none;
      text-align: right;
      padding-right: 10px;
      padding-left: 2px;
    }

    /* ── Totals rows (row-pair) ── */
    .row-pair {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: bold;
      font-size: 14px;
      margin: 1px 0;
    }

    /* ── Grand total — matches C# bigger + bolder ── */
    .grand-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 900;
      font-size: 17px;
      margin: 2px 0;
    }

    /* ── QR image — matches C# qrImage.Width=180, Height=180, HAlign=Center ── */
    .qr-img {
      display: block;
      width: 180px;
      height: 180px;
      margin: 4px auto 6px auto;
      object-fit: contain;
    }

    /* ── Footer ── */
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
  ${restaurantAddress}

  <div class="section-header">[فاتورة]</div>
  <div class="sep">${SEP}</div>

  <div class="info">رقم الطلب: ${orderNumber}</div>
  <div class="info">التاريخ: ${dateStr}</div>
  ${salesCenterLabel ? `<div class="info">النوع: ${salesCenterLabel}</div>` : ''}
  ${hallName       ? `<div class="info">القاعة: ${hallName}</div>`         : ''}
  ${tableNumber    ? `<div class="info">الطاولة: ${tableNumber}</div>`     : ''}
  ${paymentLabel   ? `<div class="info">الدفع: ${paymentLabel}</div>`      : ''}
  ${customerName   ? `<div class="info">العميل: ${customerName}</div>`     : ''}
  ${customerPhone  ? `<div class="info">الهاتف: ${customerPhone}</div>`    : ''}
  ${customerAddress? `<div class="info">العنوان: ${customerAddress}</div>` : ''}
  ${driverName     ? `<div class="info">السائق: ${driverName}</div>`       : ''}

  <div class="sep">${SEP}</div>

  <table>
    <thead>
      <tr>
        <th class="col-name">الصنف</th>
        <th class="col-qty">ك</th>
        <th class="col-total">المجموع</th>
      </tr>
    </thead>
    <tbody>
      ${itemRowsHtml}
    </tbody>
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

module.exports = { buildReceiptHTML };

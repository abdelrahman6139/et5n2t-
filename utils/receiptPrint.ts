/**
 * receiptPrint.ts
 * Shared receipt / kitchen-ticket HTML generators.
 * Design mirrors the C# WPF PrintService:
 *   - 80 mm thermal roll
 *   - RTL, Arial Unicode MS / Segoe UI / Tahoma
 *   - Bold (14 px) for receipts | ExtraBold (16 px) for kitchen
 *   - Real bordered table for items (Gainsboro header, 0.75 px cell borders)
 *   - Dashed separators
 *   - Totals box with grand-total line
 *   - Prominent delivery address box for delivery orders
 *   - Note options + free-text notes shown as item sub-rows
 */

// ─── helpers ────────────────────────────────────────────────────────────────

export const escHtml = (v: any): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const fmt = (n: number | string | undefined | null, decimals = 2): string =>
  Number(n ?? 0)
    .toFixed(decimals)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const safeDate = (d: Date | string | null | undefined): Date => {
  if (!d) return new Date();
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

const fmtDate = (d: Date | string | null | undefined): string =>
  new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(safeDate(d));

const fmtTime = (d: Date | string | null | undefined): string =>
  new Intl.DateTimeFormat('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(safeDate(d));

// ─── CSS ─────────────────────────────────────────────────────────────────────

const BASE_FONT = `'Arial Unicode MS', 'Segoe UI', Tahoma, Arial, sans-serif`;

const RECEIPT_CSS = `
  @page { size: 80mm auto; margin: 2mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: ${BASE_FONT};
    font-size: 14px;
    font-weight: 700;
    direction: rtl;
    background: #fff;
    color: #000;
    width: 80mm;
  }
  .wrap { width: 76mm; margin: 0 auto; padding: 3px 2px; }
  .center { text-align: center; }

  /* Header */
  .biz-name {
    font-size: 22px;
    font-weight: 900;
    text-align: center;
    letter-spacing: 1px;
    margin-bottom: 2px;
  }
  .biz-sub {
    font-size: 12px;
    font-weight: 700;
    text-align: center;
    margin-bottom: 2px;
  }
  .receipt-title {
    font-size: 15px;
    font-weight: 900;
    text-align: center;
    letter-spacing: 0.5px;
  }

  /* Separators */
  .sep {
    border: none;
    border-top: 1px dashed #000;
    margin: 5px 0;
  }

  /* Meta rows */
  .meta {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 2px 0;
    font-size: 13px;
    gap: 4px;
  }
  .meta .lbl { font-weight: 900; white-space: nowrap; }
  .meta .val { text-align: left; font-weight: 700; word-break: break-word; }

  /* Delivery address box – shown before items for delivery orders */
  .delivery-box {
    border: 2px solid #000;
    padding: 5px 6px;
    margin: 5px 0;
    background: #f0f0f0;
  }
  .delivery-box .d-title {
    font-size: 13px;
    font-weight: 900;
    text-align: center;
    margin-bottom: 4px;
    border-bottom: 1px dashed #000;
    padding-bottom: 3px;
  }
  .delivery-box .d-row {
    display: flex;
    align-items: flex-start;
    gap: 4px;
    font-size: 13px;
    padding: 2px 0;
    font-weight: 700;
  }
  .delivery-box .d-row .d-lbl { font-weight: 900; white-space: nowrap; min-width: 48px; }

  /* Items table */
  .itbl {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 13px;
    margin: 2px 0;
  }
  .itbl th,
  .itbl td {
    border: 0.75px solid #000;
    padding: 3px 4px;
    word-break: break-word;
    vertical-align: top;
  }
  .itbl th {
    text-align: center;
    font-weight: 900;
    font-size: 13px;
    background: #DCDCDC;
  }
  .itbl .cn { width: 65%; text-align: right; font-weight: 900; }
  .itbl .cq { width: 12%; text-align: center; }
  .itbl .ct { width: 23%; text-align: center; }

  /* Note-option sub-rows (grey background) */
  .itbl .sub td {
    border-top: none;
    font-size: 11.5px;
    padding: 1px 8px;
    background: #f5f5f5;
    font-weight: 700;
    color: #222;
  }
  /* Free-text note sub-rows (warm background, italic) */
  .itbl .sub-note td {
    border-top: none;
    font-size: 11.5px;
    padding: 1px 8px;
    background: #fff8e1;
    font-weight: 700;
    color: #555;
    font-style: italic;
  }

  /* Totals box */
  .totals {
    border: 1.5px solid #000;
    padding: 5px 6px;
    margin-top: 5px;
  }
  .totals .row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    padding: 2px 0;
  }
  .totals .row .lbl { font-weight: 900; }
  .totals .row .val { font-weight: 700; }
  .totals .grand {
    display: flex;
    justify-content: space-between;
    font-size: 17px;
    font-weight: 900;
    border-top: 1.5px dashed #000;
    padding-top: 5px;
    margin-top: 5px;
  }

  /* Customer info box at footer */
  .cust-box {
    border: 1px dashed #000;
    padding: 4px 6px;
    margin: 5px 0;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.7;
  }
  .cust-box .c-row { display: flex; gap: 4px; align-items: flex-start; }
  .cust-box .c-row .c-lbl { font-weight: 900; white-space: nowrap; }

  /* Footer */
  .thankyou {
    font-size: 15px;
    font-weight: 900;
    text-align: center;
    margin-top: 6px;
    letter-spacing: 1px;
  }
  .footer {
    text-align: center;
    font-size: 12px;
    margin-top: 4px;
    font-weight: 700;
    line-height: 1.6;
  }

  @media print { body { width: 80mm; } }
`;

const KITCHEN_CSS = `
  @page { size: 80mm auto; margin: 1mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: ${BASE_FONT};
    font-size: 16px;
    font-weight: 900;
    direction: rtl;
    background: #fff;
    color: #000;
    width: 80mm;
  }
  .wrap { width: 76mm; margin: 0 auto; padding: 5px 3px; }
  .center { text-align: center; }
  .sep { border: none; border-top: 1px dashed #000; margin: 5px 0; }

  /* Update banner */
  .update-banner {
    border: 3px dashed #000;
    padding: 8px;
    text-align: center;
    margin-bottom: 8px;
  }
  .update-banner .upd-title {
    font-size: 18px;
    font-weight: 900;
    margin-bottom: 4px;
  }
  .update-banner .upd-ver {
    font-size: 24px;
    font-weight: 900;
    background: #f0f0f0;
    border: 2px solid #000;
    padding: 4px 0;
    margin: 6px 0;
  }
  .update-banner .upd-ref {
    font-size: 13px;
    background: #e0e0e0;
    border: 1px solid #000;
    padding: 4px;
  }

  .heading    { font-size: 20px; font-weight: 900; text-align: center; }
  .order-no   { font-size: 24px; font-weight: 900; text-align: center; margin: 6px 0; letter-spacing: 2px; }
  .order-type { font-size: 18px; font-weight: 900; text-align: center; margin-bottom: 4px; }

  .meta-line { display: flex; justify-content: space-between; font-size: 14px; padding: 2px 0; }
  .meta-line .lbl { font-weight: 900; }

  /* Delivery address box in kitchen ticket */
  .delivery-box {
    border: 2px solid #000;
    padding: 5px 6px;
    margin: 5px 0;
    background: #f0f0f0;
  }
  .delivery-box .d-title { font-size: 14px; font-weight: 900; text-align: center; margin-bottom: 3px; border-bottom: 1px dashed #000; padding-bottom: 2px; }
  .delivery-box .d-row { display: flex; gap: 4px; font-size: 13px; padding: 2px 0; font-weight: 700; }
  .delivery-box .d-row .d-lbl { font-weight: 900; white-space: nowrap; min-width: 48px; }

  /* Items table */
  .itbl {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 15px;
    margin: 2px 0;
  }
  .itbl th,
  .itbl td {
    border: 1px solid #000;
    padding: 5px 5px;
    word-break: break-word;
    vertical-align: top;
  }
  .itbl th {
    text-align: center;
    font-weight: 900;
    font-size: 15px;
    background: #DCDCDC;
  }
  .itbl .cn { width: 75%; text-align: right; font-size: 16px; font-weight: 900; }
  .itbl .cq { width: 25%; text-align: center; font-size: 16px; font-weight: 900; }
  /* Option sub-rows */
  .itbl .sub td {
    border-top: none;
    font-size: 13px;
    padding: 3px 10px;
    font-weight: 700;
    background: #f5f5f5;
  }
  /* Free-text note sub-rows */
  .itbl .sub-note td {
    border-top: none;
    font-size: 13px;
    padding: 3px 10px;
    font-weight: 700;
    background: #fff8e1;
    font-style: italic;
  }

  .footer { text-align: center; font-size: 13px; margin-top: 6px; line-height: 1.6; }
  @media print { body { width: 80mm; } }
`;

// ─── Print helpers ───────────────────────────────────────────────────────────

let _printQueue: string[] = [];
let _printing = false;

const PRINT_STYLE_ID = '__receipt_print_style__';

const ensurePrintStyle = (): void => {
  if (document.getElementById(PRINT_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PRINT_STYLE_ID;
  style.textContent = `
    @media screen { iframe.__rp__ { display: none !important; } }
    @media print  {
      body > *:not(iframe.__rp__.__rp_active__) { display: none !important; visibility: hidden !important; }
      iframe.__rp__.__rp_active__ {
        display: block !important; visibility: visible !important;
        position: fixed; inset: 0; width: 100%; height: 100%;
        border: none; background: #fff; z-index: 999999;
      }
    }
  `;
  document.head.appendChild(style);
};

const printNextInQueue = (): void => {
  if (_printing || _printQueue.length === 0) return;
  _printing = true;
  const html = _printQueue.shift()!;

  ensurePrintStyle();

  const iframe = document.createElement('iframe');
  iframe.className = '__rp__';
  iframe.setAttribute('srcdoc', html);
  document.body.appendChild(iframe);

  iframe.onload = () => {
    // Mark this iframe as the active print target
    document.querySelectorAll('iframe.__rp__').forEach(el => el.classList.remove('__rp_active__'));
    iframe.classList.add('__rp_active__');

    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.focus();
      window.print();
    }

    // After print dialog closes, clean up and print next in queue
    setTimeout(() => {
      iframe.remove();
      _printing = false;
      printNextInQueue();
    }, 1500);
  };
};

/**
 * Queue an HTML receipt for printing via a hidden iframe.
 * Multiple receipts (e.g. kitchen + customer) are printed sequentially,
 * each getting its own dedicated print dialog so nothing is lost.
 */
const inlinePrint = (html: string): void => {
  _printQueue.push(html);
  printNextInQueue();
};

/**
 * Try to send HTML to a named printer via the WPF WebView2 bridge.
 * Returns true if the bridge is available and the message was posted.
 */
const tryWebView2Print = (html: string, printerName: string, purpose: string): boolean => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const webview = (window as any).chrome?.webview;
    if (webview?.postMessage) {
      webview.postMessage(JSON.stringify({ type: 'print', html, printer: printerName, purpose }));
      return true;
    }
  } catch { /* not in WebView2 */ }
  return false;
};

/**
 * No-op shim kept for backward-compatibility with OrdersScreen which calls
 * openPrintWindow() before an await. Since inlinePrint needs no pre-opened
 * window, we just return null and writeAndPrint ignores the parameter.
 */
export const openPrintWindow = (): Window | null => null;

/**
 * Print receipt HTML. The `win` parameter is ignored (kept for API
 * compatibility); all printing goes through inlinePrint.
 */
export const writeAndPrint = (
  _win: Window | null,
  html: string,
  printerName = '',
  purpose = 'receipt',
): void => {
  if (tryWebView2Print(html, printerName, purpose)) return;
  inlinePrint(html);
};

/**
 * Print receipt HTML directly (for non-async call-sites).
 */
export const openAndPrint = (html: string, printerName = '', purpose = 'receipt'): void => {
  if (tryWebView2Print(html, printerName, purpose)) return;
  inlinePrint(html);
};

// ─── Customer Receipt ────────────────────────────────────────────────────────

export interface ReceiptLineItem {
  name: string;
  quantity: number;
  lineTotal: number;
  /** Selected note options array (preferred over legacy `options` string) */
  noteOptions?: { name: string; price: number }[];
  /** Free-text note typed by cashier */
  notes?: string;
  /** @deprecated legacy pre-formatted option string; use noteOptions[] instead */
  options?: string;
}

export interface CustomerReceiptOptions {
  restaurantName?: string;
  restaurantPhone?: string;
  orderNumber: string | number;
  createdAt: Date | string | null | undefined;
  /** Arabic label: 'صالة' | 'سفري' | 'توصيل' */
  salesCenterLabel: string;
  tableNumber?: string;
  hallName?: string;
  paymentLabel: string;
  cashierName?: string;
  items: ReceiptLineItem[];
  subtotal: number;
  tax: number;
  deliveryFee?: number;
  serviceCharge?: number;
  total: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  /** Name of the delivery driver assigned to this order */
  driverName?: string;
}

export const buildCustomerReceiptHTML = (opts: CustomerReceiptOptions): string => {
  const {
    restaurantName = 'مطعم الأصالة',
    restaurantPhone,
    orderNumber,
    createdAt,
    salesCenterLabel,
    tableNumber,
    hallName,
    paymentLabel,
    cashierName,
    items,
    subtotal,
    tax,
    deliveryFee = 0,
    serviceCharge = 0,
    total,
    customerName,
    customerPhone,
    customerAddress,
    driverName,
  } = opts;

  const isDelivery   = salesCenterLabel === 'توصيل';
  const showDelivery = Number(deliveryFee) > 0;
  const showService  = Number(serviceCharge) > 0;
  const taxPct       = subtotal > 0 ? Math.round((tax / subtotal) * 100) : 0;

  // ── Build item rows ──────────────────────────────────────────────────────
  const itemRowsHtml = items.map(it => {
    // Build option sub-rows
    const optSubRows: string[] = [];
    if (Array.isArray(it.noteOptions) && it.noteOptions.length > 0) {
      it.noteOptions.forEach(o => {
        const priceStr = Number(o.price) > 0 ? ` (+${Number(o.price).toFixed(2)})` : '';
        optSubRows.push(`<tr class="sub"><td colspan="3">&#x2713; ${escHtml(o.name)}${escHtml(priceStr)}</td></tr>`);
      });
    } else if (it.options && it.options.trim()) {
      // Legacy single string
      optSubRows.push(`<tr class="sub"><td colspan="3">&#x2713; ${escHtml(it.options)}</td></tr>`);
    }
    const noteRow = it.notes && it.notes.trim()
      ? `<tr class="sub-note"><td colspan="3">&#x1F4DD; ملاحظة: ${escHtml(it.notes)}</td></tr>`
      : '';
    return `
      <tr>
        <td class="cn">${escHtml(it.name)}</td>
        <td class="cq">${escHtml(it.quantity)}</td>
        <td class="ct">${fmt(it.lineTotal)}</td>
      </tr>
      ${optSubRows.join('')}${noteRow}`;
  }).join('');

  // ── Delivery info block (before items) ───────────────────────────────────
  const showDeliveryBlock = isDelivery && (
    (customerName && customerName !== 'Walk-in' && customerName !== 'زبون عادي') ||
    customerPhone ||
    customerAddress ||
    (driverName && driverName.trim())
  );
  const deliveryBlockHtml = showDeliveryBlock ? `
  <div class="delivery-box">
    <div class="d-title">&#x1F69A; معلومات التوصيل</div>
    ${customerName && customerName !== 'Walk-in' && customerName !== 'زبون عادي'
      ? `<div class="d-row"><span class="d-lbl">العميل:</span><span>${escHtml(customerName)}</span></div>` : ''}
    ${customerPhone
      ? `<div class="d-row"><span class="d-lbl">&#x1F4DE; هاتف:</span><span>${escHtml(customerPhone)}</span></div>` : ''}
    ${customerAddress
      ? `<div class="d-row"><span class="d-lbl">&#x1F4CD; عنوان:</span><span>${escHtml(customerAddress)}</span></div>` : ''}
    ${driverName && driverName.trim()
      ? `<div class="d-row"><span class="d-lbl">&#x1F6F5; السائق:</span><span>${escHtml(driverName)}</span></div>` : ''}
  </div>` : '';

  // ── Customer footer for non-delivery orders ───────────────────────────────
  const hasCustomerFooter = !isDelivery && (
    (customerName && customerName !== 'Walk-in' && customerName !== 'زبون عادي') ||
    customerPhone
  );
  const customerFooterHtml = hasCustomerFooter ? `
  <div class="cust-box">
    ${customerName && customerName !== 'Walk-in' && customerName !== 'زبون عادي'
      ? `<div class="c-row"><span class="c-lbl">العميل:</span><span>${escHtml(customerName)}</span></div>` : ''}
    ${customerPhone
      ? `<div class="c-row"><span class="c-lbl">&#x1F4DE;:</span><span>${escHtml(customerPhone)}</span></div>` : ''}
  </div>
  <hr class="sep" />` : '';

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <title>فاتورة - ${escHtml(orderNumber)}</title>
  <style>${RECEIPT_CSS}</style>
</head>
<body>
<div class="wrap">

  <!-- ══ Header ══ -->
  <div class="biz-name">${escHtml(restaurantName)}</div>
  ${restaurantPhone ? `<div class="biz-sub">&#x1F4DE; ${escHtml(restaurantPhone)}</div>` : ''}
  <div class="receipt-title">&#x1F9FE; فاتورة مبيعات</div>
  <hr class="sep" />

  <!-- ══ Order meta ══ -->
  <div class="meta"><span class="lbl">رقم الطلب</span><span class="val">${escHtml(orderNumber)}</span></div>
  <div class="meta"><span class="lbl">التاريخ</span><span class="val">${fmtDate(createdAt)}</span></div>
  <div class="meta"><span class="lbl">الوقت</span><span class="val">${fmtTime(createdAt)}</span></div>
  <div class="meta"><span class="lbl">نوع الطلب</span><span class="val">${escHtml(salesCenterLabel)}</span></div>
  ${tableNumber ? `<div class="meta"><span class="lbl">الطاولة</span><span class="val">${escHtml(tableNumber)}</span></div>` : ''}
  ${hallName    ? `<div class="meta"><span class="lbl">الصالة</span><span class="val">${escHtml(hallName)}</span></div>`    : ''}
  <div class="meta"><span class="lbl">طريقة الدفع</span><span class="val">${escHtml(paymentLabel)}</span></div>
  ${cashierName ? `<div class="meta"><span class="lbl">الكاشير</span><span class="val">${escHtml(cashierName)}</span></div>` : ''}
  <hr class="sep" />

  <!-- ══ Delivery address (prominent, before items) ══ -->
  ${deliveryBlockHtml}

  <!-- ══ Items table ══ -->
  <table class="itbl">
    <thead>
      <tr>
        <th class="cn">الصنف</th>
        <th class="cq">الكمية</th>
        <th class="ct">الإجمالي</th>
      </tr>
    </thead>
    <tbody>
      ${itemRowsHtml}
    </tbody>
  </table>

  <!-- ══ Totals ══ -->
  <div class="totals">
    <div class="row"><span class="lbl">الإجمالي الفرعي</span><span class="val">${fmt(subtotal)}</span></div>
    ${taxPct > 0 ? `<div class="row"><span class="lbl">ضريبة (${taxPct}%)</span><span class="val">${fmt(tax)}</span></div>` : ''}
    ${showDelivery ? `<div class="row"><span class="lbl">رسوم التوصيل</span><span class="val">${fmt(deliveryFee)}</span></div>` : ''}
    ${showService  ? `<div class="row"><span class="lbl">رسوم الخدمة</span><span class="val">${fmt(serviceCharge)}</span></div>`  : ''}
    <div class="grand"><span>الإجمالي الكلي</span><span>${fmt(total)}</span></div>
  </div>

  <!-- ══ Customer footer (non-delivery) ══ -->
  <hr class="sep" />
  ${customerFooterHtml}
  <div class="thankyou">&#x2726; شكراً لطلبكم &#x2726;</div>
  <div class="footer" style="margin-top:4px">${fmtDate(createdAt)} &mdash; ${fmtTime(createdAt)}</div>

</div>
</body>
</html>`;
};

// ─── Kitchen Ticket ──────────────────────────────────────────────────────────

export interface KitchenTicketItem {
  name: string;
  quantity: number;
  /** Combined string of options + notes, e.g. "✓ بدون ثوم | ملاحظة: حار" */
  notes?: string;
}

export interface KitchenTicketOptions {
  orderNumber: string | number;
  createdAt: Date | string | null | undefined;
  orderType: 'DineIn' | 'Takeaway' | 'Delivery' | string;
  tableNumber?: string;
  hallName?: string;
  customerName?: string;
  customerPhone?: string;
  items: KitchenTicketItem[];
  isUpdate?: boolean;
  originalOrderNumber?: string | number;
  version?: number;
}

export const buildKitchenReceiptHTML = (opts: KitchenTicketOptions): string => {
  const {
    orderNumber,
    createdAt,
    orderType,
    tableNumber,
    hallName,
    customerName,
    customerPhone,
    items,
    isUpdate = false,
    originalOrderNumber,
    version = 2,
  } = opts;

  const orderTypeLabel =
    orderType === 'DineIn'    ? '🍽  صالة'
    : orderType === 'Takeaway' ? '🥡 سفري'
    : orderType === 'Delivery' ? '🚗 توصيل'
    : String(orderType);

  const updateBannerHtml = isUpdate ? `
  <div class="update-banner">
    <div class="upd-title">&#x26A0;&#xFE0F; تحديث طلب مطبخ &#x26A0;&#xFE0F;</div>
    <div class="upd-ver">النسخة ${version}</div>
    <div class="upd-ref">&#x1F4CB; مرجع الطلب: ${escHtml(originalOrderNumber ?? orderNumber)}</div>
  </div>` : '';

  // Build item rows — split notes by ' | ' into separate sub-rows
  const itemRowsHtml = items.map(it => {
    const noteLines = it.notes
      ? it.notes.split(' | ').map(n => n.trim()).filter(Boolean)
      : [];
    const noteRows = noteLines.map(line => {
      const isOpt = line.startsWith('✓');
      const cls   = isOpt ? 'sub' : 'sub-note';
      return `<tr class="${cls}"><td colspan="2">${escHtml(line)}</td></tr>`;
    }).join('');
    return `
      <tr>
        <td class="cn">${escHtml(it.name)}</td>
        <td class="cq">&#xD7; ${escHtml(it.quantity)}</td>
      </tr>
      ${noteRows}`;
  }).join('');

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <title>مطبخ - ${escHtml(orderNumber)}</title>
  <style>${KITCHEN_CSS}</style>
</head>
<body>
<div class="wrap">

  ${updateBannerHtml}

  <!-- ══ Header ══ -->
  <div class="heading">|| طلب مطبخ ||</div>
  <div class="order-no">${escHtml(orderNumber)}</div>
  <div class="order-type">${orderTypeLabel}</div>
  <hr class="sep" />

  <!-- ══ Info ══ -->
  ${tableNumber ? `<div class="meta-line"><span class="lbl">الطاولة</span><span>${escHtml(tableNumber)}</span></div>` : ''}
  ${hallName    ? `<div class="meta-line"><span class="lbl">الصالة</span><span>${escHtml(hallName)}</span></div>`    : ''}
  ${customerName && customerName !== 'Walk-in'
    ? `<div class="meta-line"><span class="lbl">العميل</span><span>${escHtml(customerName)}</span></div>` : ''}
  ${customerPhone
    ? `<div class="meta-line"><span class="lbl">الهاتف</span><span>${escHtml(customerPhone)}</span></div>` : ''}
  <div class="meta-line"><span class="lbl">التاريخ</span><span>${fmtDate(createdAt)}</span></div>
  <div class="meta-line"><span class="lbl">الوقت</span><span>${fmtTime(createdAt)}</span></div>
  <hr class="sep" />

  <!-- ══ Items table ══ -->
  <table class="itbl">
    <thead>
      <tr>
        <th class="cn">الصنف</th>
        <th class="cq">الكمية</th>
      </tr>
    </thead>
    <tbody>
      ${itemRowsHtml}
    </tbody>
  </table>
  <hr class="sep" />

  <!-- ══ Footer ══ -->
  <div class="footer">
    ${isUpdate
      ? `&#x26A0;&#xFE0F; تحديث — النسخة ${version} — تحقق من التغييرات`
      : `${fmtDate(createdAt)} &mdash; ${fmtTime(createdAt)}`}
  </div>

</div>
</body>
</html>`;
};

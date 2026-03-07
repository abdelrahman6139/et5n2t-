// Print report utility
import { buildKitchenReceiptHTML, openAndPrint } from './receiptPrint';

// ─── Thermal 80 mm print (mirrors C# PrintService style) ─────────────────────
export interface StatCardData {
  label: string;
  value: string | number;
  color?: string; // kept for API compat – ignored on thermal b/w paper
}

export interface PrintReportOptions {
  title: string;
  subtitle?: string;
  period?: string;
  stats?: StatCardData[];
  tablesHtml: string;
}

// Thermal CSS — mirrors C# PrintService:
//   80 mm page · Tahoma ExtraBold · black on white
//   Gainsboro thead (Brushes.Gainsboro) · 1 px solid black borders (BorderThickness 0.75)
//   Dashed hr separators · centered bold section titles like "[Section]"
const thermalStyles = `
  @media print {
    @page { size: 80mm auto; margin: 3mm 2mm; }
    body  { margin: 0; }
  }
  * { box-sizing: border-box; }
  body {
    direction: rtl;
    font-family: 'Tahoma', 'Arial Unicode MS', Arial, sans-serif;
    font-size: 11px;
    font-weight: bold;
    color: #000;
    background: #fff;
    width: 76mm;
    margin: 0 auto;
    padding: 2px;
  }
  .rpt-title {
    text-align: center;
    font-size: 14px;
    font-weight: 900;
    padding-bottom: 4px;
    margin-bottom: 2px;
    border-bottom: 2px solid #000;
  }
  .rpt-meta {
    text-align: center;
    font-size: 10px;
    margin: 1px 0;
  }
  hr {
    border: none;
    border-top: 1px dashed #000;
    margin: 4px 0;
  }
  /* stat summary — key:value rows like C# report paragraph lines */
  .stat-table { width: 100%; border-collapse: collapse; margin-bottom: 2px; }
  .stat-table td { border: none; padding: 1px 2px; font-size: 11px; font-weight: bold; }
  .st-label { text-align: right; }
  .st-value { text-align: left; white-space: nowrap; }
  /* section heading — ExtraBold centered like C# "[Section]" style */
  .section-title {
    text-align: center;
    font-size: 11px;
    font-weight: 900;
    padding: 2px 0;
    margin: 5px 0 2px;
    border-top: 1px solid #000;
    border-bottom: 1px solid #000;
  }
  /* data tables */
  table { width: 100%; border-collapse: collapse; direction: rtl; font-size: 10px; font-weight: bold; }
  thead th {
    background: #d3d3d3;
    border: 1px solid #000;
    padding: 3px 2px;
    text-align: center;
    font-weight: 900;
    font-size: 10px;
  }
  tbody td { border: 1px solid #000; padding: 2px 2px; text-align: right; font-weight: bold; }
  .td-center { text-align: center; }
  .td-bold   { font-weight: 900; }
  /* no color on thermal — everything is black */
  .td-green, .td-red, .td-amber, .td-blue, .td-purple { font-weight: bold; }
  .badge, .badge-green, .badge-amber, .badge-red { font-weight: 900; }
  .net-positive::before { content: '+'; }
  .net-negative::before { content: '-'; }
  .rpt-footer {
    text-align: center;
    font-size: 10px;
    margin-top: 6px;
    border-top: 1px dashed #000;
    padding-top: 3px;
  }
`;

/** Inject an invisible iframe, write HTML into it, print, then remove it.
 *  This is 100% reliable — no popup blocker, no blank-page race condition. */
const printViaIframe = (html: string) => {
  const existing = document.getElementById('__rpt_iframe__');
  if (existing) existing.remove();

  const iframe = document.createElement('iframe');
  iframe.id = '__rpt_iframe__';
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) { iframe.remove(); return; }

  doc.open();
  doc.write(html);
  doc.close();

  // Wait for images/fonts — 400 ms is enough for pure HTML
  setTimeout(() => {
    try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch (_) {}
    setTimeout(() => iframe.remove(), 1000);
  }, 400);
};

export const printStyledReport = (opts: PrintReportOptions) => {
  // Stats → compact two-column key:value rows (mirrors C# report paragraph lines)
  const statsHtml = opts.stats && opts.stats.length
    ? `<table class="stat-table">${opts.stats.map(s =>
        `<tr><td class="st-label">${s.label}:</td><td class="st-value">${s.value}</td></tr>`
      ).join('')}</table>`
    : '';

  const printedAt = new Date().toLocaleString('ar-EG');

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${opts.title}</title>
  <style>${thermalStyles}</style>
</head>
<body>
  <div class="rpt-title">${opts.title}</div>
  ${opts.subtitle ? `<div class="rpt-meta">${opts.subtitle}</div>` : ''}
  ${opts.period   ? `<div class="rpt-meta">الفترة: ${opts.period}</div>` : ''}
  <div class="rpt-meta">طُبع: ${printedAt}</div>
  <hr/>
  ${statsHtml}
  ${statsHtml ? '<hr/>' : ''}
  ${opts.tablesHtml}
  <div class="rpt-footer">-- نظام إدارة المطعم --</div>
</body>
</html>`;

  printViaIframe(html);
};

/** Legacy helper kept for backward compatibility */
export const printReport = (title: string, content: string) => {
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${title}</title>
<style>
  @media print { @page { size: 80mm auto; margin: 3mm 2mm; } body { margin:0; } }
  body { font-family:'Tahoma',Arial,sans-serif; direction:rtl; font-size:11px;
         font-weight:bold; width:76mm; margin:0 auto; background:#fff; color:#000; }
  h1 { text-align:center; font-size:13px; border-bottom:2px solid #000; padding-bottom:3px; }
  table { width:100%; border-collapse:collapse; }
  th { background:#d3d3d3; border:1px solid #000; padding:3px; text-align:center; font-size:10px; }
  td { border:1px solid #000; padding:2px 3px; font-size:10px; }
</style>
</head><body>
<h1>${title}</h1>
${content}
</body></html>`;
  printViaIframe(html);
};

// ─── Kitchen Receipt ─────────────────────────────────────────────────────────

interface KitchenReceiptItem {
  name: string;
  quantity: number;
  notes?: string;
}

interface KitchenReceiptData {
  orderNumber: string;
  orderType: 'DineIn' | 'Takeaway' | 'Delivery';
  tableNumber?: string;
  hallName?: string;
  customerName?: string;
  customerPhone?: string;
  items: KitchenReceiptItem[];
  createdAt: Date;
  isUpdate?: boolean;
  originalOrderNumber?: string;
  version?: number;
  /** Named Windows printer to route to via WebView2 bridge (empty = default) */
  printerName?: string;
}

/**
 * printKitchenReceipt – uses the shared buildKitchenReceiptHTML template
 * which mirrors the C# WPF PrintService kitchen design:
 *   ExtraBold 16 px, 80 mm RTL, real bordered table (2 cols), dashed separators.
 */
export const printKitchenReceipt = (data: KitchenReceiptData) => {
  const html = buildKitchenReceiptHTML({
    orderNumber: data.orderNumber,
    createdAt: data.createdAt,
    orderType: data.orderType,
    tableNumber: data.tableNumber,
    hallName: data.hallName,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    items: data.items,
    isUpdate: data.isUpdate,
    originalOrderNumber: data.originalOrderNumber,
    version: data.version,
  });
  openAndPrint(html, data.printerName ?? '', 'kitchen');
};

// Export to CSV
export const exportToCSV = (filename: string, data: any[], headers: string[]) => {
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

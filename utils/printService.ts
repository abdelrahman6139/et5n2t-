/**
 * printService.ts
 *
 * Single source-of-truth for all printing in the Yarb POS system.
 *
 * ─── Architecture ────────────────────────────────────────────────────────────
 *
 *   Browser  ──WebSocket──►  QZ Tray (Java tray app, localhost:8181)
 *                                │
 *                                ▼
 *                        Windows Print Spooler  ──►  Thermal Printer
 *
 *   • QZ Tray must be installed and running on every cashier PC.
 *   • No Node.js print-agent is required for printing.
 *   • HTML is built entirely in the browser and sent as a pixel print job.
 *   • QZ Tray must have "Allow unsigned requests" enabled (Advanced settings).
 *
 *   Download QZ Tray: https://qz.io/download  (requires Java 11+)
 *
 * ─── Public API ──────────────────────────────────────────────────────────────
 *   printReceipt(data)             — customer receipt → receipt printer
 *   printKitchen(data)             — kitchen ticket   → kitchen printer
 *   printText(text, printer?)      — plain-text report (shift / day closing)
 *   printStyledReport(options)     — A4 styled report via browser print dialog
 *   exportToCSV(filename, ...)     — CSV download helper
 *   checkQzStatus()                — QZ Tray connectivity check
 *   listPrinters()                 — list available printers from QZ Tray
 *   loadPrintConfig()              — fetch & cache print settings from backend
 */

export { loadPrintConfig, setPrintConfig, getPrintConfig, clearPrintConfigCache } from './printConfig';
export { listPrinters, getDefaultPrinter, onStatusChange, getQzStatus } from './qzTray';

import { getPrintConfig, loadPrintConfig } from './printConfig';
import { printHTML, ensureConnected, getQzStatus } from './qzTray';
import { buildReceiptHTML }  from './builders/receipt';
import { buildKitchenHTML }  from './builders/kitchen';
import { buildTextHTML }     from './builders/text';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KitchenItem {
  name: string;
  quantity: number;
  notes?: string;
}

export interface KitchenData {
  orderNumber: string | number;
  orderType: 'DineIn' | 'Takeaway' | 'Delivery';
  tableNumber?: string;
  hallName?: string;
  customerName?: string;
  customerPhone?: string;
  items: KitchenItem[];
  createdAt?: Date | string;
  isUpdate?: boolean;
  originalOrderNumber?: string | number;
  version?: number;
  printerName?: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  lineTotal: number;
  noteOptions?: { name: string; price: number }[];
  notes?: string;
}

export interface ReceiptData {
  orderNumber: string | number;
  createdAt?: Date | string;
  salesCenterLabel?: string;
  tableNumber?: string;
  hallName?: string;
  paymentLabel?: string;
  items: ReceiptItem[];
  subtotal: number;
  tax?: number;
  deliveryFee?: number;
  serviceCharge?: number;
  total: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  driverName?: string;
  printerName?: string;
}

export interface StyledReportOptions {
  title: string;
  period?: string;
  stats?: { label: string; value: string | number; color?: string }[];
  tablesHtml?: string;
}

// ─── Core print helpers ───────────────────────────────────────────────────────

/** Ensure config is loaded, then return it. */
async function cfg() {
  const c = getPrintConfig();
  if (!c.restaurantName && !c.receiptPrinter) return loadPrintConfig();
  return c;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Print a customer receipt via QZ Tray.
 */
export async function printReceipt(data: ReceiptData): Promise<boolean> {
  try {
    const config  = await cfg();
    const printer = (data.printerName ?? config.receiptPrinter ?? '').trim();
    const html    = await buildReceiptHTML(data, config);
    await printHTML(html, printer, { widthMm: config.paperWidthMm ?? 80 });
    return true;
  } catch (err) {
    console.error('[PrintService] printReceipt failed:', err);
    return false;
  }
}

/**
 * Print a kitchen ticket via QZ Tray.
 */
export async function printKitchen(data: KitchenData): Promise<boolean> {
  try {
    const config  = await cfg();
    const printer = (data.printerName ?? config.kitchenPrinter ?? '').trim();
    const html    = buildKitchenHTML(data, config);
    await printHTML(html, printer, { widthMm: config.paperWidthMm ?? 80, density: 200 });
    return true;
  } catch (err) {
    console.error('[PrintService] printKitchen failed:', err);
    return false;
  }
}

/**
 * Print a plain-text report (shift closing, day closing, etc.) via QZ Tray.
 */
export async function printText(text: string, printerName = ''): Promise<boolean> {
  try {
    const config  = await cfg();
    const printer = (printerName || config.receiptPrinter || '').trim();
    const html    = buildTextHTML(text, config);
    await printHTML(html, printer, { widthMm: config.paperWidthMm ?? 80 });
    return true;
  } catch (err) {
    console.error('[PrintService] printText failed:', err);
    return false;
  }
}

/**
 * Print a styled A4 report using the browser's built-in print dialog.
 * No print agent required — opens a new browser window with the report.
 */
export function printStyledReport(options: StyledReportOptions): void {
  const { title, period, stats = [], tablesHtml = '' } = options;

  const statsHtml = stats
    .map(
      (s) => `
    <div class="stat-card" style="border-left:4px solid ${s.color ?? '#2563eb'}">
      <div class="stat-value" style="color:${s.color ?? '#2563eb'}">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    </div>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;padding:20px;color:#1f2937;direction:rtl}
    h1{font-size:22px;font-weight:700;margin-bottom:4px}
    .period{color:#6b7280;font-size:13px;margin-bottom:16px}
    .stats{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:20px}
    .stat-card{background:#f9fafb;border-radius:8px;padding:12px 16px;min-width:140px}
    .stat-value{font-size:20px;font-weight:700}
    .stat-label{font-size:12px;color:#6b7280;margin-top:2px}
    .section-title{font-size:15px;font-weight:600;margin:20px 0 8px;color:#374151}
    table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px}
    th{background:#f3f4f6;padding:8px 10px;text-align:right;font-weight:600;border-bottom:2px solid #e5e7eb}
    td{padding:7px 10px;border-bottom:1px solid #f3f4f6}
    tr:hover td{background:#f9fafb}
    .td-center{text-align:center}
    .td-bold{font-weight:600}
    .td-green{color:#16a34a;font-weight:600}
    .td-blue{color:#2563eb;font-weight:600}
    .td-amber{color:#d97706;font-weight:600}
    .td-red{color:#dc2626;font-weight:600}
    .td-purple{color:#7c3aed;font-weight:600}
    .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600}
    .badge-green{background:#dcfce7;color:#16a34a}
    .badge-amber{background:#fef3c7;color:#d97706}
    .badge-red{background:#fee2e2;color:#dc2626}
    .net-positive{color:#16a34a}
    .net-negative{color:#dc2626}
    @media print{body{padding:10px}}
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${period ? `<div class="period">${period}</div>` : ''}
  <div class="stats">${statsHtml}</div>
  ${tablesHtml}
</body>
</html>`;

  const win = window.open('', '_blank', 'width=940,height=680');
  if (!win) {
    alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 450);
}

/**
 * Export an array of objects as a UTF-8 CSV file.
 */
export function exportToCSV(
  filename: string,
  data: Record<string, unknown>[],
  headers: string[],
): void {
  const rows = [
    headers,
    ...data.map((row) => headers.map((h) => String(row[h] ?? ''))),
  ];
  const csv = rows
    .map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Status / Connectivity ────────────────────────────────────────────────────

/**
 * Check whether QZ Tray is reachable and connected.
 * Returns { online, status }.
 */
export async function checkQzStatus(): Promise<{ online: boolean; status: string }> {
  try {
    await ensureConnected();
    return { online: true, status: getQzStatus() };
  } catch {
    return { online: false, status: 'error' };
  }
}

/**
 * @deprecated Use checkQzStatus() instead.
 * Kept for backward compatibility — returns { online, url }.
 */
export async function checkAgentStatus(): Promise<{ online: boolean; url: string }> {
  const { online } = await checkQzStatus();
  return { online, url: 'wss://localhost:8181 (QZ Tray)' };
}

/** @deprecated No-op — QZ Tray has no URL cache. */
export function clearAgentUrlCache(): void {
  // no-op
}

// ─── Backward-compatibility shims ────────────────────────────────────────────
// These match the old function signatures so existing screens compile unchanged.

/** @deprecated Use printKitchen() */
export async function printKitchenReceipt(params: KitchenData): Promise<void> {
  await printKitchen(params);
}

/** @deprecated Use printReceipt() or printKitchen() */
export async function openAndPrintData(
  type: 'receipt' | 'kitchen',
  _printerName: string,
  data: ReceiptData | KitchenData,
): Promise<boolean> {
  if (type === 'kitchen') return printKitchen(data as KitchenData);
  return printReceipt(data as ReceiptData);
}

/** @deprecated Use printText() */
export async function openAndPrint(
  text: string,
  printerName = '',
  _type?: string,
): Promise<boolean> {
  return printText(text, printerName);
}

/** @deprecated Receipt is now built in the browser, not as a standalone HTML string */
export function buildCustomerReceiptHTML(_params: ReceiptData): string {
  console.warn(
    '[printService] buildCustomerReceiptHTML is deprecated — use printReceipt() which handles build + print.',
  );
  return '';
}

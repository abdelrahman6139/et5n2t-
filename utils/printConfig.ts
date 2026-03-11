/**
 * printConfig.ts
 *
 * Manages the print configuration for QZ Tray.
 * Settings are fetched from the backend on demand, then cached in
 * localStorage so every print job does NOT need an extra round-trip.
 *
 * Call  loadPrintConfig()  once at app start (e.g. in App.tsx) or
 * lazily on first print. Individual modules call getPrintConfig().
 */

import { API_BASE_URL } from './api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PrintConfig {
  /** Exact Windows printer name for customer receipts. '' = OS default */
  receiptPrinter: string;
  /** Exact Windows printer name for kitchen tickets. '' = OS default */
  kitchenPrinter: string;
  /** Roll width in mm — 80 (default) or 58 */
  paperWidthMm: number;
  /** Displayed at the top of receipts */
  restaurantName: string;
  restaurantPhone: string;
  restaurantAddress: string;
  /** Shown at the bottom of every receipt */
  footerMessage: string;
  /**
   * Logo as a Data-URL (PNG/JPEG).
   * Stored in localStorage because we embed it in the HTML string sent to QZ Tray.
   */
  logoDataUrl: string;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS: PrintConfig = {
  receiptPrinter:  '',
  kitchenPrinter:  '',
  paperWidthMm:    80,
  restaurantName:  '',
  restaurantPhone: '',
  restaurantAddress: '',
  footerMessage:   'شكراً لزيارتكم',
  logoDataUrl:     '',
};

const LS_KEY = 'yarb_print_cfg_v2';

// ─── Getter / Setter ──────────────────────────────────────────────────────────

/** Returns the currently cached config (falls back to defaults synchronously). */
export function getPrintConfig(): PrintConfig {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* corrupt storage — use defaults */ }
  return { ...DEFAULTS };
}

/** Persist a partial config update to localStorage. */
export function setPrintConfig(patch: Partial<PrintConfig>): void {
  const current = getPrintConfig();
  localStorage.setItem(LS_KEY, JSON.stringify({ ...current, ...patch }));
}

/** Clear the cached config (force a fresh fetch on next load). */
export function clearPrintConfigCache(): void {
  localStorage.removeItem(LS_KEY);
}

// ─── Load from backend ────────────────────────────────────────────────────────

/**
 * Fetch the latest print settings from the backend and cache them.
 * Safe to call multiple times — subsequent calls are no-ops if freshly loaded.
 */
let _loaded = false;

export async function loadPrintConfig(force = false): Promise<PrintConfig> {
  if (_loaded && !force) return getPrintConfig();

  try {
    const token = localStorage.getItem('token') ?? '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/settings`, { headers });
    if (!res.ok) throw new Error('settings fetch failed');

    const json = await res.json();
    const data = json.data ?? json;

    const patch: Partial<PrintConfig> = {};
    if (data.receipt_printer !== undefined) patch.receiptPrinter = data.receipt_printer ?? '';
    if (data.kitchen_printer !== undefined) patch.kitchenPrinter = data.kitchen_printer ?? '';
    if (data.paper_width_mm  !== undefined) patch.paperWidthMm  = Number(data.paper_width_mm) || 80;
    if (data.restaurant_name !== undefined) patch.restaurantName = data.restaurant_name ?? '';
    if (data.restaurant_phone   !== undefined) patch.restaurantPhone   = data.restaurant_phone   ?? '';
    if (data.restaurant_address !== undefined) patch.restaurantAddress = data.restaurant_address ?? '';
    if (data.footer_message !== undefined) patch.footerMessage = data.footer_message ?? 'شكراً لزيارتكم';
    // logo_data_url is stored as a base64 data-URL in the DB
    if (data.logo_data_url !== undefined) patch.logoDataUrl = data.logo_data_url ?? '';

    setPrintConfig(patch);
    _loaded = true;
  } catch {
    // Network error — use cached / defaults
    _loaded = true;
  }

  return getPrintConfig();
}

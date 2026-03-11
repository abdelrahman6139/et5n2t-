/**
 * qzTray.ts — QZ Tray WebSocket Print Service
 *
 * QZ Tray is a Java desktop application that creates a local WebSocket bridge
 * between the browser and the physical printer. No print dialog ever appears.
 *
 * Prerequisites (on every cashier PC):
 *   1. Java 11+  →  https://adoptium.net
 *   2. QZ Tray   →  https://qz.io/download
 *      Open QZ Tray → Advanced → "Allow unsigned requests" ✓
 *
 * QZ Tray JS library is loaded globally via <script> in index.html.
 * This module wraps its Promise-based API with proper error handling,
 * auto-reconnect, and TypeScript types.
 */

// ─── QZ Tray global declaration ───────────────────────────────────────────────
// The script tag in index.html exposes `qz` on window.
// We declare it here to avoid TypeScript errors.
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    qz: any;
  }
}

// Helper to access qz safely
function getQZ() {
  if (!window.qz) {
    throw new Error(
      'QZ Tray library not loaded. Ensure the <script src="qz-tray.js"> tag exists in index.html.',
    );
  }
  return window.qz;
}

// ─── Connection State ─────────────────────────────────────────────────────────

let _connecting = false;
let _connectionPromise: Promise<void> | null = null;
let _statusListeners: Array<(status: QzStatus) => void> = [];

export type QzStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

let _currentStatus: QzStatus = 'disconnected';

function setStatus(s: QzStatus) {
  _currentStatus = s;
  _statusListeners.forEach((cb) => cb(s));
}

/** Subscribe to connection status changes. Returns an unsubscribe function. */
export function onStatusChange(cb: (s: QzStatus) => void): () => void {
  _statusListeners.push(cb);
  cb(_currentStatus); // emit current state immediately
  return () => {
    _statusListeners = _statusListeners.filter((x) => x !== cb);
  };
}

/** Returns the current QZ Tray connection status synchronously. */
export function getQzStatus(): QzStatus {
  return _currentStatus;
}

// ─── Connection ───────────────────────────────────────────────────────────────

/**
 * Ensure QZ Tray is connected. Idempotent — safe to call before every print.
 * Throws if QZ Tray cannot be reached.
 */
export async function ensureConnected(): Promise<void> {
  const qz = getQZ();

  // Already connected?
  if (qz.websocket.isActive()) return;

  // Already connecting — coalesce onto the same promise
  if (_connecting && _connectionPromise) return _connectionPromise;

  _connecting = true;
  setStatus('connecting');

  _connectionPromise = (async () => {
    try {
      // ── Security: unsigned mode ───────────────────────────────────────────
      // Resolving with null/empty tells QZ Tray "no certificate / no signature".
      // QZ Tray accepts this when "Allow unsigned requests" is ON in Advanced settings.
      // Do NOT call reject() here — that causes "Signing failed unsigned" errors.
      qz.security.setCertificatePromise((resolve: any) => {
        resolve(null);
      });

      qz.security.setSignaturePromise(() => {
        return (resolve: any) => resolve(null);
      });

      await qz.websocket.connect({ retries: 3, delay: 1 });

      // Listen for disconnects so we can reconect automatically on next job
      qz.websocket.setClosedCallbacks((_e: Event) => {
        setStatus('disconnected');
        _connecting = false;
        _connectionPromise = null;
      });

      setStatus('connected');
    } catch (err) {
      setStatus('error');
      _connecting = false;
      _connectionPromise = null;
      throw new Error(
        `QZ Tray غير متصل. تأكد من:\n` +
          `1. تثبيت وتشغيل QZ Tray على هذا الجهاز\n` +
          `2. تفعيل "Allow unsigned requests" في إعدادات QZ Tray → Advanced\n\n` +
          `السبب: ${String(err)}`,
      );
    }
  })();

  return _connectionPromise;
}

/** Disconnect from QZ Tray (optional — call on app close). */
export async function disconnect(): Promise<void> {
  try {
    const qz = getQZ();
    if (qz.websocket.isActive()) {
      await qz.websocket.disconnect();
    }
  } catch { /* ignore */ }
  setStatus('disconnected');
  _connecting = false;
  _connectionPromise = null;
}

// ─── Printer Listing ──────────────────────────────────────────────────────────

/**
 * Returns an array of all Windows printer names visible to QZ Tray.
 * Connects to QZ Tray if not already connected.
 */
export async function listPrinters(): Promise<string[]> {
  await ensureConnected();
  const qz = getQZ();
  const result = await qz.printers.find('');
  // result can be a string (single) or string[]
  return Array.isArray(result) ? result : result ? [result] : [];
}

/**
 * Returns the OS default printer name.
 */
export async function getDefaultPrinter(): Promise<string> {
  await ensureConnected();
  const qz = getQZ();
  return qz.printers.getDefault();
}

// ─── Print Job ────────────────────────────────────────────────────────────────

export interface QzPrintOptions {
  /** Paper roll width in mm. Default: 80 */
  widthMm?: number;
  /** Color mode. Default: 'blackwhite' (fastest for thermal) */
  colorType?: 'color' | 'grayscale' | 'blackwhite';
  /** Dots-per-inch for pixel rendering. Default: 150 (good for 80mm thermal) */
  density?: number;
  /** Margins in mm — default 0 (flush to edge) */
  margins?: { top: number; right: number; bottom: number; left: number };
  /** Rotate the document 0-360°. Default: 0 */
  rotation?: number;
  /** Scale content to fit the paper. Default: false */
  scaleContent?: boolean;
}

/**
 * Print an HTML string silently via QZ Tray.
 *
 * @param html        Full standalone HTML document string
 * @param printer     Windows printer name. Pass '' to use the OS default.
 * @param options     Paper and rendering options
 */
export async function printHTML(
  html: string,
  printer: string,
  options: QzPrintOptions = {},
): Promise<void> {
  await ensureConnected();
  const qz = getQZ();

  const {
    widthMm   = 80,
    colorType = 'blackwhite',
    density   = 300,
    margins   = { top: 0, right: 0, bottom: 0, left: 0 },
    rotation  = 0,
  } = options;

  const config = qz.configs.create(
    printer || null,   // null → OS default printer
    {
      units:        'mm',
      size:         { width: widthMm },  // width only; thermal advances automatically
      colorType,
      density,
      margins,
      rotation,
      rasterize:    true,   // REQUIRED: converts HTML → bitmap pixels the thermal driver understands
      scaleContent: false,  // do not distort; our HTML is already sized to paper width
    },
  );

  const data = [
    {
      type:   'pixel',
      format: 'html',
      flavor: 'plain',   // QZ Tray renders plain HTML in its embedded browser
      data:   html,
    },
  ];

  await qz.print(config, data);
}

/**
 * Print a raw ESC/POS command buffer (for advanced use / logo pre-loading).
 */
export async function printRaw(
  commands: string,
  printer: string,
): Promise<void> {
  await ensureConnected();
  const qz = getQZ();
  const config = qz.configs.create(printer || null);
  await qz.print(config, [{ type: 'raw', format: 'command', flavor: 'plain', data: commands }]);
}

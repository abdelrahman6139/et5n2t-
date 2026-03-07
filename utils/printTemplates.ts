export type ReceiptItem = { name: string; qty: number; price: number; total: number };
export type ReceiptData = {
  invoiceNo: string;
  date: string;
  customer?: { name?: string; phone?: string; address?: string };
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  service?: number;
  delivery?: number;
  total: number;
  footer?: string;
  kitchen?: boolean;
};

const baseStyles = `
  @media print { @page { size: 80mm auto; margin: 4mm; } }
  * { box-sizing: border-box; }
  body { direction: rtl; font-family: 'Tahoma', Arial, sans-serif; }
  .ticket { width: 72mm; margin: 0 auto; padding: 8px; border: 1px dashed #999; }
  h1,h2,h3 { margin: 6px 0; text-align: center; }
  .meta { font-size: 12px; border-top: 1px dashed #999; border-bottom: 1px dashed #999; padding: 6px 0; margin: 6px 0; }
  .grid { display: grid; grid-template-columns: 1fr 32px 48px 56px; gap: 6px; font-size: 13px; }
  .grid.header { font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  .row { border-bottom: 1px dotted #ddd; padding: 3px 0; }
  .totals { margin-top: 8px; font-size: 13px; }
  .totals div { display: flex; justify-content: space-between; padding: 2px 0; }
  .footer { text-align: center; margin-top: 10px; font-size: 12px; border-top: 1px dashed #999; padding-top: 6px; }
`;

export function renderReceiptHTML(data: ReceiptData): string {
  const itemsHtml = data.items.map(it => `
    <div class="row grid">
      <div>${it.name}</div>
      <div>${it.qty}</div>
      <div>${it.price.toFixed(2)}</div>
      <div>${it.total.toFixed(2)}</div>
    </div>
  `).join("");

  return `<!doctype html><html lang="ar"><head>
    <meta charset="utf-8" />
    <title>فاتورة ${data.invoiceNo}</title>
    <style>${baseStyles}</style>
  </head><body>
    <div class="ticket">
      <h2>${data.kitchen ? 'بطاقة مطبخ' : 'فاتورة مبيعات'}</h2>
      <div class="meta">
        <div>رقم الفاتورة: ${data.invoiceNo}</div>
        <div>التاريخ: ${data.date}</div>
        ${data.customer ? `<div>العميل: ${data.customer.name||''} - ${data.customer.phone||''}</div><div>${data.customer.address||''}</div>` : ''}
      </div>
      <div class="grid header">
        <div>الصنف</div><div>الكمية</div><div>السعر</div><div>الإجمالي</div>
      </div>
      ${itemsHtml}
      <div class="totals">
        <div><span>الإجمالي قبل الضريبة</span><span>${data.subtotal.toFixed(2)}</span></div>
        <div><span>الضريبة</span><span>${data.tax.toFixed(2)}</span></div>
        ${data.service ? `<div><span>خدمة</span><span>${data.service.toFixed(2)}</span></div>` : ''}
        ${data.delivery ? `<div><span>توصيل</span><span>${data.delivery.toFixed(2)}</span></div>` : ''}
        <div style="font-weight:bold"><span>الإجمالي</span><span>${data.total.toFixed(2)}</span></div>
      </div>
      ${data.footer ? `<div class="footer">${data.footer}</div>` : ''}
    </div>
    <script>window.onload=()=>window.print();</script>
  </body></html>`;
}

export function renderReportHTML(title: string, rows: any[]): string {
  const cols = rows.length ? Object.keys(rows[0]) : [];
  const head = cols.map(c=>`<th>${c}</th>`).join("");
  const body = rows.map(r=>`<tr>${cols.map(c=>`<td>${r[c]??''}</td>`).join("")}</tr>`).join("");
  return `<!doctype html><html lang="ar"><head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      ${baseStyles}
      @media print { @page { size: A4 portrait; margin: 10mm; } }
      table { width: 100%; border-collapse: collapse; direction: rtl; }
      th,td { border: 1px solid #ccc; padding: 6px; font-size: 12px; }
      thead th { background:#f5f5f5; }
      h1 { text-align:center; margin: 0 0 10px 0;}
    </style>
  </head><body>
    <h1>${title}</h1>
    <table>
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
    <script>window.onload=()=>window.print();</script>
  </body></html>`;
}

export function printHtml(html: string) {
  const w = window.open("", "_blank", "width=900,height=1200");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

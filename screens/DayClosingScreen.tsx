import React, { useState, useEffect, useCallback } from 'react';
import { businessDays as businessDaysApi } from '../utils/api';
import { openAndPrint } from '../utils/printService';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface BusinessDay {
    id: number;
    opened_at: string;
    closed_at?: string;
    opened_by_name: string;
    closed_by_name?: string;
    status: 'open' | 'closed';
    total_orders: number;
    total_sales: string | number;
    total_cash: string | number;
    total_card: string | number;
    total_delivery: string | number;
    total_expenses: string | number;
    net_profit: string | number;
    notes?: string;
}

interface DaySummary {
    day: BusinessDay;
    orders: {
        total_orders: number;
        total_sales: string | number;
        total_cash: string | number;
        total_card: string | number;
        total_delivery_fees: string | number;
        total_discount: string | number;
        total_tax: string | number;
        total_service: string | number;
        avg_order_value: string | number;
    };
    byCenter: Array<{ sales_center: string; count: number; total: string | number }>;
    byPayment: Array<{ payment_method: string; count: number; total: string | number }>;
    topItems: Array<{ item_name: string; total_qty: number; total_sales: string | number }>;
    expenses: { total_expenses: string | number };
    shifts: Array<{
        id: number;
        cashier_name: string;
        opened_at: string;
        closed_at?: string;
        total_sales: string | number;
        total_orders: number;
        status: string;
    }>;
    netProfit: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n: string | number, decimals = 2) =>
    Number(n || 0).toLocaleString('ar-EG', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString('ar-EG', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

const duration = (start: string, end?: string) => {
    const ms = new Date(end ?? new Date()).getTime() - new Date(start).getTime();
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h} ساعة ${m} دقيقة`;
};

// Center / payment display names
const centerLabel: Record<string, string> = {
    Delivery: 'توصيل',
    'Dine-In': 'صالة',
    Takeaway: 'تيك أواي',
    'Take Away': 'تيك أواي',
};
const payLabel: Record<string, string> = {
    cash: 'نقدي',
    card: 'بطاقة',
    visa: 'فيزا',
    online: 'أونلاين',
};

// ─────────────────────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────────────────────
const StatCard: React.FC<{
    label: string;
    value: string;
    sub?: string;
    color?: string;
    icon?: string;
}> = ({ label, value, sub, color = 'bg-blue-600', icon = '📊' }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 flex items-start gap-4">
        <div className={`${color} text-white rounded-lg w-12 h-12 flex items-center justify-center text-2xl shrink-0`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Print closing day report
// ─────────────────────────────────────────────────────────────────────────────
const printDayReport = async (summary: DaySummary) => {
    const { day, orders, byCenter, byPayment, topItems, expenses, shifts, netProfit } = summary;

    const fmt = (n: any) => Number(n ?? 0).toFixed(2);
    const fDate = (d: string | null) =>
      d ? new Intl.DateTimeFormat('ar-EG', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
      }).format(new Date(d)) : '-';

        const lines: string[] = [];
        lines.push('[تقرير الإغلاق اليومي]');
        lines.push(`يوم رقم: ${day.id}`);
        lines.push('------------------------------------------');
        lines.push(`فتح بواسطة: ${day.opened_by_name}`);
        lines.push(`وقت الفتح: ${fDate(day.opened_at)}`);
        if (day.closed_at) lines.push(`الإغلاق: ${fDate(day.closed_at)}`);
        lines.push('------------------------------------------');

        lines.push('[إجمالي المبيعات]');
        lines.push(`عدد الطلبات\t${orders.total_orders}`);
        lines.push(`إجمالي المبيعات\t${fmt(orders.total_sales)}`);
        lines.push(`نقدي\t${fmt(orders.total_cash)}`);
        lines.push(`بطاقة\t${fmt(orders.total_card)}`);
        lines.push(`رسوم توصيل\t${fmt(orders.total_delivery_fees)}`);
        lines.push(`خصم\t${fmt(orders.total_discount)}`);
        lines.push(`ضريبة\t${fmt(orders.total_tax)}`);
        lines.push(`رسوم خدمة\t${fmt(orders.total_service)}`);
        lines.push('------------------------------------------');

        lines.push('[مبيعات حسب القناة]');
        lines.push('القناة\tطلبات\tإجمالي');
        byCenter.forEach(c => lines.push(`${centerLabel[c.sales_center] ?? c.sales_center}\t${c.count}\t${fmt(c.total)}`));
        lines.push('------------------------------------------');

        lines.push('[مبيعات حسب الدفع]');
        lines.push('الطريقة\tطلبات\tإجمالي');
        byPayment.forEach(p => lines.push(`${payLabel[p.payment_method] ?? p.payment_method}\t${p.count}\t${fmt(p.total)}`));
        lines.push('------------------------------------------');

        lines.push('[المصروفات]');
        lines.push(`إجمالي المصروفات\t${fmt(expenses.total_expenses)}`);
        lines.push(`صافي الربح\t${fmt(netProfit)}`);
        lines.push('------------------------------------------');
        lines.push(`طُبع: ${new Date().toLocaleDateString('ar-EG')}`);

        const printed = await openAndPrint(lines.join('\n'), 'inv', 'report');
        if (!printed) alert('تعذر طباعة تقرير الإغلاق اليومي');
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
const DayClosingScreen: React.FC = () => {
    const [view, setView] = useState<'current' | 'history'>('current');

    // Current day state
    const [currentDay, setCurrentDay] = useState<BusinessDay | null>(null);
    const [summary, setSummary] = useState<DaySummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(false);

    // History state
    const [history, setHistory] = useState<BusinessDay[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedHistoryDay, setSelectedHistoryDay] = useState<DaySummary | null>(null);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);

    // Open day dialog
    const [openNotes, setOpenNotes] = useState('');
    const [openDialog, setOpenDialog] = useState(false);

    // Close day dialog
    const [closeNotes, setCloseNotes] = useState('');
    const [closeDialog, setCloseDialog] = useState(false);

    // ── Data fetching ──────────────────────────────────────────────────────────
    const fetchCurrentDay = useCallback(async () => {
        try {
            setLoading(true);
            const res = await businessDaysApi.getCurrent();
            if (res.data.success) setCurrentDay(res.data.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchSummary = useCallback(async (id: number) => {
        try {
            setSummaryLoading(true);
            const res = await businessDaysApi.getSummary(id);
            if (res.data.success) setSummary(res.data.data);
        } catch (e) {
            console.error(e);
        } finally {
            setSummaryLoading(false);
        }
    }, []);

    const fetchHistory = useCallback(async () => {
        try {
            setHistoryLoading(true);
            const res = await businessDaysApi.getAll({ limit: 50 });
            if (res.data.success) setHistory(res.data.data);
        } catch (e) {
            console.error(e);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCurrentDay();
        fetchHistory();
    }, [fetchCurrentDay, fetchHistory]);

    // Refresh summary while day is open
    useEffect(() => {
        if (currentDay?.status === 'open') {
            fetchSummary(currentDay.id);
            const interval = setInterval(() => fetchSummary(currentDay.id), 30_000);
            return () => clearInterval(interval);
        }
    }, [currentDay, fetchSummary]);

    // ── Actions ────────────────────────────────────────────────────────────────
    const handleOpenDay = async () => {
        try {
            const res = await businessDaysApi.open({ notes: openNotes });
            if (res.data.success) {
                setCurrentDay(res.data.data);
                setOpenDialog(false);
                setOpenNotes('');
                fetchHistory();
            }
        } catch (e: any) {
            alert(e.response?.data?.error || 'فشل في فتح اليوم');
        }
    };

    const handleCloseDay = async () => {
        if (!currentDay) return;
        try {
            const res = await businessDaysApi.close(currentDay.id, { notes: closeNotes });
            if (res.data.success) {
                setCurrentDay(null);
                setSummary(null);
                setCloseDialog(false);
                setCloseNotes('');
                fetchHistory();
            }
        } catch (e: any) {
            alert(e.response?.data?.error || 'فشل في إغلاق اليوم');
        }
    };

    const openHistoryDetail = async (day: BusinessDay) => {
        try {
            const res = await businessDaysApi.getSummary(day.id);
            if (res.data.success) {
                setSelectedHistoryDay(res.data.data);
                setHistoryModalOpen(true);
            }
        } catch (e) {
            console.error(e);
        }
    };

    // ── Rendering helpers ──────────────────────────────────────────────────────
    const renderNoDayOpen = () => (
        <div className="flex flex-col items-center justify-center py-20 gap-6">
            <div className="text-8xl">🌙</div>
            <h2 className="text-3xl font-bold text-gray-700 dark:text-gray-200">لا يوجد يوم مفتوح</h2>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
                لم يتم فتح يوم عمل بعد. اضغط على "فتح يوم جديد" لبدء تسجيل المبيعات ضمن يوم عمل جديد.
            </p>
            <button
                onClick={() => setOpenDialog(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg transition"
            >
                🟢 فتح يوم جديد
            </button>
        </div>
    );

    const renderCurrentDay = () => {
        if (!currentDay || !summary) return null;
        const { orders, byCenter, byPayment, topItems, expenses, shifts, netProfit } = summary;

        return (
            <div className="space-y-6">
                {/* Day header banner */}
                <div className="bg-gradient-to-l from-green-600 to-emerald-500 rounded-2xl p-6 text-white shadow-xl">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="animate-pulse w-3 h-3 bg-green-200 rounded-full inline-block"></span>
                                <span className="text-green-100 text-sm font-medium">يوم عمل مفتوح</span>
                            </div>
                            <h2 className="text-2xl font-bold">يوم رقم #{currentDay.id}</h2>
                            <p className="text-green-100 text-sm mt-1">
                                فُتح بواسطة {currentDay.opened_by_name} — {fmtDate(currentDay.opened_at)}
                            </p>
                            <p className="text-green-100 text-sm">
                                المدة: {duration(currentDay.opened_at)}
                            </p>
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            <button
                                onClick={() => fetchSummary(currentDay.id)}
                                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition"
                            >
                                🔄 تحديث
                            </button>
                            <button
                                onClick={() => summary && printDayReport(summary)}
                                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition"
                            >
                                🖨️ طباعة
                            </button>
                            <button
                                onClick={() => setCloseDialog(true)}
                                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-bold shadow transition"
                            >
                                🔴 إغلاق اليوم
                            </button>
                        </div>
                    </div>
                </div>

                {summaryLoading ? (
                    <div className="text-center py-10 text-gray-400">جارٍ التحميل...</div>
                ) : (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                            <StatCard label="إجمالي المبيعات" value={`${fmt(orders.total_sales)} ج.م`} color="bg-blue-600" icon="💰" />
                            <StatCard label="عدد الطلبات" value={String(orders.total_orders)} color="bg-purple-600" icon="📦" />
                            <StatCard label="المدفوع نقداً" value={`${fmt(orders.total_cash)} ج.م`} color="bg-green-600" icon="💵" />
                            <StatCard label="المدفوع بطاقة" value={`${fmt(orders.total_card)} ج.م`} color="bg-cyan-600" icon="💳" />
                            <StatCard label="إجمالي المصروفات" value={`${fmt(expenses.total_expenses)} ج.م`} color="bg-orange-500" icon="💸" />
                            <StatCard label="رسوم التوصيل" value={`${fmt(orders.total_delivery_fees)} ج.م`} color="bg-yellow-600" icon="🛵" />
                            <StatCard label="متوسط الطلب" value={`${fmt(orders.avg_order_value)} ج.م`} color="bg-indigo-600" icon="📈" />
                            <StatCard
                                label="صافي الربح"
                                value={`${fmt(netProfit)} ج.م`}
                                color={netProfit >= 0 ? 'bg-emerald-600' : 'bg-red-600'}
                                icon={netProfit >= 0 ? '✅' : '❌'}
                            />
                        </div>

                        {/* By Center & By Payment */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Sales by Channel */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
                                <h3 className="text-lg font-bold text-gray-700 dark:text-white mb-4">🏪 المبيعات حسب القناة</h3>
                                {byCenter.length === 0 ? (
                                    <p className="text-gray-400 text-sm text-center py-4">لا توجد بيانات</p>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                                                <th className="text-right py-2">القناة</th>
                                                <th className="text-right py-2">الطلبات</th>
                                                <th className="text-right py-2">الإجمالي</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {byCenter.map((c) => (
                                                <tr key={c.sales_center} className="border-b dark:border-gray-700">
                                                    <td className="py-2">{centerLabel[c.sales_center] ?? c.sales_center}</td>
                                                    <td className="py-2">{c.count}</td>
                                                    <td className="py-2 font-medium">{fmt(c.total)} ج.م</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Sales by Payment */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
                                <h3 className="text-lg font-bold text-gray-700 dark:text-white mb-4">💳 المبيعات حسب طريقة الدفع</h3>
                                {byPayment.length === 0 ? (
                                    <p className="text-gray-400 text-sm text-center py-4">لا توجد بيانات</p>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                                                <th className="text-right py-2">الطريقة</th>
                                                <th className="text-right py-2">الطلبات</th>
                                                <th className="text-right py-2">الإجمالي</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {byPayment.map((p) => (
                                                <tr key={p.payment_method} className="border-b dark:border-gray-700">
                                                    <td className="py-2">{payLabel[p.payment_method] ?? p.payment_method}</td>
                                                    <td className="py-2">{p.count}</td>
                                                    <td className="py-2 font-medium">{fmt(p.total)} ج.م</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                        {/* Top Items */}
                        {topItems.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
                                <h3 className="text-lg font-bold text-gray-700 dark:text-white mb-4">🏆 أكثر الأصناف مبيعاً</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                    {topItems.slice(0, 10).map((item, idx) => (
                                        <div key={item.item_name} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                                            <div className="text-2xl mb-1">{['🥇', '🥈', '🥉'][idx] ?? '🍽️'}</div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-white truncate">{item.item_name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">الكمية: {item.total_qty}</p>
                                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{fmt(item.total_sales)} ج.م</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Shifts during this day */}
                        {shifts.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
                                <h3 className="text-lg font-bold text-gray-700 dark:text-white mb-4">👤 الورديات ضمن هذا اليوم</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                                                <th className="text-right py-2 pe-3">#</th>
                                                <th className="text-right py-2">الكاشير</th>
                                                <th className="text-right py-2">الفتح</th>
                                                <th className="text-right py-2">الإغلاق</th>
                                                <th className="text-right py-2">الطلبات</th>
                                                <th className="text-right py-2">المبيعات</th>
                                                <th className="text-right py-2">الحالة</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {shifts.map((s) => (
                                                <tr key={s.id} className="border-b dark:border-gray-700">
                                                    <td className="py-2 pe-3 text-gray-400">#{s.id}</td>
                                                    <td className="py-2 font-medium">{s.cashier_name}</td>
                                                    <td className="py-2 text-xs">{fmtDate(s.opened_at)}</td>
                                                    <td className="py-2 text-xs">{s.closed_at ? fmtDate(s.closed_at) : '—'}</td>
                                                    <td className="py-2">{s.total_orders}</td>
                                                    <td className="py-2 font-medium">{fmt(s.total_sales)} ج.م</td>
                                                    <td className="py-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                            {s.status === 'open' ? 'مفتوحة' : 'مغلقة'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    };

    const renderHistory = () => (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
            <div className="p-5 border-b dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-700 dark:text-white">📅 سجل الأيام المغلقة</h3>
            </div>
            {historyLoading ? (
                <div className="text-center py-10 text-gray-400">جارٍ التحميل...</div>
            ) : history.filter(d => d.status === 'closed').length === 0 ? (
                <div className="text-center py-10 text-gray-400">لا توجد أيام مغلقة بعد</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-gray-500 dark:text-gray-400 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                                <th className="text-right py-3 px-4">#</th>
                                <th className="text-right py-3">الفتح</th>
                                <th className="text-right py-3">الإغلاق</th>
                                <th className="text-right py-3">المدة</th>
                                <th className="text-right py-3">الطلبات</th>
                                <th className="text-right py-3">المبيعات</th>
                                <th className="text-right py-3">المصروفات</th>
                                <th className="text-right py-3">صافي الربح</th>
                                <th className="text-right py-3">فُتح بواسطة</th>
                                <th className="py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {history
                                .filter(d => d.status === 'closed')
                                .map((d) => (
                                    <tr key={d.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition">
                                        <td className="py-3 px-4 text-gray-400">#{d.id}</td>
                                        <td className="py-3 text-xs">{fmtDate(d.opened_at)}</td>
                                        <td className="py-3 text-xs">{d.closed_at ? fmtDate(d.closed_at) : '—'}</td>
                                        <td className="py-3 text-xs">{d.closed_at ? duration(d.opened_at, d.closed_at) : '—'}</td>
                                        <td className="py-3">{d.total_orders}</td>
                                        <td className="py-3 font-medium">{fmt(d.total_sales)} ج.م</td>
                                        <td className="py-3 text-orange-600">{fmt(d.total_expenses)} ج.م</td>
                                        <td className={`py-3 font-bold ${Number(d.net_profit) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {fmt(d.net_profit)} ج.م
                                        </td>
                                        <td className="py-3 text-xs">{d.opened_by_name}</td>
                                        <td className="py-3 px-4">
                                            <button
                                                onClick={() => openHistoryDetail(d)}
                                                className="text-blue-600 hover:underline text-xs font-medium"
                                            >
                                                تفاصيل
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    // ── Dialogs ────────────────────────────────────────────────────────────────
    const OpenDayDialog = () => (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">🟢 فتح يوم عمل جديد</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                    سيتم تسجيل جميع الطلبات والمبيعات والمصروفات تحت هذا اليوم حتى يتم إغلاقه يدوياً.
                </p>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات (اختياري)</label>
                    <textarea
                        value={openNotes}
                        onChange={e => setOpenNotes(e.target.value)}
                        rows={3}
                        className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                        placeholder="مثل: يوم عيد / خاص.."
                    />
                </div>
                <div className="flex gap-3 pt-2">
                    <button onClick={handleOpenDay} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-bold transition">
                        تأكيد الفتح
                    </button>
                    <button onClick={() => setOpenDialog(false)} className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white py-2 rounded-lg font-medium transition">
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    );

    const CloseDayDialog = () => {
        if (!summary) return null;
        const { orders, expenses, netProfit } = summary;
        return (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
                    <h3 className="text-xl font-bold text-red-600 dark:text-red-400">🔴 تأكيد إغلاق اليوم</h3>

                    {/* Summary snapshot */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-2 text-sm">
                        <p className="font-bold text-gray-700 dark:text-gray-200 text-base mb-3">ملخص اليوم قبل الإغلاق</p>
                        <div className="flex justify-between"><span className="text-gray-500">عدد الطلبات:</span><span className="font-medium">{orders.total_orders}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">إجمالي المبيعات:</span><span className="font-medium text-blue-600">{fmt(orders.total_sales)} ج.م</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">المدفوع نقداً:</span><span className="font-medium">{fmt(orders.total_cash)} ج.م</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">المدفوع بطاقة:</span><span className="font-medium">{fmt(orders.total_card)} ج.م</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">إجمالي المصروفات:</span><span className="font-medium text-orange-600">{fmt(expenses.total_expenses)} ج.م</span></div>
                        <div className="flex justify-between border-t dark:border-gray-600 pt-2 mt-2">
                            <span className="font-bold text-gray-700 dark:text-gray-200">صافي الربح:</span>
                            <span className={`font-bold text-lg ${netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(netProfit)} ج.م</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات الإغلاق (اختياري)</label>
                        <textarea
                            value={closeNotes}
                            onChange={e => setCloseNotes(e.target.value)}
                            rows={2}
                            className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                            placeholder="ملاحظات للسجل.."
                        />
                    </div>

                    <p className="text-xs text-red-500 text-center font-medium">
                        ⚠️ بعد الإغلاق لن يتم منح الطلبات الجديدة رقم اليوم هذا — لا يمكن التراجع
                    </p>

                    <div className="flex gap-3">
                        <button onClick={handleCloseDay} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-bold transition">
                            تأكيد الإغلاق
                        </button>
                        <button onClick={() => setCloseDialog(false)} className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white py-2.5 rounded-lg font-medium transition">
                            إلغاء
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const HistorySummaryModal = () => {
        if (!selectedHistoryDay) return null;
        const { day, orders, byCenter, byPayment, topItems, expenses, shifts, netProfit } = selectedHistoryDay;
        return (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">📋 تفاصيل اليوم #{day.id}</h3>
                        <button onClick={() => setHistoryModalOpen(false)} className="text-gray-400 hover:text-red-500 text-2xl">✕</button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                        <div><span className="text-gray-500">فُتح بواسطة:</span> <span className="font-medium">{day.opened_by_name}</span></div>
                        <div><span className="text-gray-500">أُغلق بواسطة:</span> <span className="font-medium">{day.closed_by_name}</span></div>
                        <div><span className="text-gray-500">الفتح:</span> <span>{fmtDate(day.opened_at)}</span></div>
                        <div><span className="text-gray-500">الإغلاق:</span> <span>{day.closed_at ? fmtDate(day.closed_at) : '—'}</span></div>
                        <div className="col-span-2"><span className="text-gray-500">المدة:</span> <span>{day.closed_at ? duration(day.opened_at, day.closed_at) : '—'}</span></div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <StatCard label="إجمالي المبيعات" value={`${fmt(orders.total_sales)} ج.م`} color="bg-blue-600" icon="💰" />
                        <StatCard label="عدد الطلبات" value={String(orders.total_orders)} color="bg-purple-600" icon="📦" />
                        <StatCard label="إجمالي المصروفات" value={`${fmt(expenses.total_expenses)} ج.م`} color="bg-orange-500" icon="💸" />
                        <StatCard label="المدفوع نقداً" value={`${fmt(orders.total_cash)} ج.م`} color="bg-green-600" icon="💵" />
                        <StatCard label="المدفوع بطاقة" value={`${fmt(orders.total_card)} ج.م`} color="bg-cyan-600" icon="💳" />
                        <StatCard label="صافي الربح" value={`${fmt(netProfit)} ج.م`} color={netProfit >= 0 ? 'bg-emerald-600' : 'bg-red-600'} icon={netProfit >= 0 ? '✅' : '❌'} />
                    </div>

                    {topItems.length > 0 && (
                        <div>
                            <h4 className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-2">🏆 أكثر الأصناف مبيعاً</h4>
                            <div className="flex flex-wrap gap-2">
                                {topItems.slice(0, 6).map(i => (
                                    <span key={i.item_name} className="bg-gray-100 dark:bg-gray-700 text-xs px-3 py-1 rounded-full">
                                        {i.item_name} ({i.total_qty}×)
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {shifts.length > 0 && (
                        <div>
                            <h4 className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-2">👤 الورديات ({shifts.length})</h4>
                            <div className="space-y-1">
                                {shifts.map(s => (
                                    <div key={s.id} className="flex justify-between text-xs bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
                                        <span>{s.cashier_name}</span>
                                        <span>{fmtDate(s.opened_at)}</span>
                                        <span className="font-medium">{fmt(s.total_sales)} ج.م</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button onClick={() => printDayReport(selectedHistoryDay)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition">
                            🖨️ طباعة التقرير
                        </button>
                        <button onClick={() => setHistoryModalOpen(false)} className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white py-2 rounded-lg font-medium transition">
                            إغلاق
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // ── Main render ────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-gray-400 text-xl">
                جارٍ التحميل...
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6" dir="rtl">

            {/* Dialogs */}
            {openDialog && <OpenDayDialog />}
            {closeDialog && <CloseDayDialog />}
            {historyModalOpen && <HistorySummaryModal />}

            {/* Tab bar */}
            <div className="flex gap-2 bg-white dark:bg-gray-800 rounded-xl p-1 shadow w-fit">
                <button
                    onClick={() => setView('current')}
                    className={`px-5 py-2 rounded-lg font-medium text-sm transition ${view === 'current' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                    📅 الحالة الحالية
                </button>
                <button
                    onClick={() => setView('history')}
                    className={`px-5 py-2 rounded-lg font-medium text-sm transition ${view === 'history' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                    🗂️ السجل التاريخي
                </button>
            </div>

            {view === 'current' && (
                currentDay ? renderCurrentDay() : renderNoDayOpen()
            )}
            {view === 'history' && renderHistory()}
        </div>
    );
};

export default DayClosingScreen;

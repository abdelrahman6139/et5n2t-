import React, { useState, useEffect } from 'react';
import { shifts as shiftsApi } from '../utils/api';
import { openAndPrint } from '../utils/printService';

interface Shift {
  id: number;
  user_id: number;
  cashier_name: string;
  opened_at: string;
  closed_at?: string;
  opening_cash: string | number;
  closing_cash?: string | number;
  expected_cash?: string | number;
  cash_difference?: string | number;
  total_sales: string | number;
  total_cash: string | number;
  total_visa: string | number;
  total_delivery: string | number;
  total_expenses: string | number;
  total_orders: number;
  status: 'open' | 'closed';
  notes?: string;
}

interface ShiftSummary {
  shift: Shift;
  orders: {
    total_orders: number;
    total_sales: string | number;
    total_cash: string | number;
    total_visa: string | number;
    total_delivery: string | number;
  };
  expenses: {
    total_expenses: string | number;
  };
}

interface ClosingScreenProps {
  hasOpenTables?: boolean;
  onAfterClose?: () => void;
}

const ClosingScreen: React.FC<ClosingScreenProps> = ({ hasOpenTables, onAfterClose }) => {
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [shiftSummary, setShiftSummary] = useState<ShiftSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'current' | 'history'>('current');

  // Open Shift State
  const [openingCash, setOpeningCash] = useState('0');
  const [openNotes, setOpenNotes] = useState('');

  // Close Shift State
  const [closingCash, setClosingCash] = useState('0');
  const [closeNotes, setCloseNotes] = useState('');

  // History
  const [shiftsHistory, setShiftsHistory] = useState<Shift[]>([]);

  useEffect(() => {
    fetchCurrentShift();
    fetchShiftsHistory();
  }, []);

  useEffect(() => {
    if (currentShift && currentShift.status === 'open') {
      fetchShiftSummary(currentShift.id);
      // Auto-refresh every 30 seconds
      const interval = setInterval(() => {
        fetchShiftSummary(currentShift.id);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [currentShift]);

  const fetchCurrentShift = async () => {
    try {
      setLoading(true);
      const response = await shiftsApi.getCurrentShift();
      if (response.data.success) {
        setCurrentShift(response.data.data);
      }
    } catch (error) {
      console.error('Fetch current shift error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchShiftSummary = async (shiftId: number) => {
    try {
      const response = await shiftsApi.getShiftSummary(shiftId);
      if (response.data.success) {
        setShiftSummary(response.data.data);
      }
    } catch (error) {
      console.error('Fetch shift summary error:', error);
    }
  };

  const fetchShiftsHistory = async () => {
    try {
      const response = await shiftsApi.getAllShifts();
      if (response.data.success) {
        setShiftsHistory(response.data.data);
      }
    } catch (error) {
      console.error('Fetch shifts history error:', error);
    }
  };

  const handleOpenShift = async () => {
    if (!openingCash || Number(openingCash) < 0) {
      alert('يرجى إدخال قيمة صحيحة للنقدية الافتتاحية');
      return;
    }

    try {
      const response = await shiftsApi.openShift({
        opening_cash: Number(openingCash),
        notes: openNotes,
      });

      if (response.data.success) {
        alert('✅ تم فتح الوردية بنجاح');
        setCurrentShift(response.data.data);
        setOpeningCash('0');
        setOpenNotes('');
        fetchShiftsHistory();
      }
    } catch (error: any) {
      console.error('Open shift error:', error);
      alert(error.response?.data?.error || 'فشل في فتح الوردية');
    }
  };

  const handleCloseShift = async () => {
    if (!currentShift) return;

    if (!closingCash || Number(closingCash) < 0) {
      alert('يرجى إدخال قيمة النقدية الفعلية في الدرج');
      return;
    }

    if (!window.confirm('هل أنت متأكد من إغلاق الوردية؟ لا يمكن التراجع عن هذا الإجراء.')) {
      return;
    }

    try {
      const response = await shiftsApi.closeShift(currentShift.id, {
        closing_cash: Number(closingCash),
        notes: closeNotes,
      });

      if (response.data.success) {
        alert('✅ تم إغلاق الوردية بنجاح');
        setCurrentShift(null);
        setShiftSummary(null);
        setClosingCash('0');
        setCloseNotes('');
        fetchShiftsHistory();
      }
    } catch (error) {
      console.error('Close shift error:', error);
      alert('فشل في إغلاق الوردية');
    }
  };

  const handlePrintReport = async () => {
    if (!currentShift || !shiftSummary) return;

    const shift = shiftSummary.shift;
    const orders = shiftSummary.orders;
    const expenses = shiftSummary.expenses;

    const fmt = (n: any) => Number(n ?? 0).toFixed(2);
    const fmtDate = (d: string) =>
      new Intl.DateTimeFormat('ar-EG', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
      }).format(new Date(d));

    const expectedCash = (
      Number(shift.opening_cash) +
      Number(orders.total_cash || 0) -
      Number(expenses.total_expenses || 0)
    ).toFixed(2);

    const lines: string[] = [];
    lines.push('[Z-Report]');
    lines.push('[تقرير إغلاق الوردية]');
    lines.push('------------------------------------------');
    lines.push(`رقم الوردية: ${shift.id}`);
    lines.push(`الكاشير: ${shift.cashier_name || '-'}`);
    lines.push(`الفتح: ${fmtDate(shift.opened_at)}`);
    if (shift.closed_at) lines.push(`الإغلاق: ${fmtDate(shift.closed_at)}`);
    lines.push('------------------------------------------');
    lines.push('[النقدية]');
    lines.push(`النقدية الافتتاحية\t${fmt(shift.opening_cash)}`);
    lines.push(`مبيعات نقدية\t${fmt(orders.total_cash)}`);
    lines.push(`مصروفات\t${fmt(expenses.total_expenses)}`);
    lines.push(`النقدية المتوقعة\t${expectedCash}`);
    lines.push('------------------------------------------');
    lines.push('[ملخص المبيعات]');
    lines.push(`عدد الطلبات\t${orders.total_orders || 0}`);
    lines.push(`إجمالي المبيعات\t${fmt(orders.total_sales)}`);
    lines.push(`مبيعات نقدية\t${fmt(orders.total_cash)}`);
    lines.push(`مبيعات بطاقة\t${fmt(orders.total_visa)}`);
    lines.push(`إجمالي التوصيل\t${fmt(orders.total_delivery)}`);
    lines.push('------------------------------------------');
    lines.push('[المصروفات]');
    lines.push(`إجمالي المصروفات\t${fmt(expenses.total_expenses)}`);
    lines.push('------------------------------------------');
    lines.push(`طُبع: ${new Date().toLocaleDateString('ar-EG')}`);

    const printed = await openAndPrint(lines.join('\n'), 'inv', 'report');
    if (!printed) alert('تعذر طباعة تقرير الوردية');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          🔐 إغلاق الوردية
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView('current')}
            className={`px-4 py-2 rounded-md ${view === 'current'
              ? 'bg-amber-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
          >
            الوردية الحالية
          </button>
          <button
            onClick={() => setView('history')}
            className={`px-4 py-2 rounded-md ${view === 'history'
              ? 'bg-amber-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
          >
            سجل الورديات
          </button>
        </div>
      </div>

      {view === 'current' && (
        <>
          {/* No Open Shift - Open New Shift */}
          {!currentShift && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🔓</div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  لا توجد وردية مفتوحة
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  قم بفتح وردية جديدة للبدء في العمل
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    النقدية الافتتاحية (ج.م)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(e.target.value)}
                    className="w-full p-3 text-lg border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ملاحظات (اختياري)
                  </label>
                  <textarea
                    value={openNotes}
                    onChange={(e) => setOpenNotes(e.target.value)}
                    rows={3}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    placeholder="أي ملاحظات عند بداية الوردية..."
                  />
                </div>

                <button
                  onClick={handleOpenShift}
                  className="w-full bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 text-lg font-bold"
                >
                  🔓 فتح وردية جديدة
                </button>
              </div>
            </div>
          )}

          {/* Open Shift - Summary & Close */}
          {currentShift && shiftSummary && (
            <div className="space-y-6">
              {/* Shift Info Card */}
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">وردية مفتوحة 🟢</h2>
                    <p className="text-green-100">
                      الكاشير: {currentShift.cashier_name}
                    </p>
                    <p className="text-green-100">
                      بدأت في: {new Date(currentShift.opened_at).toLocaleString('ar-EG')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-100">النقدية الافتتاحية</p>
                    <p className="text-3xl font-bold">
                      {Number(currentShift.opening_cash).toFixed(2)} ج.م
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    عدد الطلبات
                  </p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {shiftSummary.orders.total_orders || 0}
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    إجمالي المبيعات
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {Number(shiftSummary.orders.total_sales || 0).toFixed(2)} ج.م
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    المبيعات النقدية
                  </p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {Number(shiftSummary.orders.total_cash || 0).toFixed(2)} ج.م
                  </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    المصروفات
                  </p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {Number(shiftSummary.expenses.total_expenses || 0).toFixed(2)} ج.م
                  </p>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Payment Methods */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    💳 طرق الدفع
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                      <span className="font-medium">نقدي</span>
                      <span className="font-bold text-green-600">
                        {Number(shiftSummary.orders.total_cash || 0).toFixed(2)} ج.م
                      </span>
                    </div>
                    <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                      <span className="font-medium">فيزا</span>
                      <span className="font-bold text-blue-600">
                        {Number(shiftSummary.orders.total_visa || 0).toFixed(2)} ج.م
                      </span>
                    </div>
                    <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                      <span className="font-medium">دليفري</span>
                      <span className="font-bold text-purple-600">
                        {Number(shiftSummary.orders.total_delivery || 0).toFixed(2)} ج.م
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expected Cash */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    💰 النقدية المتوقعة
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
                      <span>النقدية الافتتاحية</span>
                      <span className="font-bold">
                        {Number(currentShift.opening_cash).toFixed(2)} ج.م
                      </span>
                    </div>
                    <div className="flex justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded">
                      <span>+ المبيعات النقدية</span>
                      <span className="font-bold text-green-600">
                        {Number(shiftSummary.orders.total_cash || 0).toFixed(2)} ج.م
                      </span>
                    </div>
                    <div className="flex justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded">
                      <span>- المصروفات</span>
                      <span className="font-bold text-red-600">
                        {Number(shiftSummary.expenses.total_expenses || 0).toFixed(2)} ج.م
                      </span>
                    </div>
                    <div className="flex justify-between p-4 bg-amber-100 dark:bg-amber-900/30 rounded-lg border-2 border-amber-500">
                      <span className="text-lg font-bold">النقدية المتوقعة</span>
                      <span className="text-2xl font-bold text-amber-600">
                        {(
                          Number(currentShift.opening_cash) +
                          Number(shiftSummary.orders.total_cash || 0) -
                          Number(shiftSummary.expenses.total_expenses || 0)
                        ).toFixed(2)}{' '}
                        ج.م
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Close Shift Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  🔒 إغلاق الوردية
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      النقدية الفعلية في الدرج (ج.م) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={closingCash}
                      onChange={(e) => setClosingCash(e.target.value)}
                      className="w-full p-3 text-lg border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      الفرق
                    </label>
                    <div className="w-full p-3 text-lg border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-900">
                      <span
                        className={`font-bold ${Number(closingCash || '0') -
                          (Number(currentShift.opening_cash) +
                            Number(shiftSummary.orders.total_cash || 0) -
                            Number(shiftSummary.expenses.total_expenses || 0)) >=
                          0
                          ? 'text-green-600'
                          : 'text-red-600'
                          }`}
                      >
                        {(
                          Number(closingCash || '0') -
                          (Number(String(currentShift.opening_cash)) +
                            Number(String(shiftSummary.orders.total_cash || 0)) -
                            Number(String(shiftSummary.expenses.total_expenses || 0)))
                        ).toFixed(2)}{' '}
                        ج.م
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ملاحظات الإغلاق (اختياري)
                  </label>
                  <textarea
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    rows={3}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    placeholder="أي ملاحظات عند إغلاق الوردية..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handlePrintReport}
                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 font-bold"
                  >
                    🖨️ طباعة التقرير
                  </button>
                  <button
                    onClick={handleCloseShift}
                    className="flex-1 bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 font-bold"
                  >
                    🔒 إغلاق الوردية
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* History View */}
      {view === 'history' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="p-3 text-right">#</th>
                <th className="p-3 text-right">الكاشير</th>
                <th className="p-3 text-right">تاريخ الفتح</th>
                <th className="p-3 text-right">تاريخ الإغلاق</th>
                <th className="p-3 text-right">المبيعات</th>
                <th className="p-3 text-right">الطلبات</th>
                <th className="p-3 text-right">الفرق</th>
                <th className="p-3 text-right">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {shiftsHistory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    لا يوجد سجل ورديات
                  </td>
                </tr>
              ) : (
                shiftsHistory.map((shift) => (
                  <tr key={shift.id} className="border-t dark:border-gray-700">
                    <td className="p-3">{shift.id}</td>
                    <td className="p-3 font-medium">{shift.cashier_name}</td>
                    <td className="p-3">
                      {new Date(shift.opened_at).toLocaleString('ar-EG', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="p-3">
                      {shift.closed_at
                        ? new Date(shift.closed_at).toLocaleString('ar-EG', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                        : '-'}
                    </td>
                    <td className="p-3 font-bold text-green-600">
                      {Number(shift.total_sales || 0).toFixed(2)} ج.م
                    </td>
                    <td className="p-3">{shift.total_orders}</td>
                    <td className="p-3">
                      {shift.cash_difference !== null &&
                        shift.cash_difference !== undefined ? (
                        <span
                          className={`font-bold ${Number(shift.cash_difference) >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                            }`}
                        >
                          {Number(shift.cash_difference).toFixed(2)} ج.م
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-3">
                      {shift.status === 'open' ? (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          مفتوحة
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                          مغلقة
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ClosingScreen;

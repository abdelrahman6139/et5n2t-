import React, { useState, useEffect } from 'react';
import { reports as reportsApi, businessDays as businessDaysApi } from '../utils/api';
import { printStyledReport, exportToCSV } from '../utils/printReports';


type ReportType = 'summary' | 'items' | 'hourly' | 'drivers' | 'daily';

interface SummaryData {
  total_orders: number;
  total_sales: number;
  subtotal: number;
  total_tax: number;
  total_service: number;
  total_delivery: number;
  total_discount: number;
  avg_order_value: number;
}

const ReportsScreen: React.FC = () => {
  const [activeReport, setActiveReport] = useState<ReportType>('summary');
  const [loading, setLoading] = useState(false);

  // ── Filter mode: 'date' = calendar range, 'business_day' = custom system day
  const [filterMode, setFilterMode] = useState<'date' | 'business_day'>('date');

  // Calendar date range
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Business day filter
  const [businessDaysList, setBusinessDaysList] = useState<any[]>([]);
  const [selectedBusinessDayId, setSelectedBusinessDayId] = useState<number | null>(null);
  const [bDaysLoading, setBDaysLoading] = useState(false);

  // Data states
  const [summaryData, setSummaryData] = useState<any>(null);
  const [itemsData, setItemsData] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [driversData, setDriversData] = useState<any[]>([]);
  const [driverSearch, setDriverSearch] = useState('');
  const [dailyData, setDailyData] = useState<any[]>([]);

  // Filter drivers based on search
  const filteredDrivers = driversData.filter(driver =>
    driver.name?.toLowerCase().includes(driverSearch.toLowerCase()) ||
    driver.phone?.includes(driverSearch)
  );

  useEffect(() => {
    fetchReportData();
  }, [activeReport, startDate, endDate, filterMode, selectedBusinessDayId]);

  // Load business days list once on mount
  useEffect(() => {
    const loadBusinessDays = async () => {
      try {
        setBDaysLoading(true);
        const res = await businessDaysApi.getAll({ limit: 100 });
        if (res.data.success) {
          setBusinessDaysList(res.data.data);
          // auto-select the latest day
          if (res.data.data.length > 0 && !selectedBusinessDayId) {
            setSelectedBusinessDayId(res.data.data[0].id);
          }
        }
      } catch (e) {
        console.error('Failed to load business days', e);
      } finally {
        setBDaysLoading(false);
      }
    };
    loadBusinessDays();
  }, []);

  const buildParams = () => {
    if (filterMode === 'business_day' && selectedBusinessDayId) {
      return { businessDayId: selectedBusinessDayId };
    }
    return { startDate, endDate };
  };

  const fetchReportData = async () => {
    // Don't fetch if business day mode but no day selected
    if (filterMode === 'business_day' && !selectedBusinessDayId) return;
    setLoading(true);
    try {
      const params = buildParams();

      switch (activeReport) {
        case 'summary':
          const summaryRes = await reportsApi.getSummary(params);
          if (summaryRes.data.success) {
            setSummaryData(summaryRes.data.data);
          }
          break;
        case 'items':
          const itemsRes = await reportsApi.getItems(params);
          if (itemsRes.data.success) {
            setItemsData(itemsRes.data.data);
          }
          break;
        case 'hourly':
          const hourlyRes = await reportsApi.getHourly(params);
          if (hourlyRes.data.success) {
            setHourlyData(hourlyRes.data.data);
          }
          break;
        case 'drivers':
          const driversRes = await reportsApi.getDrivers(params);
          if (driversRes.data.success) {
            setDriversData(driversRes.data.data);
          }
          break;
        case 'daily':
          const dailyRes = await reportsApi.getDaily(params);
          if (dailyRes.data.success) {
            setDailyData(dailyRes.data.data);
          }
          break;
      }
    } catch (error) {
      console.error('Fetch report error:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: string;
    color?: string;
  }> = ({ title, value, icon, color = 'bg-blue-500' }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className={`${color} w-12 h-12 rounded-full flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
    </div>
  );

  const renderSummaryReport = () => {
    if (!summaryData) return null;

    const { summary, byCenter, byPayment } = summaryData;

    return (
      <div>
        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="إجمالي المبيعات"
            value={`${parseFloat(summary.total_sales).toFixed(2)} ج.م`}
            icon="💰"
            color="bg-green-500"
          />
          <StatCard
            title="عدد الطلبات"
            value={summary.total_orders}
            icon="📦"
            color="bg-blue-500"
          />
          <StatCard
            title="متوسط قيمة الطلب"
            value={`${parseFloat(summary.avg_order_value).toFixed(2)} ج.م`}
            icon="📊"
            color="bg-purple-500"
          />
          <StatCard
            title="إجمالي الضرائب"
            value={`${parseFloat(summary.total_tax).toFixed(2)} ج.م`}
            icon="🧾"
            color="bg-amber-500"
          />
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="المجموع الفرعي"
            value={`${parseFloat(summary.subtotal).toFixed(2)} ج.م`}
            icon="➕"
            color="bg-indigo-500"
          />
          <StatCard
            title="رسوم الخدمة"
            value={`${parseFloat(summary.total_service).toFixed(2)} ج.م`}
            icon="🔔"
            color="bg-pink-500"
          />
          <StatCard
            title="رسوم التوصيل"
            value={`${parseFloat(summary.total_delivery).toFixed(2)} ج.م`}
            icon="🚚"
            color="bg-cyan-500"
          />
          <StatCard
            title="الخصومات"
            value={`${parseFloat(summary.total_discount).toFixed(2)} ج.م`}
            icon="🎁"
            color="bg-red-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* By Sales Center */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              المبيعات حسب النوع
            </h3>
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="p-3 text-right text-sm">النوع</th>
                  <th className="p-3 text-right text-sm">العدد</th>
                  <th className="p-3 text-right text-sm">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {byCenter.map((item: any) => (
                  <tr key={item.sales_center} className="border-t dark:border-gray-700">
                    <td className="p-3">
                      {item.sales_center === 'DineIn' && '🍽️ صالة'}
                      {item.sales_center === 'Delivery' && '🛵 توصيل'}
                      {item.sales_center === 'Takeaway' && '🥡 سفري'}
                    </td>
                    <td className="p-3">{item.count}</td>
                    <td className="p-3 font-bold">{parseFloat(item.total).toFixed(2)} ج.م</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* By Payment Method */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              المبيعات حسب طريقة الدفع
            </h3>
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="p-3 text-right text-sm">الطريقة</th>
                  <th className="p-3 text-right text-sm">العدد</th>
                  <th className="p-3 text-right text-sm">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {byPayment.length > 0 ? (
                  byPayment.map((item: any) => (
                    <tr key={item.payment_method} className="border-t dark:border-gray-700">
                      <td className="p-3">{item.payment_method || 'غير محدد'}</td>
                      <td className="p-3">{item.count}</td>
                      <td className="p-3 font-bold">{parseFloat(item.total).toFixed(2)} ج.م</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-gray-500">
                      لا توجد بيانات
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderItemsReport = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-gray-50 dark:bg-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          تقرير مبيعات الأصناف
        </h3>
      </div>
      <table className="w-full">
        <thead className="bg-gray-100 dark:bg-gray-700">
          <tr>
            <th className="p-3 text-right">اسم الصنف</th>
            <th className="p-3 text-right">الكمية المباعة</th>
            <th className="p-3 text-right">إجمالي المبيعات</th>
            <th className="p-3 text-right">عدد الطلبات</th>
            <th className="p-3 text-right">متوسط السعر</th>
          </tr>
        </thead>
        <tbody>
          {itemsData.length > 0 ? (
            itemsData.map((item, index) => (
              <tr key={index} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="p-3">{item.item_name}</td>
                <td className="p-3">{parseFloat(item.total_quantity).toFixed(0)}</td>
                <td className="p-3 font-bold text-green-600">{parseFloat(item.total_sales).toFixed(2)} ج.م</td>
                <td className="p-3">{item.order_count}</td>
                <td className="p-3">{parseFloat(item.avg_price).toFixed(2)} ج.م</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="p-8 text-center text-gray-500">
                لا توجد بيانات للفترة المحددة
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderHourlyReport = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-gray-50 dark:bg-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          تقرير المبيعات بالساعة
        </h3>
      </div>
      <table className="w-full">
        <thead className="bg-gray-100 dark:bg-gray-700">
          <tr>
            <th className="p-3 text-right">الساعة</th>
            <th className="p-3 text-right">عدد الطلبات</th>
            <th className="p-3 text-right">إجمالي المبيعات</th>
          </tr>
        </thead>
        <tbody>
          {hourlyData.length > 0 ? (
            hourlyData.map((item) => (
              <tr key={item.hour} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="p-3">{`${item.hour}:00 - ${item.hour}:59`}</td>
                <td className="p-3">{item.order_count}</td>
                <td className="p-3 font-bold text-green-600">{parseFloat(item.total_sales).toFixed(2)} ج.م</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="p-8 text-center text-gray-500">
                لا توجد بيانات للفترة المحددة
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
  // ─── Shared period label ────────────────────────────────────────────────────
  const getPeriodLabel = () =>
    filterMode === 'business_day' && selectedBusinessDayId
      ? `يوم عمل #${selectedBusinessDayId}`
      : `من ${new Date(startDate).toLocaleDateString('ar-EG')} إلى ${new Date(endDate).toLocaleDateString('ar-EG')}`;

  // ─── Print Functions ─────────────────────────────────────────────────────────
  const printSummaryReport = () => {
    if (!summaryData) return;
    const { summary, byCenter, byPayment } = summaryData;

    const byCenterHtml = `
      <div class="section-title">📊 المبيعات حسب النوع</div>
      <table>
        <thead><tr>
          <th>النوع</th><th class="td-center">العدد</th><th class="td-center">المبلغ</th>
        </tr></thead>
        <tbody>
          ${byCenter.map((item: any) => `
            <tr>
              <td>${item.sales_center === 'DineIn' ? '🍽️ صالة' : item.sales_center === 'Delivery' ? '🛵 توصيل' : '🥡 سفري'}</td>
              <td class="td-center td-bold">${item.count}</td>
              <td class="td-center td-green">${parseFloat(item.total).toFixed(2)} ج.م</td>
            </tr>`).join('')}
        </tbody>
      </table>`;

    const byPaymentHtml = `
      <div class="section-title" style="margin-top:16px">💳 المبيعات حسب طريقة الدفع</div>
      <table>
        <thead><tr>
          <th>طريقة الدفع</th><th class="td-center">العدد</th><th class="td-center">المبلغ</th>
        </tr></thead>
        <tbody>
          ${byPayment.map((item: any) => `
            <tr>
              <td>${item.payment_method || 'غير محدد'}</td>
              <td class="td-center td-bold">${item.count}</td>
              <td class="td-center td-green">${parseFloat(item.total).toFixed(2)} ج.م</td>
            </tr>`).join('')}
        </tbody>
      </table>`;

    printStyledReport({
      title: 'تقرير ملخص المبيعات',
      period: getPeriodLabel(),
      stats: [
        { label: 'إجمالي المبيعات',    value: `${parseFloat(summary.total_sales).toFixed(2)} ج.م`,      color: '#16a34a' },
        { label: 'عدد الطلبات',         value: summary.total_orders,                                       color: '#2563eb' },
        { label: 'متوسط قيمة الطلب',   value: `${parseFloat(summary.avg_order_value).toFixed(2)} ج.م`,  color: '#7c3aed' },
        { label: 'إجمالي الضرائب',      value: `${parseFloat(summary.total_tax).toFixed(2)} ج.م`,        color: '#d97706' },
        { label: 'رسوم الخدمة',         value: `${parseFloat(summary.total_service).toFixed(2)} ج.م`,    color: '#ec4899' },
        { label: 'رسوم التوصيل',        value: `${parseFloat(summary.total_delivery).toFixed(2)} ج.م`,   color: '#06b6d4' },
        { label: 'إجمالي الخصومات',     value: `${parseFloat(summary.total_discount).toFixed(2)} ج.م`,   color: '#dc2626' },
        { label: 'المجموع الفرعي',      value: `${parseFloat(summary.subtotal).toFixed(2)} ج.م`,         color: '#6366f1' },
      ],
      tablesHtml: byCenterHtml + byPaymentHtml,
    });
  };

  const printItemsReport = () => {
    const totalSales = itemsData.reduce((s, i) => s + parseFloat(i.total_sales || 0), 0);
    const totalQty   = itemsData.reduce((s, i) => s + parseFloat(i.total_quantity || 0), 0);

    const tableHtml = `
      <div class="section-title">🍽️ تفاصيل مبيعات الأصناف</div>
      <table>
        <thead><tr>
          <th>اسم الصنف</th>
          <th class="td-center">الكمية المباعة</th>
          <th class="td-center">إجمالي المبيعات</th>
          <th class="td-center">عدد الطلبات</th>
          <th class="td-center">متوسط السعر</th>
        </tr></thead>
        <tbody>
          ${itemsData.map(item => `
            <tr>
              <td class="td-bold">${item.item_name}</td>
              <td class="td-center td-amber">${parseFloat(item.total_quantity).toFixed(0)}</td>
              <td class="td-center td-green">${parseFloat(item.total_sales).toFixed(2)} ج.م</td>
              <td class="td-center">${item.order_count}</td>
              <td class="td-center td-blue">${parseFloat(item.avg_price).toFixed(2)} ج.م</td>
            </tr>`).join('')}
        </tbody>
      </table>`;

    printStyledReport({
      title: 'تقرير مبيعات الأصناف',
      period: getPeriodLabel(),
      stats: [
        { label: 'عدد الأصناف',       value: itemsData.length,              color: '#2563eb' },
        { label: 'إجمالي الكميات',     value: totalQty.toFixed(0),           color: '#d97706' },
        { label: 'إجمالي المبيعات',    value: `${totalSales.toFixed(2)} ج.م`, color: '#16a34a' },
      ],
      tablesHtml: tableHtml,
    });
  };

  const printHourlyReport = () => {
    const totalOrders = hourlyData.reduce((s, h) => s + parseInt(h.order_count || 0), 0);
    const totalSales  = hourlyData.reduce((s, h) => s + parseFloat(h.total_sales || 0), 0);
    const peakHour    = hourlyData.reduce((max, h) => parseFloat(h.total_sales) > parseFloat(max?.total_sales || 0) ? h : max, hourlyData[0]);

    const tableHtml = `
      <div class="section-title">🕐 المبيعات بالساعة</div>
      <table>
        <thead><tr>
          <th>الساعة</th>
          <th class="td-center">عدد الطلبات</th>
          <th class="td-center">إجمالي المبيعات</th>
        </tr></thead>
        <tbody>
          ${hourlyData.map(item => `
            <tr>
              <td class="td-bold">${item.hour}:00 — ${item.hour}:59</td>
              <td class="td-center td-amber">${item.order_count}</td>
              <td class="td-center td-green">${parseFloat(item.total_sales).toFixed(2)} ج.م</td>
            </tr>`).join('')}
        </tbody>
      </table>`;

    printStyledReport({
      title: 'تقرير المبيعات بالساعة',
      period: getPeriodLabel(),
      stats: [
        { label: 'إجمالي الطلبات',    value: totalOrders,                    color: '#2563eb' },
        { label: 'إجمالي المبيعات',   value: `${totalSales.toFixed(2)} ج.م`, color: '#16a34a' },
        { label: 'أعلى ساعة مبيعاً',  value: peakHour ? `${peakHour.hour}:00` : '-', color: '#f97316' },
      ],
      tablesHtml: tableHtml,
    });
  };

  const printDriversReport = () => {
    const totalCompleted   = filteredDrivers.reduce((s, d) => s + parseInt(d.completed_orders || 0), 0);
    const totalCommission  = filteredDrivers.reduce((s, d) => s + parseFloat(d.driver_commission || 0), 0);
    const totalCash        = filteredDrivers.reduce((s, d) => s + parseFloat(d.cash_collected || 0), 0);
    const totalSales       = filteredDrivers.reduce((s, d) => s + parseFloat(d.total_sales || 0), 0);

    const tableHtml = `
      <div class="section-title">🚗 تفاصيل أداء السائقين</div>
      <table>
        <thead><tr>
          <th>اسم السائق</th>
          <th class="td-center">الهاتف</th>
          <th class="td-center">الحالة</th>
          <th class="td-center">مكتملة ✅</th>
          <th class="td-center">نشطة 🔄</th>
          <th class="td-center">ملغية ❌</th>
          <th class="td-center">معدل الإتمام</th>
          <th class="td-center">إجمالي المبيعات</th>
          <th class="td-center">رسوم التوصيل</th>
          <th class="td-center">نسبة السائق (70%)</th>
          <th class="td-center">كاش محصل 💵</th>
          <th class="td-center">صافي المستحق 💰</th>
        </tr></thead>
        <tbody>
          ${filteredDrivers.map(driver => {
            const netEarnings    = parseFloat(driver.net_earnings || 0);
            const owesRestaurant = driver.owes_restaurant;
            const rateVal        = parseFloat(driver.completion_rate || 0);
            const rateCls        = rateVal >= 90 ? 'badge-green' : rateVal >= 70 ? 'badge-amber' : 'badge-red';
            const statusLabel    = driver.status === 'available' ? 'متاح' : driver.status === 'busy' ? 'مشغول' : 'غير نشط';
            const statusCls      = driver.status === 'available' ? 'badge-green' : 'badge-amber';
            const netCls         = owesRestaurant ? 'net-negative' : 'net-positive';
            const netSign        = owesRestaurant ? '-' : '+';
            return `<tr>
              <td class="td-bold">${driver.name}${driver.vehicle_type ? `<br/><small style="color:#9ca3af">${driver.vehicle_type === 'motorcycle' ? '🏍️ دراجة' : '🚗 سيارة'}</small>` : ''}</td>
              <td class="td-center">${driver.phone || '-'}</td>
              <td class="td-center"><span class="badge ${statusCls}">${statusLabel}</span></td>
              <td class="td-center td-green">${driver.completed_orders || 0}</td>
              <td class="td-center td-amber">${driver.active_orders || 0}</td>
              <td class="td-center td-red">${driver.cancelled_orders || 0}</td>
              <td class="td-center"><span class="badge ${rateCls}">${driver.completion_rate || 0}%</span></td>
              <td class="td-center td-bold">${parseFloat(driver.total_sales || 0).toFixed(2)} ج.م</td>
              <td class="td-center td-blue">${parseFloat(driver.total_delivery_fees || 0).toFixed(2)} ج.م</td>
              <td class="td-center td-green">${parseFloat(driver.driver_commission || 0).toFixed(2)} ج.م</td>
              <td class="td-center td-purple">${parseFloat(driver.cash_collected || 0).toFixed(2)} ج.م${(driver.cash_orders || 0) > 0 ? `<br/><small style="color:#9ca3af">(${driver.cash_orders} طلب نقدي)</small>` : ''}</td>
              <td class="td-center td-bold ${netCls}">${netSign}${Math.abs(netEarnings).toFixed(2)} ج.م<br/><small>${owesRestaurant ? '(يدفع للمطعم)' : '(يستلم من المطعم)'}</small></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;

    printStyledReport({
      title: 'تقرير أداء السائقين الشامل',
      period: getPeriodLabel(),
      stats: [
        { label: 'عدد السائقين',          value: filteredDrivers.length,              color: '#2563eb' },
        { label: 'إجمالي الطلبات المكتملة', value: totalCompleted,                    color: '#16a34a' },
        { label: 'إجمالي نسب السائقين',   value: `${totalCommission.toFixed(2)} ج.م`, color: '#d97706' },
        { label: 'إجمالي الكاش المحصل',   value: `${totalCash.toFixed(2)} ج.م`,      color: '#7c3aed' },
        { label: 'إجمالي المبيعات',        value: `${totalSales.toFixed(2)} ج.م`,     color: '#f97316' },
      ],
      tablesHtml: tableHtml,
    });
  };

  const printDailyReport = () => {
    const totalOrders = dailyData.reduce((s, d) => s + parseInt(d.order_count || 0), 0);
    const totalSales  = dailyData.reduce((s, d) => s + parseFloat(d.total_sales || 0), 0);

    const tableHtml = `
      <div class="section-title">📅 تفاصيل المبيعات اليومية</div>
      <table>
        <thead><tr>
          <th>التاريخ</th>
          <th class="td-center">عدد الطلبات</th>
          <th class="td-center">إجمالي المبيعات</th>
          <th class="td-center">متوسط قيمة الطلب</th>
        </tr></thead>
        <tbody>
          ${dailyData.map(day => `
            <tr>
              <td class="td-bold">${new Date(day.date).toLocaleDateString('ar-EG')}</td>
              <td class="td-center td-amber">${day.order_count}</td>
              <td class="td-center td-green">${parseFloat(day.total_sales).toFixed(2)} ج.م</td>
              <td class="td-center td-blue">${parseFloat(day.avg_order_value).toFixed(2)} ج.م</td>
            </tr>`).join('')}
        </tbody>
      </table>`;

    printStyledReport({
      title: 'تقرير المبيعات اليومية',
      period: getPeriodLabel(),
      stats: [
        { label: 'عدد الأيام',         value: dailyData.length,               color: '#2563eb' },
        { label: 'إجمالي الطلبات',     value: totalOrders,                    color: '#d97706' },
        { label: 'إجمالي المبيعات',    value: `${totalSales.toFixed(2)} ج.م`, color: '#16a34a' },
        { label: 'متوسط يومي',         value: dailyData.length ? `${(totalSales / dailyData.length).toFixed(2)} ج.م` : '-', color: '#7c3aed' },
      ],
      tablesHtml: tableHtml,
    });
  };

  // Export Functions
  const exportItemsToCSV = () => {
    const headers = ['item_name', 'total_quantity', 'total_sales', 'order_count', 'avg_price'];
    exportToCSV('items_report', itemsData, headers);
  };

  const exportDriversToCSV = () => {
    const headers = ['name', 'phone', 'total_orders', 'total_sales', 'total_delivery_fees'];
    exportToCSV('drivers_report', driversData, headers);
  };


  const renderDriversReport = () => (
    <div>
      {/* Search Box */}
      <div className="mb-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔍</span>
          <input
            type="text"
            placeholder="ابحث عن سائق بالاسم أو رقم الهاتف..."
            value={driverSearch}
            onChange={(e) => setDriverSearch(e.target.value)}
            className="flex-1 px-4 py-3 border-2 border-orange-300 rounded-lg 
                   focus:outline-none focus:border-orange-500 dark:bg-gray-700 
                   dark:border-gray-600 dark:text-white text-right text-lg"
          />
          {driverSearch && (
            <button
              onClick={() => setDriverSearch('')}
              className="px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 
                     dark:hover:bg-gray-600 rounded-lg font-bold transition"
            >
              ✖ مسح
            </button>
          )}
        </div>
        {driverSearch && (
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            عدد النتائج: <span className="font-bold text-orange-600">{filteredDrivers.length}</span> سائق
          </div>
        )}
      </div>
      {/* Summary Cards */}
      {filteredDrivers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md border-2 border-blue-500">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">عدد السائقين النشطين</div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {filteredDrivers.length}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md border-2 border-green-600">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">إجمالي الطلبات المكتملة</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {filteredDrivers.reduce((sum, d) => sum + parseInt(d.completed_orders || 0), 0)}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md border-2 border-amber-500">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">إجمالي نسب السائقين</div>
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {filteredDrivers.reduce((sum, d) => sum + parseFloat(d.driver_commission || 0), 0).toFixed(2)} ج.م
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md border-2 border-purple-600">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">إجمالي الكاش المحصل</div>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {filteredDrivers.reduce((sum, d) => sum + parseFloat(d.cash_collected || 0), 0).toFixed(2)} ج.م
            </div>
          </div>
        </div>
      )}

      {/* Driver Report Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-orange-500 text-white">
          <h3 className="text-lg font-bold">تقرير أداء السائقين الشامل</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: '1400px' }}>
            <thead className="bg-orange-500 text-white">
              <tr>
                <th className="p-4 text-right font-bold text-sm">اسم السائق</th>
                <th className="p-4 text-center font-bold text-sm">الهاتف</th>
                <th className="p-4 text-center font-bold text-sm">الحالة</th>
                <th className="p-4 text-center font-bold text-sm">مكتملة ✅</th>
                <th className="p-4 text-center font-bold text-sm">نشطة 🔄</th>
                <th className="p-4 text-center font-bold text-sm">ملغية ❌</th>
                <th className="p-4 text-center font-bold text-sm">معدل الإتمام</th>
                <th className="p-4 text-center font-bold text-sm">إجمالي المبيعات</th>
                <th className="p-4 text-center font-bold text-sm">رسوم التوصيل</th>
                <th className="p-4 text-center font-bold text-sm">نسبة السائق (70%)</th>
                <th className="p-4 text-center font-bold text-sm">كاش محصل 💵</th>
                <th className="p-4 text-center font-bold text-sm bg-green-600">صافي المستحق 💰</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.length > 0 ? (
                filteredDrivers.map((driver: any, index: number) => {

                  const netEarnings = parseFloat(driver.net_earnings || 0);
                  const owesRestaurant = driver.owes_restaurant;

                  return (
                    <tr
                      key={driver.id}
                      className={`border-b dark:border-gray-700 hover:bg-amber-50 dark:hover:bg-gray-700 transition ${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'
                        }`}
                    >
                      <td className="p-4">
                        <div className="font-bold text-gray-900 dark:text-white">{driver.name}</div>
                        {driver.vehicle_type && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {driver.vehicle_type === 'motorcycle' ? '🏍️ دراجة' : '🚗 سيارة'}
                          </div>
                        )}
                      </td>

                      <td className="p-4 text-center text-gray-600 dark:text-gray-300 text-sm">
                        {driver.phone || '-'}
                      </td>

                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${driver.status === 'available'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                          }`}>
                          {driver.status === 'available' ? 'متاح' :
                            driver.status === 'busy' ? 'مشغول' : 'غير نشط'}
                        </span>
                      </td>

                      <td className="p-4 text-center font-bold text-green-600 dark:text-green-400 text-base">
                        {driver.completed_orders || 0}
                      </td>

                      <td className="p-4 text-center font-bold text-amber-600 dark:text-amber-400 text-base">
                        {driver.active_orders || 0}
                      </td>

                      <td className="p-4 text-center font-bold text-red-600 dark:text-red-400 text-base">
                        {driver.cancelled_orders || 0}
                      </td>

                      <td className="p-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full font-bold text-sm ${parseFloat(driver.completion_rate || 0) >= 90
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : parseFloat(driver.completion_rate || 0) >= 70
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}>
                          {driver.completion_rate || 0}%
                        </span>
                      </td>

                      <td className="p-4 text-center font-bold text-gray-900 dark:text-white">
                        {parseFloat(driver.total_sales || 0).toFixed(2)} ج.م
                      </td>

                      <td className="p-4 text-center font-bold text-blue-600 dark:text-blue-400">
                        {parseFloat(driver.total_delivery_fees || 0).toFixed(2)} ج.م
                      </td>

                      <td className="p-4 text-center font-bold text-green-600 dark:text-green-400">
                        {parseFloat(driver.driver_commission || 0).toFixed(2)} ج.م
                      </td>

                      <td className="p-4 text-center font-bold text-purple-600 dark:text-purple-400">
                        <div>{parseFloat(driver.cash_collected || 0).toFixed(2)} ج.م</div>
                        {(driver.cash_orders || 0) > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-normal">
                            ({driver.cash_orders} طلب نقدي)
                          </div>
                        )}
                      </td>

                      <td className={`p-4 text-center font-bold text-base ${owesRestaurant
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                        <div>{owesRestaurant ? '-' : '+'}{Math.abs(netEarnings).toFixed(2)} ج.م</div>
                        <div className="text-xs mt-1 font-normal opacity-90">
                          {owesRestaurant ? '(يدفع للمطعم)' : '(يستلم من المطعم)'}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="p-16 text-center text-gray-500 dark:text-gray-400">
                    <div className="text-5xl mb-4">📋</div>
                    <div className="text-base">لا توجد بيانات للسائقين في الفترة المحددة</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );


  const renderDailyReport = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-gray-50 dark:bg-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          تقرير المبيعات اليومية
        </h3>
      </div>
      <table className="w-full">
        <thead className="bg-gray-100 dark:bg-gray-700">
          <tr>
            <th className="p-3 text-right">التاريخ</th>
            <th className="p-3 text-right">عدد الطلبات</th>
            <th className="p-3 text-right">إجمالي المبيعات</th>
            <th className="p-3 text-right">متوسط قيمة الطلب</th>
          </tr>
        </thead>
        <tbody>
          {dailyData.length > 0 ? (
            dailyData.map((day) => (
              <tr key={day.date} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="p-3">{new Date(day.date).toLocaleDateString('ar-EG')}</td>
                <td className="p-3">{day.order_count}</td>
                <td className="p-3 font-bold text-green-600">{parseFloat(day.total_sales).toFixed(2)} ج.م</td>
                <td className="p-3">{parseFloat(day.avg_order_value).toFixed(2)} ج.م</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="p-8 text-center text-gray-500">
                لا توجد بيانات للفترة المحددة
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          📊 التقارير
        </h1>

        {/* Date Range Filter with Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4">

          {/* Filter mode toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setFilterMode('date')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${filterMode === 'date' ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              📅 تاريخ تقويمي
            </button>
            <button
              onClick={() => setFilterMode('business_day')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${filterMode === 'business_day' ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              🗓️ يوم عمل
            </button>
          </div>

          <div className="flex flex-wrap gap-4 items-end justify-between">
            <div className="flex flex-wrap gap-4 items-end flex-1">

              {filterMode === 'date' ? (
                <>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">من تاريخ</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">إلى تاريخ</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 min-w-[260px]">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">اختر يوم العمل</label>
                  {bDaysLoading ? (
                    <p className="text-sm text-gray-400 py-2">جارٍ التحميل...</p>
                  ) : businessDaysList.length === 0 ? (
                    <p className="text-sm text-orange-500 py-2">لا توجد أيام عمل مسجّلة</p>
                  ) : (
                    <select
                      value={selectedBusinessDayId ?? ''}
                      onChange={(e) => setSelectedBusinessDayId(Number(e.target.value))}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    >
                      {businessDaysList.map((d) => {
                        const opened = new Date(d.opened_at).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                        const closed = d.closed_at
                          ? new Date(d.closed_at).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : 'مفتوح الآن';
                        return (
                          <option key={d.id} value={d.id}>
                            يوم #{d.id} — {opened} ← {closed} {d.status === 'open' ? '🟢' : ''}
                          </option>
                        );
                      })}
                    </select>
                  )}
                  {/* Show selected day badge */}
                  {selectedBusinessDayId && (() => {
                    const day = businessDaysList.find(d => d.id === selectedBusinessDayId);
                    if (!day) return null;
                    return (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        📊 عرض تقرير يوم #{day.id} • فُتح بواسطة {day.opened_by_name}
                        {day.status === 'open' && <span className="text-orange-500"> (مفتوح)</span>}
                      </p>
                    );
                  })()}
                </div>
              )}

              <button
                onClick={fetchReportData}
                className="px-6 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 flex items-center gap-2"
              >
                <span>🔄</span> تحديث
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (activeReport === 'summary') printSummaryReport();
                  else if (activeReport === 'items') printItemsReport();
                  else if (activeReport === 'hourly') printHourlyReport();
                  else if (activeReport === 'drivers') printDriversReport();
                  else if (activeReport === 'daily') printDailyReport();
                }}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <span>🖨️</span> طباعة
              </button>

              <button
                onClick={() => {
                  if (activeReport === 'items') exportItemsToCSV();
                  else if (activeReport === 'drivers') exportDriversToCSV();
                  else alert('تصدير هذا التقرير غير متاح حالياً');
                }}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <span>📥</span> تصدير Excel
              </button>
            </div>
          </div>
        </div>





        {/* Report Type Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveReport('summary')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${activeReport === 'summary'
              ? 'bg-amber-500 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
          >
            📈 ملخص المبيعات
          </button>
          <button
            onClick={() => setActiveReport('items')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${activeReport === 'items'
              ? 'bg-amber-500 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
          >
            🍽️ تقرير الأصناف
          </button>
          <button
            onClick={() => setActiveReport('hourly')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${activeReport === 'hourly'
              ? 'bg-amber-500 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
          >
            🕐 تقرير بالساعة
          </button>
          <button
            onClick={() => setActiveReport('drivers')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${activeReport === 'drivers'
              ? 'bg-amber-500 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
          >
            🚗 تقرير السائقين
          </button>
          <button
            onClick={() => setActiveReport('daily')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${activeReport === 'daily'
              ? 'bg-amber-500 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
          >
            📅 تقرير يومي
          </button>
        </div>
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">جاري تحميل التقرير...</p>
          </div>
        </div>
      ) : (
        <div>
          {activeReport === 'summary' && renderSummaryReport()}
          {activeReport === 'items' && renderItemsReport()}
          {activeReport === 'hourly' && renderHourlyReport()}
          {activeReport === 'drivers' && renderDriversReport()}
          {activeReport === 'daily' && renderDailyReport()}
        </div>
      )}
    </div>
  );
};

export default ReportsScreen;

import React, { useState, useEffect } from 'react';
import { statistics as statisticsApi } from '../utils/api';
import { StatsIcon } from '../components/icons';

interface Statistics {
  totalSales: string;
  totalOrders: number;
  averageOrderValue: string;
  itemsSold: number;
  dineInOrders: number;
  deliveryOrders: number;
  takeawayOrders: number;
}

const StatisticsScreen: React.FC = () => {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatistics();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatistics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await statisticsApi.getToday();
      
      if (response.data.success) {
        setStats(response.data.data);
      } else {
        setError('فشل في تحميل الإحصائيات');
      }
    } catch (err) {
      console.error('Statistics fetch error:', err);
      setError('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const StatCard: React.FC<{ 
    title: string; 
    value: string | number; 
    description: string;
    icon?: React.ReactNode;
  }> = ({ title, value, description, icon }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">
          {title}
        </h3>
        {icon && <div className="text-amber-500">{icon}</div>}
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {value}
      </div>
      <p className="text-gray-500 dark:text-gray-400 text-sm">{description}</p>
    </div>
  );

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل الإحصائيات...</p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchStatistics}
            className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <StatsIcon className="w-8 h-8 text-amber-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            إحصائيات اليوم
          </h1>
        </div>
        <button
          onClick={fetchStatistics}
          disabled={loading}
          className="px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span className={loading ? 'animate-spin' : ''}>🔄</span>
          تحديث
        </button>
      </div>

      {stats && (
        <>
          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard
              title="إجمالي المبيعات"
              value={`${stats.totalSales} ج.م`}
              description="مبيعات اليوم"
              icon={<span className="text-2xl">💰</span>}
            />
            <StatCard
              title="عدد الطلبات"
              value={stats.totalOrders}
              description="طلبات اليوم"
              icon={<span className="text-2xl">📝</span>}
            />
            <StatCard
              title="متوسط قيمة الطلب"
              value={`${stats.averageOrderValue} ج.م`}
              description="المتوسط لكل طلب"
              icon={<span className="text-2xl">📊</span>}
            />
            <StatCard
              title="المنتجات المباعة"
              value={stats.itemsSold}
              description="إجمالي الأصناف"
              icon={<span className="text-2xl">🛍️</span>}
            />
          </div>

          {/* Sales Center Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              الطلبات حسب النوع
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-3xl mb-2">🍽️</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.dineInOrders}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">صالة</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-3xl mb-2">🛵</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.deliveryOrders}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">توصيل</div>
              </div>
              <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div className="text-3xl mb-2">🥡</div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {stats.takeawayOrders}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">سفري</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StatisticsScreen;

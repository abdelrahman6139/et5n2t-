import React, { useState, useEffect } from 'react';
import { Search, Filter, Printer, ChefHat, Eye, X, Check, Clock, Package, Truck, XCircle } from 'lucide-react';
import { API_BASE_URL, businessDays as businessDaysApi } from '../utils/api';
import { buildCustomerReceiptHTML, buildKitchenReceiptHTML, openPrintWindow, writeAndPrint, openAndPrint } from '../utils/receiptPrint';

interface Order {
  id: number;
  order_no: string;
  user_facing_id: string;
  sales_center: 'DineIn' | 'Takeaway' | 'Delivery';
  // ✅ FIXED: Match backend database enum values
  status: 'Pending' | 'Confirmed' | 'Preparing' | 'Ready' | 'Delivering' | 'Completed' | 'Cancelled';
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  total: number;
  subtotal: number;
  tax: number;
  delivery_fee: number;
  service_charge: number;
  payment_method: string;
  created_at: string;
  items: OrderItem[];
  table_name?: string;
  hall_name?: string;
  driver_name?: string;
}

interface OrderItem {
  id: number;
  name_snapshot: string;
  quantity: number;
  price: number;
  price_at_order: number;
  total: number;
  notes: string;
  selectedNoteOptions?: { id: number; name: string; price: number }[];
}

interface OrdersScreenProps {
  onEditOrder?: (order: any) => void;
  refreshTrigger?: number; // ✅ Add this

}

const OrdersManagementScreen: React.FC<OrdersScreenProps> = ({ onEditOrder, refreshTrigger }) => {
  const formatMoney = (value: any): string => {
    if (value === null || value === undefined) return '0.00';
    const num = Number(value);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };


  // ✅ Recalculate order total to ensure correctness
  // Handles both snake_case (list API) and camelCase (detail API) key shapes
  const recalculateTotal = (order: any): Order => {
    const subtotal    = parseFloat(order.subtotal    ?? 0);
    const tax         = parseFloat(order.tax         ?? 0);
    const deliveryFee = parseFloat(order.delivery_fee ?? order.deliveryfee ?? 0);
    const serviceCharge = parseFloat(order.service_charge ?? order.servicecharge ?? 0);
    return { ...order, subtotal, tax, delivery_fee: deliveryFee, service_charge: serviceCharge, total: subtotal + tax + deliveryFee + serviceCharge };
  };

  /**
   * Normalise the single-order detail response from the backend.
   * The GET /orders/:id query uses SQL aliases (no underscores),
   * whereas the GET /orders list uses direct column names (snake_case).
   * This function maps both shapes to a consistent snake_case object.
   */
  const normalizeOrderDetail = (data: any): any => {
    return {
      ...data,
      user_facing_id:    data.user_facing_id    ?? data.userfacingid    ?? '',
      order_no:          data.order_no          ?? data.orderno         ?? '',
      sales_center:      data.sales_center      ?? data.salescenter     ?? '',
      customer_name:     data.customer_name     ?? data.customername    ?? '',
      customer_phone:    data.customer_phone    ?? data.customerphone   ?? '',
      customer_address:  data.customer_address  ?? data.customeraddress ?? '',
      payment_method:    data.payment_method    ?? data.paymentmethod   ?? '',
      created_at:        data.created_at        ?? data.createdat       ?? new Date().toISOString(),
      delivery_fee:      parseFloat(data.delivery_fee   ?? data.deliveryfee   ?? 0),
      service_charge:    parseFloat(data.service_charge ?? data.servicecharge ?? 0),
      table_name:        data.table_name        ?? data.tablename       ?? undefined,
      hall_name:         data.hall_name         ?? data.hallname        ?? undefined,
      driver_name:       data.driver_name       ?? data.drivername      ?? '',
      // Keep note options on each item (already mapped by backend)
      items: Array.isArray(data.items) ? data.items.map((item: any) => ({
        ...item,
        name_snapshot:        item.name_snapshot ?? item.namesnapshot ?? item.name ?? 'صنف',
        price_at_order:       parseFloat(item.price_at_order ?? item.priceatorder ?? item.price ?? 0),
        notes:                item.notes ?? '',
        selectedNoteOptions:  item.selectedNoteOptions ?? [],
      })) : [],
    };
  };

  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [salesCenterFilter, setSalesCenterFilter] = useState<string>('all');

  // Business day filter
  const [businessDaysList, setBusinessDaysList] = useState<any[]>([]);
  const [selectedBusinessDayId, setSelectedBusinessDayId] = useState<number | null>(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
    revenue: 0
  });

  // Fetch orders
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  // Load business days list
  useEffect(() => {
    const loadBusinessDays = async () => {
      try {
        const res = await businessDaysApi.getAll({ limit: 100 });
        if (res.data.success) {
          setBusinessDaysList(res.data.data);
          if (res.data.data.length > 0) {
            setSelectedBusinessDayId(res.data.data[0].id);
          }
        }
      } catch (e) {
        console.error('Failed to load business days', e);
      }
    };
    loadBusinessDays();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      // ✅ Recalculate totals for all orders
      const recalculatedOrders = data.map((order: Order) => recalculateTotal(order));
      setOrders(recalculatedOrders);
      setFilteredOrders(recalculatedOrders);
      setLoading(false);

    } catch (error) {
      console.error('خطأ في جلب الطلبات:', error);
      setLoading(false);
    }
  };

  // ✅ FIX: Fetch order with items before printing or viewing
  const fetchOrderDetails = async (orderId: number): Promise<Order | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const raw = await response.json();
        // Normalise key shapes (detail API uses camelCase aliases) then recalculate totals
        const data = normalizeOrderDetail(raw);
        return recalculateTotal(data);
      }
      console.error('فشل في تحميل الطلب:', response.status);
      return null;
    } catch (error) {
      console.error('خطأ في جلب تفاصيل الطلب:', error);
      return null;
    }
  };


  // ✅ NEW: Calculate stats from the FILTERED list, not just today
  const calculateStats = (orderList: Order[]) => {
    setStats({
      total: orderList.length,
      pending: orderList.filter(o => o.status === 'Pending').length,
      completed: orderList.filter(o => o.status === 'Completed').length,
      cancelled: orderList.filter(o => o.status === 'Cancelled').length,
      revenue: orderList.reduce((sum, o) => sum + parseFloat(o.total.toString()), 0)
    });
  };

  // ✅ CONSOLIDATED: Apply filters and update stats in one place
  useEffect(() => {
    let filtered = [...orders];

    const getLocalDateString = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const today = new Date();

    // Date filter
    if (dateFilter === 'today') {
      const todayStr = getLocalDateString(today);
      filtered = filtered.filter(o => getLocalDateString(new Date(o.created_at)) === todayStr);
    } else if (dateFilter === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterday);
      filtered = filtered.filter(o => getLocalDateString(new Date(o.created_at)) === yesterdayStr);
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      filtered = filtered.filter(o => new Date(o.created_at) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      monthAgo.setHours(0, 0, 0, 0);
      filtered = filtered.filter(o => new Date(o.created_at) >= monthAgo);
    } else if (dateFilter === 'business_day' && selectedBusinessDayId) {
      const day = businessDaysList.find(d => d.id === selectedBusinessDayId);
      if (day) {
        const dayStart = new Date(day.opened_at);
        const dayEnd = day.closed_at ? new Date(day.closed_at) : new Date();
        filtered = filtered.filter(o => {
          const created = new Date(o.created_at);
          return created >= dayStart && created <= dayEnd;
        });
      }
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    // Sales center filter
    if (salesCenterFilter !== 'all') {
      filtered = filtered.filter(o => o.sales_center === salesCenterFilter);
    }

    // Search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(o =>
        o.user_facing_id?.toLowerCase().includes(lowerSearch) ||
        o.customer_name?.toLowerCase().includes(lowerSearch) ||
        o.customer_phone?.includes(searchTerm)
      );
    }

    setFilteredOrders(filtered);

    // ✅ UPDATE STATS (Exclude 'Cancelled' from revenue)
    setStats({
      total: filtered.length,
      pending: filtered.filter(o => o.status === 'Pending').length,
      completed: filtered.filter(o => o.status === 'Completed').length,
      cancelled: filtered.filter(o => o.status === 'Cancelled').length,
      revenue: filtered
        .filter(o => o.status !== 'Cancelled') // ❌ NO REVENUE FROM CANCELLED ORDERS
        .reduce((sum, o) => sum + (parseFloat(o.total.toString()) || 0), 0)
    });
  }, [orders, searchTerm, statusFilter, dateFilter, salesCenterFilter, selectedBusinessDayId, businessDaysList]);


  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchOrders();
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(prev => prev ? { ...prev, status: newStatus as any } : null);
        }
      }
    } catch (error) {
      console.error('خطأ في تحديث الحالة:', error);
    }
  };

  // ─── Print Receipt ────────────────────────────────────────────────────

  // ─── Print Kitchen Ticket ──────────────────────────────────────────────────
  const printKitchenTicket = async (order: Order) => {
    let orderWithItems = order;
    if (!order.items || order.items.length === 0) {
      const full = await fetchOrderDetails(order.id);
      if (!full) { alert('فشل في تحميل تفاصيل الطلب'); return; }
      orderWithItems = full;
    }
    if (!orderWithItems.items || orderWithItems.items.length === 0) {
      alert('لا توجد أصناف في هذا الطلب'); return;
    }
    const typeMap: Record<string, 'DineIn' | 'Takeaway' | 'Delivery'> = {
      DineIn: 'DineIn', Takeaway: 'Takeaway', Delivery: 'Delivery',
    };
    const html = buildKitchenReceiptHTML({
      orderNumber: orderWithItems.user_facing_id || orderWithItems.order_no || orderWithItems.id,
      createdAt: orderWithItems.created_at ? new Date(orderWithItems.created_at) : new Date(),
      orderType: typeMap[orderWithItems.sales_center] ?? 'Takeaway',
      tableNumber: orderWithItems.table_name,
      hallName: orderWithItems.hall_name,
      customerName: orderWithItems.customer_name || undefined,
      customerPhone: orderWithItems.customer_phone || undefined,
      items: orderWithItems.items.map(item => {
        // Combine note options + free-text notes into a single notes string
        const optLines = (item.selectedNoteOptions || [])
          .map((o: any) => `✓ ${o.name}${Number(o.price) > 0 ? ` (+${Number(o.price).toFixed(2)})` : ''}`);
        const noteLines = item.notes ? [item.notes] : [];
        const combined = [...optLines, ...noteLines].join(' | ');
        return {
          name: item.name_snapshot || 'صنف',
          quantity: Number(item.quantity) || 0,
          notes: combined || undefined,
        };
      }),
    });
    openAndPrint(html, '', 'kitchen');
  };

  // ─── Print Customer Receipt ───────────────────────────────────────────────
  const printReceipt = async (order: Order) => {
    // ⭐ Open the print window FIRST — before any await — so the browser
    //    treats it as a direct response to the user gesture (avoids popup block).
    const printWin = openPrintWindow();

    let orderWithItems = order;
    if (!order.items || order.items.length === 0) {
      const full = await fetchOrderDetails(order.id);
      if (!full) { printWin?.close(); alert('فشل في تحميل تفاصيل الطلب'); return; }
      orderWithItems = full;
    }
    if (!orderWithItems.items || orderWithItems.items.length === 0) {
      alert('لا توجد أصناف في هذا الطلب'); return;
    }

    const salesLabels: Record<string, string> = {
      DineIn: 'صالة', Takeaway: 'سفري', Delivery: 'توصيل',
    };
    const payLabels: Record<string, string> = { cash: 'نقدي', card: 'بطاقة', online: 'أونلاين' };

    const lineItems = orderWithItems.items.map((item: any) => {
      const qty   = Number(item.quantity)  || 0;
      const total = Number(item.total ?? (qty * Number(item.price_at_order ?? item.price ?? 0)));
      // Pass noteOptions as an array for per-row rendering in the receipt
      const noteOptions = (item.selectedNoteOptions || []).map((o: any) => ({
        name:  o.name,
        price: Number(o.price) || 0,
      }));
      return {
        name:        item.name_snapshot || 'صنف',
        quantity:    qty,
        lineTotal:   total,
        noteOptions: noteOptions.length > 0 ? noteOptions : undefined,
        notes:       item.notes && item.notes.trim() ? item.notes : undefined,
      };
    });

    const html = buildCustomerReceiptHTML({
      orderNumber:      orderWithItems.user_facing_id || orderWithItems.order_no || orderWithItems.id,
      createdAt:        orderWithItems.created_at ? new Date(orderWithItems.created_at) : new Date(),
      salesCenterLabel: salesLabels[orderWithItems.sales_center] || orderWithItems.sales_center,
      tableNumber:      orderWithItems.table_name,
      hallName:         orderWithItems.hall_name,
      paymentLabel:     payLabels[orderWithItems.payment_method] || orderWithItems.payment_method,
      items:            lineItems,
      subtotal:         Number(orderWithItems.subtotal),
      tax:              Number(orderWithItems.tax),
      deliveryFee:      Number(orderWithItems.delivery_fee),
      serviceCharge:    Number(orderWithItems.service_charge),
      total:            Number(orderWithItems.total),
      customerName:     orderWithItems.customer_name  || undefined,
      customerPhone:    orderWithItems.customer_phone || undefined,
      customerAddress:  orderWithItems.customer_address || undefined,
      driverName:       orderWithItems.driver_name || undefined,
    });
    writeAndPrint(printWin, html);
  };

  const handleEditOrder = async (orderId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data && onEditOrder) {
        onEditOrder(data);
      }
    } catch (error) {
      console.error('Failed to load order for editing:', error);
      alert('فشل تحميل الطلب للتعديل');
    }
  };




  // ✅ Translation helper functions
  const translateSalesCenter = (center: string) => {
    const map: Record<string, string> = {
      'DineIn': 'صالة',
      'Takeaway': 'سفري',
      'Delivery': 'توصيل'
    };
    return map[center] || center;
  };

  // Add this helper function
  const getDateFilterLabel = () => {
    if (dateFilter === 'business_day' && selectedBusinessDayId) {
      const day = businessDaysList.find(d => d.id === selectedBusinessDayId);
      return day ? `إيرادات يوم #${day.id}` : 'يوم عمل';
    }
    const labels: Record<string, string> = {
      'today': 'إيرادات اليوم',
      'yesterday': 'إيرادات أمس',
      'week': 'إيرادات آخر 7 أيام',
      'month': 'إيرادات آخر 30 يوم',
      'all': 'إجمالي الإيرادات'
    };
    return labels[dateFilter] || 'الإيرادات';
  };

  const translatePaymentMethod = (method: string) => {
    const map: Record<string, string> = {
      'cash': 'نقدي',
      'card': 'بطاقة',
      'online': 'أونلاين'
    };
    return map[method] || method;
  };

  const translateStatus = (status: string) => {
    const map: Record<string, string> = {
      'Pending': 'معلق',
      'Confirmed': 'مؤكد',
      'Preparing': 'قيد التحضير',
      'Ready': 'جاهز',
      'Delivering': 'في الطريق',      // ✅ Changed from 'OutForDelivery'
      'Completed': 'تم التوصيل',       // ✅ Changed from 'Delivered'
      'Cancelled': 'ملغي'
    };
    return map[status] || status;
  };


  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      Confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      Preparing: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      Ready: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      Delivering: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',  // ✅ Changed
      Completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',       // ✅ Changed
      Cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };


  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      Pending: <Clock className="w-4 h-4" />,
      Confirmed: <Check className="w-4 h-4" />,
      Preparing: <Package className="w-4 h-4" />,
      Ready: <Check className="w-4 h-4" />,
      Delivering: <Truck className="w-4 h-4" />,    // ✅ Changed from 'OutForDelivery'
      Completed: <Check className="w-4 h-4" />,     // ✅ Changed from 'Delivered'
      Cancelled: <XCircle className="w-4 h-4" />
    };
    return icons[status] || <Clock className="w-4 h-4" />;
  };


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">إدارة الطلبات</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">عرض وإدارة جميع الطلبات</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي الطلبات</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">معلقة</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">مكتملة</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <Check className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">ملغاة</p>
                <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-6">
            <div className="text-white">
              <p className="text-sm opacity-90">{getDateFilterLabel()}</p>
              <p className="text-2xl font-bold">ج.م {stats.revenue.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="بحث عن طلب، عميل، هاتف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="today">اليوم</option>
              <option value="yesterday">أمس</option>
              <option value="week">آخر 7 أيام</option>
              <option value="month">آخر 30 يوم</option>
              <option value="all">كل الأوقات</option>
              <option value="business_day">🗓️ يوم عمل</option>
            </select>

            {/* Business day sub-selector */}
            {dateFilter === 'business_day' && (
              <select
                value={selectedBusinessDayId ?? ''}
                onChange={(e) => setSelectedBusinessDayId(Number(e.target.value))}
                className="px-4 py-2 border border-emerald-400 dark:border-emerald-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white text-sm"
              >
                {businessDaysList.length === 0 ? (
                  <option value="">لا توجد أيام</option>
                ) : (
                  businessDaysList.map((d) => {
                    const opened = new Date(d.opened_at).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    const statusIcon = d.status === 'open' ? '🟢' : '⚫';
                    return (
                      <option key={d.id} value={d.id}>
                        {statusIcon} يوم #{d.id} — {opened}
                      </option>
                    );
                  })
                )}
              </select>
            )}

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">كل الحالات</option>
              <option value="Pending">معلق</option>
              <option value="Confirmed">مؤكد</option>
              <option value="Preparing">قيد التحضير</option>
              <option value="Ready">جاهز</option>
              <option value="Delivering">في الطريق</option>        {/* ✅ Changed */}
              <option value="Completed">تم التوصيل</option>        {/* ✅ Changed */}
              <option value="Cancelled">ملغي</option>
            </select>


            {/* Sales Center Filter */}
            <select
              value={salesCenterFilter}
              onChange={(e) => setSalesCenterFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">كل الأنواع</option>
              <option value="DineIn">صالة</option>
              <option value="Takeaway">سفري</option>
              <option value="Delivery">توصيل</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">رقم الطلب</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">التاريخ/الوقت</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">العميل</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">النوع</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">المجموع</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      جاري تحميل الطلبات...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      لا توجد طلبات
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          #{order.user_facing_id || order.order_no || order.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {new Date(order.created_at).toLocaleDateString('ar-EG')}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(order.created_at).toLocaleTimeString('ar-EG')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {order.customer_name || 'زبون عادي'}
                        </div>
                        {order.customer_phone && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {order.customer_phone}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {translateSalesCenter(order.sales_center)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full flex items-center gap-1 w-fit ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          {translateStatus(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          ج.م {order.total.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              const fullOrder = await fetchOrderDetails(order.id);
                              if (fullOrder) {
                                setSelectedOrder(fullOrder);
                                setShowDetails(true);
                              } else {
                                alert('فشل في تحميل تفاصيل الطلب');
                              }
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="عرض التفاصيل"
                          >
                            <Eye className="w-5 h-5" />
                          </button>

                          {(order.status !== 'Completed' &&
                            order.status !== 'Cancelled' &&
                            order.status !== 'Ready' &&
                            order.status !== 'Delivering') && (
                              <button
                                onClick={() => handleEditOrder(order.id)}
                                className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                                title="تعديل"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            )}

                          <button
                            onClick={() => printKitchenTicket(order)}
                            className="text-orange-500 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                            title="طباعة تذكرة المطبخ"
                          >
                            <ChefHat className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => printReceipt(order)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            title="طباعة فاتورة العميل"
                          >
                            <Printer className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {showDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">تفاصيل الطلب</h2>
                <p className="text-blue-100">#{selectedOrder.user_facing_id || selectedOrder.order_no || selectedOrder.id}</p>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">معلومات الطلب</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">نوع الطلب:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{translateSalesCenter(selectedOrder.sales_center)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">الحالة:</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                        {translateStatus(selectedOrder.status)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">التاريخ/الوقت:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {new Date(selectedOrder.created_at).toLocaleString('ar-EG')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">طريقة الدفع:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{translatePaymentMethod(selectedOrder.payment_method)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">معلومات العميل</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">الاسم:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedOrder.customer_name || 'زبون عادي'}</span>
                    </div>
                    {selectedOrder.customer_phone && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">الهاتف:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedOrder.customer_phone}</span>
                      </div>
                    )}
                    {selectedOrder.customer_address && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">العنوان:</span>
                        <p className="font-medium text-gray-900 dark:text-white mt-1">{selectedOrder.customer_address}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">أصناف الطلب</h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-100 dark:bg-gray-600">
                      <tr>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">الصنف</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300">الكمية</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">السعر</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300">المجموع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {selectedOrder.items && selectedOrder.items.length > 0 ? (
                        selectedOrder.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{item.name_snapshot}</div>
                              {(item.selectedNoteOptions || []).length > 0 && (
                                <div className="text-xs text-green-600 dark:text-amber-400 mt-1">
                                  {item.selectedNoteOptions!.map(o => (
                                    <span key={o.id} className="inline-block me-2">
                                      ✓ {o.name}{Number(o.price) > 0 ? ` (+${Number(o.price).toFixed(2)})` : ''}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {item.notes && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">ملاحظة: {item.notes}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">{Number(item.quantity) || 0}</td>
                            <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">ج.م {formatMoney(item.price)}</td>
                            <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">ج.م {formatMoney(item.total)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                            لا توجد أصناف
                          </td>
                        </tr>
                      )}
                    </tbody>

                  </table>
                </div>
              </div>

              {/* Order Total */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">الإجمالي الفرعي:</span>
                    <span className="font-medium text-gray-900 dark:text-white">ج.م {formatMoney(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">الضريبة:</span>
                    <span className="font-medium text-gray-900 dark:text-white">ج.م {formatMoney(selectedOrder.tax)}</span>
                  </div>
                  {Number(selectedOrder.delivery_fee) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">رسوم التوصيل:</span>
                      <span className="font-medium text-gray-900 dark:text-white">ج.م {formatMoney(selectedOrder.delivery_fee)}</span>
                    </div>
                  )}
                  {Number(selectedOrder.service_charge) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">رسوم الخدمة:</span>
                      <span className="font-medium text-gray-900 dark:text-white">ج.م {formatMoney(selectedOrder.service_charge)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300 dark:border-gray-600">
                    <span className="text-gray-900 dark:text-white">المجموع الكلي:</span>
                    <span className="text-blue-600 dark:text-blue-400">ج.م {formatMoney(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>


              {/* Status Update */}
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">تحديث الحالة</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['Pending', 'Confirmed', 'Preparing', 'Ready', 'Delivering', 'Completed', 'Cancelled'].map((status) => (
                    <button
                      key={status}
                      onClick={() => updateOrderStatus(selectedOrder.id, status)}
                      disabled={selectedOrder.status === status}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${selectedOrder.status === status
                        ? 'bg-blue-500 text-white cursor-not-allowed'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-900'
                        }`}
                    >
                      {translateStatus(status)}
                    </button>
                  ))}
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => printKitchenTicket(selectedOrder)}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition"
                >
                  <ChefHat className="w-5 h-5" />
                  طباعة المطبخ
                </button>
                <button
                  onClick={() => printReceipt(selectedOrder)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition"
                >
                  <Printer className="w-5 h-5" />
                  طباعة الفاتورة
                </button>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersManagementScreen;

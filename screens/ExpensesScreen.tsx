import React, { useState, useEffect } from 'react';
import { expenses as expensesApi, businessDays as businessDaysApi } from '../utils/api';
import { PlusCircleIcon, EditIcon, TrashIcon } from '../components/icons';

interface Expense {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
  payment_method?: string;
}

const ExpensesScreen: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Business day filter
  const [filterMode, setFilterMode] = useState<'date' | 'business_day'>('date');
  const [businessDaysList, setBusinessDaysList] = useState<any[]>([]);
  const [selectedBusinessDayId, setSelectedBusinessDayId] = useState<number | null>(null);
  const [bDaysLoading, setBDaysLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    amount: '',
    payment_method: 'نقدي'
  });

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, [filterCategory, startDate, endDate, filterMode, selectedBusinessDayId]);

  useEffect(() => {
    const loadBusinessDays = async () => {
      try {
        setBDaysLoading(true);
        const res = await businessDaysApi.getAll({ limit: 100 });
        if (res.data.success) {
          setBusinessDaysList(res.data.data);
          if (res.data.data.length > 0) {
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

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterMode === 'business_day' && selectedBusinessDayId) {
        params.businessDayId = selectedBusinessDayId;
      } else {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }
      if (filterCategory) params.category = filterCategory;

      const response = await expensesApi.getAll(params);
      if (response.data.success) {
        setExpenses(response.data.data);
      }
    } catch (error) {
      console.error('Fetch expenses error:', error);
      alert('فشل في تحميل المصروفات');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await expensesApi.getCategories();
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error('Fetch categories error:', error);
    }
  };

  const handleAddNew = () => {
    setEditingExpense(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      category: '',
      description: '',
      amount: '',
      payment_method: 'نقدي'
    });
    setModalOpen(true);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      date: expense.date.split('T')[0],
      category: expense.category,
      description: expense.description || '',
      amount: expense.amount.toString(),
      payment_method: expense.payment_method || 'نقدي'
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;

    try {
      await expensesApi.delete(id);
      fetchExpenses();
      alert('تم حذف المصروف بنجاح');
    } catch (error) {
      console.error('Delete error:', error);
      alert('فشل في حذف المصروف');
    }
  };

  const handleSave = async () => {
    if (!formData.category || !formData.amount) {
      alert('الفئة والمبلغ مطلوبان');
      return;
    }

    try {
      const data = {
        date: formData.date,
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method
      };

      if (editingExpense) {
        await expensesApi.update(editingExpense.id, data);
        alert('تم تحديث المصروف بنجاح');
      } else {
        await expensesApi.create(data);
        alert('تم إضافة المصروف بنجاح');
      }

      setModalOpen(false);
      fetchExpenses();
      fetchCategories(); // Refresh categories in case new one was added
    } catch (error) {
      console.error('Save error:', error);
      alert('فشل في حفظ المصروف');
    }
  };

  const getTotalExpenses = () => {
    return expenses.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          إدارة المصروفات
        </h1>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-md hover:bg-amber-600"
        >
          <PlusCircleIcon className="w-5 h-5" />
          إضافة مصروف جديد
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">

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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

          {filterMode === 'date' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">من تاريخ</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">اختر يوم العمل</label>
              {bDaysLoading ? (
                <p className="text-sm text-gray-400 py-2">جارٍ التحميل...</p>
              ) : businessDaysList.length === 0 ? (
                <p className="text-sm text-orange-500 py-2">لا توجد أيام عمل مسجّلة</p>
              ) : (
                <>
                  <select
                    value={selectedBusinessDayId ?? ''}
                    onChange={(e) => setSelectedBusinessDayId(Number(e.target.value))}
                    className="w-full p-2 border border-emerald-400 dark:border-emerald-600 rounded-md dark:bg-gray-700 dark:text-white"
                  >
                    {businessDaysList.map((d) => {
                      const opened = new Date(d.opened_at).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                      const closed = d.closed_at
                        ? new Date(d.closed_at).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : 'مفتوح الآن';
                      return (
                        <option key={d.id} value={d.id}>
                          {d.status === 'open' ? '🟢' : '⚫'} يوم #{d.id} — {opened} ← {closed}
                        </option>
                      );
                    })}
                  </select>
                  {selectedBusinessDayId && (() => {
                    const day = businessDaysList.find(d => d.id === selectedBusinessDayId);
                    return day ? (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        📊 عرض مصروفات يوم #{day.id} • فُتح بواسطة {day.opened_by_name}
                        {day.status === 'open' && <span className="text-orange-500"> (مفتوح)</span>}
                      </p>
                    ) : null;
                  })()}
                </>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الفئة</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
            >
              <option value="">الكل</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setFilterCategory('');
                setFilterMode('date');
              }}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              إعادة تعيين
            </button>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg shadow-md p-6 mb-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm opacity-90">إجمالي المصروفات</p>
            <p className="text-3xl font-bold">{getTotalExpenses().toFixed(2)} ج.م</p>
          </div>
          <div className="text-5xl opacity-50">💸</div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">جاري التحميل...</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  التاريخ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  الفئة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  الوصف
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  المبلغ
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  طريقة الدفع
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  إجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    لا توجد مصروفات
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(expense.date).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {expense.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600 dark:text-red-400">
                      {parseFloat(expense.amount.toString()).toFixed(2)} ج.م
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {expense.payment_method || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <EditIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingExpense ? 'تعديل مصروف' : 'إضافة مصروف جديد'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  التاريخ *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الفئة *
                </label>
                <input
                  type="text"
                  list="categories-list"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="اختر أو أدخل فئة جديدة"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                />
                <datalist id="categories-list">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الوصف
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  placeholder="تفاصيل المصروف..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  المبلغ *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  طريقة الدفع
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="نقدي">نقدي</option>
                  <option value="بطاقة">بطاقة</option>
                  <option value="تحويل بنكي">تحويل بنكي</option>
                  <option value="شيك">شيك</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSave}
                className="flex-1 bg-amber-500 text-white px-4 py-2 rounded-md hover:bg-amber-600"
              >
                حفظ
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesScreen;

import React, { useState, useEffect } from 'react';
import { inventory as inventoryApi } from '../utils/api';
import { EditIcon, TrashIcon, PlusCircleIcon } from '../components/icons';
import RecipesScreen from './RecipesScreen';

interface InventoryItem {
  id: number;
  name: string;
  unit: string;
  stock: number;
  cost: number;
  supplier_id?: number;
  supplier_name?: string;
}

interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
}

const InventoryScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'items' | 'suppliers' | 'recipes'>('items');
  
  // Items State
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemForm, setItemForm] = useState({
    name: '',
    unit: '',
    stock: '',
    cost: '',
    supplier_id: '',
  });

  // Suppliers State
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    if (activeTab === 'items') fetchItems();
    if (activeTab === 'suppliers') fetchSuppliers();
  }, [activeTab]);

  // ========== ITEMS FUNCTIONS ==========
  const fetchItems = async () => {
    try {
      setItemsLoading(true);
      const response = await inventoryApi.getAllItems();
      if (response.data.success) {
        setItems(response.data.data);
      }
    } catch (error) {
      console.error('Fetch items error:', error);
    } finally {
      setItemsLoading(false);
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setItemForm({ name: '', unit: '', stock: '0', cost: '0', supplier_id: '' });
    setItemModalOpen(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      unit: item.unit || '',
      stock: item.stock.toString(),
      cost: item.cost.toString(),
      supplier_id: item.supplier_id?.toString() || '',
    });
    setItemModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (!itemForm.name) {
      alert('اسم الصنف مطلوب');
      return;
    }

    try {
      const data = {
        name: itemForm.name,
        unit: itemForm.unit,
        stock: parseFloat(itemForm.stock) || 0,
        cost: parseFloat(itemForm.cost) || 0,
        supplier_id: itemForm.supplier_id ? parseInt(itemForm.supplier_id) : null,
      };

      if (editingItem) {
        await inventoryApi.updateItem(editingItem.id, data);
        alert('تم تحديث الصنف بنجاح');
      } else {
        await inventoryApi.createItem(data);
        alert('تم إضافة الصنف بنجاح');
      }

      setItemModalOpen(false);
      fetchItems();
    } catch (error) {
      console.error('Save item error:', error);
      alert('فشل في حفظ الصنف');
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الصنف؟')) return;

    try {
      await inventoryApi.deleteItem(id);
      alert('تم حذف الصنف بنجاح');
      fetchItems();
    } catch (error) {
      console.error('Delete item error:', error);
      alert('فشل في حذف الصنف');
    }
  };

  // ========== SUPPLIERS FUNCTIONS ==========
  const fetchSuppliers = async () => {
    try {
      setSuppliersLoading(true);
      const response = await inventoryApi.getAllSuppliers();
      if (response.data.success) {
        setSuppliers(response.data.data);
      }
    } catch (error) {
      console.error('Fetch suppliers error:', error);
    } finally {
      setSuppliersLoading(false);
    }
  };

  const handleAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm({ name: '', contact_person: '', phone: '', email: '' });
    setSupplierModalOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
    });
    setSupplierModalOpen(true);
  };

  const handleSaveSupplier = async () => {
    if (!supplierForm.name) {
      alert('اسم المورد مطلوب');
      return;
    }

    try {
      if (editingSupplier) {
        await inventoryApi.updateSupplier(editingSupplier.id, supplierForm);
        alert('تم تحديث المورد بنجاح');
      } else {
        await inventoryApi.createSupplier(supplierForm);
        alert('تم إضافة المورد بنجاح');
      }

      setSupplierModalOpen(false);
      fetchSuppliers();
    } catch (error) {
      console.error('Save supplier error:', error);
      alert('فشل في حفظ المورد');
    }
  };

  const handleDeleteSupplier = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المورد؟')) return;

    try {
      await inventoryApi.deleteSupplier(id);
      alert('تم حذف المورد بنجاح');
      fetchSuppliers();
    } catch (error) {
      console.error('Delete supplier error:', error);
      alert('فشل في حذف المورد');
    }
  };

  const navButtonClass = (tabName: string) =>
    `py-4 px-6 text-lg font-medium border-b-4 transition-colors ${
      activeTab === tabName
        ? 'border-amber-500 text-amber-600 dark:text-amber-400'
        : 'border-transparent text-gray-500 hover:text-amber-600 hover:border-amber-300'
    }`;

  return (
    <div className="p-6">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        📦 المخزون والموردين
      </h1>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button onClick={() => setActiveTab('items')} className={navButtonClass('items')}>
          📦 عناصر المخزون
        </button>
        <button onClick={() => setActiveTab('suppliers')} className={navButtonClass('suppliers')}>
          🏢 الموردون
        </button>
        <button onClick={() => setActiveTab('recipes')} className={navButtonClass('recipes')}>
          📋 الوصفات (BOM)
        </button>
      </div>

      {/* Items Tab */}
      {activeTab === 'items' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">عناصر المخزون</h2>
            <button
              onClick={handleAddItem}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              <PlusCircleIcon className="w-5 h-5" />
              إضافة صنف جديد
            </button>
          </div>

          {itemsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="p-3 text-right">الاسم</th>
                    <th className="p-3 text-right">الوحدة</th>
                    <th className="p-3 text-right">المخزون</th>
                    <th className="p-3 text-right">التكلفة</th>
                    <th className="p-3 text-right">المورد</th>
                    <th className="p-3 text-right">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        لا توجد أصناف في المخزون
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="p-3 font-medium">{item.name}</td>
                        <td className="p-3">{item.unit || '-'}</td>
                        <td className="p-3">
                          <span className={`font-bold ${item.stock < 10 ? 'text-red-600' : 'text-green-600'}`}>
                            {parseFloat(item.stock.toString()).toFixed(2)}
                          </span>
                        </td>
                        <td className="p-3">{parseFloat(item.cost.toString()).toFixed(2)} ج.م</td>
                        <td className="p-3">{item.supplier_name || '-'}</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditItem(item)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                            >
                              <EditIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-red-600 hover:text-red-800 p-1"
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
            </div>
          )}

          {/* Item Modal */}
          {itemModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    {editingItem ? 'تعديل صنف' : 'إضافة صنف جديد'}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        اسم الصنف *
                      </label>
                      <input
                        type="text"
                        value={itemForm.name}
                        onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                        placeholder="مثال: لحم بقري"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        الوحدة
                      </label>
                      <input
                        type="text"
                        value={itemForm.unit}
                        onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                        placeholder="مثال: كجم"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          المخزون
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={itemForm.stock}
                          onChange={(e) => setItemForm({ ...itemForm, stock: e.target.value })}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          التكلفة (ج.م)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={itemForm.cost}
                          onChange={(e) => setItemForm({ ...itemForm, cost: e.target.value })}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        المورد (اختياري)
                      </label>
                      <select
                        value={itemForm.supplier_id}
                        onChange={(e) => setItemForm({ ...itemForm, supplier_id: e.target.value })}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">-- اختر مورد --</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={handleSaveItem}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      حفظ
                    </button>
                    <button
                      onClick={() => setItemModalOpen(false)}
                      className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Suppliers Tab */}
      {activeTab === 'suppliers' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">قائمة الموردين</h2>
            <button
              onClick={handleAddSupplier}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              <PlusCircleIcon className="w-5 h-5" />
              إضافة مورد جديد
            </button>
          </div>

          {suppliersLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="p-3 text-right">الاسم</th>
                    <th className="p-3 text-right">مسؤول الاتصال</th>
                    <th className="p-3 text-right">الهاتف</th>
                    <th className="p-3 text-right">البريد</th>
                    <th className="p-3 text-right">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        لا يوجد موردين
                      </td>
                    </tr>
                  ) : (
                    suppliers.map((supplier) => (
                      <tr key={supplier.id} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="p-3 font-medium">{supplier.name}</td>
                        <td className="p-3">{supplier.contact_person || '-'}</td>
                        <td className="p-3">{supplier.phone || '-'}</td>
                        <td className="p-3">{supplier.email || '-'}</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditSupplier(supplier)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                            >
                              <EditIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSupplier(supplier.id)}
                              className="text-red-600 hover:text-red-800 p-1"
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
            </div>
          )}

          {/* Supplier Modal */}
          {supplierModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    {editingSupplier ? 'تعديل مورد' : 'إضافة مورد جديد'}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        اسم المورد *
                      </label>
                      <input
                        type="text"
                        value={supplierForm.name}
                        onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                        placeholder="مثال: شركة الأغذية المتحدة"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        مسؤول الاتصال
                      </label>
                      <input
                        type="text"
                        value={supplierForm.contact_person}
                        onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                        placeholder="مثال: أحمد محمد"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        الهاتف
                      </label>
                      <input
                        type="text"
                        value={supplierForm.phone}
                        onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                        placeholder="01234567890"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        البريد الإلكتروني
                      </label>
                      <input
                        type="email"
                        value={supplierForm.email}
                        onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                        placeholder="example@company.com"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={handleSaveSupplier}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      حفظ
                    </button>
                    <button
                      onClick={() => setSupplierModalOpen(false)}
                      className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recipes Tab */}
      {activeTab === 'recipes' && <RecipesScreen />}
    </div>
  );
};

export default InventoryScreen;

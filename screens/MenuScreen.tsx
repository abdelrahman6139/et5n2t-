import React, { useState, useEffect } from 'react';
import { menu as menuApi, noteOptions as noteOptionsApi, printers as printersApi } from '../utils/api';
import { MenuItem } from '../types';
import { PlusCircleIcon, EditIcon, TrashIcon } from '../components/icons';

const MenuScreen: React.FC = () => {
  const [mainCategories, setMainCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedMainId, setSelectedMainId] = useState(null);
  const [selectedSubId, setSelectedSubId] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'menu' | 'noteOptions'>('menu');

  // Modal states
  const [isItemModalOpen, setItemModalOpen] = useState(false);
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [isSubModalOpen, setSubModalOpen] = useState(false);
  const [isMainModalOpen, setMainModalOpen] = useState(false);

  const [editingItem, setEditingItem] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSub, setEditingSub] = useState(null);
  const [editingMain, setEditingMain] = useState(null);

  // Printers state (for item printer assignment)
  const [availablePrinters, setAvailablePrinters] = useState<any[]>([]);

  // Note Options state
  const [noteOptionsList, setNoteOptionsList] = useState<any[]>([]);
  const [isNoteOptModalOpen, setNoteOptModalOpen] = useState(false);
  const [editingNoteOpt, setEditingNoteOpt] = useState<any>(null);
  const [noteOptForm, setNoteOptForm] = useState({ name: '', price: 0 });

  // Track which level the "add item" button was clicked on
  const [addItemTargetLevel, setAddItemTargetLevel] = useState<{ level: 'root' | 'main' | 'sub' | 'category'; id: number } | null>(null);

  useEffect(() => {
    fetchMenuData();
    fetchNoteOptions();
    fetchAvailablePrinters();
  }, []);

  const fetchAvailablePrinters = async () => {
    try {
      const res = await printersApi.getAll();
      if (res.data.success) setAvailablePrinters(res.data.data);
    } catch (err) {
      console.error('Failed to fetch printers:', err);
    }
  };

  const fetchNoteOptions = async () => {
    try {
      const res = await noteOptionsApi.getAll();
      if (res.data.success) setNoteOptionsList(res.data.data);
    } catch (err) {
      console.error('Failed to fetch note options:', err);
    }
  };

  const handleOpenNoteOptModal = (opt?: any) => {
    if (opt) {
      setEditingNoteOpt(opt);
      setNoteOptForm({ name: opt.name, price: Number(opt.price) });
    } else {
      setEditingNoteOpt(null);
      setNoteOptForm({ name: '', price: 0 });
    }
    setNoteOptModalOpen(true);
  };

  const handleSaveNoteOpt = async () => {
    if (!noteOptForm.name.trim()) { alert('الرجاء إدخال الاسم'); return; }
    try {
      if (editingNoteOpt) {
        await noteOptionsApi.update(editingNoteOpt.id, noteOptForm);
        alert('تم تحديث الملاحظة بنجاح');
      } else {
        await noteOptionsApi.create(noteOptForm);
        alert('تم إضافة الملاحظة بنجاح');
      }
      setNoteOptModalOpen(false);
      fetchNoteOptions();
    } catch (err) {
      alert('فشل حفظ الملاحظة');
    }
  };

  const handleDeleteNoteOpt = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) return;
    try {
      await noteOptionsApi.delete(id);
      fetchNoteOptions();
    } catch (err) {
      alert('فشل حذف الملاحظة');
    }
  };

  const handleToggleNoteOpt = async (opt: any) => {
    try {
      await noteOptionsApi.update(opt.id, { is_active: !opt.is_active });
      fetchNoteOptions();
    } catch (err) {
      alert('فشل تحديث الحالة');
    }
  };

  const fetchMenuData = async () => {
    try {
      setLoading(true);
      const response = await menuApi.getHierarchy();
      if (response.data.success) {
        const hierarchy = response.data.data as any[];
        setMainCategories(hierarchy);

        const allSubs: any[] = [];
        const allCats: any[] = [];
        const allItems: MenuItem[] = [];

        hierarchy.forEach(main => {
          // Items directly under main category
          (main.directItems || []).forEach((it: any) => {
            allItems.push({
              id: it.id,
              name: it.name,
              price: parseFloat(it.price),
              categoryId: null,
              mainCategoryId: main.id,
              subCategoryId: null,
              isAvailable: it.is_active,
              printer: it.printer,
              imageUrl: it.image_url,
            });
          });

          main.subCategories.forEach((sub: any) => {
            allSubs.push(sub);

            // Items directly under sub category
            (sub.directItems || []).forEach((it: any) => {
              allItems.push({
                id: it.id,
                name: it.name,
                price: parseFloat(it.price),
                categoryId: null,
                mainCategoryId: null,
                subCategoryId: sub.id,
                isAvailable: it.is_active,
                printer: it.printer,
                imageUrl: it.image_url,
              });
            });

            sub.categories.forEach((cat: any) => {
              allCats.push(cat);
              cat.items.forEach((it: any) => {
                allItems.push({
                  id: it.id,
                  name: it.name,
                  price: parseFloat(it.price),
                  categoryId: cat.id,
                  mainCategoryId: null,
                  subCategoryId: null,
                  isAvailable: it.is_active,
                  printer: it.printer,
                  imageUrl: it.image_url,
                });
              });
            });
          });
        });

        setSubCategories(allSubs);
        setCategories(allCats);
        setItems(allItems);

        // Don't auto-select if already selected
        if (!selectedMainId) {
          const firstMain = hierarchy.find(m => m.id !== -1) || hierarchy[0];
          const firstSub = firstMain?.subCategories?.[0];
          const firstCat = firstSub?.categories?.[0];

          setSelectedMainId(firstMain?.id ?? null);
          setSelectedSubId(firstSub?.id ?? null);
          setSelectedCategoryId(firstCat?.id ?? null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch menu:', err);
    } finally {
      setLoading(false);
    }
  };

  // ==================== ITEM HANDLERS ====================
  const handleAddItem = (level?: 'root' | 'main' | 'sub' | 'category', id?: number) => {
    // If called from a specific level button
    if (level) {
      setAddItemTargetLevel({ level, id: Number(id ?? -1) });
    } else {
      // Called from items column — use deepest selected level
      if (selectedCategoryId && selectedCategoryId !== -1) {
        setAddItemTargetLevel({ level: 'category', id: Number(selectedCategoryId) });
      } else if (selectedSubId && selectedSubId !== -1) {
        setAddItemTargetLevel({ level: 'sub', id: Number(selectedSubId) });
      } else if (selectedMainId && selectedMainId !== -1) {
        setAddItemTargetLevel({ level: 'main', id: Number(selectedMainId) });
      } else {
        setAddItemTargetLevel({ level: 'root', id: -1 });
      }
    }
    setEditingItem(null);
    setItemModalOpen(true);
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemModalOpen(true);
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الصنف؟')) return;
    try {
      await menuApi.deleteItem(itemId);
      alert('تم حذف الصنف بنجاح');
      await fetchMenuData();
    } catch (err: any) {
      console.error('Failed to delete item:', err);
      alert('فشل حذف الصنف');
    }
  };

  const handleSaveItem = async (itemData: any) => {
    try {
      const payload: any = {
        name: itemData.name,
        price: itemData.price,
        printer: itemData.printer,
        imageUrl: itemData.imageUrl,
        parentLevel: itemData.parentLevel
      };

      if (itemData.parentLevel === 'category') {
        payload.categoryId = itemData.parentId;
      } else if (itemData.parentLevel === 'sub') {
        payload.subCategoryId = itemData.parentId;
      } else if (itemData.parentLevel === 'main') {
        payload.mainCategoryId = itemData.parentId;
      }
      // logic for 'root' is handled by backend (nulls)

      if (editingItem) {
        payload.isActive = itemData.isAvailable;
        await menuApi.updateItem(itemData.id, payload);
        alert('تم تحديث الصنف بنجاح');
      } else {
        await menuApi.addItem(payload);
        alert('تم إضافة الصنف بنجاح');
      }
      setItemModalOpen(false);
      setAddItemTargetLevel(null);
      await fetchMenuData();
    } catch (err: any) {
      console.error('Failed to save item:', err);
      if (err.response?.data?.error) {
        alert(`فشل حفظ البيانات: ${err.response.data.error}`);
      } else {
        alert('فشل حفظ البيانات');
      }
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      await menuApi.updateItem(item.id, {
        isActive: !item.isAvailable
      });
      setItems(items.map(i =>
        i.id === item.id ? { ...i, isAvailable: !i.isAvailable } : i
      ));
    } catch (err) {
      console.error('Failed to toggle availability:', err);
      alert('فشل تحديث الحالة');
    }
  };

  // ==================== CATEGORY HANDLERS ====================
  const handleAddCategory = () => {
    if (!selectedSubId) {
      alert('الرجاء اختيار مجموعة فرعية أولاً');
      return;
    }
    // Prevent adding to dummy "Uncategorized" sub-category
    if (selectedSubId === -1) {
      alert('لا يمكن إضافة فئات إلى المجموعة غير المصنفة');
      return;
    }
    setEditingCategory(null);
    setCategoryModalOpen(true);
  };

  const handleEditCategory = (cat: any) => {
    if (cat.id === -1) return; // Cannot edit dummy category
    setEditingCategory(cat);
    setCategoryModalOpen(true);
  };

  const handleDeleteCategory = async (cat: any) => {
    if (cat.id === -1) return; // Cannot delete dummy category
    if (!window.confirm('هل أنت متأكد من حذف هذه الفئة؟')) return;
    try {
      await menuApi.deleteCategory(cat.id);
      alert('تم حذف الفئة بنجاح');
      await fetchMenuData();
    } catch (err: any) {
      console.error('Failed to delete category:', err);
      alert('فشل حذف الفئة');
    }
  };

  const handleSaveCategory = async (name: string) => {
    try {
      if (editingCategory) {
        await menuApi.updateCategory(editingCategory.id, { name });
        alert('تم تحديث الفئة بنجاح');
      } else {
        await menuApi.createCategory({ name, subCategoryId: selectedSubId });
        alert('تم إضافة الفئة بنجاح');
      }
      setCategoryModalOpen(false);
      await fetchMenuData();
    } catch (err) {
      console.error('Failed to save category:', err);
      alert('فشل حفظ الفئة');
    }
  };

  // ==================== SUB CATEGORY HANDLERS ====================
  const handleAddSub = () => {
    if (!selectedMainId) {
      alert('الرجاء اختيار مجموعة رئيسية أولاً');
      return;
    }
    if (selectedMainId === -1) {
      alert('لا يمكن إضافة مجموعات فرعية إلى المجموعة غير المصنفة');
      return;
    }
    setEditingSub(null);
    setSubModalOpen(true);
  };

  const handleEditSub = (sub: any) => {
    if (sub.id === -1) return;
    setEditingSub(sub);
    setSubModalOpen(true);
  };

  const handleDeleteSub = async (sub: any) => {
    if (sub.id === -1) return;
    if (!window.confirm('هل أنت متأكد من حذف هذه المجموعة الفرعية؟')) return;
    try {
      await menuApi.deleteSubCategory(sub.id);
      alert('تم حذف المجموعة الفرعية بنجاح');
      await fetchMenuData();
    } catch (err: any) {
      console.error('Failed to delete sub category:', err);
      alert('فشل حذف المجموعة الفرعية');
    }
  };

  const handleSaveSub = async (name: string) => {
    try {
      if (editingSub) {
        await menuApi.updateSubCategory(editingSub.id, { name });
        alert('تم تحديث المجموعة الفرعية بنجاح');
      } else {
        await menuApi.createSubCategory({ name, mainCategoryId: selectedMainId });
        alert('تم إضافة المجموعة الفرعية بنجاح');
      }
      setSubModalOpen(false);
      await fetchMenuData();
    } catch (err) {
      console.error('Failed to save sub category:', err);
      alert('فشل حفظ المجموعة الفرعية');
    }
  };

  // ==================== MAIN CATEGORY HANDLERS ====================
  const handleAddMain = () => {
    setEditingMain(null);
    setMainModalOpen(true);
  };

  const handleEditMain = (main: any) => {
    if (main.id === -1) return;
    setEditingMain(main);
    setMainModalOpen(true);
  };

  const handleDeleteMain = async (main: any) => {
    if (main.id === -1) return;
    if (!window.confirm('هل أنت متأكد من حذف هذه المجموعة الرئيسية؟')) return;
    try {
      await menuApi.deleteMainCategory(main.id);
      alert('تم حذف المجموعة الرئيسية بنجاح');
      await fetchMenuData();
    } catch (err: any) {
      console.error('Failed to delete main category:', err);
      alert('فشل حذف المجموعة الرئيسية');
    }
  };

  const handleSaveMain = async (name: string) => {
    try {
      if (editingMain) {
        await menuApi.updateMainCategory(editingMain.id, { name });
        alert('تم تحديث المجموعة الرئيسية بنجاح');
      } else {
        await menuApi.createMainCategory({ name });
        alert('تم إضافة المجموعة الرئيسية بنجاح');
      }
      setMainModalOpen(false);
      await fetchMenuData();
    } catch (err) {
      console.error('Failed to save main category:', err);
      alert('فشل حفظ المجموعة الرئيسية');
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-lg text-white">
        جاري التحميل...
      </div>
    );
  }

  const visibleSubGroups = subCategories.filter(
    (sg: any) => Number(sg.main_category_id) === selectedMainId && sg.id !== -1
  );
  const visibleCategories = categories.filter(
    (c: any) => Number(c.sub_category_id) === selectedSubId && c.id !== -1
  );

  // Direct items at each level (files alongside folders)
  const rootItems = items.filter((i: any) =>
    i.mainCategoryId === -1 || i.subCategoryId === -1 || i.categoryId === -1 ||
    (i.mainCategoryId === null && i.subCategoryId === null && i.categoryId === null)
  );
  const mainDirectItems = items.filter((i: any) => i.mainCategoryId === selectedMainId && selectedMainId !== -1 && i.subCategoryId === null && i.categoryId === null);
  const subDirectItems = items.filter((i: any) => i.subCategoryId === selectedSubId && selectedSubId !== -1 && i.categoryId === null);

  // Items column: only shows items under the selected category
  const visibleItems = (selectedCategoryId && selectedCategoryId !== -1)
    ? items.filter((i: any) => i.categoryId === selectedCategoryId)
    : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-amber-400">
          إدارة قائمة الطعام
        </h1>
        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('menu')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
              activeTab === 'menu'
                ? 'bg-amber-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🍽 القائمة
          </button>
          <button
            onClick={() => setActiveTab('noteOptions')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
              activeTab === 'noteOptions'
                ? 'bg-amber-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📝 خيارات الملاحظات
          </button>
        </div>
      </div>

      {/* ========== NOTE OPTIONS TAB ========== */}
      {activeTab === 'noteOptions' && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-amber-400">خيارات الملاحظات القياسية</h2>
            <button
              onClick={() => handleOpenNoteOptModal()}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold"
            >
              <PlusCircleIcon className="w-4 h-4" /> إضافة خيار
            </button>
          </div>

          {noteOptionsList.length === 0 ? (
            <p className="text-gray-400 text-center py-8">لا توجد خيارات ملاحظات بعد</p>
          ) : (
            <table className="w-full text-right">
              <thead>
                <tr className="text-gray-400 text-sm border-b border-gray-700">
                  <th className="pb-2">الاسم</th>
                  <th className="pb-2">السعر</th>
                  <th className="pb-2">الحالة</th>
                  <th className="pb-2">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {noteOptionsList.map(opt => (
                  <tr key={opt.id} className="text-white text-sm">
                    <td className="py-3">{opt.name}</td>
                    <td className="py-3">{Number(opt.price) > 0 ? `${Number(opt.price).toFixed(2)} ج.م` : 'مجاني'}</td>
                    <td className="py-3">
                      <button
                        onClick={() => handleToggleNoteOpt(opt)}
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          opt.is_active
                            ? 'bg-green-700 text-green-100 hover:bg-green-600'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        {opt.is_active ? 'مفعّل' : 'معطّل'}
                      </button>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenNoteOptModal(opt)}
                          className="text-blue-400 hover:text-blue-300"
                          title="تعديل"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteNoteOpt(opt.id)}
                          className="text-red-400 hover:text-red-300"
                          title="حذف"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Note Option Modal */}
      {isNoteOptModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-bold text-amber-400 mb-4">
              {editingNoteOpt ? 'تعديل خيار الملاحظة' : 'إضافة خيار ملاحظة'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">الاسم</label>
                <input
                  type="text"
                  value={noteOptForm.name}
                  onChange={e => setNoteOptForm({ ...noteOptForm, name: e.target.value })}
                  className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
                  placeholder="مثال: بدون بصل"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">السعر الإضافي (ج.م) — اتركه 0 للمجاني</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={noteOptForm.price}
                  onChange={e => setNoteOptForm({ ...noteOptForm, price: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setNoteOptModalOpen(false)}
                className="px-4 py-2 rounded bg-gray-600 text-white hover:bg-gray-500"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveNoteOpt}
                className="px-4 py-2 rounded bg-amber-600 text-white hover:bg-amber-700"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Four columns layout - RTL ORDER */}
      {activeTab === 'menu' && (
      <div className="grid grid-cols-4 gap-4">
        {/* Main groups (FIRST from right) */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-1 space-x-reverse">
              <button
                onClick={handleAddMain}
                className="text-amber-400 hover:text-amber-300"
                title="إضافة مجموعة رئيسية"
              >
                <PlusCircleIcon className="w-6 h-6" />
              </button>
              <button
                onClick={() => handleAddItem('root', -1)}
                className="text-green-400 hover:text-green-300"
                title="إضافة صنف في القائمة الرئيسية"
              >
                <span className="text-lg font-bold">📄+</span>
              </button>
            </div>
            <h2 className="text-xl font-semibold text-white">المجموعات الرئيسية</h2>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto">
            {mainCategories.filter((mg: any) => mg.id !== -1).map((mg: any) => (
              <div
                key={mg.id}
                onClick={() => {
                  setSelectedMainId(mg.id);
                  const firstSub = subCategories.find(
                    (sg: any) => Number(sg.main_category_id) === mg.id
                  );
                  setSelectedSubId(firstSub?.id ?? null);
                  const firstCat = categories.find(
                    (c: any) => Number(c.sub_category_id) === firstSub?.id
                  );
                  setSelectedCategoryId(firstCat?.id ?? null);
                }}
                className={`w-full flex items-center justify-between text-right p-3 rounded-md text-lg cursor-pointer ${selectedMainId === mg.id
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-white'
                  }`}
              >
                <div className="flex items-center space-x-2 space-x-reverse">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditMain(mg);
                    }}
                    className="text-green-400 hover:text-green-200"
                    title="تعديل"
                  >
                    <EditIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMain(mg);
                    }}
                    className="text-red-400 hover:text-red-200"
                    title="حذف"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
                <span>📁 {mg.name}</span>
              </div>
            ))}

            {/* Root items (files in first column) */}
            {rootItems.map((item: any) => (
              <div
                key={`root-item-${item.id}`}
                className="w-full flex items-center justify-between text-right p-3 rounded-md text-lg bg-gray-800 hover:bg-gray-700 text-amber-300 border border-dashed border-amber-700"
              >
                <div className="flex items-center space-x-2 space-x-reverse">
                  <button
                    onClick={() => handleEditItem(item)}
                    className="text-green-400 hover:text-green-200"
                    title="تعديل"
                  >
                    <EditIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="text-red-400 hover:text-red-200"
                    title="حذف"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
                <span>🍽️ {item.name} <span className="text-sm text-gray-400">{item.price} ج.م</span></span>
              </div>
            ))}
          </div>
        </div>

        {/* Sub groups (SECOND from right) */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-1 space-x-reverse">
              <button
                onClick={handleAddSub}
                disabled={!selectedMainId || selectedMainId === -1}
                className="text-amber-400 hover:text-amber-300 disabled:opacity-30"
                title="إضافة مجموعة فرعية"
              >
                <PlusCircleIcon className="w-6 h-6" />
              </button>
              <button
                onClick={() => handleAddItem('main', selectedMainId!)}
                disabled={!selectedMainId || selectedMainId === -1}
                className="text-green-400 hover:text-green-300 disabled:opacity-30"
                title="إضافة صنف في المجموعة الرئيسية"
              >
                <span className="text-lg font-bold">📄+</span>
              </button>
            </div>
            <h2 className="text-xl font-semibold text-white">المجموعات الفرعية</h2>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto">
            {selectedMainId == null || selectedMainId === -1 ? (
              <div className="text-gray-400 text-center py-8">
                اختر مجموعة رئيسية أولاً
              </div>
            ) : (
              <>
                {/* Sub-groups (folders) */}
                {visibleSubGroups.map((sg: any) => (
                  <div
                    key={sg.id}
                    onClick={() => {
                      setSelectedSubId(sg.id);
                      const firstCat = categories.find(
                        (c: any) => Number(c.sub_category_id) === sg.id
                      );
                      setSelectedCategoryId(firstCat?.id ?? null);
                    }}
                    className={`w-full flex items-center justify-between text-right p-3 rounded-md text-lg cursor-pointer ${selectedSubId === sg.id
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-white'
                      }`}
                  >
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSub(sg);
                        }}
                        className="text-green-400 hover:text-green-200"
                        title="تعديل"
                      >
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSub(sg);
                        }}
                        className="text-red-400 hover:text-red-200"
                        title="حذف"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <span>📁 {sg.name}</span>
                  </div>
                ))}

                {/* Direct items under main category (files) */}
                {mainDirectItems.map((item: any) => (
                  <div
                    key={`main-item-${item.id}`}
                    className="w-full flex items-center justify-between text-right p-3 rounded-md text-lg bg-gray-800 hover:bg-gray-700 text-amber-300 border border-dashed border-amber-700"
                  >
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <button
                        onClick={() => handleEditItem(item)}
                        className="text-green-400 hover:text-green-200"
                        title="تعديل"
                      >
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-400 hover:text-red-200"
                        title="حذف"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <span>🍽️ {item.name} <span className="text-sm text-gray-400">{item.price} ج.م</span></span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Categories (THIRD from right) */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-1 space-x-reverse">
              <button
                onClick={handleAddCategory}
                disabled={!selectedSubId || selectedSubId === -1}
                className="text-amber-400 hover:text-amber-300 disabled:opacity-30"
                title="إضافة فئة"
              >
                <PlusCircleIcon className="w-6 h-6" />
              </button>
              <button
                onClick={() => handleAddItem('sub', selectedSubId!)}
                disabled={!selectedSubId || selectedSubId === -1}
                className="text-green-400 hover:text-green-300 disabled:opacity-30"
                title="إضافة صنف في المجموعة الفرعية"
              >
                <span className="text-lg font-bold">📄+</span>
              </button>
            </div>
            <h2 className="text-xl font-semibold text-white">الفئات</h2>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto">
            {selectedSubId == null || selectedSubId === -1 ? (
              <div className="text-gray-400 text-center py-8">
                اختر مجموعة فرعية أولاً
              </div>
            ) : (
              <>
                {/* Categories (folders) */}
                {visibleCategories.map((cat: any) => (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`w-full flex items-center justify-between text-right p-3 rounded-md text-lg cursor-pointer ${selectedCategoryId === cat.id
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-white'
                      }`}
                  >
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCategory(cat);
                        }}
                        className="text-green-400 hover:text-green-200"
                        title="تعديل"
                      >
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(cat);
                        }}
                        className="text-red-400 hover:text-red-200"
                        title="حذف"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <span>📁 {cat.name}</span>
                  </div>
                ))}

                {/* Direct items under sub category (files) */}
                {subDirectItems.map((item: any) => (
                  <div
                    key={`sub-item-${item.id}`}
                    className="w-full flex items-center justify-between text-right p-3 rounded-md text-lg bg-gray-800 hover:bg-gray-700 text-amber-300 border border-dashed border-amber-700"
                  >
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <button
                        onClick={() => handleEditItem(item)}
                        className="text-green-400 hover:text-green-200"
                        title="تعديل"
                      >
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-400 hover:text-red-200"
                        title="حذف"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <span>🍽️ {item.name} <span className="text-sm text-gray-400">{item.price} ج.م</span></span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Items (FOURTH/LEFT - last column) */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => handleAddItem('category', selectedCategoryId!)}
              disabled={!selectedCategoryId || selectedCategoryId === -1}
              className="text-amber-400 hover:text-amber-300 disabled:opacity-30"
              title="إضافة صنف"
            >
              <PlusCircleIcon className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-semibold text-white">الأصناف</h2>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto">
            {selectedCategoryId == null || selectedCategoryId === -1 ? (
              <div className="text-gray-400 text-center py-8">
                اختر فئة لعرض الأصناف
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                لا توجد أصناف في هذه الفئة
              </div>
            ) : (
              visibleItems.map((item: any) => (
                <div
                  key={item.id}
                  className="w-full flex items-center justify-between text-right p-3 rounded-md bg-gray-800 hover:bg-gray-700 text-white"
                >
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold cursor-pointer ${item.isAvailable
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                        }`}
                      onClick={() => toggleAvailability(item)}
                    >
                      {item.isAvailable ? 'متاح' : 'غير متاح'}
                    </span>
                    <button
                      onClick={() => handleEditItem(item)}
                      className="text-green-400 hover:text-green-200"
                      title="تعديل"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-red-400 hover:text-red-200"
                      title="حذف"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 text-right">
                    <div className="text-lg">{item.name}</div>
                    <div className="text-sm text-gray-400">
                      {item.price.toFixed(2)} ج.م
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      )}

      {/* Modals */}
      {isItemModalOpen && (
        <MenuItemModal
          item={editingItem}
          targetLevel={addItemTargetLevel}
          mainCategories={mainCategories.filter(m => m.id !== -1)}
          subCategories={subCategories.filter(s => s.id !== -1)}
          categories={categories.filter(c => c.id !== -1)}
          printers={availablePrinters}
          onSave={handleSaveItem}
          onClose={() => setItemModalOpen(false)}
        />
      )}
      {isCategoryModalOpen && (
        <SimpleModal
          title={editingCategory ? 'تعديل الفئة' : 'إضافة فئة جديدة'}
          initialValue={editingCategory?.name || ''}
          onSave={handleSaveCategory}
          onClose={() => setCategoryModalOpen(false)}
        />
      )}
      {isSubModalOpen && (
        <SimpleModal
          title={editingSub ? 'تعديل المجموعة الفرعية' : 'إضافة مجموعة فرعية جديدة'}
          initialValue={editingSub?.name || ''}
          onSave={handleSaveSub}
          onClose={() => setSubModalOpen(false)}
        />
      )}
      {isMainModalOpen && (
        <SimpleModal
          title={editingMain ? 'تعديل المجموعة الرئيسية' : 'إضافة مجموعة رئيسية جديدة'}
          initialValue={editingMain?.name || ''}
          onSave={handleSaveMain}
          onClose={() => setMainModalOpen(false)}
        />
      )}
    </div>
  );
};

// Simple Modal for Main/Sub/Category
const SimpleModal: React.FC<{
  title: string;
  initialValue: string;
  onSave: (name: string) => void;
  onClose: () => void;
}> = ({ title, initialValue, onSave, onClose }) => {
  const [name, setName] = useState(initialValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('الرجاء إدخال الاسم');
      return;
    }
    onSave(name);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{title}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              الاسم
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex justify-end space-x-2 space-x-reverse">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-500 text-white hover:bg-gray-600"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-amber-600 text-white hover:bg-amber-700"
            >
              حفظ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Menu Item Modal - parent level is determined by sidebar selection
const MenuItemModal: React.FC<{
  item: MenuItem | null;
  targetLevel: { level: 'root' | 'main' | 'sub' | 'category'; id: number } | null;
  mainCategories: any[];
  subCategories: any[];
  categories: any[];
  printers?: any[];
  onSave: (item: any) => void;
  onClose: () => void;
}> = ({ item, targetLevel, mainCategories, subCategories, categories, printers = [], onSave, onClose }) => {
  // Determine initial parent state
  const getInitialParentState = () => {
    if (item) {
      if (item.categoryId) return { level: 'category', id: item.categoryId };
      if (item.subCategoryId) return { level: 'sub', id: item.subCategoryId };
      if (item.mainCategoryId) return { level: 'main', id: item.mainCategoryId };
      return { level: 'root', id: -1 };
    }
    return targetLevel || { level: 'root', id: -1 };
  };

  const initialParent = getInitialParentState();

  // Explicit state for intermediate levels to allow step-by-step selection
  const [selectedMainId, setSelectedMainIdLocal] = useState<number>(() => {
    if (initialParent.level === 'main') return Number(initialParent.id);
    if (initialParent.level === 'sub') {
      return Number(subCategories.find(s => Number(s.id) === Number(initialParent.id))?.main_category_id ?? -1);
    }
    if (initialParent.level === 'category') {
      const subId = categories.find(c => Number(c.id) === Number(initialParent.id))?.sub_category_id;
      return Number(subCategories.find(s => Number(s.id) === Number(subId))?.main_category_id ?? -1);
    }
    return -1;
  });

  const [selectedSubId, setSelectedSubIdLocal] = useState<number>(() => {
    if (initialParent.level === 'sub') return Number(initialParent.id);
    if (initialParent.level === 'category') {
      return Number(categories.find(c => Number(c.id) === Number(initialParent.id))?.sub_category_id ?? -1);
    }
    return -1;
  });

  const [formData, setFormData] = useState<{
    name: string;
    price: number;
    printer: string;
    imageUrl: string;
    isAvailable: boolean;
    parentLevel: 'root' | 'main' | 'sub' | 'category';
    parentId: number;
  }>({
    name: item?.name || '',
    price: item?.price || 0,
    printer: item?.printer || 'Kitchen',
    imageUrl: item?.imageUrl || '',
    isAvailable: item?.isAvailable ?? true,
    parentLevel: initialParent.level as any,
    parentId: Number(initialParent.id)
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.parentLevel !== 'root' && formData.parentId === -1) {
      alert('الرجاء اختيار المكان الصحيح للصنف');
      return;
    }
    onSave({ id: item?.id || 0, ...formData });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-[32rem] max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          {item ? 'تعديل الصنف' : 'إضافة صنف جديد'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                اسم الصنف
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                السعر (ج.م)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                required
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <label className="block text-sm font-bold mb-2 text-amber-600 dark:text-amber-400">
              مكان الصنف في القائمة (التسلسل الهرمي)
            </label>

            <div className="space-y-3 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-500">المستوى</label>
                <select
                  value={formData.parentLevel}
                  onChange={(e) => {
                    const level = e.target.value as any;
                    setFormData({ ...formData, parentLevel: level, parentId: -1 });
                    if (level === 'root') {
                      setSelectedMainIdLocal(-1);
                      setSelectedSubIdLocal(-1);
                    }
                  }}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="root">القائمة الرئيسية (بدون مجموعة)</option>
                  <option value="main">داخل مجموعة رئيسية</option>
                  <option value="sub">داخل مجموعة فرعية</option>
                  <option value="category">داخل فئة</option>
                </select>
              </div>

              {formData.parentLevel !== 'root' && (
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-500">المجموعة الرئيسية</label>
                  <select
                    value={selectedMainId}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setSelectedMainIdLocal(id);
                      setSelectedSubIdLocal(-1);
                      if (formData.parentLevel === 'main') {
                        setFormData({ ...formData, parentId: id });
                      } else {
                        setFormData({ ...formData, parentId: -1 });
                      }
                    }}
                    required={true}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="-1">اختر مجموعة رئيسية...</option>
                    {mainCategories.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )}

              {(formData.parentLevel === 'sub' || formData.parentLevel === 'category') && (
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-500">المجموعة الفرعية</label>
                  <select
                    value={selectedSubId}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setSelectedSubIdLocal(id);

                      // Bidirectional: auto-select main group if not selected
                      const subComp = subCategories.find(s => Number(s.id) === id);
                      if (subComp && selectedMainId === -1) {
                        setSelectedMainIdLocal(Number(subComp.main_category_id));
                      }

                      if (formData.parentLevel === 'sub') {
                        setFormData({ ...formData, parentId: id });
                      } else {
                        setFormData({ ...formData, parentId: -1 });
                      }
                    }}
                    required={true}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="-1">اختر مجموعة فرعية...</option>
                    {subCategories
                      .filter(s => selectedMainId === -1 || Number(s.main_category_id) === selectedMainId)
                      .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              {formData.parentLevel === 'category' && (
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-500">الفئة</label>
                  <select
                    value={formData.parentId}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setFormData({ ...formData, parentId: id });

                      // Bidirectional: auto-select sub and main group
                      const catComp = categories.find(c => Number(c.id) === id);
                      if (catComp) {
                        const sId = Number(catComp.sub_category_id);
                        setSelectedSubIdLocal(sId);
                        const subComp = subCategories.find(s => Number(s.id) === sId);
                        if (subComp) {
                          setSelectedMainIdLocal(Number(subComp.main_category_id));
                        }
                      }
                    }}
                    required={true}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="-1">اختر فئة...</option>
                    {categories
                      .filter(c => selectedSubId === -1 || Number(c.sub_category_id) === selectedSubId)
                      .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              الطابعة / المحطة
            </label>
            <select
              value={formData.printer}
              onChange={(e) => setFormData({ ...formData, printer: e.target.value })}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="">-- بدون طابعة محددة (افتراضي) --</option>
              {printers.length > 0
                ? printers.map((p: any) => (
                    <option key={p.id} value={p.name}>
                      {p.name}{p.kitchen_name ? ` (${p.kitchen_name})` : ''}
                    </option>
                  ))
                : (
                  <>
                    <option value="Kitchen">المطبخ</option>
                    <option value="Bar">البار</option>
                    <option value="Dessert">الحلويات</option>
                  </>
                )
              }
            </select>
            {printers.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">لا توجد طابعات مسجلة. يمكنك إضافتها من الإعدادات &gt; الطابعات.</p>
            )}
          </div>

          <div className="flex justify-end space-x-2 space-x-reverse pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-500 text-white hover:bg-gray-600"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-amber-600 text-white hover:bg-amber-700"
            >
              حفظ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MenuScreen;

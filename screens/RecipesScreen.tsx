import React, { useState, useEffect } from 'react';
import { recipes as recipesApi } from '../utils/api';
import { PlusCircleIcon, EditIcon, TrashIcon } from '../components/icons';
import { inventory as inventoryApi } from '../utils/api';


interface InventoryItem {
  id: number;
  name: string;
  unit: string;
  stock: number;
  cost: number;
}

interface MenuItem {
  id: number;
  name: string;
  price: number;
}

interface RecipeIngredient {
  id?: number;
  inventory_item_id: number;
  item_name?: string;
  quantity: number;
  unit?: string;
  cost_per_unit: number;
  item_cost?: number;
  item_stock?: number;
}

interface Recipe {
  id: number;
  menu_item_id?: number;
  menu_item_name?: string;
  name: string;
  description?: string;
  total_cost: number;
  calculated_cost?: number;
  ingredients: RecipeIngredient[];
}

const RecipesScreen: React.FC = () => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    menu_item_id: '',
  });

  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [newIngredient, setNewIngredient] = useState({
    inventory_item_id: '',
    quantity: '',
    cost_per_unit: '',
  });

  useEffect(() => {
    fetchRecipes();
    fetchInventoryItems();
    fetchMenuItems();
     //fetchSuppliersForDropdown();
  }, []);


  
  // Also fetch suppliers for the item modal dropdown
 





  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const response = await recipesApi.getAll();
      if (response.data.success) {
        setRecipes(response.data.data);
      }
    } catch (error) {
      console.error('Fetch recipes error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryItems = async () => {
    try {
      const response = await recipesApi.getInventoryItems();
      if (response.data.success) {
        setInventoryItems(response.data.data);
      }
    } catch (error) {
      console.error('Fetch inventory items error:', error);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const response = await recipesApi.getMenuItems();
      if (response.data.success) {
        setMenuItems(response.data.data);
      }
    } catch (error) {
      console.error('Fetch menu items error:', error);
    }
  };

  const handleAddNew = () => {
    setEditingRecipe(null);
    setFormData({ name: '', description: '', menu_item_id: '' });
    setIngredients([]);
    setModalOpen(true);
  };

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setFormData({
      name: recipe.name,
      description: recipe.description || '',
      menu_item_id: recipe.menu_item_id?.toString() || '',
    });
    setIngredients(recipe.ingredients || []);
    setModalOpen(true);
  };

  const handleView = (recipe: Recipe) => {
    setViewingRecipe(recipe);
  };

  const handleAddIngredient = () => {
    if (!newIngredient.inventory_item_id || !newIngredient.quantity || !newIngredient.cost_per_unit) {
      alert('يرجى ملء جميع حقول المكون');
      return;
    }

    const item = inventoryItems.find(i => i.id === parseInt(newIngredient.inventory_item_id));
    if (!item) return;

    const ingredient: RecipeIngredient = {
      inventory_item_id: parseInt(newIngredient.inventory_item_id),
      item_name: item.name,
      quantity: parseFloat(newIngredient.quantity),
      unit: item.unit,
      cost_per_unit: parseFloat(newIngredient.cost_per_unit),
      item_cost: item.cost,
    };

    setIngredients([...ingredients, ingredient]);
    setNewIngredient({ inventory_item_id: '', quantity: '', cost_per_unit: '' });
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const calculateTotalCost = () => {
    return ingredients.reduce((sum, ing) => {
      return sum + (parseFloat(ing.quantity.toString()) * parseFloat(ing.cost_per_unit.toString()));
    }, 0);
  };

  const handleSave = async () => {
    if (!formData.name) {
      alert('اسم الوصفة مطلوب');
      return;
    }

    if (ingredients.length === 0) {
      alert('يجب إضافة مكون واحد على الأقل');
      return;
    }

    try {
      const data = {
        name: formData.name,
        description: formData.description,
        menu_item_id: formData.menu_item_id ? parseInt(formData.menu_item_id) : null,
        ingredients: ingredients.map(ing => ({
          inventory_item_id: ing.inventory_item_id,
          quantity: ing.quantity,
          unit: ing.unit,
          cost_per_unit: ing.cost_per_unit,
        })),
      };

      if (editingRecipe) {
        await recipesApi.update(editingRecipe.id, data);
        alert('تم تحديث الوصفة بنجاح');
      } else {
        await recipesApi.create(data);
        alert('تم إضافة الوصفة بنجاح');
      }

      setModalOpen(false);
      fetchRecipes();
    } catch (error) {
      console.error('Save recipe error:', error);
      alert('فشل في حفظ الوصفة');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الوصفة؟')) return;

    try {
      await recipesApi.delete(id);
      alert('تم حذف الوصفة بنجاح');
      fetchRecipes();
    } catch (error) {
      console.error('Delete recipe error:', error);
      alert('فشل في حذف الوصفة');
    }
  };

  const handleInventoryItemChange = (itemId: string) => {
    const item = inventoryItems.find(i => i.id === parseInt(itemId));
    if (item) {
      setNewIngredient({
        ...newIngredient,
        inventory_item_id: itemId,
        cost_per_unit: item.cost.toString(),
      });
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          📋 إدارة الوصفات (BOM)
        </h1>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-md hover:bg-amber-600"
        >
          <PlusCircleIcon className="w-5 h-5" />
          إضافة وصفة جديدة
        </button>
      </div>

      {/* Recipes Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">جاري التحميل...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              لا توجد وصفات. قم بإضافة وصفة جديدة!
            </div>
          ) : (
            recipes.map((recipe) => (
              <div
                key={recipe.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      {recipe.name}
                    </h3>
                    {recipe.menu_item_name && (
                      <p className="text-sm text-blue-600 dark:text-blue-400 mb-2">
                        🍽️ {recipe.menu_item_name}
                      </p>
                    )}
                    {recipe.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {recipe.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t dark:border-gray-700 pt-3 mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      عدد المكونات:
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {recipe.ingredients?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      التكلفة الإجمالية:
                    </span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      {parseFloat(recipe.calculated_cost || recipe.total_cost || 0).toFixed(2)} ج.م
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleView(recipe)}
                    className="flex-1 bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-3 py-2 rounded hover:bg-blue-100 dark:hover:bg-blue-800 text-sm"
                  >
                    👁️ عرض
                  </button>
                  <button
                    onClick={() => handleEdit(recipe)}
                    className="flex-1 bg-amber-50 dark:bg-amber-900 text-amber-600 dark:text-amber-300 px-3 py-2 rounded hover:bg-amber-100 dark:hover:bg-amber-800 text-sm"
                  >
                    <EditIcon className="w-4 h-4 inline ml-1" />
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDelete(recipe.id)}
                    className="flex-1 bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-300 px-3 py-2 rounded hover:bg-red-100 dark:hover:bg-red-800 text-sm"
                  >
                    <TrashIcon className="w-4 h-4 inline ml-1" />
                    حذف
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto relative z-[60]">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {editingRecipe ? 'تعديل وصفة' : 'إضافة وصفة جديدة'}
              </h2>

              {/* Recipe Basic Info */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    اسم الوصفة *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    placeholder="مثال: بيتزا مارغريتا"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ربط بصنف من القائمة (اختياري)
                  </label>
                  <select
                    value={formData.menu_item_id}
                    onChange={(e) => setFormData({ ...formData, menu_item_id: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">-- اختر صنف من القائمة --</option>
                    {menuItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} - {item.price} ج.م
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الوصف
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    placeholder="وصف مختصر للوصفة..."
                  />
                </div>
              </div>

              {/* Add Ingredient Section */}
              <div className="border-t dark:border-gray-700 pt-4 mb-4">
                <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">
                  إضافة مكونات
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <div className="md:col-span-2 relative z-50">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      المكون
                    </label>
                    <select
                      value={newIngredient.inventory_item_id}
                      onChange={(e) => handleInventoryItemChange(e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      style={{ position: 'relative', zIndex: 9999 }}
                    >
                      <option value="">-- اختر مكون --</option>
                      {inventoryItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.unit}) - مخزون: {item.stock}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      الكمية
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={newIngredient.quantity}
                      onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      placeholder="0.000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      التكلفة/وحدة
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newIngredient.cost_per_unit}
                      onChange={(e) => setNewIngredient({ ...newIngredient, cost_per_unit: e.target.value })}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddIngredient}
                  className="w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                >
                  + إضافة المكون
                </button>
              </div>

              {/* Ingredients List */}
              <div className="mb-4">
                <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">
                  المكونات ({ingredients.length})
                </h3>
                {ingredients.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    لم يتم إضافة مكونات بعد
                  </p>
                ) : (
                  <div className="space-y-2">
                    {ingredients.map((ing, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {ing.item_name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {parseFloat(ing.quantity.toString()).toFixed(3)} {ing.unit} × {parseFloat(ing.cost_per_unit.toString()).toFixed(2)} ج.م = {' '}
                            <span className="font-bold text-green-600">
                              {(parseFloat(ing.quantity.toString()) * parseFloat(ing.cost_per_unit.toString())).toFixed(2)} ج.م
                            </span>
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveIngredient(index)}
                          className="text-red-600 hover:text-red-800 p-2"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total Cost */}
              <div className="bg-amber-50 dark:bg-amber-900 p-4 rounded-lg mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    التكلفة الإجمالية:
                  </span>
                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {calculateTotalCost().toFixed(2)} ج.م
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-amber-500 text-white px-4 py-2 rounded-md hover:bg-amber-600"
                >
                  💾 حفظ الوصفة
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
        </div>
      )}

      {/* View Modal */}
      {viewingRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {viewingRecipe.name}
                  </h2>
                  {viewingRecipe.menu_item_name && (
                    <p className="text-blue-600 dark:text-blue-400">
                      🍽️ {viewingRecipe.menu_item_name}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setViewingRecipe(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
                >
                  ×
                </button>
              </div>

              {viewingRecipe.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {viewingRecipe.description}
                </p>
              )}

              <div className="bg-amber-50 dark:bg-amber-900 p-4 rounded-lg mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    التكلفة الإجمالية:
                  </span>
                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {parseFloat(viewingRecipe.calculated_cost || viewingRecipe.total_cost || 0).toFixed(2)} ج.م
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-white">
                المكونات ({viewingRecipe.ingredients?.length || 0})
              </h3>
              <div className="space-y-2">
                {viewingRecipe.ingredients?.map((ing, index) => (
                  <div
                    key={index}
                    className="flex justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {ing.item_name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        مخزون متاح: {parseFloat(ing.item_stock || 0).toFixed(3)} {ing.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {parseFloat(ing.quantity.toString()).toFixed(3)} {ing.unit}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {(parseFloat(ing.quantity.toString()) * parseFloat(ing.cost_per_unit.toString())).toFixed(2)} ج.م
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setViewingRecipe(null)}
                className="w-full mt-4 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
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

export default RecipesScreen;

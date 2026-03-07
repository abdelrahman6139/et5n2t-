import { useLang } from '../i18n';


import React, { useState } from 'react';
import { SunIcon, MoonIcon } from '../components/icons';
import { SalesCenter, Screen, Role, User } from '../types';
import { settings as settingsApi } from '../utils/api';
import { ALWAYS_ALLOWED, ADMIN_ONLY_SCREENS, getDefaultPermissions, loadRolePermissions } from '../utils/permissions';
import { SCREEN_TITLES } from '../constants';

interface SettingsScreenProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  user?: User | null;
}

// Roles whose permissions can be configured
const CONFIGURABLE_ROLES: Role[] = [Role.Manager, Role.Cashier, Role.Waiter, Role.Kitchen, Role.Driver];

const SettingsScreen: React.FC<SettingsScreenProps> = ({ theme, toggleTheme, user }) => {
  const { lang, setLang } = useLang();
  const [language, setLanguage] = useState(lang);
  const [printDeliveryInvoice, setPrintDeliveryInvoice] = useState(true);

  // Dynamic Settings State
  const [taxRate, setTaxRate] = useState('14');
  const [serviceCharge, setServiceCharge] = useState('12');
  /** Named Windows printer for customer receipts (empty = OS default) */
  const [receiptPrinter, setReceiptPrinter] = useState('');
  /** Named Windows printer for kitchen tickets (empty = OS default) */
  const [kitchenPrinter, setKitchenPrinter] = useState('');

  // Sales Center enable toggles
  const [enableDineIn, setEnableDineIn] = useState(true);
  const [enableTakeaway, setEnableTakeaway] = useState(true);
  const [enableDelivery, setEnableDelivery] = useState(true);

  // Role Permissions State
  const [rolePermissions, setRolePermissions] = useState<Record<string, Screen[]>>(() =>
    getDefaultPermissions()
  );
  const [selectedRole, setSelectedRole] = useState<Role>(Role.Cashier);

  // Screens configurable per role (exclude Login/Dashboard which are always on, and Admin-only screens)
  const configurableScreens = (Object.values(Screen) as Screen[]).filter(
    s => !ALWAYS_ALLOWED.includes(s) && !ADMIN_ONLY_SCREENS.includes(s)
  );

  // Fetch settings on mount
  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await settingsApi.getAll();
        if (response.data.success) {
          const data = response.data.data;
          if (data.tax_rate) setTaxRate(data.tax_rate);
          if (data.service_charge) setServiceCharge(data.service_charge);
          if (data.receipt_printer !== undefined) setReceiptPrinter(data.receipt_printer ?? '');
          if (data.kitchen_printer !== undefined) setKitchenPrinter(data.kitchen_printer ?? '');
          if (data.enable_dine_in !== undefined) setEnableDineIn(data.enable_dine_in === 'true');
          if (data.enable_takeaway !== undefined) setEnableTakeaway(data.enable_takeaway === 'true');
          if (data.enable_delivery !== undefined) setEnableDelivery(data.enable_delivery === 'true');
          if (data.role_permissions) {
            try {
              const loaded = JSON.parse(data.role_permissions) as Record<string, Screen[]>;
              setRolePermissions(prev => ({ ...prev, ...loaded }));
            } catch (e) {
              console.error('Failed to parse role_permissions', e);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      }
    };
    fetchSettings();
  }, []);

  const toggleScreen = (role: Role, screen: Screen) => {
    setRolePermissions(prev => {
      const current = prev[role] || [];
      const has = current.includes(screen);
      return {
        ...prev,
        [role]: has ? current.filter(s => s !== screen) : [...current, screen],
      };
    });
  };

  const handleSave = async () => {
    try {
      // Build serializable permissions (only configurable roles)
      const permissionsToSave: Record<string, string[]> = {};
      CONFIGURABLE_ROLES.forEach(role => {
        permissionsToSave[role] = rolePermissions[role] || [];
      });

      await settingsApi.updateBatch({
        tax_rate: taxRate,
        service_charge: serviceCharge,
        receipt_printer: receiptPrinter,
        kitchen_printer: kitchenPrinter,
        enable_dine_in: String(enableDineIn),
        enable_takeaway: String(enableTakeaway),
        enable_delivery: String(enableDelivery),
        role_permissions: JSON.stringify(permissionsToSave),
      });

      // Apply permissions immediately in this session
      loadRolePermissions(permissionsToSave);

      alert('تم حفظ الإعدادات بنجاح');
    } catch (err) {
      alert('فشل حفظ الإعدادات');
      console.error(err);
    }
  };

  const isAdmin = user?.role === Role.Admin;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-8 text-gray-800 dark:text-amber-400">الإعدادات العامة</h1>

      <div className="space-y-8">
        {/* Restaurant Info */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow border dark:border-amber-800/50">
          <h2 className="text-2xl font-bold mb-4 border-b pb-2 dark:border-gray-700 dark:text-amber-500">بيانات المطعم</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم المطعم</label>
              <input type="text" defaultValue="مطعم الأصالة" className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-800 focus:ring-amber-500 focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الهاتف</label>
              <input type="text" defaultValue="920012345" className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-800 focus:ring-amber-500 focus:border-amber-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">شعار المطعم (PNG)</label>
              <input type="file" accept=".png" className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-amber-900/50 dark:file:text-amber-300 dark:hover:file:bg-amber-900" />
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow border dark:border-amber-800/50">
          <h2 className="text-2xl font-bold mb-4 border-b pb-2 dark:border-gray-700 dark:text-amber-500">إعدادات النظام</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">الوضع الداكن</span>
              <button onClick={toggleTheme} className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-amber-400">
                {theme === 'light' ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">اللغة</span>
              <select value={language} onChange={(e) => { setLanguage(e.target.value as any); setLang(e.target.value as any); }} className="p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800">
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">طباعة فاتورة التوصيل عند إتمام الطلب</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={printDeliveryInvoice} onChange={() => setPrintDeliveryInvoice(!printDeliveryInvoice)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-amber-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Printer Settings */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow border dark:border-amber-800/50">
          <h2 className="text-2xl font-bold mb-4 border-b pb-2 dark:border-gray-700 dark:text-amber-500">إعدادات الطباعة</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            أدخل اسم الطابعة كما يظهر تماماً في إعدادات Windows. اتركه فارغاً لاستخدام الطابعة الافتراضية.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">طابعة الفاتورة (اسم Windows)</label>
              <input
                type="text"
                value={receiptPrinter}
                onChange={(e) => setReceiptPrinter(e.target.value)}
                placeholder="مثال: XP-58 Receipt Printer"
                className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-800 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">طابعة المطبخ (اسم Windows)</label>
              <input
                type="text"
                value={kitchenPrinter}
                onChange={(e) => setKitchenPrinter(e.target.value)}
                placeholder="مثال: XP-58 Kitchen Printer"
                className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-800 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Financial Settings */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow border dark:border-amber-800/50">
          <h2 className="text-2xl font-bold mb-4 border-b pb-2 dark:border-gray-700 dark:text-amber-500">الإعدادات المالية</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">نسبة الضريبة (%)</label>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-800 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">نسبة خدمة الصالة (%)</label>
              <input
                type="number"
                value={serviceCharge}
                onChange={(e) => setServiceCharge(e.target.value)}
                className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm dark:bg-gray-800 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Sales Centers */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow border dark:border-amber-800/50">
          <h2 className="text-2xl font-bold mb-4 border-b pb-2 dark:border-gray-700 dark:text-amber-500">مراكز البيع</h2>
          <div className="space-y-3">
            {[
              { label: SalesCenter.DineIn, value: enableDineIn, setter: setEnableDineIn },
              { label: SalesCenter.Takeaway, value: enableTakeaway, setter: setEnableTakeaway },
              { label: SalesCenter.Delivery, value: enableDelivery, setter: setEnableDelivery },
            ].map(({ label, value, setter }) => (
              <div key={label} className="flex items-center justify-between">
                <span className={`text-lg ${!value ? 'text-gray-400 line-through' : ''}`}>{label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={value} onChange={() => setter(!value)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-amber-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Role Permissions — Admin only */}
        {isAdmin && (
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow border dark:border-amber-800/50">
            <h2 className="text-2xl font-bold mb-1 dark:text-amber-500">صلاحيات الأدوار</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              حدد الشاشات التي يمكن لكل دور الوصول إليها. لوحة التحكم وتسجيل الدخول مفعّلان دائماً.
            </p>

            {/* Role Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {CONFIGURABLE_ROLES.map(role => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`px-5 py-2 rounded-xl font-bold text-sm transition-all shadow-sm ${selectedRole === role
                      ? 'bg-blue-600 dark:bg-amber-600 text-white scale-105'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                  {role}
                </button>
              ))}
            </div>

            {/* Screen Checkboxes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Always-on screens (disabled) */}
              {ALWAYS_ALLOWED.map(screen => (
                <label key={screen} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg opacity-60 cursor-not-allowed border border-gray-200 dark:border-gray-700">
                  <input type="checkbox" checked disabled className="w-4 h-4 accent-amber-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {SCREEN_TITLES[screen]}
                  </span>
                  <span className="text-xs text-gray-400 mr-auto">(مطلوب)</span>
                </label>
              ))}

              {/* Configurable screens */}
              {configurableScreens.map(screen => {
                const checked = (rolePermissions[selectedRole] || []).includes(screen);
                return (
                  <label
                    key={screen}
                    onClick={() => toggleScreen(selectedRole, screen)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all select-none ${checked
                        ? 'bg-blue-50 dark:bg-amber-900/20 border-blue-300 dark:border-amber-600'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleScreen(selectedRole, screen)}
                      className="w-4 h-4 accent-blue-600 dark:accent-amber-500"
                    />
                    <span className={`text-sm font-medium ${checked ? 'text-blue-700 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'}`}>
                      {SCREEN_TITLES[screen]}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* Quick presets */}
            <div className="flex gap-3 mt-5 pt-4 border-t dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400 self-center">تحديد سريع:</span>
              <button
                onClick={() => {
                  const all = [...ALWAYS_ALLOWED, ...configurableScreens];
                  setRolePermissions(prev => ({ ...prev, [selectedRole]: all }));
                }}
                className="px-3 py-1.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg font-semibold hover:bg-green-200 transition"
              >
                تحديد الكل
              </button>
              <button
                onClick={() => {
                  setRolePermissions(prev => ({ ...prev, [selectedRole]: [...ALWAYS_ALLOWED] }));
                }}
                className="px-3 py-1.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg font-semibold hover:bg-red-200 transition"
              >
                إلغاء الكل
              </button>
              <button
                onClick={() => {
                  const defaults = getDefaultPermissions();
                  setRolePermissions(prev => ({ ...prev, [selectedRole]: defaults[selectedRole] || [] }));
                }}
                className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 transition"
              >
                إعادة الافتراضي
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button onClick={handleSave} className="bg-blue-600 dark:bg-amber-600 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:bg-blue-700 dark:hover:bg-amber-700 transition">
            حفظ التغييرات
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;

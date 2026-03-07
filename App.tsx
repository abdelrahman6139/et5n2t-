import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Screen, Order, Table, OrderItem, User, Role } from './types';
import { SCREEN_TITLES } from './constants';
import { tables as mockTables } from './data/mockData';
import Dashboard from './screens/Dashboard';
import { storage } from './utils/storage';
import { LangProvider, useLang } from './i18n';
import POS from './screens/POS';
import OrdersManagementScreen from './screens/OrdersScreen';
import CustomersScreen from './screens/CustomersScreen';
import ReportsScreen from './screens/ReportsScreen';
import SettingsScreen from './screens/SettingsScreen';
import LoginScreen from './screens/LoginScreen';
import DeliveryScreen from './screens/DeliveryScreen';
import StatisticsScreen from './screens/StatisticsScreen';
import AdminScreen from './screens/AdminScreen';
import ExpensesScreen from './screens/ExpensesScreen';
import InventoryScreen from './screens/InventoryScreen';
import MenuScreen from './screens/MenuScreen';
import AboutScreen from './screens/AboutScreen';
import ClosingScreen from './screens/ClosingScreen';
import DayClosingScreen from './screens/DayClosingScreen';
import ActivityLogScreen from './screens/ActivityLogScreen'; // Add this
import { HomeIcon, LogoutIcon, UserIcon } from './components/icons';
import { hasPermission, loadRolePermissions } from './utils/permissions';
import api, { settings as settingsApi } from './utils/api';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.Login);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => storage.get('pos_theme', 'dark'));
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
  const [tables, setTables] = useState<Table[]>(mockTables);
  const [parkedOrders, setParkedOrders] = useState<Record<number, OrderItem[]>>({});
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [refreshOrdersTrigger, setRefreshOrdersTrigger] = useState(0);

  // Load role permissions from backend on startup
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const response = await settingsApi.getAll();
        if (response.data.success && response.data.data?.role_permissions) {
          loadRolePermissions(JSON.parse(response.data.data.role_permissions));
        }
      } catch (e) {
        console.error('Failed to load role permissions', e);
      }
    };
    loadPermissions();
  }, []);

  useEffect(() => {
    storage.set('pos_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  }, []);

  const navigateTo = useCallback((screen: Screen) => {
    if (user && !hasPermission(user.role as Role, screen)) {
      alert('ليس لديك صلاحية الوصول لهذه الشاشة');
      return;
    }
    setCurrentScreen(screen);
  }, [user]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentScreen(Screen.Login);
  }, []);

  const handleLogin = useCallback((loggedInUser: User) => {
    setUser(loggedInUser);
    setCurrentScreen(Screen.Dashboard);
  }, []);

  const handleEditOrder = useCallback((order: Order) => {
    setOrderToEdit(order);
    navigateTo(Screen.POS);
  }, [navigateTo]);

  const handleOrderUpdateDone = useCallback(() => {
    setOrderToEdit(null);
    setRefreshOrdersTrigger(prev => prev + 1); // ✅ Trigger refresh
  }, []);

  const hasOpenTables = useMemo(() => tables.some(table => table.status === 'occupied'), [tables]);

  const renderScreen = useMemo(() => {
    switch (currentScreen) {
      case Screen.Login:
        return <LoginScreen navigateTo={navigateTo} onLogin={handleLogin} />;
      case Screen.Dashboard:
        return <Dashboard navigateTo={navigateTo} user={user} />;
      case Screen.POS:
        return <POS
          navigateToDashboard={() => navigateTo(Screen.Dashboard)}
          orderToEdit={orderToEdit}
          onOrderUpdated={handleOrderUpdateDone}
          tables={tables}
          parkedOrders={parkedOrders}
          updateTables={setTables}
          updateParkedOrders={setParkedOrders}
        />;
      case Screen.Orders:
        // return <OrdersScreen onEditOrder={handleEditOrder} />;
        return (
          <OrdersManagementScreen
            onEditOrder={handleEditOrder}
            refreshTrigger={refreshOrdersTrigger} // ✅ Pass trigger
          />
        );
      //return<OrdersManagementScreen onEditOrder={handleEditOrder}/>;
      case Screen.Customers:
        return <CustomersScreen />;
      case Screen.Reports:
        return <ReportsScreen />;
      case Screen.Settings:
        return <SettingsScreen theme={theme} toggleTheme={toggleTheme} user={user} />;
      case Screen.Delivery:
        return <DeliveryScreen />;
      case Screen.Statistics:
        return <StatisticsScreen />;
      case Screen.Admin:
        return <AdminScreen />;
      case Screen.Expenses:
        return <ExpensesScreen />;
      case Screen.Inventory:
        return <InventoryScreen />;
      case Screen.Menu:
        return <MenuScreen />;
      case Screen.About:
        return <AboutScreen />;
      case Screen.ActivityLog:
        return <ActivityLogScreen onClose={() => navigateTo(Screen.Dashboard)} />;
      case Screen.Closing:
        const hasOpen = tables.some(t => t.status === 'occupied');
        return <ClosingScreen hasOpenTables={hasOpen} onAfterClose={() => { /* optionally navigate */ }} />;
      case Screen.DayClosing:
        return <DayClosingScreen />;
      default:
        return <Dashboard navigateTo={navigateTo} />;
    }
  }, [currentScreen, navigateTo, theme, toggleTheme, handleEditOrder, orderToEdit, handleOrderUpdateDone, tables, parkedOrders, hasOpenTables]);

  if (currentScreen === Screen.Login) {
    return <div className="bg-gray-100 dark:bg-black text-gray-900 dark:text-gray-100"><LoginScreen navigateTo={navigateTo} onLogin={handleLogin} /></div>;
  }

  return (
    <div className={`${theme} font-sans`}>
      <div className="flex h-screen bg-gray-100 dark:bg-black text-gray-900 dark:text-gray-100">
        <main className="flex-1 flex flex-col overflow-hidden">
          {currentScreen !== Screen.POS && (
            <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 shadow-md z-10 border-b dark:border-amber-800/50">
              <div className="flex items-center">
                <button onClick={() => navigateTo(Screen.Dashboard)} className="text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-amber-400 me-4">
                  <HomeIcon className="w-7 h-7" />
                </button>
                <h1 className="text-2xl font-bold dark:text-amber-400">{SCREEN_TITLES[currentScreen]}</h1>
              </div>
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <UserIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                  <span className="font-semibold">{user?.full_name || user?.username || 'مدير النظام'} ({user?.role})</span>
                </div>
                <button onClick={logout} className="flex items-center space-x-2 space-x-reverse text-red-500 hover:text-red-700 font-semibold p-2 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50">
                  <LogoutIcon className="w-6 h-6" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </header>
          )}
          <div className="flex-1 overflow-x-hidden overflow-y-auto">
            {renderScreen}
          </div>
        </main>
      </div>
    </div>
  );
};

const AppWithLang: React.FC = () => (
  <LangProvider>
    <App />
  </LangProvider>
);

export default AppWithLang;
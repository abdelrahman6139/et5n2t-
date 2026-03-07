

import React from 'react';
import { Screen, User, Role } from '../types';
import { SCREEN_TITLES } from '../constants';
import { hasPermission } from '../utils/permissions';
import {
  HomeIcon, PosIcon, OrdersIcon, DeliveryIcon, CustomersIcon,
  StatsIcon, ReportsIcon, AdminIcon, ExpensesIcon,
  InventoryIcon, SettingsIcon, MenuIcon, InfoIcon, PowerIcon
} from '../components/icons';

interface DashboardProps {
  navigateTo: (screen: Screen) => void;
  user: User | null;
}

const Dashboard: React.FC<DashboardProps> = ({ navigateTo, user }) => {
  const menuItems = [
    { screen: Screen.POS, title: SCREEN_TITLES[Screen.POS], icon: PosIcon, color: 'bg-blue-500 hover:bg-blue-600 dark:bg-amber-500 dark:hover:bg-amber-600' },
    { screen: Screen.Orders, title: SCREEN_TITLES[Screen.Orders], icon: OrdersIcon, color: 'bg-green-500 hover:bg-green-600 dark:bg-amber-500 dark:hover:bg-amber-600' },
    { screen: Screen.Delivery, title: SCREEN_TITLES[Screen.Delivery], icon: DeliveryIcon, color: 'bg-yellow-500 hover:bg-yellow-600 dark:bg-amber-500 dark:hover:bg-amber-600' },
    { screen: Screen.Customers, title: SCREEN_TITLES[Screen.Customers], icon: CustomersIcon, color: 'bg-purple-500 hover:bg-purple-600 dark:bg-amber-500 dark:hover:bg-amber-600' },
    { screen: Screen.Statistics, title: SCREEN_TITLES[Screen.Statistics], icon: StatsIcon, color: 'bg-pink-500 hover:bg-pink-600 dark:bg-amber-500 dark:hover:bg-amber-600' },
    { screen: Screen.Reports, title: SCREEN_TITLES[Screen.Reports], icon: ReportsIcon, color: 'bg-indigo-500 hover:bg-indigo-600 dark:bg-amber-500 dark:hover:bg-amber-600' },
    { screen: Screen.Menu, title: SCREEN_TITLES[Screen.Menu], icon: MenuIcon, color: 'bg-teal-500 hover:bg-teal-600 dark:bg-amber-500 dark:hover:bg-amber-600' },
    { screen: Screen.Inventory, title: SCREEN_TITLES[Screen.Inventory], icon: InventoryIcon, color: 'bg-orange-500 hover:bg-orange-600 dark:bg-amber-500 dark:hover:bg-amber-600' },
    { screen: Screen.Expenses, title: SCREEN_TITLES[Screen.Expenses], icon: ExpensesIcon, color: 'bg-red-500 hover:bg-red-600 dark:bg-amber-500 dark:hover:bg-amber-600' },
    { screen: Screen.Closing, title: SCREEN_TITLES[Screen.Closing], icon: PowerIcon, color: 'bg-rose-500 hover:bg-rose-600 dark:bg-amber-600 dark:hover:bg-amber-700' },
    { screen: Screen.DayClosing, title: SCREEN_TITLES[Screen.DayClosing], icon: PowerIcon, color: 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800' },
    { screen: Screen.Admin, title: SCREEN_TITLES[Screen.Admin], icon: AdminIcon, color: 'bg-gray-700 hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-700' },
    { screen: Screen.Settings, title: SCREEN_TITLES[Screen.Settings], icon: SettingsIcon, color: 'bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700' },
    { screen: Screen.ActivityLog, title: SCREEN_TITLES[Screen.ActivityLog], icon: AdminIcon, color: 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800' },
    { screen: Screen.About, title: SCREEN_TITLES[Screen.About], icon: InfoIcon, color: 'bg-gray-400 hover:bg-gray-500 dark:bg-gray-600 dark:hover:bg-gray-700' },
  ];

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-8 text-gray-800 dark:text-amber-400">الشاشة الرئيسية</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-6">
        {menuItems.filter(item => user ? hasPermission(user.role as Role, item.screen) : false).map(item => (
          <button
            key={item.screen}
            onClick={() => navigateTo(item.screen)}
            className={`${item.color} text-white rounded-lg shadow-lg p-6 flex flex-col items-center justify-center transition-transform transform hover:scale-105 aspect-square`}
          >
            <item.icon className="w-12 h-12 mb-4" />
            <span className="text-lg font-semibold text-center">{item.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
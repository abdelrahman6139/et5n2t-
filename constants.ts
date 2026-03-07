import { Screen } from './types';

export const SCREEN_TITLES: { [key in Screen]: string } = {
  [Screen.Login]: 'تسجيل الدخول',
  [Screen.Dashboard]: 'الشاشة الرئيسية',
  [Screen.POS]: 'نقطة البيع',
  [Screen.Orders]: 'إدارة الطلبات',
  [Screen.Delivery]: 'متابعة التوصيل',
  [Screen.Customers]: 'العملاء',
  [Screen.Statistics]: 'الإحصائيات الحية',
  [Screen.Reports]: 'التقارير',
  [Screen.Admin]: 'الإدارة',
  [Screen.Expenses]: 'المصروفات',
  [Screen.Inventory]: 'المخزون والموردين',
  [Screen.Settings]: 'الإعدادات',
  [Screen.Menu]: 'إدارة قائمة الطعام',
  [Screen.About]: 'عن البرنامج',
  [Screen.Closing]: 'إغلاق الوردية',
  [Screen.ActivityLog]: 'سجل النشاطات',
  [Screen.DayClosing]: 'الإغلاق اليومي',
};
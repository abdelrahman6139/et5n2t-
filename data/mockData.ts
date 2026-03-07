import { MenuItem, Category, Order, Customer, Driver, SalesCenter, OrderStatus, MainGroup, SubGroup, Hall, Table, Expense, Supplier, InventoryItem, User, DeliveryZone, Kitchen, Printer, Employee, Shift } from '../types';

export const mainGroups: MainGroup[] = [
    { id: 1, name: 'الأطباق الرئيسية' },
    { id: 2, name: 'المقبلات والمشروبات' },
];

export const subGroups: SubGroup[] = [
    { id: 1, name: 'مشويات', mainGroupId: 1 },
    { id: 2, name: 'مأكولات بحرية', mainGroupId: 1 },
    { id: 3, name: 'مقبلات باردة وساخنة', mainGroupId: 2 },
    { id: 4, name: 'مشروبات وحلويات', mainGroupId: 2 },
];

export const categories: Category[] = [
  { id: 1, name: 'لحوم', subGroupId: 1 },
  { id: 2, name: 'دجاج', subGroupId: 1 },
  { id: 3, name: 'أسماك', subGroupId: 2 },
  { id: 4, name: 'مقبلات', subGroupId: 3 },
  { id: 5, name: 'سلطات', subGroupId: 3 },
  { id: 6, name: 'مشروبات', subGroupId: 4 },
  { id: 7, name: 'حلويات', subGroupId: 4 },
];

export const menuItems: MenuItem[] = [
  { id: 101, name: 'كباب لحم', price: 95, categoryId: 1, printer: 'Kitchen Printer 1' },
  { id: 102, name: 'ريش', price: 120, categoryId: 1, printer: 'Kitchen Printer 1' },
  { id: 201, name: 'شيش طاووق', price: 85, categoryId: 2, printer: 'Kitchen Printer 1' },
  { id: 202, name: 'دجاج عالفحم', price: 75, categoryId: 2, printer: 'Kitchen Printer 1' },
  { id: 301, name: 'سمك فيليه', price: 110, categoryId: 3, printer: 'Kitchen Printer 1' },
  { id: 401, name: 'حمص', price: 25, categoryId: 4, printer: 'Kitchen Printer 2' },
  { id: 402, name: 'ورق عنب', price: 30, categoryId: 4, printer: 'Kitchen Printer 2' },
  { id: 501, name: 'سلطة خضراء', price: 22, categoryId: 5, printer: 'Kitchen Printer 2' },
  { id: 502, name: 'فتوش', price: 28, categoryId: 5, printer: 'Kitchen Printer 2' },
  { id: 601, name: 'بيبسي', price: 10, categoryId: 6, printer: 'Bar Printer' },
  { id: 602, name: 'عصير برتقال', price: 25, categoryId: 6, printer: 'Bar Printer' },
  { id: 701, name: 'كنافة', price: 40, categoryId: 7, printer: 'Kitchen Printer 2' },
];

export const customers: Customer[] = [
    { id: 1, phone: '01012345678', firstName: 'أحمد', lastName: 'محمود', deliveryZone: 'المعادي', street: 'شارع 9', building: '15', floor: '3', apartment: '301', addressType: 'Home', landmark: 'بجوار مترو الأنفاق', lat: 24.70, lng: 46.68 },
    { id: 2, phone: '01287654321', firstName: 'فاطمة', lastName: 'علي', deliveryZone: 'الزمالك', street: 'شارع البرازيل', building: '10', floor: '5', apartment: '52', addressType: 'Work', landmark: 'برج القاهرة', lat: 24.73, lng: 46.66 },
];

export const halls: Hall[] = [
    { id: 1, name: 'الصالة الرئيسية' },
    { id: 2, name: 'القسم العائلي' },
    { id: 3, name: 'التراس الخارجي' },
];

export const tables: Table[] = [
    { id: 101, name: 'T1', hallId: 1, status: 'available' },
    { id: 102, name: 'T2', hallId: 1, status: 'occupied' },
    { id: 103, name: 'T3', hallId: 1, status: 'available' },
    { id: 201, name: 'F1', hallId: 2, status: 'available' },
    { id: 202, name: 'F2', hallId: 2, status: 'available' },
    { id: 301, name: 'O1', hallId: 3, status: 'occupied' },
];

export const drivers: Driver[] = [
    { id: 1, name: 'خالد عبدالله', phone: '0512345678', vehicle: 'تويوتا يارس', currentOrders: [1003], lat: 24.7136, lng: 46.6753},
    { id: 2, name: 'محمد سعيد', phone: '0598765432', vehicle: 'هيونداي اكسنت', currentOrders: [], lat: 24.7236, lng: 46.6853},
];

export const orders: Order[] = [
  { 
    id: 1001, 
    salesCenter: SalesCenter.DineIn, 
    items: [
        { ...menuItems[0], quantity: 2, notes: 'بدون بصل', lineItemId: '101-1' },
        { ...menuItems[3], quantity: 1, lineItemId: '202-1' },
        { ...menuItems[7], quantity: 1, lineItemId: '501-1' },
        { ...menuItems[8], quantity: 2, lineItemId: '502-1' },
    ],
    subtotal: 343,
    tax: 48.02,
    serviceCharge: 41.16,
    deliveryFee: 0,
    total: 432.18,
    status: OrderStatus.Completed,
    hall: halls[0],
    table: tables[1],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  { 
    id: 1002, 
    salesCenter: SalesCenter.Takeaway, 
    items: [
        { ...menuItems[1], quantity: 1, lineItemId: '102-1' },
        { ...menuItems[9], quantity: 1, lineItemId: '601-1' },
    ],
    subtotal: 130,
    tax: 18.2,
    serviceCharge: 0,
    deliveryFee: 0,
    total: 148.2,
    status: OrderStatus.Ready,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
  },
  { 
    id: 1003, 
    salesCenter: SalesCenter.Delivery, 
    items: [
        { ...menuItems[2], quantity: 1, lineItemId: '201-1' },
        { ...menuItems[4], quantity: 1, lineItemId: '301-1' },
        { ...menuItems[6], quantity: 1, lineItemId: '402-1' },
    ],
    subtotal: 225,
    tax: 31.5,
    serviceCharge: 0,
    deliveryFee: 25,
    total: 281.5,
    status: OrderStatus.OutForDelivery,
    customer: customers[0],
    driverId: 1,
    createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
  },
    { 
    id: 1004, 
    salesCenter: SalesCenter.Delivery, 
    items: [
        { ...menuItems[1], quantity: 2, lineItemId: '102-2' },
    ],
    subtotal: 240,
    tax: 33.6,
    serviceCharge: 0,
    deliveryFee: 25,
    total: 298.6,
    status: OrderStatus.Pending,
    customer: customers[1],
    createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
  },
];

export const expenses: Expense[] = [
    { id: 1, date: new Date(), category: 'إيجار', description: 'إيجار المحل لشهر يوليو', amount: 15000 },
    { id: 2, date: new Date(), category: 'رواتب', description: 'رواتب الموظفين', amount: 25000 },
    { id: 3, date: new Date(Date.now() - 24 * 60 * 60 * 1000), category: 'مشتريات', description: 'شراء خضروات من المورد', amount: 2500 },
];

export const suppliers: Supplier[] = [
    { id: 1, name: 'شركة الأغذية المتحدة', contactPerson: 'سعيد محمد', phone: '01123456789', email: 'saeed@unitedfoods.com' },
    { id: 2, name: 'مزارع النيل', contactPerson: 'علي حسن', phone: '01234567890', email: 'ali@nilefarms.com' },
];

export const inventoryItems: InventoryItem[] = [
    { id: 1, name: 'لحم بقري', unit: 'kg', stock: 50, cost: 280, supplierId: 1 },
    { id: 2, name: 'دجاج كامل', unit: 'piece', stock: 100, cost: 120, supplierId: 1 },
    { id: 3, name: 'طماطم', unit: 'kg', stock: 75, cost: 8, supplierId: 2 },
    { id: 4, name: 'أرز بسمتي', unit: 'kg', stock: 200, cost: 45, supplierId: 1 },
];

export const users: User[] = [
    { id: 1, username: 'admin', role: 'Admin', permissions: ['*'] },
    { id: 2, username: 'manager', role: 'Manager', permissions: ['view_reports', 'manage_orders', 'manage_employees'] },
    { id: 3, username: 'cashier1', role: 'Cashier', permissions: ['create_order'] },
];

export const deliveryZones: DeliveryZone[] = [
    { id: 1, name: 'منطقة المعادي', deliveryFee: 15, geoJson: { "type": "Polygon", "coordinates": [ [ [46.7, 24.7], [46.71, 24.7], [46.71, 24.71], [46.7, 24.71], [46.7, 24.7] ] ] } },
];

export const kitchens: Kitchen[] = [
    { id: 1, name: 'المطبخ الرئيسي' },
    { id: 2, name: 'قسم المشويات' },
    { id: 3, name: 'البار' },
];

export const printers: Printer[] = [
    { id: 1, name: 'طابعة المطبخ الرئيسي', type: 'Printer', kitchenId: 1 },
    { id: 2, name: 'شاشة قسم المشويات', type: 'KDS', kitchenId: 2 },
    { id: 3, name: 'طابعة البار', type: 'Printer', kitchenId: 3 },
];

export const employees: Employee[] = [
    { id: 1, name: 'علي أحمد', role: 'شيف رئيسي', phone: '0511111111' },
    { id: 2, name: 'سارة عبدالله', role: 'كاشير', phone: '0522222222' },
    { id: 3, name: 'يوسف خالد', role: 'مقدم طعام', phone: '0533333333' },
];

export const shifts: Shift[] = [
    { id: 1, name: 'الوردية الصباحية', startTime: '09:00', endTime: '17:00' },
    { id: 2, name: 'الوردية المسائية', startTime: '17:00', endTime: '01:00' },
];
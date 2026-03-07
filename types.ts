
export enum Screen {
    Login = 'Login',
    Dashboard = 'Dashboard',
    POS = 'POS',
    Orders = 'Orders',
    Delivery = 'Delivery',
    Customers = 'Customers',
    Statistics = 'Statistics',
    Reports = 'Reports',
    Admin = 'Admin',
    Expenses = 'Expenses',
    Inventory = 'Inventory',
    Settings = 'Settings',
    Menu = 'Menu',
    About = 'About',
    ActivityLog = 'ActivityLog',
    Closing = 'Closing',
    DayClosing = 'DayClosing',
}

export interface MainGroup {
    id: number;
    name: string;
}

export interface SubGroup {
    id: number;
    name: string;
    mainGroupId: number;
}

export interface Category {
    id: number;
    name: string;
    subGroupId: number;
}

export interface NoteOption {
    id: number;
    name: string;
    price: number;
}

export interface MenuItem {
    id: number;
    name: string;
    price: number;
    categoryId: number | null;
    mainCategoryId?: number | null;
    subCategoryId?: number | null;
    isAvailable?: boolean;
    printer?: string;
    imageUrl?: string;
    noteOptions?: NoteOption[];
}


export interface OrderItem extends MenuItem {
    quantity: number;
    notes?: string;
    selectedNoteOptions?: NoteOption[];
    lineItemId: string;
}

export enum SalesCenter {
    DineIn = 'صالة',
    Takeaway = 'تيك أواي',
    Delivery = 'توصيل',
}

export enum OrderStatus {
    Pending = 'قيد الانتظار',
    Ready = 'جاهز',
    OutForDelivery = 'قيد التوصيل',
    Delivered = 'تم التوصيل',
    Completed = 'مكتمل',
    Cancelled = 'ملغي',
}

export interface Hall {
    id: number;
    name: string;
}

export interface Table {
    id: number;
    name: string;
    hallId: number;
    status: 'available' | 'occupied';
    capacity?: number;
}

export interface CustomerLocation {
    id?: number;
    locationName: string;
    zoneId?: number | null;
    street: string;
    building: string;
    floor: string;
    apartment: string;
    landmark: string;
    latitude?: number | null;
    longitude?: number | null;
    kind: string; // 'Home' | 'Work' | 'Other'
    isDefault: boolean;
}

export interface Customer {
    id: number;
    phone: string;
    firstName: string;
    lastName: string;
    locations: CustomerLocation[]; // ← NEW: Array of locations
    lastZoneId?: number | null;
    lastZoneName?: string | null;
}


export interface Order {
    id: number;
    orderNo?: string;
    userfacingid?: string;
    userFacingId?: string;
    customerLocationId?: number | null;
    salesCenter: SalesCenter;
    items: OrderItem[];
    subtotal: number;
    tax: number;
    serviceCharge: number;
    deliveryFee: number;
    total: number;
    status: OrderStatus;
    hall?: Hall;
    table?: Table;
    customer?: Customer;
    driverId?: number;
    createdAt: Date;
}

export interface Driver {
    id: number;
    name: string;
    phone: string;
    vehicle: string;
    currentOrders: number[];
    lat: number;
    lng: number;
}

export interface Expense {
    id: number;
    date: Date;
    category: string;
    description: string;
    amount: number;
}

export interface Supplier {
    id: number;
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
}

export interface InventoryItem {
    id: number;
    name: string;
    unit: string;
    stock: number;
    cost: number;
    supplierId: number;
}

export enum Role {
    Admin = 'Admin',
    Manager = 'Manager',
    Cashier = 'Cashier',
    Waiter = 'Waiter',
    Kitchen = 'Kitchen',
    Driver = 'Driver'
}

export interface User {
    id: number;
    username: string;
    full_name?: string; // Add optional full_name
    role: Role | string; // Allow string for flexibility but prefer Role
    permissions?: string[];
    email?: string;
    phone?: string;
    is_active?: boolean;
}

export interface DeliveryZone {
    id: number;
    name: string;
    deliveryFee: number; // قيمة التوصيل
    geoJson: any;
}

export interface Kitchen {
    id: number;
    name: string;
}

export interface Printer {
    id: number;
    name: string;
    type: 'Printer' | 'KDS';
    kitchenId: number;
}

export interface Employee {
    id: number;
    name: string;
    role: string;
    phone: string;
}

export interface Shift {
    id: number;
    name: string;
    startTime: string;
    endTime: string;
}

import axios, { AxiosError } from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds
});

// Request interceptor - Add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// API Methods
// ============================================================================

// Authentication
export const auth = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  getCurrentUser: () =>
    api.get('/auth/me'),
  logout: () =>
    api.post('/auth/logout'),
};

// Menu
export const menu = {
  // old flat data (still can be used elsewhere if needed)
  getAll: () => api.get('/menu'),

  // NEW: full hierarchy
  getHierarchy: () => api.get('/menu/hierarchy'),

  // NEW: CRUD using new backend routes
  addItem: (itemData: any) => api.post('/menu/items', itemData),
  updateItem: (id: number, itemData: any) => api.put(`/menu/items/${id}`, itemData),
  deleteItem: (id: number) => api.delete(`/menu/items/${id}`),

  // FIX: Use 'api' instead of 'axios' to include auth headers
  createMainCategory: (data: { name: string }) =>
    api.post('/menu/main-categories', data),

  updateMainCategory: (id: number, data: { name: string }) =>
    api.put(`/menu/main-categories/${id}`, data),

  deleteMainCategory: (id: number) =>
    api.delete(`/menu/main-categories/${id}`),

  createSubCategory: (data: { name: string; mainCategoryId: number }) =>
    api.post('/menu/sub-categories', data),

  updateSubCategory: (id: number, data: { name: string }) =>
    api.put(`/menu/sub-categories/${id}`, data),

  deleteSubCategory: (id: number) =>
    api.delete(`/menu/sub-categories/${id}`),

  createCategory: (data: { name: string; subCategoryId: number }) =>
    api.post('/menu/categories', data),

  updateCategory: (id: number, data: { name: string }) =>
    api.put(`/menu/categories/${id}`, data),

  deleteCategory: (id: number) =>
    api.delete(`/menu/categories/${id}`),
};




// Orders - FIXED: Changed orderType to salesCenter
export const orders = {
  getAll: (params?: { status?: string; salesCenter?: string; limit?: number }) =>
    api.get('/orders', { params }),
  getById: (id: number) =>
    api.get(`/orders/${id}`),
  create: (orderData: any) =>
    api.post('/orders', orderData),
  update: (id: number, orderData: any) =>      // ← ADD THIS LINE
    api.patch(`/orders/${id}`, orderData),      // ← ADD THIS LINE
  updateStatus: (id: number, status: string) =>
    api.patch(`/orders/${id}/status`, { status }),
  getByDriver: (driverId: number) =>
    api.get(`/orders/driver/${driverId}`),
};

// Customers (UPDATED with correct Locations support)
export const customers = {
  // Customer basic operations
  search: (query: string) =>
    api.get(`/customers/search`, { params: { query } }),

  getAll: () =>
    api.get('/customers'),

  getById: (id: number) =>
    api.get(`/customers/${id}`),

  create: (customerData: any) =>
    api.post('/customers', customerData),

  update: (id: number, customerData: any) =>
    api.put(`/customers/${id}`, customerData),

  delete: (id: number) =>
    api.delete(`/customers/${id}`),

  // ✅ FIXED: Location management methods (now matching backend routes)
  createLocation: (customerId: number, locationData: any) =>
    api.post(`/customers/${customerId}/locations`, locationData),

  updateLocation: (customerId: number, locationId: number, locationData: any) =>
    api.put(`/customers/${customerId}/locations/${locationId}`, locationData),

  deleteLocation: (customerId: number, locationId: number) =>
    api.delete(`/customers/${customerId}/locations/${locationId}`),

  setDefaultLocation: (customerId: number, locationId: number) =>
    api.patch(`/customers/${customerId}/locations/${locationId}/default`),

  updateLastZone: (customerId: number, zoneId: number | null) =>
    api.patch(`/customers/${customerId}/last-zone`, { zoneId }),

  updateLocationZone: (customerId: number, locationId: number, zoneId: number | null) =>
    api.patch(`/customers/${customerId}/locations/${locationId}/zone`, { zoneId }),
};



// Drivers
export const drivers = {
  getAll: () => api.get('/drivers'),
  getOne: (id: number) => api.get(`/drivers/${id}`),
  create: (data: any) => api.post('/drivers', data),
  update: (id: number, data: any) => api.put(`/drivers/${id}`, data),
  delete: (id: number) => api.delete(`/drivers/${id}`),
};


// Halls & Tables
export const halls = {
  getAll: () =>
    api.get('/halls'),
  getTablesByHall: (hallId: number) =>
    api.get(`/halls/${hallId}/tables`),
  createHall: (name: string) =>
    api.post('/halls', { name }),
  createTable: (hallId: number, name: string) =>
    api.post(`/halls/${hallId}/tables`, { name }),
};

// Inventory


// Suppliers
export const suppliers = {
  getAll: () =>
    api.get('/suppliers'),
  create: (supplierData: any) =>
    api.post('/suppliers', supplierData),
};
// Add this export with other API modules
export const expenses = {
  getAll: (params?: { startDate?: string; endDate?: string; category?: string; businessDayId?: number }) =>
    api.get('/expenses', { params }),
  getCategories: () => api.get('/expenses/categories'),
  getById: (id: number) => api.get(`/expenses/${id}`),
  create: (data: any) => api.post('/expenses', data),
  update: (id: number, data: any) => api.put(`/expenses/${id}`, data),
  delete: (id: number) => api.delete(`/expenses/${id}`),
  getSummary: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/expenses/summary/total', { params }),
};


// Expenses
//export const expenses = {
//getAll: (params?: { startDate?: string; endDate?: string }) =>
//api.get('/expenses', { params }),
//create: (expenseData: any) =>
//api.post('/expenses', expenseData),
//};
// Add this export with other API modules
export const statistics = {
  getToday: () => api.get('/statistics/today'),
};


// Statistics
export const stats = {
  getToday: () =>
    api.get('/statistics/today'),
  getRange: (startDate: string, endDate: string) =>
    api.get('/statistics/range', { params: { startDate, endDate } }),
  getTopItems: (params?: { limit?: number; startDate?: string; endDate?: string }) =>
    api.get('/statistics/top-items', { params }),
  getHourly: () =>
    api.get('/statistics/hourly'),
};

// Add these exports with your other API modules (after expenses, statistics, etc.)

export const kitchens = {
  getAll: () => api.get('/kitchens'),
  getById: (id: number) => api.get(`/kitchens/${id}`),
  create: (data: { name: string }) => api.post('/kitchens', data),
  update: (id: number, data: { name: string }) => api.put(`/kitchens/${id}`, data),
  delete: (id: number) => api.delete(`/kitchens/${id}`),
};

export const printers = {
  getAll: () => api.get('/printers'),
  getById: (id: number) => api.get(`/printers/${id}`),
  create: (data: { name: string; type: string; kitchen_id: number }) =>
    api.post('/printers', data),
  update: (id: number, data: { name: string; type: string; kitchen_id: number }) =>
    api.put(`/printers/${id}`, data),
  delete: (id: number) => api.delete(`/printers/${id}`),
};

export const zones = {
  getAll: () => api.get('/zones'),
  getById: (id: number) => api.get(`/zones/${id}`),
  create: (data: { name: string; delivery_fee: number; geojson?: any }) =>
    api.post('/zones', data),
  update: (id: number, data: { name: string; delivery_fee: number; geojson?: any }) =>
    api.put(`/zones/${id}`, data),
  delete: (id: number) => api.delete(`/zones/${id}`),
};

export const employees = {
  getAll: () => api.get('/employees'),
  getById: (id: number) => api.get(`/employees/${id}`),
  create: (data: { name: string; role: string; phone?: string }) =>
    api.post('/employees', data),
  update: (id: number, data: { name: string; role: string; phone?: string }) =>
    api.put(`/employees/${id}`, data),
  delete: (id: number) => api.delete(`/employees/${id}`),
};
// Add this export with your other API modules
export const reports = {
  getSummary: (params?: { startDate?: string; endDate?: string; businessDayId?: number }) =>
    api.get('/reports/summary', { params }),
  getItems: (params?: { startDate?: string; endDate?: string; businessDayId?: number }) =>
    api.get('/reports/items', { params }),
  getHourly: (params?: { startDate?: string; endDate?: string; businessDayId?: number }) =>
    api.get('/reports/hourly', { params }),
  getDrivers: (params?: { startDate?: string; endDate?: string; businessDayId?: number }) =>
    api.get('/reports/drivers', { params }),
  getDaily: (params?: { startDate?: string; endDate?: string; businessDayId?: number }) =>
    api.get('/reports/daily', { params }),
};
// Add this export with your other API modules
export const recipes = {
  getAll: () => api.get('/recipes'),
  getById: (id: number) => api.get(`/recipes/${id}`),
  create: (data: any) => api.post('/recipes', data),
  update: (id: number, data: any) => api.put(`/recipes/${id}`, data),
  delete: (id: number) => api.delete(`/recipes/${id}`),
  getInventoryItems: () => api.get('/recipes/inventory/items'),
  getMenuItems: () => api.get('/recipes/menu/items'),
};
// Add this export
export const inventory = {
  // Items
  getAllItems: () => api.get('/inventory/items'),
  createItem: (data: any) => api.post('/inventory/items', data),
  updateItem: (id: number, data: any) => api.put(`/inventory/items/${id}`, data),
  deleteItem: (id: number) => api.delete(`/inventory/items/${id}`),

  // Suppliers
  getAllSuppliers: () => api.get('/inventory/suppliers'),
  createSupplier: (data: any) => api.post('/inventory/suppliers', data),
  updateSupplier: (id: number, data: any) => api.put(`/inventory/suppliers/${id}`, data),
  deleteSupplier: (id: number) => api.delete(`/inventory/suppliers/${id}`),
};
export const shifts = {
  openShift: (data: any) => api.post('/shifts/open', data),
  getCurrentShift: () => api.get('/shifts/current'),
  getShiftSummary: (id: number) => api.get(`/shifts/${id}/summary`),
  closeShift: (id: number, data: any) => api.post(`/shifts/${id}/close`, data),
  getAllShifts: () => api.get('/shifts'),
};

export const businessDays = {
  getCurrent: () => api.get('/business-days/current'),
  getAll: (params?: { limit?: number; offset?: number }) =>
    api.get('/business-days', { params }),
  getSummary: (id: number) => api.get(`/business-days/${id}/summary`),
  open: (data?: { notes?: string }) => api.post('/business-days/open', data || {}),
  close: (id: number, data?: { notes?: string }) =>
    api.post(`/business-days/${id}/close`, data || {}),
};

export const settings = {
  getAll: () => api.get('/settings'),
  updateBatch: (settings: Record<string, any>) => api.post('/settings/batch', settings),
};

export const activity = {
  getAll: (params?: any) => api.get('/activity', { params }),
};

export const noteOptions = {
  getAll: () => api.get('/note-options'),
  create: (data: { name: string; price: number }) => api.post('/note-options', data),
  update: (id: number, data: any) => api.put(`/note-options/${id}`, data),
  delete: (id: number) => api.delete(`/note-options/${id}`),
};

export const users = {
  getAll: () => api.get('/users'),
  create: (data: any) => api.post('/users', data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
  toggleStatus: (id: number, is_active: boolean) =>
    api.patch(`/users/${id}/toggle-status`, { is_active }),
};




export default api;

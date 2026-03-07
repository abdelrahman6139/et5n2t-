import React, { useEffect, useRef, useState } from 'react';
import { User, Hall, Table, DeliveryZone, Kitchen, Printer, Employee, Shift } from '../types';
import { API_BASE_URL } from '../utils/api';
import {
  UsersIcon, TableIcon, MapIcon, EditIcon, TrashIcon, PlusCircleIcon,
  ChefHatIcon, UsersRoundIcon, PrinterIcon, EyeIcon, EyeOffIcon, CheckIcon, XIcon
} from '../components/icons';
// Add these to your existing imports
import {
  kitchens as kitchensApi,
  printers as printersApi,
  zones as zonesApi,
  employees as employeesApi
} from '../utils/api';
import api from '../utils/api';



interface SystemUser {
  id: number;
  username: string;
  full_name: string;
  role: 'Admin' | 'Cashier' | 'Waiter' | 'Kitchen' | 'Manager';
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
}

const AdminScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'halls' | 'kitchens' | 'printers' | 'zones' | 'employees' | 'drivers'>('users');

  /* Users State */
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [newUser, setNewUser] = useState<{
    username: string;
    full_name: string;
    password: string;
    role: 'Admin' | 'Cashier' | 'Waiter' | 'Kitchen' | 'Manager';
    email: string;
    phone: string;
    is_active: boolean;
  }>({
    username: '',
    full_name: '',
    password: '',
    role: 'Cashier',
    email: '',
    phone: '',
    is_active: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Halls & Tables state (keep your existing code)

  // Add to your existing state variables
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [driverForm, setDriverForm] = useState({
    name: '',
    phone: '',
    vehicle_type: '',
    license_plate: '',
    status: 'available',
    password: ''
  });

  // Fetch users
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
    if (activeTab === 'drivers') {
      fetchDrivers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };
  // Add these fetch functions after fetchUsers, fetchHalls, etc.

  // Fetch Kitchens
  const fetchKitchens = async () => {
    try {
      const response = await kitchensApi.getAll();
      if (response.data.success) {
        setKitchens(response.data.data);
      }
    } catch (error) {
      console.error('Fetch kitchens error:', error);
    }
  };
  // Fetch drivers
  const fetchDrivers = async () => {
    try {
      const response = await api.get('/drivers');
      setDrivers(response.data.data || []);
    } catch (error) {
      console.error('Fetch drivers error:', error);
    }
  };


  // Fetch Printers
  const fetchPrinters = async () => {
    try {
      const response = await printersApi.getAll();
      if (response.data.success) {
        setPrinters(response.data.data);
      }
    } catch (error) {
      console.error('Fetch printers error:', error);
    }
  };

  // Fetch Zones
  const fetchZones = async () => {
    try {
      const response = await zonesApi.getAll();
      if (response.data.success) {
        setZones(response.data.data);
      }
    } catch (error) {
      console.error('Fetch zones error:', error);
    }
  };

  // Fetch Employees
  const fetchEmployees = async () => {
    try {
      const response = await employeesApi.getAll();
      if (response.data.success) {
        setEmployees(response.data.data);
      }
    } catch (error) {
      console.error('Fetch employees error:', error);
    }
  };
  // Add this useEffect to fetch data when tabs change
  useEffect(() => {
    if (activeTab === 'kitchens') fetchKitchens();
    if (activeTab === 'printers') {
      fetchPrinters();
      fetchKitchens(); // Needed for kitchen dropdown in printer form
    }
    if (activeTab === 'zones') fetchZones();
    if (activeTab === 'employees') fetchEmployees();
  }, [activeTab]);



  const handleSaveUser = async () => {
    try {
      const url = editingUser
        ? `${API_BASE_URL}/users/${editingUser.id}`
        : `${API_BASE_URL}/users`;

      const method = editingUser ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newUser)
      });

      if (response.ok) {
        fetchUsers();
        setIsUserModalOpen(false);
        resetUserForm();
      } else {
        alert('Failed to save user');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error saving user');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        fetchUsers();
      } else {
        alert('Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user');
    }
  };

  const handleEditUser = (user: SystemUser) => {
    setEditingUser(user);
    setNewUser({
      username: user.username,
      full_name: user.full_name,
      password: '', // Password is not pre-filled for security
      role: user.role,
      email: user.email,
      phone: user.phone,
      is_active: user.is_active
    });
    setIsUserModalOpen(true);
  };

  const resetUserForm = () => {
    setNewUser({
      username: '',
      full_name: '',
      password: '',
      role: 'Cashier' as 'Admin' | 'Cashier' | 'Waiter' | 'Kitchen' | 'Manager',
      email: '',
      phone: '',
      is_active: true
    });
    setEditingUser(null);
  };

  const toggleUserStatus = async (user: SystemUser) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${user.id}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ is_active: !user.is_active })
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };
  // Driver functions
  const handleAddDriver = () => {
    setSelectedDriver(null);
    setDriverForm({
      name: '',
      phone: '',
      vehicle_type: '',
      license_plate: '',
      status: 'available',
      password: ''
    });
    setIsDriverModalOpen(true);
  };

  const handleEditDriver = (driver: any) => {
    setSelectedDriver(driver);
    setDriverForm({
      name: driver.name || '',
      phone: driver.phone || '',
      vehicle_type: driver.vehicle_type || '',
      license_plate: driver.license_plate || '',
      status: driver.status || 'available',
      password: '' // Always start with empty password when editing
    });
    setIsDriverModalOpen(true);
  };

  const handleSaveDriver = async () => {
    try {
      if (!driverForm.name || !driverForm.phone) {
        alert('الاسم والهاتف مطلوبان');
        return;
      }

      // Require password when creating a new driver
      if (!selectedDriver && !driverForm.password) {
        alert('كلمة المرور مطلوبة عند إضافة سائق جديد');
        return;
      }

      if (selectedDriver) {
        // Update - only include password if it's provided
        const updateData = { ...driverForm };
        if (!updateData.password) {
          delete updateData.password;
        }
        await api.put(`/drivers/${selectedDriver.id}`, updateData);
        alert('✅ تم تحديث بيانات السائق');
      } else {
        // Create
        await api.post('/drivers', driverForm);
        alert('✅ تم إضافة السائق بنجاح');
      }

      setIsDriverModalOpen(false);
      fetchDrivers();
    } catch (error: any) {
      console.error('Save driver error:', error);
      alert(error.response?.data?.error || 'فشل في حفظ بيانات السائق');
    }
  };

  const handleDeleteDriver = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السائق؟')) return;

    try {
      await api.delete(`/drivers/${id}`);
      alert('✅ تم حذف السائق');
      fetchDrivers();
    } catch (error: any) {
      console.error('Delete driver error:', error);
      alert(error.response?.data?.error || 'فشل في حذف السائق');
    }
  };


  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Keep your existing halls/tables functions h// ============ Halls & Tables Tab ============
  const HallsTablesTab: React.FC = () => {
    const [halls, setHalls] = useState<Hall[]>([]);
    const [tables, setTables] = useState<Table[]>([]);
    const [selectedHallId, setSelectedHallId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [showHallModal, setShowHallModal] = useState(false);
    const [showTableModal, setShowTableModal] = useState(false);
    const [editingHall, setEditingHall] = useState<Hall | null>(null);
    const [editingTable, setEditingTable] = useState<Table | null>(null);

    useEffect(() => {
      fetchData();
    }, []);

    const fetchData = async () => {
      try {
        const [hallsRes, tablesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/halls`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }),
          fetch(`${API_BASE_URL}/tables`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          })
        ]);

        const hallsResponse = await hallsRes.json();
        const tablesResponse = await tablesRes.json();

        console.log('Halls Response:', hallsResponse);
        console.log('Tables Response:', tablesResponse);

        // Check if response has success and data structure
        let hallsData;
        if (hallsResponse.success && hallsResponse.data) {
          hallsData = hallsResponse.data;
        } else if (Array.isArray(hallsResponse)) {
          hallsData = hallsResponse;
        } else {
          console.error('Unexpected halls response format:', hallsResponse);
          hallsData = [];
        }

        let tablesData;
        if (tablesResponse.success && tablesResponse.data) {
          tablesData = tablesResponse.data;
        } else if (Array.isArray(tablesResponse)) {
          tablesData = tablesResponse;
        } else {
          console.error('Unexpected tables response format:', tablesResponse);
          tablesData = [];
        }

        console.log('Processed Halls:', hallsData);
        console.log('Processed Tables:', tablesData);

        // Map halls
        if (Array.isArray(hallsData) && hallsData.length > 0) {
          setHalls(hallsData.map((h: any) => ({ id: h.id, name: h.name })));
          if (!selectedHallId) {
            setSelectedHallId(hallsData[0].id);
          }
        }

        // Map tables
        if (Array.isArray(tablesData) && tablesData.length > 0) {
          setTables(tablesData.map((t: any) => ({
            id: t.id,
            name: t.name,
            hallId: t.hall_id,
            status: 'available' as const,
            capacity: t.capacity || 4
          })));
        }

        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setLoading(false);
      }
    };

    const handleSaveHall = async (name: string) => {
      try {
        const url = editingHall
          ? `${API_BASE_URL}/halls/${editingHall.id}`
          : `${API_BASE_URL}/halls`;

        const response = await fetch(url, {
          method: editingHall ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ name })
        });

        const data = await response.json();

        if (editingHall) {
          setHalls(halls.map(h => h.id === data.id ? { id: data.id, name: data.name } : h));
        } else {
          setHalls([...halls, { id: data.id, name: data.name }]);
        }

        setShowHallModal(false);
        setEditingHall(null);
      } catch (err) {
        alert('فشل حفظ الصالة');
      }
    };

    const handleDeleteHall = async (hallId: number) => {
      if (!confirm('هل أنت متأكد من حذف هذه الصالة؟')) return;

      try {
        await fetch(`${API_BASE_URL}/halls/${hallId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        setHalls(halls.filter(h => h.id !== hallId));
        setTables(tables.filter(t => t.hallId !== hallId));

        if (selectedHallId === hallId) {
          setSelectedHallId(halls[0]?.id || null);
        }
      } catch (err) {
        alert('فشل حذف الصالة');
      }
    };

    const handleSaveTable = async (name: string, capacity: number) => {
      try {
        const url = editingTable
          ? `${API_BASE_URL}/tables/${editingTable.id}`
          : `${API_BASE_URL}/tables`;

        const response = await fetch(url, {
          method: editingTable ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ name, hallId: selectedHallId, capacity })
        });

        const data = await response.json();

        if (editingTable) {
          setTables(tables.map(t => t.id === data.id
            ? { id: data.id, name: data.name, hallId: data.hall_id, status: 'available' as const, capacity: data.capacity }
            : t
          ));
        } else {
          setTables([...tables, {
            id: data.id,
            name: data.name,
            hallId: data.hall_id,
            status: 'available' as const,
            capacity: data.capacity
          }]);
        }

        setShowTableModal(false);
        setEditingTable(null);
      } catch (err) {
        alert('فشل حفظ الطاولة');
      }
    };

    const handleDeleteTable = async (tableId: number) => {
      if (!confirm('هل أنت متأكد من حذف هذه الطاولة؟')) return;

      try {
        await fetch(`${API_BASE_URL}/tables/${tableId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        setTables(tables.filter(t => t.id !== tableId));
      } catch (err) {
        alert('فشل حذف الطاولة');
      }
    };

    const tablesInSelectedHall = tables.filter(t => t.hallId === selectedHallId);

    if (loading) return <div className="text-center py-8">جاري التحميل...</div>;

    return (
      <div>
        {/* Halls Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold dark:text-white">إدارة الصالات</h2>
            <button
              onClick={() => { setEditingHall(null); setShowHallModal(true); }}
              className="px-4 py-2 bg-blue-500 dark:bg-amber-500 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-amber-600 flex items-center gap-2"
            >
              <PlusCircleIcon /> إضافة جديد
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full bg-gray-50 dark:bg-gray-900 rounded-lg">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="px-6 py-3 text-right text-sm font-semibold dark:text-white">اسم الصالة</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold dark:text-white">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {halls.map(hall => (
                  <tr key={hall.id} className="border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 text-sm dark:text-white cursor-pointer" onClick={() => setSelectedHallId(hall.id)}>
                      {hall.name}
                    </td>
                    <td className="px-6 py-4 text-sm flex gap-2">
                      <button onClick={() => { setEditingHall(hall); setShowHallModal(true); }} className="text-green-600 hover:text-green-800">
                        <EditIcon />
                      </button>
                      <button onClick={() => handleDeleteHall(hall.id)} className="text-red-600 hover:text-red-800">
                        <TrashIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tables Section */}
        {selectedHallId && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold dark:text-white">
                إدارة الطاولات - {halls.find(h => h.id === selectedHallId)?.name}
              </h2>
              <button
                onClick={() => { setEditingTable(null); setShowTableModal(true); }}
                className="px-4 py-2 bg-blue-500 dark:bg-amber-500 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-amber-600 flex items-center gap-2"
              >
                <PlusCircleIcon /> إضافة جديد
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full bg-gray-50 dark:bg-gray-900 rounded-lg">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="px-6 py-3 text-right text-sm font-semibold dark:text-white">اسم الطاولة</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold dark:text-white">الصالة</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold dark:text-white">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {tablesInSelectedHall.map(table => (
                    <tr key={table.id} className="border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 text-sm dark:text-white">{table.name}</td>
                      <td className="px-6 py-4 text-sm dark:text-white">{halls.find(h => h.id === table.hallId)?.name}</td>
                      <td className="px-6 py-4 text-sm flex gap-2">
                        <button onClick={() => { setEditingTable(table); setShowTableModal(true); }} className="text-green-600 hover:text-green-800">
                          <EditIcon />
                        </button>
                        <button onClick={() => handleDeleteTable(table.id)} className="text-red-600 hover:text-red-800">
                          <TrashIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modals */}
        {showHallModal && <HallModal hall={editingHall} onSave={handleSaveHall} onClose={() => { setShowHallModal(false); setEditingHall(null); }} />}
        {showTableModal && <TableModal table={editingTable} onSave={handleSaveTable} onClose={() => { setShowTableModal(false); setEditingTable(null); }} />}
      </div>
    );
  };

  // Hall Modal
  const HallModal: React.FC<{ hall: Hall | null; onSave: (name: string) => void; onClose: () => void; }> = ({ hall, onSave, onClose }) => {
    const [name, setName] = useState(hall?.name || '');
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4 dark:text-white">{hall ? 'تعديل الصالة' : 'إضافة صالة جديدة'}</h2>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="اسم الصالة"
            className="w-full p-2 border rounded mb-4 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded">إلغاء</button>
            <button onClick={() => name.trim() && onSave(name)} className="flex-1 px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600">حفظ</button>
          </div>
        </div>
      </div>
    );
  };

  // Table Modal
  const TableModal: React.FC<{ table: Table | null; onSave: (name: string, capacity: number) => void; onClose: () => void; }> = ({ table, onSave, onClose }) => {
    const [name, setName] = useState(table?.name || '');
    const [capacity, setCapacity] = useState(table?.capacity || 4);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4 dark:text-white">{table ? 'تعديل الطاولة' : 'إضافة طاولة جديدة'}</h2>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="رقم/اسم الطاولة"
            className="w-full p-2 border rounded mb-4 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(parseInt(e.target.value))}
            placeholder="السعة"
            min="1"
            className="w-full p-2 border rounded mb-4 dark:bg-gray-700 dark:text-white dark:border-gray-600"
          />
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded">إلغاء</button>
            <button onClick={() => name.trim() && onSave(name, capacity)} className="flex-1 px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600">حفظ</button>
          </div>
        </div>
      </div>
    );
  };
  // Add these state variables after your existing ones (after users, halls, tables states)

  // Kitchens state
  const [kitchens, setKitchens] = useState<any[]>([]);
  const [editingKitchen, setEditingKitchen] = useState<any>(null);
  const [kitchenModalOpen, setKitchenModalOpen] = useState(false);
  const [kitchenForm, setKitchenForm] = useState({ name: '' });

  // Printers state
  const [printers, setPrinters] = useState<any[]>([]);
  const [editingPrinter, setEditingPrinter] = useState<any>(null);
  const [printerModalOpen, setPrinterModalOpen] = useState(false);
  const [printerForm, setPrinterForm] = useState({ name: '', type: 'Printer', kitchen_id: '' });

  // Zones state
  const [zones, setZones] = useState<any[]>([]);
  const [editingZone, setEditingZone] = useState<any>(null);
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [zoneForm, setZoneForm] = useState({ name: '', delivery_fee: '' });

  // Employees state
  const [employees, setEmployees] = useState<any[]>([]);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({ name: '', role: '', phone: '' });

  // ========== KITCHENS HANDLERS ==========
  const handleAddKitchen = () => {
    setEditingKitchen(null);
    setKitchenForm({ name: '' });
    setKitchenModalOpen(true);
  };

  const handleEditKitchen = (kitchen: any) => {
    setEditingKitchen(kitchen);
    setKitchenForm({ name: kitchen.name });
    setKitchenModalOpen(true);
  };

  const handleSaveKitchen = async () => {
    try {
      if (!kitchenForm.name) {
        alert('الاسم مطلوب');
        return;
      }

      if (editingKitchen) {
        await kitchensApi.update(editingKitchen.id, kitchenForm);
        alert('تم تحديث المطبخ بنجاح');
      } else {
        await kitchensApi.create(kitchenForm);
        alert('تم إضافة المطبخ بنجاح');
      }

      setKitchenModalOpen(false);
      fetchKitchens();
    } catch (error) {
      console.error('Save kitchen error:', error);
      alert('فشل في حفظ المطبخ');
    }
  };

  const handleDeleteKitchen = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المطبخ؟')) return;

    try {
      await kitchensApi.delete(id);
      alert('تم حذف المطبخ بنجاح');
      fetchKitchens();
    } catch (error) {
      console.error('Delete kitchen error:', error);
      alert('فشل في حذف المطبخ');
    }
  };

  // ========== PRINTERS HANDLERS ==========
  const handleAddPrinter = () => {
    setEditingPrinter(null);
    setPrinterForm({ name: '', type: 'Printer', kitchen_id: '' });
    setPrinterModalOpen(true);
  };

  const handleEditPrinter = (printer: any) => {
    setEditingPrinter(printer);
    setPrinterForm({
      name: printer.name,
      type: printer.type || 'Printer',
      kitchen_id: printer.kitchen_id
    });
    setPrinterModalOpen(true);
  };

  const handleSavePrinter = async () => {
    try {
      if (!printerForm.name || !printerForm.kitchen_id) {
        alert('الاسم والمطبخ مطلوبان');
        return;
      }

      const data = {
        ...printerForm,
        kitchen_id: parseInt(printerForm.kitchen_id)
      };

      if (editingPrinter) {
        await printersApi.update(editingPrinter.id, data);
        alert('تم تحديث الطابعة بنجاح');
      } else {
        await printersApi.create(data);
        alert('تم إضافة الطابعة بنجاح');
      }

      setPrinterModalOpen(false);
      fetchPrinters();
    } catch (error) {
      console.error('Save printer error:', error);
      alert('فشل في حفظ الطابعة');
    }
  };

  const handleDeletePrinter = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الطابعة؟')) return;

    try {
      await printersApi.delete(id);
      alert('تم حذف الطابعة بنجاح');
      fetchPrinters();
    } catch (error) {
      console.error('Delete printer error:', error);
      alert('فشل في حذف الطابعة');
    }
  };

  // ========== ZONES HANDLERS ==========
  const handleAddZone = () => {
    setEditingZone(null);
    setZoneForm({ name: '', delivery_fee: '' });
    setZoneModalOpen(true);
  };

  const handleEditZone = (zone: any) => {
    setEditingZone(zone);
    setZoneForm({
      name: zone.name,
      delivery_fee: zone.delivery_fee
    });
    setZoneModalOpen(true);
  };

  const handleSaveZone = async () => {
    try {
      if (!zoneForm.name || !zoneForm.delivery_fee) {
        alert('الاسم ورسوم التوصيل مطلوبان');
        return;
      }

      const data = {
        ...zoneForm,
        delivery_fee: parseFloat(zoneForm.delivery_fee),
        geojson: {}
      };

      if (editingZone) {
        await zonesApi.update(editingZone.id, data);
        alert('تم تحديث المنطقة بنجاح');
      } else {
        await zonesApi.create(data);
        alert('تم إضافة المنطقة بنجاح');
      }

      setZoneModalOpen(false);
      fetchZones();
    } catch (error) {
      console.error('Save zone error:', error);
      alert('فشل في حفظ المنطقة');
    }
  };

  const handleDeleteZone = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المنطقة؟')) return;

    try {
      await zonesApi.delete(id);
      alert('تم حذف المنطقة بنجاح');
      fetchZones();
    } catch (error) {
      console.error('Delete zone error:', error);
      alert('فشل في حذف المنطقة');
    }
  };


  // ========== EMPLOYEES HANDLERS ==========
  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setEmployeeForm({ name: '', role: '', phone: '' });
    setEmployeeModalOpen(true);
  };

  const handleEditEmployee = (employee: any) => {
    setEditingEmployee(employee);
    setEmployeeForm({
      name: employee.name,
      role: employee.role,
      phone: employee.phone || ''
    });
    setEmployeeModalOpen(true);
  };

  const handleSaveEmployee = async () => {
    try {
      if (!employeeForm.name || !employeeForm.role) {
        alert('الاسم والدور مطلوبان');
        return;
      }

      if (editingEmployee) {
        await employeesApi.update(editingEmployee.id, employeeForm);
        alert('تم تحديث الموظف بنجاح');
      } else {
        await employeesApi.create(employeeForm);
        alert('تم إضافة الموظف بنجاح');
      }

      setEmployeeModalOpen(false);
      fetchEmployees();
    } catch (error) {
      console.error('Save employee error:', error);
      alert('فشل في حفظ الموظف');
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;

    try {
      await employeesApi.delete(id);
      alert('تم حذف الموظف بنجاح');
      fetchEmployees();
    } catch (error) {
      console.error('Delete employee error:', error);
      alert('فشل في حذف الموظف');
    }
  };

  const navButtonClass = (tabName: string) =>
    `py-4 px-2 inline-flex items-center gap-2 text-lg whitespace-nowrap ${activeTab === tabName
      ? 'border-b-4 border-amber-600 text-amber-600'
      : 'border-b-4 border-transparent text-gray-500 hover:text-amber-600'
    }`;

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      Admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      Manager: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      Cashier: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      Waiter: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      Kitchen: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      {/* Tabs Navigation */}
      <nav className="flex space-x-4 space-x-reverse border-b mb-6 dark:border-gray-700">
        <button onClick={() => setActiveTab('users')} className={navButtonClass('users')}>
          <UsersIcon className="w-5 h-5" />
          <span>المستخدمين</span>
        </button>
        <button onClick={() => setActiveTab('halls')} className={navButtonClass('halls')}>
          <TableIcon className="w-5 h-5" />
          <span>الصالات والطاولات</span>
        </button>
        <button onClick={() => setActiveTab('kitchens')} className={navButtonClass('kitchens')}>
          <ChefHatIcon className="w-5 h-5" />
          <span>المطابخ</span>
        </button>
        <button onClick={() => setActiveTab('printers')} className={navButtonClass('printers')}>
          <PrinterIcon className="w-5 h-5" />
          <span>الطابعات</span>
        </button>
        <button onClick={() => setActiveTab('zones')} className={navButtonClass('zones')}>
          <MapIcon className="w-5 h-5" />
          <span>مناطق التوصيل</span>
        </button>
        <button onClick={() => setActiveTab('employees')} className={navButtonClass('employees')}>
          <UsersRoundIcon className="w-5 h-5" />
          <span>الموظفين</span>
        </button>
        <button
          onClick={() => setActiveTab('drivers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md ${activeTab === 'drivers'
            ? 'bg-amber-500 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
        >
          🚗 السائقين
        </button>


      </nav>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">إدارة المستخدمين</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">إضافة وتعديل وحذف مستخدمي النظام</p>
            </div>
            <button
              onClick={() => {
                resetUserForm();
                setIsUserModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition"
            >
              <PlusCircleIcon className="w-5 h-5" />
              <span>إضافة مستخدم جديد</span>
            </button>
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="بحث بالاسم أو البريد الإلكتروني..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Users Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">اسم المستخدم</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الاسم الكامل</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الدور</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">البريد الإلكتروني</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الهاتف</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الحالة</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      لا يوجد مستخدمين
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {user.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {user.full_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {user.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {user.phone || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleUserStatus(user)}
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${user.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}
                        >
                          {user.is_active ? 'نشط' : 'معطل'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                            title="تعديل"
                          >
                            <EditIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400"
                            title="حذف"
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

          {/* User Modal */}
          {isUserModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
                <h2 className="text-2xl font-bold mb-4 dark:text-white">
                  {editingUser ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 dark:text-gray-300">اسم المستخدم *</label>
                      <input
                        type="text"
                        value={newUser.username}
                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 dark:text-gray-300">كلمة المرور *</label>
                      <input
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">الاسم الكامل *</label>
                    <input
                      type="text"
                      value={newUser.full_name}
                      onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">الدور *</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value as typeof newUser.role })}
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    >
                      <option value="Cashier">كاشير</option>
                      <option value="Waiter">نادل</option>
                      <option value="Kitchen">مطبخ</option>
                      <option value="Manager">مدير</option>
                      <option value="Admin">مسؤول</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">الهاتف</label>
                    <input
                      type="tel"
                      value={newUser.phone}
                      onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={newUser.is_active}
                      onChange={(e) => setNewUser({ ...newUser, is_active: e.target.checked })}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                      نشط
                    </label>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    onClick={() => setIsUserModalOpen(false)}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleSaveUser}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                  >
                    حفظ
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'halls' && <HallsTablesTab />}


      {/* Other tabs */}
      {activeTab === 'kitchens' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">إدارة المطابخ</h2>
            <button
              onClick={handleAddKitchen}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              + إضافة مطبخ
            </button>
          </div>

          <table className="w-full bg-white dark:bg-gray-800 rounded shadow">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="p-3 text-right">اسم المطبخ</th>
                <th className="p-3 text-right">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {kitchens.length === 0 ? (
                <tr>
                  <td colSpan={2} className="p-4 text-center text-gray-500">
                    لا توجد مطابخ
                  </td>
                </tr>
              ) : (
                kitchens.map((kitchen) => (
                  <tr key={kitchen.id} className="border-t dark:border-gray-700">
                    <td className="p-3">{kitchen.name}</td>
                    <td className="p-3">
                      <button
                        onClick={() => handleEditKitchen(kitchen)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDeleteKitchen(kitchen.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Kitchen Modal */}
          {kitchenModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
                <h3 className="text-lg font-bold mb-4">
                  {editingKitchen ? 'تعديل مطبخ' : 'إضافة مطبخ جديد'}
                </h3>
                <div className="mb-4">
                  <label className="block mb-2">اسم المطبخ *</label>
                  <input
                    type="text"
                    value={kitchenForm.name}
                    onChange={(e) => setKitchenForm({ name: e.target.value })}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    placeholder="أدخل اسم المطبخ"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveKitchen}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    حفظ
                  </button>
                  <button
                    onClick={() => setKitchenModalOpen(false)}
                    className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Drivers Tab */}
      {activeTab === 'drivers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              🚗 إدارة السائقين
            </h2>
            <button
              onClick={handleAddDriver}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
            >
              ➕ إضافة سائق جديد
            </button>
          </div>

          <p className="text-gray-600 dark:text-gray-400">
            إضافة وتعديل وحذف سائقي التوصيل
          </p>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="p-3 text-right">#</th>
                  <th className="p-3 text-right">الاسم</th>
                  <th className="p-3 text-right">الهاتف</th>
                  <th className="p-3 text-right">نوع المركبة</th>
                  <th className="p-3 text-right">رقم اللوحة</th>
                  <th className="p-3 text-right">الحالة</th>
                  <th className="p-3 text-right">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {drivers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      لا يوجد سائقين
                    </td>
                  </tr>
                ) : (
                  drivers.map((driver) => (
                    <tr
                      key={driver.id}
                      className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="p-3">{driver.id}</td>
                      <td className="p-3 font-medium">{driver.name}</td>
                      <td className="p-3">{driver.phone}</td>
                      <td className="p-3">{driver.vehicle_type || '-'}</td>
                      <td className="p-3">{driver.license_plate || '-'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${driver.status === 'available'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : driver.status === 'busy'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}
                        >
                          {driver.status === 'available' ? 'متاح' : driver.status === 'busy' ? 'مشغول' : 'غير متصل'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditDriver(driver)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteDriver(driver.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {activeTab === 'employees' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">إدارة الموظفين</h2>
            <button
              onClick={handleAddEmployee}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              + إضافة موظف
            </button>
          </div>

          <table className="w-full bg-white dark:bg-gray-800 rounded shadow">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="p-3 text-right">الاسم</th>
                <th className="p-3 text-right">الدور</th>
                <th className="p-3 text-right">الهاتف</th>
                <th className="p-3 text-right">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-500">
                    لا يوجد موظفين
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id} className="border-t dark:border-gray-700">
                    <td className="p-3">{employee.name}</td>
                    <td className="p-3">{employee.role}</td>
                    <td className="p-3">{employee.phone || '-'}</td>
                    <td className="p-3">
                      <button
                        onClick={() => handleEditEmployee(employee)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(employee.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Employee Modal */}
          {employeeModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
                <h3 className="text-lg font-bold mb-4">
                  {editingEmployee ? 'تعديل موظف' : 'إضافة موظف جديد'}
                </h3>
                <div className="mb-4">
                  <label className="block mb-2">اسم الموظف *</label>
                  <input
                    type="text"
                    value={employeeForm.name}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    placeholder="أدخل اسم الموظف"
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-2">الدور *</label>
                  <input
                    type="text"
                    value={employeeForm.role}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value })}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    placeholder="مثال: طباخ، نادل، مدير"
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-2">رقم الهاتف</label>
                  <input
                    type="text"
                    value={employeeForm.phone}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    placeholder="اختياري"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEmployee}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    حفظ
                  </button>
                  <button
                    onClick={() => setEmployeeModalOpen(false)}
                    className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'zones' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">إدارة مناطق التوصيل</h2>
            <button
              onClick={handleAddZone}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              + إضافة منطقة
            </button>
          </div>

          <table className="w-full bg-white dark:bg-gray-800 rounded shadow">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="p-3 text-right">اسم المنطقة</th>
                <th className="p-3 text-right">رسوم التوصيل</th>
                <th className="p-3 text-right">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {zones.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-gray-500">
                    لا توجد مناطق توصيل
                  </td>
                </tr>
              ) : (
                zones.map((zone) => (
                  <tr key={zone.id} className="border-t dark:border-gray-700">
                    <td className="p-3">{zone.name}</td>
                    <td className="p-3">{zone.delivery_fee} ج.م</td>
                    <td className="p-3">
                      <button
                        onClick={() => handleEditZone(zone)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDeleteZone(zone.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Zone Modal */}
          {zoneModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
                <h3 className="text-lg font-bold mb-4">
                  {editingZone ? 'تعديل منطقة' : 'إضافة منطقة جديدة'}
                </h3>
                <div className="mb-4">
                  <label className="block mb-2">اسم المنطقة *</label>
                  <input
                    type="text"
                    value={zoneForm.name}
                    onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    placeholder="أدخل اسم المنطقة"
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-2">رسوم التوصيل (ج.م) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={zoneForm.delivery_fee}
                    onChange={(e) => setZoneForm({ ...zoneForm, delivery_fee: e.target.value })}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    placeholder="15.00"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveZone}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    حفظ
                  </button>
                  <button
                    onClick={() => setZoneModalOpen(false)}
                    className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'printers' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">إدارة الطابعات</h2>
            <button
              onClick={handleAddPrinter}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              + إضافة طابعة
            </button>
          </div>

          <table className="w-full bg-white dark:bg-gray-800 rounded shadow">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="p-3 text-right">اسم الطابعة</th>
                <th className="p-3 text-right">النوع</th>
                <th className="p-3 text-right">المطبخ</th>
                <th className="p-3 text-right">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {printers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-500">
                    لا توجد طابعات
                  </td>
                </tr>
              ) : (
                printers.map((printer) => (
                  <tr key={printer.id} className="border-t dark:border-gray-700">
                    <td className="p-3">{printer.name}</td>
                    <td className="p-3">{printer.type}</td>
                    <td className="p-3">{printer.kitchen_name || '-'}</td>
                    <td className="p-3">
                      <button
                        onClick={() => handleEditPrinter(printer)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDeletePrinter(printer.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Printer Modal */}
          {printerModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
                <h3 className="text-lg font-bold mb-4">
                  {editingPrinter ? 'تعديل طابعة' : 'إضافة طابعة جديدة'}
                </h3>
                <div className="mb-4">
                  <label className="block mb-2">اسم الطابعة *</label>
                  <input
                    type="text"
                    value={printerForm.name}
                    onChange={(e) => setPrinterForm({ ...printerForm, name: e.target.value })}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    placeholder="أدخل اسم الطابعة"
                  />
                </div>
                <div className="mb-4">
                  <label className="block mb-2">النوع</label>
                  <select
                    value={printerForm.type}
                    onChange={(e) => setPrinterForm({ ...printerForm, type: e.target.value })}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="Printer">طابعة</option>
                    <option value="KitchenDisplay">شاشة مطبخ</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block mb-2">المطبخ *</label>
                  <select
                    value={printerForm.kitchen_id}
                    onChange={(e) => setPrinterForm({ ...printerForm, kitchen_id: e.target.value })}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="">اختر المطبخ</option>
                    {kitchens.map((k) => (
                      <option key={k.id} value={k.id}>{k.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSavePrinter}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    حفظ
                  </button>
                  <button
                    onClick={() => setPrinterModalOpen(false)}
                    className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Driver Modal */}
      {isDriverModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              {selectedDriver ? 'تعديل بيانات السائق' : 'إضافة سائق جديد'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  الاسم *
                </label>
                <input
                  type="text"
                  value={driverForm.name}
                  onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  placeholder="أحمد محمد"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  رقم الهاتف *
                </label>
                <input
                  type="tel"
                  value={driverForm.phone}
                  onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  placeholder="0500000000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  كلمة المرور {selectedDriver ? '' : '*'}
                  {selectedDriver && <span className="text-xs text-gray-500"> (اتركها فارغة للإبقاء على كلمة المرور الحالية)</span>}
                </label>
                <input
                  type="password"
                  value={driverForm.password || ''}
                  onChange={(e) => setDriverForm({ ...driverForm, password: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  placeholder={selectedDriver ? "اتركها فارغة للإبقاء على الحالية" : "أدخل كلمة المرور"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  نوع المركبة
                </label>
                <select
                  value={driverForm.vehicle_type}
                  onChange={(e) => setDriverForm({ ...driverForm, vehicle_type: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="">اختر نوع المركبة</option>
                  <option value="motorcycle">دراجة نارية</option>
                  <option value="car">سيارة</option>
                  <option value="bicycle">دراجة</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  رقم اللوحة
                </label>
                <input
                  type="text"
                  value={driverForm.license_plate}
                  onChange={(e) => setDriverForm({ ...driverForm, license_plate: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  placeholder="أ ب ج 1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  الحالة
                </label>
                <select
                  value={driverForm.status}
                  onChange={(e) => setDriverForm({ ...driverForm, status: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                >
                  <option value="available">متاح</option>
                  <option value="busy">مشغول</option>
                  <option value="offline">غير متصل</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveDriver}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                💾 حفظ
              </button>
              <button
                onClick={() => setIsDriverModalOpen(false)}
                className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
              >
                ❌ إلغاء
              </button>
            </div>
          </div>
        </div>
      )}



      {/* User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                {editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
              </h2>
              <button
                onClick={() => {
                  setIsUserModalOpen(false);
                  resetUserForm();
                }}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2"
              >
                <XIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    اسم المستخدم *
                  </label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الاسم الكامل *
                  </label>
                  <input
                    type="text"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    كلمة المرور {editingUser ? '(اتركها فارغة للإبقاء على القديمة)' : '*'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      required={!editingUser}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الدور *
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="Admin">Admin - مدير</option>
                    <option value="Manager">Manager - مدير فرع</option>
                    <option value="Cashier">Cashier - كاشير</option>
                    <option value="Waiter">Waiter - نادل</option>
                    <option value="Kitchen">Kitchen - مطبخ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    رقم الهاتف
                  </label>
                  <input
                    type="tel"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={newUser.is_active}
                  onChange={(e) => setNewUser({ ...newUser, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  المستخدم نشط
                </label>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setIsUserModalOpen(false);
                  resetUserForm();
                }}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveUser}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition"
              >
                {editingUser ? 'تحديث' : 'إضافة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminScreen;

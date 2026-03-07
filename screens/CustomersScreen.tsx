import React, { useState, useEffect } from 'react';
import { customers as customersApi } from '../utils/api';
import { PlusCircleIcon, EditIcon, TrashIcon } from '../components/icons';

interface Location {
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
  kind: string;
  isDefault: boolean;
}

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  locations: Location[];
  lastZoneId?: number | null;
  lastZoneName?: string | null;
}

const CustomersScreen: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await customersApi.getAll();

      // Map backend data to frontend format
      const mappedCustomers = response.data.map((c: any) => ({
        id: c.id,
        firstName: c.first_name,
        lastName: c.last_name,
        phone: c.phone,
        lastZoneId: c.last_zone_id || null,
        lastZoneName: c.last_zone_name || null,
        locations: (c.locations || []).map((loc: any) => ({
          id: loc.id,
          locationName: loc.locationName || '',
          zoneId: loc.zoneId || null,
          street: loc.street || '',
          building: loc.building || '',
          floor: loc.floor || '',
          apartment: loc.apartment || '',
          landmark: loc.landmark || '',
          latitude: loc.latitude || null,
          longitude: loc.longitude || null,
          kind: loc.kind || 'Home',
          isDefault: loc.isDefault || false
        }))
      }));

      setCustomers(mappedCustomers);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    `${customer.firstName} ${customer.lastName}`.includes(searchTerm) ||
    customer.phone.includes(searchTerm)
  );

  const handleAddNew = () => {
    setEditingCustomer(null);
    setModalOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setModalOpen(true);
  };

  const handleDelete = async (customerId: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا العميل؟')) return;

    try {
      await customersApi.delete(customerId);
      setCustomers(customers.filter(c => c.id !== customerId));
      alert('تم حذف العميل بنجاح');
    } catch (err: any) {
      console.error('Failed to delete customer:', err);
      alert('فشل حذف العميل: ' + (err.response?.data?.error || 'خطأ غير معروف'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-2xl text-gray-600 dark:text-gray-300">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-8 text-gray-800 dark:text-amber-400">إدارة العملاء</h1>

      {/* Search and Add Button */}
      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="بحث..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          onClick={handleAddNew}
          className="px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition flex items-center gap-2"
        >
          <PlusCircleIcon />
          إضافة عميل جديد
        </button>
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الاسم</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">رقم الهاتف</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">عدد العناوين</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">العنوان الافتراضي</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">آخر منطقة توصيل</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredCustomers.map((customer) => {
              const defaultLocation = customer.locations.find(loc => loc.isDefault) || customer.locations[0];

              return (
                <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {`${customer.firstName} ${customer.lastName}`}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300" dir="ltr">
                    {customer.phone}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                    {customer.locations.length}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                    {defaultLocation ? (
                      <div>
                        <div className="font-medium">{defaultLocation.locationName || defaultLocation.street}</div>
                        <div className="text-xs text-gray-400">
                          {defaultLocation.building && `مبنى ${defaultLocation.building}`}
                          {defaultLocation.floor && `, طابق ${defaultLocation.floor}`}
                          {defaultLocation.kind && ` (${defaultLocation.kind})`}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">لا يوجد عنوان</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                    {customer.lastZoneName ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                        🏘️ {customer.lastZoneName}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => handleEdit(customer)}
                      className="text-green-600 hover:text-green-800 dark:text-green-400 ml-4"
                      title="تعديل"
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400"
                      title="حذف"
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <CustomerModal
          customer={editingCustomer}
          onSave={() => {
            fetchCustomers();
            setModalOpen(false);
          }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
};

// Customer Modal with Multiple Locations
const CustomerModal: React.FC<{
  customer: Customer | null;
  onSave: () => void;
  onClose: () => void;
}> = ({ customer, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    phone: customer?.phone || '',
    firstName: customer?.firstName || '',
    lastName: customer?.lastName || ''
  });

  const [locations, setLocations] = useState<Location[]>(
    customer?.locations && customer.locations.length > 0
      ? customer.locations
      : [
        {
          locationName: '',
          zoneId: null,
          street: '',
          building: '',
          floor: '',
          apartment: '',
          landmark: '',
          latitude: null,
          longitude: null,
          kind: 'Home',
          isDefault: true
        }
      ]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationChange = (index: number, field: keyof Location, value: any) => {
    const newLocations = [...locations];
    newLocations[index] = { ...newLocations[index], [field]: value };
    setLocations(newLocations);
  };

  const addLocation = () => {
    setLocations([
      ...locations,
      {
        locationName: '',
        zoneId: null,
        street: '',
        building: '',
        floor: '',
        apartment: '',
        landmark: '',
        latitude: null,
        longitude: null,
        kind: 'Home',
        isDefault: false
      }
    ]);
  };

  const removeLocation = async (index: number) => {
    const location = locations[index];

    // If editing existing customer and location has ID, delete from backend
    if (customer && location.id) {
      if (!window.confirm('هل أنت متأكد من حذف هذا العنوان؟')) return;

      try {
        await customersApi.deleteLocation(customer.id, location.id);
        alert('تم حذف العنوان بنجاح');
      } catch (err) {
        alert('فشل حذف العنوان');
        return;
      }
    }

    const newLocations = locations.filter((_, i) => i !== index);

    // If we deleted the default and there are still locations, make first one default
    if (location.isDefault && newLocations.length > 0) {
      newLocations[0].isDefault = true;
    }

    setLocations(newLocations);
  };

  const setDefaultLocation = (index: number) => {
    const newLocations = locations.map((loc, i) => ({
      ...loc,
      isDefault: i === index
    }));
    setLocations(newLocations);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (customer) {
        // Update customer basic info
        await customersApi.update(customer.id, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone
        });

        // Update/create locations
        for (const loc of locations) {
          if (loc.id) {
            await customersApi.updateLocation(customer.id, loc.id, loc);
          } else {
            await customersApi.createLocation(customer.id, loc);
          }
        }

        // 🔥 ADD THIS: Set the default location on server
        const defaultLoc = locations.find(l => l.isDefault);
        if (defaultLoc && defaultLoc.id) {
          await customersApi.setDefaultLocation(customer.id, defaultLoc.id);
        }

        alert('تم تحديث العميل بنجاح');
      } else {
        // Create new customer with locations
        await customersApi.create({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          locations: locations
        });

        alert('تم إضافة العميل بنجاح');
      }

      onSave();
    } catch (err: any) {
      console.error('Failed to save customer:', err);
      alert('فشل حفظ البيانات: ' + (err.response?.data?.error || 'خطأ غير معروف'));
    }
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
          {customer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Customer Basic Info */}
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-6">
            <h3 className="font-bold mb-4 text-gray-800 dark:text-white">البيانات الأساسية</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">رقم الهاتف</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">الاسم الأول</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">اسم العائلة</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Locations */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 dark:text-white">العناوين</h3>
              <button
                type="button"
                onClick={addLocation}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + إضافة عنوان
              </button>
            </div>

            {locations.map((loc, index) => (
              <div key={index} className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-4 relative">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold text-gray-800 dark:text-white">عنوان {index + 1}</h4>
                    {loc.isDefault && (
                      <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">افتراضي</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!loc.isDefault && (
                      <button
                        type="button"
                        onClick={() => setDefaultLocation(index)}
                        className="text-xs px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-500"
                      >
                        تعيين كافتراضي
                      </button>
                    )}
                    {locations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLocation(index)}
                        className="text-red-500 hover:text-red-700 px-2"
                        title="حذف العنوان"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 dark:text-gray-300">اسم العنوان</label>
                    <input
                      type="text"
                      value={loc.locationName}
                      onChange={(e) => handleLocationChange(index, 'locationName', e.target.value)}
                      placeholder="منزل، عمل، الخ..."
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 dark:text-gray-300">نوع العنوان</label>
                    <select
                      value={loc.kind}
                      onChange={(e) => handleLocationChange(index, 'kind', e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
                    >
                      <option value="Home">منزل</option>
                      <option value="Work">عمل</option>
                      <option value="Other">أخرى</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 dark:text-gray-300">الشارع</label>
                    <input
                      type="text"
                      value={loc.street}
                      onChange={(e) => handleLocationChange(index, 'street', e.target.value)}
                      required
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 dark:text-gray-300">المبنى</label>
                    <input
                      type="text"
                      value={loc.building}
                      onChange={(e) => handleLocationChange(index, 'building', e.target.value)}
                      required
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 dark:text-gray-300">الطابق</label>
                    <input
                      type="text"
                      value={loc.floor}
                      onChange={(e) => handleLocationChange(index, 'floor', e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 dark:text-gray-300">الشقة</label>
                    <input
                      type="text"
                      value={loc.apartment}
                      onChange={(e) => handleLocationChange(index, 'apartment', e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2 dark:text-gray-300">علامة مميزة</label>
                    <input
                      type="text"
                      value={loc.landmark}
                      onChange={(e) => handleLocationChange(index, 'landmark', e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                      خط العرض (Latitude)
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={loc.latitude ?? ''}
                      onChange={(e) =>
                        handleLocationChange(index, 'latitude', e.target.value === '' ? null : Number(e.target.value))
                      }
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      placeholder="اختياري"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                      خط الطول (Longitude)
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={loc.longitude ?? ''}
                      onChange={(e) =>
                        handleLocationChange(index, 'longitude', e.target.value === '' ? null : Number(e.target.value))
                      }
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      placeholder="اختياري"
                    />
                  </div>

                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition"
            >
              حفظ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomersScreen;

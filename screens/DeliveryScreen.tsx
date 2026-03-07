import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { API_BASE_URL } from '../utils/api';

const driverIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="38" height="38"%3E%3Ccircle cx="16" cy="16" r="15" fill="%2310b981" stroke="white" stroke-width="2"/%3E%3Cpath d="M20 11h-2l-2-3h-4v2h3l1.5 2.5H14l-2 2v4l2 1v5h2v-5h2v5h2v-6l-2-1v-2l3-1 1 2h2v-3l-2-2z" fill="white"/%3E%3Ccircle cx="12" cy="24" r="2" fill="white"/%3E%3Ccircle cx="20" cy="24" r="2" fill="white"/%3E%3C/svg%3E',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -19],
});

// ✅ ADD THIS: Orange icon for busy drivers
const busyDriverIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="38" height="38"%3E%3Ccircle cx="16" cy="16" r="15" fill="%23f59e0b" stroke="white" stroke-width="2"/%3E%3Cpath d="M20 11h-2l-2-3h-4v2h3l1.5 2.5H14l-2 2v4l2 1v5h2v-5h2v5h2v-6l-2-1v-2l3-1 1 2h2v-3l-2-2z" fill="white"/%3E%3Ccircle cx="12" cy="24" r="2" fill="white"/%3E%3Ccircle cx="20" cy="24" r="2" fill="white"/%3E%3C/svg%3E',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -19],
});


const customerIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32"%3E%3Ccircle cx="12" cy="12" r="11" fill="%23ef4444" stroke="white" stroke-width="2"/%3E%3Crect x="8" y="8" width="8" height="8" fill="white" rx="1"/%3E%3C/svg%3E',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const assignedCustomerIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32"%3E%3Ccircle cx="12" cy="12" r="11" fill="%23f59e0b" stroke="white" stroke-width="2"/%3E%3Crect x="8" y="8" width="8" height="8" fill="white" rx="1"/%3E%3C/svg%3E',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});
// Function to create driver icon with order count badge
const createDriverIconWithCount = (count: number) => {
  const color = count > 0 ? '#f59e0b' : '#10b981'; // Orange if busy, green if available
  const displayCount = count > 0 ? count : '';

  return new L.DivIcon({
    html: `
      <div style="position: relative; width: 38px; height: 38px;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="38" height="38">
          <circle cx="16" cy="16" r="15" fill="${color}" stroke="white" stroke-width="2"/>
          <path d="M20 11h-2l-2-3h-4v2h3l1.5 2.5H14l-2 2v4l2 1v5h2v-5h2v5h2v-6l-2-1v-2l3-1 1 2h2v-3l-2-2z" fill="white"/>
          <circle cx="12" cy="24" r="2" fill="white"/>
          <circle cx="20" cy="24" r="2" fill="white"/>
        </svg>
        ${displayCount ? `
          <div style="
            position: absolute;
            top: -5px;
            right: -5px;
            background: #ef4444;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 12px;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ">${displayCount}</div>
        ` : ''}
      </div>
    `,
    className: 'driver-marker',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -19],
  });
};

const createClusterCustomIcon = (cluster: any) =>
  L.divIcon({
    html: `<div style="
      background:#2563eb;
      color:#fff;
      width:36px;height:36px;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-weight:700;border:2px solid #fff;
      box-shadow:0 0 0 2px rgba(0,0,0,.15);
    ">${cluster.getChildCount()}</div>`,
    className: 'custom-cluster-icon',
    iconSize: [36, 36],
  });

// Helper: Normalize driver status (Arabic/English)
const normalizeStatus = (s?: string) => {
  const v = (s || '').toLowerCase().trim();
  if (['available', 'متاح'].includes(v)) return 'available';
  if (['busy', 'مشغول'].includes(v)) return 'busy';
  return v || 'unknown';
};

// Helper: Validate coordinates
const isValidLatLng = (lat: any, lng: any) => {
  const la = Number(lat), ln = Number(lng);
  return Number.isFinite(la) && Number.isFinite(ln);
};

interface Order {
  id: string;
  order_no: string | null;  // ✅ Add this line
  customer_name: string;
  address: string;
  phone: string;
  total: number;
  status: string;
  driver_id: string | null;
  latitude: number;
  longitude: number;
}

interface Driver {
  driver_id: string;
  driver_name: string;
  driver_phone: string;
  driver_lat: number;
  driver_lng: number;
  status: string;
  vehicle_type?: string;
  license_plate?: string;
  active_orders_count: number; // NEW: عدد الطلبات النشطة
  assigned_orders: Array<{     // NEW: قائمة الطلبات المُسندة
    order_id: string;
    order_no: string;
    customer_name: string;
    customer_phone: string;
    status: string;
    total: number;
    latitude: number;
    longitude: number;
  }> | null;
  last_seen?: string;
}



const DeliveryScreen: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeDrivers, setActiveDrivers] = useState<Record<string, Driver>>({});
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [showOnlyGPS, setShowOnlyGPS] = useState(false);

  // ✅ Get display order number
  const getOrderNumber = (order: Order): string => {
    return order.order_no || `INV-${order.id}`;
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/orders?status=Pending,Confirmed,Preparing,Delivering&type=delivery`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchActiveDrivers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/tracking/drivers/active`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success) {
        const driversMap: Record<string, Driver> = {};
        data.drivers.forEach((driver: any) => {
          driversMap[driver.driver_id] = {
            driver_id: driver.driver_id,
            driver_name: driver.driver_name || 'Unknown',
            driver_phone: driver.driver_phone || '',
            driver_lat: Number(driver.driver_lat),
            driver_lng: Number(driver.driver_lng),
            status: normalizeStatus(driver.status),
            vehicle_type: driver.vehicle_type,
            license_plate: driver.license_plate,
            active_orders_count: Number(driver.active_orders_count || 0),
            assigned_orders: driver.assigned_orders || null,
            last_seen: driver.last_seen,
          };
        });

        setActiveDrivers(driversMap);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };



  const handleAssignDriver = async () => {
    if (!selectedOrder || !selectedDriverId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/orders/${selectedOrder.id}/assign-driver`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ driver_id: selectedDriverId }),
        }
      );

      if (response.ok) {
        alert('✅ تم تعيين السائق بنجاح');
        setShowAssignModal(false);
        setSelectedOrder(null);
        setSelectedDriverId('');
        fetchOrders();
        fetchActiveDrivers();
      } else {
        const errData = await response.json().catch(() => null);
        alert(`❌ فشل تعيين السائق: ${errData?.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Error assigning driver:', error);
      alert('❌ حدث خطأ أثناء تعيين السائق');
    }
  };

  const getStatusDisplay = (status: string): { text: string; color: string } => {
    const statusMap: Record<string, { text: string; color: string }> = {
      'Pending': { text: 'قيد الانتظار', color: '#f59e0b' },
      'Confirmed': { text: 'مؤكد - في الطريق للفرع', color: '#3b82f6' },
      'Preparing': { text: 'جاري التحضير', color: '#8b5cf6' },
      'Delivering': { text: 'في الطريق للعميل', color: '#10b981' },
      'Completed': { text: 'تم التسليم', color: '#6b7280' },
      'Cancelled': { text: 'ملغي', color: '#ef4444' },  // ✅ Optional: Add this
    };
    return statusMap[status] || { text: status, color: '#6b7280' };
  };


  useEffect(() => {
    fetchOrders();
    fetchActiveDrivers();

    const interval = setInterval(() => {
      fetchOrders();
      fetchActiveDrivers();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // ✅ Debug: Log orders with GPS
  useEffect(() => {
    const ordersWithGPS = orders.filter((order) =>
      Number(order.latitude) &&
      Number(order.longitude) &&
      !(Number(order.latitude) === 24.7136 && Number(order.longitude) === 46.6753)
    );
    console.log('Total orders:', orders.length);
    console.log('Orders with GPS:', ordersWithGPS.length);
    console.log('GPS coordinates:', ordersWithGPS.map(o => ({ id: o.id, lat: o.latitude, lng: o.longitude })));
  }, [orders]);


  const availableDrivers = Object.values(activeDrivers).filter(
    (d: Driver) => (d.active_orders_count || 0) === 0
  ).length;

  const busyDrivers = Object.values(activeDrivers).filter(
    (d: Driver) => (d.active_orders_count || 0) > 0
  ).length;

  const totalAssignedOrders: number = (Object.values(activeDrivers) as Driver[]).reduce(
    (sum: number, d: Driver) => sum + (d.active_orders_count || 0),
    0
  );




  const pendingOrders = orders.filter((o) => !o.driver_id).length;

  // Helper: Check if order has real GPS (not fallback)
  const hasRealGPS = (o: any) => {
    const lat = parseFloat(String(o.latitude));
    const lng = parseFloat(String(o.longitude));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    // Exclude backend fallback coordinates (Riyadh)
    if (lat === 24.7136 && lng === 46.6753) return false;
    return true;
  };


  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', height: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Stats Cards */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        <div
          style={{
            flex: 1,
            padding: '20px',
            backgroundColor: '#10b981',
            color: 'white',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{availableDrivers}</div>
          <div style={{ fontSize: '14px' }}>Available Drivers</div>
        </div>
        <div style={{ flex: 1, padding: '20px', backgroundColor: '#f59e0b', color: 'white', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{busyDrivers}</div>
          <div style={{ fontSize: '14px' }}>Busy Drivers</div>
          {totalAssignedOrders > 0 && (
            <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.9 }}>
              ({totalAssignedOrders} orders)
            </div>
          )}
        </div>

        <div
          style={{
            flex: 1,
            padding: '20px',
            backgroundColor: '#ef4444',
            color: 'white',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{pendingOrders}</div>
          <div style={{ fontSize: '14px' }}>Pending Orders</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* Orders List - Narrower */}
        <div style={{ width: '320px', overflowY: 'auto' }}>
          <h2 style={{ color: '#ffffffff', marginBottom: '12px' }}>طلبات قيد الانتظار</h2>


          {orders
            .filter((o) =>
              !showOnlyGPS ||
              (Number(o.latitude) && Number(o.longitude) &&
                !(Number(o.latitude) === 24.7136 && Number(o.longitude) === 46.6753))
            )
            .map((order) => {
              const statusInfo = getStatusDisplay(order.status);
              const assignedDriver = order.driver_id ? activeDrivers[order.driver_id] : null;
              const hasGPS = Number(order.latitude) && Number(order.longitude) &&
                !(Number(order.latitude) === 24.7136 && Number(order.longitude) === 46.6753);

              return (
                <div
                  key={order.id}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid #1f2937',
                    backgroundColor: order.driver_id ? '#f0fdf4' : 'white',  // Green tint if assigned
                    borderLeft: order.driver_id ? '4px solid #10b981' : 'none'  // Green left border if assigned
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: 8 }}>
                    <span style={{ fontWeight: 'bold', fontSize: '16px', color: "#1f2937" }}>
                      {getOrderNumber(order)}
                    </span>
                    {/* ✅ GPS Badge */}
                    {!hasGPS ? (
                      <span style={{
                        fontSize: '11px',
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                      }}>
                        ⚠️ No GPS
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '11px',
                        backgroundColor: '#d1fae5',
                        color: '#065f46',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: 'bold',
                      }}>
                        📍 GPS
                      </span>
                    )}
                    <div style={{ backgroundColor: statusInfo.color, color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                      {statusInfo.text}
                    </div>
                  </div>
                  {/* ✅ Address with GPS warning */}
                  <div style={{ fontSize: '13px', color: '#1f2937', marginTop: '4px' }}>
                    📍 {order.address || 'No address'}
                    {!hasGPS && (
                      <span style={{ color: '#dc2626', fontWeight: 'bold', marginRight: '8px' }}>
                        (GPS سيضاف من السائق)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: '#1f2937', marginTop: '4px' }}>
                    📞 {order.phone}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '8px', color: '#1f2937' }}>
                    💰 {order.total} ج.م
                  </div>

                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowAssignModal(true);
                    }}
                    disabled={!!order.driver_id}  // ✅ Only disable if already assigned
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: order.driver_id ? '#10b981' : '#3b82f6',  // Always blue if not assigned
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: order.driver_id ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                      marginTop: '8px',
                      fontSize: '13px',
                    }}
                  >
                    {order.driver_id
                      ? `🏍️ ${assignedDriver?.driver_name || `السائق #${order.driver_id}`}`
                      : 'تعيين سائق'}
                  </button>


                </div>
              );

            })}
        </div>

        {/* Map - Much Bigger */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <MapContainer
            center={[30.0444, 31.2357]}
            zoom={12}
            style={{ height: '100%', width: '100%', borderRadius: '12px' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* ✅ Driver Markers inside MapContainer */}
            {Object.values(activeDrivers)
              .filter((d: Driver) => isValidLatLng(d.driver_lat, d.driver_lng))
              .map((driver: Driver) => (
                <Marker
                  key={`driver-${driver.driver_id}`}
                  position={[driver.driver_lat, driver.driver_lng]}
                  icon={createDriverIconWithCount(driver.active_orders_count || 0)}
                >
                  <Popup>
                    <div style={{ textAlign: 'right', minWidth: '220px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8, color: '#1f2937' }}>
                        {driver.driver_name || driver.driver_id}
                      </div>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>{driver.driver_phone}</div>
                      <div style={{ fontSize: 13, marginBottom: 4 }}>{driver.vehicle_type}</div>
                      {driver.license_plate && (
                        <div style={{ fontSize: 13, marginBottom: 8 }}>{driver.license_plate}</div>
                      )}

                      {/* Order count badge */}
                      <div style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        backgroundColor: (driver.active_orders_count || 0) > 0 ? '#fef3c7' : '#d1fae5',
                        color: (driver.active_orders_count || 0) > 0 ? '#92400e' : '#065f46',
                        fontSize: 13,
                        fontWeight: 'bold',
                        marginBottom: 8
                      }}>
                        {(driver.active_orders_count || 0) > 0
                          ? `${driver.active_orders_count} طلبات نشطة`
                          : 'متاح'}
                      </div>

                      {/* List of assigned orders */}
                      {driver.assigned_orders && driver.assigned_orders.length > 0 && (
                        <div style={{ marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
                          <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>الطلبات:</div>
                          {driver.assigned_orders.map((order, idx) => (
                            <div key={order.order_id} style={{
                              fontSize: 11,
                              padding: '4px 8px',
                              backgroundColor: '#f9fafb',
                              borderRadius: '4px',
                              marginBottom: '4px'
                            }}>
                              {idx + 1}. {order.order_no} - {order.customer_name}
                              <div style={{ color: '#6b7280' }}>{order.total} ج.م</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>


              ))}

            {/* ✅ Order/Customer Markers with Clustering (inside MapContainer) */}
            <MarkerClusterGroup
              iconCreateFunction={createClusterCustomIcon}
              spiderfyOnEveryZoom={true}
              chunkedLoading={true}
            >
              {orders
                .filter(hasRealGPS)
                .map(order => (

                  <Marker
                    key={`order-${order.id}`}
                    position={[Number(order.latitude), Number(order.longitude)]}
                    icon={order.driver_id ? assignedCustomerIcon : customerIcon}  // ✅ Green if assigned, red if not
                  >

                    <Popup>
                      <div style={{ textAlign: 'right', minWidth: '200px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px' }}>
                          {getOrderNumber(order)}
                        </div>
                        <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                          👤 {order.customer_name}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                          📍 {order.address || 'No address'}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                          📞 {order.phone}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', marginTop: '8px' }}>
                          💰 {order.total} ج.م
                        </div>
                        {order.driver_id && (
                          <div style={{ marginTop: '8px', padding: '6px', backgroundColor: '#d1fae5', borderRadius: '6px', fontSize: '12px' }}>
                            🏍️ {activeDrivers[order.driver_id]?.driver_name || `السائق #${order.driver_id}`}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
            </MarkerClusterGroup>
          </MapContainer>
        </div>


        {/* Active Drivers Sidebar - Narrower */}
        <div style={{ width: '240px', overflowY: 'auto' }}>
          <h3 style={{ color: '#ffffffff', marginBottom: '12px' }}>
            سائقين نشطين ({Object.keys(activeDrivers).length})
          </h3>
          {Object.values(activeDrivers).map((driver: Driver) => {
            const ordersCount = driver.active_orders_count || 0;
            const statusColor = ordersCount > 0 ? '#f59e0b' : '#10b981';

            return (
              <div
                key={driver.driver_id}
                style={{
                  padding: '14px',
                  backgroundColor: 'white',
                  borderRadius: '10px',
                  marginBottom: '12px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                  border: `2px solid ${statusColor}`,
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 'bold', marginBottom: 6, color: '#1f2937' }}>
                  {driver.driver_name || driver.driver_id}
                </div>

                {/* Badge with order count */}
                <div style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: statusColor,
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 'bold',
                  display: 'inline-block',
                  marginBottom: 8
                }}>
                  {ordersCount > 0 ? `${ordersCount} طلبات` : 'متاح'}
                </div>

                {/* List of assigned orders */}
                {driver.assigned_orders && driver.assigned_orders.length > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>
                    {driver.assigned_orders.map((order, idx) => (
                      <div key={order.order_id} style={{
                        fontSize: 11,
                        color: '#6b7280',
                        marginBottom: '3px'
                      }}>
                        • {order.order_no} - {order.customer_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

        </div>
      </div>

      {/* Assign Driver Modal - Same as before */}
      {
        showAssignModal && (
          <div
            onClick={() => setShowAssignModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'white',
                padding: '32px',
                borderRadius: '16px',
                maxWidth: '500px',
                width: '90%',
              }}
            >
              <h2 style={{ marginBottom: '24px', color: '#1f2937' }}>
                تعيين سائق للطلب {selectedOrder ? getOrderNumber(selectedOrder) : ''}
              </h2>


              {Object.keys(activeDrivers).length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '8px', fontWeight: 'bold' }}>
                  ⚠️ لا يوجد سائقين متاحين حاليًا
                </div>

              ) : (
                <div>
                  {Object.values(activeDrivers)
                    .sort((a: Driver, b: Driver) => (a.active_orders_count || 0) - (b.active_orders_count || 0))
                    .map((driver: Driver) => (
                      <div
                        key={driver.driver_id}
                        onClick={() => setSelectedDriverId(driver.driver_id)}
                        style={{
                          padding: '16px',
                          marginBottom: '10px',
                          border: selectedDriverId === driver.driver_id ? '2px solid #10b981' : '2px solid #e5e7eb',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          backgroundColor: selectedDriverId === driver.driver_id ? '#f0fdf4' : 'white',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1f2937' }}>
                              {driver.driver_name}
                            </div>
                            <div style={{
                              fontSize: '13px',
                              color: (driver.active_orders_count || 0) > 0 ? '#f59e0b' : '#10b981',
                              marginTop: '4px'
                            }}>
                              {(driver.active_orders_count || 0) > 0
                                ? `مشغول - ${driver.active_orders_count} طلبات نشطة`
                                : 'متاح'}
                            </div>
                          </div>

                          {/* Badge with order count */}
                          {(driver.active_orders_count || 0) > 0 && (
                            <div style={{
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              padding: '6px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                            }}>
                              {driver.active_orders_count}
                            </div>
                          )}
                        </div>
                      </div>

                    ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                {/* 🔍 DEBUG BUTTON - Remove after testing */}
                <button
                  onClick={() => {
                    console.log('=== ALL ORDERS DEBUG ===');
                    orders.forEach(o => {
                      console.log(`Order ${o.order_no || o.id}:`, {
                        hasGPS: !!(o.latitude && o.longitude),
                        lat: o.latitude,
                        lng: o.longitude,
                        isFallback: (o.latitude === 24.7136 && o.longitude === 46.6753)
                      });
                    });
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#8b5cf6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    marginBottom: '16px',
                    fontWeight: 'bold'
                  }}
                >
                  🔍 Check GPS Data
                </button>

                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedDriverId('');
                  }}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: '2px solid #e5e7eb',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: '#1f2937',
                  }}
                >
                  إلغاء
                </button>
                <button
                  onClick={handleAssignDriver}
                  disabled={!selectedDriverId}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: selectedDriverId ? '#10b981' : '#d1d5db',
                    color: 'white',
                    cursor: selectedDriverId ? 'pointer' : 'not-allowed',
                    fontSize: '16px',
                    fontWeight: 'bold',
                  }}
                >
                  تعيين سائق
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );

};

export default DeliveryScreen;

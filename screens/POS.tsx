import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../utils/api';

import {
  MenuItem,
  OrderItem,
  NoteOption,
  SalesCenter,
  Hall,
  Table,
  Customer,
  CustomerLocation,
  Order,
} from '../types';

import { menu as menuApi, orders as ordersApi, customers as customersApi, halls as hallsApi, zones as zonesApi, noteOptions as noteOptionsApi } from '../utils/api';
import { NotesIcon, TrashIcon, PlusCircleIcon, HomeIcon, DeliveryIcon, PosIcon, TableIcon, XIcon } from '../components/icons';

import { settings as settingsApi } from '../utils/api'; // Import settings API
import { printKitchenReceipt } from '../utils/printReports'; // Import kitchen printer
import { buildCustomerReceiptHTML, openAndPrint } from '../utils/receiptPrint';

const DEFAULT_TAX_RATE = 0.14;
const DEFAULT_SERVICE_CHARGE_RATE = 0.12;
const DELIVERY_FEE = 25.00;

// Helper function to calculate total of items in order
const itemsTotal = (items: OrderItem[]): number => {
  return items.reduce((sum, item) => {
    const modifiersTotal = (item.selectedNoteOptions || []).reduce((s, n) => s + Number(n.price), 0);
    return sum + ((Number(item.price) + modifiersTotal) * item.quantity);
  }, 0);
};

// Returns the best default sales center based on which ones are enabled
// Priority: Takeaway → DineIn → Delivery → null
const getDefaultSalesCenter = (enabled: { dineIn: boolean; takeaway: boolean; delivery: boolean }): SalesCenter | null => {
  if (enabled.takeaway) return SalesCenter.Takeaway;
  if (enabled.dineIn) return SalesCenter.DineIn;
  if (enabled.delivery) return SalesCenter.Delivery;
  return null;
};

interface POSProps {
  navigateToDashboard: () => void;
  orderToEdit: Order | null;
  onOrderUpdated: () => void;
  tables: Table[];
  parkedOrders: Record<number, OrderItem[]>;
  updateTables: (tables: Table[]) => void;
  updateParkedOrders: (orders: Record<number, OrderItem[]>) => void;
}

const POS: React.FC<POSProps> = ({ navigateToDashboard, orderToEdit, onOrderUpdated, tables, parkedOrders, updateTables, updateParkedOrders }) => {
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
  // Default to Takeaway immediately — fetchSettings will correct if it's disabled
  const [activeSalesCenter, setActiveSalesCenter] = useState<SalesCenter | null>(SalesCenter.Takeaway);
  const [selectedMainGroupId, setSelectedMainGroupId] = useState<number | null>(null);
  const [selectedSubGroupId, setSelectedSubGroupId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null); // ✅ ADD THIS

  const [isTableModalOpen, setTableModalOpen] = useState(false);
  const [selectedHall, setSelectedHall] = useState<Hall | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isCustomerModalOpen, setCustomerModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<CustomerLocation | null>(null);
  const [isLocationModalOpen, setLocationModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [itemNotesModal, setItemNotesModal] = useState<{ item: OrderItem, isOpen: boolean } | null>(null);
  const [isAddLocationModalOpen, setAddLocationModalOpen] = useState(false);
  const [isEditCustomerModalOpen, setEditCustomerModalOpen] = useState(false);
  const [showCustomerOrders, setShowCustomerOrders] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loadingCustomerOrders, setLoadingCustomerOrders] = useState(false);

  // Backend data state
  const [mainGroups, setMainGroups] = useState<any[]>([]);
  const [subGroups, setSubGroups] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]); // ✅ RENAME from allCategories
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);

  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [mockHalls, setMockHalls] = useState<Hall[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]); // Replace mockHalls
  const [allTables, setAllTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<any[]>([]); // Add this
  const [selectedZone, setSelectedZone] = useState<any>(null); // Add this
  const [allNoteOptions, setAllNoteOptions] = useState<NoteOption[]>([]);

  // Dynamic Settings
  const [taxRate, setTaxRate] = useState(DEFAULT_TAX_RATE);
  const [serviceChargeRate, setServiceChargeRate] = useState(DEFAULT_SERVICE_CHARGE_RATE);
  /** Named Windows printer for customer receipts (empty = OS default) */
  const [receiptPrinterName, setReceiptPrinterName] = useState('');
  /** Named Windows printer for kitchen tickets (empty = OS default) */
  const [kitchenPrinterName, setKitchenPrinterName] = useState('');

  // Sales Center enabled flags (loaded from settings)
  const [enabledCenters, setEnabledCenters] = useState({ dineIn: true, takeaway: true, delivery: true });

  const [currentQuantity, setCurrentQuantity] = useState<string>('1');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null); // ADD THIS


  // Fetch menu and customers from backend
  useEffect(() => {
    fetchMenuData();
    fetchHallsAndTables();
    fetchCustomers();
    fetchSettings();

    // Fetch Zones
    const fetchZonesList = async () => {
      try {
        const res = await zonesApi.getAll();
        if (res.data.success) {
          setZones(res.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch zones", error);
      }
    };
    fetchZonesList();

    // Fetch global note options
    const fetchNoteOptions = async () => {
      try {
        const res = await noteOptionsApi.getAll();
        if (res.data.success) {
          setAllNoteOptions(res.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch note options", error);
      }
    };
    fetchNoteOptions();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await settingsApi.getAll();
      if (response.data.success) {
        const data = response.data.data;
        if (data.tax_rate) setTaxRate(parseFloat(data.tax_rate) / 100);
        if (data.service_charge) setServiceChargeRate(parseFloat(data.service_charge) / 100);
        if (data.receipt_printer !== undefined) setReceiptPrinterName(data.receipt_printer ?? '');
        if (data.kitchen_printer !== undefined) setKitchenPrinterName(data.kitchen_printer ?? '');
        const newEnabled = {
          dineIn: data.enable_dine_in === undefined ? true : data.enable_dine_in === 'true',
          takeaway: data.enable_takeaway === undefined ? true : data.enable_takeaway === 'true',
          delivery: data.enable_delivery === undefined ? true : data.enable_delivery === 'true',
        };
        setEnabledCenters(newEnabled);
        // Only change the center if the current one is disabled
        setActiveSalesCenter(prev => {
          const stillEnabled = {
            [SalesCenter.DineIn]: newEnabled.dineIn,
            [SalesCenter.Takeaway]: newEnabled.takeaway,
            [SalesCenter.Delivery]: newEnabled.delivery,
          };
          // Current center is valid — keep it (sticky)
          if (prev && stillEnabled[prev]) return prev;
          // Current center disabled — pick first available
          return getDefaultSalesCenter(newEnabled);
        });
      }
    } catch (error) {
      console.error("Failed to fetch settings, using defaults", error);
      // On error: pick default only if nothing selected yet
      setActiveSalesCenter(prev => prev ?? SalesCenter.Takeaway);
    }
  };

  const fetchMenuData = async () => {
    try {
      const response = await menuApi.getHierarchy(); // ✅ CHANGED from getAll()
      if (response.data.success) {
        const hierarchy = response.data.data as any[];

        // Extract all levels
        const allSubs: any[] = [];
        const allCats: any[] = [];
        const allItems: MenuItem[] = [];

        hierarchy.forEach(main => {
          // Items directly under main category
          (main.directItems || []).forEach((item: any) => {
            allItems.push({
              id: item.id,
              name: item.name,
              price: parseFloat(item.price),
              categoryId: null,
              mainCategoryId: main.id,
              subCategoryId: null,
              isAvailable: item.is_active,
              printer: item.printer || '',
              noteOptions: item.noteOptions || []
            });
          });

          main.subCategories.forEach((sub: any) => {
            allSubs.push({
              id: sub.id,
              name: sub.name,
              mainGroupId: main.id
            });

            // Items directly under sub category
            (sub.directItems || []).forEach((item: any) => {
              allItems.push({
                id: item.id,
                name: item.name,
                price: parseFloat(item.price),
                categoryId: null,
                mainCategoryId: null,
                subCategoryId: sub.id,
                isAvailable: item.is_active,
                printer: item.printer || '',
                noteOptions: item.noteOptions || []
              });
            });

            sub.categories.forEach((cat: any) => {
              allCats.push({
                id: cat.id,
                name: cat.name,
                subGroupId: sub.id
              });

              cat.items.forEach((item: any) => {
                allItems.push({
                  id: item.id,
                  name: item.name,
                  price: parseFloat(item.price),
                  categoryId: cat.id,
                  mainCategoryId: null,
                  subCategoryId: null,
                  isAvailable: item.is_active,
                  printer: item.printer || '',
                  noteOptions: item.noteOptions || []
                });
              });
            });
          });
        });

        setMainGroups(hierarchy.map((m: any) => ({ id: m.id, name: m.name })));
        setSubGroups(allSubs);
        setCategories(allCats);
        setAllMenuItems(allItems);
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to load menu:', err);
      setLoading(false);
    }
  };


  const fetchHallsAndTables = async () => {
    try {
      const token = localStorage.getItem('token');
      // Use the halls endpoint which returns nested tables
      const response = await fetch(`${API_BASE_URL}/halls`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await response.json();

      let rawHalls = [];
      if (resData.success && Array.isArray(resData.data)) {
        rawHalls = resData.data;
      } else if (Array.isArray(resData)) {
        rawHalls = resData;
      }

      console.log('Backend Halls Data:', rawHalls);

      // 1. Map Halls
      const mappedHalls = rawHalls.map((h: any) => ({
        id: h.id,
        name: h.name
      }));
      setHalls(mappedHalls);

      // 2. Map Tables correctly
      const mappedTables = rawHalls.flatMap((h: any) =>
        (h.tables || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          hallId: t.hall_id, // Match DB column name
          status: 'available' as const,
          capacity: t.capacity || 4,
        }))
      );
      setAllTables(mappedTables);

      console.log('Mapped Halls:', mappedHalls);
      console.log('Mapped Tables:', mappedTables);

      if (updateTables) updateTables(mappedTables);
    } catch (err) {
      console.error('Failed to load halls and tables:', err);
    }
  };


  const fetchCustomers = async () => {
    try {
      const response = await customersApi.getAll();
      const mapped = response.data.map((c: any) => ({
        id: c.id,
        firstName: c.first_name,
        lastName: c.last_name,
        phone: c.phone,
        lastZoneId: c.last_zone_id || null,
        lastZoneName: c.last_zone_name || null,
        locations: (c.locations || []).map((loc: any) => ({
          id: loc.id,
          locationName: loc.locationName || '',
          street: loc.street || '',
          building: loc.building || '',
          floor: loc.floor || '',
          apartment: loc.apartment || '',
          landmark: loc.landmark || '',
          latitude: loc.latitude,
          longitude: loc.longitude,
          kind: loc.kind || 'Home',
          isDefault: loc.isDefault || false,
          zoneId: loc.zone_id || loc.zoneId || null // ✅ Map zoneId
        }))
      }));
      setAllCustomers(mapped);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  useEffect(() => {
    if (orderToEdit) {
      setActiveSalesCenter(orderToEdit.salesCenter);

      // ✅ Map backend fields to frontend format
      const itemsWithLineItemId = orderToEdit.items.map((item: any) => ({
        id: item.item_id ?? item.id,
        name: item.name_snapshot ?? item.name,
        // Use base price (without modifiers) so modifiers are not double-counted
        price: parseFloat(item.price_at_order ?? item.price),
        quantity: parseFloat(item.quantity),
        categoryId: item.categoryId ?? item.category_id ?? 0,
        notes: item.notes || '',
        selectedNoteOptions: (item.selectedNoteOptions || []).map((n: any) => ({
          id: n.id,
          name: n.name,
          price: Number(n.price)
        })),
        lineItemId: `${item.id}-${Date.now()}`,
      }));
      setCurrentOrder(itemsWithLineItemId);

      if (orderToEdit.salesCenter === SalesCenter.Delivery && orderToEdit.customer) {
        setSelectedCustomer(orderToEdit.customer);
      }
      if (orderToEdit.salesCenter === SalesCenter.DineIn && orderToEdit.table) {
        setSelectedTable(orderToEdit.table);
        setSelectedHall(orderToEdit.hall || null);
      }
    }
  }, [orderToEdit]);


  const prerequisitesMet = useMemo(() => {
    if (!activeSalesCenter) return false;
    if (activeSalesCenter === SalesCenter.DineIn && !selectedTable) return false;
    if (activeSalesCenter === SalesCenter.Delivery && (!selectedCustomer || !selectedLocation)) return false;
    return true;
  }, [activeSalesCenter, selectedTable, selectedCustomer, selectedLocation]);

  const subGroupsFiltered = useMemo(() => {
    if (!selectedMainGroupId) return [];
    return subGroups.filter(sg => sg.mainGroupId === selectedMainGroupId);
  }, [selectedMainGroupId, subGroups]);

  const categoriesFiltered = useMemo(() => {
    if (!selectedSubGroupId) return [];
    return categories.filter(c => c.subGroupId === selectedSubGroupId);
  }, [selectedSubGroupId, categories]);



  const menuItems = useMemo(() => {
    // Show ALL items if no main group selected
    if (!selectedMainGroupId) {
      return allMenuItems.filter(item => item.isAvailable);
    }

    // If category selected, show only items in that category
    if (selectedCategoryId) {
      return allMenuItems.filter(item =>
        item.categoryId === selectedCategoryId && item.isAvailable
      );
    }

    // If sub selected but no category, show items in categories under that sub + direct sub items
    if (selectedSubGroupId) {
      const categoryIds = categoriesFiltered.map(c => c.id);
      return allMenuItems.filter(item =>
        item.isAvailable && (
          categoryIds.includes(item.categoryId) ||
          item.subCategoryId === selectedSubGroupId
        )
      );
    }

    // If only main selected, show all items under that main (all subs/categories + direct main items)
    const subIds = subGroupsFiltered.map(s => s.id);
    const categoryIds = categories.filter(c => subIds.includes(c.subGroupId)).map(c => c.id);
    return allMenuItems.filter(item =>
      item.isAvailable && (
        categoryIds.includes(item.categoryId) ||
        subIds.includes(item.subCategoryId) ||
        item.mainCategoryId === selectedMainGroupId
      )
    );
  }, [selectedMainGroupId, selectedSubGroupId, selectedCategoryId, categoriesFiltered, subGroupsFiltered, categories, allMenuItems]);

  // Calculate totals
  const orderTotalDetails = useMemo(() => {
    // If a zone is selected, use its fee. Otherwise default to DELIVERY_FEE (25) or 0 if not delivery.
    let currentDeliveryFee = 0;
    if (activeSalesCenter === SalesCenter.Delivery) {
      currentDeliveryFee = selectedZone ? parseFloat(selectedZone.delivery_fee) : DELIVERY_FEE;
    }

    const totals = itemsTotal(currentOrder);
    const subtotal = totals;

    // Use dynamic rates from state
    const tax = subtotal * taxRate;
    const serviceCharge = activeSalesCenter === SalesCenter.DineIn ? subtotal * serviceChargeRate : 0;

    // Total
    const total = subtotal + tax + serviceCharge + currentDeliveryFee;

    return {
      subtotal,
      tax,
      serviceCharge,
      deliveryFee: currentDeliveryFee,
      total
    };
  }, [currentOrder, activeSalesCenter, selectedZone, taxRate, serviceChargeRate]);

  const { subtotal, tax: taxAmount, serviceCharge, deliveryFee, total: orderTotal } = orderTotalDetails;

  // ─── Customer Receipt ────────────────────────────────────────────────────

  const salesCenterLabel = (center: SalesCenter | string): string => {
    const map: Record<string, string> = {
      [SalesCenter.DineIn]: 'صالة',
      [SalesCenter.Takeaway]: 'سفري',
      [SalesCenter.Delivery]: 'توصيل',
      DineIn: 'صالة',
      Takeaway: 'سفري',
      Delivery: 'توصيل',
    };
    return map[center] || String(center);
  };

  const paymentLabel = (method: string): string =>
    method === 'card' ? 'بطاقة' : 'نقدي';

  const printCustomerReceipt = (
    orderNumber: string | number,
    createdAt: Date,
    salesCenterValue: SalesCenter | string,
  ) => {
    const resolvedName =
      selectedCustomer
        ? `${selectedCustomer.firstName || ''} ${selectedCustomer.lastName || ''}`.trim()
        : undefined;

    const lineItems = currentOrder.map(item => {
      const qty = Number(item.quantity) || 0;
      const base = Number(item.price) || 0;
      const optsTotal = (item.selectedNoteOptions || []).reduce(
        (s, o) => s + Number(o.price || 0),
        0,
      );
      return {
        name: item.name,
        quantity: qty,
        lineTotal: (base + optsTotal) * qty,
        // Pass note options as an array so the receipt builder renders each on its own row
        noteOptions: (item.selectedNoteOptions || []).map(o => ({
          name: o.name,
          price: Number(o.price) || 0,
        })),
        notes: item.notes || undefined,
      };
    });

    // Build a complete address string from CustomerLocation parts
    const buildAddress = (): string | undefined => {
      if (!selectedLocation) return undefined;
      const parts = [
        selectedLocation.street,
        selectedLocation.building,
        selectedLocation.floor ? `طابق ${selectedLocation.floor}` : '',
        selectedLocation.apartment ? `شقة ${selectedLocation.apartment}` : '',
        selectedLocation.landmark,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join('، ') : undefined;
    };

    const html = buildCustomerReceiptHTML({
      orderNumber,
      createdAt,
      salesCenterLabel: salesCenterLabel(salesCenterValue),
      tableNumber: selectedTable?.name,
      hallName: selectedHall?.name,
      paymentLabel: paymentLabel(paymentMethod),
      items: lineItems,
      subtotal,
      tax: taxAmount,
      deliveryFee,
      serviceCharge,
      total: orderTotal,
      customerName: resolvedName,
      customerPhone: selectedCustomer?.phone,
      customerAddress: buildAddress(),
    });
    openAndPrint(html, receiptPrinterName, 'receipt');
  };

  /**
   * Groups currentOrder items by their assigned printer name,
   * then prints a separate kitchen ticket for each printer group.
   * Items with no printer assigned fall back to kitchenPrinterName.
   */
  const printGroupedKitchenTickets = (params: {
    orderNumber: string;
    orderType: 'DineIn' | 'Takeaway' | 'Delivery';
    tableNumber?: string;
    customerName?: string;
    customerPhone?: string;
    items: OrderItem[];
    createdAt: Date;
    isUpdate?: boolean;
    originalOrderNumber?: string;
    version?: number;
  }) => {
    const formatItem = (item: OrderItem) => {
      const optLines = (item.selectedNoteOptions || [])
        .map(o => `✓ ${o.name}${Number(o.price) > 0 ? ` (+${Number(o.price).toFixed(2)})` : ''}`);
      const noteLines = item.notes ? [item.notes] : [];
      const combined = [...optLines, ...noteLines].join(' | ');
      return { name: item.name, quantity: item.quantity, notes: combined || undefined };
    };

    // Group by printer field; items with no printer go to '__default__'
    const groups = new Map<string, OrderItem[]>();
    for (const item of params.items) {
      const key = (item.printer && item.printer.trim()) ? item.printer.trim() : '__default__';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }

    // Print one ticket per printer group
    for (const [key, groupItems] of groups) {
      const printerName = key === '__default__' ? kitchenPrinterName : key;
      printKitchenReceipt({
        orderNumber: params.orderNumber,
        orderType: params.orderType,
        tableNumber: params.tableNumber,
        customerName: params.customerName,
        customerPhone: params.customerPhone,
        items: groupItems.map(formatItem),
        createdAt: params.createdAt,
        isUpdate: params.isUpdate,
        originalOrderNumber: params.originalOrderNumber,
        version: params.version,
        printerName,
      });
    }
  };

  const resetOrderState = useCallback(() => {
    setCurrentOrder([]);
    setSelectedCustomer(null);
    setSelectedLocation(null);
    setSelectedTable(null);
    setSelectedHall(null);
    setSelectedZone(null);
    // Do NOT reset activeSalesCenter — keep the center the cashier last used
    if (orderToEdit) {
      onOrderUpdated();
    }
  }, [orderToEdit, onOrderUpdated]);

  const handleSelectSalesCenter = (center: SalesCenter) => {
    if (orderToEdit) return;
    const centerEnabled = {
      [SalesCenter.DineIn]: enabledCenters.dineIn,
      [SalesCenter.Takeaway]: enabledCenters.takeaway,
      [SalesCenter.Delivery]: enabledCenters.delivery,
    };
    if (!centerEnabled[center]) return;

    // If clicking the same center, just open its modal if applicable
    if (activeSalesCenter === center) {
      if (center === SalesCenter.DineIn) setTableModalOpen(true);
      if (center === SalesCenter.Delivery) setCustomerModalOpen(true);
      return;
    }

    if (currentOrder.length > 0 && !window.confirm("هل أنت متأكد من تغيير مركز البيع؟ سيتم حذف الطلب الحالي.")) return;
    resetOrderState();
    setActiveSalesCenter(center);
    if (center === SalesCenter.DineIn) setTableModalOpen(true);
    if (center === SalesCenter.Delivery) setCustomerModalOpen(true);
  };

  const handleSelectTable = (table: Table) => {
    if (selectedTable && currentOrder.length > 0 && selectedTable.id !== table.id) {
      updateParkedOrders({ ...parkedOrders, [selectedTable.id]: currentOrder });
    } else if (selectedTable && selectedTable.id === table.id) {
      setTableModalOpen(false);
      return;
    }

    setSelectedTable(table);
    setTableModalOpen(false);

    if (parkedOrders[table.id]) {
      setCurrentOrder(parkedOrders[table.id]);
    } else {
      setCurrentOrder([]);
    }

    // Ensure hall search works with both number and string IDs
    const hall = halls.find(h => String(h.id) === String(table.hallId));
    setSelectedHall(hall || null);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerModalOpen(false);
    setShowCustomerOrders(false);
    setCustomerOrders([]);

    // ✅ Auto-select location logic
    if (customer.locations && customer.locations.length > 0) {
      // Find default or use first
      const defaultLoc = customer.locations.find(l => l.isDefault) || customer.locations[0];
      setSelectedLocation(defaultLoc);

      // We do NOT open the location modal, it's automatic now.
      // setLocationModalOpen(true); 
    } else {
      // If no locations, prompt to add one
      const shouldAdd = window.confirm('هذا العميل ليس لديه عناوين. هل تريد إضافة عنوان جديد؟');
      if (shouldAdd) {
        setAddLocationModalOpen(true);
      }
    }
  };

  const fetchCustomerOrders = async (customerId: number) => {
    setLoadingCustomerOrders(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders?customerId=${customerId}&limit=15`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setCustomerOrders(Array.isArray(data) ? data : []);
    } catch {
      setCustomerOrders([]);
    } finally {
      setLoadingCustomerOrders(false);
    }
  };

  const handleSaveEditedCustomer = (updatedCustomer: Customer) => {
    setSelectedCustomer(updatedCustomer);
    setAllCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
    if (selectedLocation) {
      const updatedLoc = updatedCustomer.locations.find(l => l.id === selectedLocation.id);
      if (updatedLoc) setSelectedLocation(updatedLoc);
    }
    setEditCustomerModalOpen(false);
  };

  // Auto-select Zone based on Location or last-used zone for customer
  // Depends on IDs only — so manually changing the dropdown won't re-trigger this
  useEffect(() => {
    if (zones.length === 0) return;

    // Priority 1: location has an assigned zone
    if (selectedLocation?.zoneId) {
      const zone = zones.find(z => Number(z.id) === Number(selectedLocation.zoneId));
      if (zone) {
        setSelectedZone(zone);
        return;
      }
    }

    // Priority 2: last delivery zone saved in DB for this customer
    if (selectedCustomer?.lastZoneId) {
      const savedZone = zones.find(z => Number(z.id) === Number(selectedCustomer.lastZoneId));
      if (savedZone) {
        setSelectedZone(savedZone);
        return;
      }
    }
    // Use IDs as dependencies so the effect only re-runs when a different customer/location is selected,
    // NOT when lastZoneId property changes on the same customer object
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation?.id, selectedCustomer?.id, zones]);

  const handleAddItem = (item: MenuItem) => {
    if (!orderToEdit && !prerequisitesMet) {
      alert('يرجى اختيار طاولة أو عميل أولاً');
      return;
    }

    // ✅ Quantity First Workflow: Add immediately using currentQuantity
    const qty = parseInt(currentQuantity) || 1;

    // Check if item exists (without notes)
    const existingItem = currentOrder.find(
      (orderItem) => orderItem.id === item.id && !orderItem.notes
    );

    if (existingItem) {
      setCurrentOrder(
        currentOrder.map((orderItem) =>
          orderItem.lineItemId === existingItem.lineItemId
            ? { ...orderItem, quantity: orderItem.quantity + qty }
            : orderItem
        )
      );
    } else {
      const newItem: OrderItem = {
        ...item, // ID from menu item
        quantity: qty,
        lineItemId: `${item.id}-${Date.now()}`,
        name: item.name,
        price: item.price,
        notes: ''
      };
      setCurrentOrder((prev) => [...prev, newItem]);
    }

    // Reset Quantity after adding
    setCurrentQuantity('1');
    setSelectedItem(null); // Ensure no item stays selected
  };

  const handleConfirmSelection = useCallback(() => {
    if (!selectedItem) return;

    const qty = parseInt(currentQuantity) || 1;
    const existingItem = currentOrder.find(
      (orderItem) => orderItem.id === selectedItem.id && !orderItem.notes
    );

    if (existingItem) {
      setCurrentOrder(
        currentOrder.map((orderItem) =>
          orderItem.lineItemId === existingItem.lineItemId
            ? { ...orderItem, quantity: orderItem.quantity + qty }
            : orderItem
        )
      );
    } else {
      const newItem: OrderItem = {
        ...selectedItem,
        quantity: qty,
        lineItemId: `${selectedItem.id}-${Date.now()}`,
      };
      setCurrentOrder((prev) => [...prev, newItem]);
    }

    // Reset after adding
    setSelectedItem(null);
    setCurrentQuantity('1');
  }, [selectedItem, currentQuantity, currentOrder]);

  // Physical keyboard support for quantity
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only block if typing in input fields INSIDE modals or other forms
      // But allow keyboard input when just on the POS screen
      const target = e.target as HTMLElement;

      // If typing in a modal input/textarea, ignore
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        return;
      }

      // Number keys (0-9)
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault(); // Prevent default browser behavior
        setCurrentQuantity((prev) => {
          const newQty = prev === '1' ? e.key : prev + e.key;
          return newQty.slice(0, 3); // Max 3 digits (999)
        });
      }

      // Backspace
      if (e.key === 'Backspace') {
        e.preventDefault();
        setCurrentQuantity((prev) => (prev.length > 1 ? prev.slice(0, -1) : '1'));
      }

      // C key to clear
      if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setCurrentQuantity('1');
      }

      // Enter key to confirm selection
      if (e.key === 'Enter' && selectedItem) {
        e.preventDefault();
        handleConfirmSelection();
      }

      // Escape to cancel selection
      if (e.key === 'Escape' && selectedItem) {
        e.preventDefault();
        setSelectedItem(null);
        setCurrentQuantity('1');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedItem, handleConfirmSelection]);


  const handleUpdateQuantity = (lineItemId: string, change: number) => {
    setCurrentOrder(currentOrder.map(item => {
      if (item.lineItemId === lineItemId) {
        const newQuantity = item.quantity + change;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
      }
      return item;
    }).filter(Boolean) as OrderItem[]);
  };

  const handleRemoveItem = (lineItemId: string) => {
    setCurrentOrder(currentOrder.filter(item => item.lineItemId !== lineItemId));
  };

  const handleUpdateNotes = (lineItemId: string, notes: string, selectedNoteOptions: NoteOption[] = []) => {
    setCurrentOrder(currentOrder.map(item =>
      item.lineItemId === lineItemId ? { ...item, notes, selectedNoteOptions } : item
    ));
    setItemNotesModal(null);
  };

  const handleSendToKitchen = async () => {
    if (!selectedTable) return;

    try {
      // 1. Persist order to backend
      const orderData = {
        salesCenter: 'DineIn',
        customerId: null,
        driverId: null,
        hallId: selectedHall?.id || null,
        tableId: selectedTable.id,
        items: currentOrder.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          notes: item.notes || '',
          selectedNoteOptions: item.selectedNoteOptions || []
        })),
        paymentMethod: 'cash', // Default or allow selection later
        deliveryFee: 0
      };

      const response = await ordersApi.create(orderData);

      if (response.data.success) {
        const orderId = response.data.data.user_facing_id;

        // ✅ Print Kitchen Receipt (grouped by item printer)
        printGroupedKitchenTickets({
          orderNumber: orderId,
          orderType: 'DineIn',
          tableNumber: `${selectedHall?.name} - ${selectedTable.name}`,
          items: currentOrder,
          createdAt: new Date(),
        });

        // ✅ Show Order Number Modal
        updateParkedOrders({ ...parkedOrders, [selectedTable.id]: currentOrder });
        updateTables(tables.map(t => t.id === selectedTable.id ? { ...t, status: 'occupied' as const } : t));

        // Reset immediately without modal
        resetOrderState();
        setActiveSalesCenter(SalesCenter.DineIn);
        setTableModalOpen(true);

      }
    } catch (error: any) {
      console.error('Send to kitchen failed:', error);
      alert('فشل إرسال الطلب للمطبخ: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleFinalizeOrder = async () => {
    if (currentOrder.length === 0) return alert("الطلب فارغ!");
    if (activeSalesCenter === SalesCenter.Delivery) {
      if (!selectedLocation) {
        alert('⚠️ يرجى اختيار عنوان التوصيل');
        return;
      }
      if (!selectedLocation.latitude || !selectedLocation.longitude) {
        const confirmed = window.confirm(
          '⚠️ هذا عنوان جديد بدون GPS\n\n' +
          'سيتم إنشاء الطلب بالعنوان النصي فقط.\n' +
          'السائق سيحدد الموقع تلقائياً عند الوصول للعميل.\n\n' +
          'هل تريد المتابعة؟'
        );

        if (!confirmed) {
          setLocationModalOpen(true); // Reopen location picker
          return;
        }
        // ✅ If confirmed, continue creating the order below
      }

    }

    try {
      const salesCenterMap: Record<SalesCenter, string> = {
        [SalesCenter.DineIn]: 'DineIn',
        [SalesCenter.Takeaway]: 'Takeaway',
        [SalesCenter.Delivery]: 'Delivery'
      };
      const orderData = {
        salesCenter: salesCenterMap[activeSalesCenter!],
        customerId: selectedCustomer?.id || null,
        customerLocationId: selectedLocation?.id || null,
        driverId: null,
        hallId: selectedHall?.id || null,
        tableId: selectedTable?.id || null,
        items: currentOrder.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          notes: item.notes || '',
          selectedNoteOptions: item.selectedNoteOptions || []
        })),
        paymentMethod: paymentMethod,
        deliveryFee: deliveryFee
      };
      const response = await ordersApi.create(orderData);
      if (response.data.success) {
        const orderId = response.data.data.user_facing_id;
        const createdAt = response.data.data?.created_at ? new Date(response.data.data.created_at) : new Date();

        // ✅ Print Kitchen Receipt (grouped by item printer)
        printGroupedKitchenTickets({
          orderNumber: orderId,
          orderType: salesCenterMap[activeSalesCenter!] as 'DineIn' | 'Takeaway' | 'Delivery',
          tableNumber: selectedTable ? `${selectedHall?.name} - ${selectedTable.name}` : undefined,
          customerName: selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : undefined,
          customerPhone: selectedCustomer?.phone,
          items: currentOrder,
          createdAt,
        });

        // ✅ Print Customer Receipt
        printCustomerReceipt(orderId, createdAt, salesCenterMap[activeSalesCenter!]);

        // Save zone: update the location's zone_id (primary) + customer last_zone (fallback)
        if (activeSalesCenter === SalesCenter.Delivery && selectedCustomer && selectedLocation && selectedZone) {
          const custId = selectedCustomer.id;
          const locId = selectedLocation.id;
          const zone = selectedZone;

          Promise.all([
            customersApi.updateLocationZone(custId, locId, zone.id),
            customersApi.updateLastZone(custId, zone.id),
          ]).then(() => {
            // Update in-memory allCustomers so next pick of this customer/location is pre-filled
            setAllCustomers(prev => prev.map(c => {
              if (c.id !== custId) return c;
              return {
                ...c,
                lastZoneId: zone.id,
                lastZoneName: zone.name,
                locations: c.locations.map(loc =>
                  loc.id === locId ? { ...loc, zoneId: zone.id } : loc
                ),
              };
            }));
          }).catch(e => console.error('Failed to save zone:', e));
        }

        // Reset immediately without modal
        if (activeSalesCenter === SalesCenter.DineIn && selectedTable) {
          const newParked = { ...parkedOrders };
          delete newParked[selectedTable.id];
          updateParkedOrders(newParked);
          updateTables(tables.map(t => t.id === selectedTable.id ? { ...t, status: 'available' as const } : t));
        }

        resetOrderState();

      }
    } catch (error: any) {
      console.error('Order creation failed:', error);
      alert('فشل إنشاء الطلب: ' + (error.response?.data?.error || 'خطأ غير معروف'));
    }
  };

  const handleDineInPayment = async () => {
    if (!selectedTable) return;
    await handleFinalizeOrder();
  };

  const handleUpdateOrder = async () => {
    if (!orderToEdit) return;

    console.log('🔍 Order Data:', {
      id: orderToEdit.id,
      orderNo: orderToEdit.orderNo,
      userfacingid: orderToEdit.userfacingid,
      userFacingId: (orderToEdit as any).userFacingId,
      fullObject: orderToEdit
    });

    try {
      const salesCenterMap: Record<SalesCenter, string> = {
        [SalesCenter.DineIn]: 'DineIn',
        [SalesCenter.Takeaway]: 'Takeaway',
        [SalesCenter.Delivery]: 'Delivery',
      };

      // ✅ Use activeSalesCenter first, then fallback to orderToEdit
      const salesCenterValue = activeSalesCenter || orderToEdit.salesCenter;

      // ✅ Add debug log
      console.log('🔍 Sales Center Debug:', {
        activeSalesCenter,
        orderToEditSalesCenter: orderToEdit.salesCenter,
        finalValue: salesCenterValue,
        mapped: salesCenterMap[salesCenterValue as SalesCenter]
      });

      const response = await ordersApi.update(orderToEdit.id, {
        salesCenter: salesCenterMap[salesCenterValue as SalesCenter] || 'DineIn',
        customerId: selectedCustomer?.id || orderToEdit.customer?.id || null,  // ✅ Keep original
        customerLocationId: selectedLocation?.id || orderToEdit.customerLocationId || null,  // ✅ Keep original
        driverId: null,
        hallId: selectedHall?.id || orderToEdit.hall?.id || null,  // ✅ Keep original
        tableId: selectedTable?.id || orderToEdit.table?.id || null,  // ✅ Keep original
        items: currentOrder.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          notes: item.notes || '',
          selectedNoteOptions: item.selectedNoteOptions || []
        })),
        paymentMethod: paymentMethod,
        deliveryFee: deliveryFee
      });


      // ✅✅✅ GET VERSION NUMBER ✅✅✅
      const newVersion = response.data.data?.version || 2;
      console.log('📦 New Version:', newVersion);

      const updatedOrderNumber =
        (orderToEdit as any).userFacingId ||
        (orderToEdit as any).userfacingid ||
        orderToEdit.orderNo ||
        `ORD-${orderToEdit.id}`;
      const updatedCreatedAt = response.data.data?.created_at
        ? new Date(response.data.data.created_at)
        : new Date();

      // Print Kitchen Receipt (grouped by item printer)
      printGroupedKitchenTickets({
        orderNumber: orderToEdit.orderNo || `ORD-${orderToEdit.id}`,
        orderType: (salesCenterMap[salesCenterValue as SalesCenter] || 'DineIn') as 'DineIn' | 'Takeaway' | 'Delivery',
        tableNumber: selectedTable ? `${selectedHall?.name} - ${selectedTable.name}` : undefined,
        customerName: selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : undefined,
        customerPhone: selectedCustomer?.phone,
        items: currentOrder,
        createdAt: updatedCreatedAt,
        isUpdate: true,
        originalOrderNumber: updatedOrderNumber,
        version: newVersion,
      });

      printCustomerReceipt(
        updatedOrderNumber,
        updatedCreatedAt,
        salesCenterMap[salesCenterValue as SalesCenter] || 'DineIn'
      );

      alert('✅ تم تحديث الطلب بنجاح!');

      // Clear parked order if it's dine-in
      if (orderToEdit.salesCenter === SalesCenter.DineIn && selectedTable) {
        const newParked = { ...parkedOrders };
        delete newParked[selectedTable.id];
        updateParkedOrders(newParked);
      }

      resetOrderState();
      navigateToDashboard();
    } catch (error: any) {
      console.error('Order update failed:', error);
      alert(error.response?.data?.error || 'فشل تحديث الطلب');
    }
  };


  const handleNavigateHome = () => {
    if (orderToEdit) {
      onOrderUpdated();
    }
    navigateToDashboard();
  };

  const renderActionButtons = () => {
    if (orderToEdit) {
      return (
        <button onClick={handleUpdateOrder} className="col-span-2 px-4 py-3 bg-blue-600 dark:bg-amber-600 text-white rounded-lg font-bold hover:bg-blue-700 dark:hover:bg-amber-700">
          تحديث الطلب
        </button>
      );
    }
    if (activeSalesCenter === SalesCenter.DineIn) {
      if (selectedTable && parkedOrders[selectedTable.id] || currentOrder.length > 0 && selectedTable && !parkedOrders[selectedTable.id]) {
        return (
          <>
            <button onClick={handleSendToKitchen} className="px-4 py-3 bg-orange-500 dark:bg-amber-700 text-white rounded-lg font-bold hover:bg-orange-600 dark:hover:bg-amber-800">
              إرسال للمطبخ
            </button>
            <button onClick={handleDineInPayment} disabled={currentOrder.length === 0} className="px-4 py-3 bg-green-600 dark:bg-green-700 text-white rounded-lg font-bold hover:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50">
              دفع
            </button>
          </>
        );
      }
    }
    if (activeSalesCenter === SalesCenter.Takeaway || activeSalesCenter === SalesCenter.Delivery) {
      return (
        <button onClick={handleFinalizeOrder} disabled={currentOrder.length === 0 || !prerequisitesMet} className="col-span-2 px-4 py-3 bg-green-600 dark:bg-green-700 text-white rounded-lg font-bold hover:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50">
          تأكيد ودفع
        </button>
      );
    }
    return (
      <div className="col-span-2 text-center text-gray-500 dark:text-gray-400">
        اختر مركز بيع
      </div>
    );
  };

  // Modal Components (defined inside POS component)
  const TableSelectionModal: React.FC<{
    tables: Table[],
    onSelect: (t: Table) => void,
    onClose: () => void,
    halls: Hall[],
    parkedOrders: Record<number, OrderItem[]>;
  }> = ({ tables, onSelect, onClose, halls, parkedOrders }) => {
    // Start with the first hall's ID as soon as halls are available
    const [selectedHallId, setSelectedHallId] = useState<number | null>(() => {
      return halls.length > 0 ? halls[0].id : null;
    });

    // Handle halls loading after modal opens or halls changing
    useEffect(() => {
      if (selectedHallId === null && halls.length > 0) {
        setSelectedHallId(halls[0].id);
      }
    }, [halls, selectedHallId]);

    // Ensure we handle potential type differences between hall.id (number) and table.hallId (could be string from DB)
    const tablesInHall = tables.filter(t => String(t.hallId) === String(selectedHallId));

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-amber-400">اختر طاولة</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition">
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Hall Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            {halls.map(h => (
              <button
                key={h.id}
                onClick={() => setSelectedHallId(h.id)}
                className={`px-6 py-2 rounded-xl font-bold transition-all whitespace-nowrap shadow-sm ${String(selectedHallId) === String(h.id)
                  ? 'bg-blue-600 dark:bg-amber-600 text-white scale-105'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
              >
                {h.name}
              </button>
            ))}
          </div>

          {/* Tables Grid */}
          <div className="flex-1 overflow-y-auto px-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-4">
              {tablesInHall.map(table => {
                const hasOrder = parkedOrders[table.id] && parkedOrders[table.id].length > 0;
                return (
                  <button
                    key={table.id}
                    onClick={() => onSelect(table)}
                    className={`p-4 rounded-2xl font-black text-xl aspect-square flex flex-col items-center justify-center shadow-md transition-all transform hover:scale-105 border-4 ${hasOrder
                      ? 'bg-red-500 text-white border-red-200 dark:border-red-900/50 hover:bg-red-600'
                      : 'bg-green-500 text-white border-green-200 dark:border-green-900/50 hover:bg-green-600'
                      }`}
                  >
                    <span className="text-sm opacity-80 mb-1">طاولة</span>
                    {table.name}
                    {hasOrder && <span className="text-xs mt-1 bg-white/20 px-2 py-0.5 rounded-full">مشغولة</span>}
                  </button>
                );
              })}
              {tablesInHall.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                  لا توجد طاولات مضافة لهذه الصالة
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t dark:border-gray-700">
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    );
  };

  const AddLocationModal: React.FC<{
    customer: Customer;
    onSave: (location: CustomerLocation) => void;
    onClose: () => void;
    zones: any[]; // ✅ Add zones prop
  }> = ({ customer, onSave, onClose, zones }) => {
    const [formData, setFormData] = useState({
      locationName: '',
      street: '',
      building: '',
      floor: '',
      apartment: '',
      landmark: '',
      kind: 'Home',
      isDefault: false,
      zoneId: '' // ✅ Add zoneId to state
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      try {
        const response = await fetch(
          `${API_BASE_URL}/customers/${customer.id}/locations`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              locationName: formData.locationName,
              zoneId: formData.zoneId ? parseInt(formData.zoneId) : null, // ✅ Send selected zoneId
              street: formData.street,
              building: formData.building,
              floor: formData.floor,
              apartment: formData.apartment,
              landmark: formData.landmark,
              latitude: null,  // Will be filled by driver
              longitude: null, // Will be filled by driver
              kind: formData.kind,
              isDefault: formData.isDefault
            })
          }
        );

        const data = await response.json();

        const newLocation: CustomerLocation = {
          id: data.id,
          locationName: data.location_name || '',
          street: data.street || '',
          building: data.building || '',
          floor: data.floor || '',
          apartment: data.apartment || '',
          landmark: data.landmark || '',
          latitude: data.latitude,
          longitude: data.longitude,
          kind: data.kind || 'Home',
          isDefault: data.is_default || false,
          zoneId: data.zone_id || data.zoneId || (formData.zoneId ? parseInt(formData.zoneId) : null) // ✅ Map zoneId
        };

        alert('✅ تم إضافة العنوان بنجاح!\n⚠️ سيتم تحديد الموقع من السائق في أول توصيل.');
        onSave(newLocation);

      } catch (error: any) {
        alert('فشل إضافة العنوان: ' + (error.message || 'خطأ غير معروف'));
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4 text-center text-amber-600">
            إضافة عنوان جديد لـ {customer.firstName} {customer.lastName}
          </h2>

          <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-500 rounded-lg p-3 mb-4">
            <p className="text-sm text-center">
              ⚠️ سيتم إنشاء العنوان بدون GPS<br />
              السائق سيضيف الموقع تلقائياً في أول توصيل
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              value={formData.locationName}
              onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
              placeholder="اسم العنوان (مثل: المنزل، العمل)"
              className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
            />

            {/* ✅ Zone Selection */}
            <select
              value={formData.zoneId}
              onChange={(e) => setFormData({ ...formData, zoneId: e.target.value })}
              required
              className={`w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600 ${!formData.zoneId ? 'border-yellow-500' : 'border-green-500'}`}
            >
              <option value="">* اختر منطقة التوصيل (مطلوب)</option>
              {zones.map((z: any) => (
                <option key={z.id} value={z.id}>
                  {z.name} - {parseFloat(z.delivery_fee).toFixed(2)} ج.م
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                placeholder="* الشارع"
                required
                className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
              />
              <input
                type="text"
                value={formData.building}
                onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                placeholder="* المبنى"
                required
                className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                placeholder="الطابق"
                className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
              />
              <input
                type="text"
                value={formData.apartment}
                onChange={(e) => setFormData({ ...formData, apartment: e.target.value })}
                placeholder="الشقة"
                className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
              />
            </div>

            <select
              value={formData.kind}
              onChange={(e) => setFormData({ ...formData, kind: e.target.value })}
              className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
            >
              <option value="Home">منزل</option>
              <option value="Work">عمل</option>
              <option value="Other">أخرى</option>
            </select>

            <input
              type="text"
              value={formData.landmark}
              onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
              placeholder="علامة مميزة"
              className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
            />

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="w-4 h-4"
              />
              <span>جعله العنوان الافتراضي</span>
            </label>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded-md"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-green-500 dark:bg-amber-600 text-white rounded-md font-semibold"
              >
                حفظ العنوان
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const EditCustomerModal: React.FC<{
    customer: Customer;
    zones: any[];
    onSave: (updatedCustomer: Customer) => void;
    onClose: () => void;
  }> = ({ customer, zones, onSave, onClose }) => {
    const [firstName, setFirstName] = useState(customer.firstName);
    const [lastName, setLastName] = useState(customer.lastName);
    const [phone, setPhone] = useState(customer.phone);
    const [locations, setLocations] = useState(customer.locations.map(loc => ({ ...loc })));
    const [saving, setSaving] = useState(false);
    const [activeLocIdx, setActiveLocIdx] = useState<number | null>(0);

    const handleSave = async () => {
      setSaving(true);
      try {
        await customersApi.update(customer.id, { firstName, lastName, phone });
        for (const loc of locations) {
          if (loc.id) {
            await customersApi.updateLocation(customer.id, loc.id, {
              locationName: loc.locationName,
              zoneId: loc.zoneId || null,
              street: loc.street,
              building: loc.building,
              floor: loc.floor,
              apartment: loc.apartment,
              landmark: loc.landmark,
              latitude: loc.latitude,
              longitude: loc.longitude,
              kind: loc.kind,
              isDefault: loc.isDefault,
            });
          }
        }
        onSave({ ...customer, firstName, lastName, phone, locations });
      } catch (e: any) {
        alert('فشل الحفظ: ' + (e.response?.data?.error || 'خطأ'));
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="flex justify-between items-center mb-4 pb-2 border-b dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-800 dark:text-amber-400">✏️ تعديل بيانات العميل</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"><XIcon className="w-6 h-6" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <input className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="الاسم الأول" />
            <input className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="الاسم الأخير" />
            <input className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600 col-span-2" value={phone} onChange={e => setPhone(e.target.value)} placeholder="رقم الهاتف" type="tel" />
          </div>
          <div className="border-t dark:border-gray-700 pt-4">
            <h3 className="font-bold text-base mb-3 dark:text-white">العناوين</h3>
            <div className="space-y-2">
              {locations.map((loc, idx) => (
                <div key={loc.id || idx} className="border dark:border-gray-700 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    className="w-full text-right p-3 flex justify-between items-center font-semibold dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => setActiveLocIdx(activeLocIdx === idx ? null : idx)}
                  >
                    <span>{loc.locationName || loc.kind || `عنوان ${idx + 1}`}</span>
                    <span className="text-xs text-gray-400 mx-2">{loc.street}</span>
                    <span className="text-gray-400">{activeLocIdx === idx ? '▲' : '▼'}</span>
                  </button>
                  {activeLocIdx === idx && (
                    <div className="p-3 border-t dark:border-gray-700 grid grid-cols-2 gap-2 bg-gray-50 dark:bg-gray-800">
                      <input className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 col-span-2" value={loc.locationName || ''} onChange={e => setLocations(locs => locs.map((l, i) => i === idx ? { ...l, locationName: e.target.value } : l))} placeholder="اسم العنوان" />
                      <select className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 col-span-2" value={loc.zoneId || ''} onChange={e => setLocations(locs => locs.map((l, i) => i === idx ? { ...l, zoneId: e.target.value ? parseInt(e.target.value) : null } : l))}>
                        <option value="">-- منطقة التوصيل --</option>
                        {zones.map(z => <option key={z.id} value={z.id}>{z.name} - {parseFloat(z.delivery_fee).toFixed(2)} ج.م</option>)}
                      </select>
                      <input className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={loc.street || ''} onChange={e => setLocations(locs => locs.map((l, i) => i === idx ? { ...l, street: e.target.value } : l))} placeholder="الشارع" />
                      <input className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={loc.building || ''} onChange={e => setLocations(locs => locs.map((l, i) => i === idx ? { ...l, building: e.target.value } : l))} placeholder="المبنى" />
                      <input className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={loc.floor || ''} onChange={e => setLocations(locs => locs.map((l, i) => i === idx ? { ...l, floor: e.target.value } : l))} placeholder="الطابق" />
                      <input className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={loc.apartment || ''} onChange={e => setLocations(locs => locs.map((l, i) => i === idx ? { ...l, apartment: e.target.value } : l))} placeholder="الشقة" />
                      <input className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 col-span-2" value={loc.landmark || ''} onChange={e => setLocations(locs => locs.map((l, i) => i === idx ? { ...l, landmark: e.target.value } : l))} placeholder="علامة مميزة" />
                      <select className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600" value={loc.kind || 'Home'} onChange={e => setLocations(locs => locs.map((l, i) => i === idx ? { ...l, kind: e.target.value } : l))}>
                        <option value="Home">منزل</option>
                        <option value="Work">عمل</option>
                        <option value="Other">أخرى</option>
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3 mt-6 pt-4 border-t dark:border-gray-700">
            <button onClick={onClose} className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition">إلغاء</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-blue-600 dark:bg-amber-600 text-white rounded-xl font-bold hover:bg-blue-700 dark:hover:bg-amber-700 transition disabled:opacity-50">
              {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const CustomerSelectionModal: React.FC<{
    customers: Customer[];
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    onSelect: (c: Customer) => void;
    onClose: () => void;
    zones: any[]; // ✅ Add zones prop
  }> = ({ customers, setCustomers, onSelect, onClose, zones }) => {
    const [view, setView] = useState<'search' | 'form'>('search');
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
      phone: '',
      firstName: '',
      lastName: '',
      locationName: '',
      street: '',
      building: '',
      floor: '',
      apartment: '',
      landmark: '',
      kind: 'Home',
      zoneId: '' // ✅ Add zoneId
    });
    const filteredCustomers = customers.filter(
      c => c.phone.includes(searchTerm) || `${c.firstName} ${c.lastName}`.includes(searchTerm)
    );
    const handleSaveNewCustomer = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const response = await customersApi.create({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          locations: [{
            locationName: formData.locationName,
            zoneId: formData.zoneId ? parseInt(formData.zoneId) : null, // ✅ Send zoneId
            street: formData.street,
            building: formData.building,
            floor: formData.floor,
            apartment: formData.apartment,
            landmark: formData.landmark,
            latitude: null,
            longitude: null,
            kind: formData.kind,
            isDefault: true
          }]
        });
        const newCustomer: Customer = {
          id: response.data.id,
          firstName: response.data.first_name,
          lastName: response.data.last_name,
          phone: response.data.phone,
          lastZoneId: formData.zoneId ? parseInt(formData.zoneId) : null,
          lastZoneName: null,
          locations: (response.data.locations || []).map((loc: any, idx: number) => ({
            id: loc.id,
            locationName: loc.location_name || loc.locationName || '',
            street: loc.street || '',
            building: loc.building || '',
            floor: loc.floor || '',
            apartment: loc.apartment || '',
            landmark: loc.landmark || '',
            latitude: loc.latitude,
            longitude: loc.longitude,
            kind: loc.kind || 'Home',
            isDefault: loc.is_default ?? loc.isDefault ?? false,
            // Use backend zone_id, fallback to what user selected (only first location)
            zoneId: loc.zone_id || loc.zoneId || (idx === 0 && formData.zoneId ? parseInt(formData.zoneId) : null)
          }))
        };
        setCustomers(prev => [...prev, newCustomer]);
        onSelect(newCustomer);
      } catch (error: any) {
        alert('فشل إضافة العميل: ' + (error.response?.data?.error || 'خطأ غير معروف'));
      }
    };
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          {view === 'search' && (
            <>
              <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-amber-400">اختر عميل توصيل</h2>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ابحث بالاسم أو رقم الهاتف..."
                  className="flex-grow p-2 border rounded dark:bg-gray-800 dark:border-gray-600"
                />
                <button
                  onClick={() => setView('form')}
                  className="px-4 py-2 bg-green-500 dark:bg-amber-600 text-white rounded-md font-semibold"
                >
                  عميل جديد
                </button>
              </div>
              <div className="space-y-2">
                {filteredCustomers.map(c => (
                  <button
                    key={c.id}
                    onClick={() => onSelect(c)}
                    className="w-full text-right p-3 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-blue-100 dark:hover:bg-gray-700"
                  >
                    <div className="font-bold">{c.firstName} {c.lastName}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{c.phone}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">{c.locations.length} عنوان</div>
                    {c.lastZoneName && (
                      <div className="text-xs text-blue-600 dark:text-amber-400 mt-0.5">🏘️ آخر توصيل: {c.lastZoneName}</div>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
          {view === 'form' && (
            <>
              <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-amber-400">إضافة عميل جديد</h2>
              <form onSubmit={handleSaveNewCustomer} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="* رقم الهاتف" required className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600 col-span-2" />
                  <input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="* الاسم الأول" required className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600" />
                  <input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="* الاسم الأخير" required className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600" />
                </div>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2 text-gray-800 dark:text-white">العنوان الأول</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" value={formData.locationName} onChange={(e) => setFormData({ ...formData, locationName: e.target.value })} placeholder="اسم العنوان (مثل: المنزل)" className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600 col-span-2" />

                    {/* ✅ Zone Selection (required) */}
                    <select
                      value={formData.zoneId}
                      onChange={(e) => setFormData({ ...formData, zoneId: e.target.value })}
                      required
                      className={`p-2 border rounded dark:bg-gray-800 dark:border-gray-600 col-span-2 ${!formData.zoneId ? 'border-yellow-500' : 'border-green-500'}`}
                    >
                      <option value="">* اختر منطقة التوصيل (مطلوب)</option>
                      {zones.map((z: any) => (
                        <option key={z.id} value={z.id}>
                          {z.name} - {parseFloat(z.delivery_fee).toFixed(2)} ج.م
                        </option>
                      ))}
                    </select>

                    <input type="text" value={formData.street} onChange={(e) => setFormData({ ...formData, street: e.target.value })} placeholder="* الشارع" required className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600" />
                    <input type="text" value={formData.building} onChange={(e) => setFormData({ ...formData, building: e.target.value })} placeholder="* المبنى" required className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600" />
                    <input type="text" value={formData.floor} onChange={(e) => setFormData({ ...formData, floor: e.target.value })} placeholder="الطابق" className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600" />
                    <input type="text" value={formData.apartment} onChange={(e) => setFormData({ ...formData, apartment: e.target.value })} placeholder="الشقة" className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600" />
                    <select value={formData.kind} onChange={(e) => setFormData({ ...formData, kind: e.target.value })} className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600">
                      <option value="Home">منزل</option>
                      <option value="Work">عمل</option>
                      <option value="Other">أخرى</option>
                    </select>
                    <input type="text" value={formData.landmark} onChange={(e) => setFormData({ ...formData, landmark: e.target.value })} placeholder="علامة مميزة" className="p-2 border rounded dark:bg-gray-800 dark:border-gray-600" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setView('search')} className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded-md">عودة للبحث</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-green-500 dark:bg-amber-600 text-white rounded-md">حفظ واختيار</button>
                </div>
              </form>
            </>
          )}
          <button onClick={onClose} className="w-full mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">إغلاق</button>
        </div>
      </div>
    );
  };

  const ItemNotesModal: React.FC<{
    item: OrderItem,
    allNoteOptions: NoteOption[],
    onSave: (lineItemId: string, notes: string, selectedNoteOptions: NoteOption[]) => void,
    onClose: () => void
  }> = ({ item, allNoteOptions, onSave, onClose }) => {
    const [notes, setNotes] = useState(item.notes || '');
    const [selectedOpts, setSelectedOpts] = useState<NoteOption[]>(item.selectedNoteOptions || []);

    const toggleOpt = (opt: NoteOption) => {
      setSelectedOpts(prev =>
        prev.find(o => o.id === opt.id)
          ? prev.filter(o => o.id !== opt.id)
          : [...prev, opt]
      );
    };

    const availableOptions: NoteOption[] = allNoteOptions.filter(o => (o as any).is_active !== false);
    const addedModifiersTotal = selectedOpts.reduce((s, o) => s + Number(o.price), 0);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
          <div className="flex justify-between items-center mb-4 pb-2 border-b dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-amber-400 p-2">ملاحظات: "{item.name}"</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition">
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 pr-2 space-y-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            {/* Standard note options */}
            {availableOptions.length > 0 && (
              <div>
                <p className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-3 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg inline-block">إضافات سريعة:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableOptions.map(opt => {
                    const isChecked = !!selectedOpts.find(o => o.id === opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggleOpt(opt)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all transform active:scale-95 ${isChecked
                          ? 'border-blue-500 bg-blue-50 dark:border-amber-500 dark:bg-amber-900/20 text-blue-700 dark:text-amber-400 hover:bg-blue-100 dark:hover:bg-amber-900/30'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                      >
                        <span className="font-bold text-center leading-tight mb-1">{opt.name}</span>
                        <span className={`text-sm font-bold w-full text-center px-2 py-0.5 rounded-md ${isChecked ? 'bg-blue-200/50 dark:bg-amber-500/20 text-blue-800 dark:text-amber-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                          {Number(opt.price) > 0 ? `+${Number(opt.price).toFixed(2)}` : 'مجاني'}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {addedModifiersTotal > 0 && (
                  <div className="mt-3 flex justify-end">
                    <p className="px-4 py-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-800 dark:text-amber-400 font-bold">
                      إجمالي الإضافات: +{addedModifiersTotal.toFixed(2)} ج.م
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Free text note */}
            <div>
              <p className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">ملاحظة حرة (اختياري):</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="اكتب أي ملاحظات إضافية هنا... (مثال: بدون ثوم إضافي)"
                className="w-full p-4 border-2 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-gray-800 dark:border-gray-600 text-lg shadow-sm"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t dark:border-gray-700">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition text-lg"
            >إلغاء</button>
            <button
              onClick={() => onSave(item.lineItemId, notes, selectedOpts)}
              className="flex-1 px-6 py-4 bg-blue-600 dark:bg-amber-600 text-white rounded-xl font-bold hover:bg-blue-700 dark:hover:bg-amber-700 transition shadow-lg text-lg"
            >حفظ الملاحظات</button>
          </div>
        </div>
      </div>
    );
  };

  const LocationSelectionModal: React.FC<{
    customer: Customer;
    onSelect: (location: CustomerLocation) => void;
    onClose: () => void;
    onAddNew: () => void;
  }> = ({ customer, onSelect, onClose, onAddNew }) => {
    // ✅ ADD: Track which location is currently selected
    const [tempSelectedLocation, setTempSelectedLocation] = useState<CustomerLocation | null>(
      customer.locations.find(loc => loc.isDefault) || null
    );

    const handleConfirm = () => {
      if (tempSelectedLocation) {
        onSelect(tempSelectedLocation);
        onClose();
      } else {
        alert('⚠️ يرجى اختيار عنوان');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4 text-center">
            اختر عنوان التوصيل لـ {customer.firstName} {customer.lastName}
          </h2>

          <div className="space-y-3 mb-4">
            {customer.locations.map((loc) => {
              const isSelected = tempSelectedLocation?.id === loc.id;
              const hasGPS = loc.latitude && loc.longitude;

              return (
                <div key={loc.id} className="relative">
                  <button
                    onClick={() => setTempSelectedLocation(loc)}
                    className={`w-full text-right p-4 rounded-lg border-2 transition ${isSelected
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500 shadow-lg' // ✅ Selected state
                      : !hasGPS
                        ? 'bg-gray-100 dark:bg-gray-800 border-yellow-500 hover:border-yellow-600'
                        : 'bg-gray-100 dark:bg-gray-800 border-transparent hover:border-gray-400'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-lg">
                        {loc.locationName || loc.kind}
                      </span>
                      <div className="flex gap-2">
                        {loc.isDefault && (
                          <span className="px-2 py-1 text-xs bg-green-500 text-white rounded-full">
                            افتراضي
                          </span>
                        )}
                        {hasGPS ? (
                          <span className="px-2 py-1 text-xs bg-green-500 text-white rounded-full">
                            📍 GPS ✓
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                            ⚠️ No GPS
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-sm">
                      {loc.street}, مبنى {loc.building}
                      {loc.floor && `, طابق ${loc.floor}`}
                      {loc.apartment && `, شقة ${loc.apartment}`}
                    </p>

                    {loc.landmark && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        علامة مميزة: {loc.landmark}
                      </p>
                    )}

                    {!hasGPS && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                        ⚠️ سيتم تحديد الموقع من السائق في أول توصيل
                      </p>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add new location button */}
          <button
            onClick={onAddNew}
            className="w-full mb-3 px-4 py-3 bg-green-500 dark:bg-amber-600 text-white rounded-lg font-semibold hover:bg-green-600 transition"
          >
            + إضافة عنوان جديد لهذا العميل
          </button>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded-md hover:bg-gray-400 transition"
            >
              إلغاء
            </button>
            <button
              onClick={handleConfirm}
              disabled={!tempSelectedLocation}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${tempSelectedLocation
                ? 'bg-blue-500 dark:bg-amber-600 text-white hover:bg-blue-600'
                : 'bg-gray-400 dark:bg-gray-600 text-gray-200 cursor-not-allowed'
                }`}
            >
              تأكيد الاختيار
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Quantity Input Modal with Numpad + Keyboard Support
  const QuantityInputModal: React.FC<{
    item: MenuItem;
    quantity: string;
    onQuantityChange: (qty: string) => void;
    onConfirm: () => void;
    onClose: () => void;
  }> = ({ item, quantity, onQuantityChange, onConfirm, onClose }) => {

    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input when modal opens
    useEffect(() => {
      inputRef.current?.focus();
      //inputRef.current?.select(); // Select all text for easy replacement
    }, []);

    // Handle keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onConfirm();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onConfirm, onClose]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Only allow numbers
      if (/^\d*$/.test(value)) {
        onQuantityChange(value || '1');
      }
    };

    const handleNumpadClick = (num: string) => {
      if (num === 'C') {
        onQuantityChange('1');
      } else if (num === '⌫') {
        onQuantityChange(quantity.length > 1 ? quantity.slice(0, -1) : '1');
      } else {
        const newQty = quantity === '1' ? num : quantity + num;
        onQuantityChange(newQty);
      }
      // Keep focus on input after numpad click
      inputRef.current?.focus();
    };

    const numpadButtons = [
      ['7', '8', '9'],
      ['4', '5', '6'],
      ['1', '2', '3'],
      ['C', '0', '⌫']
    ];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
          {/* Item Info */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-amber-400 mb-2">
              {item.name}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              {Number(item.price).toFixed(2)} ج.م
            </p>
          </div>

          {/* Keyboard Input Field */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 text-center">
              الكمية (اكتب بالكيبورد أو استخدم الأرقام)
            </label>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={quantity}
              onChange={handleInputChange}
              className="w-full bg-gray-100 dark:bg-gray-900 rounded-xl p-6 text-center border-2 border-blue-500 dark:border-amber-500 text-5xl font-black text-blue-600 dark:text-amber-500 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-amber-300"
              placeholder="1"
            />

            {/* Total Price */}
            <div className="mt-3 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">الإجمالي</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-500">
                {(item.price * (parseInt(quantity) || 1)).toFixed(2)} ج.م
              </p>
            </div>
          </div>

          {/* Visual Numpad (optional, for touch screens) */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {numpadButtons.flat().map((btn) => (
              <button
                key={btn}

                onClick={() => handleNumpadClick(btn)}
                type="button"
                className={`
                p-4 rounded-xl font-bold text-2xl transition-all transform active:scale-95
                ${btn === 'C' || btn === '⌫'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-blue-500 dark:bg-amber-600 hover:bg-blue-600 dark:hover:bg-amber-700 text-white'
                  }
                shadow-md hover:shadow-lg
              `}
              >
                {btn}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onClose}
              type="button"
              className="px-6 py-3 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-400 dark:hover:bg-gray-600 transition"
            >
              إلغاء (Esc)
            </button>
            <button
              onClick={onConfirm}
              type="button"
              className="px-6 py-3 bg-green-600 dark:bg-green-700 text-white rounded-xl font-bold hover:bg-green-700 dark:hover:bg-green-800 transition"
            >
              إضافة (Enter)
            </button>
          </div>
        </div>
      </div>
    );
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-black">
        <div className="text-2xl text-gray-600 dark:text-gray-300">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-black text-gray-900 dark:text-gray-100">
      {isTableModalOpen && <TableSelectionModal tables={allTables} onSelect={handleSelectTable} onClose={() => setTableModalOpen(false)} halls={halls} parkedOrders={parkedOrders} />}


      {isEditCustomerModalOpen && selectedCustomer && <EditCustomerModal customer={selectedCustomer} zones={zones} onSave={handleSaveEditedCustomer} onClose={() => setEditCustomerModalOpen(false)} />}
      {isCustomerModalOpen && <CustomerSelectionModal customers={allCustomers} setCustomers={setAllCustomers} onSelect={handleSelectCustomer} onClose={() => setCustomerModalOpen(false)} zones={zones} />}
      {itemNotesModal?.isOpen && <ItemNotesModal item={itemNotesModal.item} allNoteOptions={allNoteOptions} onSave={handleUpdateNotes} onClose={() => setItemNotesModal(null)} />}
      {isLocationModalOpen && selectedCustomer && (
        <LocationSelectionModal
          customer={selectedCustomer}
          onSelect={(loc) => {
            setSelectedLocation(loc);
            setLocationModalOpen(false);
          }}
          onClose={() => setLocationModalOpen(false)}
          onAddNew={() => {
            setLocationModalOpen(false);
            setAddLocationModalOpen(true);
          }}
        />
      )}

      {isAddLocationModalOpen && selectedCustomer && (
        <AddLocationModal
          customer={selectedCustomer}
          zones={zones} // ✅ Pass zones
          onSave={(newLocation) => {
            // Add to customer's locations
            setSelectedCustomer({
              ...selectedCustomer,
              locations: [...selectedCustomer.locations, newLocation]
            });
            setSelectedLocation(newLocation);
            setAddLocationModalOpen(false);

            // Also update in allCustomers state
            setAllCustomers(allCustomers.map(c =>
              c.id === selectedCustomer.id
                ? { ...c, locations: [...c.locations, newLocation] }
                : c
            ));
          }}
          onClose={() => setAddLocationModalOpen(false)}
        />
      )}

      <div className="flex h-full overflow-hidden bg-gray-50 dark:bg-black">
        {/* Menu Section */}
        <div className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden">
          {/* LEVEL 1: Main Groups */}
          <div className="flex space-x-2 space-x-reverse mb-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
            <button
              onClick={() => {
                setSelectedMainGroupId(null);
                setSelectedSubGroupId(null);
                setSelectedCategoryId(null); /* ✅ ADD THIS */
              }}
              className={`px-5 py-3 rounded-xl font-bold transition-all whitespace-nowrap shadow-sm min-w-max ${!selectedMainGroupId ? 'bg-blue-600 dark:bg-amber-600 text-white transform scale-105' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-100'}`}
            >
              الكـل
            </button>
            {mainGroups.map(g => (
              <button
                key={g.id}
                onClick={() => {
                  setSelectedMainGroupId(g.id);
                  setSelectedSubGroupId(null);
                  setSelectedCategoryId(null); /* ✅ ADD THIS */
                }}
                className={`px-5 py-3 rounded-xl font-bold transition-all whitespace-nowrap shadow-sm min-w-max ${selectedMainGroupId === g.id ? 'bg-blue-600 dark:bg-amber-600 text-white transform scale-105' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-100'}`}
              >
                {g.name}
              </button>
            ))}
          </div>

          {/* LEVEL 2: Sub Groups */}
          {selectedMainGroupId && subGroupsFiltered.length > 0 && (
            <div className="flex space-x-2 space-x-reverse mb-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
              <button
                onClick={() => {
                  setSelectedSubGroupId(null);
                  setSelectedCategoryId(null); /* ✅ ADD THIS */
                }}
                className={`px-4 py-2 text-sm rounded-lg font-bold transition-all whitespace-nowrap shadow-sm ${!selectedSubGroupId ? 'bg-green-600 dark:bg-amber-500 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50'}`}
              >
                الكل
              </button>
              {subGroupsFiltered.map(sg => (
                <button
                  key={sg.id}
                  onClick={() => {
                    setSelectedSubGroupId(sg.id);
                    setSelectedCategoryId(null); /* ✅ ADD THIS */
                  }}
                  className={`px-4 py-2 text-sm rounded-lg font-bold transition-all whitespace-nowrap shadow-sm ${selectedSubGroupId === sg.id ? 'bg-green-600 dark:bg-amber-500 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50'}`}
                >
                  {sg.name}
                </button>
              ))}
            </div>
          )}

          {/* ✅ LEVEL 3: Categories - ADD THIS ENTIRE SECTION */}
          {selectedSubGroupId && categoriesFiltered.length > 0 && (
            <div className="flex space-x-2 space-x-reverse mb-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
              <button
                onClick={() => setSelectedCategoryId(null)}
                className={`px-4 py-1.5 text-xs rounded-lg font-bold transition-all whitespace-nowrap shadow-sm ${!selectedCategoryId ? 'bg-purple-600 dark:bg-purple-700 text-white' : 'bg-white dark:bg-gray-800 border text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'}`}
              >
                الكل
              </button>
              {categoriesFiltered.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-4 py-1.5 text-xs rounded-lg font-bold transition-all whitespace-nowrap shadow-sm ${selectedCategoryId === cat.id ? 'bg-purple-600 dark:bg-purple-700 text-white' : 'bg-white dark:bg-gray-800 border text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}


          {/* Menu Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 flex-1 overflow-y-auto content-start pr-1 pb-20 md:pb-0 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
            {menuItems.map(item => (
              <button key={item.id} onClick={() => handleAddItem(item)} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex flex-col justify-center items-center text-center min-h-[120px] hover:shadow-md active:scale-95 transform transition border-2 border-transparent hover:border-blue-400 dark:hover:border-amber-500 dark:border-gray-700 select-none">
                <div className="font-bold text-gray-800 dark:text-gray-100 leading-snug mb-3 line-clamp-3 w-full break-words">{item.name}</div>
                <div className="mt-auto rounded-lg bg-blue-50 dark:bg-gray-900 w-full py-1.5">
                  <span className="text-base font-black text-blue-700 dark:text-amber-500">{Number(item.price).toFixed(2)} ج.م</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Numpad Column */}
        <div className="w-16 bg-gray-200 dark:bg-gray-800 flex flex-col border-x border-gray-300 dark:border-gray-700 shrink-0 overflow-y-auto py-2 px-1">
          <div className="text-center font-bold text-gray-700 dark:text-gray-300 text-xs mb-1">الكمية</div>
          <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-center py-2 mb-2 font-black text-blue-600 dark:text-amber-500 shadow-inner">
            {currentQuantity}
          </div>
          
          <div className="flex flex-col gap-1 flex-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
              <button
                key={num}
                onClick={() => {
                  setCurrentQuantity((prev) => {
                    if (num === 0 && prev === '1') return prev; // Don't add leading zeros to 1
                    const newQty = prev === '1' ? num.toString() : prev + num.toString();
                    return newQty.slice(0, 3); // Max 3 digits
                  });
                }}
                className="flex-1 min-h-[40px] rounded bg-gray-600 text-white dark:bg-gray-700 dark:text-gray-200 font-bold active:bg-blue-500 dark:active:bg-amber-600 transition shadow-sm select-none"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => setCurrentQuantity((prev) => (prev.length > 1 ? prev.slice(0, -1) : '1'))}
              className="flex-1 min-h-[40px] rounded bg-gray-500 text-white font-bold hover:bg-gray-600 active:scale-95 transition shadow-sm select-none"
            >
              ⌫
            </button>
            <button
              onClick={() => setCurrentQuantity('1')}
              className="flex-1 min-h-[40px] rounded bg-red-600 text-white font-bold hover:bg-red-700 active:scale-95 transition shadow-sm select-none"
            >
              C
            </button>
          </div>
        </div>

        {/* Order Section */}
        <div className="w-full md:w-[400px] lg:w-[480px] xl:w-[520px] bg-white dark:bg-gray-900 flex flex-col p-4 space-y-3 h-full overflow-hidden shadow-2xl z-10 shrink-0 border-t md:border-t-0 md:border-r border-gray-200 dark:border-gray-800">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold dark:text-amber-400">نقطة البيع</h2>
            <button onClick={handleNavigateHome} className="p-2 rounded-full bg-blue-500 dark:bg-amber-600 text-white hover:scale-110 transition">
              <HomeIcon />
            </button>
          </div>

          {/* Sales Centers */}
          {/* Sales Centers */}
          <div className="grid grid-cols-3 gap-3">
            {/* Dine In */}
            <button
              onClick={() => handleSelectSalesCenter(SalesCenter.DineIn)}
              disabled={!!orderToEdit || !enabledCenters.dineIn}
              title={!enabledCenters.dineIn ? 'معطّل من الإعدادات' : undefined}
              className={`flex flex-col items-center justify-center p-2.5 rounded-lg transition shadow-sm border
                  ${activeSalesCenter === SalesCenter.DineIn
                  ? 'bg-blue-600 dark:bg-amber-600 text-white border-blue-700 dark:border-amber-700'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'}
                  ${(!!orderToEdit || !enabledCenters.dineIn) ? 'opacity-40 cursor-not-allowed' : ''}
                `}
            >
              <TableIcon className="w-5 h-5 mb-1" />
              <span className="font-semibold text-sm">صالة</span>
              {!enabledCenters.dineIn && <span className="text-[10px] text-red-400 mt-0.5">معطّل</span>}
            </button>

            {/* Takeaway */}
            <button
              onClick={() => handleSelectSalesCenter(SalesCenter.Takeaway)}
              disabled={!!orderToEdit || !enabledCenters.takeaway}
              title={!enabledCenters.takeaway ? 'معطّل من الإعدادات' : undefined}
              className={`flex flex-col items-center justify-center p-2.5 rounded-lg transition shadow-sm border
                  ${activeSalesCenter === SalesCenter.Takeaway
                  ? 'bg-blue-600 dark:bg-amber-600 text-white border-blue-700 dark:border-amber-700'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'}
                  ${(!!orderToEdit || !enabledCenters.takeaway) ? 'opacity-40 cursor-not-allowed' : ''}
                `}
            >
              <PosIcon className="w-5 h-5 mb-1" />
              <span className="font-semibold text-sm">تيك أواي</span>
              {!enabledCenters.takeaway && <span className="text-[10px] text-red-400 mt-0.5">معطّل</span>}
            </button>

            {/* Delivery */}
            <button
              onClick={() => handleSelectSalesCenter(SalesCenter.Delivery)}
              disabled={!!orderToEdit || !enabledCenters.delivery}
              title={!enabledCenters.delivery ? 'معطّل من الإعدادات' : undefined}
              className={`flex flex-col items-center justify-center p-2.5 rounded-lg transition shadow-sm border
                  ${activeSalesCenter === SalesCenter.Delivery
                  ? 'bg-blue-600 dark:bg-amber-600 text-white border-blue-700 dark:border-amber-700'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'}
                  ${(!!orderToEdit || !enabledCenters.delivery) ? 'opacity-40 cursor-not-allowed' : ''}
                `}
            >
              <DeliveryIcon className="w-5 h-5 mb-1" />
              <span className="font-semibold text-sm">توصيل</span>
              {!enabledCenters.delivery && <span className="text-[10px] text-red-400 mt-0.5">معطّل</span>}
            </button>
          </div>

          {/* Selected Info */}
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
            {activeSalesCenter === SalesCenter.DineIn && (
              <div
                className="font-semibold cursor-pointer hover:text-blue-500 dark:hover:text-amber-400 transition"
                onClick={() => setTableModalOpen(true)}
              >
                {selectedTable ? `طاولة: ${selectedHall?.name} - ${selectedTable.name} (تغيير)` : 'الرجاء اختيار طاولة (اضغط هنا)'}
              </div>
            )}
            {activeSalesCenter === SalesCenter.Delivery && (
              <div className="text-sm text-gray-600 dark:text-gray-300 bg-blue-50 dark:bg-gray-700 p-2 rounded">
                {selectedCustomer && selectedLocation ? (
                  <div>
                    <div className="font-semibold">
                      {selectedCustomer.firstName} {selectedCustomer.lastName} - {selectedCustomer.phone}
                    </div>
                    <div className="text-xs mt-1">
                      📍 {selectedLocation.locationName || selectedLocation.kind} - {selectedLocation.street}, {selectedLocation.building}
                      {selectedLocation.latitude && selectedLocation.longitude && ' (GPS ✓)'}
                    </div>
                    {selectedZone ? (
                      <div className="text-xs mt-1 font-semibold text-green-600 dark:text-green-400">
                        🏘️ منطقة التوصيل: {selectedZone.name} ({parseFloat(selectedZone.delivery_fee).toFixed(2)} ج.م)
                      </div>
                    ) : (
                      <div className="text-xs mt-1 text-yellow-600 dark:text-yellow-400">
                        ⚠️ لم يتم اختيار منطقة التوصيل
                      </div>
                    )}
                    {/* Edit & History buttons */}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => setEditCustomerModalOpen(true)}
                        className="flex-1 py-1.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg font-bold hover:bg-blue-200 dark:hover:bg-blue-900/60 transition"
                      >
                        ✏️ تعديل
                      </button>
                      <button
                        onClick={() => {
                          if (!showCustomerOrders && selectedCustomer) fetchCustomerOrders(selectedCustomer.id);
                          setShowCustomerOrders(prev => !prev);
                        }}
                        className="flex-1 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                      >
                        📋 {showCustomerOrders ? 'إخفاء الطلبات' : 'سجل الطلبات'}
                      </button>
                    </div>
                    {/* Customer order history */}
                    {showCustomerOrders && (
                      <div className="mt-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 max-h-52 overflow-y-auto">
                        <div className="p-2 font-bold text-xs border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-white rounded-t-lg sticky top-0">
                          📋 آخر طلبات العميل
                        </div>
                        {loadingCustomerOrders ? (
                          <div className="p-3 text-center text-xs text-gray-500">جاري التحميل...</div>
                        ) : customerOrders.length === 0 ? (
                          <div className="p-3 text-center text-xs text-gray-500">لا توجد طلبات سابقة</div>
                        ) : (
                          customerOrders.map(o => {
                            const statusColors: Record<string, string> = {
                              Completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
                              Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
                              Pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
                            };
                            const statusAr: Record<string, string> = {
                              Pending: 'معلق', Confirmed: 'مؤكد', Preparing: 'يُحضَّر',
                              Ready: 'جاهز', Delivering: 'بالتوصيل', Completed: 'مكتمل', Cancelled: 'ملغي',
                            };
                            return (
                              <div key={o.id} className="p-2 border-b dark:border-gray-700 last:border-b-0 text-xs">
                                <div className="flex justify-between items-center gap-1">
                                  <span className="font-bold dark:text-white truncate">{o.user_facing_id || o.order_no || `#${o.id}`}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${statusColors[o.status] || 'bg-gray-100 text-gray-700'}`}>
                                    {statusAr[o.status] || o.status}
                                  </span>
                                </div>
                                <div className="flex justify-between text-gray-500 dark:text-gray-400 mt-0.5">
                                  <span>{new Date(o.created_at).toLocaleDateString('ar-EG')}</span>
                                  <span className="font-semibold text-gray-700 dark:text-gray-300">{Number(o.total).toFixed(2)} ج.م</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  'الرجاء اختيار عميل وعنوان'
                )}

                {/* Zone Selection */}
                <div className="mt-3 pt-2 border-t border-blue-200 dark:border-gray-600">
                  <label className="block text-xs font-bold mb-1">منطقة التوصيل</label>
                  <select
                    className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-sm"
                    value={selectedZone?.id || ''}
                    onChange={(e) => {
                      const zoneId = parseInt(e.target.value);
                      const zone = zones?.find(z => Number(z.id) === zoneId) || null;
                      // Only update selectedZone — do NOT touch selectedCustomer here
                      // (that would re-trigger the auto-select useEffect and override this choice)
                      setSelectedZone(zone);
                      // Update allCustomers list so next time this customer is picked, it shows the right zone
                      if (selectedCustomer && zone) {
                        setAllCustomers(prev => prev.map(c =>
                          c.id === selectedCustomer.id
                            ? { ...c, lastZoneId: zone.id, lastZoneName: zone.name }
                            : c
                        ));
                      }
                    }}
                  >
                    <option value="">-- اختر المنطقة (الافتراضي {DELIVERY_FEE} ج.م) --</option>
                    {zones?.map(z => (
                      <option key={z.id} value={z.id}>
                        {z.name} - {parseFloat(z.delivery_fee).toFixed(2)} ج.م
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            {activeSalesCenter === SalesCenter.Takeaway && <div className="font-semibold">طلب تيك أواي</div>}
            {!activeSalesCenter && <div className="text-gray-500 dark:text-gray-400">اختر مركز البيع</div>}
          </div>

          {/* Order Items */}
          <div className="flex-1 overflow-y-auto space-y-2 bg-gray-50 dark:bg-gray-950 p-2 rounded-xl border border-gray-100 dark:border-gray-800 shadow-inner scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
            {currentOrder.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 space-y-3">
                <PosIcon className="w-12 h-12 opacity-20" />
                <span className="text-lg font-bold">لم يتم إضافة أي أصناف بعد</span>
              </div>
            ) : (
              currentOrder.map(item => (
                <div key={item.lineItemId || item.id} className="bg-white dark:bg-[#1a2332] p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col gap-1 transition-all hover:shadow-md">
                  <div className="flex items-center gap-2 w-full justify-between">
                    
                    {/* Item Name (Right aligned in RTL) */}
                    <div className="flex-1 font-bold text-sm text-gray-900 dark:text-gray-100 truncate w-32" title={item.name}>
                      {item.name}
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                       <div className="flex items-center bg-gray-100 dark:bg-[#2a3648] rounded-full border border-gray-300 dark:border-gray-600 overflow-hidden shrink-0">
                         <button onClick={() => handleUpdateQuantity(item.lineItemId, 1)} className="w-7 h-7 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition font-medium">
                           +
                         </button>
                         <span className="font-bold text-sm w-6 text-center text-gray-900 dark:text-white select-none">
                           {item.quantity}
                         </span>
                         <button onClick={() => handleUpdateQuantity(item.lineItemId, -1)} className="w-7 h-7 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition font-bold leading-none">
                           −
                         </button>
                       </div>
                    </div>

                    {/* Price & Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                       <div className="font-bold text-sm min-w-[50px] text-center text-gray-900 dark:text-gray-100" dir="ltr">
                         {((Number(item.price) + (item.selectedNoteOptions || []).reduce((s, n) => s + Number(n.price), 0)) * item.quantity).toFixed(2)}
                       </div>
                       
                       <button 
                         onClick={() => setItemNotesModal({ item, isOpen: true })} 
                         className={`w-7 h-7 rounded flex items-center justify-center transition shadow-sm ${item.notes || (item.selectedNoteOptions?.length ?? 0) > 0 ? 'bg-amber-400 hover:bg-amber-500 text-amber-900' : 'bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/60 text-amber-600 dark:text-amber-400'}`}
                         title="ملاحظات"
                       >
                         <NotesIcon className="w-4 h-4" />
                       </button>

                       <button 
                         onClick={() => handleRemoveItem(item.lineItemId)} 
                         className="w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded flex items-center justify-center transition shadow-sm"
                       >
                         <TrashIcon className="w-4 h-4" />
                       </button>
                    </div>
                    
                  </div>

                  {/* Notes & Extras Display under the row if they exist */}
                  {((item.selectedNoteOptions || []).length > 0 || item.notes) && (
                    <div className="flex flex-wrap gap-1 mt-0.5 pr-2">
                      {(item.selectedNoteOptions || []).length > 0 && (
                           item.selectedNoteOptions!.map(o => (
                             <span key={o.id} className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[10px] font-semibold border border-gray-200 dark:border-gray-700">
                               + {o.name}
                             </span>
                           ))
                      )}
                      {item.notes && (
                        <div className="text-[10px] text-gray-600 dark:text-gray-400 font-medium px-1.5 py-0.5 rounded border border-dashed border-gray-300 dark:border-gray-700 truncate max-w-full">
                          {item.notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Order Summary */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>عدد العناصر</span>
              <span className="font-bold">{currentOrder.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div className="flex justify-between"><span>المجموع الفرعي</span><span className="font-bold">{subtotal.toFixed(2)} ج.م</span></div>
            <div className="flex justify-between"><span>ضريبة القيمة المضافة ({(taxRate * 100).toFixed(0)}%)</span><span className="font-bold">{taxAmount.toFixed(2)} ج.م</span></div>
            {activeSalesCenter === SalesCenter.DineIn && <div className="flex justify-between"><span>خدمة الصالة ({(serviceChargeRate * 100).toFixed(0)}%)</span><span className="font-bold">{serviceCharge.toFixed(2)} ج.م</span></div>}
            {activeSalesCenter === SalesCenter.Delivery && <div className="flex justify-between"><span>رسوم التوصيل</span><span className="font-bold">{deliveryFee.toFixed(2)} ج.م</span></div>}
            <div className="flex justify-between pt-2 border-t dark:border-gray-700 text-lg font-bold">
              <span>الإجمالي</span>
              <span className="text-blue-600 dark:text-amber-500">{orderTotal.toFixed(2)} ج.م</span>
            </div>
          </div>

          {/* Payment Methods */}
          {/* Payment Methods */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`p-4 rounded-xl font-bold transition flex items-center justify-center gap-2 border shadow-sm
                ${paymentMethod === 'cash'
                  ? 'bg-green-600 dark:bg-green-700 text-white border-green-700 ring-2 ring-green-400 dark:ring-green-900'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'}`}
            >
              <span>💵</span>
              <span>كاش</span>
            </button>
            <button
              onClick={() => setPaymentMethod('card')}
              className={`p-4 rounded-xl font-bold transition flex items-center justify-center gap-2 border shadow-sm
                ${paymentMethod === 'card'
                  ? 'bg-indigo-600 dark:bg-indigo-700 text-white border-indigo-700 ring-2 ring-indigo-400 dark:ring-indigo-900'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'}`}
            >
              <span>💳</span>
              <span>بطاقة / فيزا</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {renderActionButtons()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default POS;

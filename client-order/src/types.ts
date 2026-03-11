// ==================== Data Types ====================

export interface MenuItem {
    id: number;
    name: string;
    price: number;
    category_id: number | null;
    sub_category_id: number | null;
    main_category_id: number | null;
    is_active: boolean;
    printer: string | null;
    image_url: string | null;
}

export interface Category {
    id: number;
    name: string;
    sub_category_id: number;
    items: MenuItem[];
}

export interface SubCategory {
    id: number;
    name: string;
    main_category_id: number;
    directItems: MenuItem[];
    categories: Category[];
}

export interface MainCategory {
    id: number;
    name: string;
    directItems: MenuItem[];
    subCategories: SubCategory[];
}

export interface DeliveryZone {
    id: number;
    name: string;
    delivery_fee: number;
}

export interface NoteOption {
    id: number;
    name: string;
    price: number;
    is_active?: boolean;
}

export interface CartItem {
    id: number;
    name: string;
    price: number;
    quantity: number;
    notes: string;
    selectedNoteOptions: NoteOption[];
    image_url: string | null;
}

export interface DeliveryAddress {
    street: string;
    building: string;
    floor: string;
    apartment: string;
    landmark: string;
}

export type OrderType = 'Takeaway' | 'Delivery';

export interface CustomerInfo {
    name: string;
    phone: string;
}

export interface OrderFormData {
    orderType: OrderType;
    customer: CustomerInfo;
    deliveryAddress: DeliveryAddress;
    zoneId: number | null;
    paymentMethod: string;
}

export interface OrderResponse {
    success: boolean;
    message: string;
    data: {
        orderId: number;
        orderNo: string;
        salesCenter: string;
        subtotal: number;
        tax: number;
        deliveryFee: number;
        total: number;
        status: string;
    };
}

export interface Settings {
    tax_rate?: string;
    service_charge?: string;
    restaurant_name?: string;
    restaurant_phone?: string;
    restaurant_address?: string;
    currency?: string;
}

export type AppView = 'menu' | 'cart' | 'checkout' | 'confirmation';

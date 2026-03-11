import axios from 'axios';
import type { MainCategory, DeliveryZone, Settings, OrderResponse, NoteOption } from './types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
});

export const publicApi = {
    // Get menu hierarchy
    getMenu: async (): Promise<MainCategory[]> => {
        const res = await api.get('/public/menu');
        return res.data.data;
    },

    // Get delivery zones
    getZones: async (): Promise<DeliveryZone[]> => {
        const res = await api.get('/public/zones');
        return res.data.data;
    },

    // Get settings
    getSettings: async (): Promise<Settings> => {
        const res = await api.get('/public/settings');
        return res.data.data;
    },

    // Get note options
    getNoteOptions: async (): Promise<NoteOption[]> => {
        const res = await api.get('/public/note-options');
        return res.data.data;
    },

    // Place order
    placeOrder: async (orderData: {
        salesCenter: string;
        customerName: string;
        customerPhone: string;
        deliveryAddress?: {
            street: string;
            building: string;
            floor: string;
            apartment: string;
            landmark: string;
        };
        zoneId?: number | null;
        items: { id: number; quantity: number; notes?: string; name?: string; selectedNoteOptions?: { id: number; name: string; price: number }[] }[];
        paymentMethod: string;
    }): Promise<OrderResponse> => {
        const res = await api.post('/public/orders', orderData);
        return res.data;
    },
};

export default publicApi;

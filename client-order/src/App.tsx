import { useState, useEffect, useCallback } from 'react';
import type {
    MainCategory,
    DeliveryZone,
    CartItem,
    NoteOption,
    Settings,
    OrderFormData,
    AppView,
    OrderResponse,
} from './types';
import { publicApi } from './api';
import Header from './components/Header';
import MenuView from './components/MenuView';
import CartView from './components/CartView';
import CheckoutView from './components/CheckoutView';
import ConfirmationView from './components/ConfirmationView';
import BottomBar from './components/BottomBar';
import Toast from './components/Toast';

export default function App() {
    // Data state
    const [menu, setMenu] = useState<MainCategory[]>([]);
    const [zones, setZones] = useState<DeliveryZone[]>([]);
    const [settings, setSettings] = useState<Settings>({});
    const [noteOptions, setNoteOptions] = useState<NoteOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Cart state
    const [cart, setCart] = useState<CartItem[]>([]);

    // View state
    const [view, setView] = useState<AppView>('menu');

    // Order form state
    const [orderForm, setOrderForm] = useState<OrderFormData>({
        orderType: 'Delivery',
        customer: { name: '', phone: '' },
        deliveryAddress: { street: '', building: '', floor: '', apartment: '', landmark: '' },
        zoneId: null,
        paymentMethod: 'cash',
    });

    // Confirmation state
    const [orderResult, setOrderResult] = useState<OrderResponse | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Toast
    const [toast, setToast] = useState<string | null>(null);

    // Load data on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [menuData, zonesData, settingsData, noteOptsData] = await Promise.all([
                    publicApi.getMenu(),
                    publicApi.getZones(),
                    publicApi.getSettings(),
                    publicApi.getNoteOptions(),
                ]);
                setMenu(menuData);
                setZones(zonesData);
                setSettings(settingsData);
                setNoteOptions(noteOptsData.filter((o: NoteOption) => o.is_active !== false));
            } catch (err: any) {
                console.error('Failed to load data:', err);
                setError('فشل تحميل القائمة. يرجى المحاولة مرة أخرى.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Cart helpers
    const addToCart = useCallback((item: CartItem) => {
        setCart((prev) => {
            const existing = prev.find((c) => c.id === item.id);
            if (existing) {
                return prev.map((c) =>
                    c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
                );
            }
            return [...prev, { ...item, quantity: 1 }];
        });
        showToast(`تمت إضافة "${item.name}" إلى السلة`);
    }, []);

    const updateQuantity = useCallback((id: number, delta: number) => {
        setCart((prev) => {
            const item = prev.find((c) => c.id === id);
            if (!item) return prev;
            const newQty = item.quantity + delta;
            if (newQty <= 0) return prev.filter((c) => c.id !== id);
            return prev.map((c) => (c.id === id ? { ...c, quantity: newQty } : c));
        });
    }, []);

    const updateNotes = useCallback((id: number, notes: string, selectedNoteOptions?: NoteOption[]) => {
        setCart((prev) =>
            prev.map((c) => (c.id === id ? { ...c, notes, ...(selectedNoteOptions !== undefined ? { selectedNoteOptions } : {}) } : c))
        );
    }, []);

    const removeFromCart = useCallback((id: number) => {
        setCart((prev) => prev.filter((c) => c.id !== id));
    }, []);

    const clearCart = useCallback(() => {
        setCart([]);
    }, []);

    // Totals
    const subtotal = cart.reduce((s, i) => {
        const optsTotal = (i.selectedNoteOptions || []).reduce((os, o) => os + Number(o.price), 0);
        return s + (i.price + optsTotal) * i.quantity;
    }, 0);
    const taxRate = settings.tax_rate ? parseFloat(settings.tax_rate) / 100 : 0.14;
    const tax = subtotal * taxRate;
    const selectedZone = zones.find((z) => z.id === orderForm.zoneId);
    const deliveryFee =
        orderForm.orderType === 'Delivery' && selectedZone
            ? parseFloat(String(selectedZone.delivery_fee))
            : 0;
    const total = subtotal + tax + deliveryFee;

    const currencyMap: Record<string, string> = { EGP: 'ج.م', SAR: 'ر.س', USD: '$', EUR: '€' };
    const currency = currencyMap[settings.currency || 'EGP'] || settings.currency || 'ج.م';

    const formatPrice = (price: number) =>
        `${price.toFixed(2)} ${currency}`;

    // Submit order
    const submitOrder = async () => {
        setSubmitting(true);
        try {
            const result = await publicApi.placeOrder({
                salesCenter: orderForm.orderType,
                customerName: orderForm.customer.name,
                customerPhone: orderForm.customer.phone,
                deliveryAddress:
                    orderForm.orderType === 'Delivery'
                        ? orderForm.deliveryAddress
                        : undefined,
                zoneId:
                    orderForm.orderType === 'Delivery' ? orderForm.zoneId : undefined,
                items: cart.map((c) => ({
                    id: c.id,
                    quantity: c.quantity,
                    notes: c.notes || undefined,
                    name: c.name,
                    selectedNoteOptions: (c.selectedNoteOptions || []).map((o) => ({
                        id: o.id,
                        name: o.name,
                        price: Number(o.price),
                    })),
                })),
                paymentMethod: orderForm.paymentMethod,
            });
            setOrderResult(result);
            setView('confirmation');
            clearCart();
        } catch (err: any) {
            const msg =
                err?.response?.data?.error || 'فشل إرسال الطلب. يرجى المحاولة مرة أخرى.';
            showToast(msg);
        } finally {
            setSubmitting(false);
        }
    };

    // Toast helper
    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    // New order
    const startNewOrder = () => {
        setView('menu');
        setOrderResult(null);
        setOrderForm({
            orderType: 'Delivery',
            customer: { name: '', phone: '' },
            deliveryAddress: { street: '', building: '', floor: '', apartment: '', landmark: '' },
            zoneId: null,
            paymentMethod: 'cash',
        });
    };

    if (loading) {
        return (
            <div className="app-container">
                <Header cartCount={0} onCartClick={() => { }} />
                <div className="main-content">
                    <div className="loading-container">
                        <div className="spinner" />
                        <p>جاري تحميل القائمة...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="app-container">
                <Header cartCount={0} onCartClick={() => { }} />
                <div className="main-content">
                    <div className="error-container">
                        <h2>⚠️</h2>
                        <p>{error}</p>
                        <button className="btn btn-primary" onClick={() => window.location.reload()}>
                            إعادة المحاولة
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <Header
                cartCount={cart.reduce((s, i) => s + i.quantity, 0)}
                onCartClick={() => setView(view === 'cart' ? 'menu' : 'cart')}
                showBack={view !== 'menu'}
                onBack={() =>
                    setView(
                        view === 'checkout' ? 'cart' : view === 'cart' ? 'menu' : 'menu'
                    )
                }
                view={view}
                restaurantName={settings.restaurant_name}
            />

            {view === 'menu' && (
                <div className="hero-banner">
                    <h2 className="hero-title">{settings.restaurant_name || 'الواحي | EL Wahy'}</h2>
                    <p className="hero-subtitle">اختر وجبتك المفضلة واطلب الآن — توصيل أو تيك أواي</p>
                    <div className="hero-badge">🕐 متاح الآن · توصيل وتيك أواي</div>
                </div>
            )}

            <div className={`main-content ${view === 'menu' && cart.length > 0 ? 'has-bottom-bar' : ''}`}>
                {view === 'menu' && (
                    <MenuView
                        menu={menu}
                        cart={cart}
                        onAddToCart={addToCart}
                        onUpdateQuantity={updateQuantity}
                        formatPrice={formatPrice}
                    />
                )}

                {view === 'cart' && (
                    <CartView
                        cart={cart}
                        onUpdateQuantity={updateQuantity}
                        onUpdateNotes={updateNotes}
                        onRemoveItem={removeFromCart}
                        onClearCart={clearCart}
                        subtotal={subtotal}
                        tax={tax}
                        deliveryFee={deliveryFee}
                        total={total}
                        formatPrice={formatPrice}
                        orderType={orderForm.orderType}
                        onCheckout={() => setView('checkout')}
                        noteOptions={noteOptions}
                        currency={currency}
                    />
                )}

                {view === 'checkout' && (
                    <CheckoutView
                        orderForm={orderForm}
                        onFormChange={setOrderForm}
                        zones={zones}
                        cart={cart}
                        subtotal={subtotal}
                        tax={tax}
                        deliveryFee={deliveryFee}
                        total={total}
                        formatPrice={formatPrice}
                        onSubmit={submitOrder}
                        submitting={submitting}
                    />
                )}

                {view === 'confirmation' && orderResult && (
                    <ConfirmationView
                        order={orderResult}
                        formatPrice={formatPrice}
                        onNewOrder={startNewOrder}
                    />
                )}
            </div>

            {view === 'menu' && cart.length > 0 && (
                <BottomBar
                    itemCount={cart.reduce((s, i) => s + i.quantity, 0)}
                    total={total}
                    formatPrice={formatPrice}
                    onViewCart={() => setView('cart')}
                />
            )}

            {toast && <Toast message={toast} />}
        </div>
    );
}

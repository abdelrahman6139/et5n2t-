import { useState } from 'react';
import { User, Phone, MapPin, Truck, CreditCard, CheckCircle } from 'lucide-react';
import type { CartItem, DeliveryZone, OrderFormData } from '../types';

interface CheckoutViewProps {
    orderForm: OrderFormData;
    onFormChange: (form: OrderFormData) => void;
    zones: DeliveryZone[];
    cart: CartItem[];
    subtotal: number;
    tax: number;
    deliveryFee: number;
    total: number;
    formatPrice: (price: number) => string;
    onSubmit: () => void;
    submitting: boolean;
}

export default function CheckoutView({
    orderForm,
    onFormChange,
    zones,
    cart,
    subtotal,
    tax,
    deliveryFee,
    total,
    formatPrice,
    onSubmit,
    submitting,
}: CheckoutViewProps) {
    const [errors, setErrors] = useState<Record<string, string>>({});

    const update = (key: string, value: any) => {
        onFormChange({ ...orderForm, [key]: value });
        if (errors[key]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
        }
    };

    const updateCustomer = (key: string, value: string) => {
        onFormChange({
            ...orderForm,
            customer: { ...orderForm.customer, [key]: value },
        });
        if (errors[`customer.${key}`]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[`customer.${key}`];
                return next;
            });
        }
    };

    const updateAddress = (key: string, value: string) => {
        onFormChange({
            ...orderForm,
            deliveryAddress: { ...orderForm.deliveryAddress, [key]: value },
        });
        if (errors[`address.${key}`]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[`address.${key}`];
                return next;
            });
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!orderForm.customer.name.trim()) {
            newErrors['customer.name'] = 'الاسم مطلوب';
        }
        if (!orderForm.customer.phone.trim()) {
            newErrors['customer.phone'] = 'رقم الهاتف مطلوب';
        } else if (orderForm.customer.phone.trim().length < 8) {
            newErrors['customer.phone'] = 'رقم هاتف غير صالح';
        }

        if (orderForm.orderType === 'Delivery') {
            if (!orderForm.zoneId) {
                newErrors['zoneId'] = 'يرجى اختيار منطقة التوصيل';
            }
            if (!orderForm.deliveryAddress.street.trim()) {
                newErrors['address.street'] = 'الشارع مطلوب';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validate()) {
            onSubmit();
        }
    };

    const selectedZone = zones.find((z) => z.id === orderForm.zoneId);

    return (
        <div className="checkout-container">
            {/* Order Type */}
            <div className="checkout-section">
                <div className="checkout-section-title">
                    <Truck size={20} />
                    نوع الطلب
                </div>
                <div className="order-type-bar">
                    <button
                        className={`order-type-btn ${orderForm.orderType === 'Delivery' ? 'active' : ''}`}
                        onClick={() => update('orderType', 'Delivery')}
                    >
                        <span className="type-emoji">🛵</span>
                        توصيل
                    </button>
                    <button
                        className={`order-type-btn ${orderForm.orderType === 'Takeaway' ? 'active' : ''}`}
                        onClick={() => update('orderType', 'Takeaway')}
                    >
                        <span className="type-emoji">🥡</span>
                        تيك أواي
                    </button>
                </div>
            </div>

            {/* Customer Info */}
            <div className="checkout-section">
                <div className="checkout-section-title">
                    <User size={20} />
                    بيانات العميل
                </div>

                <div className="form-group">
                    <label className="form-label">
                        <span className="required">*</span>
                        الاسم
                    </label>
                    <input
                        type="text"
                        className={`form-input ${errors['customer.name'] ? 'error' : ''}`}
                        placeholder="الاسم الكامل"
                        value={orderForm.customer.name}
                        onChange={(e) => updateCustomer('name', e.target.value)}
                    />
                    {errors['customer.name'] && (
                        <div className="form-error">{errors['customer.name']}</div>
                    )}
                </div>

                <div className="form-group">
                    <label className="form-label">
                        <span className="required">*</span>
                        رقم الهاتف
                    </label>
                    <input
                        type="tel"
                        className={`form-input ${errors['customer.phone'] ? 'error' : ''}`}
                        placeholder="01xxxxxxxxx"
                        value={orderForm.customer.phone}
                        onChange={(e) => updateCustomer('phone', e.target.value)}
                        dir="ltr"
                        style={{ textAlign: 'right' }}
                    />
                    {errors['customer.phone'] && (
                        <div className="form-error">{errors['customer.phone']}</div>
                    )}
                </div>
            </div>

            {/* Delivery Region & Address */}
            {orderForm.orderType === 'Delivery' && (
                <div className="checkout-section">
                    <div className="checkout-section-title">
                        <MapPin size={20} />
                        عنوان التوصيل
                    </div>

                    {/* Zone selector */}
                    <div className="form-group">
                        <label className="form-label">
                            <span className="required">*</span>
                            منطقة التوصيل
                        </label>
                        <div className="zone-selector">
                            {zones.map((zone) => (
                                <div
                                    key={zone.id}
                                    className={`zone-option ${orderForm.zoneId === zone.id ? 'selected' : ''}`}
                                    onClick={() => update('zoneId', zone.id)}
                                >
                                    <div className="zone-name">{zone.name}</div>
                                    <div className="zone-fee">
                                        {formatPrice(parseFloat(String(zone.delivery_fee)))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {errors['zoneId'] && (
                            <div className="form-error">{errors['zoneId']}</div>
                        )}
                    </div>

                    {/* Address form */}
                    <div className="form-group">
                        <label className="form-label">
                            <span className="required">*</span>
                            الشارع
                        </label>
                        <input
                            type="text"
                            className={`form-input ${errors['address.street'] ? 'error' : ''}`}
                            placeholder="اسم الشارع"
                            value={orderForm.deliveryAddress.street}
                            onChange={(e) => updateAddress('street', e.target.value)}
                        />
                        {errors['address.street'] && (
                            <div className="form-error">{errors['address.street']}</div>
                        )}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">المبنى / العمارة</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="رقم المبنى"
                                value={orderForm.deliveryAddress.building}
                                onChange={(e) => updateAddress('building', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">الطابق</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="رقم الطابق"
                                value={orderForm.deliveryAddress.floor}
                                onChange={(e) => updateAddress('floor', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">الشقة</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="رقم الشقة"
                                value={orderForm.deliveryAddress.apartment}
                                onChange={(e) => updateAddress('apartment', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">علامة مميزة</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="بالقرب من..."
                                value={orderForm.deliveryAddress.landmark}
                                onChange={(e) => updateAddress('landmark', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Method */}
            <div className="checkout-section">
                <div className="checkout-section-title">
                    <CreditCard size={20} />
                    طريقة الدفع
                </div>
                <div
                    className={`payment-option ${orderForm.paymentMethod === 'cash' ? 'selected' : ''}`}
                    onClick={() => update('paymentMethod', 'cash')}
                >
                    <span className="payment-icon">💵</span>
                    <div>
                        <div className="payment-title">نقدي</div>
                        <div className="payment-desc">الدفع عند الاستلام</div>
                    </div>
                </div>
            </div>

            {/* Order Summary */}
            <div className="checkout-section">
                <div className="checkout-section-title">ملخص الطلب</div>

                {cart.map((item) => (
                    <div key={item.id} className="checkout-item-row">
                        <span className="checkout-item-name">
                            {item.name}
                            <span className="item-qty">× {item.quantity}</span>
                        </span>
                        <span className="checkout-item-price">
                            {formatPrice(item.price * item.quantity)}
                        </span>
                    </div>
                ))}

                <div className="cart-summary" style={{ border: 'none', padding: '0.75rem 0 0', boxShadow: 'none', background: 'transparent' }}>
                    <div className="cart-summary-row">
                        <span className="cart-summary-label">المجموع الفرعي</span>
                        <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="cart-summary-row">
                        <span className="cart-summary-label">الضريبة</span>
                        <span>{formatPrice(tax)}</span>
                    </div>
                    {orderForm.orderType === 'Delivery' && (
                        <div className="cart-summary-row">
                            <span className="cart-summary-label">رسوم التوصيل</span>
                            <span>
                                {selectedZone
                                    ? formatPrice(parseFloat(String(selectedZone.delivery_fee)))
                                    : '—'}
                            </span>
                        </div>
                    )}
                    <div className="cart-summary-row total">
                        <span>الإجمالي</span>
                        <span>{formatPrice(total)}</span>
                    </div>
                </div>
            </div>

            {/* Submit */}
            <button
                className="btn btn-success btn-lg"
                onClick={handleSubmit}
                disabled={submitting || cart.length === 0}
                style={{ marginBottom: '2.5rem' }}
            >
                {submitting ? (
                    <>
                        <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2, margin: 0 }} />
                        جاري إرسال الطلب...
                    </>
                ) : (
                    <>
                        <CheckCircle size={20} />
                        تأكيد الطلب — {formatPrice(total)}
                    </>
                )}
            </button>
        </div>
    );
}

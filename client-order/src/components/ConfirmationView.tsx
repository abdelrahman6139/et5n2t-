import { CheckCircle, RotateCcw } from 'lucide-react';
import type { OrderResponse } from '../types';

interface ConfirmationViewProps {
    order: OrderResponse;
    formatPrice: (price: number) => string;
    onNewOrder: () => void;
}

export default function ConfirmationView({
    order,
    formatPrice,
    onNewOrder,
}: ConfirmationViewProps) {
    const data = order.data;
    const orderTypeLabel = data.salesCenter === 'Delivery' ? 'توصيل' : 'تيك أواي';

    return (
        <div className="confirmation">
            <div className="confirmation-icon">
                <CheckCircle size={42} />
            </div>

            <h2>تم استلام طلبك بنجاح! 🎉</h2>
            <p>شكراً لاختيارك الواحي — سيتم تجهيز طلبك في أقرب وقت</p>

            <div className="order-number">{data.orderNo}</div>

            <div className="confirmation-details">
                <div className="confirmation-detail-row">
                    <span className="confirmation-detail-label">رقم الطلب</span>
                    <span className="confirmation-detail-value">{data.orderNo}</span>
                </div>
                <div className="confirmation-detail-row">
                    <span className="confirmation-detail-label">نوع الطلب</span>
                    <span className="confirmation-detail-value">{orderTypeLabel}</span>
                </div>
                <div className="confirmation-detail-row">
                    <span className="confirmation-detail-label">المجموع الفرعي</span>
                    <span className="confirmation-detail-value">{formatPrice(data.subtotal)}</span>
                </div>
                <div className="confirmation-detail-row">
                    <span className="confirmation-detail-label">الضريبة</span>
                    <span className="confirmation-detail-value">{formatPrice(data.tax)}</span>
                </div>
                {data.deliveryFee > 0 && (
                    <div className="confirmation-detail-row">
                        <span className="confirmation-detail-label">رسوم التوصيل</span>
                        <span className="confirmation-detail-value">{formatPrice(data.deliveryFee)}</span>
                    </div>
                )}
                <div className="confirmation-detail-row grand-total">
                    <span className="confirmation-detail-label">الإجمالي</span>
                    <span className="confirmation-detail-value">{formatPrice(data.total)}</span>
                </div>
            </div>

            <button className="btn btn-primary btn-lg" onClick={onNewOrder}>
                <RotateCcw size={20} />
                طلب جديد
            </button>
        </div>
    );
}

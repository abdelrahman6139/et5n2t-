import { ShoppingCart } from 'lucide-react';

interface BottomBarProps {
    itemCount: number;
    total: number;
    formatPrice: (price: number) => string;
    onViewCart: () => void;
}

export default function BottomBar({ itemCount, total, formatPrice, onViewCart }: BottomBarProps) {
    return (
        <div className="bottom-bar">
            <div className="bottom-bar-info">
                <div className="bottom-bar-count">{itemCount} عنصر في السلة</div>
                <div className="bottom-bar-total">{formatPrice(total)}</div>
            </div>
            <button className="btn btn-primary" style={{ width: 'auto', padding: '0.8rem 1.75rem' }} onClick={onViewCart}>
                <ShoppingCart size={18} />
                عرض السلة
            </button>
        </div>
    );
}

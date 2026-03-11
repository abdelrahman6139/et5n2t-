import { ShoppingCart, ArrowRight, UtensilsCrossed } from 'lucide-react';
import type { AppView } from '../types';

interface HeaderProps {
    cartCount: number;
    onCartClick: () => void;
    showBack?: boolean;
    onBack?: () => void;
    view?: AppView;
    restaurantName?: string;
}

export default function Header({
    cartCount,
    onCartClick,
    showBack,
    onBack,
    view,
    restaurantName,
}: HeaderProps) {
    const getTitle = () => {
        switch (view) {
            case 'cart':
                return 'سلة الطلبات';
            case 'checkout':
                return 'إتمام الطلب';
            case 'confirmation':
                return 'تأكيد الطلب';
            default:
                return restaurantName || 'الواحي | EL Wahy';
        }
    };

    return (
        <header className="header">
            <div className="header-right">
                {showBack && view !== 'confirmation' && (
                    <button className="back-btn" onClick={onBack} aria-label="رجوع">
                        <ArrowRight size={18} />
                    </button>
                )}
                <h1 className="header-title">
                    <UtensilsCrossed size={20} className="logo-icon" />
                    {getTitle()}
                </h1>
            </div>

            {view !== 'confirmation' && (
                <button className="header-cart-btn" onClick={onCartClick} aria-label="السلة">
                    <ShoppingCart size={17} />
                    السلة
                    {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                </button>
            )}
        </header>
    );
}

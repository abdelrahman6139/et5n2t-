import { useState, useMemo } from 'react';
import { Search, Plus, Minus, X } from 'lucide-react';
import type { MainCategory, CartItem, MenuItem } from '../types';

interface MenuViewProps {
    menu: MainCategory[];
    cart: CartItem[];
    onAddToCart: (item: CartItem) => void;
    onUpdateQuantity: (id: number, delta: number) => void;
    formatPrice: (price: number) => string;
}

export default function MenuView({
    menu,
    cart,
    onAddToCart,
    onUpdateQuantity,
    formatPrice,
}: MenuViewProps) {
    const [activeCategory, setActiveCategory] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Flatten all items for search
    const allItems = useMemo(() => {
        const items: MenuItem[] = [];
        menu.forEach((main) => {
            if (main.directItems) items.push(...main.directItems);
            main.subCategories?.forEach((sub) => {
                if (sub.directItems) items.push(...sub.directItems);
                sub.categories?.forEach((cat) => {
                    if (cat.items) items.push(...cat.items);
                });
            });
        });
        return items;
    }, [menu]);

    // Filter items based on search and category
    const filteredMenu = useMemo(() => {
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            const filtered = allItems.filter((item) =>
                item.name.toLowerCase().includes(q)
            );
            return [
                {
                    id: -99,
                    name: `نتائج البحث (${filtered.length})`,
                    directItems: filtered,
                    subCategories: [],
                },
            ] as MainCategory[];
        }

        if (activeCategory !== null) {
            return menu.filter((m) => m.id === activeCategory);
        }

        return menu.filter((m) => m.id !== -1 || allItems.some((i) => !i.main_category_id));
    }, [menu, activeCategory, searchQuery, allItems]);

    const getCartQty = (itemId: number) => {
        const cartItem = cart.find((c) => c.id === itemId);
        return cartItem?.quantity || 0;
    };

    const handleItemClick = (item: MenuItem) => {
        const qty = getCartQty(item.id);
        if (qty === 0) {
            onAddToCart({
                id: item.id,
                name: item.name,
                price: parseFloat(String(item.price)),
                quantity: 1,
                notes: '',
                selectedNoteOptions: [],
                image_url: item.image_url,
            });
        }
    };

    const renderMenuItem = (item: MenuItem) => {
        const qty = getCartQty(item.id);
        return (
            <div
                key={item.id}
                className={`menu-item-card ${qty > 0 ? 'in-cart' : ''}`}
                onClick={() => handleItemClick(item)}
            >
                {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="menu-item-image" />
                ) : (
                    <div className="menu-item-placeholder">🍽️</div>
                )}
                <div className="menu-item-info">
                    <div className="menu-item-name">{item.name}</div>
                    <div className="menu-item-price">
                        {formatPrice(parseFloat(String(item.price)))}
                    </div>
                </div>
                {qty > 0 ? (
                    <div className="quantity-controls" onClick={(e) => e.stopPropagation()}>
                        <button
                            className={`qty-btn ${qty === 1 ? 'remove' : ''}`}
                            onClick={() => onUpdateQuantity(item.id, -1)}
                        >
                            <Minus size={14} />
                        </button>
                        <span className="qty-value">{qty}</span>
                        <button
                            className="qty-btn"
                            onClick={() => onUpdateQuantity(item.id, 1)}
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                ) : (
                    <button
                        className="menu-item-add-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleItemClick(item);
                        }}
                    >
                        <Plus size={18} />
                    </button>
                )}
            </div>
        );
    };

    return (
        <div>
            {/* Search */}
            <div className="search-bar">
                <input
                    type="text"
                    placeholder="ابحث في القائمة..."
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (e.target.value) setActiveCategory(null);
                    }}
                    aria-label="بحث"
                />
                {searchQuery ? (
                    <button
                        className="search-icon"
                        onClick={() => setSearchQuery('')}
                        style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                        aria-label="مسح البحث"
                    >
                        <X size={18} />
                    </button>
                ) : (
                    <Search size={18} className="search-icon" />
                )}
            </div>

            {/* Category chips */}
            <div className="category-nav">
                <button
                    className={`category-chip ${activeCategory === null && !searchQuery ? 'active' : ''}`}
                    onClick={() => {
                        setActiveCategory(null);
                        setSearchQuery('');
                    }}
                >
                    الكل
                </button>
                {menu
                    .filter((m) => m.id !== -1)
                    .map((main) => (
                        <button
                            key={main.id}
                            className={`category-chip ${activeCategory === main.id ? 'active' : ''}`}
                            onClick={() => {
                                setActiveCategory(main.id);
                                setSearchQuery('');
                            }}
                        >
                            {main.name}
                        </button>
                    ))}
            </div>

            {/* Menu items */}
            {filteredMenu.map((mainCat) => {
                const hasItems =
                    (mainCat.directItems && mainCat.directItems.length > 0) ||
                    mainCat.subCategories?.some(
                        (sub) =>
                            (sub.directItems && sub.directItems.length > 0) ||
                            sub.categories?.some((cat) => cat.items && cat.items.length > 0)
                    );

                if (!hasItems) return null;

                return (
                    <div key={mainCat.id} className="menu-section">
                        <h2 className="menu-section-title">{mainCat.name}</h2>

                        {/* Direct items on main category */}
                        {mainCat.directItems && mainCat.directItems.length > 0 && (
                            <div className="menu-grid">
                                {mainCat.directItems.map(renderMenuItem)}
                            </div>
                        )}

                        {/* Sub categories */}
                        {mainCat.subCategories?.map((sub) => {
                            const subHasItems =
                                (sub.directItems && sub.directItems.length > 0) ||
                                sub.categories?.some((cat) => cat.items && cat.items.length > 0);

                            if (!subHasItems) return null;

                            return (
                                <div key={sub.id} className="menu-section">
                                    {mainCat.subCategories!.length > 1 && (
                                        <h3 className="subsection-title">{sub.name}</h3>
                                    )}

                                    {/* Direct items on sub category */}
                                    {sub.directItems && sub.directItems.length > 0 && (
                                        <div className="menu-grid">
                                            {sub.directItems.map(renderMenuItem)}
                                        </div>
                                    )}

                                    {/* Categories */}
                                    {sub.categories?.map((cat) => {
                                        if (!cat.items || cat.items.length === 0) return null;
                                        return (
                                            <div key={cat.id} className="menu-section">
                                                {sub.categories!.length > 1 && (
                                                    <h4 className="subcategory-title">{cat.name}</h4>
                                                )}
                                                <div className="menu-grid">
                                                    {cat.items.map(renderMenuItem)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                );
            })}

            {allItems.length === 0 && (
                <div className="cart-empty">
                    <div className="cart-empty-icon">🍽️</div>
                    <h3>لا توجد عناصر في القائمة حالياً</h3>
                    <p>يرجى المحاولة لاحقاً</p>
                </div>
            )}

            {searchQuery && filteredMenu.length > 0 && filteredMenu[0].directItems?.length === 0 && (
                <div className="cart-empty">
                    <div className="cart-empty-icon">🔍</div>
                    <h3>لا توجد نتائج</h3>
                    <p>جرّب كلمات بحث مختلفة</p>
                </div>
            )}
        </div>
    );
}

import { useState } from 'react';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, X, MessageSquare, Check } from 'lucide-react';
import type { CartItem, OrderType, NoteOption } from '../types';

interface CartViewProps {
    cart: CartItem[];
    onUpdateQuantity: (id: number, delta: number) => void;
    onUpdateNotes: (id: number, notes: string, selectedNoteOptions?: NoteOption[]) => void;
    onRemoveItem: (id: number) => void;
    onClearCart: () => void;
    subtotal: number;
    tax: number;
    deliveryFee: number;
    total: number;
    formatPrice: (price: number) => string;
    orderType: OrderType;
    onCheckout: () => void;
    noteOptions: NoteOption[];
    currency: string;
}

function NoteOptionsModal({
    item,
    noteOptions,
    currency,
    onSave,
    onClose,
}: {
    item: CartItem;
    noteOptions: NoteOption[];
    currency: string;
    onSave: (notes: string, selectedOpts: NoteOption[]) => void;
    onClose: () => void;
}) {
    const [notes, setNotes] = useState(item.notes || '');
    const [selectedOpts, setSelectedOpts] = useState<NoteOption[]>(item.selectedNoteOptions || []);
    const [activeTab, setActiveTab] = useState<'notes' | 'additions'>('notes');

    const toggleOpt = (opt: NoteOption) => {
        setSelectedOpts((prev) =>
            prev.find((o) => o.id === opt.id)
                ? prev.filter((o) => o.id !== opt.id)
                : [...prev, opt]
        );
    };

    const freeOptions = noteOptions.filter((o) => Number(o.price) === 0);
    const paidOptions = noteOptions.filter((o) => Number(o.price) > 0);
    const addedTotal = selectedOpts.reduce((s, o) => s + Number(o.price), 0);
    const selectedCount = selectedOpts.length;
    const freeSelectedCount = selectedOpts.filter((o) => Number(o.price) === 0).length;
    const paidSelectedCount = selectedOpts.filter((o) => Number(o.price) > 0).length;

    return (
        <div className="note-modal-overlay" onClick={onClose}>
            <div className="note-modal" onClick={(e) => e.stopPropagation()}>
                <div className="note-modal-header">
                    <h3>
                        ملاحظات وإضافات: <span className="modal-item-name">{item.name}</span>
                    </h3>
                    <button className="note-modal-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Tab Buttons */}
                <div className="note-modal-tabs">
                    <button
                        className={`note-tab ${activeTab === 'notes' ? 'active notes-active' : ''}`}
                        onClick={() => setActiveTab('notes')}
                    >
                        📝 ملاحظات
                        {freeSelectedCount > 0 && <span className="note-tab-badge free-badge">{freeSelectedCount}</span>}
                    </button>
                    <button
                        className={`note-tab ${activeTab === 'additions' ? 'active additions-active' : ''}`}
                        onClick={() => setActiveTab('additions')}
                    >
                        🍽️ إضافات
                        {paidSelectedCount > 0 && <span className="note-tab-badge paid-badge">{paidSelectedCount}</span>}
                    </button>
                </div>

                <div className="note-modal-body">
                    {/* Notes tab content */}
                    {activeTab === 'notes' && (
                        <>
                            {freeOptions.length > 0 && (
                                <div className="note-section">
                                    <div className="note-options-grid">
                                        {freeOptions.map((opt) => {
                                            const isChecked = !!selectedOpts.find((o) => o.id === opt.id);
                                            return (
                                                <button
                                                    key={opt.id}
                                                    className={`note-option-btn ${isChecked ? 'selected note-free' : ''}`}
                                                    onClick={() => toggleOpt(opt)}
                                                >
                                                    <span className="check-indicator"><Check size={13} strokeWidth={3} /></span>
                                                    <span className="note-option-name">{opt.name}</span>
                                                    <span className="note-option-price free">مجاني</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            <div className="note-section">
                                <h4 className="note-section-title">✏️ ملاحظة خاصة</h4>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    placeholder="مثال: بدون بصل، حار قليلاً..."
                                    className="note-textarea"
                                />
                            </div>
                        </>
                    )}

                    {/* Additions tab content */}
                    {activeTab === 'additions' && paidOptions.length > 0 && (
                        <div className="note-section">
                            <div className="note-options-grid">
                                {paidOptions.map((opt) => {
                                    const isChecked = !!selectedOpts.find((o) => o.id === opt.id);
                                    return (
                                        <button
                                            key={opt.id}
                                            className={`note-option-btn ${isChecked ? 'selected note-paid' : ''}`}
                                            onClick={() => toggleOpt(opt)}
                                        >
                                            <span className="check-indicator"><Check size={13} strokeWidth={3} /></span>
                                            <span className="note-option-name">{opt.name}</span>
                                            <span className="note-option-price paid">+{Number(opt.price).toFixed(2)} {currency}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            {addedTotal > 0 && (
                                <div className="note-additions-total">
                                    💰 إجمالي الإضافات: +{addedTotal.toFixed(2)} {currency}
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'additions' && paidOptions.length === 0 && (
                        <div className="note-section" style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                            <p>لا توجد إضافات متاحة حالياً</p>
                        </div>
                    )}
                </div>

                <div className="note-modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>إلغاء</button>
                    <button className="btn btn-primary" onClick={() => onSave(notes, selectedOpts)}>
                        حفظ {selectedCount > 0 ? `(${selectedCount})` : ''}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function CartView({
    cart,
    onUpdateQuantity,
    onUpdateNotes,
    onRemoveItem,
    onClearCart,
    subtotal,
    tax,
    deliveryFee,
    total,
    formatPrice,
    orderType,
    onCheckout,
    noteOptions,
    currency,
}: CartViewProps) {
    const [modalItemId, setModalItemId] = useState<number | null>(null);
    const modalItem = cart.find((c) => c.id === modalItemId) || null;
    if (cart.length === 0) {
        return (
            <div className="cart-container">
                <div className="cart-empty">
                    <div className="cart-empty-icon">🛒</div>
                    <h3>السلة فارغة</h3>
                    <p>أضف عناصر من القائمة لبدء طلبك</p>
                </div>
            </div>
        );
    }

    return (
        <div className="cart-container">
            <div className="cart-header">
                <h2>
                    <ShoppingBag size={20} />
                    عناصر الطلب ({cart.length})
                </h2>
                <button
                    className="btn btn-secondary"
                    style={{ width: 'auto', fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
                    onClick={onClearCart}
                >
                    <Trash2 size={14} />
                    مسح الكل
                </button>
            </div>

            {cart.map((item) => {
                const optsTotal = (item.selectedNoteOptions || []).reduce((s, o) => s + Number(o.price), 0);
                const itemTotal = (item.price + optsTotal) * item.quantity;
                const hasExtras = item.notes || (item.selectedNoteOptions?.length ?? 0) > 0;
                return (
                    <div key={item.id} className="cart-item">
                        {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="menu-item-image" />
                        ) : (
                            <div className="menu-item-placeholder">🍽️</div>
                        )}
                        <div className="cart-item-info">
                            <div className="cart-item-name">{item.name}</div>
                            <div className="cart-item-price">
                                {formatPrice(item.price)}
                            </div>
                            <div className="cart-item-total">
                                الإجمالي: {formatPrice(itemTotal)}
                            </div>
                            {/* Selected options tags */}
                            {(item.selectedNoteOptions?.length ?? 0) > 0 && (
                                <div className="cart-item-options-tags">
                                    {item.selectedNoteOptions.map((o) => (
                                        <span key={o.id} className={`option-tag ${Number(o.price) > 0 ? 'paid' : 'free'}`}>
                                            {o.name}{Number(o.price) > 0 ? ` +${Number(o.price).toFixed(2)}` : ''}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {item.notes && (
                                <div className="cart-item-free-note">📝 {item.notes}</div>
                            )}
                            <button
                                className={`cart-notes-btn ${hasExtras ? 'has-notes' : ''}`}
                                onClick={() => setModalItemId(item.id)}
                            >
                                <MessageSquare size={14} />
                                {hasExtras ? 'تعديل الملاحظات والإضافات' : 'ملاحظات وإضافات'}
                            </button>
                        </div>
                        <div className="quantity-controls">
                            <button
                                className={`qty-btn ${item.quantity === 1 ? 'remove' : ''}`}
                                onClick={() =>
                                    item.quantity === 1
                                        ? onRemoveItem(item.id)
                                        : onUpdateQuantity(item.id, -1)
                                }
                            >
                                {item.quantity === 1 ? <Trash2 size={14} /> : <Minus size={14} />}
                            </button>
                            <span className="qty-value">{item.quantity}</span>
                            <button className="qty-btn" onClick={() => onUpdateQuantity(item.id, 1)}>
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                );
            })}

            {/* Summary */}
            <div className="cart-summary">
                <div className="cart-summary-row">
                    <span className="cart-summary-label">المجموع الفرعي</span>
                    <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="cart-summary-row">
                    <span className="cart-summary-label">الضريبة</span>
                    <span>{formatPrice(tax)}</span>
                </div>
                {orderType === 'Delivery' && (
                    <div className="cart-summary-row">
                        <span className="cart-summary-label">رسوم التوصيل</span>
                        <span>{deliveryFee > 0 ? formatPrice(deliveryFee) : 'يُحدد عند اختيار المنطقة'}</span>
                    </div>
                )}
                <div className="cart-summary-row total">
                    <span>الإجمالي</span>
                    <span>{formatPrice(total)}</span>
                </div>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
                <button className="btn btn-primary btn-lg" onClick={onCheckout}>
                    <ArrowLeft size={20} />
                    متابعة الطلب
                </button>
            </div>

            {modalItem && (
                <NoteOptionsModal
                    item={modalItem}
                    noteOptions={noteOptions}
                    currency={currency}
                    onSave={(notes, opts) => {
                        onUpdateNotes(modalItem.id, notes, opts);
                        setModalItemId(null);
                    }}
                    onClose={() => setModalItemId(null)}
                />
            )}
        </div>
    );
}

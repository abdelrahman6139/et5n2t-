const fs = require('fs');

const cssContent = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Tajawal:wght@400;500;700&display=swap');

:root {
  --primary-color: #EA580C; /* Flame Orange */
  --primary-hover: #C2410C;
  --secondary-color: #111827;
  --bg-color: #F8F9FA;
  --surface-color: #FFFFFF;
  --text-main: #111827;
  --text-muted: #6B7280;
  --text-light: #9CA3AF;
  --border-color: #E5E7EB;
  --danger-color: #E11D48;
  --success-color: #10B981;
  --border-radius-sm: 8px;
  --border-radius-md: 12px;
  --border-radius-lg: 16px;
  --border-radius-pill: 9999px;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --glass-bg: rgba(255, 255, 255, 0.85);
  --glass-blur: blur(12px);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Cairo', 'Tajawal', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: var(--bg-color);
  color: var(--text-main);
  direction: rtl;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  line-height: 1.5;
}

/* Base Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  font-family: inherit;
  font-weight: 600;
  font-size: 0.875rem;
  border-radius: var(--border-radius-pill);
  border: none;
  cursor: pointer;
  transition: var(--transition-smooth);
  gap: 0.5rem;
  text-decoration: none;
}

.btn:active {
  transform: scale(0.97);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
  box-shadow: 0 4px 14px 0 rgba(234, 88, 12, 0.39);
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-hover);
  box-shadow: 0 6px 20px rgba(234, 88, 12, 0.4);
  transform: translateY(-2px);
}

.btn-secondary {
  background-color: var(--border-color);
  color: var(--text-main);
}

.btn-secondary:hover:not(:disabled) {
  background-color: #D1D5DB;
}

.btn-lg {
  padding: 0.875rem 1.5rem;
  font-size: 1rem;
  width: 100%;
}

/* App Container */
.app-container {
  max-width: 600px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: var(--bg-color);
  position: relative;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-2xl);
}

/* Header */
.header {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border-bottom: 1px solid rgba(0,0,0,0.05);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  font-size: 1.75rem;
  color: var(--primary-color);
}

.header-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: -0.025em;
}

.header-cart-btn {
  position: relative;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition-smooth);
  color: var(--text-main);
}

.header-cart-btn:hover {
  background: var(--bg-color);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.cart-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background-color: var(--danger-color);
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  border: 2px solid var(--surface-color);
}

/* Main Content */
.main-content {
  flex: 1;
  padding-bottom: 80px; /* Space for bottom bar */
}

/* Hero Banner */
.hero-banner {
  padding: 2rem 1.25rem;
  background: linear-gradient(135deg, var(--secondary-color) 0%, #1F2937 100%);
  color: white;
  border-bottom-left-radius: 24px;
  border-bottom-right-radius: 24px;
  position: relative;
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.hero-banner::after {
  content: "";
  position: absolute;
  top: -50%;
  right: -20%;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(234,88,12,0.15) 0%, rgba(255,255,255,0) 70%);
  border-radius: 50%;
}

.hero-content {
  position: relative;
  z-index: 10;
}

.hero-tagline {
  display: inline-block;
  background: rgba(255,255,255,0.1);
  padding: 0.25rem 0.75rem;
  border-radius: var(--border-radius-pill);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1rem;
  backdrop-filter: blur(4px);
}

.hero-title {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 0.5rem;
}

.hero-subtitle {
  font-size: 0.95rem;
  color: #D1D5DB;
  font-weight: 500;
}

/* Search */
.search-container {
  padding: 0 1.25rem;
  margin-top: -1.5rem;
  position: relative;
  z-index: 20;
  margin-bottom: 1.5rem;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  right: 1.25rem;
  color: var(--text-muted);
}

.search-input {
  width: 100%;
  padding: 1rem 1rem 1rem 3rem;
  border-radius: var(--border-radius-pill);
  border: 1px solid var(--border-color);
  background: var(--surface-color);
  font-family: inherit;
  font-size: 0.95rem;
  box-shadow: var(--shadow-md);
  transition: var(--transition-smooth);
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 4px rgba(234, 88, 12, 0.1);
}

/* Category Nav */
.category-nav {
  display: flex;
  overflow-x: auto;
  gap: 0.75rem;
  padding: 0 1.25rem 1rem;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.category-nav::-webkit-scrollbar {
  display: none;
}

.category-chip {
  padding: 0.6rem 1.25rem;
  border-radius: var(--border-radius-pill);
  background: var(--surface-color);
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.875rem;
  white-space: nowrap;
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: var(--transition-smooth);
  box-shadow: var(--shadow-sm);
}

.category-chip:hover {
  background: var(--bg-color);
}

.category-chip.active {
  background: var(--secondary-color);
  color: white;
  border-color: var(--secondary-color);
  box-shadow: 0 4px 10px rgba(17, 24, 39, 0.2);
}

/* Menu Section */
.menu-section {
  padding: 1rem 1.25rem 2rem;
}

.menu-section-title {
  font-size: 1.25rem;
  font-weight: 800;
  margin-bottom: 1rem;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.menu-section-title::before {
  content: '';
  display: block;
  width: 4px;
  height: 20px;
  background: var(--primary-color);
  border-radius: 4px;
}

.menu-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Menu Item Card */
.menu-item-card {
  background: var(--surface-color);
  border-radius: var(--border-radius-lg);
  padding: 0.75rem;
  display: flex;
  gap: 1rem;
  box-shadow: var(--shadow-md);
  border: 1px solid rgba(0,0,0,0.02);
  transition: var(--transition-smooth);
  position: relative;
  overflow: hidden;
}

.menu-item-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg);
}

.menu-item-image {
  width: 100px;
  height: 100px;
  border-radius: var(--border-radius-md);
  object-fit: cover;
  flex-shrink: 0;
  background-color: var(--bg-color);
}

.menu-item-placeholder {
  width: 100px;
  height: 100px;
  border-radius: var(--border-radius-md);
  background: linear-gradient(135deg, #F3F4F6, #E5E7EB);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-light);
  flex-shrink: 0;
}

.menu-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0.25rem 0;
}

.menu-item-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 0.25rem;
  line-height: 1.3;
}

.menu-item-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.menu-item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.menu-item-price {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--primary-color);
}

.currency {
  font-size: 0.75em;
  font-weight: 600;
  margin-left: 2px;
}

.menu-item-add-btn {
  background: var(--surface-color);
  border: 1.5px solid var(--border-color);
  color: var(--text-main);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition-smooth);
}

.menu-item-add-btn:hover {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
  transform: scale(1.1);
}

.menu-item-add-btn.in-cart {
  background: var(--success-color);
  border-color: var(--success-color);
  color: white;
}

/* Cart View */
.cart-view {
  padding: 1.5rem 1.25rem;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.section-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.back-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--text-main);
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
}

.back-btn:hover {
  background: var(--border-color);
}

.cart-header h2 {
  font-size: 1.5rem;
  font-weight: 800;
}

.cart-empty {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-muted);
}

.cart-empty-icon {
  font-size: 4rem;
  color: var(--text-light);
  margin-bottom: 1rem;
  display: block;
}

.cart-empty p {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
}

.cart-items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.cart-item {
  display: flex;
  gap: 1rem;
  background: var(--surface-color);
  padding: 1rem;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
  align-items: center;
}

.cart-item-image {
  width: 70px;
  height: 70px;
  border-radius: var(--border-radius-md);
  object-fit: cover;
}

.cart-item-info {
  flex: 1;
}

.cart-item-name {
  font-weight: 700;
  font-size: 1rem;
  margin-bottom: 0.25rem;
}

.cart-item-price {
  color: var(--primary-color);
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.cart-item-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.qty-control {
  display: flex;
  align-items: center;
  background: var(--bg-color);
  border-radius: var(--border-radius-pill);
  padding: 0.25rem;
}

.qty-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: var(--surface-color);
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-main);
  transition: background 0.2s;
}

.qty-btn:active {
  background: var(--border-color);
}

.qty-text {
  width: 30px;
  text-align: center;
  font-weight: 700;
  font-size: 0.9rem;
}

.cart-item-remove {
  background: none;
  border: none;
  color: var(--danger-color);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: background 0.2s;
}

.cart-item-remove:hover {
  background: #FFF1F2;
}

.cart-summary {
  background: var(--surface-color);
  padding: 1.5rem;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-md);
  margin-bottom: 1.5rem;
}

.cart-summary-line {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  color: var(--text-muted);
  font-size: 0.95rem;
}

.cart-summary-line.total {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px dashed var(--border-color);
  color: var(--text-main);
  font-weight: 800;
  font-size: 1.25rem;
  margin-bottom: 0;
}

/* Checkout View */
.checkout-view {
  padding: 1.5rem 1.25rem;
  animation: slideIn 0.3s ease-out;
}

.checkout-section {
  background: var(--surface-color);
  border-radius: var(--border-radius-lg);
  padding: 1.5rem;
  box-shadow: var(--shadow-md);
  margin-bottom: 1.5rem;
}

.checkout-section h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-main);
}

.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.form-input, .form-select {
  width: 100%;
  padding: 0.875rem 1rem;
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-color);
  font-family: inherit;
  font-size: 0.95rem;
  transition: var(--transition-smooth);
}

.form-input:focus, .form-select:focus {
  outline: none;
  border-color: var(--primary-color);
  background: var(--surface-color);
  box-shadow: 0 0 0 3px rgba(234, 88, 12, 0.1);
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.radio-option {
  display: flex;
  align-items: center;
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: var(--transition-smooth);
}

.radio-option:hover {
  background: var(--bg-color);
}

.radio-option input[type="radio"] {
  margin-left: 0.75rem;
  accent-color: var(--primary-color);
  width: 1.25rem;
  height: 1.25rem;
}

.radio-option span {
  font-weight: 600;
}

/* Confirmation View */
.confirmation-view {
  padding: 3rem 1.25rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: slideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.confirmation-icon {
  width: 80px;
  height: 80px;
  background: var(--success-color);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
}

.confirmation-view h2 {
  font-size: 1.75rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
}

.confirmation-view p {
  color: var(--text-muted);
  margin-bottom: 2rem;
}

.confirmation-card {
  background: var(--surface-color);
  border-radius: var(--border-radius-lg);
  padding: 1.5rem;
  width: 100%;
  box-shadow: var(--shadow-lg);
  margin-bottom: 2rem;
  text-align: right;
}

.order-number {
  font-family: monospace;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--primary-color);
  background: rgba(234, 88, 12, 0.1);
  padding: 0.5rem 1rem;
  border-radius: var(--border-radius-sm);
  display: inline-block;
  margin-bottom: 1.5rem;
  letter-spacing: 2px;
}

.confirmation-details {
  border-top: 1px solid var(--border-color);
  padding-top: 1rem;
}

.confirmation-detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
}

.confirmation-detail-row span:first-child {
  color: var(--text-muted);
}

.confirmation-detail-row span:last-child {
  font-weight: 600;
  color: var(--text-main);
}

/* Bottom Bar */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  padding: 1rem 1.25rem;
  border-top: 1px solid rgba(0,0,0,0.05);
  z-index: 50;
  display: flex;
  justify-content: center;
}

.bottom-bar-content {
  width: 100%;
  max-width: 600px;
  display: flex;
  gap: 1rem;
  align-items: center;
}

.bottom-cart-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.bottom-cart-info .total {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--primary-color);
}

.bottom-cart-info .items {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 600;
}

.bottom-cart-btn {
  flex: 2;
  box-shadow: 0 4px 14px 0 rgba(234, 88, 12, 0.39);
}

/* Utilities */
.text-center { text-align: center; }
.mt-1 { margin-top: 0.25rem; }
.mt-2 { margin-top: 0.5rem; }
.mt-4 { margin-top: 1rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-4 { margin-bottom: 1rem; }
.w-full { width: 100%; }
.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.gap-2 { gap: 0.5rem; }
`;

fs.writeFileSync('c:\\work\\ADD_WEBPAGE\\deliv_app_VOL2\\client-order\\src\\styles\\index.css', cssContent);
console.log('CSS file successfully overwritten.');

// Generate unique order ID
export const generateOrderId = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${year}${month}${day}-${random}`;
};

// Calculate order totals
export const calculateOrderTotals = (items, orderType, deliveryFee = 0, taxRate = 0.14, serviceChargeRate = 0.12) => {
  const subtotal = items.reduce((sum, item) => {
    const modifiersTotal = (item.selectedNoteOptions || []).reduce((s, n) => s + parseFloat(n.price || 0), 0);
    return sum + ((parseFloat(item.price) + modifiersTotal) * parseFloat(item.quantity));
  }, 0);

  // If orderType is NOT DineIn, force service charge to 0 regardless of rate passed
  const appliedServiceChargeRate = (orderType === 'صالة' || orderType === 'DineIn') ? serviceChargeRate : 0;

  const tax = subtotal * taxRate;
  const serviceCharge = subtotal * appliedServiceChargeRate;
  const total = subtotal + tax + serviceCharge + deliveryFee;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    serviceCharge: parseFloat(serviceCharge.toFixed(2)),
    deliveryFee: parseFloat(deliveryFee.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  };
};

// Format response
export const successResponse = (data, message = 'Success') => {
  return { success: true, message, data };
};

export const errorResponse = (message, statusCode = 500) => {
  return { success: false, error: message, statusCode };
};
import express from 'express';
import pool from '../db.js';
import { generateOrderId, calculateOrderTotals } from '../utils/helpers.js';

const router = express.Router();

// ==================== PUBLIC MENU ====================
// Returns the full menu hierarchy (no auth required)
router.get('/menu', async (req, res) => {
    try {
        const mainCategoriesResult = await pool.query(
            'SELECT * FROM main_categories ORDER BY name'
        );
        const subCategoriesResult = await pool.query(
            'SELECT * FROM sub_categories ORDER BY main_category_id, name'
        );
        const categoriesResult = await pool.query(
            'SELECT * FROM categories ORDER BY sub_category_id, name'
        );
        const menuItemsResult = await pool.query(
            "SELECT * FROM menu_items WHERE is_active = true ORDER BY name"
        );

        const allItems = menuItemsResult.rows;

        const hierarchy = mainCategoriesResult.rows.map(mainCat => ({
            ...mainCat,
            directItems: allItems.filter(item =>
                item.main_category_id == mainCat.id && !item.sub_category_id && !item.category_id
            ),
            subCategories: subCategoriesResult.rows
                .filter(subCat => subCat.main_category_id == mainCat.id)
                .map(subCat => ({
                    ...subCat,
                    directItems: allItems.filter(item =>
                        item.sub_category_id == subCat.id && !item.category_id
                    ),
                    categories: categoriesResult.rows
                        .filter(cat => cat.sub_category_id == subCat.id)
                        .map(cat => ({
                            ...cat,
                            items: allItems.filter(item => item.category_id == cat.id)
                        }))
                }))
        }));

        res.json({ success: true, data: hierarchy });
    } catch (error) {
        console.error('Public menu error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch menu' });
    }
});

// ==================== PUBLIC ZONES ====================
router.get('/zones', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, delivery_fee FROM delivery_zones ORDER BY name'
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Public zones error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch zones' });
    }
});

// ==================== PUBLIC SETTINGS ====================
router.get('/settings', async (req, res) => {
    try {
        const result = await pool.query('SELECT key, value FROM settings');
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.json({ success: true, data: settings });
    } catch (error) {
        console.error('Public settings error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch settings' });
    }
});

// ==================== PUBLIC NOTE OPTIONS ====================
router.get('/note-options', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM note_options WHERE is_active = true ORDER BY id'
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Public note options error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch note options' });
    }
});

// ==================== PUBLIC ORDER PLACEMENT ====================
router.post('/orders', async (req, res) => {
    const client = await pool.connect();
    try {
        const { salesCenter, customerName, customerPhone, deliveryAddress, zoneId, items, paymentMethod } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, error: 'No items in order' });
        }

        await client.query('BEGIN');

        // Find or create customer by phone
        let customerId = null;
        if (customerPhone) {
            const existingCustomer = await client.query(
                'SELECT id FROM customers WHERE phone = $1',
                [customerPhone]
            );
            if (existingCustomer.rows.length > 0) {
                customerId = existingCustomer.rows[0].id;
                // Update name if provided
                if (customerName) {
                    const nameParts = customerName.trim().split(/\s+/);
                    const firstName = nameParts[0] || '';
                    const lastName = nameParts.slice(1).join(' ') || '';
                    await client.query(
                        'UPDATE customers SET first_name = $1, last_name = $2, updated_at = NOW() WHERE id = $3',
                        [firstName, lastName, customerId]
                    );
                }
            } else {
                const nameParts = (customerName || '').trim().split(/\s+/);
                const firstName = nameParts[0] || 'عميل';
                const lastName = nameParts.slice(1).join(' ') || 'ويب';
                const newCustomer = await client.query(
                    'INSERT INTO customers (phone, first_name, last_name) VALUES ($1, $2, $3) RETURNING id',
                    [customerPhone, firstName, lastName]
                );
                customerId = newCustomer.rows[0].id;
            }
        }

        // Look up delivery fee from zone if applicable
        let deliveryFee = 0;
        if (salesCenter === 'Delivery' && zoneId) {
            const zoneResult = await client.query('SELECT delivery_fee FROM delivery_zones WHERE id = $1', [zoneId]);
            if (zoneResult.rows.length > 0) {
                deliveryFee = parseFloat(zoneResult.rows[0].delivery_fee) || 0;
            }
        }

        // Look up tax rate from settings
        const taxResult = await client.query("SELECT value FROM settings WHERE key = 'tax_rate'");
        const taxRate = taxResult.rows.length > 0 ? parseFloat(taxResult.rows[0].value) / 100 : 0;

        // Get menu item prices from DB
        const itemIds = items.map(i => i.id);
        const menuResult = await client.query(
            'SELECT id, price, name FROM menu_items WHERE id = ANY($1)',
            [itemIds]
        );
        const priceMap = {};
        menuResult.rows.forEach(row => { priceMap[row.id] = row; });

        // Build items with real prices
        const orderItems = items.map(item => ({
            ...item,
            price: priceMap[item.id]?.price || 0,
            name: priceMap[item.id]?.name || item.name || '',
        }));

        // Calculate totals
        const totals = calculateOrderTotals(orderItems, salesCenter, deliveryFee, taxRate, 0);

        const orderId = generateOrderId();

        // Build address string
        const addressStr = deliveryAddress
            ? [deliveryAddress.street, deliveryAddress.building, deliveryAddress.floor, deliveryAddress.apartment, deliveryAddress.landmark]
                .filter(Boolean).join(', ')
            : '';

        // Insert order
        const orderResult = await client.query(
            `INSERT INTO orders (
        user_facing_id, order_no, sales_center, status,
        subtotal, tax, delivery_fee, service_charge,
        payment_method, customer_address, customer_phone, customer_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *`,
            [
                orderId, orderId, salesCenter, 'Pending',
                totals.subtotal, totals.tax, totals.deliveryFee, totals.serviceCharge,
                paymentMethod || 'cash', addressStr, customerPhone || '', customerId
            ]
        );

        const order = orderResult.rows[0];

        // Insert order items (with note option support)
        for (const item of orderItems) {
            const basePrice = parseFloat(item.price);
            const itemQuantity = parseInt(item.quantity);

            // Validate & load selected note options from DB (never trust client prices)
            let modifierTotal = 0;
            const noteOptionSnapshots = [];
            const selectedNoteOpts = item.selectedNoteOptions || [];
            if (selectedNoteOpts.length > 0) {
                const noteIds = selectedNoteOpts.map(n => parseInt(n.id)).filter(Boolean);
                if (noteIds.length > 0) {
                    const noteRes = await client.query(
                        'SELECT id, name, price FROM note_options WHERE id = ANY($1) AND is_active = TRUE',
                        [noteIds]
                    );
                    for (const no of noteRes.rows) {
                        modifierTotal += parseFloat(no.price);
                        noteOptionSnapshots.push({ id: no.id, name: no.name, price: parseFloat(no.price) });
                    }
                }
            }

            const effectivePrice = basePrice + modifierTotal;
            const lineTotal = effectivePrice * itemQuantity;

            const orderItemResult = await client.query(
                `INSERT INTO order_items (order_id, item_id, name_snapshot, quantity, price, total, price_at_order, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
                [order.id, item.id, item.name, itemQuantity, effectivePrice, lineTotal, basePrice, item.notes || '']
            );

            // Insert note option snapshots into order_item_note_options
            const orderItemId = orderItemResult.rows[0].id;
            for (const no of noteOptionSnapshots) {
                await client.query(
                    `INSERT INTO order_item_note_options (order_item_id, note_option_id, name_snapshot, price_snapshot)
                     VALUES ($1, $2, $3, $4)`,
                    [orderItemId, no.id, no.name, no.price]
                );
            }
        }

        // Recalculate real totals from DB-verified order_items
        const realItemsRes = await client.query(
            'SELECT SUM(total) AS real_subtotal FROM order_items WHERE order_id = $1',
            [order.id]
        );
        const realSubtotal = parseFloat(realItemsRes.rows[0].real_subtotal) || 0;
        const realTax = realSubtotal * taxRate;
        const realTotal = realSubtotal + realTax + deliveryFee;

        await client.query(
            'UPDATE orders SET subtotal = $1, tax = $2, total = $3 WHERE id = $4',
            [realSubtotal, realTax, realTotal, order.id]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'تم استلام طلبك بنجاح',
            data: {
                orderId: order.id,
                orderNo: orderId,
                salesCenter,
                subtotal: realSubtotal,
                tax: realTax,
                deliveryFee,
                total: realTotal,
                status: 'Pending',
            },
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Public order error:', error);
        res.status(500).json({ success: false, error: 'Failed to place order' });
    } finally {
        client.release();
    }
});

export default router;

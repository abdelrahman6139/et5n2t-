import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateOrderId, calculateOrderTotals } from '../utils/helpers.js';
import { logActivity } from '../utils/logger.js';

const router = express.Router();

// Map Arabic to English ENUM values
const salesCenterMap = {
  'صالة': 'DineIn',
  'سفري': 'Takeaway',
  'توصيل': 'Delivery',
  'DineIn': 'DineIn',
  'Takeaway': 'Takeaway',
  'Delivery': 'Delivery'
};

// GET /api/orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, salesCenter, type, limit = 100, customerId } = req.query;

    let query = `
      SELECT
o.id,
o.user_facing_id,
o.order_no,
o.sales_center,
o.status,
o.customer_id,
o.customer_location_id,
o.driver_id,
o.hall_id,
o.table_id,
o.subtotal,
o.tax,
o.delivery_fee,
o.service_charge,
(o.subtotal + o.tax + o.delivery_fee + COALESCE(o.service_charge, 0)) as total,
o.payment_method,
o.customer_address,
o.customer_phone,
o.latitude,
o.longitude,
o.created_at,
o.version,
        COALESCE(c.first_name, '') AS first_name,
        COALESCE(c.last_name, '') AS last_name,
        COALESCE(c.phone, '') AS customer_phone,

        -- address fields must come from customer_locations
        COALESCE(cl.location_name, '') AS location_name,
        COALESCE(cl.street, '')     AS street,
        COALESCE(cl.building, '')   AS building,
        COALESCE(cl.floor, '')      AS floor,
        COALESCE(cl.apartment, '')  AS apartment,
        COALESCE(cl.landmark, '')   AS landmark,

        COALESCE(d.name, '') AS driver_name,
        COALESCE(h.name, '') AS hall_name,
        COALESCE(t.name, '') AS table_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN customer_locations cl ON o.customer_location_id = cl.id
      LEFT JOIN drivers d ON o.driver_id = d.id
      LEFT JOIN halls h ON o.hall_id = h.id
      LEFT JOIN tables t ON o.table_id = t.id
      WHERE 1=1
    `;

    const params = [];
    let i = 1;

    if (status) {
      if (status.includes(',')) {
        const statuses = status.split(',').map(s => s.trim());
        query += ` AND o.status = ANY($${i})`;
        params.push(statuses);
      } else {
        query += ` AND o.status = $${i}`;
        params.push(status);
      }
      i++;
    }

    if (salesCenter) {
      const salesCenterMap = {
        'صالة': 'DineIn', 'سفري': 'Takeaway', 'توصيل': 'Delivery',
        DineIn: 'DineIn', Takeaway: 'Takeaway', Delivery: 'Delivery'
      };
      const enumValue = salesCenterMap[salesCenter] || salesCenter;
      query += ` AND o.sales_center = $${i}`;
      params.push(enumValue);
      i++;
    }

    if (type) {
      const typeMap = { delivery: 'Delivery', takeaway: 'Takeaway', 'dine-in': 'DineIn' };
      const enumValue = typeMap[type.toLowerCase()] || type;
      query += ` AND o.sales_center = $${i}`;
      params.push(enumValue);
      i++;
    }

    if (customerId) {
      query += ` AND o.customer_id = $${i}`;
      params.push(parseInt(customerId));
      i++;
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${i}`;
    params.push(limit);

    const result = await pool.query(query, params);

    const formatted = result.rows.map(order => ({
      id: order.id,
      customer_id: order.customer_id,
      user_facing_id: order.user_facing_id || `ORD-${order.id}`,
      order_no: order.order_no || `ORD-${order.id}`,
      customer_name: order.first_name && order.last_name
        ? `${order.first_name} ${order.last_name}`
        : 'Unknown Customer',
      address: [order.location_name, order.street, order.building, order.floor, order.apartment, order.landmark].filter(v => v && v.trim()).join(', ') || order.customer_address || '',
      phone: order.customer_phone || '',
      total: parseFloat(order.total) || 0,
      subtotal: parseFloat(order.subtotal) || 0,
      tax: parseFloat(order.tax) || 0,
      delivery_fee: parseFloat(order.delivery_fee) || 0,
      service_charge: parseFloat(order.service_charge) || 0,
      payment_method: order.payment_method || 'cash',
      status: order.status,
      driver_id: order.driver_id,
      driver_name: order.driver_name || '',
      latitude: order.latitude ? parseFloat(order.latitude) : null,
      longitude: order.longitude ? parseFloat(order.longitude) : null,
      sales_center: order.sales_center,
      created_at: order.created_at,
      customer_address: [order.location_name, order.street, order.building, order.floor, order.apartment, order.landmark].filter(v => v && v.trim()).join(', ') || order.customer_address || '',
      customer_phone: order.customer_phone || '',
      hall_name: order.hall_name || '',
      table_name: order.table_name || '',
    }));

    // You currently return an array; that’s fine if the frontend expects it.
    return res.json(formatted);
  } catch (error) {
    console.error('Get orders error:', error);
    return res.status(500).json({ error: 'Failed to fetch orders', details: error.message });
  }
});




// Get single order with items
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const orderResult = await pool.query(`
  SELECT 
    o.id,
    o.user_facing_id as userfacingid,
    o.order_no as orderno,
    o.sales_center as salescenter,
    o.status,
    o.customer_id as customerid,
    o.customer_location_id as customerlocationid,
    o.driver_id as driverid,
    o.hall_id as hallid,
    o.table_id as tableid,
    o.subtotal,
    o.tax,
    o.delivery_fee as deliveryfee,
    o.service_charge as servicecharge,
    (o.subtotal + o.tax + o.delivery_fee + COALESCE(o.service_charge, 0)) as total,
    o.payment_method as paymentmethod,
    o.created_at as createdat,
    o.version,
    COALESCE(NULLIF(c.first_name || ' ' || c.last_name, ' '), 'Walk-in') as customername,
    c.phone as customerphone,
    COALESCE(
      NULLIF(TRIM(CONCAT_WS(', ',
        NULLIF(TRIM(COALESCE(cl.location_name, '')), ''),
        NULLIF(TRIM(COALESCE(cl.street, '')), ''),
        NULLIF(TRIM(COALESCE(cl.building, '')), ''),
        NULLIF(TRIM(COALESCE(cl.floor, '')), ''),
        NULLIF(TRIM(COALESCE(cl.apartment, '')), ''),
        NULLIF(TRIM(COALESCE(cl.landmark, '')), '')
      )), ''),
      NULLIF(TRIM(COALESCE(o.customer_address, '')), '')
    ) as customeraddress,
    COALESCE(d.name, '') as drivername,
    COALESCE(h.name, '') as hallname,
    COALESCE(t.name, '') as tablename
  FROM orders o
  LEFT JOIN customers c ON o.customer_id = c.id
  LEFT JOIN customer_locations cl ON o.customer_location_id = cl.id
  LEFT JOIN drivers d ON o.driver_id = d.id
  LEFT JOIN halls h ON o.hall_id = h.id
  LEFT JOIN tables t ON o.table_id = t.id
  WHERE o.id = $1
`, [id]);




    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const itemsResult = await pool.query(
      `SELECT * FROM order_items WHERE order_id = $1 ORDER BY id`,
      [id]
    );

    // Fetch note options for all order items
    const itemIds = itemsResult.rows.map(r => r.id);
    let noteOptionsMap = {};
    if (itemIds.length > 0) {
      const noteOptsResult = await pool.query(
        `SELECT oino.order_item_id, oino.note_option_id as id, oino.name_snapshot as name, oino.price_snapshot as price
         FROM order_item_note_options oino
         WHERE oino.order_item_id = ANY($1)
         ORDER BY oino.id`,
        [itemIds]
      );
      noteOptsResult.rows.forEach(row => {
        if (!noteOptionsMap[row.order_item_id]) noteOptionsMap[row.order_item_id] = [];
        noteOptionsMap[row.order_item_id].push({
          id: row.id,
          name: row.name,
          price: parseFloat(row.price)
        });
      });
    }

    const order = {
      ...orderResult.rows[0],
      userfacingid: orderResult.rows[0].userfacingid,
      subtotal: parseFloat(orderResult.rows[0].subtotal) || 0,
      tax: parseFloat(orderResult.rows[0].tax) || 0,
      delivery_fee: parseFloat(orderResult.rows[0].deliveryfee) || 0,
      service_charge: parseFloat(orderResult.rows[0].servicecharge) || 0,
      total: parseFloat(orderResult.rows[0].total) || 0,
      driver_name: orderResult.rows[0].drivername || '',
      hall_name: orderResult.rows[0].hallname || '',
      table_name: orderResult.rows[0].tablename || '',
      items: itemsResult.rows.map(item => ({
        ...item,
        price: parseFloat(item.price) || 0,
        price_at_order: parseFloat(item.price_at_order) || parseFloat(item.price) || 0,
        quantity: parseFloat(item.quantity) || 0,
        total: parseFloat(item.total) || 0,
        notes: item.notes || '',
        selectedNoteOptions: noteOptionsMap[item.id] || []
      }))
    };

    console.log('🔍 Backend sending order:', {
      id: order.id,
      userfacingid: order.userfacingid,
      orderno: order.orderno
    });
    return res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    return res.status(500).json({ error: 'Failed to fetch order' });
  }
});



// Create new order
/*router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      salesCenter,
      customerId,
      driverId,
      hallId,
      tableId,
      items,
      paymentMethod,
      deliveryFee = 0
    } = req.body;

    if (!salesCenter || !items || items.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Sales center and items are required'
      });
    }

    const enumSalesCenter = salesCenterMap[salesCenter] || salesCenter;
    
    if (!['DineIn', 'Takeaway', 'Delivery'].includes(enumSalesCenter)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Invalid sales center'
      });
    }

    const totals = calculateOrderTotals(items, enumSalesCenter, deliveryFee);
    const userFacingId = generateOrderId();

    const orderResult = await client.query(
      `INSERT INTO orders
       (user_facing_id, sales_center, customer_id, driver_id, hall_id, table_id,
        subtotal, tax, delivery_fee, service_charge, total, payment_method, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'Pending')
       RETURNING *`,
      [
        userFacingId,
        enumSalesCenter,
        customerId || null,
        driverId || null,
        hallId || null,
        tableId || null,
        totals.subtotal,
        totals.tax,
        deliveryFee,
        totals.serviceCharge,
        totals.total,
        paymentMethod || 'cash'
      ]
    );

    const orderId = orderResult.rows[0].id;

    for (const item of items) {
      const menuItem = await client.query(
        'SELECT name FROM menu_items WHERE id = $1',
        [item.id]
      );
      
      if (menuItem.rows.length === 0) {
        throw new Error(`Menu item with id ${item.id} not found`);
      }
      
      const itemName = menuItem.rows[0].name;
      const itemPrice = parseFloat(item.price);
      const itemQuantity = parseFloat(item.quantity);
      const lineTotal = itemPrice * itemQuantity;
      
      await client.query(
        `INSERT INTO order_items 
         (order_id, item_id, name_snapshot, price, quantity, total, price_at_order, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          orderId,
          item.id, 
          itemName,
          itemPrice,
          itemQuantity,
          lineTotal,
          itemPrice,
          item.notes || null
        ]
      );
    }

    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: orderResult.rows[0]
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create order error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create order' 
    });
  } finally {
    client.release();
  }
});*/
// Create new order
router.post('/', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      salesCenter,
      customerId,
      customerLocationId,  // ← ADD THIS
      driverId,
      hallId,
      tableId,
      items,
      paymentMethod,
      deliveryFee = 0
    } = req.body;

    if (!salesCenter || !items || items.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Sales center and items are required'
      });
    }

    const enumSalesCenter = salesCenterMap[salesCenter] || salesCenter;

    if (!['DineIn', 'Takeaway', 'Delivery'].includes(enumSalesCenter)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Invalid sales center'
      });
    }
    if (enumSalesCenter === 'Delivery' && !customerLocationId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Delivery orders must have a customer location' });
    }

    // ✅ FETCH DYNAMIC SETTINGS
    let taxRate = 0.14; // Default
    let serviceChargeRate = 0.12; // Default
    try {
      const settingsRes = await client.query("SELECT key, value FROM settings WHERE key IN ('tax_rate', 'service_charge')");
      settingsRes.rows.forEach(row => {
        if (row.key === 'tax_rate') taxRate = parseFloat(row.value) / 100;
        if (row.key === 'service_charge') serviceChargeRate = parseFloat(row.value) / 100;
      });
    } catch (err) {
      console.error("Failed to fetch settings for order calculation, using defaults", err);
    }

    const totals = calculateOrderTotals(items, enumSalesCenter, deliveryFee, taxRate, serviceChargeRate);
    const userFacingId = generateOrderId();

    let customerPhone = null;
    if (customerId) {
      const cRes = await client.query(
        'SELECT phone FROM customers WHERE id = $1',
        [customerId]
      );
      if (cRes.rows.length > 0) {
        customerPhone = cRes.rows[0].phone;
      }
    }

    let latitude = null, longitude = null, addressText = null;
    if (customerLocationId) {
      const locResult = await client.query(
        `SELECT latitude, longitude, 
                CONCAT_WS(', ', street, building, floor, apartment, landmark) as full_address
         FROM customer_locations WHERE id = $1`,
        [customerLocationId]
      );
      if (locResult.rows.length > 0) {
        latitude = locResult.rows[0].latitude;
        longitude = locResult.rows[0].longitude;
        addressText = locResult.rows[0].full_address;
      }
    }


    // ✅ GET CURRENT OPEN SHIFT
    let shift_id = null;
    try {
      console.log('🔍 Looking for open shift for user:', req.user?.id);

      if (!req.user || !req.user.id) {
        console.error('❌ req.user is undefined - authentication may have failed');
      } else {
        const shiftResult = await client.query(
          'SELECT id FROM shifts WHERE user_id = $1 AND status = $2 ORDER BY opened_at DESC LIMIT 1',
          [req.user.id, 'open']
        );

        console.log('📊 Shift query result:', shiftResult.rows);

        if (shiftResult.rows.length > 0) {
          shift_id = shiftResult.rows[0].id;
          console.log('✅ Found open shift:', shift_id);
        } else {
          console.log('⚠️ No open shift found for user:', req.user.id);
        }
      }
    } catch (shiftError) {
      console.error('❌ Shift tracking error:', shiftError.message);
    }

    console.log('📦 Creating order with shift_id:', shift_id);

    // ✅ DEBUG: Log the totals before inserting
    console.log('💰 Calculated totals:', JSON.stringify(totals, null, 2));
    console.log('💰 Values being inserted:', {
      subtotal: totals.subtotal,
      tax: totals.tax,
      delivery_fee: deliveryFee,
      service_charge: totals.serviceCharge,
      total: totals.total
    });



    const orderResult = await client.query(
      `INSERT INTO orders
(user_facing_id, sales_center, customer_id, customer_location_id,
 latitude, longitude, customer_address, customer_phone,
 driver_id, hall_id, table_id,
 subtotal, tax, delivery_fee, service_charge, total, payment_method, status, shift_id)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
RETURNING *
`,
      [
        userFacingId,
        enumSalesCenter,
        customerId || null,
        customerLocationId || null,  // ← NEW
        latitude,                     // ← NEW
        longitude,                    // ← NEW
        addressText,                  // ← NEW
        customerPhone,              // new
        driverId || null,
        hallId || null,
        tableId || null,
        totals.subtotal,
        totals.tax,
        deliveryFee,
        totals.serviceCharge,
        totals.total,
        paymentMethod || 'cash',
        'Pending',
        shift_id
      ]
    );

    // ✅ DEBUG: Log what the database actually stored
    console.log('💾 Database returned after INSERT:', {
      id: orderResult.rows[0].id,
      subtotal: orderResult.rows[0].subtotal,
      tax: orderResult.rows[0].tax,
      delivery_fee: orderResult.rows[0].delivery_fee,
      service_charge: orderResult.rows[0].service_charge,
      total: orderResult.rows[0].total
    });


    const orderId = orderResult.rows[0].id;

    // Insert updated items
    for (const item of items) {
      const menuItem = await client.query(
        `SELECT name FROM menu_items WHERE id = $1`,
        [item.id]
      );

      if (menuItem.rows.length === 0) {
        console.warn(`⚠️ Menu item with id ${item.id} not found - SKIPPING`);
        continue;
      }

      const itemName = menuItem.rows[0].name;
      const basePrice = parseFloat(item.price);
      const itemQuantity = parseFloat(item.quantity);

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
        `INSERT INTO order_items (order_id, item_id, name_snapshot, price, quantity, total, price_at_order, notes)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [orderId, item.id, itemName, effectivePrice, itemQuantity, lineTotal, basePrice, item.notes || null]
      );

      // Insert note option snapshots
      const orderItemId = orderItemResult.rows[0].id;
      for (const no of noteOptionSnapshots) {
        await client.query(
          `INSERT INTO order_item_note_options (order_item_id, note_option_id, name_snapshot, price_snapshot)
           VALUES ($1, $2, $3, $4)`,
          [orderItemId, no.id, no.name, no.price]
        );
      }
    }


    // ✅ Recalculate real totals from the DB-verified order_items and UPDATE the order
    const realItemsRes = await client.query(
      'SELECT SUM(total) AS real_subtotal FROM order_items WHERE order_id = $1',
      [orderId]
    );
    const realSubtotal = parseFloat(realItemsRes.rows[0].real_subtotal) || 0;
    const realTax = parseFloat((realSubtotal * taxRate).toFixed(2));
    const realServiceCharge = (enumSalesCenter === 'DineIn')
      ? parseFloat((realSubtotal * serviceChargeRate).toFixed(2))
      : 0;
    const realTotal = parseFloat((realSubtotal + realTax + realServiceCharge + parseFloat(deliveryFee)).toFixed(2));

    const updatedOrderRes = await client.query(
      `UPDATE orders SET subtotal = $1, tax = $2, service_charge = $3, total = $4 WHERE id = $5 RETURNING *`,
      [realSubtotal, realTax, realServiceCharge, realTotal, orderId]
    );

    await client.query('COMMIT');

    // Log Activity
    if (req.user) {
      await logActivity(
        req.user.id,
        'CREATE_ORDER',
        `Order #${userFacingId} created. Total: ${realTotal}`,
        req,
        'Order',
        orderId.toString()
      );
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: updatedOrderRes.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create order error:', error);
    res.status(500).json({
      error: error.message || 'Failed to create order'
    });
  } finally {
    client.release();
  }
});

// Update order status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { status } = req.body;

    // Map Flutter status to database enum
    const statusMap = {
      'Delivered': 'Completed',
      'Completed': 'Completed',
      'Pending': 'Pending',
      'Confirmed': 'Confirmed',
      'Preparing': 'Preparing',
      'Ready': 'Ready', // Explicitly add
      'Delivering': 'Delivering',
      'Cancelled': 'Cancelled',
      'OutForDelivery': 'Delivering'
    };

    const dbStatus = statusMap[status] || status;
    const validStatuses = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Delivering', 'Completed', 'Cancelled'];

    if (!validStatuses.includes(dbStatus)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Invalid status: ${status}` });
    }

    // Get the order to find the driver_id
    const orderResult = await client.query(
      'SELECT driver_id FROM orders WHERE id = $1',
      [id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const driverId = orderResult.rows[0].driver_id;

    // ✅ If order is marked as Completed or Cancelled
    // ✅ If order is marked as Completed or Cancelled
    if (dbStatus === 'Completed' || dbStatus === 'Cancelled') {
      console.log(`📦 Order ${id} marked as ${dbStatus}`);

      // 1. Update order status and remove driver assignment
      await client.query(
        'UPDATE orders SET status = $1 WHERE id = $2',
        [dbStatus, id]
      );


      // 2. Check if driver has other active orders
      if (driverId) {
        const activeOrdersCheck = await client.query(
          `SELECT COUNT(*) as count FROM orders 
       WHERE driver_id = $1 
       AND status IN ('Confirmed', 'Preparing', 'Delivering')`,
          [driverId]
        );

        const remainingOrders = parseInt(activeOrdersCheck.rows[0].count);

        if (remainingOrders === 0) {
          // No more active orders - set driver to available
          await client.query(
            "UPDATE drivers SET status = 'available' WHERE id = $1",
            [driverId]
          );
          console.log(`🏍️ Driver ${driverId} set back to available (no more orders)`);
        } else {
          // Still has active orders - keep busy
          console.log(`🏍️ Driver ${driverId} still has ${remainingOrders} active orders - keeping busy`);
        }
      }

      // 3. Delete tracking data for this order
      await client.query(
        'DELETE FROM driver_locations WHERE order_id = $1',
        [id]
      );
      console.log(`🗑️ Tracking data cleared for order ${id}`);
    }
    else {
      // Normal status update (not completed/cancelled)
      await client.query(
        'UPDATE orders SET status = $1 WHERE id = $2',
        [dbStatus, id]
      );
    }

    await client.query('COMMIT');

    // In the status update endpoint, after the COMMIT, add:
    const remainingOrdersResult = await pool.query(
      `SELECT COUNT(*) as count FROM orders 
   WHERE driver_id = $1 
   AND status IN ('Confirmed', 'Preparing', 'Delivering')`,
      [driverId]
    );

    res.json({
      success: true,
      message: 'Order status updated',
      remaining_orders: parseInt(remainingOrdersResult.rows[0]?.count || 0)
    });


  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  } finally {
    client.release();
  }
});

// PATCH /api/orders/:id/location - Update order location from driver
router.patch('/:id/location', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    // Update order GPS
    const orderResult = await client.query(
      `UPDATE orders 
       SET latitude = $1, longitude = $2 
       WHERE id = $3 
       RETURNING customer_location_id`,
      [latitude, longitude, id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    // ✅ If order linked to a customer_location without GPS, update it too
    const customerLocationId = orderResult.rows[0].customer_location_id;
    if (customerLocationId) {
      await client.query(
        `UPDATE customer_locations 
         SET latitude = $1, longitude = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND latitude IS NULL`,
        [latitude, longitude, customerLocationId]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Location updated' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update order location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  } finally {
    client.release();
  }
});


// GET /api/orders/driver/:driverId - Get orders assigned to a driver
// GET /api/orders/driver/:driverId - Get orders assigned to a driver
router.get('/driver/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;

    console.log(`📋 [ORDERS] Fetching orders for driver ${driverId}`);

    const result = await pool.query(
      `SELECT 
        o.id,
        o.order_no,
(o.subtotal + o.tax + o.delivery_fee + COALESCE(o.service_charge, 0)) as total,
        o.status,
        o.customer_address,
        o.customer_phone,
        o.latitude,
        o.longitude,
        o.created_at,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        c.phone as customer_phone_alt
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.driver_id = $1 
      AND o.status NOT IN ('Completed', 'Cancelled')
      ORDER BY o.created_at DESC`,
      [driverId]
    );

    console.log(`✅ [ORDERS] Found ${result.rows.length} orders`);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('❌ [ORDERS] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ... existing routes ...
// GET /api/orders/driver/:driverId/current - Get SINGLE current active order
router.get('/driver/:driverId/current', async (req, res) => {
  try {
    const { driverId } = req.params;

    console.log(`📦 [ORDERS] Fetching CURRENT order for driver ${driverId}`);

    // Get the ONE active order for this driver (most recent)
    const result = await pool.query(
      `SELECT 
        o.id,
        o.order_no,
(o.subtotal + o.tax + o.delivery_fee + COALESCE(o.service_charge, 0)) as total,
        o.status,
        o.customer_address,
        o.customer_phone,
        o.latitude,
        o.longitude,
        o.created_at,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        c.phone as customer_phone_alt
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.driver_id = $1 
        AND o.status IN ('Confirmed', 'Preparing', 'Delivering')
      ORDER BY o.created_at DESC
      LIMIT 1`,
      [driverId]
    );

    if (result.rows.length === 0) {
      console.log(`✅ [ORDERS] No active order for driver ${driverId}`);
      return res.json({ success: true, data: null }); // ← Returns null when no order
    }

    const order = result.rows[0];
    console.log(`✅ [ORDERS] Found current order: ${order.id} for driver ${driverId}`);

    res.json({ success: true, data: order });

  } catch (error) {
    console.error('❌ [ORDERS] Error fetching current order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch current order'
    });
  }
});

router.get('/drivers/active', async (req, res) => {
  try {
    console.log('📡 [TRACKING] Fetching all active drivers with order counts...');

    const result = await pool.query(`
      SELECT 
        d.id as driver_id,
        d.name as driver_name,
        d.phone as driver_phone,
        d.vehicle_type,
        d.license_plate,
        COALESCE(dl.driver_lat, d.latitude) as driver_lat,
        COALESCE(dl.driver_lng, d.longitude) as driver_lng,
        d.status,
        dl.updated_at as last_seen,
        COUNT(o.id) FILTER (WHERE o.status IN ('Confirmed', 'Preparing', 'Delivering')) as active_orders_count,
        json_agg(
          json_build_object(
            'order_id', o.id,
            'order_no', COALESCE(o.order_no, CONCAT('ORD-', o.id)),
            'customer_name', COALESCE(o.customer_address, 'Unknown'),
            'customer_phone', o.customer_phone,
            'status', o.status,
'total', (o.subtotal + o.tax + o.delivery_fee + COALESCE(o.service_charge, 0)),
            'latitude', o.latitude,
            'longitude', o.longitude
          ) ORDER BY o.created_at
        ) FILTER (WHERE o.status IN ('Confirmed', 'Preparing', 'Delivering')) as assigned_orders
      FROM drivers d
      INNER JOIN (
        SELECT DISTINCT ON (driver_id)
          driver_id,
          driver_lat,
          driver_lng,
          updated_at
        FROM driver_locations
        WHERE updated_at > NOW() - INTERVAL '15 minutes'
        ORDER BY driver_id, updated_at DESC
      ) dl ON d.id = CAST(dl.driver_id AS INTEGER)
      LEFT JOIN orders o ON d.id = o.driver_id 
        AND o.status IN ('Confirmed', 'Preparing', 'Delivering')
      WHERE d.status IN ('available', 'busy')
      GROUP BY d.id, dl.driver_lat, dl.driver_lng, dl.updated_at
      ORDER BY active_orders_count ASC, d.id
    `);

    console.log(`📡 [TRACKING] Found ${result.rows.length} active (online) drivers`);
    console.log(`📡 [TRACKING] Total assigned orders: ${result.rows.reduce((sum, d) => sum + parseInt(d.active_orders_count || 0), 0)}`);

    res.json({
      success: true,
      drivers: result.rows,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('📡 [TRACKING] Error fetching active drivers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// GET /api/tracking/driver/:driverId/latest - Get latest location for specific driver
router.get('/driver/:driverId/latest', async (req, res) => {
  try {
    const { driverId } = req.params;

    console.log(`📍 [TRACKING] Fetching latest location for driver ${driverId}`);

    const result = await pool.query(`
      SELECT 
        dl.*,
        d.name as driver_name,
        d.phone as driver_phone,
        d.vehicle_type,
        d.license_plate
      FROM driver_locations dl
      INNER JOIN drivers d ON dl.driver_id = d.id
      WHERE dl.driver_id = $1
ORDER BY dl.updated_at DESC
      LIMIT 1
    `, [driverId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No location found for driver'
      });
    }

    res.json({
      success: true,
      location: result.rows[0]
    });
  } catch (error) {
    console.error('❌ [TRACKING] Error fetching driver location:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Assign driver to order
router.patch('/:id/assign-driver', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { driver_id } = req.body;

    if (!driver_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'driver_id is required' });
    }

    // Check if order exists
    const orderCheck = await client.query(
      'SELECT id, status FROM orders WHERE id = $1',
      [id]
    );

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if driver exists
    const driverCheck = await client.query(
      'SELECT id, name, status FROM drivers WHERE id = $1',
      [driver_id]
    );

    if (driverCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Driver not found' });
    }


    // Assign driver to order and set order status to Confirmed
    await client.query(
      `UPDATE orders 
       SET driver_id = $1, status = 'Confirmed' 
       WHERE id = $2`,
      [driver_id, id]
    );

    // Set driver status to busy
    await client.query(
      `UPDATE drivers 
       SET status = 'busy' 
       WHERE id = $1`,
      [driver_id]
    );

    // ✅ Get order GPS coordinates
    const orderGPS = await client.query(
      'SELECT latitude, longitude FROM orders WHERE id = $1',
      [id]
    );

    const orderLat = orderGPS.rows[0]?.latitude;
    const orderLng = orderGPS.rows[0]?.longitude;

    // ✅ Update driver_locations with order_id AND destination
    await client.query(
      `UPDATE driver_locations
       SET order_id = $1, 
           dest_lat = $2, 
           dest_lng = $3, 
           status = 'مشغول'
       WHERE driver_id = $4`,
      [id, orderLat, orderLng, driver_id]
    );


    await client.query('COMMIT');

    console.log(`✅ Order ${id} assigned to driver ${driver_id}`);

    res.json({
      success: true,
      message: 'Driver assigned successfully',
      order_id: id,
      driver_id: driver_id,
      driver_name: driverCheck.rows[0].name
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Assign driver error:', error);
    res.status(500).json({ error: 'Failed to assign driver' });
  } finally {
    client.release();
  }
});

// Update order
router.patch('/:id', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      salesCenter,
      customerId,
      customerLocationId,
      driverId,
      hallId,
      tableId,
      items,
      paymentMethod,
      deliveryFee = 0
    } = req.body;

    console.log('🔍 UPDATE ORDER DATA RECEIVED:', {
      salesCenter,
      customerId,
      customerLocationId,
      hallId,
      tableId,
      itemsCount: items?.length,
      paymentMethod,
      deliveryFee
    });

    // Check if order exists and is editable
    const orderCheck = await client.query(
      'SELECT id, status FROM orders WHERE id = $1',
      [id]
    );

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const currentStatus = orderCheck.rows[0].status;
    if (['Ready', 'Delivering', 'Completed', 'Cancelled'].includes(currentStatus)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot edit order in this status' });
    }

    await client.query(
      'UPDATE orders SET version = version + 1 WHERE id = $1',
      [id]
    );

    const enumSalesCenter = salesCenterMap[salesCenter] || salesCenter;

    // Get dynamic settings
    let taxRate = 0.14;
    let serviceChargeRate = 0.12;

    try {
      const settingsRes = await client.query(
        "SELECT key, value FROM settings WHERE key IN ('tax_rate', 'service_charge')"
      );
      settingsRes.rows.forEach(row => {
        if (row.key === 'tax_rate') taxRate = parseFloat(row.value) / 100;
        if (row.key === 'service_charge') serviceChargeRate = parseFloat(row.value) / 100;
      });
    } catch (err) {
      console.error("Failed to fetch settings, using defaults", err);
    }

    const totals = calculateOrderTotals(
      items,
      enumSalesCenter,
      deliveryFee,
      taxRate,
      serviceChargeRate
    );

    // Get location data if applicable
    let latitude = null, longitude = null, addressText = null, customerPhone = null;

    if (customerId) {
      const cRes = await client.query(
        'SELECT phone FROM customers WHERE id = $1',
        [customerId]
      );
      if (cRes.rows.length > 0) {
        customerPhone = cRes.rows[0].phone;
      }
    }

    if (customerLocationId) {
      const locResult = await client.query(
        `SELECT latitude, longitude,
         CONCAT_WS(', ', street, building, floor, apartment, landmark) as full_address
         FROM customer_locations WHERE id = $1`,
        [customerLocationId]
      );
      if (locResult.rows.length > 0) {
        latitude = locResult.rows[0].latitude;
        longitude = locResult.rows[0].longitude;
        addressText = locResult.rows[0].full_address;
      }
    }

    // Delete existing order items
    await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);

    // Insert updated items (with DB-verified note option prices)
    for (const item of items) {
      const menuItem = await client.query(
        'SELECT name FROM menu_items WHERE id = $1',
        [item.id]
      );

      if (menuItem.rows.length === 0) {
        console.warn(`⚠️ Menu item with id ${item.id} not found - SKIPPING`);
        continue;
      }

      const itemName = menuItem.rows[0].name;
      const basePrice = parseFloat(item.price);
      const itemQuantity = parseFloat(item.quantity);

      // Validate & load selected note options from DB
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
        `INSERT INTO order_items
        (order_id, item_id, name_snapshot, price, quantity, total, price_at_order, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [id, item.id, itemName, effectivePrice, itemQuantity, lineTotal, basePrice, item.notes || null]
      );

      // Insert note option snapshots
      const orderItemId = orderItemResult.rows[0].id;
      for (const no of noteOptionSnapshots) {
        await client.query(
          `INSERT INTO order_item_note_options (order_item_id, note_option_id, name_snapshot, price_snapshot)
           VALUES ($1, $2, $3, $4)`,
          [orderItemId, no.id, no.name, no.price]
        );
      }
    }

    // ✅ Recalculate real totals from DB-verified order_items and UPDATE the order
    const realItemsRes = await client.query(
      'SELECT SUM(total) AS real_subtotal FROM order_items WHERE order_id = $1',
      [id]
    );
    const realSubtotal = parseFloat(realItemsRes.rows[0].real_subtotal) || 0;
    const realTax = parseFloat((realSubtotal * taxRate).toFixed(2));
    const realServiceCharge = (enumSalesCenter === 'DineIn')
      ? parseFloat((realSubtotal * serviceChargeRate).toFixed(2))
      : 0;
    const realTotal = parseFloat((realSubtotal + realTax + realServiceCharge + parseFloat(deliveryFee)).toFixed(2));

    const orderResult = await client.query(
      `UPDATE orders
       SET sales_center=$1, customer_id=$2, customer_location_id=$3,
           latitude=$4, longitude=$5, customer_address=$6, customer_phone=$7,
           driver_id=$8, hall_id=$9, table_id=$10,
           subtotal=$11, tax=$12, delivery_fee=$13, service_charge=$14,
           total=$15, payment_method=$16
       WHERE id=$17
       RETURNING *`,
      [enumSalesCenter, customerId || null, customerLocationId || null,
        latitude, longitude, addressText, customerPhone,
        driverId || null, hallId || null, tableId || null,
        realSubtotal, realTax, deliveryFee, realServiceCharge,
        realTotal, paymentMethod || 'cash',
        id]
    );

    const versionResult = await client.query(
      'SELECT version FROM orders WHERE id = $1',
      [id]
    );
    const currentVersion = versionResult.rows[0].version;

    await client.query('COMMIT');

    // Log Activity
    if (req.user) {
      await logActivity(
        req.user.id,
        'UPDATE_ORDER',
        `Order #${id} updated. New Total: ${realTotal}`,
        req,
        'Order',
        id.toString()
      );
    }

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: { ...orderResult.rows[0], version: currentVersion }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update order error:', error);
    res.status(500).json({
      error: error.message || 'Failed to update order'
    });
  } finally {
    client.release();
  }
});

// Add this to orderRoutes.js

// Get all active orders for a specific driver (for mobile app) - WITH ITEMS
router.get('/driver/:driverId/active', async (req, res) => {
  try {
    const { driverId } = req.params;

    console.log(`📡 [API] Fetching active orders with items for driver: ${driverId}`);

    // Step 1: Get all active orders
    const ordersResult = await pool.query(
      `SELECT 
        o.id, 
        o.user_facing_id as order_no, 
        o.status, 
        o.subtotal, 
        o.tax, 
        o.delivery_fee, 
        o.service_charge, 
(o.subtotal + o.tax + o.delivery_fee + COALESCE(o.service_charge, 0)) as total,
        o.payment_method,
        o.created_at, 
        o.customer_address, 
        o.customer_phone, 
        o.latitude, 
        o.longitude,
        COALESCE(c.first_name || ' ' || c.last_name, 'Walk-in Customer') as customer_name,
        COALESCE(c.phone, '') as customer_phone_alt
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.driver_id = $1 
         AND o.status IN ('Confirmed', 'Preparing', 'Delivering')
       ORDER BY o.created_at ASC`,
      [parseInt(driverId)]
    );

    // Step 2: For each order, fetch its items
    const ordersWithItems = await Promise.all(
      ordersResult.rows.map(async (order) => {
        const itemsResult = await pool.query(
          `SELECT 
            id,
            item_id,
            name_snapshot as item_name,
            quantity,
            price,
            total,
            notes
           FROM order_items
           WHERE order_id = $1
           ORDER BY id`,
          [order.id]
        );

        // Attach items to order
        return {
          ...order,
          items: itemsResult.rows
        };
      })
    );

    console.log(`✅ [API] Found ${ordersWithItems.length} active orders with items`);

    res.json({
      success: true,
      orders: ordersWithItems,
      count: ordersWithItems.length
    });
  } catch (error) {
    console.error('❌ [API] Get driver active orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch driver orders'
    });
  }
});


// Get order items for mobile app (lightweight)
router.get('/:id/items', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        id,
        name_snapshot as name,
        quantity,
        price,
        total,
        notes
      FROM order_items 
      WHERE order_id = $1 
      ORDER BY id
    `, [id]);

    res.json({
      success: true,
      items: result.rows
    });
  } catch (error) {
    console.error('Get order items error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch order items'
    });
  }
});


export default router;  // ← This should be at the very end



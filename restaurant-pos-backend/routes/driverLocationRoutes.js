import express from 'express';
import pool from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// In-memory storage for driver locations
let driverLocations = {};

// Driver sends location update (from Flutter app) - NO AUTH REQUIRED
router.post('/location', async (req, res) => {
  try {
    const data = req.body;
    const driverId = data.driver_id;

    console.log('📍 [LOCATION UPDATE] Received from driver:', driverId);
    console.log('📍 [LOCATION UPDATE] Data:', JSON.stringify(data));

    if (!driverId) {
      console.log('❌ [LOCATION UPDATE] Missing driver_id');
      return res.status(400).json({ error: 'driver_id is required' });
    }

    // ✅ SAVE TO IN-MEMORY (for quick access)
    driverLocations[driverId] = {
      driver_id: driverId,
      order_id: data.order_id || null,
      driver_lat: parseFloat(data.driver_lat),
      driver_lng: parseFloat(data.driver_lng),
      dest_lat: data.dest_lat ? parseFloat(data.dest_lat) : null,
      dest_lng: data.dest_lng ? parseFloat(data.dest_lng) : null,
      leg: data.leg || null,
      status: data.status || 'متاح',
      timestamp: new Date().toISOString(),
    };

    console.log('✅ [LOCATION UPDATE] Saved to memory. Total drivers:', Object.keys(driverLocations).length);

    // ✅ UPSERT TO DATABASE (INSERT or UPDATE if exists)
    await pool.query(`
      INSERT INTO driver_locations 
        (driver_id, order_id, driver_lat, driver_lng, dest_lat, dest_lng, leg, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (driver_id) 
      DO UPDATE SET
        order_id = EXCLUDED.order_id,
        driver_lat = EXCLUDED.driver_lat,
        driver_lng = EXCLUDED.driver_lng,
        dest_lat = EXCLUDED.dest_lat,
        dest_lng = EXCLUDED.dest_lng,
        leg = EXCLUDED.leg,
        status = EXCLUDED.status,
        updated_at = NOW()
    `, [
      driverId,
      data.order_id || null,
      parseFloat(data.driver_lat),
      parseFloat(data.driver_lng),
      data.dest_lat ? parseFloat(data.dest_lat) : null,
      data.dest_lng ? parseFloat(data.dest_lng) : null,
      data.leg || null,
      data.status || 'متاح'
    ]);

    console.log('📍 Driver location updated:', driverId, driverLocations[driverId]);

    res.json({ status: 'ok', message: 'Location updated' });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});



// Debug endpoint - show all locations in memory (no auth for testing)
router.get('/debug', async (req, res) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const allLocations = Object.entries(driverLocations).map(([id, loc]) => ({
      driver_id: id,
      ...loc,
      is_active: new Date(loc.timestamp) > fiveMinutesAgo,
      age_seconds: Math.floor((Date.now() - new Date(loc.timestamp).getTime()) / 1000)
    }));

    res.json({
      success: true,
      total_in_memory: Object.keys(driverLocations).length,
      active_count: allLocations.filter(d => d.is_active).length,
      drivers: allLocations
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all active drivers
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const activeDrivers = {};

    console.log('📍 [ACTIVE] Total drivers in memory:', Object.keys(driverLocations).length);

    for (const [driverId, location] of Object.entries(driverLocations)) {
      const locTime = new Date(location.timestamp);
      const isActive = locTime > fiveMinutesAgo;
      console.log(`📍 Driver ${driverId}: timestamp=${location.timestamp}, isActive=${isActive}`);

      if (isActive) {
        activeDrivers[driverId] = location;
      }
    }

    console.log('📍 [ACTIVE] Returning', Object.keys(activeDrivers).length, 'active drivers');
    res.json(activeDrivers);
  } catch (error) {
    console.error('Get active drivers error:', error);
    res.status(500).json({ error: 'Failed to get drivers' });
  }
});

// Get all active drivers with full details (for dashboard)
router.get('/drivers/active', async (req, res) => {
  try {
    console.log('📊 [TRACKING] Fetching all active drivers for dashboard');

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const activeDriversArray = [];

    for (const [driverId, location] of Object.entries(driverLocations)) {
      if (new Date(location.timestamp) > fiveMinutesAgo) {
        // Fetch driver details from database
        try {
          const driverResult = await pool.query(`
            SELECT 
              d.id,
              d.name,
              d.phone,
              d.vehicle_type,
              d.license_plate,
              d.status,
              COUNT(CASE WHEN o.status IN ('Confirmed', 'Preparing', 'Delivering') THEN 1 END) as active_orders_count
            FROM drivers d
            LEFT JOIN orders o ON o.driver_id = d.id AND o.status IN ('Confirmed', 'Preparing', 'Delivering')
            WHERE d.id = $1
            GROUP BY d.id, d.name, d.phone, d.vehicle_type, d.license_plate, d.status
          `, [driverId]);

          const driver = driverResult.rows[0];

          activeDriversArray.push({
            driver_id: driverId,
            driver_name: driver?.name || 'Unknown',
            driver_phone: driver?.phone || '',
            driver_lat: location.driver_lat,
            driver_lng: location.driver_lng,
            status: location.status || driver?.status || 'متاح',
            vehicle_type: driver?.vehicle_type || '',
            license_plate: driver?.license_plate || '',
            active_orders_count: parseInt(driver?.active_orders_count || 0),
            order_id: location.order_id,
            dest_lat: location.dest_lat,
            dest_lng: location.dest_lng,
            leg: location.leg,
            last_seen: location.timestamp
          });
        } catch (dbError) {
          console.error(`Error fetching driver ${driverId} details:`, dbError);
          // Still include location even if DB query fails
          activeDriversArray.push({
            driver_id: driverId,
            driver_name: 'Unknown',
            driver_phone: '',
            ...location
          });
        }
      }
    }

    console.log(`✅ [TRACKING] Found ${activeDriversArray.length} active drivers`);

    res.json({
      success: true,
      drivers: activeDriversArray,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [TRACKING] Error fetching active drivers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Find nearest available driver
router.post('/find-nearest', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'latitude and longitude required' });
    }

    const availableDrivers = Object.entries(driverLocations).filter(
      ([_, location]) => {
        const isRecent = new Date(location.timestamp) > new Date(Date.now() - 5 * 60 * 1000);
        // Check for both English and Arabic status values
        const isAvailable = (location.status === 'available' || location.status === 'متاح') && !location.order_id;
        return isRecent && isAvailable;
      }
    );

    if (availableDrivers.length === 0) {
      return res.status(404).json({ error: 'No available drivers' });
    }

    const driversWithDistance = availableDrivers.map(([driverId, location]) => {
      const distance = calculateDistance(
        latitude,
        longitude,
        location.driver_lat,
        location.driver_lng
      );
      return { driverId, distance, location };
    });

    driversWithDistance.sort((a, b) => a.distance - b.distance);
    const nearest = driversWithDistance[0];

    res.json({
      driver_id: nearest.driverId,
      distance_km: nearest.distance.toFixed(2),
      location: nearest.location
    });
  } catch (error) {
    console.error('Find nearest driver error:', error);
    res.status(500).json({ error: 'Failed to find nearest driver' });
  }
});

// Assign order to driver
router.post('/assign-order', authenticateToken, async (req, res) => {
  try {
    const { driver_id, order_id, dest_lat, dest_lng } = req.body;

    if (!driver_id || !order_id) {
      return res.status(400).json({ error: 'driver_id and order_id required' });
    }

    if (!driverLocations[driver_id]) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    driverLocations[driver_id].order_id = order_id;
    driverLocations[driver_id].dest_lat = dest_lat;
    driverLocations[driver_id].dest_lng = dest_lng;
    driverLocations[driver_id].status = 'busy'; // or 'مشغول'
    driverLocations[driver_id].leg = 'pickup';
    driverLocations[driver_id].timestamp = new Date().toISOString(); // Update timestamp

    console.log(`✅ Order ${order_id} assigned to driver ${driver_id}`);

    res.json({
      status: 'ok',
      message: 'Order assigned to driver',
      driver_id,
      order_id
    });
  } catch (error) {
    console.error('Assign order error:', error);
    res.status(500).json({ error: 'Failed to assign order' });
  }
});

// Get driver's assigned orders (for mobile app)
router.get('/:id/orders', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        o.*,
        c.phone as customer_phone,
        c.first_name,
        c.last_name,
        dz.name as zone_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN delivery_zones dz ON o.delivery_zone_id = dz.id
      WHERE o.driver_id = $1 
        AND o.status NOT IN ('delivered', 'cancelled')
      ORDER BY o.created_at DESC
    `, [parseInt(id)]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get driver orders error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
});

// Driver logout - remove from active tracking
router.post('/driver/logout', async (req, res) => {
  try {
    const { driver_id } = req.body;

    if (!driver_id) {
      return res.status(400).json({ success: false, error: 'driver_id is required' });
    }

    console.log(`🚪 [LOGOUT] Driver ${driver_id} requesting logout`);

    // Check for active orders
    const activeOrders = await pool.query(
      `SELECT COUNT(*) as count FROM orders 
       WHERE driver_id = $1 AND status IN ('Pending', 'Confirmed', 'Preparing', 'Delivering', 'OutForDelivery')`,
      [parseInt(driver_id)]
    );

    const activeCount = parseInt(activeOrders.rows[0].count);

    if (activeCount > 0) {
      console.log(`❌ [LOGOUT] Driver ${driver_id} has ${activeCount} active orders - cannot logout`);
      return res.status(400).json({
        success: false,
        error: 'لا يمكنك تسجيل الخروج لديك طلبات نشطة',
        activeOrders: activeCount
      });
    }

    // Remove from in-memory tracking
    if (driverLocations[driver_id]) {
      delete driverLocations[driver_id];
      console.log(`✅ [LOGOUT] Driver ${driver_id} removed from memory tracking`);
    }

    // Update DB status
    await pool.query(
      'UPDATE drivers SET status = $1 WHERE id = $2',
      ['offline', parseInt(driver_id)]
    );

    // Remove from driver_locations table
    await pool.query(
      'DELETE FROM driver_locations WHERE driver_id = $1',
      [parseInt(driver_id)]
    );

    console.log(`✅ [LOGOUT] Driver ${driver_id} fully logged out`);

    res.json({
      success: true,
      message: 'تم تسجيل الخروج بنجاح'
    });
  } catch (error) {
    console.error('❌ [LOGOUT] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to logout' });
  }
});

// Check if driver has active orders
router.get('/driver/:id/active-orders-count', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM orders 
       WHERE driver_id = $1 AND status IN ('Pending', 'Confirmed', 'Preparing', 'Delivering', 'OutForDelivery')`,
      [parseInt(id)]
    );
    res.json({
      success: true,
      activeOrders: parseInt(result.rows[0].count)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

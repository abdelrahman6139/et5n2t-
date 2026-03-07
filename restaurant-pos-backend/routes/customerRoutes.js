import express from 'express';
import pool from '../db.js';

const router = express.Router();

// ===== CUSTOMER ROUTES =====

// Get all customers with their locations
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id,
        c.phone,
        c.first_name,
        c.last_name,
        c.last_zone_id,
        z.name AS last_zone_name,
        c.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', cl.id,
              'locationName', cl.location_name,
              'zoneId', cl.zone_id,
              'street', cl.street,
              'building', cl.building,
              'floor', cl.floor,
              'apartment', cl.apartment,
              'landmark', cl.landmark,
              'latitude', cl.latitude,
              'longitude', cl.longitude,
              'kind', cl.kind,
              'isDefault', cl.is_default,
              'createdAt', cl.created_at,
              'updatedAt', cl.updated_at
            ) ORDER BY cl.is_default DESC, cl.id DESC
          ) FILTER (WHERE cl.id IS NOT NULL),
          '[]'
        ) as locations
      FROM customers c
      LEFT JOIN customer_locations cl ON c.id = cl.customer_id
      LEFT JOIN delivery_zones z ON c.last_zone_id = z.id
      GROUP BY c.id, c.phone, c.first_name, c.last_name, c.last_zone_id, z.name, c.updated_at
      ORDER BY c.id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Search customers by phone or name
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    const result = await pool.query(
      `SELECT 
        c.id,
        c.phone,
        c.first_name,
        c.last_name,
        c.last_zone_id,
        z.name AS last_zone_name,
        c.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', cl.id,
              'locationName', cl.location_name,
              'zoneId', cl.zone_id,
              'street', cl.street,
              'building', cl.building,
              'floor', cl.floor,
              'apartment', cl.apartment,
              'landmark', cl.landmark,
              'latitude', cl.latitude,
              'longitude', cl.longitude,
              'kind', cl.kind,
              'isDefault', cl.is_default
            ) ORDER BY cl.is_default DESC
          ) FILTER (WHERE cl.id IS NOT NULL),
          '[]'
        ) as locations
      FROM customers c
      LEFT JOIN customer_locations cl ON c.id = cl.customer_id
      LEFT JOIN delivery_zones z ON c.last_zone_id = z.id
      WHERE c.phone LIKE $1 OR c.first_name ILIKE $2 OR c.last_name ILIKE $2
      GROUP BY c.id, c.phone, c.first_name, c.last_name, c.last_zone_id, z.name, c.updated_at
      ORDER BY c.id DESC LIMIT 20`,
      [`%${query}%`, `%${query}%`]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get customer by ID with locations
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT 
        c.id,
        c.phone,
        c.first_name,
        c.last_name,
        c.last_zone_id,
        z.name AS last_zone_name,
        c.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', cl.id,
              'locationName', cl.location_name,
              'zoneId', cl.zone_id,
              'street', cl.street,
              'building', cl.building,
              'floor', cl.floor,
              'apartment', cl.apartment,
              'landmark', cl.landmark,
              'latitude', cl.latitude,
              'longitude', cl.longitude,
              'kind', cl.kind,
              'isDefault', cl.is_default
            ) ORDER BY cl.is_default DESC
          ) FILTER (WHERE cl.id IS NOT NULL),
          '[]'
        ) as locations
      FROM customers c
      LEFT JOIN customer_locations cl ON c.id = cl.customer_id
      LEFT JOIN delivery_zones z ON c.last_zone_id = z.id
      WHERE c.id = $1
      GROUP BY c.id, c.phone, c.first_name, c.last_name, c.last_zone_id, z.name, c.updated_at`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Create new customer with locations
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { firstName, lastName, phone, locations = [] } = req.body;

    // Insert customer
    const customerResult = await client.query(
      `INSERT INTO customers (first_name, last_name, phone, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING *`,
      [firstName, lastName, phone]
    );

    const customerId = customerResult.rows[0].id;
    const insertedLocations = [];

    // Insert locations if provided
    if (locations.length > 0) {
      for (let i = 0; i < locations.length; i++) {
        const loc = locations[i];
        const isDefault = i === 0 || loc.isDefault; // First location is default

        const locResult = await client.query(
          `INSERT INTO customer_locations 
           (customer_id, location_name, zone_id, street, building, floor, apartment, 
            landmark, latitude, longitude, kind, is_default, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING *`,
          [
            customerId,
            loc.locationName || '',
            loc.zoneId || null,
            loc.street || '',
            loc.building || '',
            loc.floor || '',
            loc.apartment || '',
            loc.landmark || '',
            loc.latitude || null,
            loc.longitude || null,
            loc.kind || 'Home',
            isDefault
          ]
        );
        insertedLocations.push(locResult.rows[0]);
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      ...customerResult.rows[0],
      locations: insertedLocations
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Customer creation error:', error);
    res.status(500).json({ error: 'Customer creation failed' });
  } finally {
    client.release();
  }
});

// Update customer basic info (name and phone only)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone } = req.body;

    const result = await pool.query(
      `UPDATE customers
       SET first_name = $1, last_name = $2, phone = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [firstName, lastName, phone, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Customer update error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// Update last delivery zone for a customer
router.patch('/:id/last-zone', async (req, res) => {
  try {
    const { id } = req.params;
    const { zoneId } = req.body;

    const result = await pool.query(
      `UPDATE customers
       SET last_zone_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, last_zone_id`,
      [zoneId || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update last zone error:', error);
    res.status(500).json({ error: 'Failed to update last zone' });
  }
});

// Delete customer (and all their locations via CASCADE)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM customers WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Customer deletion error:', error);
    if (error.code === '23503') {
      res.status(400).json({ error: 'Cannot delete customer with existing orders' });
    } else {
      res.status(500).json({ error: 'Failed to delete customer' });
    }
  }
});

// ===== LOCATION ROUTES =====

// Add new location to customer
router.post('/:customerId/locations', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { customerId } = req.params;
    const {
      locationName,
      zoneId,
      street,
      building,
      floor,
      apartment,
      landmark,
      latitude,
      longitude,
      kind,
      isDefault
    } = req.body;

    // If this location is set as default, unset other defaults
    if (isDefault) {
      await client.query(
        'UPDATE customer_locations SET is_default = false WHERE customer_id = $1',
        [customerId]
      );
    }

    const result = await client.query(
      `INSERT INTO customer_locations 
       (customer_id, location_name, zone_id, street, building, floor, apartment, 
        landmark, latitude, longitude, kind, is_default, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        customerId,
        locationName || '',
        zoneId || null,
        street || '',
        building || '',
        floor || '',
        apartment || '',
        landmark || '',
        latitude || null,
        longitude || null,
        kind || 'Home',
        isDefault || false
      ]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Location creation error:', error);
    res.status(500).json({ error: 'Failed to create location' });
  } finally {
    client.release();
  }
});

// Update location
router.put('/:customerId/locations/:locationId', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { customerId, locationId } = req.params;
    const {
      locationName,
      zoneId,
      street,
      building,
      floor,
      apartment,
      landmark,
      latitude,
      longitude,
      kind,
      isDefault
    } = req.body;

    // If this location is set as default, unset other defaults
    if (isDefault) {
      await client.query(
        'UPDATE customer_locations SET is_default = false WHERE customer_id = $1 AND id != $2',
        [customerId, locationId]
      );
    }

    const result = await client.query(
      `UPDATE customer_locations
       SET location_name = $1, zone_id = $2, street = $3, building = $4, 
           floor = $5, apartment = $6, landmark = $7, latitude = $8, 
           longitude = $9, kind = $10, is_default = $11, updated_at = CURRENT_TIMESTAMP
       WHERE id = $12 AND customer_id = $13
       RETURNING *`,
      [
        locationName,
        zoneId || null,
        street,
        building,
        floor,
        apartment,
        landmark,
        latitude || null,
        longitude || null,
        kind,
        isDefault,
        locationId,
        customerId
      ]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Location not found' });
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Location update error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  } finally {
    client.release();
  }
});

// Delete location
router.delete('/:customerId/locations/:locationId', async (req, res) => {
  try {
    const { customerId, locationId } = req.params;

    const result = await pool.query(
      'DELETE FROM customer_locations WHERE id = $1 AND customer_id = $2 RETURNING *',
      [locationId, customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json({ success: true, message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Location deletion error:', error);
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

// Set default location
router.patch('/:customerId/locations/:locationId/default', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { customerId, locationId } = req.params;

    // Unset all defaults for this customer
    await client.query(
      'UPDATE customer_locations SET is_default = false WHERE customer_id = $1',
      [customerId]
    );

    // Set the specified location as default
    const result = await client.query(
      'UPDATE customer_locations SET is_default = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND customer_id = $2 RETURNING *',
      [locationId, customerId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Location not found' });
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Set default location error:', error);
    res.status(500).json({ error: 'Failed to set default location' });
  } finally {
    client.release();
  }
});

// Patch location zone only
router.patch('/:customerId/locations/:locationId/zone', async (req, res) => {
  try {
    const { customerId, locationId } = req.params;
    const { zoneId } = req.body;
    const result = await pool.query(
      `UPDATE customer_locations
       SET zone_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND customer_id = $3
       RETURNING id, zone_id`,
      [zoneId || null, locationId, customerId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update location zone error:', error);
    res.status(500).json({ error: 'Failed to update location zone' });
  }
});

export default router;

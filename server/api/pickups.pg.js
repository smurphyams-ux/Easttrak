// Express router for pickups using PostgreSQL
import express from 'express';
import pool from '../db.js';
import { io } from '../server.js';

const router = express.Router();

const normalizeOptionalValue = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return value;
};

// GET /api/pickups
router.get('/', async (req, res) => {
  try {
    const { businessId } = req.query;
    let result;
    if (businessId) {
      result = await pool.query('SELECT * FROM pickups WHERE business_id = $1 ORDER BY id DESC', [businessId]);
    } else {
      result = await pool.query('SELECT * FROM pickups ORDER BY id DESC');
    }
    // Map snake_case DB fields to camelCase for frontend compatibility
    const pickups = result.rows.map(row => ({
      id: row.id,
      businessId: row.business_id,
      pickupAddress: row.pickup_address,
      latitude: row.latitude,
      longitude: row.longitude,
      status: row.status,
      scheduledDate: row.scheduled_date,
      phoneNumber: row.phone_number,
      trailerNumber: row.trailer_number,
      trailerSize: row.trailer_size,
      notes: row.notes,
      customerName: row.customer_name,
      city: row.city,
      state: row.state,
      zip: row.zip,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // Add any other fields as needed
    }));
    res.json(pickups);
  } catch (err) {
    console.error('Error fetching pickups from DB:', err);
    res.status(500).json({ error: 'Failed to fetch pickups' });
  }
});

// POST /api/pickups
router.post('/', async (req, res) => {
  try {
    let pickup = req.body.pickup ? req.body.pickup : req.body;
    if (typeof pickup !== 'object' || !pickup.pickupAddress) {
      return res.status(400).json({ error: 'Invalid pickup payload' });
    }

    const pickupId = String(pickup.id || Date.now());
    const insertQuery = `
      INSERT INTO pickups (
        id, business_id, pickup_address, latitude, longitude, status, scheduled_date, phone_number, trailer_number, trailer_size, notes,
        customer_name, city, state, zip
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      ) RETURNING *;
    `;
    const values = [
      pickupId,
      normalizeOptionalValue(pickup.businessId),
      pickup.pickupAddress,
      normalizeOptionalValue(pickup.latitude),
      normalizeOptionalValue(pickup.longitude),
      normalizeOptionalValue(pickup.status) || 'pickup',
      normalizeOptionalValue(pickup.scheduledDate),
      normalizeOptionalValue(pickup.phoneNumber),
      normalizeOptionalValue(pickup.trailerNumber),
      normalizeOptionalValue(pickup.trailerSize),
      normalizeOptionalValue(pickup.notes),
      normalizeOptionalValue(pickup.customerName),
      normalizeOptionalValue(pickup.city),
      normalizeOptionalValue(pickup.state),
      normalizeOptionalValue(pickup.zip)
    ];
    const result = await pool.query(insertQuery, values);
    const newPickup = result.rows[0];
    // Emit real-time event
    io.emit('pickup_update', { type: 'add', pickup: newPickup });
    res.json({ success: true, pickup: newPickup });
  } catch (err) {
    console.error('Error saving pickup:', err);
    res.status(500).json({ error: 'Failed to save pickup' });
  }
});

// PATCH /api/pickups/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!String(status || '').trim()) {
      return res.status(400).json({ error: 'Missing status' });
    }

    const result = await pool.query(
      'UPDATE pickups SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *;',
      [String(status), String(id)]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pickup not found' });
    }

    io.emit('pickup_update', { type: 'update', pickup: result.rows[0] });
    res.json({ success: true, pickup: result.rows[0] });
  } catch (err) {
    console.error('Error updating pickup status:', err);
    res.status(500).json({ error: 'Failed to update pickup status' });
  }
});

// DELETE /api/pickups/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM pickups WHERE id = $1 RETURNING *;', [String(id)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pickup not found' });
    }

    io.emit('pickup_update', { type: 'delete', pickup: result.rows[0] });
    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting pickup:', err);
    res.status(500).json({ error: 'Failed to delete pickup' });
  }
});

export default router;

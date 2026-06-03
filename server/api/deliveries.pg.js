// Express router for deliveries using PostgreSQL
import express from 'express';
import pool from '../db.js';
import { io } from '../server.js';

const router = express.Router();

// GET /api/deliveries
router.get('/', async (req, res) => {
  try {
    const { businessId } = req.query;
    let result;
    if (businessId) {
      result = await pool.query('SELECT * FROM deliveries WHERE business_id = $1 ORDER BY id DESC', [businessId]);
    } else {
      result = await pool.query('SELECT * FROM deliveries ORDER BY id DESC');
    }
    // Map snake_case DB fields to camelCase for frontend compatibility
    const deliveries = result.rows.map(row => ({
      id: row.id,
      containerNumber: row.container_number,
      businessId: row.business_id,
      deliveryAddress: row.delivery_address,
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
    res.json(deliveries);
  } catch (err) {
    console.error('Error fetching deliveries from DB:', err);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

// POST /api/deliveries
router.post('/', async (req, res) => {
  try {
    let delivery = req.body.delivery ? req.body.delivery : req.body;
    if (typeof delivery !== 'object' || !delivery.deliveryAddress) {
      return res.status(400).json({ error: 'Invalid delivery payload' });
    }
    const insertQuery = `
      INSERT INTO deliveries (
        container_number, business_id, delivery_address, latitude, longitude, status, scheduled_date, phone_number, trailer_number, trailer_size, notes,
        customer_name, city, state, zip
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      ) RETURNING *;
    `;
    const values = [
      delivery.containerNumber || '',
      delivery.businessId || '',
      delivery.deliveryAddress || '',
      delivery.latitude || 0,
      delivery.longitude || 0,
      delivery.status || 'in-transit',
      delivery.scheduledDate || new Date().toISOString(),
      delivery.phoneNumber || '',
      delivery.trailerNumber || '',
      delivery.trailerSize || '',
      delivery.notes || '',
      delivery.customerName || '',
      delivery.city || '',
      delivery.state || '',
      delivery.zip || ''
    ];
    const result = await pool.query(insertQuery, values);
    // Emit real-time event
    io.emit('delivery_update', { type: 'add', delivery: result.rows[0] });
    res.json({ success: true, delivery: result.rows[0] });
  } catch (err) {
    console.error('Error saving delivery:', err);
    res.status(500).json({ error: 'Failed to save delivery' });
  }
});

// PATCH /api/deliveries/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!String(status || '').trim()) {
      return res.status(400).json({ error: 'Missing status' });
    }
    const result = await pool.query('UPDATE deliveries SET status = $1 WHERE id = $2 RETURNING *;', [status, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    res.json({ success: true, delivery: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update delivery status' });
  }
});

export default router;

// DELETE /api/deliveries/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM deliveries WHERE id = $1 RETURNING *;', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    // Emit real-time event
    io.emit('delivery_update', { type: 'delete', delivery: result.rows[0] });
    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    console.error('Error deleting delivery:', err);
    res.status(500).json({ error: 'Failed to delete delivery' });
  }
});

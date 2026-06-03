// Basic Express router for deliveries

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const dataPath = path.join(__dirname, '..', 'data', 'deliveries.json');


router.get('/', (req, res) => {
  try {
    let deliveries = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const { businessId } = req.query;
    if (businessId) {
      deliveries = deliveries.filter(d => String(d.businessId) === String(businessId));
    }
    res.json(deliveries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load deliveries' });
  }
});


// POST /api/deliveries
router.post('/', (req, res) => {
  try {
    const deliveries = fs.existsSync(dataPath)
      ? JSON.parse(fs.readFileSync(dataPath, 'utf8'))
      : [];
    // Accept both { delivery: { ... } } and flat payloads
    let delivery = req.body.delivery ? req.body.delivery : req.body;
    if (typeof delivery !== 'object' || !delivery.deliveryAddress) {
      return res.status(400).json({ error: 'Invalid delivery payload' });
    }
    delivery.id = Date.now().toString();
    deliveries.push(delivery);
    fs.writeFileSync(dataPath, JSON.stringify(deliveries, null, 2));
    res.json({ success: true, delivery });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save delivery' });
  }
});


// PATCH /api/deliveries/:id/status - update delivery status
router.patch('/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!String(status || '').trim()) {
      return res.status(400).json({ error: 'Missing status' });
    }

    let deliveries = fs.existsSync(dataPath)
      ? JSON.parse(fs.readFileSync(dataPath, 'utf8'))
      : [];
    const index = deliveries.findIndex((d) => String(d.id) === String(id));
    if (index === -1) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    deliveries[index] = {
      ...deliveries[index],
      status: String(status),
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(dataPath, JSON.stringify(deliveries, null, 2));
    res.json({ success: true, delivery: deliveries[index] });
  } catch (err) {
    console.error('Error updating delivery status:', err);
    res.status(500).json({ error: 'Failed to update delivery status' });
  }
});

export default router;

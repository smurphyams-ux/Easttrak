// server/api/pickups.js

import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Use the same data directory as server.js
const __dirname = path.resolve();
const dataPath = path.join(__dirname, 'data');
const pickupsFile = path.join(dataPath, 'pickups.json');

function loadPickups() {
  try {
    if (fs.existsSync(pickupsFile)) {
      return JSON.parse(fs.readFileSync(pickupsFile, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading pickups:', error);
  }
  return [];
}

function savePickups(pickups) {
  try {
    fs.writeFileSync(pickupsFile, JSON.stringify(pickups, null, 2));
  } catch (error) {
    console.error('Error saving pickups:', error);
  }
}

// Get all pickups
router.get('/', (req, res) => {
  try {
    let pickups = loadPickups();
    const { businessId } = req.query;
    if (businessId) {
      pickups = pickups.filter(p => String(p.businessId) === String(businessId));
    }
    res.json({ pickups });
  } catch (error) {
    console.error('Error fetching pickups:', error);
    res.status(500).json({ error: 'Failed to fetch pickups' });
  }
});

// Add a new pickup
router.post('/', (req, res) => {
  try {
    const pickup = req.body;
    if (!pickup.id) {
      pickup.id = Date.now().toString();
    }
    const pickups = loadPickups();
    pickups.push(pickup);
    savePickups(pickups);
    res.json({ success: true, pickup });
  } catch (error) {
    console.error('Error saving pickup:', error);
    res.status(500).json({ error: 'Failed to save pickup' });
  }
});

// Update pickup status
router.patch('/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!String(status || '').trim()) {
      return res.status(400).json({ error: 'Missing status' });
    }

    const pickups = loadPickups();
    const index = pickups.findIndex((p) => String(p.id) === String(id));
    if (index === -1) {
      return res.status(404).json({ error: 'Pickup not found' });
    }

    pickups[index] = {
      ...pickups[index],
      status: String(status),
      updatedAt: new Date().toISOString(),
    };

    savePickups(pickups);
    res.json({ success: true, pickup: pickups[index] });
  } catch (error) {
    console.error('Error updating pickup status:', error);
    res.status(500).json({ error: 'Failed to update pickup status' });
  }
});

// Delete a pickup
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    let pickups = loadPickups();
    pickups = pickups.filter(p => p.id !== id);
    savePickups(pickups);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting pickup:', error);
    res.status(500).json({ error: 'Failed to delete pickup' });
  }
});

export default router;

// server/api/stops.js

import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Use the same data directory as server.js
const __dirname = path.resolve();
const dataPath = path.join(__dirname, 'data');
const stopsFile = path.join(dataPath, 'stops.json');

function loadStops() {
  try {
    if (fs.existsSync(stopsFile)) {
      return JSON.parse(fs.readFileSync(stopsFile, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading stops:', error);
  }
  return [];
}

function saveStops(stops) {
  try {
    fs.writeFileSync(stopsFile, JSON.stringify(stops, null, 2));
  } catch (error) {
    console.error('Error saving stops:', error);
  }
}

// Get all stops
router.get('/', (req, res) => {
  try {
    let stops = loadStops();
    const { businessId } = req.query;
    if (businessId) {
      stops = stops.filter(s => String(s.businessId) === String(businessId));
    }
    res.json({ stops });
  } catch (error) {
    console.error('Error fetching stops:', error);
    res.status(500).json({ error: 'Failed to fetch stops' });
  }
});

// Add a new stop
router.post('/', (req, res) => {
  try {
    const stop = req.body;
    if (!stop.id) {
      stop.id = Date.now().toString();
    }
    const stops = loadStops();
    stops.push(stop);
    saveStops(stops);
    res.json({ success: true, stop });
  } catch (error) {
    console.error('Error saving stop:', error);
    res.status(500).json({ error: 'Failed to save stop' });
  }
});

export default router;

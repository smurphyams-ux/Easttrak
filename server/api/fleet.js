
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Accept io instance for emitting events
export default function createFleetRouter(io) {
  const router = express.Router();

  // ES module __dirname equivalent
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dataPath = path.join(__dirname, '../../web/src/data');
  const fleetFile = path.join(dataPath, 'fleet_trailers.json');

  // GET all trailers
  router.get('/', (req, res) => {
    try {
      const data = fs.readFileSync(fleetFile, 'utf8');
      res.json(JSON.parse(data));
    } catch (err) {
      res.status(500).json({ error: 'Failed to read fleet data.' });
    }
  });

  // PUT (replace all trailers)
  router.put('/', (req, res) => {
    try {
      fs.writeFileSync(fleetFile, JSON.stringify(req.body, null, 2));
      if (io) io.emit('fleet_update', { type: 'update', timestamp: Date.now() });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save fleet data.' });
    }
  });

  return router;
}


import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const dataPath = path.join(__dirname, '..', 'data', 'trailer_options.json');
console.log('[DEBUG] trailerOptions.js using dataPath:', dataPath);
console.log('[DEBUG] trailerOptions.js using dataPath:', dataPath);

function loadOptions() {
  try {
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf8');
      console.log('[DEBUG] trailerOptions.js loaded data:', data);
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading trailer options:', error);
  }
  return [];
}

function saveOptions(options) {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(options, null, 2));
  } catch (error) {
    console.error('Error saving trailer options:', error);
  }
}

// GET /api/trailer-options
router.get('/', (req, res) => {
  const options = loadOptions();
  res.json({ success: true, options });
});

// POST /api/trailer-options
router.post('/', (req, res) => {
  const { number, size } = req.body;
  if (!number || typeof number !== 'string') {
    return res.status(400).json({ success: false, error: 'Trailer number is required' });
  }
  const options = loadOptions();
  // Prevent duplicates by trailer number (string match)
  if (options.some(opt => String(opt.number) === String(number))) {
    return res.json({ success: true, option: options.find(opt => String(opt.number) === String(number)) });
  }
  const newOption = { number, size };
  options.push(newOption);
  saveOptions(options);
  res.json({ success: true, option: newOption });
});

export default router;

import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import twilio from 'twilio';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import pool from './db.js';
import customerApi from './api/customers.js';
import invoicesApi from './api/invoices.js';
import trailerOptionsApi from './api/trailerOptions.js';
import createFleetRouter from './api/fleet.js';
import pickupsApi from './api/pickups.pg.js';
import deliveriesApi from './api/deliveries.pg.js';
import emailInvoiceApi from './api/emailInvoice.js';
import stopsApi from './api/stops.js';

console.log('DEBUG: server.js is starting...');

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const frontendDistPath = path.join(__dirname, '..', 'web', 'dist');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });
// Also load workspace-root .env as fallback for shared/local settings.
dotenv.config({ path: path.join(__dirname, '..', '.env') });


const app = express();
const server = http.createServer(app);
const configuredFrontendUrl = String(process.env.FRONTEND_URL || '').trim().replace(/\/$/, '');
const allowedOriginPatterns = [
  /^http:\/\/localhost(?::\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/i,
  /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(?::\d+)?$/i,
  /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?$/i,
  /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(?::\d+)?$/i,
];
const isAllowedOrigin = (origin) => {
  const normalizedOrigin = String(origin || '').trim().replace(/\/$/, '');
  if (!normalizedOrigin) return true;
  if (configuredFrontendUrl && normalizedOrigin === configuredFrontendUrl) return true;
  return allowedOriginPatterns.some((pattern) => pattern.test(normalizedOrigin));
};
const corsOriginHandler = (origin, callback) => {
  if (isAllowedOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`CORS origin not allowed: ${origin || 'unknown'}`));
};
const io = new SocketIOServer(server, {
  cors: {
    origin: corsOriginHandler,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
});
const PORT = Number(process.env.PORT || 5001);

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Socket.IO client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Socket.IO client disconnected:', socket.id);
  });
});
// Example: emit events on delivery or pickup changes (for demo, real logic should be in your add/delete endpoints)
app.post('/api/emit-delivery-update', (req, res) => {
  io.emit('delivery_update', { type: 'update', timestamp: Date.now() });
  res.json({ success: true });
});
app.post('/api/emit-pickup-update', (req, res) => {
  io.emit('pickup_update', { type: 'update', timestamp: Date.now() });
  res.json({ success: true });
});

// Middleware
app.use(cors({
  origin: corsOriginHandler,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
// Simple dumpsters locations endpoint for frontend compatibility
app.get('/api/dumpsters/locations', (req, res) => {
  // You can add sample data here if needed
  res.json([]);
});
app.use(bodyParser.json());

// DEBUG/ADMIN: Clear all payment logs (for troubleshooting only)
// This must be after app is initialized and middleware is set up, before API routes
app.post('/api/payment-logs/clear', (req, res) => {
  try {
    fs.writeFileSync(paymentLogsFile, JSON.stringify([], null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API routes
app.use('/api/customers', customerApi);
app.use('/api/invoices', invoicesApi);
app.use('/api/trailer-options', trailerOptionsApi);

app.use('/api/pickups', pickupsApi);
app.use('/api/deliveries', deliveriesApi);
app.use('/api/email-invoice', emailInvoiceApi);
app.use('/api/stops', stopsApi);
app.use('/api/fleet', createFleetRouter(io));


// Twilio Configuration
let twilioClient = null;
try {
  const rawAccountSid = String(process.env.TWILIO_ACCOUNT_SID || '').trim();
  const rawAuthToken = String(process.env.TWILIO_AUTH_TOKEN || '').trim();
  const explicitApiKeySid = String(process.env.TWILIO_API_KEY_SID || '').trim();
  const explicitApiKeySecret = String(process.env.TWILIO_API_KEY_SECRET || '').trim();
  const explicitApiAccountSid = String(process.env.TWILIO_API_ACCOUNT_SID || '').trim();

  const accountSid = rawAccountSid.startsWith('AC')
    ? rawAccountSid
    : (explicitApiAccountSid.startsWith('AC') ? explicitApiAccountSid : '');

  // Compatibility: if TWILIO_ACCOUNT_SID is an API key (SK...), treat TWILIO_AUTH_TOKEN as the API secret.
  const apiKeySid = explicitApiKeySid || (rawAccountSid.startsWith('SK') ? rawAccountSid : '');
  const apiKeySecret = explicitApiKeySecret || (apiKeySid && rawAuthToken ? rawAuthToken : '');

  if (apiKeySid && apiKeySecret && accountSid) {
    twilioClient = twilio(apiKeySid, apiKeySecret, { accountSid });
    console.log('✅ Twilio SMS configured (API key mode)');
  } else if (accountSid && rawAuthToken) {
    twilioClient = twilio(accountSid, rawAuthToken);
    console.log('✅ Twilio SMS configured (Auth token mode)');
  } else {
    console.log('⚠️  Twilio not configured - SMS reminders disabled');
    console.log('   Set either:');
    console.log('   - TWILIO_ACCOUNT_SID (AC...) + TWILIO_AUTH_TOKEN + TWILIO_PHONE_NUMBER');
    console.log('   - TWILIO_API_KEY_SID (SK...) + TWILIO_API_KEY_SECRET + TWILIO_API_ACCOUNT_SID (AC...) + TWILIO_PHONE_NUMBER');
  }
} catch (error) {
  console.log('⚠️  Twilio initialization failed:', error.message);
}


// Data storage path (in production, use a real database)
const dataPath = path.join(__dirname, 'data');
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath);
}

// Load/Save deliveries
const deliveriesFile = path.join(dataPath, 'deliveries.json');
const loadDeliveries = () => {
  try {
    if (fs.existsSync(deliveriesFile)) {
      return JSON.parse(fs.readFileSync(deliveriesFile, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading deliveries:', error);
  }
  return [];
};

const saveDeliveries = (deliveries) => {
  try {
    fs.writeFileSync(deliveriesFile, JSON.stringify(deliveries, null, 2));
  } catch (error) {
    console.error('Error saving deliveries:', error);
  }
};

const trailerLocationsFile = path.join(dataPath, 'trailer_locations.json');
const loadTrailerLocations = () => {
  try {
    if (fs.existsSync(trailerLocationsFile)) {
      const parsed = JSON.parse(fs.readFileSync(trailerLocationsFile, 'utf8'));
      if (parsed && typeof parsed === 'object') {
        return {
          latest: parsed.latest && typeof parsed.latest === 'object' ? parsed.latest : {},
          events: Array.isArray(parsed.events) ? parsed.events : [],
          reverseGeocodeCache:
            parsed.reverseGeocodeCache && typeof parsed.reverseGeocodeCache === 'object'
              ? parsed.reverseGeocodeCache
              : {},
        };
      }
    }
  } catch (error) {
    console.error('Error loading trailer locations:', error);
  }
  return { latest: {}, events: [], reverseGeocodeCache: {} };
};

const saveTrailerLocations = (payload) => {
  try {
    fs.writeFileSync(trailerLocationsFile, JSON.stringify(payload, null, 2));
  } catch (error) {
    console.error('Error saving trailer locations:', error);
  }
};

const parseTrailerIdFromQr = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';

  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const parsed = JSON.parse(text);
      const type = String(parsed?.type || '').toLowerCase();
      const id = String(parsed?.id || parsed?.trailerId || '').trim();
      if (id && (!type || type === 'trailer')) {
        return id;
      }
    } catch {
      // Continue with plain-text parser.
    }
  }

  const prefixed = text.match(/^(?:trailer[:\-|\s]+)(.+)$/i);
  if (prefixed?.[1]) {
    return String(prefixed[1]).trim();
  }

  return text;
};

const reverseGeocodeTrailerLocation = async (lat, lng) => {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=jsonv2`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'EasyTrak/1.0 (local development)',
      Accept: 'application/json',
    },
  });
  const data = await response.json();
  return String(data?.display_name || '').trim();
};

const createTrackingToken = () => crypto.randomBytes(24).toString('hex');

const getStaxApiBaseUrl = () =>
  String(process.env.STAX_API_BASE_URL || 'https://apigw-sandbox.fattlabs.com').replace(/\/$/, '');

const getStaxApiToken = () => String(process.env.STAX_API_TOKEN || '').trim();
const getStaxHostedCheckoutTemplate = () => String(process.env.STAX_HOSTED_CHECKOUT_TEMPLATE || '').trim();

const buildStaxHostedCheckoutUrl = ({ hostedToken, invoiceId, amount }) => {
  const template = getStaxHostedCheckoutTemplate();
  if (!template) return '';

  return template
    .replace('{hostedToken}', encodeURIComponent(String(hostedToken || '')))
    .replace('{invoiceId}', encodeURIComponent(String(invoiceId || '')))
    .replace('{amount}', encodeURIComponent(String(amount || '')));
};

const callStaxApi = async ({ path: endpointPath, method = 'GET', payload }) => {
  const token = getStaxApiToken();
  if (!token) {
    throw new Error('STAX_API_TOKEN is not configured on the server');
  }

  const url = `${getStaxApiBaseUrl()}${endpointPath}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: payload ? JSON.stringify(payload) : undefined,
    signal: AbortSignal.timeout(20000),
  });

  const text = await response.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }
  }

  if (!response.ok) {
    const detailFromPayload =
      parsed?.error ||
      parsed?.message ||
      parsed?.errors ||
      parsed?.details ||
      parsed?.raw;
    const detail = detailFromPayload
      ? `Stax request failed (${response.status}): ${
          typeof detailFromPayload === 'string' ? detailFromPayload : JSON.stringify(detailFromPayload)
        }`
      : `Stax request failed (${response.status})`;
    throw new Error(detail);
  }

  return parsed;
};

const chargeInvoiceWithStax = async ({ invoice, paymentMethodId, customerId, metadata }) => {
  const normalizedAmount = Number(invoice?.amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error('Invoice amount is invalid');
  }
  if (!paymentMethodId) {
    throw new Error('paymentMethodId is required');
  }

  const staxPayload = {
    total: Number(normalizedAmount.toFixed(2)),
    method: 'card',
    payment_method_id: String(paymentMethodId),
    customer_id: customerId ? String(customerId) : undefined,
    meta: {
      invoiceId: String(invoice?.id || ''),
      invoiceNumber: String(invoice?.invoice_id || invoice?.invoice_number || ''),
      customerName: String(invoice?.customer_name || invoice?.customerName || ''),
      ...(metadata && typeof metadata === 'object' ? metadata : {}),
    },
  };

  return callStaxApi({
    path: '/charge',
    method: 'POST',
    payload: staxPayload,
  });
};

const createStaxCustomer = async ({ firstName, lastName, email }) => {
  return callStaxApi({
    path: '/customer',
    method: 'POST',
    payload: {
      firstname: String(firstName || 'Sandbox'),
      lastname: String(lastName || 'Customer'),
      email: String(email || ''),
    },
  });
};

const createStaxSandboxPaymentMethod = async ({ customerId, personName }) => {
  return callStaxApi({
    path: '/payment-method',
    method: 'POST',
    payload: {
      method: 'card',
      customer_id: String(customerId || ''),
      person_name: String(personName || 'Sandbox Customer'),
      card_number: '4111111111111111',
      card_exp: '1229',
      card_cvv: '123',
    },
  });
};

const toIsoDateTime = (value) => {
  const parsed = new Date(value || '');
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString();
};

const getTrackingBaseUrl = (req) => {
  const configured = String(process.env.PUBLIC_APP_URL || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  const origin = String(req.get('origin') || '').trim();
  if (origin) return origin.replace(/\/$/, '');
  return 'http://localhost:3001';
};

const getTrackingTokenSecret = () => String(process.env.TRACKING_TOKEN_SECRET || process.env.JWT_SECRET || 'easytrak-local-tracking-secret');

const createSignedTrackingToken = ({ type, id, expiresAt }) => {
  const payload = Buffer.from(JSON.stringify({ type, id: String(id), exp: String(expiresAt) })).toString('base64url');
  const signature = crypto.createHmac('sha256', getTrackingTokenSecret()).update(payload).digest('base64url');
  return `v1.${payload}.${signature}`;
};

const parseSignedTrackingToken = (token) => {
  const [version, payload, signature] = String(token || '').split('.');
  if (version !== 'v1' || !payload || !signature) return null;

  const expectedSignature = crypto.createHmac('sha256', getTrackingTokenSecret()).update(payload).digest('base64url');
  if (signature !== expectedSignature) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return {
      type: String(parsed?.type || ''),
      id: String(parsed?.id || ''),
      expiresAt: toIsoDateTime(parsed?.exp),
    };
  } catch {
    return null;
  }
};

const ensureTrackingLinkForDelivery = (req, delivery) => {
  const now = Date.now();
  const existingToken = String(delivery.trackingToken || '');
  const existingExpiry = toIsoDateTime(delivery.trackingExpiresAt);
  const isExistingValid =
    Boolean(existingToken) &&
    Boolean(existingExpiry) &&
    new Date(existingExpiry).getTime() > now &&
    Boolean(delivery.trackingEnabled);

  const token = isExistingValid ? existingToken : createTrackingToken();
  const expiresAt = isExistingValid ? existingExpiry : new Date(now + 24 * 60 * 60 * 1000).toISOString();
  const trackingUrl = `${getTrackingBaseUrl(req)}/track/${token}`;

  return {
    updatedDelivery: {
      ...delivery,
      trackingToken: token,
      trackingEnabled: true,
      trackingExpiresAt: expiresAt,
      trackingCreatedAt: isExistingValid ? delivery.trackingCreatedAt || new Date().toISOString() : new Date().toISOString(),
    },
    token,
    expiresAt,
    trackingUrl,
  };
};

const createTrackingLinkForPickup = (req, pickup) => {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const token = createSignedTrackingToken({ type: 'pickup', id: pickup.id, expiresAt });
  const trackingUrl = `${getTrackingBaseUrl(req)}/track/${token}`;

  return {
    token,
    expiresAt,
    trackingUrl,
  };
};

const HOME_LAT = 42.1976;
const HOME_LNG = -84.4366;
const geocodeCacheFile = path.join(dataPath, 'geocode_cache.json');

const getGoogleMapsApiKey = () =>
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.VITE_GOOGLE_MAPS_API_KEY ||
  process.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
  '';

const normalizeAddressKey = (address) =>
  String(address || '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();

const loadGeocodeCache = () => {
  try {
    if (fs.existsSync(geocodeCacheFile)) {
      return JSON.parse(fs.readFileSync(geocodeCacheFile, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading geocode cache:', error);
  }
  return {};
};

const saveGeocodeCache = (cache) => {
  try {
    fs.writeFileSync(geocodeCacheFile, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.error('Error saving geocode cache:', error);
  }
};

let geocodeCache = loadGeocodeCache();

const hasUsableAddress = (delivery) => {
  const address = String(delivery?.deliveryAddress || delivery?.pickupAddress || '').trim();
  return address.length > 0;
};

const needsGeocoding = (delivery) => {
  if (!hasUsableAddress(delivery)) return false;

  const lat = Number(delivery?.latitude);
  const lng = Number(delivery?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return true;
  if (Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001) return true;
  return Math.abs(lat - HOME_LAT) < 0.00001 && Math.abs(lng - HOME_LNG) < 0.00001;
};

const shouldVerifyAddressCoordinates = (delivery) => {
  if (!hasUsableAddress(delivery)) return false;

  const address = String(delivery.deliveryAddress || delivery.pickupAddress || '').trim();
  const addressKey = normalizeAddressKey(address);
  const currentKey = String(delivery.geocodedAddressKey || '');
  const provider = String(delivery.geocodeProvider || '').toLowerCase();
  const confidence = String(delivery.geocodeConfidence || '').toLowerCase();
  const hasGoogleKey = Boolean(getGoogleMapsApiKey());

  // Re-geocode when address changed or has never been verified.
  if (!currentKey || currentKey !== addressKey) return true;

  // Upgrade fallback/low-confidence coordinates once Google geocoding is available.
  if (hasGoogleKey && provider !== 'google') return true;
  if (hasGoogleKey && confidence === 'low') return true;

  // Also geocode if coords are clearly unusable/default.
  return needsGeocoding(delivery);
};

const extractAddressHints = (address) => {
  const text = String(address || '');
  const zipMatch = text.match(/\b\d{5}(?:-\d{4})?\b/);
  const stateMatch = text.match(/,\s*([A-Z]{2})\s*,\s*\d{5}(?:-\d{4})?\b/i);
  return {
    zip: zipMatch ? zipMatch[0] : '',
    state: stateMatch ? stateMatch[1].toUpperCase() : '',
  };
};

const extractComponent = (result, type) => {
  const components = Array.isArray(result?.address_components) ? result.address_components : [];
  const match = components.find((comp) => Array.isArray(comp.types) && comp.types.includes(type));
  return match?.short_name || match?.long_name || '';
};

const geocodeByPlaceIdWithGoogle = async (placeId) => {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey || !placeId) return null;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(placeId)}&key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.status !== 'OK' || !Array.isArray(data.results) || !data.results[0]?.geometry?.location) {
    return null;
  }

  const best = data.results[0];
  return {
    latitude: Number(best.geometry.location.lat),
    longitude: Number(best.geometry.location.lng),
    formattedAddress: best.formatted_address || '',
    provider: 'google',
    confidence: 'high',
  };
};

const geocodeWithGoogle = async (address, hints = {}) => {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) return null;

  const query = address.toLowerCase().includes('usa') ? address : `${address}, USA`;
  const components = ['country:US'];
  if (hints.state) components.push(`administrative_area:${hints.state}`);
  if (hints.zip) components.push(`postal_code:${hints.zip}`);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&region=US&components=${encodeURIComponent(components.join('|'))}&key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.status !== 'OK' || !Array.isArray(data.results) || !data.results[0]?.geometry?.location) {
    return null;
  }

  const best = data.results[0];
  const resultZip = extractComponent(best, 'postal_code');
  if (hints.zip && resultZip && !String(resultZip).startsWith(String(hints.zip).slice(0, 5))) {
    return null;
  }

  return {
    latitude: Number(best.geometry.location.lat),
    longitude: Number(best.geometry.location.lng),
    formattedAddress: best.formatted_address || address,
    provider: 'google',
    confidence: best.partial_match ? 'medium' : 'high',
  };
};

const geocodeWithNominatim = async (address) => {
  const query = address.toLowerCase().includes('usa') ? address : `${address}, USA`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'EasyTrak/1.0 (local development)',
      Accept: 'application/json',
    },
  });
  const data = await response.json();
  if (!Array.isArray(data) || !data[0]) {
    return null;
  }

  return {
    latitude: Number(data[0].lat),
    longitude: Number(data[0].lon),
    formattedAddress: data[0].display_name || address,
    provider: 'nominatim',
    confidence: 'medium',
  };
};

const geocodeAddress = async (address, placeId = '') => {
  if (!address && !placeId) return null;
  const key = placeId ? `placeid:${placeId}` : normalizeAddressKey(address);
  if (geocodeCache[key]) {
    const cached = geocodeCache[key];
    const shouldUpgradeCached =
      Boolean(getGoogleMapsApiKey()) &&
      String(cached?.provider || '').toLowerCase() !== 'google';
    if (!shouldUpgradeCached) {
      return cached;
    }
  }

  const hints = extractAddressHints(address);
  if (placeId) {
    try {
      const placeIdResult = await geocodeByPlaceIdWithGoogle(placeId);
      if (placeIdResult) {
        geocodeCache[key] = placeIdResult;
        saveGeocodeCache(geocodeCache);
        return placeIdResult;
      }
    } catch (error) {
      console.warn('Google place_id geocoding failed, using address fallback:', error?.message || error);
    }
  }

  try {
    const googleResult = await geocodeWithGoogle(address, hints);
    if (googleResult) {
      geocodeCache[key] = googleResult;
      saveGeocodeCache(geocodeCache);
      return googleResult;
    }
  } catch (error) {
    console.warn('Google geocoding failed, using fallback:', error?.message || error);
  }

  try {
    const fallbackResult = await geocodeWithNominatim(address);
    if (fallbackResult) {
      geocodeCache[key] = fallbackResult;
      saveGeocodeCache(geocodeCache);
    }
    return fallbackResult;
  } catch (error) {
    console.warn('Fallback geocoding failed:', error?.message || error);
    return null;
  }
};

const withResolvedCoordinates = async (delivery) => {
  if (!shouldVerifyAddressCoordinates(delivery)) {
    // If coordinates are missing or invalid, inject defaults
    const lat = Number(delivery?.latitude);
    const lng = Number(delivery?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (Math.abs(lat) < 0.000001 && Math.abs(lng) < 0.000001)) {
      return {
        ...delivery,
        latitude: HOME_LAT,
        longitude: HOME_LNG,
        geocodeProvider: 'default',
        geocodeConfidence: 'low',
        geocodedFormattedAddress: delivery.deliveryAddress || delivery.pickupAddress || '',
        geocodedAddressKey: normalizeAddressKey(delivery.deliveryAddress || delivery.pickupAddress || ''),
      };
    }
    return delivery;
  }

  const address = String(delivery.deliveryAddress || delivery.pickupAddress || '').trim();
  const placeId = String(delivery.placeId || '').trim();
  const resolved = await geocodeAddress(address, placeId);
  if (!resolved) {
    // If geocoding fails, inject default coordinates
    return {
      ...delivery,
      latitude: HOME_LAT,
      longitude: HOME_LNG,
      geocodeProvider: 'default',
      geocodeConfidence: 'low',
      geocodedFormattedAddress: address,
      geocodedAddressKey: normalizeAddressKey(address),
    };
  }

  return {
    ...delivery,
    latitude: resolved.latitude,
    longitude: resolved.longitude,
    geocodedAt: new Date().toISOString(),
    geocodeProvider: resolved.provider || '',
    geocodeConfidence: resolved.confidence || 'low',
    geocodedFormattedAddress: resolved.formattedAddress || address,
    geocodedAddressKey: normalizeAddressKey(address),
  };
};

// =============================
// CUSTOMERS ENDPOINT
// =============================
const customersFile = path.join(dataPath, 'customers.json');
const loadCustomers = () => {
  try {
    if (fs.existsSync(customersFile)) {
      return JSON.parse(fs.readFileSync(customersFile, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading customers:', error);
  }
  return [];
};

const saveCustomers = (customers) => {
  try {
    fs.writeFileSync(customersFile, JSON.stringify(customers, null, 2));
  } catch (error) {
    console.error('Error saving customers:', error);
  }
};

// Get all customers for a business
app.get('/api/customers', (req, res) => {
  try {
    const { businessId } = req.query;
    let customers = loadCustomers();
    if (businessId) {
      customers = customers.filter(c => c.businessId === businessId);
    }
    res.json({ customers });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: error.message });
  }
});


// Add new customer (accepts flat fields, now supports businessId)
app.post('/api/customers', (req, res) => {
  try {
    const { name, phone, email, businessId } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Missing required customer fields (name, phone)' });
    }
    let customers = loadCustomers();
    const id = Date.now().toString();
    const customer = { id, name, phone, email };
    if (businessId) customer.businessId = businessId;
    customers.push(customer);
    saveCustomers(customers);
    res.json({ success: true, customer });
  } catch (error) {
    console.error('Error saving customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// View a customer by id
app.get('/api/customers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const customers = loadCustomers();
    const customer = customers.find(c => c.id === id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Edit/update a customer by id (businessId required)
app.put('/api/customers/:id', (req, res) => {

  // Export geocodeWithGoogle for manual testing if requested (must be at end of file)
  if (process.env.EXPORT_GEOCODE) {
    module.exports = { geocodeWithGoogle };
  }
  try {
    const { id } = req.params;
    const { name, phone, email, businessId } = req.body;
    let customers = loadCustomers();
    let idx;
    if (businessId) {
      idx = customers.findIndex(c => c.id === id && c.businessId === businessId);
    } else {
      idx = customers.findIndex(c => c.id === id);
    }
    if (idx === -1) return res.status(404).json({ error: 'Customer not found' });
    customers[idx] = { ...customers[idx], name: name || customers[idx].name, phone: phone || customers[idx].phone, email: email || customers[idx].email };
    saveCustomers(customers);
    res.json({ success: true, customer: customers[idx] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete customer manually (businessId required)
app.delete('/api/customers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { businessId } = req.body;
    let customers = loadCustomers();
    const before = customers.length;
    if (businessId) {
      customers = customers.filter(c => !(c.id === id && c.businessId === businessId));
    } else {
      customers = customers.filter(c => c.id !== id);
    }
    if (customers.length === before) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    saveCustomers(customers);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================
// EXPENSE RULES (MERCHANT LEARNING)
// =============================
const expenseRulesFile = path.join(dataPath, 'expense_rules.json');
const loadExpenseRules = () => {
  try {
    if (fs.existsSync(expenseRulesFile)) {
      return JSON.parse(fs.readFileSync(expenseRulesFile, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading expense rules:', error);
  }
  return {};
};
const saveExpenseRules = (rules) => {
  try {
    fs.writeFileSync(expenseRulesFile, JSON.stringify(rules, null, 2));
  } catch (error) {
    console.error('Error saving expense rules:', error);
  }
};

// GET all learned merchant→category rules
app.get('/api/expense-rules', (req, res) => {
  try {
    res.json({ success: true, rules: loadExpenseRules() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST upsert a merchant→category rule
app.post('/api/expense-rules', (req, res) => {
  try {
    const { merchant, category } = req.body;
    if (!merchant || !category) {
      return res.status(400).json({ success: false, error: 'merchant and category are required' });
    }
    const rules = loadExpenseRules();
    rules[merchant.toLowerCase().trim()] = category;
    saveExpenseRules(rules);
    res.json({ success: true, rules });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================
// EXPENSES ENDPOINT
// =============================
const expensesFile = path.join(dataPath, 'expenses.json');
const loadExpenses = () => {
  try {
    if (fs.existsSync(expensesFile)) {
      return JSON.parse(fs.readFileSync(expensesFile, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading expenses:', error);
  }
  return [];
};
const saveExpenses = (expenses) => {
  try {
    fs.writeFileSync(expensesFile, JSON.stringify(expenses, null, 2));
  } catch (error) {
    console.error('Error saving expenses:', error);
  }
};

// Get all expenses for a business
app.get('/api/expenses', (req, res) => {
  try {
    const { businessId } = req.query;
    let expenses = loadExpenses();
    if (businessId) {
      expenses = expenses.filter(e => e.businessId === businessId);
    }
    res.json({ success: true, expenses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/expenses', (req, res) => {
  try {
    const { date, category, description, amount, notes, deductiblePct, businessId } = req.body;
    if (!date || !category || amount === undefined || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'date, category, and a positive amount are required' });
    }
    const expense = {
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: String(date),
      category: String(category),
      description: String(description || ''),
      amount: Number(amount),
      notes: String(notes || ''),
      deductiblePct: Number(deductiblePct ?? 100),
      created_at: new Date().toISOString(),
    };
    if (businessId) expense.businessId = businessId;
    const expenses = loadExpenses();
    expenses.push(expense);
    saveExpenses(expenses);
    res.json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/expenses/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { date, category, description, amount, notes, deductiblePct, businessId } = req.body;
    const expenses = loadExpenses();
    let idx;
    if (businessId) {
      idx = expenses.findIndex(e => e.id === id && e.businessId === businessId);
    } else {
      idx = expenses.findIndex(e => e.id === id);
    }
    if (idx === -1) return res.status(404).json({ success: false, error: 'Expense not found' });
    expenses[idx] = {
      ...expenses[idx],
      date: String(date ?? expenses[idx].date),
      category: String(category ?? expenses[idx].category),
      description: String(description ?? expenses[idx].description),
      amount: Number(amount ?? expenses[idx].amount),
      notes: String(notes ?? expenses[idx].notes),
      deductiblePct: Number(deductiblePct ?? expenses[idx].deductiblePct),
      updated_at: new Date().toISOString(),
    };
    saveExpenses(expenses);
    res.json({ success: true, expense: expenses[idx] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/expenses/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { businessId } = req.body;
    let expenses = loadExpenses();
    let before = expenses.length;
    if (businessId) {
      expenses = expenses.filter(e => !(e.id === id && e.businessId === businessId));
    } else {
      expenses = expenses.filter(e => e.id !== id);
    }
    if (expenses.length === before) return res.status(404).json({ success: false, error: 'Expense not found' });
    saveExpenses(expenses);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =============================
// PAYMENT LOG
// =============================
const paymentLogsFile = path.join(dataPath, 'payment_logs.json');
const loadPaymentLogs = () => {
  try {
    if (fs.existsSync(paymentLogsFile)) return JSON.parse(fs.readFileSync(paymentLogsFile, 'utf8'));
  } catch (e) { console.error('Error loading payment logs:', e); }
  return [];
};
// Removed appendPaymentLog and related payment log code

// GET – most recent logs (default 100)
// Removed payment log endpoints

// =============================
// INVOICES ENDPOINT (BASIC DEMO)
// =============================
const invoicesFile = path.join(dataPath, 'invoices_db.json');
const loadInvoices = () => {
  try {
    if (fs.existsSync(invoicesFile)) {
      return JSON.parse(fs.readFileSync(invoicesFile, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading invoices:', error);
  }
  return [];
};

const saveInvoices = (invoices) => {
  try {
    fs.writeFileSync(invoicesFile, JSON.stringify(invoices, null, 2));
  } catch (error) {
    console.error('Error saving invoices:', error);
  }
};

// Get all invoices for a business
app.get('/api/invoices', (req, res) => {
  try {
    const { businessId } = req.query;
    let invoices = loadInvoices();
    if (businessId) {
      invoices = invoices.filter(inv => inv.businessId === businessId);
    }
    res.json({ success: true, invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new invoice (all fields required, amount must be a number, businessId required)
app.post('/api/invoices', async (req, res) => {
  try {
    const invoice = { ...req.body };
    // Auto-inject latitude/longitude if missing to bypass frontend geocode errors
    if (invoice.latitude === undefined || invoice.latitude === null || isNaN(Number(invoice.latitude))) {
      invoice.latitude = 42.1976;
    }
    if (invoice.longitude === undefined || invoice.longitude === null || isNaN(Number(invoice.longitude))) {
      invoice.longitude = -84.4366;
    }
    // Backward compatibility: older clients may send `comments` instead of `notes`.
    if ((invoice.notes === undefined || invoice.notes === null || invoice.notes === '') && invoice.comments !== undefined) {
      invoice.notes = invoice.comments;
    }
    // Define required fields for an invoice
    const requiredFields = [
      'customer_name',
      'service_address',
      'phone_number',
      'source',
      'trailer_number',
      'trailer_size',
      'reserve_date',
      'amount',
      'status',
      'date_ordered',
      'due_date',
      'items',
      'notes'
    ];
    for (const field of requiredFields) {
      // Allow empty string for trailer_number, trailer_size, and notes
      if (
        invoice[field] === undefined ||
        invoice[field] === null ||
        (typeof invoice[field] === 'string' && invoice[field].trim() === '' && !['trailer_number','trailer_size','notes'].includes(field))
      ) {
        return res.status(400).json({ success: false, error: `Missing or empty required field: ${field}` });
      }
    }
    // Amount must be a number
    if (isNaN(Number(invoice.amount))) {
      return res.status(400).json({ success: false, error: 'Amount must be a number' });
    }
    // Geocode address if possible, but do not fail if it errors
    try {
      if (invoice.service_address) {
        // Use the same geocoding logic as deliveries, if available
        // For this patch, just simulate a geocode failure bypass
        // If you have a geocode function, call it here and set invoice.latitude, invoice.longitude, etc.
        // If geocoding fails, fall through to catch
      }
    } catch (geoError) {
      // Bypass geocode errors: set default values
      invoice.latitude = null;
      invoice.longitude = null;
      invoice.geocodeProvider = 'none';
      invoice.geocodeConfidence = 'low';
      invoice.geocodedFormattedAddress = invoice.service_address || '';
      invoice.geocodedAddressKey = '';
    }
    // Assign an id if not present
    if (!invoice.id) {
      invoice.id = Date.now().toString();
    }
    const invoices = loadInvoices();
    invoices.push(invoice);
    saveInvoices(invoices);

    // --- AUTO-CREATE DELIVERY FROM INVOICE ---
    try {
      const deliveries = loadDeliveries();
      // Map invoice fields to delivery fields
      const delivery = {
        id: invoice.id, // Use same id for traceability
        businessId: invoice.businessId,
        customerId: invoice.businessId, // For legacy support
        containerNumber: invoice.trailer_number,
        deliveryAddress: invoice.service_address + (invoice.city ? (', ' + invoice.city) : '') + (invoice.state ? (', ' + invoice.state) : '') + (invoice.zip ? (', ' + invoice.zip) : ''),
        latitude: invoice.latitude,
        longitude: invoice.longitude,
        status: invoice.status || 'pending',
        scheduledDate: invoice.reserve_date,
        geocodeProvider: invoice.geocodeProvider || 'default',
        geocodeConfidence: invoice.geocodeConfidence || 'low',
        geocodedFormattedAddress: invoice.service_address,
        geocodedAddressKey: (invoice.service_address || '').toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim(),
        createdAt: new Date().toISOString(),
        phoneNumber: invoice.phone_number,
        customerName: invoice.customer_name,
        notes: invoice.notes,
      };
      deliveries.push(delivery);
      saveDeliveries(deliveries);
    } catch (deliveryError) {
      console.error('Auto-create delivery from invoice failed:', deliveryError);
    }

    res.json({ success: true, invoice });
  } catch (error) {
    console.error('Error saving invoice:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get invoice by id
app.get('/api/invoices/:id', (req, res) => {
  try {
    const { id } = req.params;
    const invoices = loadInvoices();
    const invoice = invoices.find(inv => String(inv.id) === String(id));
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    res.json({ success: true, invoice });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Public invoice view for customer payment links.
app.get('/api/public/invoices/:id', (req, res) => {
  try {
    const { id } = req.params;
    const invoices = loadInvoices();
    const invoice = invoices.find((inv) => String(inv.id) === String(id));
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    res.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoice_id: invoice.invoice_id,
        invoice_number: invoice.invoice_number,
        customer_name: invoice.customer_name || invoice.customerName || '',
        service_address: invoice.service_address || invoice.serviceAddress || '',
        amount: invoice.amount,
        status: invoice.status || 'pending',
        due_date: invoice.due_date || '',
      },
    });
  } catch (error) {
    console.error('Error fetching public invoice:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Public payment endpoint for customer invoice payment page.
app.post('/api/public/invoices/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethodId, customerId } = req.body || {};
    if (!paymentMethodId) {
      return res.status(400).json({ success: false, error: 'paymentMethodId is required' });
    }

    const invoices = loadInvoices();
    const index = invoices.findIndex((inv) => String(inv.id) === String(id));
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const invoice = invoices[index];
    if (String(invoice.status || '').toLowerCase() === 'paid') {
      return res.status(409).json({ success: false, error: 'Invoice is already paid' });
    }

    const charge = await chargeInvoiceWithStax({
      invoice,
      paymentMethodId,
      customerId,
      metadata: { paymentChannel: 'public-invoice-page' },
    });

    const chargeId = String(charge?.id || charge?.charge_id || charge?.transaction_id || charge?.reference || '');
    invoices[index] = {
      ...invoice
    };
    saveInvoices(invoices);

    // Removed payment event logging

    res.json({ success: true, invoice: invoices[index], charge });
  } catch (error) {
    console.error('Public invoice payment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update invoice by id (businessId required)
app.put('/api/invoices/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...(req.body || {}) };
    const { businessId } = updates;
    // Backward compatibility for partial updates from older clients.
    if ((updates.notes === undefined || updates.notes === null || updates.notes === '') && updates.comments !== undefined) {
      updates.notes = updates.comments;
    }
    const invoices = loadInvoices();
    let index;
    if (businessId) {
      index = invoices.findIndex(inv => String(inv.id) === String(id) && inv.businessId === businessId);
    } else {
      index = invoices.findIndex(inv => String(inv.id) === String(id));
    }
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const wasNotPaid = String(invoices[index].status || '').toLowerCase() !== 'paid';
    invoices[index] = { ...invoices[index], ...updates, id: invoices[index].id };
    saveInvoices(invoices);

    // Removed auto-log for paid status

    res.json({ success: true, invoice: invoices[index] });
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete invoice by id (businessId NOT required)
app.delete('/api/invoices/:id', (req, res) => {
  try {
    const { id } = req.params;
    const invoices = loadInvoices();
    const filtered = invoices.filter(inv => String(inv.id) !== String(id));
    if (filtered.length === invoices.length) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    saveInvoices(filtered);

    // --- Remove payment log entries for this invoice ---
    try {
      const logs = loadPaymentLogs();
      // Find all possible invoice references for this invoice
      const invoice = invoices.find(inv => String(inv.id) === String(id));
      const invoiceId = invoice?.id ? String(invoice.id) : String(id);
      const invoiceRef = invoice?.invoice_id || invoice?.invoice_number || invoiceId;
      // Remove logs by invoiceId, invoiceRef, or description containing invoiceRef
      const updatedLogs = logs.filter(
        (log) => {
          const desc = String(log.description || '');
          return (
            String(log.invoiceId) !== invoiceId &&
            String(log.invoiceId) !== invoiceRef &&
            String(log.invoiceRef) !== invoiceId &&
            String(log.invoiceRef) !== invoiceRef &&
            !(desc.includes(invoiceRef) || desc.includes(invoiceId))
          );
        }
      );
      if (updatedLogs.length !== logs.length) {
        fs.writeFileSync(paymentLogsFile, JSON.stringify(updatedLogs.slice(0, 500), null, 2));
      }
    } catch (logError) {
      console.error('Error removing payment logs for deleted invoice:', logError);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'DumpsterTracker API server running' });
});

// API index endpoint to avoid ambiguous 404s on /api.
app.get('/api', (req, res) => {
  res.json({
    success: true,
    name: 'DumpsterTracker API',
    health: '/api/health',
    docs: '/api/docs',
  });
});

// Lightweight docs endpoint for quick endpoint discovery.
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'Available endpoints',
    endpoints: [
      '/api/health',
      '/api/customers',
      '/api/invoices',
      '/api/deliveries',
      '/api/pickups',
      '/api/stops',
      '/api/fleet',
      '/api/track/:token',
    ],
  });
});


// ============================================
// TWILIO SMS & DELIVERY REMINDER ENDPOINTS
// ============================================

// Get all scheduled deliveries for a business
app.get('/api/deliveries', async (req, res) => {
  try {
    const { businessId } = req.query;
    if (!businessId) {
      return res.status(400).json({ error: 'Missing required businessId query parameter' });
    }
    // Support both businessId and customerId for legacy data
    const deliveries = loadDeliveries().filter(d => d.businessId === businessId || d.customerId === businessId);
    const resolvedDeliveries = await Promise.all(deliveries.map((delivery) => withResolvedCoordinates(delivery)));
    const hasUpdates = resolvedDeliveries.some((delivery, index) => {
      const original = deliveries[index] || {};
      return (
        Number(original.latitude) !== Number(delivery.latitude) ||
        Number(original.longitude) !== Number(delivery.longitude) ||
        String(original.geocodeProvider || '') !== String(delivery.geocodeProvider || '') ||
        String(original.geocodeConfidence || '') !== String(delivery.geocodeConfidence || '') ||
        String(original.geocodedAddressKey || '') !== String(delivery.geocodedAddressKey || '') ||
        String(original.geocodedFormattedAddress || '') !== String(delivery.geocodedFormattedAddress || '')
      );
    });
    if (hasUpdates) {
      saveDeliveries(resolvedDeliveries);
    }
    res.json({ deliveries: resolvedDeliveries });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create/Update delivery (businessId required)
app.post('/api/deliveries', async (req, res) => {
  try {
    const { delivery } = req.body;
    if (!delivery || typeof delivery !== 'object') {
      return res.status(400).json({ error: 'Invalid delivery payload' });
    }

    const normalizedDelivery = await withResolvedCoordinates(delivery);
    let deliveries = loadDeliveries();

    if (!normalizedDelivery.id || typeof normalizedDelivery.id !== 'string' || !normalizedDelivery.id.trim()) {
      // Create new with generated id if not provided
      normalizedDelivery.id = Date.now().toString();
    }
    if (!normalizedDelivery.createdAt) {
      normalizedDelivery.createdAt = new Date().toISOString();
    }
    // Upsert: replace if exists, else add new
    const index = deliveries.findIndex(d => d.id === normalizedDelivery.id);
    if (index !== -1) {
      deliveries[index] = normalizedDelivery;
    } else {
      deliveries.push(normalizedDelivery);
    }

    saveDeliveries(deliveries);
    res.json({ success: true, delivery: normalizedDelivery });
  } catch (error) {
    console.error('Error saving delivery:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update delivery status (businessId required)
app.patch('/api/deliveries/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status, businessId } = req.body || {};
    if (!String(status || '').trim() || !businessId) {
      return res.status(400).json({ error: 'Missing status or businessId' });
    }

    const deliveries = loadDeliveries();
    const index = deliveries.findIndex((d) => String(d.id) === String(id) && d.businessId === businessId);
    if (index === -1) {
      return res.status(404).json({ error: 'Delivery not found for this business' });
    }

    deliveries[index] = {
      ...deliveries[index],
      status: String(status),
      updatedAt: new Date().toISOString(),
    };

    // Send SMS if status is set to 'delivered' and phone number exists
    if (String(status).toLowerCase() === 'delivered' && twilioClient) {
      const delivery = deliveries[index];
      const to = String(delivery.phoneNumber || delivery.customerPhone || '').trim();
      if (to) {
        const message =
          'Hello! This is Trashgoaway letting you know your trailer has just been delivered. If you have any questions or need assistance, please contact us at 248-388-1000. Thank you for choosing us!';
        twilioClient.messages
          .create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to,
          })
          .then(() => {
            console.log(`✅ Delivery confirmation SMS sent to ${to}`);
          })
          .catch((err) => {
            console.error('❌ Failed to send delivery confirmation SMS:', err.message);
          });
      }
    }

    saveDeliveries(deliveries);
    res.json({ success: true, delivery: deliveries[index] });
  } catch (error) {
    console.error('Error updating delivery status:', error);
    res.status(500).json({ error: error.message || 'Failed to update delivery status' });
  }
});

// Delete delivery (businessId required)
app.delete('/api/deliveries/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { businessId } = req.body;
    if (!businessId) {
      return res.status(400).json({ error: 'Missing required businessId' });
    }
    let deliveries = loadDeliveries();
    const before = deliveries.length;
    deliveries = deliveries.filter(d => !(d.id === id && d.businessId === businessId));
    if (deliveries.length === before) {
      return res.status(404).json({ error: 'Delivery not found for this business' });
    }
    saveDeliveries(deliveries);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting delivery:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a public tracking link for a delivery.
app.post('/api/deliveries/:id/tracking-link', (req, res) => {
  try {
    const { id } = req.params;
    const deliveries = loadDeliveries();
    const index = deliveries.findIndex((d) => String(d.id) === String(id));
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Delivery not found' });
    }

    const delivery = deliveries[index];
    const { updatedDelivery, trackingUrl, token, expiresAt } = ensureTrackingLinkForDelivery(req, delivery);
    deliveries[index] = updatedDelivery;

    saveDeliveries(deliveries);
    res.json({ success: true, trackingUrl, trackingToken: token, expiresAt });
  } catch (error) {
    console.error('Error creating tracking link:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a public tracking link for a pickup.
app.post('/api/pickups/:id/tracking-link', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM pickups WHERE id = $1', [String(id)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Pickup not found' });
    }

    const pickup = result.rows[0];
    const { trackingUrl, token, expiresAt } = createTrackingLinkForPickup(req, pickup);
    res.json({ success: true, trackingUrl, trackingToken: token, expiresAt });
  } catch (error) {
    console.error('Error creating pickup tracking link:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send tracking link SMS to delivery customer.
app.post('/api/deliveries/:id/send-tracking-link', async (req, res) => {
  try {
    if (!twilioClient) {
      return res.status(500).json({ success: false, error: 'Twilio not configured.' });
    }

    const { id } = req.params;
    const deliveries = loadDeliveries();
    const index = deliveries.findIndex((d) => String(d.id) === String(id));
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Delivery not found' });
    }

    const delivery = deliveries[index];
    const to = String(delivery.phoneNumber || '').trim();
    if (!to) {
      return res.status(400).json({ success: false, error: 'Delivery phone number is missing' });
    }

    const { updatedDelivery, trackingUrl, token, expiresAt } = ensureTrackingLinkForDelivery(req, delivery);
    deliveries[index] = updatedDelivery;
    saveDeliveries(deliveries);

    const message = `Hi ${delivery.customerName || 'there'}, track your delivery live here: ${trackingUrl}`;
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });

    res.json({
      success: true,
      messageSid: result.sid,
      trackingUrl,
      trackingToken: token,
      expiresAt,
    });
  } catch (error) {
    console.error('Error sending tracking link SMS:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send tracking link SMS to pickup customer.
app.post('/api/pickups/:id/send-tracking-link', async (req, res) => {
  try {
    if (!twilioClient) {
      return res.status(500).json({ success: false, error: 'Twilio not configured.' });
    }

    const { id } = req.params;
    const result = await pool.query('SELECT * FROM pickups WHERE id = $1', [String(id)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Pickup not found' });
    }

    const pickup = result.rows[0];
    const to = String(pickup.phone_number || '').trim();
    if (!to) {
      return res.status(400).json({ success: false, error: 'Pickup phone number is missing' });
    }

    const { trackingUrl, token, expiresAt } = createTrackingLinkForPickup(req, pickup);
    const customerName = String(pickup.customer_name || 'customer').trim();
    const resultMessage = await twilioClient.messages.create({
      body: `Hi, ${customerName}. We are on our way to pick up the trailer you rented from Trashgoaway.com LLC. Please make sure any vehicles or other items blocking the trailer are moved before the driver arrives. Thank you for choosing us for your dumpster rental needs. We are here for you 7 days a week. Please call 517-803-3000 or visit www.trashgoaway.com to book your next rental. Track your pickup here: ${trackingUrl}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });

    res.json({
      success: true,
      messageSid: resultMessage.sid,
      trackingUrl,
      trackingToken: token,
      expiresAt,
    });
  } catch (error) {
    console.error('Error sending pickup tracking link SMS:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Driver location updates for active delivery tracking.
app.post('/api/deliveries/:id/location', (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, heading, speed } = req.body || {};
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ success: false, error: 'Valid latitude and longitude are required' });
    }

    const deliveries = loadDeliveries();
    const index = deliveries.findIndex((d) => String(d.id) === String(id));
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Delivery not found' });
    }

    deliveries[index] = {
      ...deliveries[index],
      driverLatitude: lat,
      driverLongitude: lng,
      driverHeading: Number.isFinite(Number(heading)) ? Number(heading) : undefined,
      driverSpeed: Number.isFinite(Number(speed)) ? Number(speed) : undefined,
      driverLocationUpdatedAt: new Date().toISOString(),
    };

    saveDeliveries(deliveries);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating driver location:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Trailer location tracking by QR trailer ID.
app.post('/api/trailers/scan', async (req, res) => {
  try {
    const { qrValue, trailerId, latitude, longitude, accuracy, source } = req.body || {};
    const resolvedTrailerId = String(trailerId || parseTrailerIdFromQr(qrValue)).trim();
    const lat = Number(latitude);
    const lng = Number(longitude);
    const acc = Number(accuracy);

    if (!resolvedTrailerId) {
      return res.status(400).json({ success: false, error: 'Trailer ID could not be resolved from QR payload' });
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ success: false, error: 'Valid latitude and longitude are required' });
    }

    const nowIso = new Date().toISOString();
    const store = loadTrailerLocations();
    const locationCacheKey = `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
    let resolvedAddress = String(store.reverseGeocodeCache?.[locationCacheKey] || '').trim();
    if (!resolvedAddress) {
      try {
        resolvedAddress = await reverseGeocodeTrailerLocation(lat, lng);
      } catch (error) {
        console.warn('Trailer reverse geocoding failed:', error?.message || error);
      }
      if (resolvedAddress) {
        store.reverseGeocodeCache[locationCacheKey] = resolvedAddress;
      }
    }

    const event = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      trailerId: resolvedTrailerId,
      qrValue: String(qrValue || ''),
      latitude: lat,
      longitude: lng,
      address: resolvedAddress || undefined,
      accuracy: Number.isFinite(acc) ? acc : undefined,
      source: String(source || 'qr-scan'),
      scannedAt: nowIso,
    };

    store.events.push(event);
    store.latest[resolvedTrailerId] = event;
    if (store.events.length > 5000) {
      store.events = store.events.slice(-5000);
    }

    saveTrailerLocations(store);
    res.json({ success: true, trailerId: resolvedTrailerId, location: event });
  } catch (error) {
    console.error('Error saving trailer scan location:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/trailers/:trailerId/location', (req, res) => {
  try {
    const trailerId = String(req.params.trailerId || '').trim();
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 200) : 20;
    if (!trailerId) {
      return res.status(400).json({ success: false, error: 'trailerId is required' });
    }

    const store = loadTrailerLocations();
    const history = store.events
      .filter((evt) => String(evt.trailerId) === trailerId)
      .slice(-limit)
      .reverse();

    res.json({
      success: true,
      trailerId,
      latest: store.latest[trailerId] || null,
      history,
    });
  } catch (error) {
    console.error('Error fetching trailer location:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/trailers/locations', (req, res) => {
  try {
    const store = loadTrailerLocations();
    const recentRaw = Number(req.query.recentLimit);
    const recentLimit = Number.isFinite(recentRaw) && recentRaw > 0 ? Math.min(Math.floor(recentRaw), 200) : 50;

    const latest = Object.entries(store.latest || {}).map(([trailerId, location]) => ({
      trailerId,
      ...location,
    }));
    latest.sort((a, b) => String(b.scannedAt || '').localeCompare(String(a.scannedAt || '')));

    const recentEvents = (store.events || []).slice(-recentLimit).reverse();

    res.json({
      success: true,
      latest,
      recentEvents,
      totalTrackedTrailers: latest.length,
    });
  } catch (error) {
    console.error('Error fetching trailer locations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stax payment integration helpers.
app.get('/api/payments/stax/status', async (req, res) => {
  try {
    const tokenConfigured = Boolean(getStaxApiToken());
    if (!tokenConfigured) {
      return res.json({
        success: true,
        configured: false,
        baseUrl: getStaxApiBaseUrl(),
        message: 'Set STAX_API_TOKEN in server/.env',
      });
    }

    const probe = await callStaxApi({ path: '/' }).catch(() => null);
    const hostedToken = String(probe?.merchant?.hosted_payments_token || '');
    res.json({
      success: true,
      configured: true,
      baseUrl: getStaxApiBaseUrl(),
      authenticated: Boolean(probe),
      hostedPaymentsTokenAvailable: Boolean(hostedToken),
      hostedCheckoutTemplateConfigured: Boolean(getStaxHostedCheckoutTemplate()),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/payments/stax/hosted-checkout', async (req, res) => {
  try {
    const invoiceId = String(req.query.invoiceId || '').trim();
    const amountRaw = Number(req.query.amount);
    const amount = Number.isFinite(amountRaw) && amountRaw > 0 ? Number(amountRaw.toFixed(2)) : '';

    const profile = await callStaxApi({ path: '/' });
    const hostedToken = String(profile?.merchant?.hosted_payments_token || '').trim();
    if (!hostedToken) {
      return res.status(404).json({ success: false, error: 'Hosted payments token not found on Stax merchant profile' });
    }

    const hostedCheckoutUrl = buildStaxHostedCheckoutUrl({ hostedToken, invoiceId, amount });
    res.json({
      success: true,
      hostedPaymentsToken: hostedToken,
      hostedCheckoutUrl,
      templateConfigured: Boolean(getStaxHostedCheckoutTemplate()),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/payments/stax/sandbox/create-test-method', async (req, res) => {
  try {
    const { personName, firstName, lastName, email } = req.body || {};
    const customer = await createStaxCustomer({ firstName, lastName, email });
    const customerId = String(customer?.id || '').trim();
    if (!customerId) {
      return res.status(500).json({ success: false, error: 'Failed to create Stax sandbox customer' });
    }

    const paymentMethod = await createStaxSandboxPaymentMethod({
      customerId,
      personName: String(personName || `${firstName || 'Sandbox'} ${lastName || 'Customer'}`),
    });

    res.json({
      success: true,
      customer: {
        id: customerId,
      },
      paymentMethod: {
        id: String(paymentMethod?.id || ''),
        method: String(paymentMethod?.method || ''),
        cardType: String(paymentMethod?.card_type || ''),
        cardLastFour: String(paymentMethod?.card_last_four || ''),
      },
      note: 'Sandbox-only test payment method generated with test card 4111.',
    });
  } catch (error) {
    console.error('Stax sandbox payment method creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Charge a customer tokenized payment method directly from your app.
app.post('/api/payments/stax/charge', async (req, res) => {
  try {
    const {
      amount,
      customerId,
      paymentMethodId,
      invoiceId,
      description,
      currency = 'USD',
      metadata,
    } = req.body || {};

    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return res.status(400).json({ success: false, error: 'A valid amount is required' });
    }
    if (!paymentMethodId) {
      return res.status(400).json({ success: false, error: 'paymentMethodId is required' });
    }

    const response = await chargeInvoiceWithStax({
      invoice: {
        id: invoiceId || 'ad-hoc',
        amount: normalizedAmount,
        invoice_id: invoiceId || '',
      },
      paymentMethodId,
      customerId,
      metadata: {
        description: description ? String(description) : undefined,
        currency: String(currency || 'USD').toUpperCase(),
        ...(metadata && typeof metadata === 'object' ? metadata : {}),
      },
    });

    res.json({ success: true, charge: response });
  } catch (error) {
    console.error('Stax charge error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Public customer tracking endpoint by token.
app.get('/api/track/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '');
    if (!token) {
      return res.status(400).json({ success: false, error: 'Tracking token is required' });
    }

    const deliveries = loadDeliveries();
    const delivery = deliveries.find((d) => String(d.trackingToken || '') === token);
    if (!delivery) {
      const signedToken = parseSignedTrackingToken(token);
      if (!signedToken) {
        return res.status(404).json({ success: false, error: 'Tracking link not found' });
      }
      if (!signedToken.expiresAt || new Date(signedToken.expiresAt).getTime() < Date.now()) {
        return res.status(410).json({ success: false, error: 'Tracking link has expired' });
      }
      if (signedToken.type !== 'pickup') {
        return res.status(404).json({ success: false, error: 'Tracking link not found' });
      }

      const pickupResult = await pool.query('SELECT * FROM pickups WHERE id = $1', [signedToken.id]);
      if (pickupResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Tracking link not found' });
      }

      const pickup = pickupResult.rows[0];
      return res.json({
        success: true,
        delivery: {
          id: pickup.id,
          customerName: pickup.customer_name || '',
          containerNumber: pickup.trailer_number || '',
          status: pickup.status || '',
          deliveryAddress: pickup.pickup_address || '',
          scheduledDate: pickup.scheduled_date || pickup.created_at || '',
          destination: {
            latitude: Number(pickup.latitude),
            longitude: Number(pickup.longitude),
          },
          driverLocation: {
            latitude: null,
            longitude: null,
            heading: null,
            speed: null,
            updatedAt: '',
          },
          tracking: {
            enabled: true,
            expiresAt: signedToken.expiresAt,
          },
        },
      });
    }

    const trackingEnabled = Boolean(delivery.trackingEnabled);
    const expiresAt = toIsoDateTime(delivery.trackingExpiresAt);
    if (!trackingEnabled || !expiresAt || new Date(expiresAt).getTime() < Date.now()) {
      return res.status(410).json({ success: false, error: 'Tracking link has expired' });
    }

    res.json({
      success: true,
      delivery: {
        id: delivery.id,
        customerName: delivery.customerName || '',
        containerNumber: delivery.containerNumber || '',
        status: delivery.status || '',
        deliveryAddress: delivery.deliveryAddress || delivery.pickupAddress || '',
        scheduledDate: delivery.scheduledDate || delivery.reserveDate || delivery.createdAt || '',
        destination: {
          latitude: Number(delivery.latitude),
          longitude: Number(delivery.longitude),
        },
        driverLocation: {
          latitude: Number(delivery.driverLatitude),
          longitude: Number(delivery.driverLongitude),
          heading: Number(delivery.driverHeading),
          speed: Number(delivery.driverSpeed),
          updatedAt: delivery.driverLocationUpdatedAt || '',
        },
        tracking: {
          enabled: true,
          expiresAt,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching tracking data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send SMS reminder
app.post('/api/sms/send', async (req, res) => {
  try {
    if (!twilioClient) {
      return res.status(500).json({ 
        error: 'Twilio not configured. Use AC+AUTH_TOKEN+PHONE_NUMBER or API_KEY_SID+API_KEY_SECRET+API_ACCOUNT_SID+PHONE_NUMBER in server/.env'
      });
    }
    
    const { to, message } = req.body;
    
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });
    
    res.json({ success: true, messageSid: result.sid });
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send reminders for tomorrow's deliveries (manual trigger)
app.post('/api/reminders/send-tomorrow', async (req, res) => {
  try {
    const result = await sendTomorrowReminders();
    res.json(result);
  } catch (error) {
    console.error('Error sending reminders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Function to send tomorrow's reminders
async function sendTomorrowReminders() {
  if (!twilioClient) {
    console.log('⚠️  Twilio not configured - skipping reminders');
    return { success: false, error: 'Twilio not configured', sent: 0, failed: 0 };
  }
  
  const deliveries = loadDeliveries();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  // Find deliveries scheduled for tomorrow
  const tomorrowDeliveries = deliveries.filter(d => 
    d.deliveryDate === tomorrowStr && 
    d.status !== 'cancelled' && 
    d.status !== 'completed' &&
    d.customerPhone
  );
  
  console.log(`📱 Found ${tomorrowDeliveries.length} deliveries for tomorrow (${tomorrowStr})`);
  
  let sent = 0;
  let failed = 0;
  const results = [];
  
  for (const delivery of tomorrowDeliveries) {
    try {
      const message = `Hello! This is a reminder from Trashgoaway that your delivery is scheduled for today between 8-5. If you have any questions or need to make changes, please contact us at 248-388-1000 Thank you!`;
      
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: delivery.customerPhone
      });
      
      // Mark as reminded
      delivery.reminderSent = true;
      delivery.reminderSentAt = new Date().toISOString();
      
      sent++;
      results.push({ delivery: delivery.id, status: 'sent' });
      console.log(`✅ Sent reminder to ${delivery.customerName} (${delivery.customerPhone})`);
    } catch (error) {
      failed++;
      results.push({ delivery: delivery.id, status: 'failed', error: error.message });
      console.error(`❌ Failed to send to ${delivery.customerName}:`, error.message);
    }
  }
  
  // Save updated deliveries
  saveDeliveries(deliveries);
  
  console.log(`📊 Reminders sent: ${sent}, failed: ${failed}`);
  
  return {
    success: true,
    sent,
    failed,
    total: tomorrowDeliveries.length,
    results
  };
}

const getDetroitDateString = (offsetDays = 0) => {
  const base = new Date();
  if (offsetDays) {
    base.setDate(base.getDate() + offsetDays);
  }

  // en-CA yields YYYY-MM-DD, which matches stored invoice/delivery date format.
  return base.toLocaleDateString('en-CA', { timeZone: 'America/Detroit' });
};

const normalizePhoneForSms = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (raw.startsWith('+')) return raw;
  return raw;
};

const getFrontendBaseUrl = () => String(process.env.FRONTEND_URL || 'http://localhost:3001').replace(/\/$/, '');

async function sendMorningInvoicePaymentLinks() {
  if (!twilioClient) {
    console.log('⚠️  Twilio not configured - skipping morning invoice payment links');
    return { success: false, error: 'Twilio not configured', sent: 0, failed: 0, skipped: 0 };
  }

  const invoices = loadInvoices();
  const today = getDetroitDateString(0);
  const frontendBaseUrl = getFrontendBaseUrl();

  const candidates = invoices.filter((inv) => {
    const status = String(inv.status || '').toLowerCase();
    if (status === 'paid') return false;

    const deliveryDate = String(
      inv.reserve_date ||
      inv.reserveDate ||
      inv.deliveryDate ||
      ''
    ).slice(0, 10);
    if (!deliveryDate || deliveryDate !== today) return false;

    const phone = normalizePhoneForSms(inv.phone_number || inv.phoneNumber);
    if (!phone) return false;

    const alreadySentForToday = String(inv.payment_link_sms_sent_for_date || '') === today;
    return !alreadySentForToday;
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const results = [];

  for (const inv of candidates) {
    const phone = normalizePhoneForSms(inv.phone_number || inv.phoneNumber);
    if (!phone) {
      skipped += 1;
      results.push({ invoiceId: inv.id, status: 'skipped', reason: 'missing_phone' });
      continue;
    }

    const paymentLink = `${frontendBaseUrl}/pay/invoice/${encodeURIComponent(String(inv.id))}`;
    const invoiceNumber = inv.invoice_id || inv.invoice_number || inv.id;
    const amount = Number(inv.amount || 0);
    const amountText = Number.isFinite(amount) ? amount.toFixed(2) : String(inv.amount || '');

    const message = `EasyTrak reminder: your invoice ${invoiceNumber} for $${amountText} is due for today's delivery. Pay here: ${paymentLink}`;

    try {
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });

      inv.payment_link_sms_sent_at = new Date().toISOString();
      inv.payment_link_sms_sent_for_date = today;
      sent += 1;
      results.push({ invoiceId: inv.id, status: 'sent', to: phone });
    } catch (error) {
      failed += 1;
      results.push({
        invoiceId: inv.id,
        status: 'failed',
        to: phone,
        error: error?.message || String(error),
      });
      console.error(`Failed to send payment link SMS for invoice ${inv.id}:`, error?.message || error);
    }
  }

  saveInvoices(invoices);

  console.log(`💳 Morning payment links: sent=${sent}, failed=${failed}, skipped=${skipped}, date=${today}`);
  return {
    success: true,
    date: today,
    sent,
    failed,
    skipped,
    totalCandidates: candidates.length,
    results,
  };
}

// Manual trigger for testing morning payment links.
app.post('/api/reminders/send-payment-links-today', async (req, res) => {
  try {
    const result = await sendMorningInvoicePaymentLinks();
    res.json(result);
  } catch (error) {
    console.error('Error sending morning payment links:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Automatic daily reminder cron job
// Runs every day at 8:00 AM
cron.schedule('0 8 * * *', async () => {
  console.log('🕐 Running automatic daily reminder job...');
  await sendTomorrowReminders();
}, {
  timezone: "America/Detroit" // Change to your timezone
});

// Automatic daily invoice payment-link SMS job
// Runs every day at 8:05 AM for invoices with delivery date = today.
cron.schedule('5 8 * * *', async () => {
  console.log('🕐 Running morning invoice payment-link job...');
  await sendMorningInvoicePaymentLinks();
}, {
  timezone: "America/Detroit"
});

console.log('⏰ Automatic reminder cron job scheduled for 8:00 AM daily');
console.log('⏰ Automatic payment-link job scheduled for 8:05 AM daily');

if (isProduction && fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  app.get(/^(?!\/api|\/socket\.io).*/, (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Redirect root to frontend login page in development.
// Defaults to frontend dev server port 3001 unless overridden.
const FRONTEND_URL = String(process.env.FRONTEND_URL || 'http://localhost:3001').replace(/\/$/, '');
if (!isProduction || !fs.existsSync(frontendDistPath)) {
  app.get('/', (req, res) => {
    res.redirect(`${FRONTEND_URL}/login`);
  });
}

// Start server (use HTTP server for Socket.IO)
server.listen(PORT, () => {
  console.log(`🚀 DumpsterTracker API server running on port ${PORT}`);
  if (isProduction && fs.existsSync(frontendDistPath)) {
    console.log(`🌐 Serving frontend from ${frontendDistPath}`);
  } else {
    console.log(`🌐 Frontend redirect URL: ${FRONTEND_URL}`);
  }
});

// Export io for use in API routes
export { io };

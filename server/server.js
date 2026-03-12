import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import twilio from 'twilio';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Plaid Configuration
const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

// Twilio Configuration
let twilioClient = null;
try {
  if (process.env.TWILIO_ACCOUNT_SID && 
      process.env.TWILIO_AUTH_TOKEN && 
      process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio SMS configured');
  } else {
    console.log('⚠️  Twilio not configured - SMS reminders disabled');
    console.log('   Add TWILIO credentials to .env to enable automatic reminders');
  }
} catch (error) {
  console.log('⚠️  Twilio initialization failed:', error.message);
}

// Store access tokens (in production, use a database)
const accessTokens = new Map();

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

// =============================
// INVOICES ENDPOINT (BASIC DEMO)
// =============================
const invoicesFile = path.join(dataPath, 'invoices.json');
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

app.get('/api/invoices', (req, res) => {
  try {
    const invoices = loadInvoices();
    res.json({ success: true, invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'DumpsterTracker API server running' });
});

// Create Link Token - Required to initialize Plaid Link
app.post('/api/plaid/create_link_token', async (req, res) => {
  try {
    const { userId } = req.body;
    
    const request = {
      user: {
        client_user_id: userId || 'default-user',
      },
      client_name: 'DumpsterTracker',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    };

    const response = await plaidClient.linkTokenCreate(request);
    res.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error('Error creating link token:', error);
    res.status(500).json({ error: error.message });
  }
});

// Exchange Public Token for Access Token
app.post('/api/plaid/exchange_public_token', async (req, res) => {
  try {
    const { public_token, userId } = req.body;
    
    const response = await plaidClient.itemPublicTokenExchange({
      public_token,
    });
    
    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;
    
    // Store access token (in production, save to database)
    accessTokens.set(userId || 'default-user', {
      accessToken,
      itemId,
      createdAt: new Date(),
    });
    
    // Get account info
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });
    
    res.json({
      success: true,
      itemId,
      accounts: accountsResponse.data.accounts,
    });
  } catch (error) {
    console.error('Error exchanging public token:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Transactions
app.post('/api/plaid/transactions', async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.body;
    
    const tokenData = accessTokens.get(userId || 'default-user');
    if (!tokenData) {
      return res.status(404).json({ error: 'No bank account connected' });
    }
    
    // Default to last 30 days
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];
    
    const response = await plaidClient.transactionsGet({
      access_token: tokenData.accessToken,
      start_date: start,
      end_date: end,
      options: {
        count: 500,
        offset: 0,
      },
    });
    
    res.json({
      transactions: response.data.transactions,
      accounts: response.data.accounts,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Account Balance
app.post('/api/plaid/balance', async (req, res) => {
  try {
    const { userId } = req.body;
    
    const tokenData = accessTokens.get(userId || 'default-user');
    if (!tokenData) {
      return res.status(404).json({ error: 'No bank account connected' });
    }
    
    const response = await plaidClient.accountsBalanceGet({
      access_token: tokenData.accessToken,
    });
    
    res.json({
      accounts: response.data.accounts,
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove bank connection
app.post('/api/plaid/remove_item', async (req, res) => {
  try {
    const { userId } = req.body;
    
    const tokenData = accessTokens.get(userId || 'default-user');
    if (!tokenData) {
      return res.status(404).json({ error: 'No bank account connected' });
    }
    
    await plaidClient.itemRemove({
      access_token: tokenData.accessToken,
    });
    
    accessTokens.delete(userId || 'default-user');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check connection status
app.post('/api/plaid/status', async (req, res) => {
  try {
    const { userId } = req.body;
    
    const tokenData = accessTokens.get(userId || 'default-user');
    
    if (!tokenData) {
      return res.json({ connected: false });
    }
    
    // Verify the connection is still valid
    try {
      const response = await plaidClient.accountsGet({
        access_token: tokenData.accessToken,
      });
      
      res.json({
        connected: true,
        itemId: tokenData.itemId,
        accounts: response.data.accounts,
        connectedAt: tokenData.createdAt,
      });
    } catch (error) {
      // Token might be invalid
      accessTokens.delete(userId || 'default-user');
      res.json({ connected: false });
    }
  } catch (error) {
    console.error('Error checking status:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TWILIO SMS & DELIVERY REMINDER ENDPOINTS
// ============================================

// Get all scheduled deliveries
app.get('/api/deliveries', (req, res) => {
  try {
    const deliveries = loadDeliveries();
    res.json({ deliveries });
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create/Update delivery
app.post('/api/deliveries', (req, res) => {
  try {
    const { delivery } = req.body;
    const deliveries = loadDeliveries();
    
    if (delivery.id) {
      // Update existing
      const index = deliveries.findIndex(d => d.id === delivery.id);
      if (index !== -1) {
        deliveries[index] = delivery;
      }
    } else {
      // Create new
      delivery.id = Date.now().toString();
      delivery.createdAt = new Date().toISOString();
      deliveries.push(delivery);
    }
    
    saveDeliveries(deliveries);
    res.json({ success: true, delivery });
  } catch (error) {
    console.error('Error saving delivery:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete delivery
app.delete('/api/deliveries/:id', (req, res) => {
  try {
    const { id } = req.params;
    let deliveries = loadDeliveries();
    deliveries = deliveries.filter(d => d.id !== id);
    saveDeliveries(deliveries);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting delivery:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send SMS reminder
app.post('/api/sms/send', async (req, res) => {
  try {
    if (!twilioClient) {
      return res.status(500).json({ 
        error: 'Twilio not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to .env' 
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
      const message = `Hi ${delivery.customerName}! Reminder: ${delivery.dumpsterSize} dumpster delivery scheduled for tomorrow ${delivery.deliveryTime || 'between 8AM-5PM'}. ${delivery.address}. Questions? Call ${process.env.BUSINESS_PHONE || '(248) 388-1000'}`;
      
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

// Automatic daily reminder cron job
// Runs every day at 8:00 AM
cron.schedule('0 8 * * *', async () => {
  console.log('🕐 Running automatic daily reminder job...');
  await sendTomorrowReminders();
}, {
  timezone: "America/Detroit" // Change to your timezone
});

console.log('⏰ Automatic reminder cron job scheduled for 8:00 AM daily');

// Redirect root to frontend login page
app.get('/', (req, res) => {
  // Adjust the port if your frontend runs on a different port
  res.redirect('http://localhost:5173/login');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 DumpsterTracker API server running on http://localhost:${PORT}`);
  console.log(`📊 Plaid Environment: ${process.env.PLAID_ENV || 'sandbox'}`);
  console.log(`\n⚠️  Make sure to create a .env file with your Plaid credentials`);
  console.log(`   Copy .env.example to .env and add your keys from https://dashboard.plaid.com/developers/keys\n`);
});

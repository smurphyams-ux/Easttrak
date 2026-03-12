import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './lib/db';
import { billingScheduler } from './lib/schedulers/billingScheduler';
import dumpsterRoutes from './routes/api/dumpsters';
import deliveryRoutes from './routes/api/deliveries';
import invoiceRoutes from './routes/api/invoices';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/dumpsters', dumpsterRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/invoices', invoiceRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('Failed to connect to database. Please check your configuration.');
      process.exit(1);
    }

    // Start billing scheduler
    billingScheduler.start();
    console.log('✓ Billing scheduler started');

    // Start Express server
    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
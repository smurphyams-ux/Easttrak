import express from 'express';
import { billingQueries } from '../../lib/db/billingQueries';

const router = express.Router();

// Get all invoices
router.get('/', async (req, res) => {
  try {
    const invoices = await billingQueries.getAllInvoices();
    res.json({ success: true, invoices });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get invoice by ID
router.get('/:id', async (req, res) => {
  try {
    const invoice = await billingQueries.getInvoiceById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
    res.json({ success: true, invoice });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create invoice
router.post('/', async (req, res) => {
  try {
    const { invoice, lineItems } = req.body;
    const createdInvoice = await billingQueries.createInvoice(invoice);
    if (lineItems && lineItems.length > 0) {
      await billingQueries.createLineItems(lineItems.map(item => ({ ...item, invoiceId: createdInvoice.id })));
    }
    res.json({ success: true, invoice: createdInvoice });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update invoice status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, paidAt } = req.body;
    await billingQueries.updateInvoiceStatus(req.params.id, status, paidAt);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
  try {
    await billingQueries.deleteInvoice(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

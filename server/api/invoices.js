// Helper to format a date string as yyyy-mm-dd
function toYMD(date) {
  if (!date) return '';
  // Accepts Date, ISO string, or yyyy-mm-dd
  if (date instanceof Date) {
    return date.toISOString().slice(0, 10);
  }
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    return date.slice(0, 10);
  }
  const d = new Date(date);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return '';
}


import express from 'express';
import pool from '../db.js';


// Helper to generate a short numeric invoice_id (will be replaced by DB id after insert)
function generateInvoiceId() {
  // Placeholder, will be replaced after insert
  return '';
}

const router = express.Router();
// All invoice storage is now in PostgreSQL

// GET /api/invoices
router.get('/', async (req, res) => {
  try {
    const { businessId } = req.query;
    let result;
    if (businessId) {
      result = await pool.query('SELECT * FROM invoices WHERE businessid = $1 ORDER BY id DESC', [businessId]);
    } else {
      result = await pool.query('SELECT * FROM invoices ORDER BY id DESC');
    }
    // Format date fields for all invoices, include payment fields
    const invoices = result.rows.map(inv => ({
      ...inv,
      date_ordered: toYMD(inv.date_ordered),
      due_date: toYMD(inv.due_date),
      reserve_date: toYMD(inv.reserve_date),
      paid_at: inv.paid_at ? toYMD(inv.paid_at) : null,
      payment_provider: inv.payment_provider || null,
      payment_transaction_id: inv.payment_transaction_id || null,
    }));
    res.json({ success: true, invoices });
  } catch (error) {
    console.error('Error fetching invoices from DB:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch invoices' });
  }
});

// GET /api/invoices/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    const inv = result.rows[0];
    res.json({
      success: true,
      invoice: {
        ...inv,
        date_ordered: toYMD(inv.date_ordered),
        due_date: toYMD(inv.due_date),
        reserve_date: toYMD(inv.reserve_date),
        paid_at: inv.paid_at ? toYMD(inv.paid_at) : null,
        payment_provider: inv.payment_provider || null,
        payment_transaction_id: inv.payment_transaction_id || null,
      },
    });
  } catch (error) {
    console.error('Error fetching invoice from DB:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch invoice' });
  }
});

// POST /api/invoices
router.post('/', async (req, res) => {
  const invoice = req.body;
  console.log('[POST /api/invoices] Received invoice:', invoice);
  if (!invoice || typeof invoice !== 'object') {
    return res.status(400).json({ success: false, error: 'Invoice data required' });
  }
  // Make businessId optional, assign default if missing
  if (!invoice.businessId) {
    invoice.businessId = 'default-business';
  }
  // Generate invoice_id if not provided (will be set after insert)
  if (!invoice.invoice_id) {
    invoice.invoice_id = generateInvoiceId();
  }
  try {
    const insertQuery = `
      INSERT INTO invoices (
        invoice_id, customer_name, phone_number, service_address, city, state, zip, source, trailer_number, trailer_size, reserve_date, amount, status, date_ordered, due_date, items, notes, businessid, email, paid_at, payment_provider, payment_transaction_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      ) RETURNING *;
    `;
    const values = [
      invoice.invoice_id,
      invoice.customer_name,
      invoice.phone_number,
      invoice.service_address,
      invoice.city,
      invoice.state,
      invoice.zip,
      invoice.source,
      invoice.trailer_number,
      invoice.trailer_size,
      invoice.reserve_date,
      invoice.amount,
      invoice.status,
      invoice.date_ordered,
      invoice.due_date,
      JSON.stringify(invoice.items || []),
      invoice.notes,
      invoice.businessId,
      invoice.email || null,
      invoice.paid_at || null,
      invoice.payment_provider || null,
      invoice.payment_transaction_id || null
    ];
    console.log('[POST /api/invoices] Insert Query:', insertQuery);
    console.log('[POST /api/invoices] Values:', values);
    // Insert invoice with blank invoice_id
    const result = await pool.query(insertQuery, values);
    let inv = result.rows[0];
    // After insert, update invoice_id to be the numeric id
    if (inv && inv.id) {
      const updateIdQuery = 'UPDATE invoices SET invoice_id = $1 WHERE id = $2 RETURNING *;';
      const updateIdResult = await pool.query(updateIdQuery, [String(inv.id), inv.id]);
      if (updateIdResult.rows.length > 0) {
        inv = updateIdResult.rows[0];
      }
    }
    res.json({
      success: true,
      invoice: {
        ...inv,
        date_ordered: toYMD(inv.date_ordered),
        due_date: toYMD(inv.due_date),
        reserve_date: toYMD(inv.reserve_date),
      },
    });
  } catch (error) {
    console.error('Error saving invoice:', error);
    console.error('Request body:', invoice);
    console.error('Full error stack:', error.stack);
    res.status(500).json({ success: false, error: 'Failed to save invoice', details: error.message });
  }
});

// PATCH /api/invoices/:id/mark-paid
router.patch('/:idOrInvoiceId/mark-paid', async (req, res) => {
  try {
    const { idOrInvoiceId } = req.params;
    console.log('[PATCH /api/invoices/:idOrInvoiceId/mark-paid] idOrInvoiceId:', idOrInvoiceId, 'body:', req.body);
    const paidAt = req.body.paid_at || new Date().toISOString();
    const status = req.body.status || 'paid';
    let updateQuery, values;
    if (/^\d+$/.test(idOrInvoiceId)) {
      // Numeric id
      updateQuery = `UPDATE invoices SET paid_at = $1, status = $2 WHERE id = $3 RETURNING *;`;
      values = [paidAt, status, idOrInvoiceId];
    } else {
      // invoice_id (string)
      updateQuery = `UPDATE invoices SET paid_at = $1, status = $2 WHERE invoice_id = $3 RETURNING *;`;
      values = [paidAt, status, idOrInvoiceId];
    }
    try {
      const result = await pool.query(updateQuery, values);
      if (result.rows.length === 0) {
        console.error('[PATCH mark-paid] No invoice found for:', updateQuery, values);
        return res.status(404).json({ success: false, error: 'Invoice not found' });
      }
      const inv = result.rows[0];
      res.json({
        success: true,
        invoice: {
          ...inv,
          date_ordered: toYMD(inv.date_ordered),
          due_date: toYMD(inv.due_date),
          reserve_date: toYMD(inv.reserve_date),
          paid_at: toYMD(inv.paid_at),
          payment_provider: inv.payment_provider || null,
          payment_transaction_id: inv.payment_transaction_id || null,
        },
      });
    } catch (queryError) {
      console.error('[PATCH mark-paid] Query error:', queryError, 'Query:', updateQuery, 'Values:', values);
      return res.status(500).json({ success: false, error: 'Query error', details: String(queryError) });
    }
  } catch (error) {
    console.error('Error marking invoice as paid:', error, 'Params:', req.params, 'Body:', req.body);
    res.status(500).json({ success: false, error: 'Failed to mark invoice as paid', details: String(error) });
  }
});

// PUT /api/invoices/:id
router.put('/:id', async (req, res) => {
  try {
    const fields = [
      'customer_name', 'phone_number', 'service_address', 'city', 'state', 'zip', 'source', 'trailer_number', 'trailer_size', 'reserve_date', 'amount', 'status', 'date_ordered', 'due_date', 'items', 'notes', 'businessid', 'paid_at', 'payment_provider', 'payment_transaction_id'
    ];
    const updates = [];
    const values = [];
    let idx = 1;
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${idx}`);
        if (field === 'items') {
          values.push(JSON.stringify(req.body[field]));
        } else {
          values.push(req.body[field]);
        }
        idx++;
      }
    }
    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }
    values.push(req.params.id);
    const updateQuery = `UPDATE invoices SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *;`;
    const result = await pool.query(updateQuery, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    const inv = result.rows[0];
    res.json({
      success: true,
      invoice: {
        ...inv,
        date_ordered: toYMD(inv.date_ordered),
        due_date: toYMD(inv.due_date),
        reserve_date: toYMD(inv.reserve_date),
      },
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ success: false, error: 'Failed to update invoice' });
  }
});

// DELETE /api/invoices/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM invoices WHERE id = $1 RETURNING *;', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ success: false, error: 'Failed to delete invoice' });
  }
});

export default router;


import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/customers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, phone, email FROM customers ORDER BY name ASC');
    res.json({ success: true, customers: result.rows });
  } catch (error) {
    console.error('Error fetching customers from DB:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch customers' });
  }
});

// POST /api/customers
router.post('/', async (req, res) => {
  const { name, phone, email } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ success: false, error: 'Name and phone are required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO customers (name, phone, email) VALUES ($1, $2, $3) RETURNING id, name, phone, email',
      [name, phone, email || '']
    );
    res.json({ success: true, customer: result.rows[0] });
  } catch (error) {
    console.error('Error creating customer in DB:', error);
    res.status(500).json({ success: false, error: 'Failed to create customer' });
  }
});

// PUT /api/customers/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, email } = req.body;
  try {
    const result = await pool.query(
      `
        UPDATE customers
        SET
          name = COALESCE($1, name),
          phone = COALESCE($2, phone),
          email = COALESCE($3, email)
        WHERE id = $4
        RETURNING id, name, phone, email
      `,
      [name ?? null, phone ?? null, email ?? null, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.json({ success: true, customer: result.rows[0] });
  } catch (error) {
    console.error('Error updating customer in DB:', error);
    res.status(500).json({ success: false, error: 'Failed to update customer' });
  }
});

export default router;

// DELETE /api/customers
router.delete('/', async (req, res) => {
  try {
    await pool.query('DELETE FROM customers');
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting customers from DB:', error);
    res.status(500).json({ success: false, error: 'Failed to delete customers' });
  }
});

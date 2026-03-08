const express = require('express');
const router = express.Router();
const { pool } = require('../database');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/customers?search=
router.get('/', async (req, res) => {
  try {
    const { search = '' } = req.query;
    let query = 'SELECT id, name, phone, address, created_at FROM customers';
    const params = [];
    if (search.trim()) {
      query += ' WHERE name ILIKE $1 OR phone LIKE $2';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }
    query += ' ORDER BY updated_at DESC LIMIT 50';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:id — customer detail + all receipts
router.get('/:id', async (req, res) => {
  try {
    const { rows: custs } = await pool.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (!custs.length) return res.status(404).json({ error: 'Not found' });
    const { rows: receipts } = await pool.query(
      `SELECT id, receipt_no, date, total_amount, status, payment_method, created_at
       FROM receipts WHERE customer_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json({ ...custs[0], receipts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/customers/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const { rows } = await pool.query(
      `UPDATE customers SET
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        address = COALESCE($3, address),
        updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [name || null, phone || null, address || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers
router.post('/', async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    const cleanPhone = phone ? phone.replace(/[\s\-().]/g, '') : null;
    const { rows } = await pool.query(
      'INSERT INTO customers (name, phone, address) VALUES ($1,$2,$3) RETURNING *',
      [name.trim(), cleanPhone || null, address || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', async (req, res) => {
  try {
    // Unlink receipts first, then delete customer
    await pool.query('UPDATE receipts SET customer_id = NULL WHERE customer_id = $1', [req.params.id]);
    const { rowCount } = await pool.query('DELETE FROM customers WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

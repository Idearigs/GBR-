const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { pool } = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Multer setup for ID photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads/ids')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Helper: format receipt_no
const padReceiptNo = (n) => String(n).padStart(4, '0');

// GET /api/public/receipt/:token  — no auth, public
router.get('/public/:token', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM receipts WHERE public_token = $1',
      [req.params.token]
    );
    if (!rows.length) return res.status(404).json({ error: 'Receipt not found' });
    const r = rows[0];
    res.json({
      receipt_no: padReceiptNo(r.receipt_no),
      customer_name: r.customer_name,
      customer_address: r.customer_address,
      date: r.date,
      items: r.items,
      total_amount: r.total_amount,
      signature_data: r.signature_data,
      status: r.status,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All routes below require auth
router.use(requireAuth);

// GET /api/receipts  — list all
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT id, receipt_no, customer_name, customer_phone, date, total_amount, status, created_at FROM receipts';
    const params = [];

    if (search) {
      query += ' WHERE customer_name ILIKE $1 OR CAST(receipt_no AS TEXT) LIKE $2';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY receipt_no DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));

    const { rows } = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM receipts' + (search ? ' WHERE customer_name ILIKE $1 OR CAST(receipt_no AS TEXT) LIKE $2' : ''), search ? [`%${search}%`, `%${search}%`] : []);

    res.json({
      receipts: rows.map(r => ({ ...r, receipt_no: padReceiptNo(r.receipt_no) })),
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/receipts/export  — CSV export
router.get('/export', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM receipts ORDER BY receipt_no ASC');
    const headers = ['Receipt No', 'Date', 'Customer Name', 'Address', 'Phone', 'Items', 'Total (£)', 'Status'];
    const csvRows = rows.map(r => [
      padReceiptNo(r.receipt_no),
      r.date ? new Date(r.date).toLocaleDateString('en-GB') : '',
      r.customer_name || '',
      (r.customer_address || '').replace(/\n/g, ' '),
      r.customer_phone || '',
      Array.isArray(r.items) ? r.items.map(i => `${i.qty}x ${i.description}`).join(' | ') : '',
      r.total_amount ? parseFloat(r.total_amount).toFixed(2) : '0.00',
      r.status || '',
    ]);

    const csv = [headers, ...csvRows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="receipts-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/receipts/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM receipts WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const r = rows[0];
    res.json({ ...r, receipt_no: padReceiptNo(r.receipt_no) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/receipts  — create draft
router.post('/', async (req, res) => {
  try {
    const { customer_name, customer_address, customer_phone, date, items, total_amount, notes } = req.body;
    const public_token = crypto.randomBytes(32).toString('hex');

    const { rows } = await pool.query(
      `INSERT INTO receipts (customer_name, customer_address, customer_phone, date, items, total_amount, notes, public_token, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft') RETURNING *`,
      [
        customer_name || '',
        customer_address || '',
        customer_phone || '',
        date || new Date().toISOString().split('T')[0],
        JSON.stringify(items || []),
        total_amount || 0,
        notes || '',
        public_token,
      ]
    );
    const r = rows[0];
    res.status(201).json({ ...r, receipt_no: padReceiptNo(r.receipt_no) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/receipts/:id  — update (signature, id_image, status, etc.)
router.put('/:id', async (req, res) => {
  try {
    const { customer_name, customer_address, customer_phone, date, items, total_amount, signature_data, id_image_url, status, notes } = req.body;

    const { rows } = await pool.query(
      `UPDATE receipts SET
        customer_name = COALESCE($1, customer_name),
        customer_address = COALESCE($2, customer_address),
        customer_phone = COALESCE($3, customer_phone),
        date = COALESCE($4, date),
        items = COALESCE($5, items),
        total_amount = COALESCE($6, total_amount),
        signature_data = COALESCE($7, signature_data),
        id_image_url = COALESCE($8, id_image_url),
        status = COALESCE($9, status),
        notes = COALESCE($10, notes),
        updated_at = NOW()
       WHERE id = $11 RETURNING *`,
      [
        customer_name,
        customer_address,
        customer_phone,
        date,
        items ? JSON.stringify(items) : null,
        total_amount,
        signature_data,
        id_image_url,
        status,
        notes,
        req.params.id,
      ]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const r = rows[0];
    res.json({ ...r, receipt_no: padReceiptNo(r.receipt_no) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/receipts/:id/send-sms
router.post('/:id/send-sms', async (req, res) => {
  try {
    const { phone } = req.body;
    const { rows } = await pool.query('SELECT * FROM receipts WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    const r = rows[0];
    const publicUrl = `${process.env.APP_URL}/r/${r.public_token}`;

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      // No Twilio — just return the link
      return res.json({ success: true, link: publicUrl, sms_sent: false });
    }

    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await twilio.messages.create({
      body: `Andrew McCulloch Jewellers — Your receipt No:${padReceiptNo(r.receipt_no)}. View it here: ${publicUrl}`,
      from: process.env.TWILIO_FROM_NUMBER,
      to: phone || r.customer_phone,
    });

    await pool.query('UPDATE receipts SET sms_sent_at = NOW(), status = $1 WHERE id = $2', ['sent', req.params.id]);
    res.json({ success: true, link: publicUrl, sms_sent: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/receipts/upload-id  — upload ID photo
router.post('/upload-id', upload.single('id_image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const url = `/uploads/ids/${req.file.filename}`;
  res.json({ url });
});

// DELETE /api/receipts/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM receipts WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

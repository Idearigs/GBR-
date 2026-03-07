const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const jwt = require('jsonwebtoken');
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

// GET /api/receipts/id-image/:filename — authenticated image serving (token via query param or header)
router.get('/id-image/:filename', (req, res) => {
  const token = req.query.token || (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorised' });
  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const filename = path.basename(req.params.filename); // prevent path traversal
  const filePath = path.join(__dirname, '../uploads/ids', filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  res.sendFile(filePath);
});

// All routes below require auth
router.use(requireAuth);

// GET /api/receipts  — list all (supports search, date_from, date_to)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', date_from = '', date_to = '' } = req.query;
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    if (search) {
      conditions.push(`(customer_name ILIKE $${params.length + 1} OR CAST(receipt_no AS TEXT) LIKE $${params.length + 2})`);
      params.push(`%${search}%`, `%${search}%`);
    }
    if (date_from) {
      conditions.push(`date >= $${params.length + 1}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(`date <= $${params.length + 1}`);
      params.push(date_to);
    }

    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
    const baseQuery = 'SELECT id, receipt_no, customer_name, customer_phone, date, total_amount, status, created_at, public_token, payment_method FROM receipts' + where;
    const countQuery = 'SELECT COUNT(*) FROM receipts' + where;

    const { rows } = await pool.query(baseQuery + ' ORDER BY receipt_no DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2), [...params, parseInt(limit), parseInt(offset)]);
    const countResult = await pool.query(countQuery, params);

    res.json({
      receipts: rows.map(r => ({ ...r, receipt_no: padReceiptNo(r.receipt_no) })),
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/receipts/export  — CSV export (supports date_from, date_to)
router.get('/export', async (req, res) => {
  try {
    const { date_from = '', date_to = '' } = req.query;
    const conditions = [];
    const params = [];
    if (date_from) { conditions.push(`date >= $${params.length + 1}`); params.push(date_from); }
    if (date_to) { conditions.push(`date <= $${params.length + 1}`); params.push(date_to); }
    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
    const { rows } = await pool.query('SELECT * FROM receipts' + where + ' ORDER BY receipt_no ASC', params);
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
    const { customer_name, customer_address, customer_phone, date, items, total_amount, notes, payment_method } = req.body;
    const public_token = crypto.randomBytes(32).toString('hex');

    const { rows } = await pool.query(
      `INSERT INTO receipts (customer_name, customer_address, customer_phone, date, items, total_amount, notes, public_token, status, payment_method)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft',$9) RETURNING *`,
      [
        customer_name || '',
        customer_address || '',
        customer_phone || '',
        date || new Date().toISOString().split('T')[0],
        JSON.stringify(items || []),
        total_amount || 0,
        notes || '',
        public_token,
        payment_method || 'cash',
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
    const { customer_name, customer_address, customer_phone, date, items, total_amount, signature_data, id_image_url, status, notes, payment_method } = req.body;

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
        payment_method = COALESCE($11, payment_method),
        updated_at = NOW()
       WHERE id = $12 RETURNING *`,
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
        payment_method,
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
    const toNumber = (phone || r.customer_phone || '').replace(/\s+/g, '');

    if (!process.env.VOODOO_API_KEY) {
      // No SMS configured — just return the link
      return res.json({ success: true, link: publicUrl, sms_sent: false });
    }

    if (!toNumber) {
      return res.status(400).json({ error: 'No phone number provided' });
    }

    const message = `Andrew McCulloch Jewellers - Receipt No:${padReceiptNo(r.receipt_no)}. View: ${publicUrl}`;

    const smsRes = await fetch('https://www.voodoosms.com/vapi/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VOODOO_API_KEY}`,
      },
      body: JSON.stringify({
        to: toNumber,
        from: process.env.VOODOO_SENDER || 'McCulloch',
        msg: message,
      }),
    });

    const smsData = await smsRes.json();

    if (!smsRes.ok || smsData.result !== 'success') {
      console.error('[VoodooSMS] error:', smsData);
      return res.status(502).json({ error: smsData.message || smsData.result || 'SMS send failed' });
    }

    await pool.query('UPDATE receipts SET sms_sent_at = NOW(), status = $1 WHERE id = $2', ['sent', req.params.id]);
    res.json({ success: true, link: publicUrl, sms_sent: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/receipts/upload-id  — upload ID photo
router.post('/upload-id', upload.single('id_image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const url = `/api/receipts/id-image/${req.file.filename}`;
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

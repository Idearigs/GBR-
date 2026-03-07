const express = require('express');
const nodemailer = require('nodemailer');
const { pool } = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const getTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const sendQuarterlyReport = async () => {
  try {
    const now = new Date();
    const qStart = new Date(now);
    qStart.setMonth(now.getMonth() - 3);

    const { rows } = await pool.query(
      `SELECT receipt_no, customer_name, date, total_amount, status
       FROM receipts
       WHERE created_at >= $1
       ORDER BY receipt_no ASC`,
      [qStart.toISOString()]
    );

    const total = rows.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0);
    const period = `${qStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} – ${now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;

    const tableRows = rows.map(r => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;">No:${String(r.receipt_no).padStart(4,'0')}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;">${new Date(r.date).toLocaleDateString('en-GB')}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;">${r.customer_name || ''}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;">£${parseFloat(r.total_amount).toFixed(2)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;">${r.status}</td>
      </tr>`).join('');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
        <div style="background:#1a1a1a;color:#D4AF37;padding:24px;text-align:center;">
          <h1 style="margin:0;font-size:22px;">${process.env.BUSINESS_NAME || 'Andrew McCulloch Jewellers'}</h1>
          <p style="margin:4px 0 0;color:#aaa;font-size:14px;">Gold Buying – Quarterly Statement</p>
        </div>
        <div style="padding:24px;background:#fafafa;">
          <p><strong>Period:</strong> ${period}</p>
          <p><strong>Total Receipts:</strong> ${rows.length}</p>
          <p><strong>Total Value:</strong> £${total.toFixed(2)}</p>
          <table style="width:100%;border-collapse:collapse;margin-top:16px;background:#fff;">
            <thead>
              <tr style="background:#1a1a1a;color:#D4AF37;">
                <th style="padding:8px 12px;text-align:left;">Receipt</th>
                <th style="padding:8px 12px;text-align:left;">Date</th>
                <th style="padding:8px 12px;text-align:left;">Customer</th>
                <th style="padding:8px 12px;text-align:right;">Amount</th>
                <th style="padding:8px 12px;text-align:left;">Status</th>
              </tr>
            </thead>
            <tbody>${tableRows || '<tr><td colspan="5" style="padding:16px;text-align:center;color:#999;">No receipts in this period</td></tr>'}</tbody>
            <tfoot>
              <tr style="background:#f5f5f5;">
                <td colspan="3" style="padding:8px 12px;font-weight:bold;">TOTAL</td>
                <td style="padding:8px 12px;font-weight:bold;text-align:right;">£${total.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div style="padding:16px 24px;background:#1a1a1a;color:#666;font-size:12px;text-align:center;">
          Generated automatically by GBR Receipt Manager
        </div>
      </div>`;

    await getTransporter().sendMail({
      from: `"GBR Receipt Manager" <${process.env.SMTP_USER}>`,
      to: process.env.REPORT_EMAIL,
      subject: `Gold Buying Report – ${period}`,
      html,
    });

    console.log('Quarterly report sent to', process.env.REPORT_EMAIL);
    return { success: true, period, receipts: rows.length, total };
  } catch (err) {
    console.error('Report send error:', err);
    throw err;
  }
};

// POST /api/reports/send  — manual trigger (auth required)
router.post('/send', requireAuth, async (req, res) => {
  try {
    const result = await sendQuarterlyReport();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.sendQuarterlyReport = sendQuarterlyReport;

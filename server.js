require('dotenv').config();
const Sentry = require('@sentry/node');
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const { initDb } = require('./database');
const authRouter = require('./routes/auth');
const receiptsRouter = require('./routes/receipts');
const reportsRouter = require('./routes/reports');
const customersRouter = require('./routes/customers');

Sentry.init({
  dsn: 'https://ad9c131d72fb9602fe279b456a1e28b1@o4511162586759168.ingest.us.sentry.io/4511162654130176',
  tracesSampleRate: 1.0,
  integrations: [Sentry.expressIntegration()],
});

const app = express();
const PORT = process.env.PORT || 3100;

console.log('[Config] VOODOO_API_KEY:', process.env.VOODOO_API_KEY ? `SET (${process.env.VOODOO_API_KEY.slice(0, 6)}...)` : 'NOT SET');
console.log('[Config] VOODOO_SENDER:', process.env.VOODOO_SENDER || 'NOT SET');
console.log('[Config] APP_URL:', process.env.APP_URL || 'NOT SET');

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// API routes
app.use('/api/auth', authRouter);
app.use('/api/receipts', receiptsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/customers', customersRouter);

// Public receipt route (no auth) — served before React catch-all
// Already handled inside receipts router at GET /api/receipts/public/:token

// Serve React PWA in production
if (process.env.NODE_ENV === 'production') {
  // Hashed assets (JS/CSS) — long cache; index.html + sw.js — never cached
  app.use(express.static(path.join(__dirname, 'client/dist'), { etag: false, maxAge: '1y', immutable: true }));
  app.get('/sw.js', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'client/dist/sw.js'));
  });
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  });
}

// Quarterly report — 1st of Jan, Apr, Jul, Oct at 9am
cron.schedule('0 9 1 1,4,7,10 *', async () => {
  const { sendQuarterlyReport } = require('./routes/reports');
  try { await sendQuarterlyReport(); }
  catch (e) { console.error('Cron report failed:', e.message); }
});

// GDPR retention — delete receipts + ID images older than 6 years, runs daily at 2am
cron.schedule('0 2 * * *', async () => {
  try {
    const { pool } = require('./database');
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 6);
    const { rows } = await pool.query(
      'SELECT id, id_image_url FROM receipts WHERE created_at < $1',
      [cutoff.toISOString()]
    );
    if (!rows.length) return;
    const fs = require('fs');
    for (const r of rows) {
      if (r.id_image_url) {
        const filename = r.id_image_url.split('/').pop();
        const filePath = path.join(__dirname, 'uploads/ids', filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }
    const ids = rows.map(r => r.id);
    await pool.query('DELETE FROM receipts WHERE id = ANY($1)', [ids]);
    console.log(`[GDPR] Deleted ${rows.length} receipts older than 6 years`);
  } catch (e) {
    console.error('GDPR retention cron failed:', e.message);
  }
});

// Ensure uploads/ids directory exists
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads/ids');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Sentry error handler — must be after all routes
Sentry.setupExpressErrorHandler(app);

initDb()
  .then(() => app.listen(PORT, () => console.log(`GBR Server → http://localhost:${PORT}`)))
  .catch(err => { console.error('Failed to init DB:', err); process.exit(1); });

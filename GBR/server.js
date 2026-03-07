require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const { initDb } = require('./database');
const authRouter = require('./routes/auth');
const receiptsRouter = require('./routes/receipts');
const reportsRouter = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3100;

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve uploaded ID images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/auth', authRouter);
app.use('/api/receipts', receiptsRouter);
app.use('/api/reports', reportsRouter);

// Public receipt route (no auth) — served before React catch-all
// Already handled inside receipts router at GET /api/receipts/public/:token

// Serve React PWA in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  });
}

// Quarterly report — 1st of Jan, Apr, Jul, Oct at 9am
cron.schedule('0 9 1 1,4,7,10 *', async () => {
  const { sendQuarterlyReport } = require('./routes/reports');
  try { await sendQuarterlyReport(); }
  catch (e) { console.error('Cron report failed:', e.message); }
});

// Ensure uploads/ids directory exists
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads/ids');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

initDb()
  .then(() => app.listen(PORT, () => console.log(`GBR Server → http://localhost:${PORT}`)))
  .catch(err => { console.error('Failed to init DB:', err); process.exit(1); });

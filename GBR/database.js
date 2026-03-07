const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'gbr',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

const initDb = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS receipts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        receipt_no SERIAL,
        customer_name VARCHAR(255),
        customer_address TEXT,
        customer_phone VARCHAR(30),
        date DATE DEFAULT CURRENT_DATE,
        items JSONB DEFAULT '[]',
        total_amount DECIMAL(10,2) DEFAULT 0,
        signature_data TEXT,
        id_image_url VARCHAR(500),
        status VARCHAR(20) DEFAULT 'draft',
        public_token VARCHAR(64) UNIQUE,
        sms_sent_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Ensure public_token index
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS receipts_public_token_idx
      ON receipts(public_token)
      WHERE public_token IS NOT NULL;
    `);

    console.log('Database initialised');
  } catch (err) {
    console.error('DB init error:', err);
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, initDb };

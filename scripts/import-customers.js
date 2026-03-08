/**
 * One-time customer import script.
 * Run inside the container: node scripts/import-customers.js
 */
const { pool } = require('../database');
const customers = require('../customer-import-data.json');

const normalise = (raw) => {
  if (!raw) return null;
  const s = raw.replace(/[\s\-().]/g, '');
  return s.length >= 7 ? s : null;
};

(async () => {
  let inserted = 0, updated = 0, skipped = 0;
  console.log(`Importing ${customers.length} customers...`);

  for (const c of customers) {
    if (!c.name || !c.name.trim()) { skipped++; continue; }
    const phone = normalise(c.phone);
    try {
      const { rows } = await pool.query(`
        INSERT INTO customers (name, phone, address)
        VALUES ($1, $2, $3)
        ON CONFLICT (phone) WHERE phone IS NOT NULL AND phone <> ''
        DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
        RETURNING (xmax = 0) AS inserted
      `, [c.name.trim(), phone || null, null]);
      if (rows[0]?.inserted) inserted++; else updated++;
    } catch (e) {
      skipped++;
    }
  }

  console.log(`Done!`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Updated:  ${updated}`);
  console.log(`  Skipped:  ${skipped}`);
  await pool.end();
})();

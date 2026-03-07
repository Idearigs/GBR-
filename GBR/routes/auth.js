const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// POST /api/auth/login  { pin: "1234" }
router.post('/login', (req, res) => {
  const { pin } = req.body;
  const expected = process.env.OWNER_PIN;
  console.log(`[login] received pin="${pin}" expected="${expected}" match=${pin === expected}`);
  if (!pin || pin !== expected) {
    return res.status(401).json({ error: 'Incorrect PIN' });
  }
  const token = jwt.sign({ role: 'owner' }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

module.exports = router;

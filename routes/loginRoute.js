const router = require('express').Router();
const { randomBytes } = require('node:crypto');
const { db } = require('../db');
const { hashPassword, matchesPassword, hashToken, authenticate } = require('../auth');

// Check a dummy hash for unknown emails so both login failures take similar work.
const dummyHash = hashPassword(randomBytes(32).toString('hex'));
// Track failed sign-ins by IP address for one minute.
const attempts = new Map();

// Public sign-up always creates a student account.
router.post('/register', (req, res) => {
  const { name, email, password } = req.body || {};
  const studentName = typeof name === 'string' ? name.trim() : '';
  const address = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!studentName || studentName.length > 100 ||
      address.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) ||
      typeof password !== 'string' || password.length < 8 ||
      password.length > 256 || !password.trim()) {
    return res.status(400).json({
      error: 'Enter a name of up to 100 characters, a valid email, and a password of 8 to 256 characters.'
    });
  }

  // Let SQLite reject duplicate emails even if two requests arrive together.
  const result = db.prepare(`
    INSERT INTO users (name, email, password_hash, role)
    VALUES (?, ?, ?, 'student')
    ON CONFLICT(email) DO NOTHING
  `).run(studentName, address, hashPassword(password));
  if (!result.changes) {
    return res.status(409).json({ error: 'An account with that email already exists. Please sign in.' });
  }
  res.status(201).json({ email: address });
});

router.post('/login', (req, res) => {
  const now = Date.now();
  for (const [key, entry] of attempts) {
    if (entry.expires <= now) attempts.delete(key);
  }
  const entry = attempts.get(req.ip) || { count: 0, expires: now + 60_000 };
  if (entry.count >= 15) {
    res.set('Retry-After', String(Math.ceil((entry.expires - now) / 1000)));
    return res.status(429).json({ error: 'Too many login attempts. Try again shortly.' });
  }
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' ||
      email.length > 254 || password.length > 256 || !email.trim() || !password) {
    return res.status(400).json({ error: 'Enter a valid email address and password.' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  const valid = matchesPassword(password, user ? user.password_hash : dummyHash);
  if (!user || !valid) {
    entry.count++;
    attempts.set(req.ip, entry);
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }
  // Give the signed-in user a token that expires after one hour.
  const token = randomBytes(32).toString('hex');
  db.prepare('DELETE FROM sessions WHERE expires <= ?').run(now);
  db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(hashToken(token), user.id, now + 3_600_000);
  const { id, name, role } = user;
  res.set('Cache-Control', 'no-store').json({ token, user: { id, name, email: user.email, role } });
});
// Return the current account or end its session.
router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));
router.post('/logout', authenticate, (req, res) => {
  db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(req.tokenHash);
  res.sendStatus(204);
});
module.exports = router;

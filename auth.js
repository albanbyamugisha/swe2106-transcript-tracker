const { createHash, randomBytes, scryptSync, timingSafeEqual } = require('node:crypto');
const { db } = require('./db');

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}
function matchesPassword(password, encoded) {
  return timingSafeEqual(
    Buffer.from(hashPassword(password, encoded.split(':')[0])),
    Buffer.from(encoded)
  );
}
function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}
function authenticate(req, res, next) {
  const match = /^Bearer ([a-f0-9]{64})$/.exec(req.get('Authorization') || '');
  const tokenHash = match && hashToken(match[1]);
  const user = tokenHash && db.prepare(`
    SELECT users.id, users.name, users.email, users.role
    FROM users JOIN sessions ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires > ?
  `).get(tokenHash, Date.now());
  if (!user) return res.status(401).json({ error: 'Sign in to continue.' });
  req.user = user;
  req.tokenHash = tokenHash;
  next();
}
function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) return res.status(403).json({ error: 'Your account cannot perform this action.' });
    next();
  };
}
module.exports = { hashPassword, matchesPassword, hashToken, authenticate, requireRole };

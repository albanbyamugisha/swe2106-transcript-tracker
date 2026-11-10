const { db, transaction } = require('./db');
const { hashPassword } = require('./auth');

// These fictional accounts are for the presentation.
const accounts = [
  ['student@example.test', 'alex.kato@std.must.ac.ug', 'Alex Kato', 'student'],
  ['student2@example.test', 'mary.auma@std.must.ac.ug', 'Mary Auma', 'student'],
  ['registrar@example.test', 'registrar@must.ac.ug', 'Registrar Demo', 'staff']
];
// Skip accounts that already exist so reseeding keeps existing data.
const insert = db.prepare(
  'INSERT OR IGNORE INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)'
);
const findAccount = db.prepare('SELECT role FROM users WHERE email = ?');
const renameAccount = db.prepare('UPDATE users SET email = ? WHERE email = ? AND name = ? AND role = ?');
transaction(() => {
  for (const [oldEmail, email, name, role] of accounts) {
    const existing = findAccount.get(email);
    if (existing && existing.role !== role) {
      throw new Error('The demo email ' + email + ' is already assigned to another role.');
    }
    // Keep the same account ID so existing requests and history stay linked.
    if (!existing) renameAccount.run(email, oldEmail, name, role);
    insert.run(email, name, hashPassword('TranscriptDemo!26'), role);
  }
});
console.log('Fictional demonstration accounts are available.');

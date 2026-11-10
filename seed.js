const { db, transaction } = require('./db');
const { hashPassword } = require('./auth');

// These fictional accounts are for the presentation.
const accounts = [
  ['student@example.test', 'Alex Kato', 'student'],
  ['student2@example.test', 'Mary Auma', 'student'],
  ['registrar@example.test', 'Registrar Demo', 'staff']
];
// Skip accounts that already exist so reseeding keeps existing data.
const insert = db.prepare(
  'INSERT OR IGNORE INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)'
);
transaction(() => {
  for (const [email, name, role] of accounts) {
    insert.run(email, name, hashPassword('TranscriptDemo!26'), role);
  }
});
console.log('Fictional demonstration accounts are available.');

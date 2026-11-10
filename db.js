const { DatabaseSync } = require('node:sqlite');
const { mkdirSync } = require('node:fs');
const { dirname, join } = require('node:path');

// Use the local database file unless a different path was supplied.
const file = process.env.DB_FILE || join(__dirname, 'data', 'registrar.sqlite');
mkdirSync(dirname(file), { recursive: true });
const db = new DatabaseSync(file);
// Turn on SQLite settings and create any missing tables.
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL, password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('student', 'staff'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
    expires INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY, student_id INTEGER NOT NULL REFERENCES users(id),
    purpose TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('submitted','under_review','ready','rejected')),
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY, request_id TEXT NOT NULL REFERENCES requests(id),
    actor_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL, note TEXT NOT NULL, changed_at TEXT NOT NULL
  );
`);
// Keep related writes together and roll them back if any step fails.
function transaction(run) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = run();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
module.exports = { db, transaction };

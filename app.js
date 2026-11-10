const express = require('express');
const path = require('node:path');
const { db } = require('./db');

const app = express();
app.disable('x-powered-by');
// Add browser security headers and prevent caching of API responses.
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'no-referrer');
  res.set('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'");
  if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
  next();
});
app.use(express.json({ limit: '8kb' }));
// Run a simple SQLite query to check the database connection.
app.get('/api/health', (req, res) => {
  db.prepare('SELECT 1').get();
  res.json({ status: 'ok', database: 'connected' });
});
// The browser and Postman use these same API routes.
app.use('/api/auth', require('./routes/loginRoute'));
app.use('/api/requests', require('./routes/requestRoute'));
// Serve the HTML, CSS and JavaScript from the public folder.
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
// Return a JSON message when Express cannot handle a request.
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON request body.' });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large.' });
  console.error(error.message);
  res.status(500).json({ error: 'The request could not be completed.' });
});
module.exports = app;

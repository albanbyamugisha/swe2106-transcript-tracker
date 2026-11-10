const router = require('express').Router();
const { randomUUID } = require('node:crypto');
const { db, transaction } = require('../db');
const { authenticate, requireRole } = require('../auth');

const transitions = {
  submitted: ['under_review'],
  under_review: ['ready', 'rejected'],
  ready: [],
  rejected: []
};
const select = `SELECT r.*, u.name AS student_name
                FROM requests r JOIN users u ON r.student_id = u.id`;
const find = db.prepare(select + ' WHERE r.id = ?');
const addHistory = db.prepare(
  'INSERT INTO history (request_id, actor_id, status, note, changed_at) VALUES (?, ?, ?, ?, ?)'
);
router.use(authenticate);

router.get('/', (req, res) => {
  const requests = req.user.role === 'staff'
    ? db.prepare(select + ' ORDER BY r.created_at DESC').all()
    : db.prepare(select + ' WHERE r.student_id = ? ORDER BY r.created_at DESC').all(req.user.id);
  res.json({ requests });
});

router.post('/', requireRole('student'), (req, res) => {
  const purpose = typeof req.body?.purpose === 'string' ? req.body.purpose.trim() : '';
  if (purpose.length < 5 || purpose.length > 300) {
    return res.status(400).json({ error: 'Purpose must contain 5 to 300 characters.' });
  }
  const id = 'TR-' + randomUUID();
  const now = new Date().toISOString();
  transaction(() => {
    db.prepare('INSERT INTO requests VALUES (?, ?, ?, ?, ?)').run(id, req.user.id, purpose, 'submitted', now);
    addHistory.run(id, req.user.id, 'submitted', '', now);
  });
  res.location('/api/requests/' + id).status(201).json({ request: find.get(id) });
});

router.get('/:id', (req, res) => {
  const request = find.get(req.params.id);
  if (!request || (req.user.role !== 'staff' && request.student_id !== req.user.id)) {
    return res.status(404).json({ error: 'Request not found.' });
  }
  const history = db.prepare(`
    SELECT h.status, h.note, h.changed_at, u.name AS actor
    FROM history h JOIN users u ON u.id = h.actor_id
    WHERE h.request_id = ? ORDER BY h.id
  `).all(request.id);
  res.json({ request, history });
});

router.patch('/:id/status', requireRole('staff'), (req, res) => {
  const { status, note = '' } = req.body || {};
  if (typeof status !== 'string' || !['under_review', 'ready', 'rejected'].includes(status) ||
      typeof note !== 'string' || note.trim().length > 300) {
    return res.status(400).json({ error: 'Select a valid status and use at most 300 characters for the note.' });
  }
  if (status === 'rejected' && !note.trim()) {
    return res.status(400).json({ error: 'Provide a reason for rejection.' });
  }
  const result = transaction(() => {
    const request = find.get(req.params.id);
    if (!request) return { code: 404, error: 'Request not found.' };
    if (!transitions[request.status].includes(status)) {
      return { code: 409, error: 'This status change is not allowed.' };
    }
    db.prepare('UPDATE requests SET status = ? WHERE id = ?').run(status, request.id);
    addHistory.run(request.id, req.user.id, status, note.trim(), new Date().toISOString());
    return { code: 200, request: find.get(request.id) };
  });
  const { code, ...body } = result;
  res.status(code).json(body);
});
module.exports = router;

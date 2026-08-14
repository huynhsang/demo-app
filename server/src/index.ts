import express from 'express';
import cors from 'cors';
import { db } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/issues', (req, res) => {
  const { status, assignee, search } = req.query as Record<string, string | undefined>;

  let query = 'SELECT * FROM issues WHERE 1=1';
  if (status && status !== 'all') {
    query += ` AND status = '${status}'`;
  }
  if (assignee) {
    query += ` AND assignee = '${assignee}'`;
  }
  if (search) {
    query += ` AND title LIKE '%${search}%'`;
  }
  query += ' ORDER BY created_at ASC';

  const rows = db.prepare(query).all();
  res.json(rows);
});

app.get('/api/issues/:id', (req, res) => {
  const { id } = req.params;
  const issue = db.prepare('SELECT * FROM issues WHERE id = ?').get(id);
  if (!issue) return res.status(404).json({ error: 'not found' });
  res.json(issue);
});

app.post('/api/issues', (req, res) => {
  const idempotencyKey = req.get('Idempotency-Key')?.trim();
  const { title, description, priority, assignee } = req.body ?? {};

  if (!title || !assignee) {
    return res.status(400).json({ error: 'title and assignee are required' });
  }

  if (!idempotencyKey) {
    const now = new Date().toISOString();
    const result = db
      .prepare(
        `INSERT INTO issues (title, description, status, priority, assignee, created_at, updated_at)
         VALUES (?, ?, 'open', ?, ?, ?, ?)`
      )
      .run(title, description ?? '', priority ?? 'medium', assignee, now, now);

    const created = db.prepare('SELECT * FROM issues WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json(created);
  }

  const requestPayload = JSON.stringify({
    title,
    description: description ?? '',
    priority: priority ?? 'medium',
    assignee,
  });

  db.exec('BEGIN IMMEDIATE');
  try {
    const existing = db
      .prepare(
        `SELECT request_payload, issue_id
         FROM issue_creation_idempotency
         WHERE idempotency_key = ?`
      )
      .get(idempotencyKey) as { request_payload: string; issue_id: number } | undefined;

    if (existing) {
      if (existing.request_payload !== requestPayload) {
        db.exec('COMMIT');
        return res.status(409).json({ error: 'Idempotency-Key already used with different payload' });
      }

      const issue = db.prepare('SELECT * FROM issues WHERE id = ?').get(existing.issue_id);
      db.exec('COMMIT');
      return res.json(issue);
    }

    const now = new Date().toISOString();
    const result = db
      .prepare(
        `INSERT INTO issues (title, description, status, priority, assignee, created_at, updated_at)
         VALUES (?, ?, 'open', ?, ?, ?, ?)`
      )
      .run(title, description ?? '', priority ?? 'medium', assignee, now, now);

    db.prepare(
      `INSERT INTO issue_creation_idempotency
         (idempotency_key, request_payload, issue_id, created_at)
       VALUES (?, ?, ?, ?)`
    ).run(idempotencyKey, requestPayload, result.lastInsertRowid, now);

    const created = db.prepare('SELECT * FROM issues WHERE id = ?').get(result.lastInsertRowid);
    db.exec('COMMIT');
    return res.status(201).json(created);
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
});

app.patch('/api/issues/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, status, assignee, priority } = req.body ?? {};

  const existing = db.prepare('SELECT * FROM issues WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) return res.status(404).json({ error: 'not found' });

  const next = {
    title: title ?? existing.title,
    description: description ?? existing.description,
    status: status ?? existing.status,
    assignee: assignee ?? existing.assignee,
    priority: priority ?? existing.priority,
    updated_at: new Date().toISOString(),
  };

  db.prepare(
    'UPDATE issues SET title = ?, description = ?, status = ?, assignee = ?, priority = ?, updated_at = ? WHERE id = ?'
  ).run(next.title, next.description, next.status, next.assignee, next.priority, next.updated_at, id);

  res.json({ ...existing, ...next });
});

const PORT = 4000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));

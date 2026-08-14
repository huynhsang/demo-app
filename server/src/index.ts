import express from 'express';
import cors from 'cors';
import { db } from './db.js';

const allowedStatuses = ['open', 'in_progress', 'closed'];

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
  const { title, description, priority, assignee } = req.body ?? {};

  if (!title || !assignee) {
    return res.status(400).json({ error: 'title and assignee are required' });
  }

  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO issues (title, description, status, priority, assignee, created_at, updated_at)
       VALUES (?, ?, 'open', ?, ?, ?, ?)`
    )
    .run(title, description ?? '', priority ?? 'medium', assignee, now, now);

  const created = db.prepare('SELECT * FROM issues WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

app.patch('/api/issues/:id', (req, res) => {
  const { id } = req.params;
  const body = req.body ?? {};
  const { title, description, status, assignee, priority } = body;

  const existing = db.prepare('SELECT * FROM issues WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) return res.status(404).json({ error: 'not found' });

  if (Object.prototype.hasOwnProperty.call(body, 'status') && !allowedStatuses.includes(status)) {
    return res.status(400).json({
      error: 'Invalid status. Allowed values: open, in_progress, closed',
      field: 'status',
      allowed: allowedStatuses,
    });
  }

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

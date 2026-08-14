import cors from 'cors';
import express from 'express';
import type { DatabaseSync } from 'node:sqlite';

export function createApp(database: DatabaseSync) {
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

    const rows = database.prepare(query).all();
    res.json(rows);
  });

  app.get('/api/issues/:id', (req, res) => {
    const { id } = req.params;
    try {
      const issue = database.prepare('SELECT * FROM issues WHERE id = ?').get(id);
      if (!issue) return res.status(404).json({ error: 'not found' });
      const comments = database
        .prepare('SELECT * FROM comments WHERE issue_id = ? ORDER BY created_at ASC, id ASC')
        .all(id);
      return res.json({ ...issue, comments });
    } catch (error) {
      console.error(`Failed to load issue ${id}`, error);
      return res.status(500).json({ error: 'Failed to load issue' });
    }
  });

  app.post('/api/issues', (req, res) => {
    const { title, description, priority, assignee } = req.body ?? {};

    if (!title || !assignee) {
      return res.status(400).json({ error: 'title and assignee are required' });
    }

    const now = new Date().toISOString();
    const result = database
      .prepare(
        `INSERT INTO issues (title, description, status, priority, assignee, created_at, updated_at)
         VALUES (?, ?, 'open', ?, ?, ?, ?)`
      )
      .run(title, description ?? '', priority ?? 'medium', assignee, now, now);

    const created = database.prepare('SELECT * FROM issues WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  });

  app.post('/api/issues/:id/comments', (req, res) => {
    const { id } = req.params;
    const { author, body } = req.body ?? {};

    if (typeof author !== 'string' || typeof body !== 'string') {
      return res.status(400).json({ error: 'author and body must be strings' });
    }

    const trimmedAuthor = author.trim();
    const trimmedBody = body.trim();
    if (!trimmedAuthor || !trimmedBody) {
      return res.status(400).json({ error: 'author and body are required' });
    }

    try {
      const issue = database.prepare('SELECT id FROM issues WHERE id = ?').get(id);
      if (!issue) {
        return res.status(404).json({ error: 'issue not found' });
      }

      const createdAt = new Date().toISOString();
      database.exec('BEGIN');
      try {
        const result = database
          .prepare(
            'INSERT INTO comments (issue_id, author, body, created_at) VALUES (?, ?, ?, ?)'
          )
          .run(id, trimmedAuthor, trimmedBody, createdAt);
        const created = database
          .prepare('SELECT * FROM comments WHERE id = ?')
          .get(result.lastInsertRowid);
        if (!created) {
          throw new Error('Created comment could not be read');
        }
        database.exec('COMMIT');
        return res.status(201).json(created);
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error(`Failed to create comment for issue ${id}`, error);
      return res.status(500).json({ error: 'Failed to create comment' });
    }
  });

  app.patch('/api/issues/:id', (req, res) => {
    const { id } = req.params;
    const { title, description, status, assignee, priority } = req.body ?? {};

    const existing = database.prepare('SELECT * FROM issues WHERE id = ?').get(id) as
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

    database
      .prepare(
        'UPDATE issues SET title = ?, description = ?, status = ?, assignee = ?, priority = ?, updated_at = ? WHERE id = ?'
      )
      .run(
        next.title,
        next.description,
        next.status,
        next.assignee,
        next.priority,
        next.updated_at,
        id
      );

    res.json({ ...existing, ...next });
  });

  return app;
}

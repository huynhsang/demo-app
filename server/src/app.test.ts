import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import type { DatabaseSync } from 'node:sqlite';
import request from 'supertest';
import { createApp } from './app.js';
import { createDatabase } from './db.js';

let database: DatabaseSync;

function insertIssue(title = 'Test issue'): number {
  const now = new Date().toISOString();
  const result = database
    .prepare(
      `INSERT INTO issues (title, description, status, priority, assignee, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(title, '', 'open', 'medium', 'Alex', now, now);
  return Number(result.lastInsertRowid);
}

beforeEach(() => {
  database = createDatabase(':memory:', { seed: false });
});

afterEach(() => {
  database.close();
});

test('preserves issue creation, detail retrieval, and patch behavior', async () => {
  const app = createApp(database);
  const created = await request(app).post('/api/issues').send({
    title: 'Regression issue',
    description: 'Existing workflow',
    priority: 'high',
    assignee: 'Priya',
  });

  assert.equal(created.status, 201);
  assert.equal(created.body.title, 'Regression issue');

  const detail = await request(app).get(`/api/issues/${created.body.id}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.assignee, 'Priya');
  assert.deepEqual(detail.body.comments, []);

  const patched = await request(app)
    .patch(`/api/issues/${created.body.id}`)
    .send({ status: 'closed', assignee: 'Alex' });
  assert.equal(patched.status, 200);
  assert.equal(patched.body.status, 'closed');
  assert.equal(patched.body.assignee, 'Alex');
});

test('creates a trimmed comment with a server timestamp', async () => {
  const issueId = insertIssue();
  const before = Date.now();

  const response = await request(createApp(database))
    .post(`/api/issues/${issueId}/comments`)
    .send({ author: '  Alex  ', body: '  Customer called back.  ', created_at: '2000-01-01' });

  assert.equal(response.status, 201);
  assert.equal(response.body.issue_id, issueId);
  assert.equal(response.body.author, 'Alex');
  assert.equal(response.body.body, 'Customer called back.');
  assert.ok(Date.parse(response.body.created_at) >= before);
  assert.notEqual(response.body.created_at, '2000-01-01');

  const stored = database.prepare('SELECT * FROM comments WHERE id = ?').get(response.body.id) as {
    body: string;
  };
  assert.equal(stored.body, 'Customer called back.');
});

test('returns issue-scoped comments oldest-first with id tie-breaking', async () => {
  const issueId = insertIssue('First issue');
  const otherIssueId = insertIssue('Other issue');
  const insert = database.prepare(
    'INSERT INTO comments (issue_id, author, body, created_at) VALUES (?, ?, ?, ?)'
  );
  insert.run(issueId, 'Sam', 'second', '2026-01-02T00:00:00.000Z');
  insert.run(otherIssueId, 'Priya', 'not included', '2025-01-01T00:00:00.000Z');
  insert.run(issueId, 'Alex', 'first', '2026-01-01T00:00:00.000Z');
  insert.run(issueId, 'Jordan', 'third', '2026-01-02T00:00:00.000Z');

  const response = await request(createApp(database)).get(`/api/issues/${issueId}`);

  assert.equal(response.status, 200);
  assert.deepEqual(
    response.body.comments.map((comment: { body: string }) => comment.body),
    ['first', 'second', 'third']
  );
});

for (const [label, body] of [
  ['missing author', { body: 'Hello' }],
  ['non-string author', { author: 42, body: 'Hello' }],
  ['blank author', { author: '   ', body: 'Hello' }],
  ['missing body', { author: 'Alex' }],
  ['non-string body', { author: 'Alex', body: {} }],
  ['blank body', { author: 'Alex', body: '\n\t ' }],
] as const) {
  test(`rejects ${label} without inserting a comment`, async () => {
    const issueId = insertIssue();

    const response = await request(createApp(database))
      .post(`/api/issues/${issueId}/comments`)
      .send(body);

    assert.equal(response.status, 400);
    assert.equal(typeof response.body.error, 'string');
    const { count } = database.prepare('SELECT COUNT(*) AS count FROM comments').get() as {
      count: number;
    };
    assert.equal(count, 0);
  });
}

test('returns 404 for an unknown issue without creating an orphan', async () => {
  const response = await request(createApp(database))
    .post('/api/issues/999/comments')
    .send({ author: 'Alex', body: 'Hello' });

  assert.equal(response.status, 404);
  assert.equal(typeof response.body.error, 'string');
  const { count } = database.prepare('SELECT COUNT(*) AS count FROM comments').get() as {
    count: number;
  };
  assert.equal(count, 0);
});

test('returns the JSON error shape when comment persistence fails', async () => {
  const issueId = insertIssue();
  database.exec(`
    CREATE TRIGGER fail_comment_insert
    BEFORE INSERT ON comments
    BEGIN
      SELECT RAISE(FAIL, 'forced comment failure');
    END;
  `);

  const response = await request(createApp(database))
    .post(`/api/issues/${issueId}/comments`)
    .send({ author: 'Alex', body: 'Hello' });

  assert.equal(response.status, 500);
  assert.equal(typeof response.body.error, 'string');
  const { count } = database.prepare('SELECT COUNT(*) AS count FROM comments').get() as {
    count: number;
  };
  assert.equal(count, 0);
});

test('returns the JSON error shape when issue comments cannot be loaded', async () => {
  const issueId = insertIssue();
  database.exec('DROP TABLE comments');

  const response = await request(createApp(database)).get(`/api/issues/${issueId}`);

  assert.equal(response.status, 500);
  assert.equal(typeof response.body.error, 'string');
});

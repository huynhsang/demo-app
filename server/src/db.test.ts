import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { createDatabase } from './db.js';

const databaseFiles: string[] = [];

afterEach(() => {
  for (const file of databaseFiles.splice(0)) {
    fs.rmSync(file, { force: true });
    fs.rmSync(`${file}-shm`, { force: true });
    fs.rmSync(`${file}-wal`, { force: true });
  }
});

test('initializes comments schema, index, and foreign keys', () => {
  const database = createDatabase(':memory:', { seed: false });

  const table = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'comments'")
    .get();
  const index = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'comments_issue_created_idx'")
    .get();
  const foreignKeys = database.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number };

  assert.ok(table);
  assert.ok(index);
  assert.equal(foreignKeys.foreign_keys, 1);
  database.close();
});

test('persists comments across reopening the same database file', () => {
  const file = path.join(process.cwd(), `.comments-${process.pid}-${Date.now()}.sqlite`);
  databaseFiles.push(file);

  const first = createDatabase(file, { seed: false });
  const now = new Date().toISOString();
  const issue = first
    .prepare(
      `INSERT INTO issues (title, description, status, priority, assignee, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run('Persist me', '', 'open', 'medium', 'Alex', now, now);
  first
    .prepare('INSERT INTO comments (issue_id, author, body, created_at) VALUES (?, ?, ?, ?)')
    .run(issue.lastInsertRowid, 'Alex', 'Still here', now);
  first.close();

  const second = createDatabase(file, { seed: false });
  const comment = second.prepare('SELECT author, body FROM comments').get() as {
    author: string;
    body: string;
  };
  assert.equal(comment.author, 'Alex');
  assert.equal(comment.body, 'Still here');
  second.close();
});

test('comment index supports deterministic oldest-first reads', () => {
  const database = createDatabase(':memory:', { seed: false });
  const now = new Date().toISOString();
  const issue = database
    .prepare(
      `INSERT INTO issues (title, description, status, priority, assignee, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run('Ordered', '', 'open', 'medium', 'Alex', now, now);
  const insert = database.prepare(
    'INSERT INTO comments (issue_id, author, body, created_at) VALUES (?, ?, ?, ?)'
  );
  insert.run(issue.lastInsertRowid, 'Alex', 'second at same time', '2026-01-02T00:00:00.000Z');
  insert.run(issue.lastInsertRowid, 'Alex', 'first', '2026-01-01T00:00:00.000Z');
  insert.run(issue.lastInsertRowid, 'Alex', 'third at same time', '2026-01-02T00:00:00.000Z');

  const rows = database
    .prepare('SELECT body FROM comments WHERE issue_id = ? ORDER BY created_at ASC, id ASC')
    .all(issue.lastInsertRowid) as Array<{ body: string }>;
  assert.deepEqual(
    rows.map(({ body }) => body),
    ['first', 'second at same time', 'third at same time']
  );
  database.close();
});

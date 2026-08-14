import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { createDatabase } from './db.js';

test('new databases constrain status to the three supported values', () => {
  const db = createDatabase(':memory:');

  try {
    for (const status of ['open', 'in_progress', 'closed']) {
      db.prepare('UPDATE issues SET status = ? WHERE id = 1').run(status);
      assert.equal(
        (db.prepare('SELECT status FROM issues WHERE id = 1').get() as { status: string }).status,
        status
      );
    }
    assert.throws(
      () => db.prepare('UPDATE issues SET status = ? WHERE id = 1').run('pending'),
      /CHECK constraint failed/
    );
  } finally {
    db.close();
  }
});

test('legacy unconstrained databases start without migration and preserve rows', () => {
  const fixtureDirectory = path.join(process.cwd(), '.test-data');
  const fixturePath = path.join(fixtureDirectory, 'legacy.sqlite');
  fs.mkdirSync(fixtureDirectory, { recursive: true });
  fs.rmSync(fixturePath, { force: true });

  const legacyDb = new DatabaseSync(fixturePath);
  legacyDb.exec(`
    CREATE TABLE issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      priority TEXT NOT NULL DEFAULT 'medium',
      assignee TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    INSERT INTO issues
      (title, description, status, priority, assignee, created_at, updated_at)
    VALUES
      ('Legacy issue', 'Existing row', 'legacy_value', 'medium', 'Alex', 'before', 'before');
  `);
  legacyDb.close();

  let reopened: DatabaseSync | undefined;
  try {
    reopened = createDatabase(fixturePath);
    assert.deepEqual({ ...reopened.prepare('SELECT * FROM issues').get() }, {
      id: 1,
      title: 'Legacy issue',
      description: 'Existing row',
      status: 'legacy_value',
      priority: 'medium',
      assignee: 'Alex',
      created_at: 'before',
      updated_at: 'before',
    });
  } finally {
    reopened?.close();
    fs.rmSync(fixturePath, { force: true });
    fs.rmdirSync(fixtureDirectory);
  }
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';

function copyDatabaseModule(name: string) {
  const fixtureDirectory = path.join(process.cwd(), '.test-data', name);
  const sourceDirectory = path.join(fixtureDirectory, 'src');
  fs.rmSync(fixtureDirectory, { force: true, recursive: true });
  fs.mkdirSync(sourceDirectory, { recursive: true });
  const modulePath = path.join(sourceDirectory, 'db.ts');
  fs.copyFileSync(path.join(process.cwd(), 'src', 'db.ts'), modulePath);
  return { fixtureDirectory, modulePath };
}

test('new databases constrain status to the three supported values', async () => {
  const { fixtureDirectory, modulePath } = copyDatabaseModule('new-database');
  const { db } = await import(pathToFileURL(modulePath).href);

  try {
    for (const status of ['open', 'in_progress', 'closed']) {
      db.prepare('UPDATE issues SET status = ? WHERE id = 1').run(status);
    }
    assert.throws(
      () => db.prepare('UPDATE issues SET status = ? WHERE id = 1').run('pending'),
      /CHECK constraint failed/
    );
  } finally {
    db.close();
    fs.rmSync(fixtureDirectory, { force: true, recursive: true });
  }
});

test('existing databases are not migrated', async () => {
  const { fixtureDirectory, modulePath } = copyDatabaseModule('existing-database');
  const databasePath = path.join(fixtureDirectory, 'data.sqlite');
  const legacyDb = new DatabaseSync(databasePath);
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

  const { db } = await import(pathToFileURL(modulePath).href);
  try {
    assert.equal(
      (db.prepare('SELECT status FROM issues WHERE id = 1').get() as { status: string }).status,
      'legacy_value'
    );
  } finally {
    db.close();
    fs.rmSync(fixtureDirectory, { force: true, recursive: true });
  }
});

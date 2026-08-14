import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import {
  BulkCloseNotFoundError,
  BulkCloseValidationError,
  closeIssues,
} from './bulkClose.js';

const databases: DatabaseSync[] = [];

function createDatabase() {
  const database = new DatabaseSync(':memory:');
  databases.push(database);
  database.exec(`
    CREATE TABLE issues (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    INSERT INTO issues (id, title, status, updated_at) VALUES
      (1, 'First', 'open', '2026-01-01T00:00:00.000Z'),
      (2, 'Second', 'open', '2026-01-02T00:00:00.000Z'),
      (3, 'Third', 'in_progress', '2026-01-03T00:00:00.000Z');
  `);
  return database;
}

function issueStates(database: DatabaseSync) {
  return database
    .prepare('SELECT id, status, updated_at FROM issues ORDER BY id')
    .all();
}

afterEach(() => {
  while (databases.length > 0) {
    databases.pop()?.close();
  }
});

describe('closeIssues', () => {
  test('closes a valid batch atomically with one timestamp', () => {
    const database = createDatabase();

    const updated = closeIssues(database, [1, 3]) as Array<{
      id: number;
      status: string;
      updated_at: string;
    }>;

    assert.deepEqual(
      updated.map(({ id, status }) => ({ id, status })),
      [
        { id: 1, status: 'closed' },
        { id: 3, status: 'closed' },
      ]
    );
    assert.equal(updated[0].updated_at, updated[1].updated_at);
    assert.notEqual(updated[0].updated_at, '2026-01-01T00:00:00.000Z');
  });

  test('rejects empty, malformed, unsafe, duplicate, and injection-shaped IDs', () => {
    const invalidInputs: unknown[] = [
      undefined,
      null,
      {},
      [],
      ['1'],
      [1.5],
      [NaN],
      [Infinity],
      [Number.MAX_SAFE_INTEGER + 1],
      [1, 1],
      ['1); DROP TABLE issues; --'],
    ];

    for (const input of invalidInputs) {
      const database = createDatabase();
      const before = issueStates(database);

      assert.throws(() => closeIssues(database, input), BulkCloseValidationError);
      assert.deepEqual(issueStates(database), before);
    }
  });

  test('rolls back when all or some requested IDs do not exist', () => {
    for (const ids of [[99], [1, 99]]) {
      const database = createDatabase();
      const before = issueStates(database);

      assert.throws(() => closeIssues(database, ids), BulkCloseNotFoundError);
      assert.deepEqual(issueStates(database), before);
    }
  });

  test('rolls back the entire batch after a database update error', () => {
    const database = createDatabase();
    const before = issueStates(database);
    database.exec(`
      CREATE TRIGGER reject_second_issue
      BEFORE UPDATE ON issues
      WHEN OLD.id = 2
      BEGIN
        SELECT RAISE(ABORT, 'update rejected');
      END;
    `);

    assert.throws(() => closeIssues(database, [1, 2]), /update rejected/);
    assert.deepEqual(issueStates(database), before);
  });
});

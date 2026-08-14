import { DatabaseSync } from 'node:sqlite';
import type { Express } from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

let app: Express;
let database: DatabaseSync;

beforeAll(async () => {
  database = new DatabaseSync(':memory:');
  database.exec(`
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
    CREATE TABLE issue_creation_idempotency (
      idempotency_key TEXT PRIMARY KEY,
      request_payload TEXT NOT NULL,
      issue_id INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  vi.doMock('./db.js', () => ({ db: database }));
  vi.doMock('express', async () => {
    const actual = await vi.importActual<typeof import('express')>('express');
    const express = Object.assign(
      () => {
        app = actual.default();
        app.listen = vi.fn() as typeof app.listen;
        return app;
      },
      actual.default
    );
    return {
      ...actual,
      default: express,
    };
  });

  await import('./index.js');
});

beforeEach(() => {
  database.exec('DELETE FROM issue_creation_idempotency; DELETE FROM issues;');
});

afterAll(() => {
  database.close();
  vi.restoreAllMocks();
});

const input = {
  title: 'Printer is offline',
  description: 'Third floor',
  priority: 'high',
  assignee: 'Alex',
};

function postIssue(body: Record<string, unknown>, idempotencyKey?: string) {
  const layer = (app as any)._router.stack.find(
    (item: any) => item.route?.path === '/api/issues' && item.route.methods.post
  );
  const handler = layer.route.stack.at(-1).handle;
  let status = 200;
  let responseBody: unknown;
  const response = {
    status(code: number) {
      status = code;
      return response;
    },
    json(value: unknown) {
      responseBody = value;
      return response;
    },
  };

  handler(
    {
      body,
      get: (name: string) => (name === 'Idempotency-Key' ? idempotencyKey : undefined),
    },
    response
  );

  return { status, body: responseBody };
}

describe('POST /api/issues idempotency', () => {
  it('replays the same issue without inserting a duplicate', () => {
    const created = postIssue(input, 'key-1');
    const replayed = postIssue(input, 'key-1');

    expect(created.status).toBe(201);
    expect(replayed).toEqual({ status: 200, body: created.body });
    expect(database.prepare('SELECT COUNT(*) AS count FROM issues').get()).toEqual({ count: 1 });
    expect(
      database.prepare('SELECT created_at FROM issue_creation_idempotency').get()
    ).toMatchObject({ created_at: expect.any(String) });
  });

  it('returns 409 when the same key is used with a different payload', () => {
    postIssue(input, 'key-1');
    const conflict = postIssue({ ...input, title: 'Different issue' }, 'key-1');

    expect(conflict).toEqual({
      status: 409,
      body: { error: 'Idempotency-Key already used with different payload' },
    });
    expect(database.prepare('SELECT COUNT(*) AS count FROM issues').get()).toEqual({ count: 1 });
  });

  it('preserves creation behavior for clients without an idempotency key', () => {
    const created = postIssue(input);

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject(input);
    expect(database.prepare('SELECT COUNT(*) AS count FROM issues').get()).toEqual({ count: 1 });
  });

  it('rolls back issue creation when the idempotency record cannot be saved', () => {
    database.exec(`
      CREATE TRIGGER fail_idempotency_insert
      BEFORE INSERT ON issue_creation_idempotency
      BEGIN
        SELECT RAISE(ABORT, 'forced failure');
      END;
    `);

    expect(() => postIssue(input, 'key-1')).toThrow('forced failure');
    expect(database.prepare('SELECT COUNT(*) AS count FROM issues').get()).toEqual({ count: 0 });
    database.exec('DROP TRIGGER fail_idempotency_insert');
  });
});

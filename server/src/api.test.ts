import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import type { DatabaseSync } from 'node:sqlite';
import type { Server } from 'node:http';
import { createDatabase } from './db.js';
import { createApp } from './index.js';

type Issue = {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee: string;
  created_at: string;
  updated_at: string;
};

async function withApi(
  run: (context: { db: DatabaseSync; baseUrl: string }) => Promise<void>
) {
  const db = createDatabase(':memory:');
  const server: Server = createApp(db).listen(0);
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;

  try {
    await run({ db, baseUrl: `http://127.0.0.1:${port}` });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    db.close();
  }
}

for (const status of ['open', 'in_progress', 'closed']) {
  test(`PATCH accepts and persists status ${status}`, async () => {
    await withApi(async ({ db, baseUrl }) => {
      const response = await fetch(`${baseUrl}/api/issues/1`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      assert.equal(response.status, 200);
      assert.equal((await response.json() as Issue).status, status);
      assert.equal(
        (db.prepare('SELECT status FROM issues WHERE id = 1').get() as { status: string }).status,
        status
      );
    });
  });
}

for (const status of ['pending', null, 42]) {
  test(`PATCH rejects invalid explicit status ${JSON.stringify(status)}`, async () => {
    await withApi(async ({ db, baseUrl }) => {
      const before = db.prepare('SELECT * FROM issues WHERE id = 1').get();
      const response = await fetch(`${baseUrl}/api/issues/1`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status, title: 'must not persist' }),
      });

      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), {
        error: 'Invalid status. Allowed values: open, in_progress, closed',
        field: 'status',
        allowed: ['open', 'in_progress', 'closed'],
      });
      assert.deepEqual(db.prepare('SELECT * FROM issues WHERE id = 1').get(), before);
    });
  });
}

test('PATCH without status updates other fields and retains status', async () => {
  await withApi(async ({ db, baseUrl }) => {
    const before = db.prepare('SELECT * FROM issues WHERE id = 2').get() as Issue;
    const response = await fetch(`${baseUrl}/api/issues/2`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Updated title' }),
    });
    const body = await response.json() as Issue;

    assert.equal(response.status, 200);
    assert.equal(body.title, 'Updated title');
    assert.equal(body.status, before.status);
    const persisted = db.prepare('SELECT * FROM issues WHERE id = 2').get() as Issue;
    assert.equal(persisted.title, 'Updated title');
    assert.equal(persisted.status, before.status);
  });
});

test('PATCH preserves not-found lookup ordering for invalid status', async () => {
  await withApi(async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/api/issues/99999`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'pending' }),
    });

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'not found' });
  });
});

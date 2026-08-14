import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { initializeDatabase } from './db.js';
import { createApp } from './index.js';

type IssueSeed = {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  created_at: string;
  updated_at?: string;
};

const seedIssues = (database: DatabaseSync, issues: IssueSeed[]) => {
  const insert = database.prepare(`
    INSERT INTO issues (title, description, status, priority, assignee, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const issue of issues) {
    insert.run(
      issue.title,
      issue.description ?? '',
      issue.status ?? 'open',
      issue.priority ?? 'medium',
      issue.assignee ?? 'Priya',
      issue.created_at,
      issue.updated_at ?? issue.created_at
    );
  }
};

const closeServer = (server: Server) =>
  new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

const createTestApi = async (issues: IssueSeed[]) => {
  const database = new DatabaseSync(':memory:');
  initializeDatabase(database);
  database.exec('DELETE FROM issues');
  database.exec("DELETE FROM sqlite_sequence WHERE name = 'issues'");
  seedIssues(database, issues);

  const server = createApp(database).listen(0, '127.0.0.1');
  await once(server, 'listening');

  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    baseUrl,
    async close() {
      await closeServer(server);
      database.close();
    },
  };
};

test('GET /api/issues returns newest issues first', async () => {
  const api = await createTestApi([
    { title: 'oldest', created_at: '2026-08-10T08:00:00.000Z' },
    { title: 'newest', created_at: '2026-08-12T08:00:00.000Z' },
    { title: 'middle', created_at: '2026-08-11T08:00:00.000Z' },
  ]);

  try {
    const response = await fetch(`${api.baseUrl}/api/issues`);
    assert.equal(response.status, 200);

    const issues = (await response.json()) as Array<{ title: string }>;
    assert.deepEqual(
      issues.map((issue) => issue.title),
      ['newest', 'middle', 'oldest']
    );
  } finally {
    await api.close();
  }
});

test('GET /api/issues orders identical timestamps by id descending', async () => {
  const api = await createTestApi([
    { title: 'first inserted', created_at: '2026-08-12T08:00:00.000Z' },
    { title: 'second inserted', created_at: '2026-08-12T08:00:00.000Z' },
    { title: 'third inserted', created_at: '2026-08-12T08:00:00.000Z' },
  ]);

  try {
    const response = await fetch(`${api.baseUrl}/api/issues`);
    assert.equal(response.status, 200);

    const issues = (await response.json()) as Array<{ id: number }>;
    assert.deepEqual(
      issues.map((issue) => issue.id),
      [3, 2, 1]
    );
  } finally {
    await api.close();
  }
});

test('GET /api/issues search results stay newest first', async () => {
  const api = await createTestApi([
    { title: 'Reset password email typo', created_at: '2026-08-10T08:00:00.000Z' },
    { title: 'Billing page crash', created_at: '2026-08-11T08:00:00.000Z' },
    { title: 'Reset password flow broken', created_at: '2026-08-12T08:00:00.000Z' },
  ]);

  try {
    const response = await fetch(`${api.baseUrl}/api/issues?search=Reset`);
    assert.equal(response.status, 200);

    const issues = (await response.json()) as Array<{ title: string }>;
    assert.deepEqual(
      issues.map((issue) => issue.title),
      ['Reset password flow broken', 'Reset password email typo']
    );
  } finally {
    await api.close();
  }
});

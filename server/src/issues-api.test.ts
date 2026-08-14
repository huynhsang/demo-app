import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test, { after, before } from 'node:test';

const runtimeDirectory = path.join(process.cwd(), `.issues-api-test-${process.pid}`);
const runtimeSourceDirectory = path.join(runtimeDirectory, 'src');
let server: ChildProcess;
let baseUrl: string;

const waitForServer = async () => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/issues`);
      if (response.ok) return;
    } catch {
      // Wait for the test server to start.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Test server did not start');
};

before(async () => {
  await mkdir(runtimeSourceDirectory, { recursive: true });
  await copyFile(path.join(process.cwd(), 'src/db.ts'), path.join(runtimeSourceDirectory, 'db.ts'));

  const port = await new Promise<number>((resolve, reject) => {
    const listener = createServer();
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', () => {
      const address = listener.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Could not allocate a test port'));
        return;
      }
      listener.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
  baseUrl = `http://127.0.0.1:${port}`;

  const indexSource = await readFile(path.join(process.cwd(), 'src/index.ts'), 'utf8');
  await writeFile(
    path.join(runtimeSourceDirectory, 'index.ts'),
    indexSource.replace('const PORT = 4000;', `const PORT = ${port};`)
  );

  const database = new DatabaseSync(path.join(runtimeDirectory, 'data.sqlite'));
  database.exec(`
    CREATE TABLE issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      assignee TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    INSERT INTO issues (title, description, status, priority, assignee, created_at, updated_at)
    VALUES
      ('oldest reset', '', 'open', 'medium', 'Priya', '2026-08-10T08:00:00.000Z', '2026-08-10T08:00:00.000Z'),
      ('middle billing', '', 'closed', 'medium', 'Alex', '2026-08-11T08:00:00.000Z', '2026-08-11T08:00:00.000Z'),
      ('first newest reset', '', 'open', 'medium', 'Priya', '2026-08-12T08:00:00.000Z', '2026-08-12T08:00:00.000Z'),
      ('second newest reset', '', 'open', 'medium', 'Priya', '2026-08-12T08:00:00.000Z', '2026-08-12T08:00:00.000Z');
  `);
  database.close();

  server = spawn(process.execPath, ['--import', 'tsx', path.join(runtimeSourceDirectory, 'index.ts')], {
    cwd: process.cwd(),
    stdio: 'pipe',
  });
  await waitForServer();
});

after(async () => {
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await new Promise<void>((resolve) => server.once('exit', () => resolve()));
  }
  await rm(runtimeDirectory, { recursive: true, force: true });
});

test('GET /api/issues returns newest issues first with id as the tie-breaker', async () => {
  const response = await fetch(`${baseUrl}/api/issues`);
  assert.equal(response.status, 200);

  const issues = (await response.json()) as Array<{ id: number }>;
  assert.deepEqual(
    issues.map((issue) => issue.id),
    [4, 3, 2, 1]
  );
});

test('GET /api/issues search results stay newest first', async () => {
  const response = await fetch(`${baseUrl}/api/issues?search=reset`);
  assert.equal(response.status, 200);

  const issues = (await response.json()) as Array<{ id: number }>;
  assert.deepEqual(
    issues.map((issue) => issue.id),
    [4, 3, 1]
  );
});

test('production list query uses only the required ordering change', async () => {
  const source = await readFile(path.join(process.cwd(), 'src/index.ts'), 'utf8');
  assert.match(source, /query \+= ' ORDER BY created_at DESC, id DESC';/);
});

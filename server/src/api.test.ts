import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import test from 'node:test';

async function availablePort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  server.close();
  await once(server, 'close');
  return port;
}

test('PATCH validates status before writing and preserves valid or omitted status', async () => {
  const fixtureDirectory = path.join(process.cwd(), '.test-data', 'api');
  const sourceDirectory = path.join(fixtureDirectory, 'src');
  const port = await availablePort();

  fs.rmSync(fixtureDirectory, { force: true, recursive: true });
  fs.mkdirSync(sourceDirectory, { recursive: true });
  fs.copyFileSync(path.join(process.cwd(), 'src', 'db.ts'), path.join(sourceDirectory, 'db.ts'));
  const indexSource = fs
    .readFileSync(path.join(process.cwd(), 'src', 'index.ts'), 'utf8')
    .replace('const PORT = 4000;', `const PORT = ${port};`);
  fs.writeFileSync(path.join(sourceDirectory, 'index.ts'), indexSource);

  const server = spawn('tsx', [path.join(sourceDirectory, 'index.ts')], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const serverExited = once(server, 'exit');

  try {
    await Promise.race([
      once(server.stdout, 'data'),
      serverExited.then(([code]) => {
        throw new Error(`test server exited with code ${code}`);
      }),
    ]);

    const baseUrl = `http://127.0.0.1:${port}`;

    for (const status of ['open', 'in_progress', 'closed']) {
      const response = await fetch(`${baseUrl}/api/issues/1`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      assert.equal(response.status, 200);
      assert.equal((await response.json() as { status: string }).status, status);
    }

    const before = await fetch(`${baseUrl}/api/issues/1`).then((response) => response.json()) as {
      status: string;
    };
    for (const status of ['pending', null, 42]) {
      const invalidResponse = await fetch(`${baseUrl}/api/issues/1`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status, title: 'must not persist' }),
      });
      assert.equal(invalidResponse.status, 400);
      assert.deepEqual(await invalidResponse.json(), {
        error: 'Invalid status. Allowed values: open, in_progress, closed',
        field: 'status',
        allowed: ['open', 'in_progress', 'closed'],
      });
      assert.deepEqual(
        await fetch(`${baseUrl}/api/issues/1`).then((response) => response.json()),
        before
      );
    }

    const omittedResponse = await fetch(`${baseUrl}/api/issues/1`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Updated title' }),
    });
    assert.equal(omittedResponse.status, 200);
    const omittedBody = await omittedResponse.json() as { title: string; status: string };
    assert.equal(omittedBody.title, 'Updated title');
    assert.equal(omittedBody.status, before.status);
    assert.deepEqual(
      await fetch(`${baseUrl}/api/issues/1`).then((response) => response.json()),
      omittedBody
    );

    const missingResponse = await fetch(`${baseUrl}/api/issues/99999`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'pending' }),
    });
    assert.equal(missingResponse.status, 404);
    assert.deepEqual(await missingResponse.json(), { error: 'not found' });
  } finally {
    server.kill('SIGTERM');
    await serverExited;
    fs.rmSync(fixtureDirectory, { force: true, recursive: true });
  }
});

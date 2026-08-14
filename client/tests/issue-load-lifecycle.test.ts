import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchIssue } from '../src/api.ts';
import { startIssueLoad } from '../src/pages/issueLoadLifecycle.ts';
import type { Issue } from '../src/types.ts';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function issue(id: number, title: string, assignee = 'Taylor'): Issue {
  return {
    id,
    title,
    description: '',
    status: 'open',
    priority: 'medium',
    assignee,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  };
}

async function settlePromises() {
  await Promise.resolve();
  await Promise.resolve();
}

test('obsolete success cannot replace the active route and is aborted', async () => {
  const requests = new Map<string, ReturnType<typeof deferred<Issue>>>();
  const signals = new Map<string, AbortSignal>();
  let visibleIssue: Issue | null = issue(0, 'old');
  let assigneeDraft = 'old';
  let notFound = true;

  const load = (id: string) =>
    startIssueLoad({
      id,
      fetchIssue: (requestedId, signal) => {
        signals.set(String(requestedId), signal);
        const request = deferred<Issue>();
        requests.set(String(requestedId), request);
        return request.promise;
      },
      onReset: () => {
        visibleIssue = null;
        notFound = false;
      },
      onIssue: (data) => {
        visibleIssue = data;
      },
      onAssigneeDraft: (assignee) => {
        assigneeDraft = assignee;
      },
      onNotFound: () => {
        notFound = true;
      },
    });

  const stopA = load('1');
  stopA();
  const stopB = load('2');

  assert.equal(signals.get('1')?.aborted, true);
  assert.equal(visibleIssue, null);
  assert.equal(notFound, false);

  requests.get('2')?.resolve(issue(2, 'active', 'Blair'));
  await settlePromises();
  assert.equal(visibleIssue?.title, 'active');
  assert.equal(assigneeDraft, 'Blair');

  requests.get('1')?.resolve(issue(1, 'obsolete', 'Alex'));
  await settlePromises();
  assert.equal(visibleIssue?.title, 'active');
  assert.equal(assigneeDraft, 'Blair');
  assert.equal(notFound, false);

  stopB();
});

test('obsolete rejection cannot set not-found for the active route', async () => {
  const requestA = deferred<Issue>();
  const requestB = deferred<Issue>();
  let notFound = false;
  let visibleIssue: Issue | null = null;

  const options = (id: string, request: ReturnType<typeof deferred<Issue>>) => ({
    id,
    fetchIssue: () => request.promise,
    onReset: () => {
      visibleIssue = null;
      notFound = false;
    },
    onIssue: (data: Issue) => {
      visibleIssue = data;
    },
    onAssigneeDraft: () => {},
    onNotFound: () => {
      notFound = true;
    },
  });

  const stopA = startIssueLoad(options('1', requestA));
  stopA();
  const stopB = startIssueLoad(options('2', requestB));

  requestA.reject(new Error('obsolete 404'));
  await settlePromises();
  assert.equal(notFound, false);
  assert.equal(visibleIssue, null);

  requestB.resolve(issue(2, 'active'));
  await settlePromises();
  assert.equal(visibleIssue?.title, 'active');
  assert.equal(notFound, false);

  stopB();
});

test('active success and failure preserve loading and not-found behavior', async () => {
  const successfulRequest = deferred<Issue>();
  let visibleIssue: Issue | null = issue(0, 'old');
  let assigneeDraft = 'old';
  let notFound = true;

  const callbacks = {
    onReset: () => {
      visibleIssue = null;
      notFound = false;
    },
    onIssue: (data: Issue) => {
      visibleIssue = data;
    },
    onAssigneeDraft: (assignee: string) => {
      assigneeDraft = assignee;
    },
    onNotFound: () => {
      notFound = true;
    },
  };

  const stopSuccess = startIssueLoad({
    id: '2',
    fetchIssue: () => successfulRequest.promise,
    ...callbacks,
  });
  assert.equal(visibleIssue, null);
  assert.equal(notFound, false);

  successfulRequest.resolve(issue(2, 'loaded', 'Morgan'));
  await settlePromises();
  assert.equal(visibleIssue?.title, 'loaded');
  assert.equal(assigneeDraft, 'Morgan');
  stopSuccess();

  const failedRequest = deferred<Issue>();
  const stopFailure = startIssueLoad({
    id: '404',
    fetchIssue: () => failedRequest.promise,
    ...callbacks,
  });
  assert.equal(visibleIssue, null);
  assert.equal(notFound, false);

  failedRequest.reject(new Error('404'));
  await settlePromises();
  assert.equal(visibleIssue, null);
  assert.equal(notFound, true);
  stopFailure();
});

test('fetchIssue passes the supplied AbortSignal to fetch', async () => {
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();
  let receivedSignal: AbortSignal | null | undefined;

  globalThis.fetch = async (_input, init) => {
    receivedSignal = init?.signal;
    return new Response(JSON.stringify(issue(1, 'loaded')), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    await fetchIssue('1', controller.signal);
    assert.equal(receivedSignal, controller.signal);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

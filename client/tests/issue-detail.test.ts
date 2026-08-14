import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { fetchIssue } from '../src/api.ts';
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

function loadIssueDetail(fetchIssueMock: (id: string | number, signal?: AbortSignal) => Promise<Issue>) {
  let currentId = '1';
  let effect: (() => void | (() => void)) | undefined;
  let hookIndex = 0;
  const state: unknown[] = [];

  const react = {
    useState(initialValue: unknown) {
      const index = hookIndex++;
      if (state.length <= index) state[index] = initialValue;
      return [state[index], (value: unknown) => {
        state[index] = value;
      }];
    },
    useEffect(callback: () => void | (() => void)) {
      effect = callback;
    },
  };
  const jsxRuntime = {
    jsx: (type: unknown, props: unknown) => ({ type, props }),
    jsxs: (type: unknown, props: unknown) => ({ type, props }),
  };
  const sourcePath = path.resolve('client/src/pages/IssueDetail.tsx');
  const source = readFileSync(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: sourcePath,
  }).outputText;
  const module = { exports: {} as { default?: () => unknown } };
  const requireMock = (specifier: string) => {
    if (specifier === 'react') return react;
    if (specifier === 'react/jsx-runtime') return jsxRuntime;
    if (specifier === 'react-router-dom') {
      return {
        Link: (props: unknown) => props,
        useParams: () => ({ id: currentId }),
      };
    }
    if (specifier === '../api') return { fetchIssue: fetchIssueMock, updateIssue: async () => undefined };
    if (specifier === '../utils') {
      return {
        avatarColor: () => '',
        initials: () => '',
        formatDateTime: () => '',
        statusLabel: (value: string) => value,
      };
    }
    throw new Error(`Unexpected import: ${specifier}`);
  };

  vm.runInNewContext(`(function (exports, require, module) { ${output}\n})`, {
    AbortController,
    console,
  })(module.exports, requireMock, module);
  const IssueDetail = module.exports.default;
  assert.ok(IssueDetail);

  return {
    render(id: string) {
      currentId = id;
      hookIndex = 0;
      effect = undefined;
      IssueDetail();
      assert.ok(effect);
      return effect();
    },
    state,
  };
}

test('IssueDetail ignores an obsolete success and aborts its request', async () => {
  const requests = new Map<string, ReturnType<typeof deferred<Issue>>>();
  const signals = new Map<string, AbortSignal>();
  const component = loadIssueDetail((id, signal) => {
    const request = deferred<Issue>();
    requests.set(String(id), request);
    assert.ok(signal);
    signals.set(String(id), signal);
    return request.promise;
  });

  const cleanupFirst = component.render('1');
  assert.equal(typeof cleanupFirst, 'function');
  cleanupFirst();
  const cleanupSecond = component.render('2');

  assert.equal(signals.get('1')?.aborted, true);
  assert.equal(component.state[0], null);
  assert.equal(component.state[1], false);

  requests.get('2')?.resolve(issue(2, 'active', 'Blair'));
  await settlePromises();
  assert.equal((component.state[0] as Issue).title, 'active');
  assert.equal(component.state[2], 'Blair');

  requests.get('1')?.resolve(issue(1, 'obsolete', 'Alex'));
  await settlePromises();
  assert.equal((component.state[0] as Issue).title, 'active');
  assert.equal(component.state[2], 'Blair');
  assert.equal(component.state[1], false);

  cleanupSecond?.();
});

test('IssueDetail ignores obsolete errors while preserving active not-found behavior', async () => {
  const requests = new Map<string, ReturnType<typeof deferred<Issue>>>();
  const component = loadIssueDetail((id) => {
    const request = deferred<Issue>();
    requests.set(String(id), request);
    return request.promise;
  });

  const cleanupFirst = component.render('1');
  cleanupFirst?.();
  const cleanupSecond = component.render('2');

  requests.get('1')?.reject(new Error('obsolete 404'));
  await settlePromises();
  assert.equal(component.state[0], null);
  assert.equal(component.state[1], false);

  requests.get('2')?.reject(new Error('active 404'));
  await settlePromises();
  assert.equal(component.state[0], null);
  assert.equal(component.state[1], true);

  cleanupSecond?.();
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

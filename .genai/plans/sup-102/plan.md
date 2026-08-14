# SUP-102 Technical Plan

## Scope and current behavior

`NewIssue.tsx` currently awaits `createIssue` without a pending guard or error handling. `client/src/api.ts` posts JSON without an idempotency header. `server/src/index.ts` inserts every valid request directly into `issues`, while `server/src/db.ts` initializes only the `issues` table and seed data. The repository has build scripts but no test runner.

## Technical approach

### 1. Make database setup reusable and add a non-destructive migration

In `server/src/db.ts`:

- Extract the schema initialization into a typed helper that accepts a `DatabaseSync`. Keep the exported production `db` initialized at the current `data.sqlite` path.
- Keep seed behavior for the production database, but allow API tests to initialize an unseeded `:memory:` database.
- Add an idempotency table using `CREATE TABLE IF NOT EXISTS`:

```sql
CREATE TABLE IF NOT EXISTS issue_creation_idempotency (
  idempotency_key TEXT PRIMARY KEY,
  request_payload TEXT NOT NULL,
  issue_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (issue_id) REFERENCES issues(id)
);
```

This is an additive migration: existing issue rows and the current seed path are unchanged. The primary key supplies the uniqueness constraint needed to serialize ownership of a key. No cleanup/expiry migration is included because it is outside SUP-102.

### 2. Implement atomic API idempotency

In `server/src/index.ts`:

- Make the Express app constructible with an injected `DatabaseSync`, while preserving the normal production listener. This enables deterministic tests with an in-memory database without changing endpoint structure.
- Read `Idempotency-Key` as a single trimmed string. Reject missing, blank, or ambiguous multi-value headers with HTTP 400.
- Validate `title` and `assignee` exactly as today.
- Build a deterministic representation of the effective inserted payload in fixed property order:
  - `title`
  - `description ?? ''`
  - `priority ?? 'medium'`
  - `assignee`

  Store this canonical JSON string as `request_payload`. This compares the values that would actually be persisted and avoids introducing broad validation or hashing complexity.
- Use a synchronous SQLite transaction (`BEGIN IMMEDIATE`, `COMMIT`, and `ROLLBACK` in `catch`) around replay detection and first creation:
  1. Look up the key.
  2. If found with a different canonical payload, commit/close the read transaction and return 409 with a stable conflict error.
  3. If found with the same payload, load its issue, commit, and return that issue with 200.
  4. If absent, insert the issue, insert the key-to-issue record, load the issue, commit, and return it with 201.
- Do not catch and translate unrelated database failures into validation responses. Roll back and pass unexpected errors to Express.

`BEGIN IMMEDIATE` plus the key primary key prevents two concurrent first uses from both inserting. A later request observes the committed key and follows replay/conflict semantics.

### 3. Send and retain client idempotency keys

In `client/src/api.ts`:

- Define/reuse a typed create-input shape.
- Change `createIssue` to accept an idempotency key and include it in the request headers alongside `Content-Type`.
- Preserve current response parsing and error semantics.

In `client/src/pages/NewIssue.tsx`:

- Add a mutable ref used as the synchronous in-flight lock. Check it at the beginning of `onSubmit` and set it before any asynchronous work.
- Keep React state for rendering the pending state; set it at the same time as the lock.
- Build the submitted payload once. Keep the last attempted payload serialization and key in a ref:
  - Reuse the key after a failure when the payload is unchanged.
  - Generate a new `crypto.randomUUID()` key when no attempt exists or the payload changed.
- Clear the previous visible error when a new accepted attempt starts.
- On success, navigate exactly as today.
- On failure, show a concise form-level error.
- In `finally`, release the synchronous lock and pending state. Navigation after success makes the component disappear, but cleanup remains safe and keeps the control flow consistent.
- Disable the submit button and change its label while pending. Add only minimal styling/ARIA needed for existing visual conventions and accessible error/pending feedback.

The synchronous ref handles same-tick duplicate events; the disabled state handles subsequent user interaction and visibly communicates progress.

## Idempotency semantics

| Request | Result |
| --- | --- |
| First use of key + valid payload | Insert issue and key record atomically; 201 |
| Same key + byte-equivalent canonical effective payload | Return stored issue; no insert; 200 |
| Same key + different canonical effective payload | No insert/update; 409 |
| Missing/blank/ambiguous key | No insert; 400 |
| Validation failure | Existing 400 behavior; no idempotency record |
| Unexpected transaction failure | Roll back issue and key record; surface server failure |

The client retaining a key for an unchanged retry covers an ambiguous failure where the server committed the first request but the client did not receive the response. Editing any field creates a new logical request and therefore a new key.

## Test strategy

### Frontend

Add Vitest, jsdom, React Testing Library, and user-event using client-local test configuration/setup.

- `NewIssue` rapid submission test:
  - Mock `createIssue` with a deferred promise.
  - Submit the valid form twice synchronously before rerender.
  - Assert one API call, a disabled submit button, and pending text.
- `NewIssue` failed retry test:
  - Reject the first call.
  - Assert an accessible error and an enabled submit button.
  - Retry unchanged input and assert a second call is allowed and reuses the same key.
  - Optionally change a field and verify the next accepted attempt uses a different key.
- `api.ts` request test:
  - Mock `fetch`.
  - Assert `POST /api/issues`, JSON body, and the supplied `Idempotency-Key` header.

### Server

Add Vitest and Supertest (plus types) and construct the app with a fresh `DatabaseSync(':memory:')` initialized without seed data.

- First creation returns 201 and inserts one issue/idempotency row.
- Identical replay returns 200, the same issue ID/body, and still one issue row.
- Same key with a different payload returns 409 and does not add or alter rows.
- Missing/blank key returns 400 and inserts nothing.
- Keep a normal creation/validation assertion to guard existing behavior around required fields/defaults where useful.

## Risks and mitigations

- **React state is not synchronous:** use a ref as the authoritative lock; state is presentation only.
- **Lost-response retry creates a conflict after edits:** compare payload snapshots and reuse a key only for an unchanged retry.
- **Partial database writes:** place issue and idempotency inserts in one explicit transaction with rollback.
- **Concurrent requests for a new key:** acquire a SQLite write transaction before lookup; retain a primary-key uniqueness constraint.
- **Existing database compatibility:** use additive `CREATE TABLE IF NOT EXISTS`; do not rewrite `issues`.
- **Testability may accidentally start the server:** separate app construction from listener startup while keeping the production entry point behavior.
- **New test dependencies affect the lockfile:** install/update them only inside the feature worktree and review that only the worktree lockfile changes.
- **Canonicalization drift:** centralize normalization before both comparison and insertion so defaults cannot differ.

## Dependencies

- Runtime dependencies remain unchanged.
- Development-only testing dependencies are expected because the repository currently has no test framework:
  - Client: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`.
  - Server: `vitest`, `supertest`, `@types/supertest`.
- Use versions compatible with the repository’s Node 22 and Vite 5/TypeScript setup.

## Verification

Run from the feature worktree:

1. Focused client tests for `NewIssue` and `api.ts`.
2. Focused server idempotency tests.
3. `npm run build -w client`.
4. `npm run build -w server`.
5. The complete client and server test scripts after focused tests pass.
6. `git status --short` and `git diff --check`.
7. Confirm changes are confined to SUP-102 files, test/config support, worktree dependency metadata, and `.genai` artifacts; confirm the root checkout and its `package-lock.json` were untouched.

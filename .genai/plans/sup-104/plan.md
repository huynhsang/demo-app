# Technical plan: Reject invalid issue status values

## Existing behavior

- `client/src/types.ts` already defines `Status` as `'open' | 'in_progress' | 'closed'`.
- `server/src/index.ts` destructures `status`, falls back with `status ?? existing.status`, and unconditionally executes the update. Runtime callers can bypass the client type and persist arbitrary values.
- `server/src/db.ts` creates `issues.status` as unconstrained `TEXT NOT NULL DEFAULT 'open'`.
- Database initialization uses `CREATE TABLE IF NOT EXISTS`, so changing the table definition affects new databases but does not rewrite an existing table.
- The repository currently has no test command or test files. The server already includes `tsx`, and Node provides `node:test`, `assert`, `fetch`, and `node:sqlite`, so no new dependency is needed.

## Technical approach

### 1. Establish focused test seams without changing production behavior

- In `server/src/db.ts`, extract the current open/create/schema/seed sequence into a small `createDatabase(path)` function and keep exporting the existing default `db` created from `server/data.sqlite`.
- In `server/src/index.ts`, expose an Express app factory accepting a database instance, while retaining the same default app and production port/listening behavior when the module is run as the entry point.
- Keep route paths, response shapes for successful requests, seed data, and UI-facing behavior unchanged.
- Add a server-only `test` script using `tsx --test`; do not add packages or regenerate the root lockfile.

### 2. Add API status validation

- Define the three allowed status strings server-side near the PATCH route (or as a narrowly scoped exported constant if tests require it).
- Detect whether the request body explicitly owns a `status` property rather than using truthiness/nullish fallback for validation.
- After preserving the existing not-found lookup behavior, reject an explicitly supplied value unless it is exactly one of the allowed strings.
- Return HTTP 400 with a stable payload such as:
  - `error`: concise human-readable message,
  - `field`: `"status"`,
  - `allowed`: the three accepted values.
- Return before constructing `next` or executing SQL. This guarantees title, description, assignee, priority, status, and `updated_at` remain unchanged.
- If `status` is omitted, continue using `existing.status`; valid supplied values flow through the existing update statement.

### 3. Add new-database persistence enforcement

- Change the `status` column in the existing `CREATE TABLE IF NOT EXISTS issues` statement to include:
  `CHECK (status IN ('open', 'in_progress', 'closed'))`.
- Do not add `ALTER TABLE`, table-copy migration, startup cleanup, or validation scans.
- Existing databases remain compatible because SQLite does not apply a changed `CREATE TABLE IF NOT EXISTS` definition to a table that already exists.

### 4. Add focused regression tests

- API tests should create an isolated in-memory database through `createDatabase(':memory:')`, create an app with that database, listen on an ephemeral port, and use built-in `fetch`.
- Use table-driven subtests for all valid values: `open`, `in_progress`, and `closed`; assert HTTP success, response status, and persisted status.
- Test representative invalid inputs, including an unknown string and an explicit non-string/null value; assert HTTP 400 and the useful payload.
- Snapshot the complete database row before an invalid PATCH and compare it with the row afterward to prove all persistence, including `updated_at`, is unchanged.
- Test a PATCH that omits status but updates another supported field; assert that update succeeds and the prior status is retained.
- Database tests should:
  - inspect or exercise a newly created database and assert a direct invalid insert/update fails the `CHECK`,
  - create a small legacy database file with the previous unconstrained schema, reopen it through `createDatabase`, and assert startup succeeds and existing data remains intact.
- Close HTTP servers/databases and remove any repository-local test database fixture in test cleanup.

## Risks and mitigations

- **Importing `index.ts` starts port 4000:** guard startup to direct execution and test the exported app factory.
- **Shared production database contaminates tests:** inject isolated databases; never import/use the default database in test cases.
- **Validation accidentally treats omission as invalid:** check property presence explicitly and cover omission with a regression test.
- **Rejected request updates another field before failing:** validate before the single update statement and compare the full stored row.
- **Constraint breaks existing deployments:** use only the modified create-if-absent schema; test a legacy database reopen.
- **Schema and runtime lists drift:** keep both lists visibly aligned and cover all three values at both API/type-contract boundaries without introducing a larger shared-schema refactor.
- **Lockfile churn:** use only existing `tsx` and Node built-ins; verify `package-lock.json` is untouched.

## Dependencies

- Node.js 22.5+ for `node:sqlite`.
- Existing Express and `tsx` packages.
- No external services, new runtime packages, migration framework, or client changes are required.

## Verification

1. Run the focused server tests through the new server test script.
2. Run `npm run build -w server`.
3. Run `npm run build -w client` to confirm the existing `Status` contract and UI still compile.
4. Inspect `git diff -- package-lock.json` and confirm there are no root lockfile changes.
5. Review the final diff to ensure only SUP-104 validation, schema/test seams, tests, and directly related scripts changed.


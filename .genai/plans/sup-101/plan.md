# SUP-101 Plan

## Technical Approach

1. Keep the existing `GET /api/issues` query-builder flow in `server/src/index.ts`.
2. Replace the final sort clause with `ORDER BY created_at DESC, id DESC` so every route variant inherits the same newest-first behavior without changing the current filter predicates.
3. Add the smallest test seam needed for focused API coverage:
   - expose the Express app (or a tiny app factory) from `server/src/index.ts` without changing production behavior
   - make `server/src/db.ts` usable from tests with a deterministic reset/setup path if the current singleton database would otherwise leak state across test cases
4. Add focused API tests using existing platform capabilities (`node:test` + TypeScript via `tsx`) so no new dependencies are required.

## Expected Code Touch Points

- `server/src/index.ts`
  - preserve existing route structure
  - change only the ordering clause plus any minimal export needed for tests
- `server/src/db.ts`
  - only if needed to support isolated/resettable test data
- new focused server API test file(s)

## Risks

- The current SQLite file is persistent and seeded on startup, so tests can become order-dependent unless they run against controlled data.
- `created_at` is stored as ISO text; ordering remains correct only if inserted test fixtures also use ISO timestamps.
- The client does not currently surface an assignee filter in the list UI, so at least one ordering test should exercise filter/search behavior directly at the API level.

## Dependencies

- Existing Node 22 runtime features (`node:sqlite`, built-in `fetch`, `node:test`)
- Existing `tsx` dev dependency for executing TypeScript test files
- Current API/filter behavior in `server/src/index.ts`
- Current seed/bootstrap behavior in `server/src/db.ts`

## Verification

1. Run focused server API tests covering:
   - unfiltered newest-first ordering
   - identical timestamps ordered by `id DESC`
   - one filtered or searched response ordered newest first
2. Run a targeted server type/build check if exports or test seams change (`npm run build -w server`).
3. Confirm the diff stays surgical and `package-lock.json` remains untouched.

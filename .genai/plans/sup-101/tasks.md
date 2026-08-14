# SUP-101 Tasks

1. [x] Add the smallest possible test seam in `server/src/index.ts`/`server/src/db.ts` so API ordering can be verified against deterministic data without changing production behavior.
2. [x] Update the `GET /api/issues` query in `server/src/index.ts` from oldest-first sorting to `ORDER BY created_at DESC, id DESC`, leaving status, assignee, and search predicates unchanged.
3. [x] Add a focused API test proving the unfiltered list returns newest issues first.
4. [x] Add a focused API test proving rows with identical `created_at` values are ordered by `id DESC`.
5. [x] Add a focused API test for at least one filtered or searched path (status, assignee, or search) to confirm it keeps newest-first ordering.
6. [x] Run targeted verification for the server changes, then confirm the final diff is surgical and `package-lock.json` was not modified.

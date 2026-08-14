# SUP-101 Spec

## Problem

`GET /api/issues` currently finishes with `ORDER BY created_at ASC`, so the oldest issues appear first. Newly created issues receive the latest `created_at` timestamp but still land at the bottom of the list, which is backwards for support triage.

## Requirements

1. Change `GET /api/issues` to return newest issues first using `ORDER BY created_at DESC, id DESC`.
2. Apply the same ordering to:
   - the unfiltered list
   - `status`-filtered results
   - `assignee`-filtered results
   - `search` results
3. Keep existing filtering and search behavior unchanged, including:
   - `status=all` continuing to skip the status predicate
   - `assignee` continuing to filter exact matches
   - `search` continuing to filter on `title LIKE '%...%'`
4. Preserve the current route/query-builder structure with a surgical query change rather than a broad rewrite.
5. Add focused API regression coverage for:
   - newest-first ordering
   - deterministic ordering when `created_at` values are identical
   - at least one filtered or searched path that still returns newest first

## Acceptance Criteria

- `GET /api/issues` always sorts by `created_at DESC, id DESC`.
- The ordering is consistent for unfiltered, status-filtered, assignee-filtered, and searched responses.
- Existing filter/search semantics do not change apart from result order.
- API tests fail before the fix and pass after it for the targeted ordering cases.
- The implementation stays centered on `server/src/index.ts` with only minimal supporting changes elsewhere if testability requires them.

## Constraints

- Primary interfaces: `server/src/index.ts` and `server/src/db.ts`
- Keep the change surgical; do not perform broad SQL or route refactors.
- Do not modify `package-lock.json`.

## Non-goals

- SUP-102, SUP-103, SUP-104, SUP-105, SUP-106, SUP-108
- Pagination
- Client-side sort controls
- Broad SQL refactors
- Security hardening

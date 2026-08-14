# SUP-106 Review Fixes Specification

## Problem

The bulk-close feature in `origin/pr/bulk-close-issues` adds the intended API and issue-list selection UI, but its reviewed implementation has blocking correctness and security defects:

- request IDs are interpolated into SQL;
- malformed, unsafe, and duplicate IDs are not rejected;
- existence validation and updates are not atomic;
- a successful UI action leaves stale selections behind.

The fix branch must be based directly on `origin/pr/bulk-close-issues`, where the feature already exists, and corrected without expanding into unrelated cleanup.

## Requirements

### Server

1. Accept `POST /api/issues/bulk-close` with `{ "ids": number[] }`.
2. Reject a missing, non-array, or empty `ids` value with HTTP 400.
3. Reject any element that is not a JavaScript safe integer with HTTP 400. This includes strings, fractional values, `NaN`, infinities, and integers outside the safe range.
4. Reject duplicate IDs with HTTP 400.
5. Use generated `?` placeholders for every `IN` clause and bind IDs as parameters; request values must never be concatenated into SQL.
6. Perform existence validation, the batch update, and retrieval of updated rows inside one transaction.
7. If any requested ID does not exist, roll back and return HTTP 404 without updating any requested issue.
8. Roll back on any database error and preserve the existing success response shape: `{ "updated": Issue[] }`.
9. Keep one timestamp for the entire successful batch.

### Client

1. Preserve the feature's multi-select, select-all, bulk-close button, loading state, styling, and API contract.
2. After the bulk-close request succeeds, clear the selected-ID set and refresh the list using the active status and search filters.
3. Do not clear the selection when the bulk-close request fails.

### Coverage and verification

Cover valid batches plus empty, malformed, unsafe, duplicate, nonexistent, mixed-existing/nonexistent, and injection-shaped ID inputs. Verify that failed batches make no updates and successful UI completion clears selection and refreshes the active list.

## Acceptance Criteria

- Only non-empty arrays of unique safe-integer IDs reach database processing.
- SQL generated for the batch uses one placeholder per ID and binds all values.
- A batch containing any nonexistent ID returns 404 and changes no issue status or timestamp.
- A valid batch closes every requested issue atomically and returns the updated rows.
- Duplicate and malformed batches return 400 and make no changes.
- Injection-shaped values are rejected as invalid data and never become SQL text.
- After a successful client request, selected IDs are cleared and the currently filtered list is refreshed.
- After a failed client request, selected IDs remain available for retry.
- Existing server TypeScript compilation and client build/typecheck pass.

## Constraints

- Before implementation, fast-forward `feat/sup-106-review-fixes` to `origin/pr/bulk-close-issues` so the fixes are based directly on the review branch named in `TICKETS.md`.
- Preserve the original feature commit `77c96fd` as the branch base; do not reapply it.
- Deliver the work on the dedicated SUP-106 branch and in a PR separate from SUP-105 or any other change.
- Keep changes limited to the reviewed blockers and directly relevant edge coverage.
- The repository currently has build/typecheck scripts but no automated test runner.

## Non-goals

- Parameterizing or otherwise changing the pre-existing issue-list query interpolation in `GET /api/issues`.
- Broad SQL, routing, error-handling, UI-state, styling, or architecture refactors.
- Changing bulk-close product behavior beyond validation, atomicity, placeholders, selection clearing, and relevant coverage.
- Adding unrelated test infrastructure or dependencies.

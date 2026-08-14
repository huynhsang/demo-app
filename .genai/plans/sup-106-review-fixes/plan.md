# SUP-106 Review Fixes Plan

## Technical Approach

### 1. Align to the original review branch

`TICKETS.md` identifies `pr/bulk-close-issues` as the branch under review. Its feature tip is commit `77c96fd` (`feat: add bulk-close action for issues`).

Before implementation, fast-forward `feat/sup-106-review-fixes` to `origin/pr/bulk-close-issues`. Apply the blocker fixes directly on top of that review-branch tip. The original API client, issue-list selection UI, styles, and server endpoint therefore remain inherited from the reviewed branch; no feature commit reapplication is needed.

### 2. Validate the request before SQL

In the bulk-close route:

- require a non-empty array;
- require every entry to satisfy `Number.isSafeInteger`;
- compare `new Set(ids).size` with `ids.length` and reject duplicates;
- return HTTP 400 before opening a transaction for all shape, type, range, and duplicate failures.

Nonexistent safe integers remain an existence error and return HTTP 404.

### 3. Use bound SQL placeholders

After validation, construct only the placeholder list from the trusted array length:

```text
?, ?, ...
```

Use that placeholder string in the existence query, one set-based update, and the updated-row query. Pass IDs through statement bindings rather than SQL interpolation. Bind `status` and the shared `updated_at` value as parameters as well.

The pre-existing interpolated filters in `GET /api/issues` are explicitly outside this PR.

### 4. Make validation and update atomic

Use the synchronous `node:sqlite` database API already present:

1. `BEGIN`;
2. select existing IDs with bound placeholders;
3. compare the number of unique existing rows with the already-unique requested IDs;
4. if any are missing, throw or otherwise enter the rollback path and return 404;
5. update all requested rows in one bound `UPDATE ... WHERE id IN (...)`;
6. read the updated rows with the same bound ID list;
7. `COMMIT`;
8. on any failure after `BEGIN`, execute `ROLLBACK` and return the intended not-found response or propagate the database error to Express.

Keep the existence check and write within the same transaction so another operation cannot create a partial-validation window. Use one ISO timestamp for the batch. Prefer one set-based update over a loop.

### 5. Clear successful UI selection

In `IssueList.onBulkClose`:

1. await `bulkCloseIssues(Array.from(selected))`;
2. clear selection with a fresh `Set<number>` only after the API succeeds;
3. refresh with the current `status` and `search`;
4. retain the existing `finally` block for the closing state.

This preserves selections after request failures while removing stale selections after a successful close. The refresh must continue using active filters.

## Relevant Files

- `server/src/index.ts`: bulk-close validation, placeholders, transaction, update, and response.
- `client/src/pages/IssueList.tsx`: successful selection clearing and filtered refresh.
- `client/src/api.ts`: preserve the feature API contract; change only if required by corrected error behavior.
- `client/src/styles.css`: preserve original feature styling; no blocker-specific redesign.
- `server/src/db.ts`: reference for `DatabaseSync` usage; no planned schema change.

## Dependencies

- Review branch `origin/pr/bulk-close-issues`, as named in `TICKETS.md`.
- Original feature tip `77c96fd`, which becomes the direct base of `feat/sup-106-review-fixes`.
- Built-in `node:sqlite` `DatabaseSync` transaction and prepared-statement APIs.
- Existing npm workspace dependencies and TypeScript/Vite scripts.
- No existing automated test framework or test script.

## Risks and Mitigations

- **Wrong implementation base:** fast-forward the dedicated fix branch to `origin/pr/bulk-close-issues` before changing code and verify `77c96fd` is its base tip.
- **Placeholder/binding mismatch:** derive every `IN` placeholder list from the validated ID count and reuse the exact ID array.
- **Transaction left open:** centralize commit/rollback control and ensure every post-`BEGIN` failure rolls back.
- **Wrong error classification:** distinguish request validation (400), missing records (404), and unexpected database errors.
- **Partial updates:** validate existence and perform one set-based update within the same transaction.
- **Duplicate IDs masking missing IDs:** reject duplicates before comparing existence counts.
- **UI state cleared on failure:** place selection clearing strictly after the API promise resolves.
- **Refresh failure after server success:** clear selection immediately after API success, then attempt the active-filter refresh.
- **Scope creep:** do not alter the known interpolation in the existing list query.

## Testing, Build, and Typecheck Strategy

The repository has no automated test runner. Use the available scripts and focused runtime checks without adding unrelated infrastructure:

1. Run `npm run build -w server` for server TypeScript compilation.
2. Run `npm run build -w client` for client TypeScript checking and Vite production build.
3. Exercise the endpoint with:
   - a valid unique batch;
   - empty and non-array inputs;
   - strings, fractions, unsafe integers, and injection-shaped strings;
   - duplicate IDs;
   - all-nonexistent IDs;
   - a mixed existing/nonexistent batch.
4. For every rejected case, compare affected rows before and after to verify no status or timestamp changed.
5. For a valid case, verify every requested row is closed, shares the batch timestamp, and is returned.
6. In the UI, verify successful close clears checkboxes/button state and refreshes the active status/search view; verify a failed request retains selection.

Any local runtime data changed during verification must be restored before completion.

## Separate-PR Constraint

Implementation, verification, commits, and the eventual PR must remain on the SUP-106 review-fixes branch/worktree based directly on `origin/pr/bulk-close-issues`. Do not combine with SUP-105, reuse its commits, or include unrelated cleanup.

# SUP-105 Review Fixes Plan

## Technical Approach
1. Fast-forward the fix branch from `origin/main` to the reviewed `origin/pr/assigned-to-me-filter` branch before changing application code.
2. Refactor `IssueList` so a single `refresh` function accepts the complete next filter state: status, search, and assigned-to-me.
3. Build one `fetchIssues` parameter object in that function:
   - omit status when it is `all`;
   - omit search when empty;
   - set assignee to `CURRENT_USER` only when assigned-to-me is enabled.
4. Use the same refresh function for initial loading, status changes, search changes, and assigned-to-me toggles. Each handler must pass the next value for the state it changes and current values for the other filters.
5. Remove the separate fetch-all/client-side `loadMine` path. Toggling assigned-to-me off must call refresh with `false`, preserving the current status and search.
6. Keep the existing button styling and status persistence behavior from the feature/base implementation.

## Original Feature Incorporation Strategy
- Base the fix branch and separate PR directly on `origin/pr/assigned-to-me-filter`, as named in `TICKETS.md`.
- Fast-forward the current branch to the review branch before implementation; do not replay or cherry-pick selected commits.
- Apply only the reviewed fixes on top of the complete review branch.
- Before implementation, confirm the branch tip matches `origin/pr/assigned-to-me-filter`.

## Risks and Mitigations
- **Stale handler state:** pass explicit next values to refresh rather than relying on asynchronous state updates.
- **Controls/results mismatch:** every filter transition triggers the same server-backed refresh with the complete filter set.
- **Scope creep:** avoid changes to the API/server because `fetchIssues` and `/api/issues` already accept composable status, assignee, and search parameters.
- **Request ordering during rapid input:** existing behavior has no cancellation; do not broaden this review fix unless validation exposes a blocker directly caused by the change.
- **No automated test harness:** use the existing compiler/build plus focused manual scenarios rather than adding infrastructure.

## Dependencies
- `client/src/pages/IssueList.tsx`
- `client/src/api.ts` existing `status`, `assignee`, and `search` parameters
- `client/src/constants.ts` existing `CURRENT_USER`
- `server/src/index.ts` existing combined query-filter behavior
- Existing npm workspace dependencies and client build script

## Testing, Build, and Typecheck Strategy
- Run `npm run build -w client`; this executes `tsc -b` and the Vite production build.
- No repository test script or test framework is currently configured, so do not add one for this focused change.
- Manually verify:
  1. enable assigned-to-me with status `all` and empty search;
  2. enable it with a non-all status and active search;
  3. change status while it remains enabled;
  4. change/clear search while it remains enabled;
  5. disable it and confirm active status/search results are restored;
  6. confirm ordinary status/search behavior with it disabled.
- Inspect the final fix diff against `origin/pr/assigned-to-me-filter` and the full PR diff against `origin/main`.

## Separate-PR Constraint
All implementation, verification, commits, and the eventual PR must remain on `feat/sup-105-review-fixes`, based directly on `origin/pr/assigned-to-me-filter`, and must not include SUP-106 changes or unrelated fixes.

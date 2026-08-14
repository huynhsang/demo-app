# SUP-105 Review Fixes Specification

## Problem
The assigned-to-me feature in `origin/pr/assigned-to-me-filter` loads all issues and filters them in the browser through a separate `loadMine` path. That path ignores the active status and search filters. Subsequent status or search changes also use the existing refresh path without an assignee, and turning assigned-to-me off does not refresh the list. The controls can therefore disagree with the displayed results.

## Requirements
- Add the assigned-to-me control and `CURRENT_USER` behavior from the original feature.
- Route initial loading and every filter change through one issue refresh path.
- Compose the active status, search text, and assigned-to-me state into one `fetchIssues` request.
- When assigned-to-me is enabled, status and search changes must retain `assignee: CURRENT_USER`.
- When assigned-to-me is disabled, reload using the active status and search without an assignee.
- Keep the active control state consistent with the displayed result set.
- Preserve the existing stored status-filter behavior.

## Acceptance Criteria
- Enabling assigned-to-me with a status and/or search active requests the intersection of all enabled filters.
- Changing status while assigned-to-me is enabled continues to request `CURRENT_USER`.
- Changing search while assigned-to-me is enabled continues to request `CURRENT_USER`.
- Disabling assigned-to-me immediately reloads results for the current status and search without an assignee.
- With assigned-to-me disabled, existing status and search behavior remains unchanged.
- The client TypeScript check and production build pass.
- Manual verification covers enable, retained filtering, and disable/restore transitions.

## Constraints
- Work starts directly from `origin/pr/assigned-to-me-filter` in the dedicated `feat/sup-105-review-fixes` worktree/branch.
- The implementation and PR remain separate from SUP-106 and any other work.
- Scope is limited to the reviewed filter-composition blockers in `IssueList`.
- Use the existing `fetchIssues` API contract and server-side composable query parameters.
- Do not introduce a new test framework solely for this change.

## Non-goals
- Server query/security refactoring.
- Debouncing, cancellation, or broader request-race handling.
- Persisting the assigned-to-me or search state.
- UI redesign, unrelated cleanup, or changes to issue detail behavior.

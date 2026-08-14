# SUP-106 Review Fixes

## Status

Planning complete.

## Requirements
- Incorporate the bulk-close feature from `pr/bulk-close-issues`.
- Validate IDs as safe integers and use SQL placeholders.
- Validate and update the batch atomically in a transaction.
- Clear successful UI selections after bulk close.
- Cover malformed, duplicate, missing, injection-shaped IDs and atomic failure behavior where repository tooling supports it.

## Acceptance criteria
- Invalid, empty, duplicate, or nonexistent IDs cannot partially update records.
- Request data is never interpolated into SQL.
- A successful bulk close clears selected IDs and refreshes the active list.
- Existing build/typecheck passes and targeted behavior is covered where repository tooling supports it.

## Non-goals
- Do not parameterize the pre-existing list-query filters or perform unrelated cleanup.

## Constraints
- Separate worktree, branch, commits, and PR from SUP-105.
- Before implementation, fast-forward the fix branch to `origin/pr/bulk-close-issues`; preserve the original feature behavior except for reviewed defects.

## Planning Findings

- Required implementation base: `origin/pr/bulk-close-issues`, as named in `TICKETS.md`.
- Original feature tip: commit `77c96fd`; `feat/sup-106-review-fixes` must be fast-forwarded to this tip before code changes.
- Changed feature files: `client/src/api.ts`, `client/src/pages/IssueList.tsx`, `client/src/styles.css`, and `server/src/index.ts`.
- The blocking server issues are unvalidated/duplicate IDs, interpolated `IN` values, and non-atomic existence validation plus per-row updates.
- The blocking client issue is that successful bulk close refreshes without clearing `selected`.
- Existing verification consists of server TypeScript compilation and client typecheck/build; no automated test runner is configured.
- The pre-existing interpolated `GET /api/issues` filters are explicitly excluded.

## Planning Artifacts

- `.genai/plans/sup-106-review-fixes/spec.md`
- `.genai/plans/sup-106-review-fixes/plan.md`
- `.genai/plans/sup-106-review-fixes/tasks.md`

## Next Step

Fast-forward the dedicated SUP-106 branch to `origin/pr/bulk-close-issues`, then implement the ordered checklist and keep the resulting PR separate from SUP-105.

# SUP-105 Review Fixes

## Requirements
- Incorporate the assigned-to-me feature from `pr/assigned-to-me-filter`.
- Make assigned-to-me, status, and search filters compose through one refresh path.
- Turning assigned-to-me off must restore results for the active status and search.
- Keep the UI state consistent with displayed results.

## Acceptance criteria
- Assigned-to-me applies `CURRENT_USER` together with active status/search.
- Status/search changes retain assigned filtering while enabled.
- Disabling assigned filtering reloads active status/search without an assignee.
- Existing build/typecheck passes and targeted behavior is covered where repository tooling supports it.

## Non-goals
- No unrelated cleanup or feature changes.

## Constraints
- Separate worktree, branch, commits, and PR from SUP-106.
- Base branch is `origin/pr/assigned-to-me-filter`; preserve the original feature behavior except for reviewed defects.

## Planning Status
- Status: complete
- Confirmed worktree: `/home/kodyht/Workspaces/Projects/challenge/demo-app/.worktrees/sup-105-review-fixes`
- Inspected `origin/main` and `origin/main...origin/pr/assigned-to-me-filter`.
- Updated the plan to base fixes directly on the complete review branch named in `TICKETS.md`.
- Confirmed the existing client API and server endpoint already compose status, assignee, and search.
- Confirmed validation is `npm run build -w client`; no automated test script is configured.
- Created `spec.md`, `plan.md`, and `tasks.md` under `.genai/plans/sup-105-review-fixes/`.
- No application code, commits, pushes, cherry-picks, or API calls were performed.

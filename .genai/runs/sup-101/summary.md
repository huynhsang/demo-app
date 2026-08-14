# SUP-101 Summary

Status: blocked on GitHub publication

- Work ID: `sup-101`
- Branch: `feat/sup-101`
- Worktree: `/home/kodyht/Workspaces/Projects/challenge/demo-app/.worktrees/feat-sup-101`
- Changed `GET /api/issues` to order every result set by `created_at DESC, id DESC`.
- Preserved the existing status, assignee, and search predicates and the route/query-builder structure.
- Added focused API regression tests for newest-first ordering, deterministic same-timestamp ordering, and a search path.
- Focused API tests: 3 passed.
- Server build/typecheck: passed.
- Client build/typecheck: passed.
- Lint: no lint script exists.
- Local review: `merge-ready`.
- Commits: `742e462`, `3732f9b` (plus final blocker-log commit).
- Push: failed because the configured GitHub token has `pull: true` and `push: false`.
- PR URL: unavailable because `feat/sup-101` could not be pushed.
- Exact blocker: `git push origin HEAD` returned `ERROR: Repository not found`, and the GitHub repository API reported no push permission for the configured token.

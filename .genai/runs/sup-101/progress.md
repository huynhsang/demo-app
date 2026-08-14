# SUP-101 Progress

## Phase 1 — Requirements and worktree

Status: complete

- Work ID: `sup-101`
- Branch: `feat/sup-101`
- Base: `origin/main`
- Worktree: `/home/kodyht/Workspaces/Projects/challenge/demo-app/.worktrees/feat-sup-101`
- Provider: GitHub
- Planning mode: Copilot fallback

## Confirmed requirements

Change `GET /api/issues` so every list response orders issues newest first using `created_at DESC, id DESC`.

### Acceptance criteria

1. Use work ID `sup-101` and branch `feat/sup-101` in its own worktree from `origin/main`.
2. Sort by `created_at` descending and `id` descending as the deterministic tie-breaker.
3. Apply ordering to unfiltered, status-filtered, assignee-filtered, and searched results.
4. Preserve existing filtering and search behavior.
5. Add focused API regression tests for newest-first ordering, identical timestamps, and at least one filtered or searched path.
6. Preserve the current structure and make a surgical query change.

### Non-goals

- SUP-102, SUP-103, SUP-104, SUP-105, SUP-106, and SUP-108
- Pagination
- Client-side sort controls
- Broad SQL refactors
- Security hardening

### Constraints and interfaces

- Express list route: `server/src/index.ts`
- SQLite initialization: `server/src/db.ts`
- Do not modify the user's existing root `package-lock.json` changes.
- Use conventional commits with a Copilot co-author trailer.
- Do not merge the pull request.

## Phase 2 — Planning

Status: complete

Copilot fallback planning artifacts:

- `.genai/plans/sup-101/spec.md`
- `.genai/plans/sup-101/plan.md`
- `.genai/plans/sup-101/tasks.md`

The plan keeps the route/query-builder structure intact, makes the shared ordering clause deterministic, and adds focused API regression coverage without new dependencies.

## Phase 3 — Implementation

Status: complete

- Updated the shared `GET /api/issues` ordering to `created_at DESC, id DESC`.
- Added an injectable app/database seam for isolated API tests.
- Added API regressions for newest-first results, identical timestamps, and search ordering.
- Focused tests: 3 passed.
- Server build/typecheck: passed.
- Client build/typecheck: passed.
- No lint script exists.
- The root test/build detector found no root scripts, so workspace-specific verification was run directly.

## Phase 4 — Local review

Status: complete

- Review cycles: 1
- Verdict: `merge-ready`
- In-scope findings: none
- Out-of-scope follow-ups: existing query interpolation and lazy default database initialization were noted but intentionally excluded from SUP-101.

## Phase 5 — Publication

Status: blocked

- Final focused API tests: 3 passed.
- Final server build/typecheck: passed.
- Final client build/typecheck: passed.
- Local commits include the required Copilot co-author trailer.
- `git push origin HEAD` failed with `ERROR: Repository not found`.
- GitHub API confirmed repository access but token permissions are `pull: true`, `push: false`.
- The source branch cannot be published, so no GitHub pull request can be created.

## Phase 3 — Implementation

Status: complete

- Exported a minimal `createApp` seam in `server/src/index.ts` so API tests can boot the Express app without production startup side effects.
- Refactored `server/src/db.ts` to expose reusable database initialization for isolated in-memory test databases while preserving the production singleton.
- Added focused API regression coverage for newest-first ordering, identical timestamps ordered by `id DESC`, and search results staying newest first.
- Updated `GET /api/issues` to sort with `ORDER BY created_at DESC, id DESC` without changing the existing status, assignee, or search predicates.

## Phase 4 — Verification

Status: complete

- Failing-before-fix regression run: `npx --yes tsx --test src/issues-api.test.ts`
- Passing-after-fix regression run: `npx --yes tsx --test src/issues-api.test.ts`
- Build/typecheck verification: `npm run build -w server`
- Confirmed `package-lock.json` remained unchanged.

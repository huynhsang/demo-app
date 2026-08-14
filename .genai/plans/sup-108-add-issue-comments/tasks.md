# SUP-108 implementation tasks

## Strict TDD implementation sequence

- [ ] **Red — establish server test seams and expected comment schema behavior**
  - Add failing tests for isolated database initialization, the comments table/index/foreign key, persistence across reopen, and oldest-first ordering.
  - Add failing regression tests that capture current issue creation, detail retrieval, and patch behavior before moving app construction.
- [ ] **Green — make the database and Express app testable**
  - Add the smallest database factory/path seam in `server/src/db.ts`.
  - Extract app construction from the listening entrypoint without changing production port/database behavior.
  - Make the schema tests and existing issue regression tests pass.
- [ ] **Refactor — remove duplicated setup and keep production exports/entrypoints simple**
  - Centralize test database cleanup and app creation helpers.
  - Confirm no new architecture layer or unrelated route change was introduced.

- [ ] **Red — specify comment API creation and retrieval**
  - Add failing route tests for valid creation, trimming, server-generated timestamps, `201` response shape, persistence, issue-scoped retrieval, and deterministic chronological order.
  - Add failing tests for missing/non-string/blank fields, unknown issue IDs, no inserted rows after rejection, and forced persistence errors.
- [ ] **Green — implement comment persistence and endpoints**
  - Create the comments schema/index and enable foreign keys.
  - Extend issue detail retrieval with ordered comments.
  - Implement `POST /api/issues/:id/comments` with validation, parameterized SQL, issue existence check, timestamp generation, and JSON errors.
- [ ] **Refactor — tighten backend consistency**
  - Deduplicate comment row types/query fragments where useful.
  - Verify errors retain the existing `{ error: string }` convention and issue routes remain unchanged.

- [ ] **Red — specify client types/API behavior**
  - Add failing tests for the detail response comment shape, comment creation request, successful response, parsed API errors, and generic fallback errors.
- [ ] **Green — add typed comment client interfaces**
  - Add the comment/detail types and `createComment` API wrapper.
  - Implement safe server-error extraction.
- [ ] **Refactor — preserve list/detail type clarity**
  - Ensure issue list callers do not need fabricated comment data and shared response types remain minimal.

- [ ] **Red — specify comment display and form behavior**
  - Add failing `IssueDetail` tests for oldest-first author/body/time rendering, empty state, `CURRENT_USER` default, visible load/not-found errors, local validation, pending submission state, successful append/body reset, failed submission/input retention, and duplicate-submit prevention.
  - Retain or add a failing regression test for existing inline issue updates.
- [ ] **Green — implement the issue comment UI**
  - Render the comment list and form in `IssueDetail.tsx`.
  - Add page-local author/body/pending/error state and call `createComment`.
  - Append only the returned server comment and clear only the body after success.
  - Distinguish not-found from other load failures.
  - Add scoped styles using existing UI primitives.
- [ ] **Refactor — simplify UI state and accessibility**
  - Remove duplicated error/state branches.
  - Ensure labels, required fields, disabled state, error messaging, and list semantics are accessible.
  - Confirm comment bodies render as plain text.

## Verification

- [ ] Run the focused server comment and issue-regression tests.
- [ ] Run the focused client API and `IssueDetail` tests.
- [ ] Run the complete server and client test suites from the root script.
- [ ] Run the existing server and client builds/type checks.
- [ ] Manually verify valid creation, reload persistence, oldest-first display, invalid input, unknown issue, persistence failure messaging where practical, duplicate-submit prevention, and existing issue edits.
- [ ] Review the final diff to confirm there are no edit/delete/reaction/mention/attachment/permission features and no unrelated structural changes.

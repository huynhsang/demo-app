# SUP-108 technical plan

## Current architecture

- `server/src/db.ts` opens a file-backed `DatabaseSync`, creates/seeds the `issues` table, and exports the singleton database.
- `server/src/index.ts` constructs the Express app, defines all issue routes, and starts port 4000.
- `client/src/api.ts` contains typed fetch wrappers.
- `client/src/pages/IssueDetail.tsx` loads one issue and owns its inline mutation state.
- `client/src/types.ts`, `constants.ts`, `utils.ts`, and `styles.css` provide shared types, the current user, formatting/avatar helpers, and existing visual conventions.
- Neither workspace currently has a test runner or test files.

## Technical approach

### Persistence and database seams

1. Extend `server/src/db.ts` with a `comments` table:
   - `id INTEGER PRIMARY KEY AUTOINCREMENT`
   - `issue_id INTEGER NOT NULL`
   - `author TEXT NOT NULL`
   - `body TEXT NOT NULL`
   - `created_at TEXT NOT NULL`
   - foreign key from `issue_id` to `issues(id)`
2. Enable SQLite foreign-key enforcement and add an index supporting issue-scoped chronological reads, such as `(issue_id, created_at, id)`.
3. Introduce a small database creation/initialization function that accepts a database path (or an existing `DatabaseSync`) while preserving the production `db` export and current `server/data.sqlite` behavior. Tests will use isolated database files or in-memory databases without changing production storage.
4. Keep schema initialization idempotent and do not alter existing issue rows or seed behavior.

### Express API

1. Add a minimal app-construction seam (for example, `server/src/app.ts` exporting `createApp(db)`) and leave `server/src/index.ts` responsible only for creating/using the production database and listening on port 4000. This prevents test imports from starting a real server while preserving the existing entrypoint and route layout.
2. Extend `GET /api/issues/:id` to query comments with parameterized SQL and return `{ ...issue, comments }`, ordered by `created_at ASC, id ASC`. Existing issue fields and status codes remain unchanged.
3. Add `POST /api/issues/:id/comments`:
   - Verify the issue exists before insertion so unknown IDs consistently return `404`.
   - Require string `author` and `body` values whose trimmed forms are non-empty.
   - Generate `created_at` with `new Date().toISOString()`.
   - Insert using placeholders, read back the created row, and return it with `201`.
   - Catch database errors at the route boundary, log server-side context, and return the existing `{ error: string }` response convention with `500`.
4. Do not update the parent issue's `updated_at`: comments are an independent append-only timeline, and changing issue update semantics is outside the requested behavior.

### Client types and API wrapper

1. Add `Comment` to `client/src/types.ts` and add `comments: Comment[]` to the detail `Issue` response shape. If list responses should remain semantically lean, use a dedicated `IssueDetail` extension type while leaving `Issue` unchanged; choose one consistently based on compile-time impact.
2. Add `createComment(issueId, { author, body })` to `client/src/api.ts`.
3. Improve the wrapper's error extraction for this mutation so server validation/unknown-ID/persistence messages can be shown. Preserve the existing generic fallback when the response is not valid JSON.

### Issue detail UI

1. Keep all comment behavior within `client/src/pages/IssueDetail.tsx`; no new page or global state is needed.
2. Render a comments section below the existing issue card content:
   - empty state when there are no comments;
   - chronological list using the order supplied by the API;
   - author avatar/initials using existing helpers;
   - body as plain React text;
   - timestamp via `formatDateTime`.
3. Add a comment form with author initialized from `CURRENT_USER` and a body textarea.
4. On submit:
   - trim and validate both values;
   - show an inline validation error for invalid input;
   - disable the submit button while pending;
   - call `createComment`;
   - append the returned server record to `issue.comments`;
   - clear only the body after success;
   - retain inputs and show an inline error on failure.
5. Separate issue-load-not-found state from generic load errors so unknown IDs remain visibly distinct while network/server failures are not mislabeled as “Issue not found.”
6. Add narrowly scoped styles in `client/src/styles.css`, reusing `.card`, `.field`, `.btn`, `.avatar`, colors, spacing, and responsive width conventions already present.

## Automated test strategy

Because no test infrastructure exists, add only the workspace-local tools needed:

- Server: Node's built-in `node:test` and assertions, plus `supertest` (and types) for Express route integration.
- Client: Vitest, jsdom, React Testing Library, and `@testing-library/user-event`.
- Add workspace `test` scripts and a root test script that runs both workspaces; keep existing build/dev scripts unchanged.

### Server coverage

- Schema creation and comment persistence across database reopen.
- Successful creation with trimmed values and server timestamp.
- Comment ordering, including deterministic `id` tie-breaking.
- `GET /api/issues/:id` includes only that issue's comments.
- Missing, non-string, blank, and whitespace-only fields return `400` without insertion.
- Unknown issue IDs return `404` without orphan insertion.
- Forced insertion/read failure returns `500` in the standard error shape.
- Existing issue create/get/patch behavior remains valid after the app/database seam refactor.

### Client coverage

- Loaded comments render author/body/formatted time oldest-to-newest.
- Empty comment state renders.
- Form defaults author to `CURRENT_USER`.
- Invalid author/body shows a visible validation error and does not call the API.
- Successful submission disables while pending, appends the returned comment, and clears the body.
- Rejected submission preserves input and shows the API error.
- Unknown issue and generic load failures show the correct visible states.
- Existing issue field updates still invoke `updateIssue` and update the displayed issue.

## Risks and mitigations

- **Testability refactor changes startup behavior:** keep `index.ts` as the only listener and cover production app construction with integration tests/build verification.
- **Foreign keys are disabled by default in SQLite:** explicitly enable them per connection and still perform an existence check for a clear `404`.
- **Equal timestamps can make order unstable:** order by `created_at`, then `id`.
- **Client race/duplicate submission:** disable while pending and ignore further submits until completion.
- **Generic fetch errors hide server validation:** parse `{ error }` with a safe fallback.
- **Issue list type/API regression:** avoid requiring `comments` on list results unless the chosen type explicitly distinguishes detail data.
- **Database error tests become brittle:** inject a database/app dependency rather than mutating the production singleton.
- **Timestamp tests are locale-sensitive:** assert semantic content or mock formatting/time rather than hard-coding a host locale.

## Dependencies

- Existing: Express, React, React Router, Vite, TypeScript, `node:sqlite`.
- New development-only test dependencies as listed above.
- Node.js 22.5+ remains required.
- No production dependency or external service is needed.

## Structure-preservation notes

- Keep SQLite schema/setup in `server/src/db.ts`.
- Keep HTTP concerns in the server entry/app module; do not add repositories, ORMs, controllers, or services for this small feature.
- Keep network calls in `client/src/api.ts`, shared shapes in `client/src/types.ts`, and page-local state in `IssueDetail.tsx`.
- Reuse `CURRENT_USER`, `formatDateTime`, avatar helpers, and existing CSS primitives.
- Do not modify unrelated issue list/new issue behavior or introduce comment edit/delete endpoints.

## Verification strategy

1. Run focused server tests for comment schema/routes and existing issue regression cases.
2. Run focused client tests for `IssueDetail` comment loading, display, validation, submission, and errors.
3. Run both workspace test suites together.
4. Run server and client TypeScript/build commands.
5. Perform a final manual smoke check: create a comment, reload the issue, confirm persistence/order/display, submit invalid data, visit an unknown issue, and verify existing inline issue updates still work.


# SUP-102 Specification

## Problem

Rapid repeated submissions of the React `NewIssue` form can send multiple `POST /api/issues` requests. The API currently treats every request as a new issue, so duplicate events or a retry after an uncertain network result can create duplicate database rows.

SUP-102 must prevent duplicates at both layers:

- The form must reject repeated submit events synchronously while its request is pending.
- The API must make retries for the same logical creation request idempotent.

## Functional requirements

### Client

1. `client/src/pages/NewIssue.tsx` must acquire an immediate, synchronous submission lock before starting the asynchronous request. A React state update alone is not sufficient because multiple submit events can run before the component rerenders.
2. While creation is pending:
   - Further submit events must not call `createIssue`.
   - The submit button must be disabled.
   - The button must show clear pending feedback, such as `Creating…`.
3. The client must generate an idempotency key for each logical issue-creation attempt and pass it through `client/src/api.ts` as the `Idempotency-Key` header.
4. If a request fails:
   - A visible error must be shown.
   - The synchronous lock and pending state must be released.
   - The user must be able to submit again.
   - An unchanged payload should reuse the previous key so a retry can recover the original issue if the server committed it but the response was lost.
   - A changed payload must use a new key.
5. Successful creation must retain the current navigation behavior to `/issues/:id`.

### API and persistence

1. `POST /api/issues` must read a non-empty `Idempotency-Key` header.
2. The first valid request for a key must:
   - Create one issue.
   - Persist the key, the effective request payload, and the created issue ID atomically.
   - Return the created issue with HTTP 201.
3. A retry using the same key and the same effective payload must:
   - Return the originally created issue with the same ID.
   - Create no additional issue row.
   - Return HTTP 200 or 201; the planned implementation uses 200 to distinguish a replay.
4. Reusing a key with a different effective payload must return HTTP 409 and must not create or modify an issue.
5. A missing or blank idempotency key must return HTTP 400 and must not create an issue.
6. Existing title/assignee validation and default values must remain unchanged.
7. Unexpected persistence errors must roll back both issue creation and idempotency metadata and continue through the existing Express error behavior.

## Acceptance criteria

1. Two submit events dispatched in the same render turn result in exactly one client request.
2. The submit button is visibly pending and disabled until that request settles.
3. A failed request displays an error and permits a later retry.
4. `createIssue` sends a client-generated `Idempotency-Key` header.
5. Two API requests with the same key and identical payload return the same issue ID and leave exactly one matching issue row.
6. Initial API creation returns 201; an identical replay returns the original issue with 200.
7. Reusing a key with a different payload returns 409 and leaves the original issue and row counts unchanged.
8. Missing or blank keys are rejected without inserting an issue.
9. Client and server TypeScript builds pass, and focused frontend/API regression tests pass.
10. Existing list, detail, update, routing, and form behavior remain unchanged except for pending/error feedback.

## Non-goals

- SUP-101, SUP-103, SUP-104, SUP-105, SUP-106, or SUP-108.
- General request validation or broad API hardening.
- Changes to issue ordering, issue updates, navigation race handling, bulk actions, or comments.
- A general-purpose idempotency framework for other endpoints.
- Idempotency-record expiration, cleanup, observability, rate limiting, or distributed multi-service coordination.
- Unrelated refactors or UX redesign.

## Constraints

- Preserve the current React, Express, and `node:sqlite` structure and strict TypeScript conventions.
- Direct implementation scope is `client/src/pages/NewIssue.tsx`, `client/src/api.ts`, `server/src/index.ts`, and `server/src/db.ts`; test/config files and minimal styles are supporting scope.
- Database initialization must migrate existing `data.sqlite` files non-destructively.
- Tests must use an isolated in-memory SQLite database and must not depend on or mutate production seed data.
- Dependency and lockfile updates, if needed for the existing repository’s first test setup, must occur only in this worktree. Do not touch the root checkout or its existing `package-lock.json` changes.
- Planning artifacts do not authorize implementation or commits in this phase.

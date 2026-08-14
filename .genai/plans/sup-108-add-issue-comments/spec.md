# SUP-108: Add commenting on issues

## Problem and outcome

Customers currently cannot leave notes on their tickets, and support staff lose context between shifts. Each existing issue needs a persistent, append-only running list of comments so that customers and support can record and review context in one place.

## Functional requirements

- Comments belong to one existing issue.
- A user can add a comment by supplying:
  - `author`: required, non-whitespace text.
  - `body`: required, non-whitespace text.
- The server generates the comment timestamp; clients must not choose it.
- A newly created comment is persisted in SQLite and returned to the client.
- The issue detail page displays every comment for that issue.
- Each displayed comment includes its author, body, and formatted creation time.
- Comments are displayed in chronological order, oldest first.
- Comment creation is append-only; existing comments are not changed as part of this feature.
- Validation, unknown-issue, loading, and persistence failures produce visible, actionable UI errors and use the API's existing JSON error shape (`{ "error": string }`).
- Existing issue listing, creation, detail loading, and inline status/priority/assignee updates continue to work.

## Testable acceptance criteria

1. Given an existing issue and an author/body containing non-whitespace text, posting a comment returns `201`, assigns a server-generated timestamp, and associates the comment with that issue.
2. Reloading or fetching the same issue after comment creation returns the new comment from SQLite; a fresh database connection to the same file also sees it.
3. The issue detail view renders persisted comments with author, body, and formatted time in ascending creation order.
4. Leading and trailing whitespace is removed before valid author/body values are stored.
5. A blank, whitespace-only, missing, or non-string author or body is rejected with `400` and a JSON error; no row is inserted.
6. Posting a comment to an unknown issue ID returns `404` and a JSON error; no orphan comment is inserted.
7. A database failure during comment creation returns an appropriate server error and does not make the UI appear successful.
8. The comment form starts with `CURRENT_USER` as the author, requires a body, prevents duplicate submissions while pending, clears the body only after success, and appends the returned comment to the visible list in chronological order.
9. Client load and submit failures are shown on the issue detail page rather than being silently swallowed.
10. Existing issue API and UI behavior remains covered and unchanged.

## Non-goals

- Editing or deleting comments.
- Reactions, mentions, attachments, rich text, or threading.
- Permission, authentication, or authorization changes.
- Comment pagination, search, filtering, or notifications.
- Changing issue ownership, status, priority, or other existing workflows.

## Constraints

- Preserve the current React/Vite client, Express API, and `node:sqlite` persistence architecture.
- Follow existing snake_case API/database fields and client-side API wrapper patterns.
- Keep comments scoped to the issue detail workflow; do not add new routes or pages.
- Use parameterized SQL for new queries.
- Keep timestamps as ISO-8601 strings and display them through the existing `formatDateTime` utility.
- Add only the minimum test seams needed to isolate SQLite and the Express app; do not introduce a new data-access framework or state-management layer.

## Relevant interfaces

### Existing interfaces

- `GET /api/issues/:id` is called by `fetchIssue` in `client/src/api.ts` and consumed by `client/src/pages/IssueDetail.tsx`.
- `PATCH /api/issues/:id` updates the issue from `IssueDetail`.
- `Issue` is defined in `client/src/types.ts` with snake_case timestamp fields.
- `CURRENT_USER` in `client/src/constants.ts` is the default local author identity.
- `formatDateTime`, `avatarColor`, and `initials` in `client/src/utils.ts` provide existing display conventions.
- API failures currently use non-2xx responses with JSON bodies shaped as `{ error: string }`.

### Proposed interfaces

```ts
interface Comment {
  id: number;
  issue_id: number;
  author: string;
  body: string;
  created_at: string;
}

interface Issue {
  // existing fields unchanged
  comments: Comment[];
}
```

- `GET /api/issues/:id`
  - Continue returning the existing issue fields.
  - Add `comments`, ordered by `created_at ASC, id ASC`.
- `POST /api/issues/:id/comments`
  - Request: `{ "author": string, "body": string }`.
  - Success: `201` with the created `Comment`.
  - Invalid input: `400` with `{ "error": string }`.
  - Unknown issue: `404` with `{ "error": string }`.
  - Persistence failure: `500` with `{ "error": string }`.


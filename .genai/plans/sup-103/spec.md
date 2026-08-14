# SUP-103 — Prevent stale issue data during rapid navigation

## Problem

`IssueDetail` remains mounted while the `issues/:id` route parameter changes through the Previous and Next links. Its effect starts a new `fetchIssue(id)` call for each ID, but it does not cancel the previous call or prevent that call's handlers from updating state.

If requests settle out of order, an obsolete request can replace the active route's issue with older issue data or set the active route to “Issue not found.” The visible issue state must always correspond to the ID in the URL.

## Functional requirements

1. Treat every route-ID change as a new issue-load lifecycle.
2. Cancel the prior in-flight request when practical and independently prevent obsolete success or failure handlers from changing active state.
3. Pass an `AbortSignal` from `IssueDetail` through `fetchIssue` to the browser `fetch` call.
4. On each valid route-ID change:
   - clear the previous issue;
   - clear the previous not-found state;
   - show the existing loading state while the active request is pending.
5. Apply issue data and update the assignee draft only when the result belongs to the active route request.
6. Show the existing not-found state only when the active route request fails.
7. Ignore cancellation and every success or failure from an obsolete request.
8. Preserve successful inline editing of status, priority, and assignee.
9. Preserve the existing Back, Previous, and Next navigation and page structure.

## Acceptance criteria

- Rapidly navigating from issue A to issue B cannot allow A's later success response to replace B's loading, issue, or not-found state.
- Rapidly navigating from issue A to issue B cannot allow A's later rejection or 404 response to set B's not-found state.
- If B settles before A, A settling afterward produces no visible state change.
- The active request still renders its issue on success and “Issue not found.” on failure/404.
- Loading appears after a route change until the active request settles.
- Previous/Next navigation and inline editing continue to work as before.
- Focused regression tests control request settlement order and cover stale success plus stale rejection/404 behavior where represented by the API abstraction.
- The implementation remains localized to the detail-page request lifecycle, the `fetchIssue` signal plumbing, and focused tests.

## Constraints

- `client/src/pages/IssueDetail.tsx` calls `fetchIssue` from `client/src/api.ts`.
- Prefer `AbortController`/`AbortSignal`, while retaining an active-request guard because cancellation alone is not a sufficient state-ownership guarantee.
- Do not modify `package-lock.json`.
- Preserve the current routing and component structure.
- Do not implement caching or redesign data fetching.
- Planning artifacts only in this phase; no production code or tests are changed.

## Non-goals

- SUP-101, SUP-102, SUP-104, SUP-105, SUP-106, or SUP-108.
- Routing redesign.
- Issue caching, prefetching, or global state management.
- Broad API, component, or error-model refactors.
- Changing server behavior or unrelated list/create flows.


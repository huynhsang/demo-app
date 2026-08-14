# SUP-103 Technical Plan

## Current behavior

- `client/src/main.tsx` routes `issues/:id` to one `IssueDetail` component instance.
- `client/src/pages/IssueDetail.tsx` starts `fetchIssue(id)` whenever `id` changes and unconditionally updates `issue`, `assigneeDraft`, or `notFound` when the promise settles.
- `client/src/api.ts` calls `fetch` without accepting an `AbortSignal`.
- Previous/Next links make overlapping loads possible without unmounting the detail component.
- The repository currently has no committed client test runner or DOM-testing setup.

## Technical approach

1. Extend `fetchIssue` with an optional `AbortSignal` parameter and pass it to `fetch` through its request options. Keep all existing callers source-compatible.
2. In the `IssueDetail` load effect, create one `AbortController` and one effect-local active flag for the current `id`.
3. Reset `issue` and `notFound` before starting the active request, preserving the existing loading transition.
4. Pass the controller signal to `fetchIssue`.
5. Before every state update in the success and failure handlers, verify that the effect remains active.
6. In effect cleanup, mark the lifecycle inactive before aborting its controller. This ordering guarantees obsolete handlers cannot update state even if a mock, adapter, or already-settled promise does not honor cancellation.
7. Treat an active non-abort failure as the existing not-found outcome. Ignore abort failures and all failures belonging to inactive lifecycles.
8. Leave `patch`, rendering, navigation links, and route definitions structurally unchanged.

## Regression-test approach

Add focused tests around the production request-lifecycle behavior:

- Use controllable deferred requests keyed by issue ID.
- Start at issue A, navigate to issue B before A settles, resolve B, then resolve A; assert only B remains visible and its assignee draft is retained.
- Repeat with A rejecting after navigation; assert B does not show “Issue not found.”
- Cover an active request rejection/404 to preserve the current not-found behavior.
- Assert route changes show loading until the active request settles.
- Keep one successful-load/editing assertion or retain existing coverage to ensure controls remain usable.
- Verify that navigation aborts the obsolete request when the mock observes `AbortSignal`.

Because no test framework is committed and `package-lock.json` must remain untouched, implementation must first select a lockfile-neutral test path. Prefer existing/evaluation-provided tooling or a dependency-free extracted request-lifecycle test seam. Do not add untracked package dependencies or leave `package.json` and the lockfile inconsistent.

## Risks and mitigations

- **Abort alone may not suppress callbacks:** retain the active flag as the authoritative stale-result guard.
- **Abort may be classified as not-found:** check activity/abort status before setting `notFound`.
- **Stale success may overwrite the assignee draft:** guard both `setIssue` and `setAssigneeDraft`.
- **React Strict Mode reruns effects in development:** cleanup must be idempotent; each run owns its controller and active flag.
- **Test-infrastructure gap:** keep test setup minimal and lockfile-neutral; document the exact runnable command.
- **Scope creep into edit races or error redesign:** do not change `updateIssue`, server responses, routing, or global state.

## Dependencies

- Browser `AbortController` and `AbortSignal`.
- Existing React effect lifecycle and React Router route-parameter updates.
- Existing `fetchIssue` API helper.
- A lockfile-neutral way to run the focused regression tests; no runtime dependency is otherwise required.

## Verification

1. Run the focused stale-navigation regression tests.
2. Run the client TypeScript/Vite build: `npm run build -w client`.
3. Manually navigate rapidly with Previous/Next under delayed responses and confirm URL, loading, issue, assignee draft, and not-found state remain aligned.
4. Verify active 404 behavior and a normal successful load.
5. Verify status, priority, and assignee editing after a successful load.
6. Confirm `git diff -- package-lock.json` is empty and the final diff is limited to the planned client files/tests.


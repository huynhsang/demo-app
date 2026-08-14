# SUP-103 Tasks

- [ ] Confirm the focused test strategy is runnable without modifying `package-lock.json` or creating a manifest/lockfile mismatch.
- [ ] Add regression coverage with controllable deferred issue requests.
- [ ] Cover out-of-order success: navigate A → B, resolve B, then resolve A, and assert B remains active.
- [ ] Cover obsolete rejection/404: navigate A → B, reject A, and assert B's state is unchanged.
- [ ] Cover active success, loading transition, and active failure/not-found behavior.
- [ ] Cover obsolete-request cancellation through `AbortSignal` where the test seam exposes it.
- [ ] Extend `fetchIssue` in `client/src/api.ts` to accept an optional signal and pass it to `fetch`.
- [ ] Update the `IssueDetail` fetch effect to own an `AbortController` and active-request guard for each route ID.
- [ ] Guard issue, assignee-draft, and not-found updates so only the active lifecycle can apply them.
- [ ] Abort and deactivate the obsolete lifecycle during effect cleanup.
- [ ] Preserve the current render structure, Previous/Next links, loading state, 404 state, and editing code.
- [ ] Run the focused regression tests.
- [ ] Run `npm run build -w client`.
- [ ] Manually smoke-test rapid Previous/Next navigation, active 404, successful fetch, and editing.
- [ ] Confirm `package-lock.json` is unchanged and no unrelated ticket or refactor is included.

# SUP-105 Review Fixes Tasks

1. [ ] Fast-forward the implementation branch to `origin/pr/assigned-to-me-filter` and keep it isolated from SUP-106.
2. [ ] Confirm the implementation branch tip matches the complete reviewed branch before applying fixes.
3. [ ] Update `IssueList` refresh inputs to represent status, search, and assigned-to-me together.
4. [ ] Add `CURRENT_USER` as the request assignee only when assigned-to-me is enabled.
5. [ ] Replace the separate fetch-all/client-side assigned filter path with the unified server-backed refresh.
6. [ ] Make initial loading use the unified refresh with the initialized status, empty search, and assigned-to-me disabled.
7. [ ] Make status changes preserve the current search and assigned-to-me state.
8. [ ] Make search changes preserve the current status and assigned-to-me state.
9. [ ] Make assigned-to-me toggles refresh immediately, preserving status/search and omitting assignee when toggled off.
10. [ ] Run `npm run build -w client` to typecheck and build the client.
11. [ ] Manually verify the filter-composition and toggle-off restoration scenarios from the plan.
12. [ ] Review both `origin/pr/assigned-to-me-filter...HEAD` and `origin/main...HEAD`, then prepare a separate SUP-105 review-fixes PR.

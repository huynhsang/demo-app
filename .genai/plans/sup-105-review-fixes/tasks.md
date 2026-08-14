# SUP-105 Review Fixes Tasks

1. [x] Fast-forward the implementation branch to `origin/pr/assigned-to-me-filter` and keep it isolated from SUP-106.
2. [x] Confirm the implementation branch tip matches the complete reviewed branch before applying fixes.
3. [x] Update `IssueList` refresh inputs to represent status, search, and assigned-to-me together.
4. [x] Add `CURRENT_USER` as the request assignee only when assigned-to-me is enabled.
5. [x] Replace the separate fetch-all/client-side assigned filter path with the unified server-backed refresh.
6. [x] Make initial loading use the unified refresh with the initialized status, empty search, and assigned-to-me disabled.
7. [x] Make status changes preserve the current search and assigned-to-me state.
8. [x] Make search changes preserve the current status and assigned-to-me state.
9. [x] Make assigned-to-me toggles refresh immediately, preserving status/search and omitting assignee when toggled off.
10. [x] Run `npm run build -w client` to typecheck and build the client.
11. [x] Manually verify the filter-composition and toggle-off restoration scenarios from the plan.
12. [x] Review both `origin/pr/assigned-to-me-filter...HEAD` and `origin/main...HEAD`; leave PR creation to the requesting workflow.

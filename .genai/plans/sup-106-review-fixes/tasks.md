# SUP-106 Review Fixes Tasks

1. [x] Fast-forward `feat/sup-106-review-fixes` to `origin/pr/bulk-close-issues` before implementation.
2. [x] Verify the fix branch is based directly on feature tip `77c96fd` and remains separate from SUP-105.
3. [x] Confirm the inherited review-branch files contain the bulk-close API client, issue-list selection UI, styles, and server route.
4. [x] Add non-empty-array validation to the bulk-close route.
5. [x] Reject every ID that is not a JavaScript safe integer.
6. [x] Reject duplicate IDs before any database transaction or query.
7. [x] Generate `IN`-clause placeholders solely from the validated ID count.
8. [x] Replace all bulk-close request-value SQL interpolation with prepared statements and bound values.
9. [x] Wrap existence lookup, one set-based update, and updated-row retrieval in a transaction.
10. [x] Roll back and return 404 when any requested ID is missing.
11. [x] Roll back unexpected database failures and avoid leaving an open transaction.
12. [x] Use one timestamp for every row in a successful batch and preserve `{ updated }` response behavior.
13. [x] Clear the issue-list selection only after the bulk-close API call succeeds.
14. [x] Refresh the list with the active status and search filters after success.
15. [x] Verify a failed request retains the selected IDs.
16. [x] Exercise valid, empty, malformed, unsafe, duplicate, nonexistent, mixed, and injection-shaped request cases.
17. [x] Verify every rejected or missing-ID batch leaves all targeted records unchanged.
18. [x] Verify a valid batch closes and returns every requested issue atomically.
19. [x] Run `npm run build -w server`.
20. [x] Run `npm run build -w client`.
21. [x] Restore any database state changed by runtime verification.
22. [x] Review the fix diff against `origin/pr/bulk-close-issues` and confirm the pre-existing list-query interpolation and unrelated code remain untouched.
23. [x] Keep all implementation commits and the eventual PR exclusive to SUP-106.

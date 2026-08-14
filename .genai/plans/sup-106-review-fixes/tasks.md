# SUP-106 Review Fixes Tasks

1. [ ] Fast-forward `feat/sup-106-review-fixes` to `origin/pr/bulk-close-issues` before implementation.
2. [ ] Verify the fix branch is based directly on feature tip `77c96fd` and remains separate from SUP-105.
3. [ ] Confirm the inherited review-branch files contain the bulk-close API client, issue-list selection UI, styles, and server route.
4. [ ] Add non-empty-array validation to the bulk-close route.
5. [ ] Reject every ID that is not a JavaScript safe integer.
6. [ ] Reject duplicate IDs before any database transaction or query.
7. [ ] Generate `IN`-clause placeholders solely from the validated ID count.
8. [ ] Replace all bulk-close request-value SQL interpolation with prepared statements and bound values.
9. [ ] Wrap existence lookup, one set-based update, and updated-row retrieval in a transaction.
10. [ ] Roll back and return 404 when any requested ID is missing.
11. [ ] Roll back unexpected database failures and avoid leaving an open transaction.
12. [ ] Use one timestamp for every row in a successful batch and preserve `{ updated }` response behavior.
13. [ ] Clear the issue-list selection only after the bulk-close API call succeeds.
14. [ ] Refresh the list with the active status and search filters after success.
15. [ ] Verify a failed request retains the selected IDs.
16. [ ] Exercise valid, empty, malformed, unsafe, duplicate, nonexistent, mixed, and injection-shaped request cases.
17. [ ] Verify every rejected or missing-ID batch leaves all targeted records unchanged.
18. [ ] Verify a valid batch closes and returns every requested issue atomically.
19. [ ] Run `npm run build -w server`.
20. [ ] Run `npm run build -w client`.
21. [ ] Restore any database state changed by runtime verification.
22. [ ] Review the fix diff against `origin/pr/bulk-close-issues` and confirm the pre-existing list-query interpolation and unrelated code remain untouched.
23. [ ] Keep all implementation commits and the eventual PR exclusive to SUP-106.

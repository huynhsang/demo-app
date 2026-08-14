# SUP-101 Summary

Status: complete

- Changed `GET /api/issues` to order every result set by `created_at DESC, id DESC`.
- Preserved the existing status, assignee, and search predicates and the route/query-builder structure.
- Added focused API regression tests for newest-first ordering, deterministic same-timestamp ordering, and a search path.
- Verified with targeted tests and `npm run build -w server`.

# SUP-104 Summary

Implemented strict server-side issue status validation for `PATCH /api/issues/:id`, preserving valid and omitted-status behavior. New databases now enforce the same status contract with a SQLite `CHECK`, while legacy schemas continue to open unchanged. Focused API/database regressions and both application builds pass.

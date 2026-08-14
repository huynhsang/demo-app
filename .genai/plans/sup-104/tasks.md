# Implementation checklist: SUP-104

1. [x] **Create failing API regression tests first**
   - Add table-driven tests proving each of `open`, `in_progress`, and `closed` is accepted and persisted.
   - Add invalid-status tests asserting HTTP 400 and a useful payload identifying the field and allowed values.
   - Compare the full persisted row before and after rejection to prove no field or timestamp changes.
   - Add a PATCH-without-status test proving another field updates while status is retained.

2. [x] **Create failing database regression tests**
   - Prove a newly initialized schema rejects a direct invalid status write.
   - Prove all three valid statuses can be stored.
   - Build a repository-local legacy database fixture with the old unconstrained table, reopen it through application initialization, and prove startup/data compatibility.
   - Ensure tests close resources and remove generated fixture files.

3. [x] **Add minimal server testability seams**
   - Extract `createDatabase(path)` in `server/src/db.ts` while preserving the default exported production database and seed behavior.
   - Extract/export an Express app factory in `server/src/index.ts`.
   - Keep port 4000 startup when `index.ts` is executed directly, but prevent listening when imported by tests.
   - Add a server `test` script using the existing `tsx` package and Node's built-in test runner.

4. [x] **Implement PATCH runtime validation**
   - Define the exact allowed server-side statuses.
   - Distinguish an omitted `status` property from an explicitly supplied invalid value.
   - Preserve the existing 404 lookup ordering.
   - Return HTTP 400 with the agreed useful JSON payload before any update occurs.
   - Keep the existing update path for valid values and requests that omit status.

5. [x] **Add the SQLite constraint for new databases**
   - Add `CHECK (status IN ('open', 'in_progress', 'closed'))` to the create-table status column.
   - Do not migrate, rebuild, scan, or clean an existing table.

6. [x] **Run the TDD suite and remediate only SUP-104 failures**
   - Run the focused server tests.
   - Confirm valid, invalid, unchanged-persistence, omitted-status, constraint, and legacy-startup cases all pass.

7. [x] **Verify compilation and compatibility**
   - Run the server build.
   - Run the client build and confirm `client/src/types.ts` remains aligned with the three allowed values.
   - Confirm existing route/UI behavior and successful PATCH response shape remain unchanged.

8. [x] **Perform final scope and repository checks**
   - Confirm no dependency was added and root `package-lock.json` has no new diff.
   - Confirm no work from SUP-101/102/103/105/106/108, priority validation, broad framework, data cleanup, or unrelated refactor entered the diff.
   - Review resource cleanup in tests and ensure no generated database fixture remains.

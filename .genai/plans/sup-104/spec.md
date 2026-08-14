# Reject invalid issue status values

## Problem

`PATCH /api/issues/:id` currently accepts any supplied `status` value and writes it to SQLite. Values outside the client contract (`open`, `in_progress`, `closed`) can therefore persist and leave the issue UI unable to render a valid status control or indicator.

## Requirements

- Validate an explicitly supplied `status` in `PATCH /api/issues/:id` on the server.
- Allow only the exact values `open`, `in_progress`, and `closed`.
- Return HTTP 400 for any other explicitly supplied value, including non-string or null values.
- Return a useful JSON error payload that identifies `status` as invalid and communicates the allowed values.
- Perform no update when status validation fails; every persisted field and timestamp must remain unchanged.
- Continue to allow each valid status and return the updated issue.
- Preserve existing PATCH behavior when the request body omits `status`, including updates to other supported fields.
- Add a SQLite `CHECK` constraint to the `issues.status` definition used for newly created databases.
- Keep startup compatible with an existing `issues` table by relying on the existing `CREATE TABLE IF NOT EXISTS` path rather than rebuilding or migrating the table.
- Add focused API and database regression tests for all valid statuses, invalid statuses, unchanged persistence after rejection, omitted status, the new constraint, and legacy database startup compatibility.
- Preserve the current application structure and UI behavior.

## Acceptance criteria

1. PATCH with `status: "open"`, `"in_progress"`, or `"closed"` succeeds and persists the requested value.
2. PATCH with any other explicit status returns HTTP 400 and a useful JSON validation payload.
3. After a rejected PATCH, re-reading the issue shows that no field, including `updated_at`, changed.
4. PATCH without a `status` property retains the issue's existing status and otherwise behaves as it does today.
5. A newly created database rejects invalid status values at the SQLite layer.
6. Starting against a pre-existing schema without the new constraint succeeds and preserves its existing rows.
7. Focused tests pass without adding a testing dependency or changing the root `package-lock.json`.
8. Client types and UI continue to use the existing three-value status contract.

## Constraints

- Primary interfaces:
  - `server/src/index.ts` — PATCH validation and API testability.
  - `server/src/db.ts` — database creation and schema constraint.
  - `client/src/types.ts` — existing status union, which must remain aligned.
- Runtime enforcement must be server-side; TypeScript client types alone are insufficient.
- Keep changes narrow and compatible with Node's built-in `node:sqlite`.
- Do not introduce a broad validation framework, dependency, migration system, or storage redesign.
- Do not modify root `package-lock.json` changes.

## Non-goals

- SUP-101, SUP-102, SUP-103, SUP-105, SUP-106, or SUP-108.
- Cleaning or transforming unknown invalid values already present in production databases.
- Adding validation for `priority` or unrelated fields.
- Refactoring unrelated routes, query construction, UI components, or data access.
- Changing the status values, labels, or client interaction design.


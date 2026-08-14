# SUP-102 Implementation Tasks

1. [ ] Confirm work is still in `.worktrees/feat-sup-102` on `feat/sup-102`; record the initial worktree status and do not operate on the root checkout.
2. [ ] Add the minimum client/server test dependencies and scripts in the feature worktree only; update only this worktree’s `package-lock.json`.
3. [ ] Add isolated test setup:
   - [ ] Configure client Vitest/jsdom and Testing Library setup.
   - [ ] Configure server Vitest/Supertest.
   - [ ] Expose database initialization for an unseeded in-memory SQLite database.
   - [ ] Expose app construction without starting the production listener.
4. [ ] Write focused failing API regression tests:
   - [ ] First keyed request returns 201.
   - [ ] Identical replay returns the original issue ID and only one issue row.
   - [ ] Reusing a key with a different payload returns 409 without new/changed rows.
   - [ ] Missing or blank keys return 400 without inserts.
5. [ ] Implement the additive `issue_creation_idempotency` schema migration in `server/src/db.ts`, preserving existing issue schema and production seeding.
6. [ ] Implement `POST /api/issues` idempotency in `server/src/index.ts`:
   - [ ] Normalize the effective payload once.
   - [ ] Validate the header and existing required fields.
   - [ ] Use an explicit `BEGIN IMMEDIATE` transaction.
   - [ ] Return 201 for first creation, 200 for identical replay, and 409 for payload conflict.
   - [ ] Roll back and propagate unexpected failures.
7. [ ] Run focused server tests and the server TypeScript build; fix only SUP-102-related failures.
8. [ ] Write focused failing client regression tests:
   - [ ] Two same-tick submit events call `createIssue` once.
   - [ ] Pending feedback is visible and the submit button is disabled.
   - [ ] Failure is visible and unlocks the form.
   - [ ] An unchanged retry reuses its key; a changed payload gets a new key.
   - [ ] `createIssue` sends the supplied `Idempotency-Key` header.
9. [ ] Update `client/src/api.ts` with typed create input/key parameters and the idempotency header.
10. [ ] Update `client/src/pages/NewIssue.tsx`:
    - [ ] Acquire/release a synchronous ref lock around the request.
    - [ ] Track pending and error presentation state.
    - [ ] Generate keys with `crypto.randomUUID()`.
    - [ ] Retain a key only for an unchanged failed payload.
    - [ ] Disable/relabel the submit button while pending.
    - [ ] Preserve successful navigation and existing field behavior.
11. [ ] Add minimal pending/error styles and accessibility attributes consistent with the current form.
12. [ ] Run focused client tests and the client TypeScript/Vite build; fix only SUP-102-related failures.
13. [ ] Run complete client and server test scripts, both workspace builds, and `git diff --check`.
14. [ ] Manually review the diff for:
    - [ ] No unrelated ticket work or broad validation/refactoring.
    - [ ] No production database/test-data coupling.
    - [ ] No changes in the root checkout.
    - [ ] No accidental modification of the root checkout’s `package-lock.json`.
15. [ ] Create logical commits only after all included tests pass:
    - [ ] `feat(server): make issue creation idempotent`
    - [ ] `fix(client): prevent duplicate issue submissions`
    - [ ] Include test/config and worktree lockfile changes with the layer they support.
    - [ ] Include the required `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` trailer in each commit.
16. [ ] Perform a final clean-status/diff review and document verification results in the existing SUP-102 run artifacts.

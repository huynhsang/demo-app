# Backlog

You won't have time to do all of these well. Pick what you think matters most, say why, and go.
More tickets may get added to the queue while you're working — that's expected, treat it like a real inbox.

---

### SUP-101 — New issues show up at the bottom of the list instead of the top
**Reported by:** Alex (support)
**Priority:** Low

"Minor, but when I file something new I have to scroll to find it. Feels backwards — newest stuff
should probably be the first thing I see."

---

### SUP-102 — Customers getting charged twice for the same issue report
**Reported by:** Priya (eng)
**Priority:** High

"Had two customers this week where they say they clicked 'submit' once but we ended up with two
identical issues in the tracker. I reproduced it locally by clicking the create button twice quickly.
Not sure yet if this is a frontend thing or something on our API — can you take a look and fix it
wherever it actually belongs?"

---

### SUP-103 — Clicking through issues quickly can land you on the wrong one
**Reported by:** Priya (eng, noticed while testing something else)
**Priority:** Medium

"If you open an issue, then quickly go back and open a different one before the first one's finished
loading, the page sometimes briefly shows the first issue's data under the second issue's URL. It
corrects itself a second later, so it's easy to miss — but it's a real discrepancy while it lasts.
Worth understanding why before it bites us somewhere an edit could get applied to the wrong record."

---

### SUP-104 — A bad status value quietly breaks an issue's display
**Reported by:** Jordan, while testing a script that bulk-updates issues
**Priority:** Low-ish, but flagged as a real gap

"Had a typo in a script hitting the update endpoint directly — sent `closeed` instead of `closed`.
The API didn't complain, it just saved it. Now that issue shows a blank status dropdown and no colored
status dot, like it's stuck in limbo. Kind of worried about what else assumes status is always one of
the three valid values."

---

### SUP-105 — Review Jordan's PR before we merge it
**Reported by:** Jordan (eng)
**Priority:** High — they'd like it merged today

"Put up a PR for the assigned-to-me filter support's been asking about. Branch is
`pr/assigned-to-me-filter`. Should be small and low-risk, but I'd like a second pair of eyes before
it goes to main — can you review it and tell me if it's good to merge, or what needs to change first?"

This repo is a git repo. You don't need to merge or push anything — just inspect the branch
(`git diff main..pr/assigned-to-me-filter`, `git log -p pr/assigned-to-me-filter`, or check it out
locally to run it) and give feedback the way you would on an actual review: what has to change
before merge, what's fine as-is, and what you'd raise without blocking on it.

---

### SUP-106 — Review Sam's PR: bulk-close action
**Reported by:** Sam (eng)
**Priority:** Medium — no rush, but they'd like it in before end of sprint

"Finally got around to the bulk-close feature support's wanted forever (see the old backlog item
about this). Added multi-select checkboxes to the issue list and a new endpoint to close a batch at
once. Branch is `pr/bulk-close-issues` — it's a bigger change than the last one that went through
review, touches both the API and the list UI. Can you do a proper pass, especially on the backend?
I'm a lot less confident about the SQL/data-handling side of it than the frontend."

Same deal as SUP-105 — inspect the branch (`git diff main..pr/bulk-close-issues`, or check it out and
run it), don't merge or push anything, and give real review feedback: blocking issues vs. nice-to-haves.

---

### SUP-107 — Editing an issue quickly can leave the screen showing the wrong thing
**Reported by:** Priya (eng)
**Priority:** Medium

"Noticed this while testing something unrelated — if you change two fields on an issue back to back,
like flipping the status and then immediately changing the priority, the page sometimes settles on a
value that doesn't match what's actually saved. Refreshing fixes it, so the underlying data seems
fine, but the screen is wrong for a bit. Haven't been able to pin down exactly when it happens, just
that it's happened more than once."

---
name: Diagnostic data isolation
description: How the synthetic diagnostic stays isolated from the real user — now via real row ownership, not just finally-cleanup.
---

# Diagnostics must not pollute real user data

The QuantReason/Know-Thyself `POST /diagnostics/synthetic-run` writes real rows
(attempts, answers, practice sessions) into the same DB the real user uses. The
original design had no row ownership, so a diagnostic write was indistinguishable
from real work; it could *resume* the user's in-progress attempt and left rows
behind (running it 3× marked all assignments "submitted" and polluted analytics).

**Current model (preferred): real ownership.** There is a `users` table with two
rows — PRIMARY (the real user) and SYNTHETIC (the diagnostic). Every owned table
(`attempts`, `practice_sessions`, `profile_reports`) carries a `userId` FK
(cascade). The diagnostic runs entirely AS the synthetic user; the app runs as
PRIMARY. All app queries are scoped to the primary userId, so the synthetic run
is physically incapable of reading or overwriting the real user's data.

**Rule:**
- All app routes that read/update by attempt/session id MUST also constrain by
  `userId = primary` (avoid IDOR-style cross-owner access). Make shared helpers
  owner-aware (e.g. `loadAttempt(attemptId, userId)`).
- The synthetic diagnostic still tracks created ids and deletes ALL synthetic-owned
  rows in a `finally` block (belt-and-suspenders; FK cascades clean children).
- A boot backfill assigns any legacy NULL-owner rows to PRIMARY; `userId` is kept
  nullable in schema only so an additive push survives existing rows.

**Why:** ownership makes isolation a structural guarantee, not a cleanup hope. The
finally-cleanup alone left residue whenever the handler was killed mid-run.

**How to apply:** when adding any `/diagnostics/*` route or app route that touches
owned tables, resolve the user id first (`getPrimaryUserId`/`getSyntheticUserId`,
both cached) and scope every query by it.

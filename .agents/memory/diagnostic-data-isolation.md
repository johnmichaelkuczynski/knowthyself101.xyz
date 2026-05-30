---
name: Diagnostic data isolation
description: Self-tests/diagnostics that write to the shared app DB must be self-cleaning and never touch real user rows.
---

# Diagnostics must not pollute real user data

The QuantReason/Know-Thyself `POST /diagnostics/synthetic-run` writes real rows
(attempts, answers, practice sessions) into the same DB the single real user uses.
Earlier it (a) could *resume* the user's in-progress attempt and (b) left every
created row behind — running it 3× created submitted attempts for all 13
assignments, so the UI showed everything "submitted" and the analytics profile
was computed over synthetic answers.

**Rule:** any diagnostic/self-test that writes to the shared app DB must:
- ALWAYS create fresh, isolated rows — never resume/overwrite the real user's.
- Track every id it creates and delete them in a `finally` block (FK cascades
  clean children: answers←attempts, practice_problems/attempts←sessions).

**Why:** this is a single-user app with no row ownership, so a diagnostic write is
indistinguishable from real work unless it cleans up after itself.

**How to apply:** when adding/editing any `/diagnostics/*` route that inserts rows,
collect created ids into arrays and tear them down in `finally`. To identify
already-leaked synthetic assignment rows for cleanup: an attempt is synthetic if
every one of its answers equals the problem's `correctAnswer` (model reflection);
synthetic practice sessions have all attempts equal to the practice problem's
`correctAnswer`.

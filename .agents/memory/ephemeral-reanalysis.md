---
name: Ephemeral lens re-analysis of submitted attempts
description: Why "re-read submitted answers through another lens" is a dedicated read-only endpoint, not the global ModeSwitcher
---

# Ephemeral lens re-analysis

Submitted assignment feedback is frozen at submission time. To let a user re-read
already-submitted answers through a different mode+framework ("lens") as a what-if
preview, use a dedicated read-only endpoint, not the global ModeSwitcher.

**Why:** The global ModeSwitcher mutates user settings and invalidates the report;
that is the wrong tool for a per-page what-if. Stored `answers.explanation` must stay
exactly as graded at submission, and the user's global Lens must not change just
because they peeked through another framework on the review page.

**How to apply:**
- The reanalyze endpoint must persist NOTHING — read attempt+problems+answers, call
  the grader per answered problem, return items. No DB writes.
- Owner-scope by the primary user id; refuse non-`submitted` attempts (409) — an
  in-progress draft has no settled answers to re-read.
- Clamp an out-of-mode framework to `auto` rather than erroring.
- On the client, guard rapid lens switching with a monotonic request token so a slow
  earlier response can't overwrite a newer choice; on error fall back to the saved
  reading so the displayed feedback never mismatches the picker.

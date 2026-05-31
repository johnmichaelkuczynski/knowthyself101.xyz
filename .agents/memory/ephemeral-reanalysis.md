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

## A single selected lens must drive the PRIMARY reading, not just bullets

When a specific (non-`auto`) framework is selected, `gradeAnswer` must write the main
`analysis`/`shortfall` text THROUGH that lens (its concepts + vocabulary) — not only
the optional "What the lenses see" framework array.

**Why:** Lens selection felt totally broken ("feedback always the same") because only
the optional framework bullets were lens-aware, and for thin/evasive answers those
bullets often don't fire — so switching lenses changed nothing the user could see. The
verdict/analysis/shortfall were lens-agnostic by construction.

**How to apply:** In `gradeAnswer`, for non-auto frameworks inject a clause telling the
model to read the whole answer through the chosen lens (and to read even a dodge through
it), and make the "no lens fired" fallback lens-aware instead of claiming no lens fired.
Keep `auto` mode's honest "consider all, report only what genuinely fires" behavior.

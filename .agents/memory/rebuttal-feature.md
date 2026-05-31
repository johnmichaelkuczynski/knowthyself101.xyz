---
name: Push-back / rebuttal feature
description: How user counter-responses to critiques are keyed, persisted, and fed into the self-portrait.
---

# Push back on a reading (rebuttals)

The student can counter-respond ("push back") to the app's reading of any one submitted
reflection. The app reconsiders: revises when the push-back is fair, holds firm and names
what the push-back itself reveals when it's a deflection. Unlike the ephemeral lens
re-analysis, this exchange IS persisted and feeds the evolving self-portrait.

## Keying: attempt + problem, never problem alone
Rebuttals are keyed by `attemptId + problemId`. The frontend never exposes an answer id
(SavedAnswer / ProblemResult carry only `problemId`), so attempt+problem is the stable
composite identity for a specific answer.

**Why:** A problem can be answered across multiple attempts (retakes). Keying any
aggregation by `problemId` alone merges a prior attempt's dialogue into a later answer for
the same problem, corrupting the persisted signal.

**How to apply:** Anywhere rebuttal turns are joined back to an answer — especially the
self-portrait builder in `profile.ts` — group/look up by a composite `${attemptId}:${problemId}`
key, not by `problemId`. The frontend review screen passes an `effectiveAttemptId`
(just-submitted attempt OR the reopened `reviewAttemptId`) so both review paths key correctly.

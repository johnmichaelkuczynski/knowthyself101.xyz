---
name: Learned-user-context memory feature
description: How "Know Thyself" makes later generated questions embody the user's earlier answers
---

# Learned-user-context (cross-question memory)

The course must build a profile of the user over time AND have later
dynamically-generated questions sometimes embody what the user revealed in
earlier answers.

## Where the "questions" come from
Only two generators are dynamic and in scope:
- Starter questions: `GET /tutor/suggestions/:lectureId` in `routes/tutor.ts`.
- Practice prompts: next-prompt generation in `routes/practice.ts`.
Homework/test/midterm/final problems are seeded/static — out of scope.

## The mechanism
A shared helper (`lib/learnedContext.ts`) gathers, scoped strictly by `userId`:
the latest answer per assignment question + recent practice reflections (merged
and ordered by true timestamp recency) plus the latest saved self-portrait
(`profileReportsTable`, written by `lib/profile.ts`). It renders a JSON memory
block injected into the generation prompt. Both call sites are best-effort
(try/catch) so memory never blocks question generation.

**Why:** the angry user requirement was explicitly that later questions must "at
least sometimes" reflect earlier answers. Prompt-level instruction (not a
post-gen repair pass) is sufficient because the requirement is "sometimes," and
gpt-5.4 complies strongly in practice.

## How to apply / gotchas
- Single-user app: resolve the reader with `getPrimaryUserId()` (slug "primary").
  Diagnostics use a separate "synthetic" user, so normal generation never reads
  synthetic data.
- Use the default TEXT_MODEL (gpt-5.4) via `chatJson` for these — FAST_MODEL
  (gpt-5-mini) ignores hard structural constraints (see
  ai-generation-model-choice.md).
- tutor.ts keeps a backstop that drops abstract-opener questions
  (why/how/what/...). It is a permissive blacklist, NOT a strict allowed-verb
  allowlist — chosen deliberately so valid concrete questions are never dropped.
- The memory block instructs the model to name the specific revealed thing back
  and push one layer deeper, while still obeying the concrete-autobiographical
  rules; it must treat the portrait as a hunch, never as established fact.
- Recency sampling: dedupe assignment answers keeping the newest per problemId,
  then merge with practice by timestamp and take the tail. Queries are bounded
  (`limit`) so these hot routes stay cheap as history grows.

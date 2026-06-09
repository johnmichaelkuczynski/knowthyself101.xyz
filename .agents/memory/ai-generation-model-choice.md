---
name: AI generation model choice
description: When to use TEXT_MODEL vs FAST_MODEL for LLM generation in api-server, and why prompt-only constraints need a server-side backstop.
---

# AI generation model choice

`lib/ai.ts` exposes `TEXT_MODEL` (gpt-5.4, the strong default for `chatText`/`chatJson`)
and `FAST_MODEL` (gpt-5-mini). `FAST_MODEL` reliably **ignores hard structural or
format constraints** — e.g. "every item MUST begin with one of these verbs",
"never start with Why/How". Observed ~0% compliance on such rules for the starter-
questions generator; it anchored to the lecture's framing and produced abstract
questions regardless of how forcefully the prompt forbade them.

**Why:** Users want the self-knowledge prompts to force concrete autobiographical
recall (a named person, a specific scene, an age), not theoretical psychology
chatter. A weak model can't hold that line.

**How to apply:** For any instruction-heavy / constrained generation, do NOT pass
`FAST_MODEL` — let `chatJson`/`chatText` use the default `TEXT_MODEL`. AND add a
deterministic server-side backstop (e.g. a regex that drops abstract-opener
questions: why/how/what/which/explain/tell…, after stripping leading
numbering/quotes), with a sane fallback so the list never empties. Prompt rules
alone are not enough — always pair the prompt constraint with a code-side filter.

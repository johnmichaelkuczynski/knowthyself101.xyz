---
name: Stance (temperament) axis
description: How the grader's charity-vs-severity axis is modeled, separate from mode/framework
---

# Stance axis

Stance is an INDEPENDENT third axis from `mode` (self_knowledge/career) and
`framework` (the analytic lens). It controls how charitable vs. severe the
grader is, with 6 ordered levels (kindest → harshest): `neutral`,
`looking_for_good`, `really_looking_for_good`, `constructively_critical`,
`constructively_very_critical`, `pure_damnation`.

**Why a separate axis:** the grader was "knee-jerk critical." Temperament is
orthogonal to *which lens* reads the answer and *what mode* it's in — mixing it
into framework would have coupled severity to lens choice. Keep it independent.

**How to apply / invariants:**
- Stance is a GLOBAL setting (app_settings single row, default `neutral`),
  like mode/framework. It is NOT part of any per-request contract — notably
  `ReanalyzeInput` stays `{mode, framework}` and the reanalyze route reads the
  global `settings.stance`. Mode/framework are per-request what-ifs; stance is not.
- The directive (`stanceDirective`) is injected into BOTH the verdict-leniency
  decision and the tone of all grading prose (gradeAnswer, reconsiderRebuttal),
  and into the self-portrait synthesis tone (profile.ts). It must shape tone
  only — never invent or omit evidence.
- `lensStamp(mode, framework, stance?)` exists in TWO places (server
  frameworks.ts + client lens.ts) and they MUST stay in sync. Canonical rule:
  the `neutral` default is SUPPRESSED from the stamp in both. A past review
  caught these diverging (server appended "· Neutral", client omitted it).
  Any change to one stamp helper must mirror the other, and all client call
  sites (ModeSwitcher, Analytics badge, reanalyze preview) must pass stance.

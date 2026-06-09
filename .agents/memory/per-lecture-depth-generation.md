---
name: Per-lecture depth generation
description: How the SHORT/MEDIUM/LONG lecture toggle generates depth variants, and why bulk regeneration is forbidden.
---

# Per-lecture depth generation

The SHORT/MEDIUM/LONG toggle on the lecture page generates the medium/long body
of **only the currently viewed lecture**, on demand, via
`POST /api/diagnostics/expand-lectures?level=<medium|long>&id=<lectureId>`.
Short always exists (`body`); medium/long (`bodyMedium`/`bodyLong`) are nullable
and written lazily on first request, then refetched.

**Why:** A previous global "Generate medium + long lectures" TopBar button rewrote
all 29 lectures at once — users hated that a single depth click changed every
lecture. The rule now: depth generation is always scoped to one lecture; never
add a UI action that bulk-regenerates the whole curriculum.

**How to apply:** When touching depth/expansion UX, keep generation per-lecture
(`id=` is required), show an in-flight spinner, guard against overlapping requests
(ref-based in-flight + request token so stale completions can't mutate the UI),
and refetch the single lecture rather than invalidating everything.

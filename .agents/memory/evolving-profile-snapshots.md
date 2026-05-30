---
name: Evolving profile snapshots
description: Rules for the profile_reports persistence/evolution feature so future readings stay clean and deterministic.
---

# Evolving profile snapshots (analytics `/report`)

The course persists each generated self-portrait / career reading as a timestamped
row in `profile_reports`, and feeds the most recent same-mode snapshot back into the
synthesis prompt as `previousProfile` so the portrait builds cumulatively.

## Rules that must hold

- **Never persist a fallback/error narrative.** Report generation has a `catch` that
  returns a friendly "analysis engine unavailable" placeholder. That placeholder must
  NOT be written to `profile_reports` — if it were, it becomes the next run's
  `previousProfile` and anchors the evolving portrait to outage text instead of the
  user's own words. Gate the insert on a `synthesisFailed` flag.
  **Why:** a saved outage message poisons all subsequent cumulative readings.

- **Order snapshots by `createdAt DESC, id DESC` everywhere they're read** (prior-context
  selection, `/latest`, `/history`). createdAt alone is nondeterministic when two rows
  share a timestamp.

- **Mode scoping is server-side** (`where mode = settings.mode`). The frontend `/latest`
  query key is static (no params), so on mode switch you must invalidate it AND guard
  the render with `latest.report.mode === settings.mode` to avoid flashing the other
  mode's reading during the refetch.

- Empty state (`answeredCount === 0`) returns early before persistence, so snapshots
  only ever exist once there's real user material.

## Single-user note
`profile_reports` has no `userId` yet (single-user, like `app_settings`). If multi-user
is added later, scope every snapshot query by user as well as mode.

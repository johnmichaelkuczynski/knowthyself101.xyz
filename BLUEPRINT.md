# 📐 Know Thyself — Technical Blueprint

This document is the engineering blueprint for the application: how the pieces fit, how data
flows, and the decisions that hold the system together. For the product narrative and quick
start, see `README.md`.

---

## 1. System Topology

```
                         ┌────────────────────────────────────────────┐
   Browser  ─────────▶   │   Shared reverse proxy (path-based routing)  │
                         └───────────────┬───────────────┬────────────┘
                                         │ /             │ /api
                                ┌────────▼─────┐  ┌───────▼──────────┐
                                │  qr-course   │  │   api-server     │
                                │ React + Vite │  │   Express        │
                                └──────────────┘  └───────┬──────────┘
                                                          │
                                          ┌───────────────┼───────────────┐
                                          │               │               │
                                   ┌──────▼─────┐  ┌───────▼──────┐ ┌──────▼──────┐
                                   │  Neon PG   │  │   OpenAI     │ │  GPTZero    │
                                   │ (DATABASE_ │  │ (chat / JSON │ │ (predict/   │
                                   │  URL)      │  │  mode)       │ │  text)      │
                                   └────────────┘  └──────────────┘ └─────────────┘
```

- **Routing.** Each artifact declares its path in `.replit-artifact/artifact.toml`. The
  proxy matches most-specific-first, so `/api` and `/` never collide. Paths are not
  rewritten — each service owns its full base path.
- **No cross-service Vite proxy.** The shared proxy handles cross-artifact routing; the
  client uses relative URLs under its base path.

---

## 2. Monorepo Layout & Build Model

```
artifacts/qr-course        leaf package — typecheck with tsc --noEmit
artifacts/api-server       leaf package — esbuild bundle (build.mjs) → dist/index.mjs
artifacts/qr-course-demo   leaf package — video-js artifact
lib/api-spec               composite lib — OpenAPI + Orval codegen
lib/db                     composite lib — Drizzle schema + client
```

- `lib/*` are **composite** TypeScript projects (emit declarations via `tsc --build`).
- `artifacts/*` are **leaf** packages (`tsc --noEmit`); they never import each other —
  shared logic goes through a `lib`.
- Canonical check: `pnpm run typecheck` (builds libs, then typechecks leaves). Trust this
  over editor/LSP state when they disagree.

---

## 3. Contract-First API Pipeline

`lib/api-spec/openapi.yaml` is the **single source of truth**.

```
openapi.yaml ──(orval)──▶  React Query hooks   → consumed by qr-course
              └─────────▶  Zod schemas          → validate I/O in api-server
```

- Regenerate with `pnpm --filter @workspace/api-spec run codegen`.
- The server validates inputs/outputs with the generated Zod schemas; the client uses the
  generated hooks. Do not change `info.title` — it controls generated filenames.
- **Reskin invariant:** the subject change from math notation to self-knowledge required
  **zero** schema changes. Two fields were *repurposed in meaning only*:
  - `Problem.correctAnswer` → hidden first-person "model reflection" (depth reference only,
    never returned to the client).
  - `GenerateReportResponse` (narrative / strengths / weaknesses / recommendations) →
    relabeled in the UI as the evolving psychological self-portrait.

---

## 4. Data Model (Drizzle, in `lib/db`)

Core entities and their relationships:

```
weeks ──< topics ──< lectures (short / medium / long depth bodies)
                └──< assignments ──< problems
attempts ──< answers            (a student's run of an assignment)
practice_sessions ──< practice_items
```

- `lib/db/src/index.ts` and `drizzle.config.ts` both read `process.env.DATABASE_URL`.
- Schema changes are applied with `drizzle-kit push` (`pnpm --filter @workspace/db run push`).

---

## 5. Seeding & Curriculum Drift Detection

`seedIfEmpty` runs at boot:

1. Read the set of topic slugs currently in the database.
2. Compare to the expected curriculum (the 29 self-knowledge topics) plus a revision sentinel.
3. If the sets differ, **wipe and re-seed in dependency order** (weeks → topics → lectures →
   assignments → problems); otherwise skip.

**Why a sentinel:** content edits that don't change the slug set still need to force a
reseed. Bumping the sentinel guarantees a clean propagation without reseeding on every boot.

---

## 6. The Grading Pipeline (sincerity, not correctness)

`api-server/src/lib/grading.ts`:

```
answer ─▶ low-effort gate ─▶ LLM depth read ─▶ feedback that leads with what it reveals
            (empty / evasive          (honesty, specificity,
             only → gentle fail)       self-awareness; brevity OK)
```

- There is **no correct answer**. The repurposed `correctAnswer` is a private depth
  reference for the LLM, never a target shown to the student.
- Short, specific answers pass; only empty or generic non-answers fail, and they fail
  *gently* with an invitation to go deeper.
- Feedback copy throughout the UI (Topic Practice, Assignments, Analytics) is framed as
  reflection ("What this reveals", "An invitation to go deeper"), not scoring.

---

## 7. Two-Layer AI-Authorship Detection

```
                ┌────────────────────────── static layer ───────────────────────────┐
submitted text ─┤ GPTZero predict/text  ─┐                                            │
                │                          ├─ blend: 0.85·GPTZero + 0.15·heuristic ──▶ AI prob
                │ structural heuristic   ─┘   (fallback: LLM scorer + heuristic)       │
                └─────────────────────────────────────────────────────────────────────┘

                ┌────────────────────── diachronic layer ───────────────────────────┐
keystroke trace ┤ keystrokes, erases, bulk inserts, longest insert, rewrites, time ──▶ behavior score
                │ paste disabled in the textarea                                       │
                └─────────────────────────────────────────────────────────────────────┘
```

- GPTZero outage degrades gracefully to the LLM-scorer + heuristic path; submissions never
  block.
- The keystroke trace is captured client-side and scored server-side.

---

## 8. Diagnostics (operator console)

Two self-tests, both surfaced on the in-app Diagnostics page:

- **`GET /diagnostics/system`** — environment, DB round-trip, seed integrity, OpenAI chat
  completion, OpenAI JSON mode, detection pipeline, AI-positive control sample, GPTZero
  connectivity. Each step reports pass/fail, timing, and raw error text.
- **`POST /diagnostics/synthetic-run`** — end-to-end proof: a synthetic student runs a
  practice session and a full assignment attempt, submits, and the test verifies feedback +
  detection + analytics all reflect the run.

Supporting operator endpoints: `expand-lectures`, `content-audit`, `reset`.

---

## 9. Reflective Guide (streaming) & Adaptive Practice

- **`POST /tutor/ask`** streams tokens over Server-Sent Events with a section-scoped system
  prompt grounded in the active lecture. The guide reflects; it does not lecture.
- **Practice** generates reflective micro-prompts on demand; per-session depth (1–4) adjusts
  after each attempt.

---

## 10. Secrets & Environment

| Secret | Used at | Failure mode |
| --- | --- | --- |
| `DATABASE_URL` | boot + every request | app cannot start without a reachable DB |
| `OPENAI_API_KEY` | boot | required; guide / practice / grading / portrait depend on it |
| `GPTZERO_API_KEY` | detection | optional; degrades to LLM scorer + heuristic |
| `SESSION_SECRET` | session cookies | required for signed sessions |

Secrets are never hard-coded; they are read from the environment and managed via the Secrets
panel. The database lives in external Neon so the application is portable, not bound to any
single host.

---

## 11. Companion Demo Video

`artifacts/qr-course-demo` is a `video-js` artifact: a short animated, narrated product
piece for Know Thyself. It is independent of the runtime and exists purely as a marketing /
overview asset.

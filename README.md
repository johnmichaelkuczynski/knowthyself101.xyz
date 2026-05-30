# 🔍 Know Thyself

**A Four-Week Course in Self-Examination — Read the Lecture, Sit With the Question, Answer Honestly**

A self-paced, single-user web course whose subject *is you*. Over four weeks and 29 short
lectures it walks the territory of a life — where your sense of self came from, what you
avoid, how you love, what you envy, what you fear is true about you, and who you are becoming.

It is a content reskin of the **QuantReason** runtime. The full engine — lectures with
short / medium / long depth, a section-scoped reflective guide, adaptive practice,
AI-assisted feedback, two-layer AI-authorship detection, one-click diagnostics, and an
analytics layer — is preserved unchanged. Two behaviors are specific to this material:

1. **Answers are short and there are no right answers.** Every prompt asks for a sincere,
   first-person reflection. Responses are read for **sincerity and depth**, never for
   correctness, and brevity is never penalized.
2. **Feedback is a mirror.** Instead of marking work right or wrong, the course reflects
   back *what your words reveal about you*, and the analytics page assembles an **evolving
   psychological self-portrait** from everything you've written.

---

## 🧱 Architecture at a Glance

This is a pnpm monorepo. Traffic is routed by path through a shared reverse proxy.

```
artifacts/
  qr-course/        React + Vite SPA — the course UI (served at /)
  api-server/       Express API — lectures, grading, tutor, detection, analytics (served at /api)
  qr-course-demo/   Animated product demo video (video-js artifact)
lib/
  api-spec/         Single OpenAPI document + generated React Query hooks and Zod schemas
  db/               Drizzle ORM schema + client (reads DATABASE_URL)
```

- **Contract-first.** `lib/api-spec/openapi.yaml` is the single source of truth. React Query
  hooks (client) and Zod validators (server) are generated from it. This reskin made **no**
  schema changes.
- **Database.** `lib/db` reads `process.env.DATABASE_URL` and connects to an external Neon
  Postgres, so the app is portable across environments and not tied to any one host.

---

## 🚀 Running Locally

Services run as Replit **workflows**, not via root `pnpm dev`. Each artifact needs
workflow-provided env (`PORT`, `BASE_PATH`).

| Task | Command |
| --- | --- |
| Typecheck everything | `pnpm run typecheck` |
| Regenerate API client/schemas | `pnpm --filter @workspace/api-spec run codegen` |
| Push DB schema to `DATABASE_URL` | `pnpm --filter @workspace/db run push` |
| Restart a service | restart the workflow for that artifact |

Ad-hoc requests go through the proxy, e.g. `curl localhost:80/api/healthz` — never hit a
service port directly.

---

## 🔌 API Surface (`/api`)

| Area | Endpoints |
| --- | --- |
| Health | `GET /healthz` |
| Course | `GET /course/overview`, `/course/weeks/{n}`, `/course/lectures/{id}`, `/course/topics` |
| Assignments | `GET /assignments`, `/assignments/{id}`, `POST /assignments/{id}/start`, `/assignments/attempts/{id}/answer`, `/assignments/attempts/{id}/submit` |
| Practice | `POST /practice/sessions`, `/practice/sessions/{id}/next`, `/practice/sessions/{id}/grade` |
| Reflective guide | `POST /tutor/ask` (SSE stream) |
| Detection | `POST /detection/scan` |
| Analytics | `GET /analytics/summary`, `/analytics/topics`, `/analytics/activity`, `/analytics/report` |
| Diagnostics | `GET /diagnostics/system`, `POST /diagnostics/synthetic-run`, `/diagnostics/expand-lectures`, `/diagnostics/content-audit`, `/diagnostics/reset` |

---

## ⚙️ How the Two Behavior Changes Work

- **Sincerity & depth grading** (`api-server/src/lib/grading.ts`). The grader reads each
  answer for honesty, specificity, and self-awareness rather than correctness. Empty or
  low-effort answers fail gently and invite a second pass; any genuine attempt passes.
  Feedback always *leads with what the answer reveals*. The `correctAnswer` field is
  repurposed as a hidden, first-person "model reflection" — a depth reference for the
  grader, the synthetic-student diagnostic, and the content auditor. It is **never**
  returned to the client or shown as a correct answer.
- **Evolving self-portrait** (`api-server/src/routes/analytics.ts`). `GET /analytics/report`
  joins every submitted answer (and practice reflection) back to its topic and asks an LLM
  to draw a psychological portrait — narrative, patterns it notices, tensions worth sitting
  with, and questions to carry forward. It maps onto the existing
  `GenerateReportResponse` shape (narrative / strengths / weaknesses / recommendations)
  with no schema change.

## 🛡️ Two-Layer AI-Authorship Detection

- **Static (GPTZero):** each submitted answer is sent to GPTZero's `predict/text` endpoint;
  the per-document AI probability is blended `0.85 × GPTZero + 0.15 × structural-heuristic`.
  If GPTZero is unavailable the system silently falls back to an LLM scorer plus heuristic —
  submissions never block.
- **Diachronic (keystroke pattern):** the answer textarea captures keystroke count, erase
  count, bulk-insert events, longest bulk insert, rewrite segments, and total duration.
  Pasting is disabled — the whole point is to hear from *you*.

## 🩺 Two Diagnostics

- **System diagnostic** (`GET /diagnostics/system`): environment, database round-trip,
  course-seed integrity, OpenAI chat completion, OpenAI JSON mode, detection pipeline,
  AI-positive control sample, and GPTZero connectivity. Each step returns pass/fail,
  timing, and a raw error string.
- **Synthetic-student diagnostic** (`POST /diagnostics/synthetic-run`): an end-to-end stack
  proof — a synthetic student takes a practice session and a full assignment attempt,
  submits, and verifies feedback + detection + analytics all reflect the run.

Both are surfaced with one-click execution (plus a content auditor) on the in-app
**Diagnostics** page.

## 🌱 Auto-Reseed on Curriculum Change

`seedIfEmpty` compares the topic slugs in the database against the expected curriculum. If
they differ, it wipes and re-seeds in dependency order, so a single content swap in the
seed file propagates cleanly.

---

## 🔐 Required Secrets

| Secret | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (external Neon database). |
| `OPENAI_API_KEY` | Required at boot. Powers the reflective guide, practice generator, feedback grader, self-portrait, and lecture-expansion job. |
| `GPTZERO_API_KEY` | The GPTZero leg of static AI detection. Without it the system falls back to the LLM scorer + heuristic but loses the primary detection signal. |
| `SESSION_SECRET` | Signed-session cookie secret. |

All are managed through the Secrets panel; none are hard-coded.

---

## 💡 Core Idea

Most of what runs a life runs quietly, just below awareness. The work of this course is to
turn some of it over in the light — gently, specifically, in your own words.

Read the lecture, sit with the question, and write the truest short answer you can. The
feedback won't tell you whether you're right. It will tell you what you just revealed.

**Know Thyself — read the lecture, sit with the question, answer honestly.**

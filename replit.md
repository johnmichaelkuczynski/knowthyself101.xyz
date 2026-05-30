# 🔍 Know Thyself

**A Four-Week Course in Self-Examination — Read the Lecture, Sit With the Question, Answer Honestly**

---

## 🧩 Overview

Know Thyself is a self-paced, single-user web course whose subject *is you*. Over four weeks and 29 short lectures, it walks through the territory of a life — where your sense of self came from, what you avoid, how you love, what you envy, what you fear is true about you, and who you are becoming.

It is a content reskin of the **QuantReason** Quantitative Reasoning app. The full runtime — lectures with short / medium / long depth, a section-scoped reflective guide, adaptive practice, AI-assisted feedback, two-layer AI-authorship detection, one-click diagnostics, and an analytics layer — is preserved unchanged. What changed is the subject (self-knowledge, not math) and two behaviors specific to this kind of material:

1. **Answers are short and there are no right answers.** Every prompt asks for a sincere, first-person reflection — usually a sentence or two. Responses are read for **sincerity and depth**, never for correctness, and brevity is never penalized.
2. **Feedback is a mirror.** Instead of marking work right or wrong, the course reflects back *what your words reveal about you*, and the analytics page assembles an **evolving psychological self-portrait** from everything you've written.

---

## 🧠 What It Does

- **Four-Week Curriculum of 29 Micro-Lectures** — One facet of the self per lecture, organized by week:
  - **Week 1 — Where the self came from**: self-concept; earliest memory; the family system; formative wounds; abandoned selves; inherited values; the story you tell about yourself.
  - **Week 2 — The self in motion**: the unwatched self; what you avoid; your energy map; work and effort; money and security; risk and failure; anger.
  - **Week 3 — The self with others**: attachment; love; recurring conflicts; envy and admiration; unspoken needs; being seen; solitude.
  - **Week 4 — The self going forward**: strengths; weaknesses; what you'd do for free; authority; feared truths; what to keep and what to change; who you are becoming; a closing self-portrait.
- **One Real Idea per Lecture** — Every micro-lecture grounds its theme in an actual concept from psychology or philosophy — attachment theory, the shadow, the Johari window, the hedonic treadmill, the Dunning–Kruger effect, and so on — used to illuminate the reader's own life rather than to be memorized.
- **One Honest Prompt per Lecture** — Every homework / test / midterm / final problem asks the student to *write a short, true reflection*, not to recall a fact. There are no model answers shown as "correct."
- **Three-Depth Lectures, Section-Scoped Guide, Adaptive Practice, AI Feedback, Two-Layer Detection, One-Click Diagnostics** — All inherited unchanged from the QuantReason runtime.
- **Built-In Product Demo Video** — The companion `qr-course-demo` artifact still ships as a short screencast of the live UI.

---

## ⚙️ Technical Features

- **Sincerity & Depth Grading** — The grader (`grading.ts`) reads each answer for honesty, specificity, and self-awareness rather than correctness. Empty or low-effort answers fail gently and invite a second pass; any genuine attempt passes. Feedback always *leads with what the answer reveals*. The `correctAnswer` field is repurposed as a hidden, first-person "model reflection" — a depth reference for the grader, the synthetic-student diagnostic, and the content auditor; it is **never** displayed to the student as a correct answer.
- **Evolving Self-Portrait** — The analytics `/report` endpoint (`analytics.ts`) joins every submitted answer (and practice reflection) back to its topic and asks an LLM to draw a psychological portrait: a narrative, the patterns it notices, the tensions worth sitting with, and questions to carry forward. It maps onto the existing `GenerateReportResponse` shape (narrative / strengths / weaknesses / recommendations) with no schema change.
- **Two-Layer AI-Authorship Detection** —
  - **Static (GPTZero):** Every submitted answer is sent to GPTZero's `predict/text` endpoint; the per-document AI probability is blended `0.85 × GPTZero + 0.15 × structural-heuristic`. If GPTZero is unavailable the system silently falls back to an LLM scorer plus heuristic.
  - **Diachronic (Keystroke Pattern):** The student textarea captures keystroke count, erase count, bulk-insert events, longest bulk insert, rewrite segments, and total duration. Pasting is disabled — the whole point is to hear from *you*.
- **Two Diagnostic Self-Tests** —
  - **System Diagnostic** (`/diagnostics/system`): environment, database round-trip, course-seed integrity, OpenAI chat completion, OpenAI JSON mode, detection pipeline, AI-positive control sample, and GPTZero connectivity.
  - **Synthetic-Student Diagnostic** (`/diagnostics/synthetic-run`): end-to-end stack proof — a synthetic student takes a practice session and a full assignment attempt, submits, and verifies feedback + detection + analytics all reflect the run.
- **Auto-Reseed on Curriculum Change** — `seedIfEmpty` compares the set of topic slugs in the database to the expected curriculum. If they differ, it wipes and re-seeds in dependency order, so a single content swap in the seed file propagates cleanly.
- **Contract-First API** — Single OpenAPI document; React Query hooks for the UI and Zod validators for the server are generated from it. This reskin made **no** schema changes.
- **Streaming Reflective Guide** — Token-by-token Server-Sent-Event streaming with a section-scoped system prompt grounded in the active lecture; the guide reflects, never lectures.
- **Adaptive Practice Engine** — Per-session depth (1–4) adjusts after each attempt; reflective prompts are generated on demand.
- **Operator Console** — Dedicated Diagnostics page surfaces both self-tests and a content auditor (lecture fact-check + model-reflection review) with one-click execution and raw error output.

---

## 🔐 Required Secrets

- `OPENAI_API_KEY` — required at boot. Powers the reflective guide, practice generator, feedback grader, self-portrait, and lecture-expansion job.
- `GPTZERO_API_KEY` — required for the GPTZero leg of the static-AI-detection layer. If absent, the system falls back to the LLM scorer + heuristic, but you lose the primary detection signal.

Both are requested via the secrets panel; neither is hard-coded.

---

## 🎓 Designed For

- **Anyone willing to look.** A short, structured prompt to pay attention to your own life — one honest question at a time, with a real idea from psychology or philosophy to light the way.
- **The Maintainer of QuantReason and Its Clones:** A clean test that the runtime survives a total subject change and two behavioral inversions (sincerity-grading instead of correctness; a revelatory profile instead of a performance report) without touching the API contract.

---

## 💡 Core Idea

Most of what runs a life runs quietly, just below awareness. The work of this course is to turn some of it over in the light — gently, specifically, in your own words.

Read the lecture, sit with the question, and write the truest short answer you can. The feedback won't tell you whether you're right. It will tell you what you just revealed.

**Know Thyself — read the lecture, sit with the question, answer honestly.**

---

## User preferences

_(none recorded yet)_

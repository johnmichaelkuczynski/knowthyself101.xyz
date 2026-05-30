---
name: QuantReason runtime reskins
description: Gotchas when reskinning the QuantReason course runtime (qr-course + api-server) into a non-correctness domain.
---

# Reskinning the QuantReason runtime into a non-correctness domain

The qr-course/api-server pair is a quiz runtime built around "correct answers." When cloning it
into a domain where there are **no** right answers (e.g. a reflective / self-knowledge course),
correctness leaks into more places than the obvious lecture/seed files. Sweep all of these:

- **`correctAnswer` leaks into API responses.** `ProblemResult` (assignment submit) and
  `PracticeGrade` (practice grade) both carry a `correctAnswer` field. It is **optional** in the
  OpenAPI schema (not in `required`), so you can simply stop populating it server-side — no schema
  change needed. If the field is repurposed as a hidden "model reference," it must NOT be sent to
  the client, even if the UI doesn't render it (it's still readable in the network tab).

- **Correctness copy hides in secondary pages.** Beyond Dashboard/Layout/LectureView, the
  correctness framing also lives in `TopicPractice.tsx` ("Correct"/"Not quite", red XCircle,
  "accuracy", "Session score", "right answers push it up"), `Assignments.tsx` ("problems",
  "exams", "Score: X%"), and the `Analytics.tsx` topics table headers ("Attempts"/"Accuracy").

- **Pre-LLM low-effort filters can penalize brevity.** `grading.ts` has a `LOW_EFFORT` set and a
  fallback `wordCount` threshold. For a "brevity is never penalized" course, keep only truly
  evasive tokens (idk/dunno/skip/pass/?) — drop yes/no/maybe/none/nothing and let the LLM judge
  sincerity; set the offline fallback threshold to >=1 word.

**Why:** these scattered correctness surfaces survive a subject swap and silently contradict a
"no right answers" product. **How to apply:** after the obvious content swap, grep the whole
qr-course + api-server tree for `correctAnswer`, `accuracy`, `Score`, `Correct`, `exam` and
reframe each hit; verify the grade endpoints' JSON keys directly (not just the UI).

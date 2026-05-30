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

## "No right answers" ≠ "every answer passes" — depth/authenticity grading

A reflective-course owner can later demand the *opposite* of leniency: shallow / generic / phony /
evasive answers must FAIL even though there's no factual "correct" answer. Reconcile this with the
earlier "brevity is never penalized" rule:

- Grade on a **verdict** (genuine / shallow / phony / evasive) + a depth score, not correctness.
  `correct === true` ONLY when `verdict === "genuine"`. Brevity still isn't the failure axis —
  a short but specific, honest answer is genuine; a long generic platitude is shallow and fails.
- Feedback must **lead with what the answer reveals (inference, not paraphrase)**, then name the
  shortfall and what real depth would require. The repurposed hidden `correctAnswer` (first-person
  "model reflection") is the grader's depth reference and must never reach the client.

**Why:** the product's whole value is the mirror; rubber-stamping every answer makes feedback feel
like hollow pattern-matching. **How to apply:** when an owner complains feedback is shallow, push
the LLM to classify+infer and let non-genuine verdicts fail, rather than tweaking copy.

## Evolving psychological portrait (analytics /report) — aggregate ALL answers, but cap for tokens

The `/report` endpoint was rebuilt into a two-pass LLM flow (pass 1: per-answer reveals+defense;
pass 2: synthesize one evolving portrait) mapped onto the unchanged `GenerateReportResponse`
(narrative/strengths/weaknesses/recommendations). Two durable traps:

- **`chatJson` hard-caps `max_completion_tokens` (was 4096).** Emitting one JSON entry per answer
  for a prolific user (100+ reflections) truncates the JSON → `JSON.parse` throws → silent
  fallback. Fix was a `maxTokens` param (use ~8192 for report passes) AND capping the analyzed set.
- **Aggregate every reflection, but feed the model a deduped/capped set:** keep the LATEST answer
  **per `problemId`** (NOT per prompt text — distinct problems can share wording) = the current
  self, plus recent practice reflections, capped (~70). Practice reflections must join
  `practiceProblemsTable` to recover the real prompt (don't use answer-as-prompt) so they're truly
  analyzed, not just counted.

**Why:** "increasingly accurate portrait" means current self (latest per question) across all
topics, but the LLM output token cap, not input, is the silent failure point. **How to apply:**
any per-item LLM emission over a user's full history needs a recency/dedup cap keyed by stable id +
a raised output-token budget; test with the heaviest real user, not an empty DB.

## Surfacing per-request metadata (lens/framework) without an API schema change

To make the active mode+framework legible *after the fact*, embed a human "lens stamp" into the
existing free-text/markdown response fields (grade `explanation`, report `narrative` provenance)
rather than adding response fields — the contract is frozen across reskins and those fields are the
only carriers. Two durable traps a code reviewer will catch:

- **Stamp EVERY `gradeAnswer` return path, not just the LLM-scored one.** The function returns
  early for blank and low-effort answers and has a model-unavailable catch fallback; all are valid
  graded outcomes and must carry the stamp. Build the stamp once at the top and wrap each
  explanation, so no path can be missed.
- **A UI badge reading the lens from live `settings` can drift from a report pinned at
  generation-time.** Clear the cached report when EITHER mode OR the active framework changes (the
  framework, not just mode, must be in the clearing `useEffect` deps).

**Also:** keep the server stamp's framework label in sync with the client's by stripping the
scholar attribution parenthetical (e.g. "(Beck / Burns)") so the feedback prose and the UI badge
read identically.

## Companion demo video (qr-course-demo) reskin gotchas

- **A DESIGN subagent reskinning the video can silently leave Scene1 behind.** When it rewrites
  `VideoTemplate.tsx` to render scenes prop-less (`<SceneComponent key=... />`) plus Scene2–6, it
  may not touch `Scene1.tsx`, which still expects the old interactive-cursor props
  (`setCursorPos`/`setIsClicking`) — producing a runtime `setCursorPos is not a function` crash
  and an "Invalid hook call" cascade. **How to apply:** after any video reskin, grep
  `video_scenes/` for `export function Scene\d\(` and confirm every scene is prop-less; check the
  browser console for the crash; and remove now-orphaned helpers (`CursorPointer`, `StreamingText`,
  `TypewriterText`, `TypingIndicator`) the new template no longer imports.

- **The `synthetic-run` diagnostic is very slow and aborts on any api-server restart.** It chains
  many LLM calls (practice + full assignment + grading + detection + analytics) and can run many
  minutes; restarting api-server while it's in flight logs `request aborted`. The faster
  `GET /api/diagnostics/system` already independently exercises OpenAI chat, JSON mode, the
  detection pipeline, and GPTZero, so use it as the primary green signal. **How to apply:** never
  launch synthetic-run right before an api-server restart; trust the system diagnostic for routine
  verification and only wait out synthetic-run when a full end-to-end proof is explicitly needed.

- **video-js export ("Video export failed") breaks when audio is wired off the skill's path.**
  The export build cannot resolve `<audio src>` imported via a deep relative path into
  `attached_assets/` (outside the artifact), and the recorder dislikes multiple `<audio>` elements
  (esp. one with a `loop` attr). **Why:** export runs a production build/headless recording; assets
  outside the artifact root and per-element audio swaps drift or fail. **How to apply:** follow
  `.local/skills/video-js/references/audio.md` — put ONE pre-mixed `composite_audio.mp3` (narration
  ducked-music via ffmpeg, clamped to total SCENE_DURATIONS runtime) in the artifact's
  `public/audio/`, reference it as `${import.meta.env.BASE_URL}audio/composite_audio.mp3`, single
  audioRef, NO `loop` attr, time-sync via SCENE_START_SEC. Audio wiring is a MAIN-AGENT task, not
  the DESIGN subagent's. The Replit export captures the audio too, so the downloaded MP4 has sound.

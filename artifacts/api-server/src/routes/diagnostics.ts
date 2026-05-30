import { Router, type IRouter } from "express";
import { asc, eq, sql } from "drizzle-orm";
import {
  db,
  topicsTable,
  lecturesTable,
  assignmentsTable,
  problemsTable,
  attemptsTable,
  answersTable,
  practiceSessionsTable,
  practiceProblemsTable,
  practiceAttemptsTable,
} from "@workspace/db";
import { chatText, chatJson, FAST_MODEL, TEXT_MODEL } from "../lib/ai";
import { detect } from "../lib/detection";
import { gradeAnswer } from "../lib/grading";

const router: IRouter = Router();

type Step = {
  name: string;
  ok: boolean;
  ms: number;
  detail?: string;
  error?: string;
};

async function run(name: string, fn: () => Promise<string | void>): Promise<Step> {
  const t0 = Date.now();
  try {
    const detail = await fn();
    return { name, ok: true, ms: Date.now() - t0, detail: detail ?? undefined };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return { name, ok: false, ms: Date.now() - t0, error: err };
  }
}

// ---------- Diagnostic 1: system checks ----------
router.get("/diagnostics/system", async (_req, res) => {
  const steps: Step[] = [];

  steps.push(
    await run("Environment: DATABASE_URL present", async () => {
      if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
      return "ok";
    }),
  );

  steps.push(
    await run("Database: SELECT 1", async () => {
      const r = await db.execute(sql`select 1 as ok`);
      const ok = (r.rows[0] as { ok?: number } | undefined)?.ok;
      if (Number(ok) !== 1) throw new Error("unexpected result");
      return "round-trip ok";
    }),
  );

  steps.push(
    await run("Database: course content seeded", async () => {
      const t = await db.select().from(topicsTable);
      const l = await db.select().from(lecturesTable);
      const a = await db.select().from(assignmentsTable);
      const p = await db.select().from(problemsTable);
      if (t.length < 29) throw new Error(`only ${t.length} topics`);
      if (l.length < 1) throw new Error("no lectures");
      if (a.length < 1) throw new Error("no assignments");
      if (p.length < 1) throw new Error("no problems");
      return `${t.length} topics · ${l.length} lectures · ${a.length} assignments · ${p.length} problems`;
    }),
  );

  steps.push(
    await run("OpenAI integration: chat completion (fast model)", async () => {
      const txt = await chatText(
        "You answer with a single word only.",
        "Reply with exactly the word PONG.",
        FAST_MODEL,
      );
      if (!txt) throw new Error("empty completion");
      return `responded (${txt.length} chars)`;
    }),
  );

  steps.push(
    await run("OpenAI integration: JSON mode", async () => {
      const out = await chatJson<{ ok: boolean }>(
        "Reply only with strict JSON.",
        'Return exactly {"ok": true}.',
        FAST_MODEL,
      );
      if (!out || out.ok !== true) throw new Error("did not return ok:true");
      return "json round-trip ok";
    }),
  );

  steps.push(
    await run("Detection pipeline: heuristic + scoring", async () => {
      const r = await detect("The quick brown fox jumps over the lazy dog.", {
        keystrokeCount: 40,
        eraseCount: 2,
        bulkInsertCount: 0,
        longestBulkInsertChars: 0,
        rewriteSegments: 0,
        durationMs: 8000,
      });
      if (typeof r.aiScore !== "number") throw new Error("no aiScore");
      return `aiScore=${r.aiScore.toFixed(2)} diachronic=${r.diachronicScore.toFixed(2)}`;
    }),
  );

  steps.push(
    await run("Grader: sincerity & depth check", async () => {
      // A sincere, specific reflection should pass; an evasive non-answer should not.
      const sincere = await gradeAnswer({
        prompt: "What role did you play in your family growing up?",
        correctAnswer:
          "I was the peacemaker — the one who smoothed things over before they boiled.",
        userAnswer:
          "I was the quiet one who tried to keep the peace, and I still do that at work.",
      });
      if (!sincere.correct) throw new Error("a sincere reflection should pass");
      const evasive = await gradeAnswer({
        prompt: "What role did you play in your family growing up?",
        correctAnswer: "I was the peacemaker.",
        userAnswer: "idk",
      });
      if (evasive.correct) throw new Error('"idk" should not pass the sincerity bar');
      return "sincerity grading ok (sincere passes, evasive fails)";
    }),
  );

  const ok = steps.every((s) => s.ok);
  res.json({ ok, generatedAt: new Date().toISOString(), steps });
});

// ---------- Diagnostic 2: synthetic student ----------
function syntheticTrace(text: string, durationMs = 12_000) {
  return {
    keystrokeCount: Math.max(1, text.length),
    eraseCount: 1,
    bulkInsertCount: 0,
    longestBulkInsertChars: 0,
    rewriteSegments: 0,
    durationMs,
  };
}

router.post("/diagnostics/synthetic-run", async (_req, res) => {
  const steps: Step[] = [];
  res.setTimeout(10 * 60 * 1000);

  // Everything this diagnostic writes is throwaway. We track every row it creates
  // and delete it in a finally block so a self-test never pollutes the real
  // student's attempts, answers, practice, or analytics.
  const createdAttemptIds: number[] = [];
  const createdSessionIds: number[] = [];

  try {

  // Course discovery
  let topics: { id: number; title: string; weekNumber: number }[] = [];
  let lectures: { id: number; body: string }[] = [];
  let assignments: { id: number; title: string; weekNumber: number; kind: string }[] = [];

  steps.push(
    await run("Load course catalog", async () => {
      const t = await db.select().from(topicsTable).orderBy(asc(topicsTable.position));
      topics = t.map((x) => ({ id: x.id, title: x.title, weekNumber: x.weekNumber }));
      const l = await db.select().from(lecturesTable).orderBy(asc(lecturesTable.id));
      lectures = l.map((x) => ({ id: x.id, body: x.body }));
      const a = await db
        .select()
        .from(assignmentsTable)
        .orderBy(asc(assignmentsTable.weekNumber), asc(assignmentsTable.position));
      assignments = a.map((x) => ({
        id: x.id,
        title: x.title,
        weekNumber: x.weekNumber,
        kind: x.kind,
      }));
      return `${topics.length} topics, ${lectures.length} lectures, ${assignments.length} assignments`;
    }),
  );

  steps.push(
    await run("Read each lecture", async () => {
      let total = 0;
      for (const l of lectures) {
        const [row] = await db
          .select()
          .from(lecturesTable)
          .where(eq(lecturesTable.id, l.id));
        if (!row) throw new Error(`lecture ${l.id} missing`);
        total += (row.body ?? "").length;
      }
      return `read ${lectures.length} lectures (${total} chars total)`;
    }),
  );

  // Walk every assignment: start, answer each problem, submit
  for (const a of assignments) {
    steps.push(
      // eslint-disable-next-line no-loop-func
      await run(
        `Assignment "${a.title}" (week ${a.weekNumber}, ${a.kind})`,
        async () => {
          const problems = await db
            .select()
            .from(problemsTable)
            .where(eq(problemsTable.assignmentId, a.id))
            .orderBy(asc(problemsTable.position));
          if (problems.length === 0) throw new Error("no problems");

          // Always create a fresh, isolated attempt. We never resume an existing
          // one so the diagnostic can never hijack or overwrite the real
          // student's in-progress work; this attempt is deleted afterward.
          const [created] = await db
            .insert(attemptsTable)
            .values({ assignmentId: a.id, status: "in_progress" })
            .returning();
          if (!created) throw new Error("could not start attempt");
          const attemptId = created.id;
          createdAttemptIds.push(attemptId);

          // Save an answer for every problem
          for (const p of problems) {
            const synthetic = p.correctAnswer; // synthetic student "knows" the answer
            const trace = syntheticTrace(synthetic);
            await db
              .insert(answersTable)
              .values({
                attemptId,
                problemId: p.id,
                answer: synthetic,
                keystrokeCount: trace.keystrokeCount,
                eraseCount: trace.eraseCount,
                bulkInsertCount: trace.bulkInsertCount,
                longestBulkInsertChars: trace.longestBulkInsertChars,
                rewriteSegments: trace.rewriteSegments,
                durationMs: trace.durationMs,
              })
              .onConflictDoNothing();
          }

          // Grade + AI/diachronic detection on every answer
          const answers = await db
            .select()
            .from(answersTable)
            .where(eq(answersTable.attemptId, attemptId));
          const byProblem = new Map(answers.map((x) => [x.problemId, x]));
          let score = 0;
          for (const p of problems) {
            const ans = byProblem.get(p.id);
            const ua = ans?.answer ?? "";
            const graded = await gradeAnswer({
              prompt: p.prompt,
              correctAnswer: p.correctAnswer,
              userAnswer: ua,
            });
            if (graded.correct) score += 1;
            if (ans && ua.trim().length > 0) {
              const det = await detect(ua, {
                keystrokeCount: ans.keystrokeCount,
                eraseCount: ans.eraseCount,
                bulkInsertCount: ans.bulkInsertCount,
                longestBulkInsertChars: ans.longestBulkInsertChars,
                rewriteSegments: ans.rewriteSegments,
                durationMs: ans.durationMs,
              });
              await db
                .update(answersTable)
                .set({
                  correct: graded.correct,
                  aiScore: det.aiScore,
                  aiFlagged: det.aiFlagged,
                  diachronicScore: det.diachronicScore,
                  diachronicFlagged: det.diachronicFlagged,
                  detectionRationale: det.rationale,
                })
                .where(eq(answersTable.id, ans.id));
            }
          }
          const pct = (score / problems.length) * 100;
          await db
            .update(attemptsTable)
            .set({
              status: "submitted",
              submittedAt: new Date(),
              scorePercent: pct,
            })
            .where(eq(attemptsTable.id, attemptId));
          return `submitted ${problems.length} answers · score ${pct.toFixed(0)}%`;
        },
      ),
    );
  }

  // Practice loop (adaptive + tutor)
  let sessionId: number | null = null;
  steps.push(
    await run("Start practice session (tutor on, focus on weaknesses)", async () => {
      const [s] = await db
        .insert(practiceSessionsTable)
        .values({
          weekNumber: null,
          topicId: null,
          tutorEnabled: true,
          focusOnWeaknesses: true,
          difficulty: 2.0,
        })
        .returning();
      if (!s) throw new Error("could not create session");
      sessionId = s.id;
      createdSessionIds.push(s.id);
      return `session #${s.id}`;
    }),
  );

  for (let i = 0; i < 2; i++) {
    steps.push(
      // eslint-disable-next-line no-loop-func
      await run(`Practice problem ${i + 1}: generate + grade + adapt`, async () => {
        if (!sessionId) throw new Error("no session");
        const topic = topics[Math.floor(Math.random() * topics.length)]!;
        const gen = await chatJson<{
          prompt: string;
          correctAnswer: string;
          explanation: string;
        }>(
          `You generate a single short reflective prompt for a self-knowledge course on "${topic.title}". It invites a SHORT, honest, first-person answer; there is no single correct answer, but a real answer must be specific and self-revealing. "correctAnswer" is a short first-person MODEL REFLECTION (a depth reference, never shown as correct). Respond as strict JSON: {"prompt": string, "correctAnswer": string, "explanation": string}.`,
          `New reflective prompt on ${topic.title}.`,
        );
        const [stored] = await db
          .insert(practiceProblemsTable)
          .values({
            sessionId,
            topicId: topic.id,
            prompt: gen.prompt,
            correctAnswer: gen.correctAnswer,
            explanation: gen.explanation,
            difficulty: 2.0,
          })
          .returning();
        if (!stored) throw new Error("could not store problem");
        const graded = await gradeAnswer({
          prompt: stored.prompt,
          correctAnswer: stored.correctAnswer,
          userAnswer: stored.correctAnswer,
        });
        await db.insert(practiceAttemptsTable).values({
          sessionId,
          problemId: stored.id,
          topicId: stored.topicId,
          answer: stored.correctAnswer,
          correct: graded.correct,
          difficulty: stored.difficulty,
          trace: syntheticTrace(stored.correctAnswer),
        });
        return `topic=${topic.title} · correct=${graded.correct}`;
      }),
    );
  }

  steps.push(
    await run("AI tutor: ask with lecture context", async () => {
      const ctx = (lectures[0]?.body ?? "").slice(0, 400);
      const txt = await chatText(
        "You are a concise tutor. Reply in 2 sentences.",
        `Context from a lecture:\n"""${ctx}"""\n\nStudent question: Can you summarize the key takeaway?`,
      );
      if (!txt) throw new Error("tutor returned nothing");
      return `${txt.length} chars`;
    }),
  );

  steps.push(
    await run("AI detection scan (pasted-style text should flag)", async () => {
      const r = await detect(
        "In conclusion, the multifaceted tapestry of self-discovery is paramount to navigating the landscape of one's authentic personal journey.",
        {
          keystrokeCount: 8,
          eraseCount: 0,
          bulkInsertCount: 1,
          longestBulkInsertChars: 160,
          rewriteSegments: 0,
          durationMs: 1200,
        },
      );
      return `aiScore=${r.aiScore.toFixed(2)} (flagged=${r.aiFlagged}) · diachronic=${r.diachronicScore.toFixed(
        2,
      )} (flagged=${r.diachronicFlagged})`;
    }),
  );

  steps.push(
    await run("Analytics: summary + topics + activity", async () => {
      const submitted = await db
        .select()
        .from(attemptsTable)
        .where(eq(attemptsTable.status, "submitted"));
      const practice = await db.select().from(practiceAttemptsTable);
      const t = await db.select().from(topicsTable);
      return `${submitted.length} submitted attempts · ${practice.length} practice attempts · ${t.length} topics`;
    }),
  );

  steps.push(
    await run("Analytics report (LLM narrative)", async () => {
      const out = await chatJson<{ narrative: string; recommendations: string[] }>(
        "You are a psychological portraitist. Reply as strict JSON.",
        'Return {"narrative": "ok", "recommendations": ["a","b","c"]}.',
      );
      if (!out.narrative) throw new Error("no narrative");
      return `narrative ${out.narrative.length} chars · ${out.recommendations.length} recs`;
    }),
  );

  const ok = steps.every((s) => s.ok);
  res.json({ ok, generatedAt: new Date().toISOString(), steps });
  } finally {
    // Tear down everything the diagnostic created so it leaves no residue in the
    // real student's data. Cascades remove answers (from attempts) and practice
    // problems + attempts (from sessions).
    for (const id of createdAttemptIds) {
      await db.delete(attemptsTable).where(eq(attemptsTable.id, id)).catch(() => {});
    }
    for (const id of createdSessionIds) {
      await db.delete(practiceSessionsTable).where(eq(practiceSessionsTable.id, id)).catch(() => {});
    }
  }
});

// ---------- Expand lectures: generate medium / long versions with more examples ----------
router.post("/diagnostics/expand-lectures", async (req, res) => {
  const rawLevel = String(req.query.level ?? "");
  if (rawLevel !== "medium" && rawLevel !== "long") {
    res.status(400).json({ error: "level must be 'medium' or 'long'" });
    return;
  }
  const level: "medium" | "long" = rawLevel;

  const rawId = req.query.id;
  let onlyId: number | null = null;
  if (rawId !== undefined && rawId !== "") {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      res.status(400).json({ error: "id must be a positive integer" });
      return;
    }
    onlyId = parsed;
  }

  const all = await db
    .select({
      id: lecturesTable.id,
      title: lecturesTable.title,
      body: lecturesTable.body,
      bodyMedium: lecturesTable.bodyMedium,
      bodyLong: lecturesTable.bodyLong,
    })
    .from(lecturesTable)
    .orderBy(asc(lecturesTable.id));
  const lectures = onlyId !== null ? all.filter((l) => l.id === onlyId) : all;
  if (onlyId !== null && lectures.length === 0) {
    res.status(404).json({ error: `no lecture with id ${onlyId}` });
    return;
  }

  const ratio = level === "long" ? "roughly 2x to 3x the length of the SHORT version" : "roughly 1.5x to 2x the length of the SHORT version";
  const moreExamples =
    level === "long"
      ? "At least TWO additional concrete illustrations for every idea beyond what the short version has — pick contrasting cases (different kinds of people, everyday situations, a relevant idea from psychology or philosophy, a common way the pattern hides)."
      : "At least ONE additional concrete illustration for every idea beyond what the short version has.";
  const moreExplanation =
    level === "long"
      ? "Considerably more explanation: motivate every idea, explain WHY it tends to be true, name common ways people miss it in themselves, and add brief reflective asides that invite the reader to notice it in their own life."
      : "Noticeably more explanation: clarify each idea, motivate why it matters, and add a short 'notice this in yourself' aside where useful.";

  const sys =
    `You are a thoughtful lecturer on a self-knowledge course producing the ${level.toUpperCase()} version of a reflective lecture. ` +
    "You are given the SHORT version of the lecture. Rewrite it as a longer teaching version. RULES, no exceptions:\n" +
    "1. KEEP every heading and every idea from the SHORT version, in the same order, with the same names. You may add new sub-sections only when needed to introduce additional illustrations — but no new top-level topics.\n" +
    `2. ${moreExplanation}\n` +
    `3. ${moreExamples} Use \`## Example\` / \`### In life\` style headings where helpful.\n` +
    `4. Length target: ${ratio}.\n` +
    "5. Warm, plain English, free of jargon and clinical labels. No filler, no hedging, no 'in conclusion'. Concrete human detail carries the load, and the tone stays non-judgmental.\n" +
    "6. Return ONLY the rewritten Markdown lecture body. No preface, no commentary, no code fences around the whole thing.";

  let updated = 0;
  let failed = 0;
  const concurrency = 3;
  for (let i = 0; i < lectures.length; i += concurrency) {
    const batch = lectures.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (l) => {
        try {
          const user = `LECTURE TITLE: ${l.title}\n\nSHORT VERSION:\n"""\n${l.body}\n"""`;
          const expanded = await chatText(sys, user);
          if (!expanded || expanded.trim().length < l.body.length * 0.85) {
            failed++;
            return;
          }
          const patch =
            level === "long"
              ? { bodyLong: expanded.trim() }
              : { bodyMedium: expanded.trim() };
          await db.update(lecturesTable).set(patch).where(eq(lecturesTable.id, l.id));
          updated++;
        } catch {
          failed++;
        }
      }),
    );
  }

  res.json({ ok: failed === 0, level, updated, failed, total: lectures.length });
});

// ---------- Diagnostic 3: content audit (OpenAI fact-checks every lecture + every "correct" answer) ----------
type LectureIssue = { quote: string; problem: string; fix: string };
type LectureAuditRow = {
  lectureId: number;
  title: string;
  ok: boolean;
  issues: LectureIssue[];
  error?: string;
};
type ProblemAuditRow = {
  problemId: number;
  assignmentTitle: string;
  prompt: string;
  statedAnswer: string;
  ok: boolean;
  issue?: string;
  betterAnswer?: string;
  error?: string;
};

async function auditLecture(
  l: { id: number; title: string; body: string },
): Promise<LectureAuditRow> {
  try {
    const out = await chatJson<{ issues?: LectureIssue[] }>(
      "You are a rigorous fact-checker for a self-knowledge course grounded in psychology and philosophy. " +
        "You scrutinize a single reflective lecture body for FACTUAL ERRORS only — misattributed ideas or quotes, misstated psychology/philosophy concepts (e.g. wrongly describing attachment styles, the Dunning-Kruger effect, or a named thinker's actual argument), wrong names or dates, or self-contradictions. " +
        "Style, tone, completeness, pedagogy, and the absence of citations are OUT OF SCOPE — do NOT flag them. Gentle generalizations about human nature that are broadly supported are NOT errors. " +
        'Respond as strict JSON: {"issues": [{"quote": string, "problem": string, "fix": string}]}. ' +
        '"quote" must be a short verbatim snippet from the lecture (<= 160 chars). "problem" states the error in one sentence. "fix" proposes the correction in one sentence. ' +
        'If the lecture contains no factual errors, respond with {"issues": []}.',
      `LECTURE TITLE: ${l.title}\n\nLECTURE BODY:\n"""\n${l.body}\n"""`,
      TEXT_MODEL,
    );
    const issues = Array.isArray(out?.issues)
      ? out.issues
          .filter(
            (x): x is LectureIssue =>
              !!x && typeof x.quote === "string" && typeof x.problem === "string" && typeof x.fix === "string",
          )
          .slice(0, 20)
      : [];
    return { lectureId: l.id, title: l.title, ok: issues.length === 0, issues };
  } catch (e) {
    return {
      lectureId: l.id,
      title: l.title,
      ok: false,
      issues: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function auditProblem(p: {
  id: number;
  assignmentTitle: string;
  prompt: string;
  correctAnswer: string;
}): Promise<ProblemAuditRow> {
  try {
    const out = await chatJson<{
      verdict?: "correct" | "incorrect" | "ambiguous";
      issue?: string;
      betterAnswer?: string;
    }>(
      "You are a reviewer for a self-knowledge course. There is no single factually correct answer here, but answers vary in depth and honesty. " +
        "You are given a reflective PROMPT and a stored MODEL REFLECTION — a short, first-person example answer whose only job is to show the kind of SINCERITY and DEPTH a real answer can reach (it is never shown to students as a correct answer). " +
        "Decide whether the model reflection is a good fit for its prompt: it should (a) actually respond to what the prompt asks, (b) be written in the first person, (c) be short, and (d) read as a sincere, specific, non-evasive human reflection rather than a generic platitude. " +
        "Judge it on depth and authenticity, not factual correctness. Flag only true mismatches: it answers a different question, isn't first-person, is generic/evasive, or contradicts the prompt. " +
        'Respond as strict JSON: {"verdict": "correct" | "incorrect" | "ambiguous", "issue": string, "betterAnswer": string}. ' +
        'Use "correct" when the model reflection is a good fit. ' +
        'If verdict is "incorrect" or "ambiguous", "issue" must explain the mismatch in one sentence and "betterAnswer" must give a better short first-person model reflection to store instead.',
      `PROMPT:\n"""${p.prompt}"""\n\nSTORED MODEL REFLECTION:\n"""${p.correctAnswer}"""`,
      TEXT_MODEL,
    );
    const verdict = out?.verdict ?? "ambiguous";
    const ok = verdict === "correct";
    return {
      problemId: p.id,
      assignmentTitle: p.assignmentTitle,
      prompt: p.prompt,
      statedAnswer: p.correctAnswer,
      ok,
      issue: ok ? undefined : (out?.issue || "Auditor returned no explanation."),
      betterAnswer: ok ? undefined : (out?.betterAnswer || undefined),
    };
  } catch (e) {
    return {
      problemId: p.id,
      assignmentTitle: p.assignmentTitle,
      prompt: p.prompt,
      statedAnswer: p.correctAnswer,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  worker: (t: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function pump(): Promise<void> {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => pump()));
  return results;
}

router.post("/diagnostics/content-audit", async (_req, res) => {
  res.setTimeout(15 * 60 * 1000);
  try {
    const lectures = await db
      .select({
        id: lecturesTable.id,
        title: lecturesTable.title,
        body: lecturesTable.body,
      })
      .from(lecturesTable)
      .orderBy(asc(lecturesTable.id));

    const problemRows = await db
      .select({
        id: problemsTable.id,
        assignmentId: problemsTable.assignmentId,
        prompt: problemsTable.prompt,
        correctAnswer: problemsTable.correctAnswer,
      })
      .from(problemsTable)
      .orderBy(asc(problemsTable.assignmentId), asc(problemsTable.position));

    const assignmentRows = await db
      .select({ id: assignmentsTable.id, title: assignmentsTable.title })
      .from(assignmentsTable);
    const titleById = new Map(assignmentRows.map((a) => [a.id, a.title]));

    const problems = problemRows.map((p) => ({
      id: p.id,
      assignmentTitle: titleById.get(p.assignmentId) ?? `assignment ${p.assignmentId}`,
      prompt: p.prompt,
      correctAnswer: p.correctAnswer,
    }));

    const [lectureResults, problemResults] = await Promise.all([
      runWithConcurrency(lectures, auditLecture, 4),
      runWithConcurrency(problems, auditProblem, 4),
    ]);

    const lectureIssues = lectureResults.filter((r) => !r.ok || r.issues.length > 0);
    const problemIssues = problemResults.filter((r) => !r.ok);

    res.json({
      ok: lectureIssues.length === 0 && problemIssues.length === 0,
      generatedAt: new Date().toISOString(),
      summary: {
        lecturesChecked: lectureResults.length,
        problemsChecked: problemResults.length,
        lecturesWithIssues: lectureIssues.length,
        problemsWithIssues: problemIssues.length,
      },
      lectureIssues,
      problemIssues,
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

// ---------- Reset: wipe all student progress, keep course content ----------
router.post("/diagnostics/reset", async (_req, res) => {
  // Delete in dependency order. Course content (topics, lectures, assignments,
  // problems) is preserved; only student progress / generated practice is wiped.
  await db.delete(practiceAttemptsTable);
  await db.delete(practiceProblemsTable);
  await db.delete(practiceSessionsTable);
  await db.delete(answersTable);
  await db.delete(attemptsTable);
  res.json({ ok: true, resetAt: new Date().toISOString() });
});

export default router;

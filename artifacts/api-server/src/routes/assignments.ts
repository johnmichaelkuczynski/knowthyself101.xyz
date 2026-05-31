import { Router, type IRouter } from "express";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  db,
  assignmentsTable,
  problemsTable,
  attemptsTable,
  answersTable,
  topicsTable,
  rebuttalsTable,
} from "@workspace/db";
import {
  GetAssignmentResponse,
  ListAssignmentsResponse,
  SaveAnswerBody,
  StartAssignmentAttemptResponse,
  GetAttemptResponse,
  SubmitAttemptResponse,
  ReanalyzeAttemptBody,
  ReanalyzeAttemptResponse,
  AddRebuttalBody,
  AddRebuttalResponse,
  ListRebuttalsResponse,
} from "@workspace/api-zod";
import { gradeAnswer, reconsiderRebuttal } from "../lib/grading";
import { detect } from "../lib/detection";
import { getSettings, activeFramework } from "../lib/settings";
import { frameworksFor, type Mode } from "../lib/frameworks";
import { getPrimaryUserId } from "../lib/users";

const router: IRouter = Router();

function parseIdParam(raw: unknown): number {
  const s = Array.isArray(raw) ? raw[0] : (raw as string);
  return parseInt(s ?? "", 10);
}

router.get("/assignments", async (_req, res) => {
  const userId = await getPrimaryUserId();
  const rows = await db
    .select()
    .from(assignmentsTable)
    .orderBy(asc(assignmentsTable.weekNumber), asc(assignmentsTable.position));
  const result = await Promise.all(
    rows.map(async (a) => {
      const counts = await db.execute(
        sql`select count(*)::int as n from problems where assignment_id = ${a.id}`,
      );
      const n = (counts.rows[0] as { n?: number } | undefined)?.n ?? 0;
      const attempts = await db
        .select()
        .from(attemptsTable)
        .where(and(eq(attemptsTable.assignmentId, a.id), eq(attemptsTable.userId, userId)))
        .orderBy(asc(attemptsTable.id));
      const submitted = attempts.filter((x) => x.status === "submitted");
      const inProgress = attempts.find((x) => x.status === "in_progress");
      const best = submitted.reduce(
        (b, x) => (x.scorePercent != null && x.scorePercent > b ? x.scorePercent : b),
        -1,
      );
      const status: "not_started" | "in_progress" | "submitted" = inProgress
        ? "in_progress"
        : submitted.length > 0
        ? "submitted"
        : "not_started";
      const last = attempts[attempts.length - 1];
      return {
        id: a.id,
        kind: a.kind as "homework" | "test" | "midterm" | "final",
        title: a.title,
        weekNumber: a.weekNumber,
        problemCount: n,
        isTimed: a.isTimed,
        timeLimitMinutes: a.timeLimitMinutes,
        status,
        bestScore: best < 0 ? null : best,
        lastAttemptId: last?.id ?? null,
      };
    }),
  );
  res.json(ListAssignmentsResponse.parse(result));
});

router.get("/assignments/:assignmentId", async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.assignmentId);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const [a] = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id));
  if (!a) {
    res.status(404).json({ error: "not found" });
    return;
  }
  const problems = await db
    .select({
      id: problemsTable.id,
      position: problemsTable.position,
      prompt: problemsTable.prompt,
      topicId: problemsTable.topicId,
      topicTitle: topicsTable.title,
      hint: problemsTable.hint,
    })
    .from(problemsTable)
    .leftJoin(topicsTable, eq(problemsTable.topicId, topicsTable.id))
    .where(eq(problemsTable.assignmentId, id))
    .orderBy(asc(problemsTable.position));
  res.json(
    GetAssignmentResponse.parse({
      id: a.id,
      kind: a.kind as "homework" | "test" | "midterm" | "final",
      title: a.title,
      weekNumber: a.weekNumber,
      isTimed: a.isTimed,
      timeLimitMinutes: a.timeLimitMinutes,
      instructions: a.instructions,
      problems,
    }),
  );
});

async function loadAttempt(attemptId: number, userId: number) {
  const [attempt] = await db
    .select()
    .from(attemptsTable)
    .where(and(eq(attemptsTable.id, attemptId), eq(attemptsTable.userId, userId)));
  if (!attempt) return null;
  const answers = await db
    .select()
    .from(answersTable)
    .where(eq(answersTable.attemptId, attemptId));
  return {
    id: attempt.id,
    assignmentId: attempt.assignmentId,
    status: attempt.status as "in_progress" | "submitted",
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    deadlineAt: attempt.deadlineAt?.toISOString() ?? null,
    answers: answers.map((x) => ({
      problemId: x.problemId,
      answer: x.answer,
      keystrokeCount: x.keystrokeCount,
      eraseCount: x.eraseCount,
      correct: x.correct,
      explanation: x.explanation,
      aiFlagged: x.aiFlagged,
      detectionRationale: x.detectionRationale,
    })),
  };
}

router.post("/assignments/:assignmentId/start", async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.assignmentId);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const [a] = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id));
  if (!a) {
    res.status(404).json({ error: "assignment not found" });
    return;
  }
  const userId = await getPrimaryUserId();

  // Resume the most recent in-progress attempt (deterministic if several exist)
  const [existing] = await db
    .select()
    .from(attemptsTable)
    .where(
      and(
        eq(attemptsTable.assignmentId, id),
        eq(attemptsTable.userId, userId),
        eq(attemptsTable.status, "in_progress"),
      ),
    )
    .orderBy(desc(attemptsTable.id));
  if (existing) {
    const state = await loadAttempt(existing.id, userId);
    res.json(StartAssignmentAttemptResponse.parse(state));
    return;
  }

  const deadlineAt =
    a.isTimed && a.timeLimitMinutes
      ? new Date(Date.now() + a.timeLimitMinutes * 60_000)
      : null;
  const [created] = await db
    .insert(attemptsTable)
    .values({ userId, assignmentId: id, status: "in_progress", deadlineAt })
    .returning();
  if (!created) {
    res.status(500).json({ error: "failed to create" });
    return;
  }
  const state = await loadAttempt(created.id, userId);
  res.json(StartAssignmentAttemptResponse.parse(state));
});

router.get("/assignments/attempts/:attemptId", async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.attemptId);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const userId = await getPrimaryUserId();
  const state = await loadAttempt(id, userId);
  if (!state) {
    res.status(404).json({ error: "attempt not found" });
    return;
  }
  res.json(GetAttemptResponse.parse(state));
});

router.put("/assignments/attempts/:attemptId/answer", async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.attemptId);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const parsed = SaveAnswerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { problemId, answer, trace } = parsed.data;

  const userId = await getPrimaryUserId();
  const [attempt] = await db
    .select()
    .from(attemptsTable)
    .where(and(eq(attemptsTable.id, id), eq(attemptsTable.userId, userId)));
  if (!attempt) {
    res.status(404).json({ error: "attempt not found" });
    return;
  }
  if (attempt.status !== "in_progress") {
    res.status(400).json({ error: "attempt already submitted" });
    return;
  }
  if (attempt.deadlineAt && new Date() > attempt.deadlineAt) {
    res.status(403).json({ error: "time limit exceeded" });
    return;
  }

  const [existing] = await db
    .select()
    .from(answersTable)
    .where(and(eq(answersTable.attemptId, id), eq(answersTable.problemId, problemId)));

  const values = {
    attemptId: id,
    problemId,
    answer,
    keystrokeCount: trace.keystrokeCount,
    eraseCount: trace.eraseCount,
    bulkInsertCount: trace.bulkInsertCount ?? 0,
    longestBulkInsertChars: trace.longestBulkInsertChars ?? 0,
    rewriteSegments: trace.rewriteSegments ?? 0,
    durationMs: trace.durationMs,
    updatedAt: new Date(),
  };
  if (existing) {
    await db.update(answersTable).set(values).where(eq(answersTable.id, existing.id));
  } else {
    await db.insert(answersTable).values(values);
  }
  res.json({ ok: true });
});

router.post("/assignments/attempts/:attemptId/submit", async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.attemptId);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const userId = await getPrimaryUserId();
  const [attempt] = await db
    .select()
    .from(attemptsTable)
    .where(and(eq(attemptsTable.id, id), eq(attemptsTable.userId, userId)));
  if (!attempt) {
    res.status(404).json({ error: "attempt not found" });
    return;
  }
  const problems = await db
    .select()
    .from(problemsTable)
    .where(eq(problemsTable.assignmentId, attempt.assignmentId))
    .orderBy(asc(problemsTable.position));
  const answers = await db
    .select()
    .from(answersTable)
    .where(eq(answersTable.attemptId, id));
  const byProblem = new Map(answers.map((a) => [a.problemId, a]));

  const settings = await getSettings();
  const perProblem = [];
  const detection = [];
  let score = 0;
  for (const p of problems) {
    const a = byProblem.get(p.id);
    const userAnswer = a?.answer ?? "";
    const graded = await gradeAnswer({
      prompt: p.prompt,
      correctAnswer: p.correctAnswer,
      userAnswer,
      mode: settings.mode,
      framework: activeFramework(settings),
    });
    if (graded.correct) score += 1;
    perProblem.push({
      problemId: p.id,
      correct: graded.correct,
      userAnswer,
      explanation: graded.explanation || p.explanation,
    });

    if (a && userAnswer.trim().length > 0) {
      const det = await detect(userAnswer, {
        keystrokeCount: a.keystrokeCount,
        eraseCount: a.eraseCount,
        bulkInsertCount: a.bulkInsertCount,
        longestBulkInsertChars: a.longestBulkInsertChars,
        rewriteSegments: a.rewriteSegments,
        durationMs: a.durationMs,
      });
      detection.push({ problemId: p.id, ...det });
      await db
        .update(answersTable)
        .set({
          correct: graded.correct,
          explanation: graded.explanation || p.explanation,
          aiScore: det.aiScore,
          aiFlagged: det.aiFlagged,
          diachronicScore: det.diachronicScore,
          diachronicFlagged: det.diachronicFlagged,
          detectionRationale: det.rationale,
        })
        .where(eq(answersTable.id, a.id));
    } else if (a) {
      await db
        .update(answersTable)
        .set({ correct: graded.correct, explanation: graded.explanation || p.explanation })
        .where(eq(answersTable.id, a.id));
    }
  }

  const total = problems.length;
  const percent = total === 0 ? 0 : (score / total) * 100;
  await db
    .update(attemptsTable)
    .set({
      status: "submitted",
      submittedAt: new Date(),
      scorePercent: percent,
    })
    .where(eq(attemptsTable.id, id));

  res.json(
    SubmitAttemptResponse.parse({
      attemptId: id,
      score,
      total,
      percent,
      perProblem,
      detection,
    }),
  );
});

// Re-read a SUBMITTED attempt's answers through a chosen lens, as an ephemeral
// "what would the app have said" preview. This re-runs the grader with the chosen
// mode + framework and returns fresh explanations WITHOUT persisting anything:
// the stored feedback and the user's global Lens setting are left untouched.
router.post("/assignments/attempts/:attemptId/reanalyze", async (req, res): Promise<void> => {
  const id = parseIdParam(req.params.attemptId);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  const parsed = ReanalyzeAttemptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const mode: Mode = parsed.data.mode === "career" ? "career" : "self_knowledge";
  const requested = parsed.data.framework || "auto";
  // Clamp a framework that doesn't belong to the chosen mode back to "auto".
  const framework =
    requested === "auto" || frameworksFor(mode).some((f) => f.id === requested)
      ? requested
      : "auto";

  const userId = await getPrimaryUserId();
  const [attempt] = await db
    .select()
    .from(attemptsTable)
    .where(and(eq(attemptsTable.id, id), eq(attemptsTable.userId, userId)));
  if (!attempt) {
    res.status(404).json({ error: "attempt not found" });
    return;
  }
  // Re-analysis is a what-if on a FINISHED attempt; an in-progress one has no
  // settled answers to re-read, so refuse it rather than grade a draft.
  if (attempt.status !== "submitted") {
    res.status(409).json({ error: "attempt not submitted" });
    return;
  }

  const problems = await db
    .select()
    .from(problemsTable)
    .where(eq(problemsTable.assignmentId, attempt.assignmentId))
    .orderBy(asc(problemsTable.position));
  const answers = await db
    .select()
    .from(answersTable)
    .where(eq(answersTable.attemptId, id));
  const byProblem = new Map(answers.map((a) => [a.problemId, a]));

  // Grade each answered prompt through the chosen lens in parallel (read-only).
  const items = await Promise.all(
    problems.map(async (p) => {
      const userAnswer = byProblem.get(p.id)?.answer ?? "";
      if (userAnswer.trim().length === 0) {
        return { problemId: p.id, correct: false, explanation: "" };
      }
      const graded = await gradeAnswer({
        prompt: p.prompt,
        correctAnswer: p.correctAnswer,
        userAnswer,
        mode,
        framework,
      });
      return {
        problemId: p.id,
        correct: graded.correct,
        explanation: graded.explanation,
      };
    }),
  );

  res.json(ReanalyzeAttemptResponse.parse({ mode, framework, items }));
});

// --- Push back on the app's reading of an answer ---------------------------
// The student can challenge the critique of any one reflection. This is good in
// itself, it gives the app a dynamic look at how the person argues and defends,
// and — when the push-back is fair — it can move the app to revise its first
// reading. Unlike re-analysis, the exchange IS persisted: it's real data about
// the user and it feeds the evolving self-portrait. Keyed by attempt + problem.

// Resolve an owner-scoped, submitted attempt and its answered problem in one go.
async function loadRebuttalContext(attemptId: number, problemId: number) {
  const userId = await getPrimaryUserId();
  const [attempt] = await db
    .select()
    .from(attemptsTable)
    .where(and(eq(attemptsTable.id, attemptId), eq(attemptsTable.userId, userId)));
  if (!attempt) return { error: 404 as const };
  const [problem] = await db
    .select()
    .from(problemsTable)
    .where(and(eq(problemsTable.id, problemId), eq(problemsTable.assignmentId, attempt.assignmentId)));
  if (!problem) return { error: 404 as const };
  const [answer] = await db
    .select()
    .from(answersTable)
    .where(and(eq(answersTable.attemptId, attemptId), eq(answersTable.problemId, problemId)));
  return { userId, attempt, problem, answer };
}

router.get(
  "/assignments/attempts/:attemptId/problems/:problemId/rebuttals",
  async (req, res): Promise<void> => {
    const attemptId = parseIdParam(req.params.attemptId);
    const problemId = parseIdParam(req.params.problemId);
    if (!Number.isFinite(attemptId) || !Number.isFinite(problemId)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    const ctx = await loadRebuttalContext(attemptId, problemId);
    if ("error" in ctx) {
      res.status(404).json({ error: "attempt or problem not found" });
      return;
    }
    const rows = await db
      .select()
      .from(rebuttalsTable)
      .where(
        and(
          eq(rebuttalsTable.attemptId, attemptId),
          eq(rebuttalsTable.problemId, problemId),
          eq(rebuttalsTable.userId, ctx.userId),
        ),
      )
      .orderBy(asc(rebuttalsTable.createdAt), asc(rebuttalsTable.id));
    res.json(
      ListRebuttalsResponse.parse({
        items: rows.map((r) => ({
          id: r.id,
          userMessage: r.userMessage,
          appResponse: r.appResponse,
          revised: r.revised,
          createdAt: (r.createdAt as Date).toISOString(),
        })),
      }),
    );
  },
);

router.post(
  "/assignments/attempts/:attemptId/problems/:problemId/rebuttals",
  async (req, res): Promise<void> => {
    const attemptId = parseIdParam(req.params.attemptId);
    const problemId = parseIdParam(req.params.problemId);
    if (!Number.isFinite(attemptId) || !Number.isFinite(problemId)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    const parsed = AddRebuttalBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const message = parsed.data.message.trim();
    if (message.length === 0) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    const ctx = await loadRebuttalContext(attemptId, problemId);
    if ("error" in ctx) {
      res.status(404).json({ error: "attempt or problem not found" });
      return;
    }
    // You can only argue with a reading that exists — so the attempt must be
    // finished and the prompt must actually have been answered.
    if (ctx.attempt.status !== "submitted") {
      res.status(409).json({ error: "attempt not submitted" });
      return;
    }
    if (!ctx.answer || (ctx.answer.answer ?? "").trim().length === 0) {
      res.status(409).json({ error: "no answer to reconsider" });
      return;
    }

    const prior = await db
      .select()
      .from(rebuttalsTable)
      .where(
        and(
          eq(rebuttalsTable.attemptId, attemptId),
          eq(rebuttalsTable.problemId, problemId),
          eq(rebuttalsTable.userId, ctx.userId),
        ),
      )
      .orderBy(asc(rebuttalsTable.createdAt), asc(rebuttalsTable.id));

    const settings = await getSettings();
    const reconsidered = await reconsiderRebuttal({
      prompt: ctx.problem.prompt,
      correctAnswer: ctx.problem.correctAnswer,
      userAnswer: ctx.answer.answer,
      originalFeedback: ctx.answer.explanation ?? "",
      priorTurns: prior.map((t) => ({
        userMessage: t.userMessage,
        appResponse: t.appResponse,
      })),
      userMessage: message,
      mode: settings.mode,
      framework: activeFramework(settings),
    });

    const [saved] = await db
      .insert(rebuttalsTable)
      .values({
        attemptId,
        problemId,
        userId: ctx.userId,
        userMessage: message,
        appResponse: reconsidered.response,
        revised: reconsidered.revised,
      })
      .returning();

    res.json(
      AddRebuttalResponse.parse({
        id: saved.id,
        userMessage: saved.userMessage,
        appResponse: saved.appResponse,
        revised: saved.revised,
        createdAt: (saved.createdAt as Date).toISOString(),
      }),
    );
  },
);

export default router;

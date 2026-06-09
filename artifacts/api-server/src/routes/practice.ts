import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  topicsTable,
  practiceSessionsTable,
  practiceProblemsTable,
  practiceAttemptsTable,
} from "@workspace/db";
import {
  StartPracticeSessionBody,
  StartPracticeSessionResponse,
  NextPracticeProblemBody,
  NextPracticeProblemResponse,
  GradePracticeAnswerBody,
  GradePracticeAnswerResponse,
} from "@workspace/api-zod";
import { chatJson } from "../lib/ai";
import { gradeAnswer } from "../lib/grading";
import { getSettings, activeFramework } from "../lib/settings";
import { getPrimaryUserId } from "../lib/users";
import { getLearnedUserContext, renderLearnedContext } from "../lib/learnedContext";

const router: IRouter = Router();

function parseIdParam(raw: unknown): number {
  const s = Array.isArray(raw) ? raw[0] : (raw as string);
  return parseInt(s ?? "", 10);
}

async function pickTopicId(
  weekNumber: number | null | undefined,
  preferred: number | null | undefined,
  focusOnWeaknesses: boolean,
  userId: number,
): Promise<{ id: number; title: string; weekNumber: number }> {
  if (preferred != null) {
    const [t] = await db.select().from(topicsTable).where(eq(topicsTable.id, preferred));
    if (t) return { id: t.id, title: t.title, weekNumber: t.weekNumber };
  }
  const candidates = weekNumber
    ? await db.select().from(topicsTable).where(eq(topicsTable.weekNumber, weekNumber))
    : await db.select().from(topicsTable);

  if (focusOnWeaknesses) {
    // Weakness stats are scoped to this session's owner so one user's history
    // never steers another's adaptive difficulty.
    const stats = await db.execute(sql`
      select pa.topic_id as topic_id, count(*)::int as n,
             avg(case when pa.correct then 1.0 else 0.0 end) as acc
      from practice_attempts pa
      join practice_sessions ps on pa.session_id = ps.id
      where ps.user_id = ${userId}
      group by pa.topic_id
    `);
    const byId = new Map<number, { n: number; acc: number }>();
    for (const r of stats.rows as Array<{ topic_id: number; n: number; acc: number }>) {
      byId.set(Number(r.topic_id), { n: Number(r.n), acc: Number(r.acc) });
    }
    // weight = (1 - accuracy) + small bonus for low-attempted topics
    const scored = candidates.map((t) => {
      const s = byId.get(t.id);
      const acc = s?.acc ?? 0.5;
      const n = s?.n ?? 0;
      const weight = (1 - acc) * 2 + (n < 3 ? 1 : 0) + Math.random() * 0.3;
      return { t, weight };
    });
    scored.sort((a, b) => b.weight - a.weight);
    const choice = scored[0]?.t ?? candidates[Math.floor(Math.random() * candidates.length)]!;
    return { id: choice.id, title: choice.title, weekNumber: choice.weekNumber };
  }
  const choice = candidates[Math.floor(Math.random() * candidates.length)]!;
  return { id: choice.id, title: choice.title, weekNumber: choice.weekNumber };
}

router.post("/practice/sessions", async (req, res): Promise<void> => {
  const parsed = StartPracticeSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { weekNumber, topicId, tutorEnabled, focusOnWeaknesses, initialDifficulty } =
    parsed.data;
  const startDifficulty =
    typeof initialDifficulty === "number" && !Number.isNaN(initialDifficulty)
      ? Math.max(1, Math.min(5, initialDifficulty))
      : 2.0;
  const userId = await getPrimaryUserId();
  const [created] = await db
    .insert(practiceSessionsTable)
    .values({
      userId,
      weekNumber: weekNumber ?? null,
      topicId: topicId ?? null,
      tutorEnabled,
      focusOnWeaknesses: focusOnWeaknesses ?? true,
      difficulty: startDifficulty,
    })
    .returning();
  if (!created) {
    res.status(500).json({ error: "failed" });
    return;
  }
  res.json(
    StartPracticeSessionResponse.parse({
      id: created.id,
      tutorEnabled: created.tutorEnabled,
      difficulty: created.difficulty,
      weekNumber: created.weekNumber,
      topicId: created.topicId,
      focusOnWeaknesses: created.focusOnWeaknesses,
    }),
  );
});

router.post("/practice/sessions/:sessionId/next", async (req, res): Promise<void> => {
  const sessionId = parseIdParam(req.params.sessionId);
  const parsed = NextPracticeProblemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = await getPrimaryUserId();
  const [session] = await db
    .select()
    .from(practiceSessionsTable)
    .where(and(eq(practiceSessionsTable.id, sessionId), eq(practiceSessionsTable.userId, userId)));
  if (!session) {
    res.status(404).json({ error: "session not found" });
    return;
  }

  const topic = await pickTopicId(
    session.weekNumber,
    parsed.data.topicId ?? session.topicId,
    session.focusOnWeaknesses,
    userId,
  );

  const lastProblems = await db
    .select({ prompt: practiceProblemsTable.prompt })
    .from(practiceProblemsTable)
    .where(
      and(
        eq(practiceProblemsTable.sessionId, sessionId),
        eq(practiceProblemsTable.topicId, topic.id),
      ),
    )
    .orderBy(desc(practiceProblemsTable.id))
    .limit(3);

  const difficulty = Math.max(1, Math.min(5, session.difficulty));
  const difficultyLabel =
    difficulty <= 1.7
      ? "very easy"
      : difficulty <= 2.5
      ? "easy"
      : difficulty <= 3.3
      ? "medium"
      : difficulty <= 4.1
      ? "hard"
      : "challenging";

  const userRequest = parsed.data.request?.trim() || "";
  // On a self-knowledge course, "difficulty" maps to how DEEP/vulnerable the
  // reflective prompt asks the person to go — gentle and surface at low levels,
  // searching and tender at high levels. There is no factually correct answer, but shallow or phony answers fail; the
  // `correctAnswer` field holds a short first-person MODEL REFLECTION showing the
  // kind of depth a sincere answer can reach (used by the grader, never shown as
  // a key). `explanation` notes what the question tends to reveal.
  const depthLabel =
    difficulty <= 1.7
      ? "gentle and easy to answer"
      : difficulty <= 2.5
      ? "lightly probing"
      : difficulty <= 3.3
      ? "honestly searching"
      : difficulty <= 4.1
      ? "deep and a little vulnerable"
      : "deeply searching and tender";
  // What the app has learned about this person already, so the prompt can build
  // on a thread they've revealed rather than starting cold. Best-effort.
  let learnedBlock = "";
  try {
    const learned = renderLearnedContext(await getLearnedUserContext(userId));
    if (learned) {
      learnedBlock =
        ` You also have MEMORY of what this person has already revealed in earlier answers (their own words) and the self-portrait drawn from them:\n"""\n${learned}\n"""\n` +
        `When a thread from that memory genuinely connects to "${topic.title}", prefer to build this prompt on it — name the specific thing they revealed and push it one layer deeper. Otherwise stay on the topic. Treat the portrait as a hunch to test, never as established fact. Still demand a concrete, self-revealing answer about their own life.`;
    }
  } catch {
    learnedBlock = "";
  }

  let generated: { prompt: string; correctAnswer: string; explanation: string };
  try {
    generated = await chatJson<{
      prompt: string;
      correctAnswer: string;
      explanation: string;
    }>(
      `You generate a single short reflective prompt for a self-knowledge course. The prompt MUST be on the topic "${topic.title}" and should be ${depthLabel} (depth ${difficulty.toFixed(
        1,
      )}/5). It must invite a SHORT, honest, first-person answer (a sentence or two) about the person's own life — there is no single correct answer, but a real answer must be specific and self-revealing. ` +
        `Return: "prompt" (the reflective question, plain language, no jargon), "correctAnswer" (a short, plausible first-person MODEL REFLECTION showing the kind of depth a sincere answer reaches — this is a reference, never shown to the user as correct), and "explanation" (one sentence on what this question tends to reveal). ` +
        learnedBlock +
        ` Respond as strict JSON: {"prompt": string, "correctAnswer": string, "explanation": string}. Avoid these recent prompts: ${JSON.stringify(
          lastProblems.map((p) => p.prompt),
        )}.`,
      userRequest || `Generate a new ${depthLabel} reflective prompt on ${topic.title}.`,
    );
  } catch {
    generated = {
      prompt: `Reflecting on ${topic.title.toLowerCase()}: in a sentence or two, what's the most honest thing you can say about this in your own life right now?`,
      correctAnswer:
        "The honest answer is that I haven't looked at this closely before, and what comes up first is discomfort I usually move past quickly.",
      explanation:
        "What you reach for first — and whether you let yourself stay with it — is itself revealing.",
    };
  }

  const [stored] = await db
    .insert(practiceProblemsTable)
    .values({
      sessionId,
      topicId: topic.id,
      prompt: generated.prompt,
      correctAnswer: generated.correctAnswer,
      explanation: generated.explanation,
      difficulty,
    })
    .returning();
  if (!stored) {
    res.status(500).json({ error: "failed" });
    return;
  }

  res.json(
    NextPracticeProblemResponse.parse({
      id: stored.id,
      prompt: stored.prompt,
      topicId: topic.id,
      topicTitle: topic.title,
      difficulty,
    }),
  );
});

router.post("/practice/sessions/:sessionId/grade", async (req, res): Promise<void> => {
  const sessionId = parseIdParam(req.params.sessionId);
  const parsed = GradePracticeAnswerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { problemId, answer, trace } = parsed.data;
  const userId = await getPrimaryUserId();
  const [session] = await db
    .select()
    .from(practiceSessionsTable)
    .where(and(eq(practiceSessionsTable.id, sessionId), eq(practiceSessionsTable.userId, userId)));
  if (!session) {
    res.status(404).json({ error: "session not found" });
    return;
  }
  const [problem] = await db
    .select()
    .from(practiceProblemsTable)
    .where(
      and(
        eq(practiceProblemsTable.id, problemId),
        eq(practiceProblemsTable.sessionId, sessionId),
      ),
    );
  if (!problem) {
    res.status(404).json({ error: "problem not found in this session" });
    return;
  }

  const settings = await getSettings();
  const graded = await gradeAnswer({
    prompt: problem.prompt,
    correctAnswer: problem.correctAnswer,
    userAnswer: answer,
    mode: settings.mode,
    framework: activeFramework(settings),
    stance: settings.stance,
  });

  await db.insert(practiceAttemptsTable).values({
    sessionId,
    problemId,
    topicId: problem.topicId,
    answer,
    correct: graded.correct,
    difficulty: problem.difficulty,
    trace,
  });

  const delta = graded.correct ? 0.4 : -0.5;
  const newDifficulty = Math.max(1, Math.min(5, session.difficulty + delta));
  await db
    .update(practiceSessionsTable)
    .set({ difficulty: newDifficulty })
    .where(eq(practiceSessionsTable.id, sessionId));

  let tutorTip: string | null = null;
  if (session.tutorEnabled && !graded.correct) {
    try {
      tutorTip = (
        await chatJson<{ tip: string }>(
          "You are a warm but honest guide on a self-knowledge course. The person gave a shallow, generic, evasive, or phony answer that didn't actually meet the reflective question. In 2 sentences max, tell them plainly that this answer falls short and name why, then invite a more honest, specific answer. Don't scold, but don't pretend it was fine. Respond as strict JSON: {\"tip\": string}.",
          JSON.stringify({
            prompt: problem.prompt,
            studentAnswer: answer,
          }),
        )
      ).tip;
    } catch {
      tutorTip = null;
    }
  }

  res.json(
    GradePracticeAnswerResponse.parse({
      problemId,
      correct: graded.correct,
      explanation: graded.explanation || problem.explanation,
      newDifficulty,
      tutorTip,
    }),
  );
});

export default router;

import { and, desc, eq } from "drizzle-orm";
import {
  db,
  topicsTable,
  attemptsTable,
  answersTable,
  problemsTable,
  practiceAttemptsTable,
  practiceProblemsTable,
  practiceSessionsTable,
  profileReportsTable,
} from "@workspace/db";

export type LearnedReflection = {
  topic: string;
  question: string;
  answer: string;
};

export type LearnedUserContext = {
  /** Total reflections this user has written (assignment + practice). */
  answeredCount: number;
  /** A recent, representative sample of what the user has already revealed. */
  recentReflections: LearnedReflection[];
  /** The most recent saved self-portrait for this user, if one exists. */
  portrait: { narrative: string; patterns: string[]; tensions: string[] } | null;
};

/**
 * Gather what the app has LEARNED about one user so far — a sample of their own
 * earlier answers plus the latest saved self-portrait — so that newly generated
 * questions can build on what the person has already revealed instead of starting
 * cold every time. Scoped strictly by userId. Read-only; safe to call anywhere.
 */
export async function getLearnedUserContext(
  userId: number,
  opts: { maxReflections?: number } = {},
): Promise<LearnedUserContext> {
  const maxReflections = opts.maxReflections ?? 14;

  // Bound how much history we ever pull back from each source. A single-user
  // course never has much, but this keeps these hot generation routes cheap even
  // as answers accumulate. We over-fetch a little (×4) so dedupe still has a
  // representative recent window to choose from.
  const scanLimit = Math.max(maxReflections * 4, 60);

  const submittedRows = await db
    .select({
      topicTitle: topicsTable.title,
      problemId: problemsTable.id,
      prompt: problemsTable.prompt,
      answer: answersTable.answer,
      at: attemptsTable.submittedAt,
    })
    .from(answersTable)
    .innerJoin(attemptsTable, eq(answersTable.attemptId, attemptsTable.id))
    .innerJoin(problemsTable, eq(answersTable.problemId, problemsTable.id))
    .innerJoin(topicsTable, eq(problemsTable.topicId, topicsTable.id))
    .where(and(eq(attemptsTable.status, "submitted"), eq(attemptsTable.userId, userId)))
    .orderBy(desc(attemptsTable.submittedAt))
    .limit(scanLimit);

  const practiceRows = await db
    .select({
      topicTitle: topicsTable.title,
      prompt: practiceProblemsTable.prompt,
      answer: practiceAttemptsTable.answer,
      at: practiceAttemptsTable.createdAt,
    })
    .from(practiceAttemptsTable)
    .innerJoin(
      practiceProblemsTable,
      eq(practiceAttemptsTable.problemId, practiceProblemsTable.id),
    )
    .innerJoin(
      practiceSessionsTable,
      eq(practiceAttemptsTable.sessionId, practiceSessionsTable.id),
    )
    .innerJoin(topicsTable, eq(practiceAttemptsTable.topicId, topicsTable.id))
    .where(eq(practiceSessionsTable.userId, userId))
    .orderBy(desc(practiceAttemptsTable.createdAt))
    .limit(scanLimit);

  type Stamped = LearnedReflection & { ts: number };
  const tsOf = (at: Date | string | null): number =>
    at ? new Date(at).getTime() : 0;

  // Keep the LATEST answer per assignment question (the person's current self).
  // Rows arrive newest→oldest, so the first time we see a problemId is its most
  // recent answer; ignore older ones.
  const latestAssignment = new Map<number, Stamped>();
  for (const r of submittedRows) {
    if (!(r.answer ?? "").trim()) continue;
    if (latestAssignment.has(r.problemId)) continue;
    latestAssignment.set(r.problemId, {
      topic: r.topicTitle,
      question: r.prompt,
      answer: r.answer,
      ts: tsOf(r.at),
    });
  }
  const practice: Stamped[] = practiceRows
    .filter((r) => (r.answer ?? "").trim().length > 0)
    .map((r) => ({
      topic: r.topicTitle,
      question: r.prompt,
      answer: r.answer,
      ts: tsOf(r.at),
    }));

  // Merge both sources and order by true recency, so the tail is genuinely the
  // most recent things the person has revealed regardless of which surface.
  const combined = [...Array.from(latestAssignment.values()), ...practice].sort(
    (a, b) => a.ts - b.ts,
  );
  const answeredCount = combined.length;
  const recentReflections: LearnedReflection[] = combined
    .slice(-maxReflections)
    .map(({ topic, question, answer }) => ({ topic, question, answer }));

  const [report] = await db
    .select()
    .from(profileReportsTable)
    .where(eq(profileReportsTable.userId, userId))
    .orderBy(desc(profileReportsTable.createdAt), desc(profileReportsTable.id))
    .limit(1);
  const portrait = report
    ? {
        narrative: report.narrative,
        patterns: report.patterns ?? [],
        tensions: report.tensions ?? [],
      }
    : null;

  return { answeredCount, recentReflections, portrait };
}

/**
 * Render a learned-context block for embedding in a generation prompt. Returns
 * null when the app has learned nothing about the user yet, so callers can fall
 * back to lecture-only behavior.
 */
export function renderLearnedContext(ctx: LearnedUserContext): string | null {
  if (ctx.answeredCount === 0 && !ctx.portrait) return null;
  const payload = {
    earlierAnswers: ctx.recentReflections.map((r) => ({
      topic: r.topic,
      question: r.question,
      answer: r.answer,
    })),
    portraitSoFar: ctx.portrait
      ? {
          reading: ctx.portrait.narrative,
          patterns: ctx.portrait.patterns,
          tensions: ctx.portrait.tensions,
        }
      : null,
  };
  return JSON.stringify(payload);
}

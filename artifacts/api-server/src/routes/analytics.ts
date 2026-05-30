import { Router, type IRouter } from "express";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  db,
  topicsTable,
  attemptsTable,
  practiceAttemptsTable,
  practiceSessionsTable,
  assignmentsTable,
  profileReportsTable,
} from "@workspace/db";
import {
  GetAnalyticsSummaryResponse,
  GetTopicAnalyticsResponse,
  GetRecentActivityResponse,
  GenerateReportResponse,
  GetLatestReportResponse,
  GetReportHistoryResponse,
} from "@workspace/api-zod";
import { getSettings } from "../lib/settings";
import { getPrimaryUserId } from "../lib/users";
import { generateProfileReport } from "../lib/profile";

const router: IRouter = Router();

// Shape a stored snapshot row into the API ProfileReport. The narrative is stored
// exactly as it was shown (provenance line included), so a loaded snapshot reads
// identically to the moment it was generated.
function toProfileReport(row: typeof profileReportsTable.$inferSelect) {
  return {
    id: row.id,
    generatedAt: (row.createdAt as Date).toISOString(),
    mode: row.mode,
    framework: row.framework,
    narrative: row.narrative,
    strengths: row.patterns ?? [],
    weaknesses: row.tensions ?? [],
    recommendations: row.questions ?? [],
    answeredCount: row.answeredCount,
  };
}

type StrengthLabel = "strong" | "solid" | "developing" | "weak" | "untested";
function labelFor(accuracy: number, attempts: number): StrengthLabel {
  if (attempts === 0) return "untested";
  if (accuracy >= 0.9) return "strong";
  if (accuracy >= 0.75) return "solid";
  if (accuracy >= 0.5) return "developing";
  return "weak";
}

// Per-topic practice stats for ONE user. Practice attempts carry no owner of their
// own, so we scope them through their session's userId.
async function topicStats(userId: number) {
  const topics = await db
    .select()
    .from(topicsTable)
    .orderBy(asc(topicsTable.position));
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
  return topics.map((t) => {
    const s = byId.get(t.id);
    const attempts = s?.n ?? 0;
    const accuracy = attempts === 0 ? 0 : s!.acc;
    return {
      topicId: t.id,
      topicTitle: t.title,
      weekNumber: t.weekNumber,
      attempts,
      accuracy: Number(accuracy.toFixed(3)),
      strengthLabel: labelFor(accuracy, attempts),
    };
  });
}

router.get("/analytics/summary", async (_req, res) => {
  const userId = await getPrimaryUserId();
  const submitted = await db
    .select()
    .from(attemptsTable)
    .where(and(eq(attemptsTable.status, "submitted"), eq(attemptsTable.userId, userId)));
  const officialAverage =
    submitted.length === 0
      ? 0
      : submitted.reduce((s, a) => s + (a.scorePercent ?? 0), 0) / submitted.length;

  const practice = await db
    .select({
      correct: practiceAttemptsTable.correct,
      createdAt: practiceAttemptsTable.createdAt,
    })
    .from(practiceAttemptsTable)
    .innerJoin(
      practiceSessionsTable,
      eq(practiceAttemptsTable.sessionId, practiceSessionsTable.id),
    )
    .where(eq(practiceSessionsTable.userId, userId));
  const practiceCorrect = practice.filter((p) => p.correct).length;
  const practiceAccuracy =
    practice.length === 0 ? 0 : (practiceCorrect / practice.length) * 100;

  const days = new Set<string>();
  for (const p of practice) days.add(new Date(p.createdAt).toISOString().slice(0, 10));
  for (const a of submitted)
    if (a.submittedAt) days.add(new Date(a.submittedAt).toISOString().slice(0, 10));

  // streak: consecutive days ending today
  let streakDays = 0;
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (days.has(key)) streakDays++;
    else if (i > 0) break;
  }

  const topics = await topicStats(userId);
  const tested = topics.filter((t) => t.attempts > 0);
  tested.sort((a, b) => b.accuracy - a.accuracy);
  const strongest = tested[0]?.topicTitle ?? null;
  const weakest = tested[tested.length - 1]?.topicTitle ?? null;

  res.json(
    GetAnalyticsSummaryResponse.parse({
      officialAverage: Number(officialAverage.toFixed(2)),
      practiceAccuracy: Number(practiceAccuracy.toFixed(2)),
      attemptsCount: submitted.length,
      practiceCount: practice.length,
      streakDays,
      strongestTopic: strongest,
      weakestTopic: weakest,
    }),
  );
});

router.get("/analytics/topics", async (_req, res) => {
  const userId = await getPrimaryUserId();
  const rows = await topicStats(userId);
  res.json(GetTopicAnalyticsResponse.parse(rows));
});

router.get("/analytics/activity", async (_req, res) => {
  const userId = await getPrimaryUserId();
  const recentPractice = await db
    .select({
      id: practiceAttemptsTable.id,
      createdAt: practiceAttemptsTable.createdAt,
      correct: practiceAttemptsTable.correct,
      topicId: practiceAttemptsTable.topicId,
    })
    .from(practiceAttemptsTable)
    .innerJoin(
      practiceSessionsTable,
      eq(practiceAttemptsTable.sessionId, practiceSessionsTable.id),
    )
    .where(eq(practiceSessionsTable.userId, userId))
    .orderBy(desc(practiceAttemptsTable.id))
    .limit(20);
  const topics = await db.select().from(topicsTable);
  const topicById = new Map(topics.map((t) => [t.id, t.title]));

  const recentAttempts = await db
    .select({
      id: attemptsTable.id,
      submittedAt: attemptsTable.submittedAt,
      scorePercent: attemptsTable.scorePercent,
      assignmentId: attemptsTable.assignmentId,
    })
    .from(attemptsTable)
    .where(and(eq(attemptsTable.status, "submitted"), eq(attemptsTable.userId, userId)))
    .orderBy(desc(attemptsTable.id))
    .limit(20);
  const assignments = await db.select().from(assignmentsTable);
  const aById = new Map(assignments.map((a) => [a.id, a.title]));

  const items = [
    ...recentPractice.map((p) => ({
      id: p.id,
      kind: "practice" as const,
      title: `Practice — ${topicById.get(p.topicId) ?? "Topic"}`,
      at: p.createdAt.toISOString(),
      score: p.correct ? 100 : 0,
      topicTitle: topicById.get(p.topicId) ?? null,
    })),
    ...recentAttempts.map((a) => ({
      id: a.id + 1_000_000,
      kind: "assignment" as const,
      title: aById.get(a.assignmentId) ?? "Assignment",
      at: (a.submittedAt ?? new Date()).toISOString(),
      score: a.scorePercent ?? null,
      topicTitle: null,
    })),
  ].sort((x, y) => y.at.localeCompare(x.at));

  res.json(GetRecentActivityResponse.parse(items.slice(0, 30)));
});

// Build (or evolve) the actual user's psychological self-portrait from every
// reflection they've submitted. The heavy lifting lives in generateProfileReport
// so the same evolving-profile pipeline can be exercised by the diagnostics for
// the synthetic user, in complete isolation from this one.
router.post("/analytics/report", async (_req, res) => {
  const settings = await getSettings();
  const userId = await getPrimaryUserId();
  const report = await generateProfileReport(userId, settings);
  res.json(
    GenerateReportResponse.parse({
      generatedAt: report.generatedAt,
      narrative: report.narrative,
      strengths: report.strengths,
      weaknesses: report.weaknesses,
      recommendations: report.recommendations,
    }),
  );
});

// The most recently saved reading for the current mode — loaded when the analytics
// page opens so the profile persists across visits instead of starting blank.
router.get("/analytics/report/latest", async (_req, res) => {
  const settings = await getSettings();
  const userId = await getPrimaryUserId();
  const [row] = await db
    .select()
    .from(profileReportsTable)
    .where(and(eq(profileReportsTable.mode, settings.mode), eq(profileReportsTable.userId, userId)))
    .orderBy(desc(profileReportsTable.createdAt), desc(profileReportsTable.id))
    .limit(1);
  res.json(
    GetLatestReportResponse.parse({
      report: row ? toProfileReport(row) : null,
    }),
  );
});

// Past snapshots for the current mode, newest first — the visible record of how the
// profile has developed over time.
router.get("/analytics/report/history", async (_req, res) => {
  const settings = await getSettings();
  const userId = await getPrimaryUserId();
  const rows = await db
    .select()
    .from(profileReportsTable)
    .where(and(eq(profileReportsTable.mode, settings.mode), eq(profileReportsTable.userId, userId)))
    .orderBy(desc(profileReportsTable.createdAt), desc(profileReportsTable.id))
    .limit(50);
  res.json(GetReportHistoryResponse.parse(rows.map(toProfileReport)));
});

export default router;

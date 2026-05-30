import { Router, type IRouter } from "express";
import { asc, desc, eq, sql } from "drizzle-orm";
import {
  db,
  topicsTable,
  attemptsTable,
  practiceAttemptsTable,
  practiceProblemsTable,
  assignmentsTable,
  answersTable,
  problemsTable,
} from "@workspace/db";
import {
  GetAnalyticsSummaryResponse,
  GetTopicAnalyticsResponse,
  GetRecentActivityResponse,
  GenerateReportResponse,
} from "@workspace/api-zod";
import { chatJson, TEXT_MODEL } from "../lib/ai";

const router: IRouter = Router();

type StrengthLabel = "strong" | "solid" | "developing" | "weak" | "untested";
function labelFor(accuracy: number, attempts: number): StrengthLabel {
  if (attempts === 0) return "untested";
  if (accuracy >= 0.9) return "strong";
  if (accuracy >= 0.75) return "solid";
  if (accuracy >= 0.5) return "developing";
  return "weak";
}

async function topicStats() {
  const topics = await db
    .select()
    .from(topicsTable)
    .orderBy(asc(topicsTable.position));
  const stats = await db.execute(sql`
    select topic_id, count(*)::int as n, avg(case when correct then 1.0 else 0.0 end) as acc
    from practice_attempts group by topic_id
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
  const submitted = await db
    .select()
    .from(attemptsTable)
    .where(eq(attemptsTable.status, "submitted"));
  const officialAverage =
    submitted.length === 0
      ? 0
      : submitted.reduce((s, a) => s + (a.scorePercent ?? 0), 0) / submitted.length;

  const practice = await db.select().from(practiceAttemptsTable);
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

  const topics = await topicStats();
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
  const rows = await topicStats();
  res.json(GetTopicAnalyticsResponse.parse(rows));
});

router.get("/analytics/activity", async (_req, res) => {
  const recentPractice = await db
    .select({
      id: practiceAttemptsTable.id,
      createdAt: practiceAttemptsTable.createdAt,
      correct: practiceAttemptsTable.correct,
      topicId: practiceAttemptsTable.topicId,
    })
    .from(practiceAttemptsTable)
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
    .where(eq(attemptsTable.status, "submitted"))
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

// Build an evolving psychological self-portrait from EVERY reflection the student
// has submitted. This is the heart of the course: the more they answer, the richer
// and more specific the portrait becomes. We map it onto the shared report shape:
//   narrative      -> the self-portrait (who you appear to be)
//   strengths      -> recurring patterns / traits that come through
//   weaknesses     -> tensions, contradictions, and blind spots
//   recommendations-> questions worth sitting with next
router.post("/analytics/report", async (_req, res) => {
  // Gather every submitted assignment answer, joined to its question and topic.
  const submittedRows = await db
    .select({
      topicTitle: topicsTable.title,
      weekNumber: topicsTable.weekNumber,
      problemId: problemsTable.id,
      prompt: problemsTable.prompt,
      answer: answersTable.answer,
      submittedAt: attemptsTable.submittedAt,
    })
    .from(answersTable)
    .innerJoin(attemptsTable, eq(answersTable.attemptId, attemptsTable.id))
    .innerJoin(problemsTable, eq(answersTable.problemId, problemsTable.id))
    .innerJoin(topicsTable, eq(problemsTable.topicId, topicsTable.id))
    .where(eq(attemptsTable.status, "submitted"))
    .orderBy(asc(attemptsTable.submittedAt));

  // Include practice reflections too — they're part of the same self. Join through
  // to the practice problem so we have the ACTUAL reflective prompt, not just the
  // answer, and so these reflections are genuinely analyzed (not merely counted).
  const practiceRows = await db
    .select({
      topicTitle: topicsTable.title,
      weekNumber: topicsTable.weekNumber,
      prompt: practiceProblemsTable.prompt,
      answer: practiceAttemptsTable.answer,
    })
    .from(practiceAttemptsTable)
    .innerJoin(
      practiceProblemsTable,
      eq(practiceAttemptsTable.problemId, practiceProblemsTable.id),
    )
    .innerJoin(topicsTable, eq(practiceAttemptsTable.topicId, topicsTable.id))
    .orderBy(asc(practiceAttemptsTable.id));

  const assignmentReflections = submittedRows
    .filter((r) => (r.answer ?? "").trim().length > 0)
    .map((r) => ({
      problemId: r.problemId,
      topic: r.topicTitle,
      week: r.weekNumber,
      question: r.prompt,
      answer: r.answer,
      source: "assignment" as const,
    }));
  const practiceReflections = practiceRows
    .filter((r) => (r.answer ?? "").trim().length > 0)
    .map((r) => ({
      topic: r.topicTitle,
      week: r.weekNumber,
      question: r.prompt,
      answer: r.answer,
      source: "practice" as const,
    }));
  // Every reflection the person has written — assignments AND practice — feeds the
  // portrait. The picture sharpens with each one.
  const reflections = [...assignmentReflections, ...practiceReflections];
  const answeredCount = reflections.length;
  const assignmentCount = assignmentReflections.length;
  const practiceCount = practiceReflections.length;

  // Cap what we feed the two-pass analysis so it stays within token limits even
  // for prolific users (the model must emit one entry per analyzed answer). We
  // keep the LATEST answer per assignment question — i.e. the person's current
  // self, which is exactly what an "evolving" portrait should reflect — plus the
  // most recent practice reflections, capped to a safe total.
  const latestAssignment = new Map<number, (typeof assignmentReflections)[number]>();
  for (const r of assignmentReflections) latestAssignment.set(r.problemId, r);
  const analyzed = [
    ...Array.from(latestAssignment.values()),
    ...practiceReflections.slice(-25),
  ].slice(-70);

  // Not enough material yet — return a gentle, honest placeholder.
  if (answeredCount === 0) {
    res.json(
      GenerateReportResponse.parse({
        generatedAt: new Date().toISOString(),
        narrative:
          "Your self-portrait is still blank — it's painted from your own words. Answer a few reflections in any homework, test, or practice session, then come back here. With each honest answer, this picture of you grows more detailed and more specific. Nothing here is a verdict; it's a mirror you fill in yourself.",
        strengths: [],
        weaknesses: [],
        recommendations: [
          "Start with Homework 1.1 — it asks who you think you are.",
          "Answer honestly rather than impressively; the mirror only reflects what's real.",
          "Return here after a few answers to watch your portrait take shape.",
        ],
      }),
    );
    return;
  }

  let narrative = "";
  let strengths: string[] = [];
  let weaknesses: string[] = [];
  let recommendations: string[] = [];
  try {
    // PASS 1 — analyze EACH reflection on its own. For every answer we extract the
    // concrete psychological signal it carries (an inference, not a paraphrase) and
    // any defense/evasion at work. These per-answer analyses are the raw material
    // the portrait is built from, so the portrait genuinely aggregates analysis
    // rather than skimming the surface of the raw text.
    const analysisPass = await chatJson<{
      perAnswer: Array<{
        topic: string;
        reveals: string;
        defense: string;
      }>;
    }>(
      "You are a rigorous, perceptive psychological analyst. You are given a numbered list of one person's short, first-person answers to reflective questions, each with its topic and question. " +
        "Analyze EACH answer individually. For each one, infer what it actually reveals about this specific person — their drives, fears, attachments, self-image, or coping style — and WHY their particular wording implies it. Do not restate the answer; read beneath it. " +
        "Also note any 'defense' visible in the answer: avoidance, intellectualizing, self-flattery, minimizing, contradiction with another answer, or none. " +
        "Return ONE entry per input answer, in the same order. Strict JSON: " +
        '{"perAnswer": [{"topic": string, "reveals": string, "defense": string}]}. ' +
        "Each 'reveals' is 1-2 sharp, specific sentences. 'defense' is a short phrase or 'none'.",
      JSON.stringify({
        reflections: analyzed.map((r, i) => ({
          n: i + 1,
          topic: r.topic,
          week: r.week,
          question: r.question,
          answer: r.answer,
        })),
      }),
      TEXT_MODEL,
      8192,
    );
    const perAnswer = Array.isArray(analysisPass.perAnswer) ? analysisPass.perAnswer : [];

    // PASS 2 — synthesize the per-answer analyses into one coherent, evolving
    // portrait. This is where separate signals become a single increasingly
    // accurate description of the person, including how they line up and clash.
    const out = await chatJson<{
      portrait: string;
      patterns: string[];
      tensions: string[];
      questions: string[];
    }>(
      "You are a perceptive, honest psychological portraitist on a self-knowledge course. " +
        "You are given (a) a person's own short answers and (b) a prior per-answer analysis of what each one reveals. " +
        "Synthesize them into a single evolving self-portrait. Do not summarize answer-by-answer; integrate the signals into a coherent reading of one person — connect threads across different answers, show where their self-image and their behavior diverge, and name what consistently drives them. " +
        "Speak directly to them as 'you'. Be specific and evidence-based: ground claims in their actual words and the analysis, and where you make an inferential leap, say so. Be honest, not flattering — if the evidence suggests a blind spot, evasion, or a gap between who they say they are and what they reveal, say it plainly and kindly. Avoid horoscope-style generalities that could apply to anyone; if a claim isn't supported by their specific answers, don't make it. No clinical labels or diagnoses. " +
        "Note that accuracy increases with more (and more honest) answers.\n" +
        "Produce strict JSON: {\"portrait\": string, \"patterns\": string[], \"tensions\": string[], \"questions\": string[]}.\n" +
        "- portrait: 2-3 paragraphs on who this person appears to be — what drives them, what they protect, the gap between stated and revealed self.\n" +
        "- patterns: 3-5 short, specific phrases naming recurring traits or motives clearly evidenced across answers.\n" +
        "- tensions: 2-4 short, specific phrases naming contradictions, blind spots, or evasions you can actually point to between their answers.\n" +
        "- questions: 3 specific, probing questions worth sitting with next, aimed at what they have so far avoided or left vague.",
      JSON.stringify({
        answersAnalyzed: analyzed.length,
        reflections: analyzed,
        perAnswerAnalysis: perAnswer,
      }),
      TEXT_MODEL,
      8192,
    );
    narrative = (out.portrait || "").trim();
    strengths = Array.isArray(out.patterns) ? out.patterns.filter(Boolean) : [];
    weaknesses = Array.isArray(out.tensions) ? out.tensions.filter(Boolean) : [];
    recommendations = Array.isArray(out.questions) ? out.questions.filter(Boolean) : [];
  } catch {
    narrative = `Your self-portrait is being drawn from ${answeredCount} reflection${
      answeredCount === 1 ? "" : "s"
    } you've written so far. The portrait engine is briefly unavailable, but your answers are saved — every one of them adds to the picture. Try generating your portrait again in a moment.`;
    strengths = [];
    weaknesses = [];
    recommendations = ["Try regenerating your portrait shortly.", "Answer a few more reflections to deepen it."];
  }

  if (!narrative) {
    narrative = `Drawn from ${answeredCount} of your own reflections. Keep answering honestly and this portrait will sharpen.`;
  }
  // Note how many answers fed this portrait so its evolution is visible.
  const parts: string[] = [];
  if (assignmentCount > 0)
    parts.push(`${assignmentCount} assignment reflection${assignmentCount === 1 ? "" : "s"}`);
  if (practiceCount > 0)
    parts.push(`${practiceCount} practice reflection${practiceCount === 1 ? "" : "s"}`);
  const source = parts.length > 0 ? parts.join(" and ") : `${answeredCount} reflections`;
  const provenance = `\n\n— Drawn from ${source}. This portrait deepens and sharpens with every honest answer you add.`;

  res.json(
    GenerateReportResponse.parse({
      generatedAt: new Date().toISOString(),
      narrative: narrative + provenance,
      strengths,
      weaknesses,
      recommendations,
    }),
  );
});

export default router;

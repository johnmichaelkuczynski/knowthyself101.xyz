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
import { chatJson, TEXT_MODEL } from "../lib/ai";
import { getSettings, activeFramework } from "../lib/settings";
import { frameworkBrief, lensStamp, MODE_LABEL } from "../lib/frameworks";

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
  // The report is re-lensed by the active mode. Self-knowledge draws a psychological
  // self-portrait; career re-reads the SAME reflections as a vocational reading. The
  // active framework(s) are injected so the synthesis reasons through them explicitly.
  const settings = await getSettings();
  const isCareer = settings.mode === "career";
  const lensBrief = frameworkBrief(settings.mode, activeFramework(settings));
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
        narrative: isCareer
          ? "Your career reading is still blank — it's drawn entirely from your own words. Answer a few reflections in any homework, test, or practice session, then come back here. Read through career frameworks, your answers will start to point at the kinds of work that fit you. Nothing here is a verdict; it's a reading you fill in yourself."
          : "Your self-portrait is still blank — it's painted from your own words. Answer a few reflections in any homework, test, or practice session, then come back here. With each honest answer, this picture of you grows more detailed and more specific. Nothing here is a verdict; it's a mirror you fill in yourself.",
        strengths: [],
        weaknesses: [],
        recommendations: [
          "Start with Homework 1.1 — it asks who you think you are.",
          isCareer
            ? "Answer honestly rather than impressively; the reading only reflects what's real."
            : "Answer honestly rather than impressively; the portrait only reflects what's real.",
          isCareer
            ? "Return here after a few answers to watch your career direction take shape."
            : "Return here after a few answers to watch your portrait take shape.",
        ],
      }),
    );
    return;
  }

  // Real memory across visits: pull the most recent saved reading for THIS mode so
  // the new one can build on it rather than starting from a blank page. This is what
  // makes the profile genuinely evolve over time instead of being recomputed cold.
  const [priorReport] = await db
    .select()
    .from(profileReportsTable)
    .where(eq(profileReportsTable.mode, settings.mode))
    .orderBy(desc(profileReportsTable.createdAt), desc(profileReportsTable.id))
    .limit(1);
  const priorContext = priorReport
    ? JSON.stringify({
        previousReading: priorReport.narrative,
        previousPatterns: priorReport.patterns ?? [],
        previousTensions: priorReport.tensions ?? [],
        previousAnsweredCount: priorReport.answeredCount,
        drawnAt: (priorReport.createdAt as Date).toISOString(),
      })
    : null;

  let narrative = "";
  let strengths: string[] = [];
  let weaknesses: string[] = [];
  let recommendations: string[] = [];
  // When the AI synthesis fails we still return a friendly placeholder, but we must
  // NOT persist it: a saved outage message would become next run's `previousProfile`
  // and anchor the evolving portrait to error text instead of the user's own words.
  let synthesisFailed = false;
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
      (isCareer
        ? "You are a rigorous, perceptive career analyst. You are given a numbered list of one person's short, first-person answers to reflective questions, each with its topic and question. " +
          "Analyze EACH answer individually through career-fit frameworks. For each one, infer what it reveals about the kinds of work, environments, and roles that would fit or frustrate this specific person — their interests, motivators, strengths, and non-negotiables — and WHY their particular wording implies it. Do not restate the answer; read beneath it for vocational signal. " +
          "Also note any 'defense' visible in the answer: avoidance, intellectualizing, self-flattery, minimizing, contradiction with another answer, or none. "
        : "You are a rigorous, perceptive psychological analyst. You are given a numbered list of one person's short, first-person answers to reflective questions, each with its topic and question. " +
          "Analyze EACH answer individually. For each one, infer what it actually reveals about this specific person — their drives, fears, attachments, self-image, or coping style — and WHY their particular wording implies it. Do not restate the answer; read beneath it. " +
          "Also note any 'defense' visible in the answer: avoidance, intellectualizing, self-flattery, minimizing, contradiction with another answer, or none. ") +
        `Reason using these ${MODE_LABEL[settings.mode]} frameworks where the answer gives real signal; do not force a framework onto an answer that doesn't support it:\n${lensBrief}\n` +
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
      (isCareer
        ? "You are a perceptive, honest career counselor. " +
          "You are given (a) a person's own short answers to self-reflective questions and (b) a prior per-answer analysis of what each one reveals. " +
          "Synthesize them into a single evolving CAREER READING — what kinds of work, roles, and environments fit this specific person, and what would frustrate them. Do not summarize answer-by-answer; integrate the signals into a coherent vocational reading of one person — connect threads across different answers, and name what consistently motivates and drains them. " +
          "Reason explicitly through these career frameworks where the evidence supports it; do not force a framework that the answers don't support:\n" +
          lensBrief + "\n" +
          "Speak directly to them as 'you'. Be specific and evidence-based: ground claims in their actual words and the analysis, and where you make an inferential leap, say so. Be honest, not flattering — if the evidence is thin or points to a mismatch with what they say they want, say so plainly and kindly. Avoid horoscope-style generalities; if a claim isn't supported by their specific answers, don't make it. Do not invent job titles wholesale — point at families of work and the qualities that fit. " +
          "Note that accuracy increases with more (and more honest) answers.\n" +
          "Produce strict JSON: {\"portrait\": string, \"patterns\": string[], \"tensions\": string[], \"questions\": string[]}.\n" +
          "- portrait: 2-3 paragraphs on the kinds of work and environments that fit this person — their interests, motivators, strengths, and non-negotiables, named through the frameworks where apt.\n" +
          "- patterns: 3-5 short, specific phrases naming recurring vocational interests, anchors, or trait-fits clearly evidenced across answers.\n" +
          "- tensions: 2-4 short, specific phrases naming conflicts, blind spots, or gaps between what they say they want and what their answers suggest fits them.\n" +
          "- questions: 3 specific, probing questions worth sitting with next to sharpen the career direction.\n" +
          "If the input includes a 'previousProfile', it is your earlier reading of this same person. Treat it as memory: build on it — keep what the new answers still support, deepen it, and revise anything the latest answers contradict. Do not simply repeat it; show how the picture has developed."
        : "You are a perceptive, honest psychological portraitist on a self-knowledge course. " +
          "You are given (a) a person's own short answers and (b) a prior per-answer analysis of what each one reveals. " +
          "Synthesize them into a single evolving self-portrait. Do not summarize answer-by-answer; integrate the signals into a coherent reading of one person — connect threads across different answers, show where their self-image and their behavior diverge, and name what consistently drives them. " +
          "Reason explicitly through these frameworks where the evidence supports it; do not force a framework that the answers don't support:\n" +
          lensBrief + "\n" +
          "Speak directly to them as 'you'. Be specific and evidence-based: ground claims in their actual words and the analysis, and where you make an inferential leap, say so. Be honest, not flattering — if the evidence suggests a blind spot, evasion, or a gap between who they say they are and what they reveal, say it plainly and kindly. Avoid horoscope-style generalities that could apply to anyone; if a claim isn't supported by their specific answers, don't make it. No clinical labels or diagnoses. " +
          "Note that accuracy increases with more (and more honest) answers.\n" +
          "Produce strict JSON: {\"portrait\": string, \"patterns\": string[], \"tensions\": string[], \"questions\": string[]}.\n" +
          "- portrait: 2-3 paragraphs on who this person appears to be — what drives them, what they protect, the gap between stated and revealed self.\n" +
          "- patterns: 3-5 short, specific phrases naming recurring traits or motives clearly evidenced across answers.\n" +
          "- tensions: 2-4 short, specific phrases naming contradictions, blind spots, or evasions you can actually point to between their answers.\n" +
          "- questions: 3 specific, probing questions worth sitting with next, aimed at what they have so far avoided or left vague.\n" +
          "If the input includes a 'previousProfile', it is your earlier portrait of this same person. Treat it as memory: build on it — keep what the new answers still support, deepen it, and revise anything the latest answers contradict or that they've grown past. Do not simply repeat it; show how the picture has developed.") ,
      JSON.stringify({
        answersAnalyzed: analyzed.length,
        reflections: analyzed,
        perAnswerAnalysis: perAnswer,
        // If present, this is the previous saved reading. Evolve it: keep what the
        // new evidence still supports, deepen it, and revise anything the latest
        // answers contradict. Do not merely repeat it.
        previousProfile: priorContext ? JSON.parse(priorContext) : null,
      }),
      TEXT_MODEL,
      8192,
    );
    narrative = (out.portrait || "").trim();
    strengths = Array.isArray(out.patterns) ? out.patterns.filter(Boolean) : [];
    weaknesses = Array.isArray(out.tensions) ? out.tensions.filter(Boolean) : [];
    recommendations = Array.isArray(out.questions) ? out.questions.filter(Boolean) : [];
  } catch {
    synthesisFailed = true;
    const noun = isCareer ? "career reading" : "self-portrait";
    narrative = `Your ${noun} is being drawn from ${answeredCount} reflection${
      answeredCount === 1 ? "" : "s"
    } you've written so far. The analysis engine is briefly unavailable, but your answers are saved — every one of them adds to the picture. Try generating it again in a moment.`;
    strengths = [];
    weaknesses = [];
    recommendations = [`Try regenerating your ${noun} shortly.`, "Answer a few more reflections to deepen it."];
  }

  if (!narrative) {
    narrative = `Drawn from ${answeredCount} of your own reflections. Keep answering honestly and this ${
      isCareer ? "career reading" : "portrait"
    } will sharpen.`;
  }
  // Note how many answers fed this portrait so its evolution is visible.
  const parts: string[] = [];
  if (assignmentCount > 0)
    parts.push(`${assignmentCount} assignment reflection${assignmentCount === 1 ? "" : "s"}`);
  if (practiceCount > 0)
    parts.push(`${practiceCount} practice reflection${practiceCount === 1 ? "" : "s"}`);
  const source = parts.length > 0 ? parts.join(" and ") : `${answeredCount} reflections`;
  const stamp = lensStamp(settings.mode, activeFramework(settings));
  const provenance = `\n\n— Drawn from ${source}, read through the ${stamp}. This ${
    isCareer ? "career reading" : "portrait"
  } deepens and sharpens with every honest answer you add.`;

  const fullNarrative = narrative + provenance;

  // Persist this reading as a timestamped snapshot so the profile is remembered
  // between visits and its evolution over time is queryable. The next generation
  // will pick this up as `priorReport` and build on it. Skip persistence when the
  // synthesis failed — an outage placeholder must never become a saved snapshot.
  if (!synthesisFailed) {
    await db.insert(profileReportsTable).values({
      mode: settings.mode,
      framework: activeFramework(settings),
      narrative: fullNarrative,
      patterns: strengths,
      tensions: weaknesses,
      questions: recommendations,
      answeredCount,
      assignmentCount,
      practiceCount,
    });
  }

  res.json(
    GenerateReportResponse.parse({
      generatedAt: new Date().toISOString(),
      narrative: fullNarrative,
      strengths,
      weaknesses,
      recommendations,
    }),
  );
});

// The most recently saved reading for the current mode — loaded when the analytics
// page opens so the profile persists across visits instead of starting blank.
router.get("/analytics/report/latest", async (_req, res) => {
  const settings = await getSettings();
  const [row] = await db
    .select()
    .from(profileReportsTable)
    .where(eq(profileReportsTable.mode, settings.mode))
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
  const rows = await db
    .select()
    .from(profileReportsTable)
    .where(eq(profileReportsTable.mode, settings.mode))
    .orderBy(desc(profileReportsTable.createdAt), desc(profileReportsTable.id))
    .limit(50);
  res.json(GetReportHistoryResponse.parse(rows.map(toProfileReport)));
});

export default router;

import { and, asc, desc, eq } from "drizzle-orm";
import {
  db,
  topicsTable,
  attemptsTable,
  practiceAttemptsTable,
  practiceProblemsTable,
  practiceSessionsTable,
  answersTable,
  problemsTable,
  profileReportsTable,
  rebuttalsTable,
} from "@workspace/db";
import { chatJson, TEXT_MODEL } from "./ai";
import { type AppSettings, activeFramework } from "./settings";
import { frameworkBrief, lensStamp, MODE_LABEL, stanceDirective } from "./frameworks";

export type ProfileReportResult = {
  generatedAt: string;
  narrative: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  // Metadata for callers (route + diagnostic) to reason about the run.
  answeredCount: number;
  assignmentCount: number;
  practiceCount: number;
  // True only when an LLM-synthesized portrait was produced and persisted as a
  // snapshot. Placeholder/outage readings are never persisted.
  persisted: boolean;
  // True when a prior saved reading for this user+mode was used as memory — i.e.
  // this generation genuinely BUILT ON a previous one rather than starting cold.
  evolvedFromPrior: boolean;
};

/**
 * Build an evolving psychological self-portrait (or career reading) for ONE user
 * from every reflection that user has submitted — assignment answers and practice
 * reflections alike. The more they answer, the sharper the picture. Each run pulls
 * that user's most recent saved reading as memory and builds on it, then persists
 * a new timestamped snapshot, so the profile genuinely evolves over time.
 *
 * Scoped strictly by userId: the primary user and the synthetic diagnostic student
 * each evolve their own profile in complete isolation.
 */
export async function generateProfileReport(
  userId: number,
  settings: AppSettings,
): Promise<ProfileReportResult> {
  const isCareer = settings.mode === "career";
  const lensBrief = frameworkBrief(settings.mode, activeFramework(settings));

  // Every submitted assignment answer for THIS user, joined to question + topic.
  const submittedRows = await db
    .select({
      topicTitle: topicsTable.title,
      weekNumber: topicsTable.weekNumber,
      attemptId: answersTable.attemptId,
      problemId: problemsTable.id,
      prompt: problemsTable.prompt,
      answer: answersTable.answer,
      submittedAt: attemptsTable.submittedAt,
    })
    .from(answersTable)
    .innerJoin(attemptsTable, eq(answersTable.attemptId, attemptsTable.id))
    .innerJoin(problemsTable, eq(answersTable.problemId, problemsTable.id))
    .innerJoin(topicsTable, eq(problemsTable.topicId, topicsTable.id))
    .where(and(eq(attemptsTable.status, "submitted"), eq(attemptsTable.userId, userId)))
    .orderBy(asc(attemptsTable.submittedAt));

  // Every practice reflection for THIS user (joined through the session so we can
  // scope by owner, and through the problem so we have the actual prompt).
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
    .innerJoin(
      practiceSessionsTable,
      eq(practiceAttemptsTable.sessionId, practiceSessionsTable.id),
    )
    .innerJoin(topicsTable, eq(practiceAttemptsTable.topicId, topicsTable.id))
    .where(eq(practiceSessionsTable.userId, userId))
    .orderBy(asc(practiceAttemptsTable.id));

  const assignmentReflections = submittedRows
    .filter((r) => (r.answer ?? "").trim().length > 0)
    .map((r) => ({
      attemptId: r.attemptId,
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
  const reflections = [...assignmentReflections, ...practiceReflections];
  const answeredCount = reflections.length;
  const assignmentCount = assignmentReflections.length;
  const practiceCount = practiceReflections.length;

  // Not enough material yet — return a gentle, honest placeholder (never persisted).
  if (answeredCount === 0) {
    return {
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
      answeredCount,
      assignmentCount,
      practiceCount,
      persisted: false,
      evolvedFromPrior: false,
    };
  }

  // Cap what we feed the two-pass analysis: keep the LATEST answer per assignment
  // question (the person's current self) plus the most recent practice reflections.
  const latestAssignment = new Map<number, (typeof assignmentReflections)[number]>();
  for (const r of assignmentReflections) latestAssignment.set(r.problemId, r);
  const analyzed = [
    ...Array.from(latestAssignment.values()),
    ...practiceReflections.slice(-25),
  ].slice(-70);

  // Pull every push-back this user wrote against a reading of their answers and
  // group it by the specific attempt+problem it belongs to. The dialogue is fresh
  // signal — how they argue, what they defend, whether they engage or deflect — so
  // it travels with the exact answer it was about (a retake's answer must never
  // inherit a prior attempt's push-back) and is fed into the two-pass analysis below.
  const rebuttalRows = await db
    .select({
      attemptId: rebuttalsTable.attemptId,
      problemId: rebuttalsTable.problemId,
      userMessage: rebuttalsTable.userMessage,
      appResponse: rebuttalsTable.appResponse,
      revised: rebuttalsTable.revised,
    })
    .from(rebuttalsTable)
    .where(eq(rebuttalsTable.userId, userId))
    .orderBy(asc(rebuttalsTable.createdAt), asc(rebuttalsTable.id));
  const dialogueKey = (attemptId: number, problemId: number) => `${attemptId}:${problemId}`;
  const dialogueByAttemptProblem = new Map<
    string,
    { pushBack: string; response: string; revised: boolean }[]
  >();
  for (const r of rebuttalRows) {
    const key = dialogueKey(r.attemptId, r.problemId);
    const arr = dialogueByAttemptProblem.get(key) ?? [];
    arr.push({ pushBack: r.userMessage, response: r.appResponse, revised: r.revised });
    dialogueByAttemptProblem.set(key, arr);
  }
  const analyzedForLlm = analyzed.map((r) => ({
    ...r,
    dialogue:
      "attemptId" in r && "problemId" in r
        ? dialogueByAttemptProblem.get(dialogueKey(r.attemptId, r.problemId)) ?? []
        : [],
  }));

  // Real memory across visits: the most recent saved reading for THIS user+mode,
  // used so the new one builds on it rather than starting from a blank page.
  const [priorReport] = await db
    .select()
    .from(profileReportsTable)
    .where(and(eq(profileReportsTable.mode, settings.mode), eq(profileReportsTable.userId, userId)))
    .orderBy(desc(profileReportsTable.createdAt), desc(profileReportsTable.id))
    .limit(1);
  const evolvedFromPrior = Boolean(priorReport);
  const priorContext = priorReport
    ? {
        previousReading: priorReport.narrative,
        previousPatterns: priorReport.patterns ?? [],
        previousTensions: priorReport.tensions ?? [],
        previousAnsweredCount: priorReport.answeredCount,
        drawnAt: (priorReport.createdAt as Date).toISOString(),
      }
    : null;

  let narrative = "";
  let strengths: string[] = [];
  let weaknesses: string[] = [];
  let recommendations: string[] = [];
  // A saved outage placeholder would become next run's memory and anchor the
  // evolving portrait to error text — so on failure we never persist.
  let synthesisFailed = false;
  try {
    // PASS 1 — analyze EACH reflection individually for the concrete signal it
    // carries (an inference, not a paraphrase) plus any defense/evasion at work.
    const analysisPass = await chatJson<{
      perAnswer: Array<{ topic: string; reveals: string; defense: string }>;
    }>(
      (isCareer
        ? "You are a rigorous, perceptive career analyst. You are given a numbered list of one person's short, first-person answers to reflective questions, each with its topic and question. " +
          "Analyze EACH answer individually through career-fit frameworks. For each one, infer what it reveals about the kinds of work, environments, and roles that would fit or frustrate this specific person — their interests, motivators, strengths, and non-negotiables — and WHY their particular wording implies it. Do not restate the answer; read beneath it for vocational signal. " +
          "Also note any 'defense' visible in the answer: avoidance, intellectualizing, self-flattery, minimizing, contradiction with another answer, or none. "
        : "You are a rigorous, perceptive psychological analyst. You are given a numbered list of one person's short, first-person answers to reflective questions, each with its topic and question. " +
          "Analyze EACH answer individually. For each one, infer what it actually reveals about this specific person — their drives, fears, attachments, self-image, or coping style — and WHY their particular wording implies it. Do not restate the answer; read beneath it. " +
          "Also note any 'defense' visible in the answer: avoidance, intellectualizing, self-flattery, minimizing, contradiction with another answer, or none. ") +
        `Reason using these ${MODE_LABEL[settings.mode]} frameworks where the answer gives real signal; do not force a framework onto an answer that doesn't support it:\n${lensBrief}\n` +
        "Some answers carry a 'dialogue': a back-and-forth where this person pushed back on an earlier reading of that answer. Treat it as extra signal — how they argue, what they defend, whether they engage honestly or deflect, and whether they can revise their view — and fold it into 'reveals' and 'defense'. " +
        "Return ONE entry per input answer, in the same order. Strict JSON: " +
        '{"perAnswer": [{"topic": string, "reveals": string, "defense": string}]}. ' +
        "Each 'reveals' is 1-2 sharp, specific sentences. 'defense' is a short phrase or 'none'.",
      JSON.stringify({
        reflections: analyzedForLlm.map((r, i) => ({
          n: i + 1,
          topic: r.topic,
          week: r.week,
          question: r.question,
          answer: r.answer,
          dialogue: r.dialogue,
        })),
      }),
      TEXT_MODEL,
      8192,
    );
    const perAnswer = Array.isArray(analysisPass.perAnswer) ? analysisPass.perAnswer : [];

    // PASS 2 — synthesize the per-answer analyses into one coherent, evolving
    // portrait, building on the prior reading where present.
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
          "If the input includes a 'previousProfile', it is your earlier portrait of this same person. Treat it as memory: build on it — keep what the new answers still support, deepen it, and revise anything the latest answers contradict or that they've grown past. Do not simply repeat it; show how the picture has developed.") +
        "\n\n" +
        stanceDirective(settings.stance) +
        " Let this stance set the warmth or severity of the portrait's TONE; it must not make you invent evidence or omit what the answers actually show.",
      JSON.stringify({
        answersAnalyzed: analyzed.length,
        reflections: analyzedForLlm,
        perAnswerAnalysis: perAnswer,
        previousProfile: priorContext,
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
    recommendations = [
      `Try regenerating your ${noun} shortly.`,
      "Answer a few more reflections to deepen it.",
    ];
  }

  if (!narrative) {
    narrative = `Drawn from ${answeredCount} of your own reflections. Keep answering honestly and this ${
      isCareer ? "career reading" : "portrait"
    } will sharpen.`;
  }

  // Provenance line so the portrait's evolution is visible.
  const parts: string[] = [];
  if (assignmentCount > 0)
    parts.push(`${assignmentCount} assignment reflection${assignmentCount === 1 ? "" : "s"}`);
  if (practiceCount > 0)
    parts.push(`${practiceCount} practice reflection${practiceCount === 1 ? "" : "s"}`);
  const source = parts.length > 0 ? parts.join(" and ") : `${answeredCount} reflections`;
  const stamp = lensStamp(settings.mode, activeFramework(settings), settings.stance);
  const provenance = `\n\n— Drawn from ${source}, read through the ${stamp}. This ${
    isCareer ? "career reading" : "portrait"
  } deepens and sharpens with every honest answer you add.`;

  const fullNarrative = narrative + provenance;

  // Persist a timestamped snapshot for THIS user (skip outage placeholders) so the
  // next generation picks it up as memory and the picture genuinely builds.
  let persisted = false;
  if (!synthesisFailed) {
    await db.insert(profileReportsTable).values({
      userId,
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
    persisted = true;
  }

  return {
    generatedAt: new Date().toISOString(),
    narrative: fullNarrative,
    strengths,
    weaknesses,
    recommendations,
    answeredCount,
    assignmentCount,
    practiceCount,
    persisted,
    evolvedFromPrior,
  };
}

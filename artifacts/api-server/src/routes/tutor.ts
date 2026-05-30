import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, lecturesTable } from "@workspace/db";
import { AskTutorBody, AskTutorResponse } from "@workspace/api-zod";
import { chatText, chatJson, FAST_MODEL } from "../lib/ai";

const router: IRouter = Router();

router.get("/tutor/suggestions/:lectureId", async (req, res): Promise<void> => {
  const lectureId = Number(req.params.lectureId);
  if (!Number.isFinite(lectureId)) {
    res.status(400).json({ error: "invalid lectureId" });
    return;
  }
  const [lecture] = await db
    .select()
    .from(lecturesTable)
    .where(eq(lecturesTable.id, lectureId));
  if (!lecture) {
    res.status(404).json({ error: "lecture not found" });
    return;
  }

  try {
    const out = await chatJson<{ questions: string[] }>(
      'You are a warm, perceptive guide on a self-knowledge course. Reply as strict JSON of the form {"questions": string[]} with NO other keys.',
      `From the reflective lecture below, generate 6 short starter questions a person might want to explore with a thoughtful guide after reading it. Mix two kinds: (a) questions about the ideas in the lecture ("Why do we...?", "What's the difference between...?") and (b) gentle questions that turn the lecture inward and invite self-examination ("How would I know if I...?", "Where might this show up in my own life?"). Cover the major ideas in the reading, not just the first one. Each question must be one sentence, under ~18 words, in the reader's own voice. Plain language, no jargon.\n\nLECTURE TITLE: ${lecture.title}\n\nLECTURE BODY:\n"""\n${lecture.body}\n"""`,
      FAST_MODEL,
    );
    const questions = Array.isArray(out?.questions)
      ? out.questions.filter((q) => typeof q === "string" && q.trim().length > 0).slice(0, 8)
      : [];
    res.json({ questions });
  } catch {
    res.json({ questions: [] });
  }
});

router.post("/tutor/ask", async (req, res): Promise<void> => {
  const parsed = AskTutorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { message, selectedLectureText } = parsed.data;

  const sys =
    "You are a warm, perceptive guide on a self-knowledge course — part thoughtful teacher, part wise friend. " +
    "There are no right answers here; your role is to help the person understand the ideas AND understand themselves. " +
    "When they ask about a concept, explain it clearly and plainly in 3-6 sentences, grounding it in everyday life. " +
    "When they share something personal, respond with curiosity and care: reflect back what you notice, ask one gentle follow-up question, and never judge, diagnose, or label them. " +
    "Draw on real psychology and philosophy where useful, but stay accessible and free of jargon. Keep replies short unless they ask for more.";
  const user = selectedLectureText
    ? `Context from the lecture the person is reading:\n"""\n${selectedLectureText}\n"""\n\nTheir message: ${message}`
    : message;

  let text = "";
  try {
    text = await chatText(sys, user);
  } catch {
    text =
      "I'm having trouble reaching the tutor service right now. Try again in a moment, and consider re-reading the relevant section of the lecture.";
  }
  res.json(AskTutorResponse.parse({ text, audioUrl: null }));
});

export default router;

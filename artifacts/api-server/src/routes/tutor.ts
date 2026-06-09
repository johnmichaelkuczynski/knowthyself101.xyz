import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, lecturesTable } from "@workspace/db";
import { AskTutorBody, AskTutorResponse } from "@workspace/api-zod";
import { chatText, chatJson } from "../lib/ai";

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
      `From the reflective lecture below, generate 6 short prompts that force the reader to dig into the concrete specifics of THEIR OWN life.\n\n` +
        `HARD STRUCTURAL RULE — obey exactly: every prompt MUST begin with one of these exact words: "Describe", "Name", "Recall", "Picture", "List", or "Write down". A prompt may NEVER begin with "Why", "How", "What", "When", "Where", "Would", "Do", or "Is". This is non-negotiable; a prompt starting with any other word is invalid and must be rewritten.\n\n` +
        `WHY THIS RULE EXISTS: abstract questions ("Why do I remember so little?", "How would I know if this still shapes me?", "What's the difference between X and Y?") let the reader patter out psychology they have read instead of excavating their own existence. We forbid them entirely. Every prompt must demand a specific, retrievable fact of the reader's real past or present: a particular memory, a named person, an actual scene, a place, an age, a choice, a conversation, or an exact thing someone said or did. If a stranger who never lived this life could answer it, or if it can be answered by quoting theory or restating the lecture, it is WRONG.\n\n` +
        `GOOD (do this): "Describe the earliest scene you can actually picture — who is in it, where are you, how old are you?" / "Name the person whose approval you were chasing as a child, and the exact thing you did to win it." / "Recall the last time you felt this, and write down what happened and who was there." / "Write down one sentence someone actually said to you that you still hear today."\n\n` +
        `BAD (never do this): "Why do I remember only a few early scenes?" / "How would I know if that lesson still shapes my choices?" / "Where could that show up in my relationships today?" — all abstract, all banned.\n\n` +
        `Address the reader as "you". Anchor each of the 6 prompts in a DIFFERENT idea from the reading (cover the whole lecture, not just the opening), but every answer must be a specific piece of the reader's own existence. Each prompt: one sentence, under ~24 words, plain language, no jargon.\n\nLECTURE TITLE: ${lecture.title}\n\nLECTURE BODY:\n"""\n${lecture.body}\n"""`,
    );
    const all = Array.isArray(out?.questions)
      ? out.questions.filter((q) => typeof q === "string" && q.trim().length > 0)
      : [];
    // Backstop: drop any prompt that opens like an abstract/theoretical question
    // ("Why...", "How would I know...", "What's the difference...") — those let
    // the reader recite psychology instead of excavating their own life.
    const abstractOpener =
      /^(why|how|what|whats|when|where|would|could|should|do|does|is|are|which|in what|explain|tell)\b/i;
    // Strip any leading numbering, bullets, or quotes before testing the opener.
    const strip = (q: string) =>
      q.trim().replace(/^["'“”\d.)\-\s]+/, "");
    const concrete = all.filter((q) => !abstractOpener.test(strip(q)));
    // Only fall back to the raw list if filtering would leave too little to show.
    const questions = (concrete.length >= 3 ? concrete : all).slice(0, 8);
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
    "There are better and worse answers here: honest, specific, searching reflections reveal something real, while shallow, generic, or phony ones reveal nothing — and you should gently but plainly say so when you see them. Your role is to help the person understand the ideas AND understand themselves. " +
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

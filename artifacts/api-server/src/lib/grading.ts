import { chatJson } from "./ai";

// This is a self-knowledge course, not a quiz. There are NO correct answers.
// `correctAnswer` carries a short, plausible first-person "model reflection" that
// shows the kind of DEPTH a sincere answer tends to reach — it is a reference for
// the grader, never a key the student must match.
//
// `gradeAnswer` returns:
//   - correct: whether the answer cleared a LENIENT sincerity bar (a genuine,
//     non-evasive attempt — brevity is never penalised). Only empty, joke,
//     dodging, or generic copy-paste answers fail.
//   - explanation: feedback that LEADS with what the answer reveals about the
//     person, then gently notes sincerity/depth and an invitation to go further.

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

// Only clearly evasive non-answers — refusals to engage, not short honest ones.
// Brevity is never penalised, so single sincere words (e.g. "yes", "fear",
// "nothing") are NOT listed here; only the LLM may judge those for sincerity.
const LOW_EFFORT = new Set([
  "idk",
  "i dont know",
  "i don't know",
  "dunno",
  "n/a",
  "na",
  "skip",
  "pass",
  "?",
  ".",
]);

export async function gradeAnswer(opts: {
  prompt: string;
  correctAnswer: string;
  userAnswer: string;
}): Promise<{ correct: boolean; explanation: string }> {
  const user = (opts.userAnswer ?? "").trim();
  const modelReflection = opts.correctAnswer ?? "";

  // Empty answer: gentle nudge, not a pass.
  if (user.length === 0) {
    return {
      correct: false,
      explanation:
        "There's nothing here yet. This question can't reveal anything until you put down a few honest words — even one true sentence is enough.",
    };
  }

  // Obvious non-answers: don't waste an LLM call.
  const norm = user.toLowerCase().replace(/[^a-z?.]/g, "");
  if (LOW_EFFORT.has(user.toLowerCase().replace(/[^a-z?./' ]/g, "").trim()) || LOW_EFFORT.has(norm)) {
    return {
      correct: false,
      explanation:
        "That's an answer that protects you from the question rather than meeting it. There's no grade for the 'right' words here — only for telling the truth, however small. Try naming one real, specific thing.",
    };
  }

  try {
    const out = await chatJson<{
      sincere: boolean;
      reveals: string;
      depthNote: string;
    }>(
      "You are a perceptive, warm, non-judgmental guide on a self-knowledge course. " +
        "There are NO correct answers — students write short, honest reflections about themselves. " +
        "You are given the QUESTION, a MODEL_REFLECTION (an example of the kind of depth a sincere answer can reach — NOT a key to match), and the STUDENT_ANSWER. " +
        "Your job has two parts:\n" +
        "1. Judge SINCERITY leniently. `sincere` is true if the answer is a genuine, specific, non-evasive attempt to engage with the question honestly. " +
        "Brevity is NEVER a reason to fail — a single honest sentence passes. Only mark sincere=false for empty, joking, dodging, deflecting, or generic answers that could have been written by anyone about anyone.\n" +
        "2. Write `reveals`: 2-4 sentences, addressed to the student as 'you', describing what their answer seems to reveal about them — their values, fears, patterns, needs, or how they relate to themselves and others. " +
        "Be specific to what they actually wrote. Frame it as a gentle observation or hypothesis ('This suggests...', 'It sounds like...'), never a clinical verdict or diagnosis. Be kind and insightful, the way a wise friend would be.\n" +
        "Also write `depthNote`: ONE short sentence either appreciating the honesty/depth shown, or — without scolding — inviting them one step deeper (e.g. a question they might sit with). Never criticise length.\n" +
        'Respond as strict JSON: {"sincere": boolean, "reveals": string, "depthNote": string}.',
      JSON.stringify({
        question: opts.prompt,
        model_reflection: modelReflection,
        student_answer: user,
      }),
    );
    const reveals = (out.reveals || "").trim();
    const depthNote = (out.depthNote || "").trim();
    const explanation = [reveals, depthNote].filter(Boolean).join("\n\n");
    return {
      correct: !!out.sincere,
      explanation:
        explanation ||
        "Thank you for answering honestly — what you wrote becomes part of your self-portrait in Analytics.",
    };
  } catch {
    // Fallback when the model is unavailable: pass anything that looks like a
    // real attempt (even one word), since brevity must never be penalised.
    const looksReal = wordCount(user) >= 1;
    return {
      correct: looksReal,
      explanation: looksReal
        ? "Thank you for answering honestly. What you wrote becomes part of your evolving self-portrait — the more candid your answers, the truer that picture grows."
        : "Try putting down at least one true, specific sentence — that's all this needs to start revealing something.",
    };
  }
}

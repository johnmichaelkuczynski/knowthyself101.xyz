import { chatJson } from "./ai";

// This is a self-knowledge course. There is no single factually "correct" answer,
// but there ARE better and worse answers: a genuine, specific, self-revealing
// reflection is a good answer; a shallow, generic, evasive, or phony one is a bad
// answer that reveals nothing and must not pass.
//
// `correctAnswer` carries a short, first-person "model reflection" — an example of
// the DEPTH and CANDOR a real answer reaches. It is a reference for the grader,
// never a key the student must match.
//
// `gradeAnswer` returns:
//   - correct: true ONLY when the answer is a genuine, specific, self-revealing
//     attempt. Shallow / generic / evasive / phony answers fail.
//   - explanation: real analysis. For a passing answer it states what the words
//     actually reveal (a concrete psychological inference, not a paraphrase) and
//     pushes one step deeper. For a failing answer it names precisely why the
//     answer falls short and what a real answer would require.

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

// Clearly evasive non-answers — refusals to engage.
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
  "nothing",
  "no",
  "yes",
  "maybe",
  "sure",
]);

export async function gradeAnswer(opts: {
  prompt: string;
  correctAnswer: string;
  userAnswer: string;
}): Promise<{ correct: boolean; explanation: string }> {
  const user = (opts.userAnswer ?? "").trim();
  const modelReflection = opts.correctAnswer ?? "";

  // Empty answer.
  if (user.length === 0) {
    return {
      correct: false,
      explanation:
        "There's nothing here to work with. A blank can't reveal anything about you. Put down at least one true, specific sentence about your own life — not what you think sounds good.",
    };
  }

  // Obvious non-answers: don't waste an LLM call.
  const norm = user.toLowerCase().replace(/[^a-z?.]/g, "");
  if (LOW_EFFORT.has(user.toLowerCase().replace(/[^a-z?./' ]/g, "").trim()) || LOW_EFFORT.has(norm)) {
    return {
      correct: false,
      explanation:
        "That answer keeps the question at arm's length. A one-word dodge tells us nothing about you. Name one real, specific thing — a moment, a feeling, a person — and say something true about it.",
    };
  }

  try {
    const out = await chatJson<{
      verdict: "genuine" | "shallow" | "phony" | "evasive";
      depth: number;
      analysis: string;
      shortfall: string;
    }>(
      "You are a perceptive, honest psychological reader on a self-knowledge course. " +
        "Students write SHORT, first-person reflections about their own lives. There is no factually correct answer, but there ARE genuine answers and there are bad answers, and you must tell them apart. " +
        "You are given the QUESTION, a MODEL_REFLECTION (an example of the depth a real answer reaches — NOT a key to match), and the STUDENT_ANSWER.\n\n" +
        "First, classify the STUDENT_ANSWER with a `verdict`:\n" +
        "- 'genuine': specific, self-revealing, and honest. It says something true about THIS person that could not have been written by just anyone. Brevity is fine if it is specific and real — one true, concrete sentence counts.\n" +
        "- 'shallow': generic, vague, or a platitude. Could have been written by anyone about anyone ('I want to be happy', 'family is important'). Reveals nothing specific.\n" +
        "- 'phony': performative or self-flattering — written to look good or give the 'expected' answer rather than to be honest. Polished but hollow, or suspiciously tidy.\n" +
        "- 'evasive': dodges, intellectualizes, jokes, or answers a different, safer question than the one asked.\n\n" +
        "Also rate `depth` 0-3 (0 = no self-revelation, 3 = unguarded and specific).\n\n" +
        "Then write `analysis`: 2-4 sentences of REAL analysis addressed to the student as 'you'. Do NOT merely restate or paraphrase what they wrote — infer. Name what the answer reveals about their values, fears, defenses, needs, or patterns, and WHY their specific wording implies it. Be concrete and perceptive, like someone who actually sees them. Offer it as an informed reading ('What this reveals is...', 'Underneath this is likely...'), not a clinical diagnosis.\n\n" +
        "Then write `shortfall`: if the verdict is NOT 'genuine', state plainly that this answer falls short, name exactly why (too generic / performative / evasive), and describe what a real answer would have to do — be specific and direct without being cruel. If the verdict IS 'genuine', leave shortfall as an empty string.\n\n" +
        'Respond as strict JSON: {"verdict": "genuine"|"shallow"|"phony"|"evasive", "depth": number, "analysis": string, "shortfall": string}.',
      JSON.stringify({
        question: opts.prompt,
        model_reflection: modelReflection,
        student_answer: user,
      }),
    );

    const verdict = out.verdict;
    const pass = verdict === "genuine";
    const analysis = (out.analysis || "").trim();
    const shortfall = (out.shortfall || "").trim();

    let explanation: string;
    if (pass) {
      explanation =
        analysis ||
        "This reads as a genuine, specific reflection — it adds a real detail to your self-portrait in Analytics.";
    } else {
      // Lead with what fell short, then the analysis of what little it did reveal.
      explanation = [shortfall, analysis].filter(Boolean).join("\n\n");
      if (!explanation) {
        explanation =
          "This answer stays on the surface. It could be true of almost anyone, so it reveals little about you specifically. Try again with one concrete, honest detail from your own life.";
      }
    }

    return { correct: pass, explanation };
  } catch {
    // Model unavailable: we can't judge authenticity, so apply a minimal substance
    // floor. A few words of real attempt passes provisionally; a fragment fails.
    const looksReal = wordCount(user) >= 6;
    return {
      correct: looksReal,
      explanation: looksReal
        ? "Saved. The analysis engine is briefly unavailable, so this hasn't been read for depth yet — your answer is stored and will feed your self-portrait. Aim for specific and honest over impressive."
        : "This is too thin to reveal anything yet. Add a concrete, honest detail from your own life — a specific moment or feeling, not a general statement.",
    };
  }
}

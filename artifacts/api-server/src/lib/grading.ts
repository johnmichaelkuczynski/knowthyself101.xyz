import { chatJson } from "./ai";
import {
  frameworkBrief,
  frameworkDisplayLabel,
  lensStamp,
  MODE_LABEL,
  stanceDirective,
  type Mode,
} from "./frameworks";

// This course runs in one of two MODES — self-knowledge (default) or career — each
// with five analytic FRAMEWORKS. There is no single factually "correct" answer, but
// there ARE better and worse answers: a genuine, specific, self-revealing reflection
// is good; a shallow, generic, evasive, or phony one reveals nothing and must not pass.
//
// On top of the genuine/shallow/phony/evasive verdict, the grader runs the active
// framework(s) in the SAME LLM call. With framework = "auto" it considers all five
// for the mode and reports ONLY the ones that genuinely fire; when the answer is too
// thin for anything to fire, it says so honestly rather than inventing a reading.
// Fired-framework findings are packed as Markdown into `explanation` (no API change).
//
// `correctAnswer` carries a short, first-person "model reflection" — an example of
// the DEPTH a real answer reaches. It is a reference for the grader, never a key.

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

// The student is pushing back on the app's reading of one of their answers. This is
// valuable on two counts: the push-back itself is fresh signal (how they argue, what
// they defend, whether they engage or deflect), AND it may be fair enough to warrant
// genuinely revising the first reading. The reconsideration must be a mirror — neither
// defensive nor a pushover: concede what is fair, hold what is not, and name what the
// act of pushing back reveals.
export async function reconsiderRebuttal(opts: {
  prompt: string;
  correctAnswer: string;
  userAnswer: string;
  originalFeedback: string;
  priorTurns: { userMessage: string; appResponse: string }[];
  userMessage: string;
  mode?: Mode;
  framework?: string;
  stance?: string;
}): Promise<{ response: string; revised: boolean }> {
  const message = (opts.userMessage ?? "").trim();
  const mode: Mode = opts.mode === "career" ? "career" : "self_knowledge";

  if (message.length === 0) {
    return {
      response:
        "There's nothing here to respond to. Tell me, in your own words, where my reading of your answer is wrong or unfair — and why.",
      revised: false,
    };
  }

  try {
    const out = await chatJson<{ response: string; revised: boolean }>(
      "You are a perceptive, honest reader on a self-examination course. " +
        `The current analysis mode is ${MODE_LABEL[mode]}. ` +
        stanceDirective(opts.stance) +
        " Keep this stance in your tone as you reconsider.\n\n" +
        "Earlier you gave a student a reading of one of their short, first-person reflections. The student is now PUSHING BACK on that reading. " +
        "You are given the QUESTION, the student's ORIGINAL_ANSWER, a MODEL_REFLECTION (a depth reference, NOT a key), your ORIGINAL_FEEDBACK, any PRIOR_TURNS of this same back-and-forth, and the student's new PUSH_BACK.\n\n" +
        "Weigh the push-back honestly and decide:\n" +
        "- If it is fair — you over-read, misread, projected, or were too harsh — say so plainly, correct yourself, and give the revised reading. Set revised=true.\n" +
        "- If it is PARTLY fair, concede exactly the part that lands and hold the rest, explaining why. Set revised=true only if your substantive reading actually changes.\n" +
        "- If it does not engage the substance — it deflects, attacks the framing, asserts without evidence, or simply restates the original answer louder — hold your ground respectfully, explain why your reading still stands, and gently name what the push-back ITSELF reveals (defensiveness, a sore spot, a need to be right). Set revised=false.\n\n" +
        "Treat the push-back as new self-revealing data, not as an attack to win against. Be a mirror: not defensive, not a pushover, never sycophantic. Do not cave just because they object, and do not dig in just to save face. Address them directly as 'you', in 2-4 sentences. " +
        'Respond as strict JSON: {"response": string, "revised": boolean}.',
      JSON.stringify({
        mode,
        question: opts.prompt,
        original_answer: opts.userAnswer,
        model_reflection: opts.correctAnswer ?? "",
        original_feedback: opts.originalFeedback,
        prior_turns: opts.priorTurns.map((t) => ({
          push_back: t.userMessage,
          response: t.appResponse,
        })),
        push_back: message,
      }),
    );
    const response = (out.response || "").trim();
    return {
      response:
        response ||
        "I've taken your point in. Say a little more about what specifically felt off, and I'll look again.",
      revised: Boolean(out.revised),
    };
  } catch {
    return {
      response:
        "I can't think this through with you just now — the analysis engine is briefly unavailable. Your push-back is saved; try again in a moment and I'll reconsider properly.",
      revised: false,
    };
  }
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

type FrameworkFinding = { id: string; label: string; finding: string };

function renderFrameworks(mode: Mode, findings: FrameworkFinding[]): string {
  if (findings.length === 0) return "";
  const heading =
    mode === "career"
      ? "**What the career lenses see**"
      : "**What the lenses see**";
  const lines = findings
    .filter((f) => f && (f.finding ?? "").trim())
    .map((f) => `- **${f.label || f.id}** — ${f.finding.trim()}`);
  if (lines.length === 0) return "";
  return `${heading}\n\n${lines.join("\n")}`;
}

export async function gradeAnswer(opts: {
  prompt: string;
  correctAnswer: string;
  userAnswer: string;
  mode?: Mode;
  framework?: string;
  stance?: string;
}): Promise<{ correct: boolean; explanation: string }> {
  const user = (opts.userAnswer ?? "").trim();
  const modelReflection = opts.correctAnswer ?? "";
  const mode: Mode = opts.mode === "career" ? "career" : "self_knowledge";
  const framework = opts.framework || "auto";
  const stance = opts.stance;

  // Every graded answer is stamped with the lens AND stance it was read under so the
  // feedback stays legible after the fact — no matter which return path it takes.
  const stamp = `_Read through the ${lensStamp(mode, framework, stance)}._`;
  const withStamp = (explanation: string) => `${explanation}\n\n${stamp}`;

  // Empty answer.
  if (user.length === 0) {
    return {
      correct: false,
      explanation: withStamp(
        "There's nothing here to work with. A blank can't reveal anything about you. Put down at least one true, specific sentence about your own life — not what you think sounds good.",
      ),
    };
  }

  // Obvious non-answers: don't waste an LLM call.
  const norm = user.toLowerCase().replace(/[^a-z?.]/g, "");
  if (LOW_EFFORT.has(user.toLowerCase().replace(/[^a-z?./' ]/g, "").trim()) || LOW_EFFORT.has(norm)) {
    return {
      correct: false,
      explanation: withStamp(
        "That answer keeps the question at arm's length. A one-word dodge tells us nothing about you. Name one real, specific thing — a moment, a feeling, a person — and say something true about it.",
      ),
    };
  }

  const isAuto = framework === "auto";
  const brief = frameworkBrief(mode, framework);
  const lensLabel = frameworkDisplayLabel(mode, framework);
  const frameworkInstruction = isAuto
    ? `You also have a set of analytic lenses for ${MODE_LABEL[mode]} work. Consider ALL of them, but report a finding ONLY for the lens/lenses that GENUINELY fire — where this specific answer carries real, identifiable signal for that lens. Do NOT force a reading: if the answer is too thin, generic, or off-topic for a lens, omit it. It is correct and expected to return an EMPTY frameworks array when nothing genuinely fires.\n\nLENSES:\n${brief}`
    : `A SINGLE lens is active for this reading: ${lensLabel}.\n\nLENS:\n${brief}\n`;
  // When the reader has picked ONE specific lens, that lens must drive the whole
  // reading — not just an optional footnote. Otherwise switching lenses changes
  // nothing the student can see, since `analysis`/`shortfall` would stay generic.
  const analysisLensClause = isAuto
    ? ""
    : `IMPORTANT: This reading is being done specifically THROUGH THE ${lensLabel} lens. Write your \`analysis\` (and the \`shortfall\`, when it falls short) FROM WITHIN THAT LENS: use that lens's concepts and vocabulary, interpret what the answer reveals according to what that lens cares about, and make the reading recognizably different from one done through a different lens. Even a thin or evasive answer can be read through the lens — say what the lens makes of the dodge itself. Then ALSO report it in the frameworks array. `;

  try {
    const out = await chatJson<{
      verdict: "genuine" | "shallow" | "phony" | "evasive";
      depth: number;
      analysis: string;
      shortfall: string;
      frameworks: FrameworkFinding[];
    }>(
      "You are a perceptive, honest reader on a self-examination course. " +
        `The current analysis mode is ${MODE_LABEL[mode]}. ` +
        stanceDirective(stance) +
        " This stance governs HOW READILY you call an answer genuine AND the tone of everything you write below — apply it throughout.\n\n" +
        "Students write SHORT, first-person reflections about their own lives. There is no factually correct answer, but there ARE genuine answers and there are bad answers, and you must tell them apart. " +
        "You are given the QUESTION, a MODEL_REFLECTION (an example of the depth a real answer reaches — NOT a key to match), and the STUDENT_ANSWER.\n\n" +
        "First, classify the STUDENT_ANSWER with a `verdict`:\n" +
        "- 'genuine': specific, self-revealing, and honest. It says something true about THIS person that could not have been written by just anyone. Brevity is fine if it is specific and real — one true, concrete sentence counts.\n" +
        "- 'shallow': generic, vague, or a platitude. Could have been written by anyone about anyone. Reveals nothing specific.\n" +
        "- 'phony': performative or self-flattering — written to look good rather than to be honest. Polished but hollow.\n" +
        "- 'evasive': dodges, intellectualizes, jokes, or answers a different, safer question than the one asked.\n\n" +
        "Also rate `depth` 0-3 (0 = no self-revelation, 3 = unguarded and specific).\n\n" +
        "Then write `analysis`: 2-4 sentences of REAL analysis addressed to the student as 'you'. Do NOT merely restate what they wrote — infer. Name what the answer reveals about their values, fears, defenses, needs, drives, or patterns, and WHY their specific wording implies it. Offer it as an informed reading, not a clinical diagnosis.\n\n" +
        "Then write `shortfall`: if the verdict is NOT 'genuine', state plainly that this answer falls short, name exactly why, and describe what a real answer would have to do. If the verdict IS 'genuine', leave shortfall as an empty string.\n\n" +
        analysisLensClause +
        frameworkInstruction +
        "\n\nFor each lens that fires, return {id, label, finding} where `finding` is 1-2 specific sentences naming what THIS answer shows through that lens, grounded in their actual words. Use the exact lens id and a short human label. Brevity must never be penalized — a short but specific answer can fire a lens; only genuine absence of signal should leave the array empty.\n\n" +
        'Respond as strict JSON: {"verdict": "genuine"|"shallow"|"phony"|"evasive", "depth": number, "analysis": string, "shortfall": string, "frameworks": [{"id": string, "label": string, "finding": string}]}.',
      JSON.stringify({
        mode,
        question: opts.prompt,
        model_reflection: modelReflection,
        student_answer: user,
      }),
    );

    const verdict = out.verdict;
    const pass = verdict === "genuine";
    const analysis = (out.analysis || "").trim();
    const shortfall = (out.shortfall || "").trim();
    const findings = Array.isArray(out.frameworks) ? out.frameworks : [];
    const frameworkBlock = renderFrameworks(mode, findings);

    let explanation: string;
    if (pass) {
      explanation =
        analysis ||
        "This reads as a genuine, specific reflection — it adds a real detail to your portrait in Analytics.";
      if (frameworkBlock) {
        explanation = `${explanation}\n\n${frameworkBlock}`;
      } else if (isAuto) {
        // Genuine but no lens fired — be honest about that rather than padding.
        explanation = `${explanation}\n\n_No single ${MODE_LABEL[mode]} lens fired strongly on this one — it's real, but didn't land squarely on any one pattern. More detail would give the lenses something to catch._`;
      } else {
        // A specific lens is active and the reading above was written through it,
        // so don't claim "no lens fired" — that would contradict the analysis.
        explanation = `${explanation}\n\n_Read through the ${lensLabel} lens — there isn't a strong, distinct ${lensLabel} signal here beyond the reading above; more detail would sharpen it._`;
      }
    } else {
      // Lead with what fell short, then any analysis.
      explanation = [shortfall, analysis].filter(Boolean).join("\n\n");
      if (!explanation) {
        explanation =
          "This answer stays on the surface. It could be true of almost anyone, so it reveals little about you specifically. Try again with one concrete, honest detail from your own life.";
      }
      // A failing answer may still show a defense/distortion worth naming.
      if (frameworkBlock) explanation = `${explanation}\n\n${frameworkBlock}`;
    }

    // Stamp which lens read this answer so the feedback is legible after the fact.
    return { correct: pass, explanation: withStamp(explanation) };
  } catch {
    // Model unavailable: we can't judge authenticity, so apply a minimal substance
    // floor. A few words of real attempt passes provisionally; a fragment fails.
    const looksReal = wordCount(user) >= 6;
    return {
      correct: looksReal,
      explanation: withStamp(
        looksReal
          ? "Saved. The analysis engine is briefly unavailable, so this hasn't been read for depth yet — your answer is stored and will feed your portrait. Aim for specific and honest over impressive."
          : "This is too thin to reveal anything yet. Add a concrete, honest detail from your own life — a specific moment or feeling, not a general statement.",
      ),
    };
  }
}

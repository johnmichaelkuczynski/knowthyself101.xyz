// Dual-mode framework catalog.
//
// The course runs in one of two MODES, each with five analytic FRAMEWORKS. The
// default framework within each mode is "auto": the grader considers all five in a
// SINGLE LLM call and surfaces only the framework(s) for which the answer carries
// genuine signal. When the input is too thin for anything to fire, that is reported
// honestly rather than padded.
//
// These definitions are injected into the grader and the analytics portrait so the
// model knows exactly what each lens looks for. They are descriptions, not scoring
// rubrics — the answers are short, first-person reflections, never tests.

export type Mode = "self_knowledge" | "career";

// STANCE is a third, independent axis: NOT what is read (mode) or through which
// lens (framework), but the TEMPERAMENT of the reading — how charitable vs. severe
// the grader is. It exists because the default reading was felt as knee-jerk
// critical ("if you're not confessing to being a crack addict, you're lying").
// Stance shifts BOTH how readily an answer is judged genuine AND the tone of the
// feedback, from generous encouragement to unsparing severity.
export type Stance =
  | "neutral"
  | "looking_for_good"
  | "really_looking_for_good"
  | "constructively_critical"
  | "constructively_very_critical"
  | "pure_damnation";

export const DEFAULT_STANCE: Stance = "neutral";

type StanceDef = { id: Stance; label: string; directive: string };

export const STANCES: StanceDef[] = [
  {
    id: "neutral",
    label: "Neutral",
    directive:
      "STANCE — Neutral. Read fairly and even-handedly. Take the answer at face value and assume good faith: do NOT treat brevity or simplicity as evasion, and do not assume the person is hiding something or lying unless their actual words plainly show it. Credit what is genuine, and name a shortfall only where there is a real one. A short, specific, honest answer is genuine.",
  },
  {
    id: "looking_for_good",
    label: "Looking for the good",
    directive:
      "STANCE — Looking for the good. Read generously and lead with what is real, honest, or promising in the answer. Assume good faith and give the benefit of the doubt; lean toward judging the answer genuine whenever it shows any real, specific signal. Keep your analysis warm. Mention at most one shortfall, briefly and kindly, and only if it genuinely matters.",
  },
  {
    id: "really_looking_for_good",
    label: "Really looking for the good",
    directive:
      "STANCE — Really looking for the good. Read with deliberate warmth and encouragement. Actively seek out the most honest, insightful, or courageous thing in the answer and reflect it back. Assume the best possible intent and treat any sincere attempt as genuine. Do not dwell on shortcomings; if you raise anything to improve, frame it purely as a gentle invitation to go further, never as a criticism or a failing.",
  },
  {
    id: "constructively_critical",
    label: "Constructively critical",
    directive:
      "STANCE — Constructively critical. Read with a fair but exacting eye. Name what is genuine, then clearly identify the real shortfalls and exactly what a deeper, truer answer would require. Be honest about vagueness, evasion, or self-flattery where it is actually present — but always in service of the person's growth, never to wound.",
  },
  {
    id: "constructively_very_critical",
    label: "Constructively very critical",
    directive:
      "STANCE — Constructively very critical. Read rigorously and hold the answer to a high standard. Probe hard for evasion, vagueness, cliché, and self-flattery, and reserve a genuine verdict for answers that are truly specific and self-revealing. Say plainly and in detail where it falls short and why — but stay constructive, always pointing to what a deeper, more honest answer would have to do.",
  },
  {
    id: "pure_damnation",
    label: "Pure damnation",
    directive:
      "STANCE — Pure damnation. The person has EXPLICITLY asked to be judged with withering, unsparing severity, so do not soften it and do not add disclaimers. Show no mercy for evasion, cliché, cowardice, vagueness, or self-flattery; call out every dodge and hollow phrase for exactly what it is, in scathing, contemptuous terms. Almost nothing earns a genuine verdict — only the rawest, most specific, most self-implicating answer escapes the lash. Be brutal about the writing and the dodge, but never demean protected traits or the person's inherent dignity.",
  },
];

export function normalizeStance(s: string | undefined | null): Stance {
  return STANCES.some((x) => x.id === s) ? (s as Stance) : DEFAULT_STANCE;
}

/** The LLM directive for a stance — how charitable vs. severe the reading is. */
export function stanceDirective(s: string | undefined | null): string {
  const found = STANCES.find((x) => x.id === normalizeStance(s));
  return found ? found.directive : STANCES[0].directive;
}

/** Human label for a stance, e.g. "Looking for the good". */
export function stanceLabel(s: string | undefined | null): string {
  const found = STANCES.find((x) => x.id === normalizeStance(s));
  return found ? found.label : STANCES[0].label;
}

export type FrameworkDef = {
  id: string;
  label: string;
  /** What this lens looks for in a short first-person reflection. */
  looksFor: string;
};

export const SELF_FRAMEWORKS: FrameworkDef[] = [
  {
    id: "cognitive_distortions",
    label: "Cognitive distortions (Beck / Burns)",
    looksFor:
      "distorted thinking patterns — all-or-nothing thinking, overgeneralization, catastrophizing, mind-reading, 'should' statements, personalization, emotional reasoning, labeling. Fire only when a specific distortion is visible in how they reason about their own life.",
  },
  {
    id: "defense_mechanisms",
    label: "Defense mechanisms (Vaillant)",
    looksFor:
      "ego defenses in how they handle a painful truth — denial, projection, rationalization, intellectualization, displacement, reaction formation, or mature defenses like sublimation and humor. Fire only when the wording itself enacts a defense.",
  },
  {
    id: "attachment",
    label: "Attachment style",
    looksFor:
      "signals of secure, anxious, or avoidant attachment in how they describe closeness, needing others, conflict, or being let down. Fire only when the answer touches relating to others and shows a clear orientation.",
  },
  {
    id: "self_discrepancy",
    label: "Self-discrepancy (Higgins)",
    looksFor:
      "gaps between the actual self, the ideal self (hopes/aspirations), and the ought self (duties/obligations), and the emotion that gap produces (dejection vs. agitation). Fire only when a real gap between who they are and who they feel they should be is present.",
  },
  {
    id: "attribution",
    label: "Attribution / locus of control",
    looksFor:
      "how they explain outcomes — internal vs. external locus, stable vs. unstable, global vs. specific causes, self-serving bias. Fire only when the answer attributes a cause for something that happened to or because of them.",
  },
];

export const CAREER_FRAMEWORKS: FrameworkDef[] = [
  {
    id: "riasec",
    label: "Holland RIASEC",
    looksFor:
      "Holland interest types — Realistic, Investigative, Artistic, Social, Enterprising, Conventional. Fire when the answer reveals a pull toward one or more of these activity types.",
  },
  {
    id: "onet",
    label: "O*NET Interest Profiler",
    looksFor:
      "work-activity preferences in the O*NET frame — working with things, ideas, people, or data; preferred work contexts and tasks. Fire when concrete work-activity preferences show through.",
  },
  {
    id: "strong",
    label: "Strong Interest Inventory",
    looksFor:
      "occupational-interest themes and the kinds of work environments and roles the person gravitates toward or recoils from. Fire when the answer points at a vocational interest or aversion.",
  },
  {
    id: "career_anchors",
    label: "Schein Career Anchors",
    looksFor:
      "the underlying career anchor they will not give up — technical/functional competence, general management, autonomy, security/stability, entrepreneurial creativity, service/dedication, pure challenge, or lifestyle. Fire when a core motivator or non-negotiable is visible.",
  },
  {
    id: "big_five",
    label: "Big Five → occupation fit",
    looksFor:
      "Big Five traits (openness, conscientiousness, extraversion, agreeableness, neuroticism) evident in the answer, and the kinds of roles those traits fit. Fire when a trait clearly shows and has an occupational implication.",
  },
];

export function frameworksFor(mode: Mode): FrameworkDef[] {
  return mode === "career" ? CAREER_FRAMEWORKS : SELF_FRAMEWORKS;
}

/**
 * Resolve the framework(s) in play for a given mode + selection. "auto" returns
 * all five; a specific id returns just that one.
 */
export function selectedFrameworks(mode: Mode, selection: string): FrameworkDef[] {
  const all = frameworksFor(mode);
  if (!selection || selection === "auto") return all;
  const one = all.find((f) => f.id === selection);
  return one ? [one] : all;
}

/** A bullet list of the active frameworks for injection into an LLM prompt. */
export function frameworkBrief(mode: Mode, selection: string): string {
  return selectedFrameworks(mode, selection)
    .map((f) => `- ${f.id} — ${f.label}: ${f.looksFor}`)
    .join("\n");
}

export const MODE_LABEL: Record<Mode, string> = {
  self_knowledge: "self-knowledge",
  career: "career",
};

/** Title-cased mode label for stamping feedback and reports. */
export const MODE_DISPLAY: Record<Mode, string> = {
  self_knowledge: "Self-Knowledge",
  career: "Career",
};

/**
 * Human label for the active framework selection ("auto" → all frameworks).
 * The scholar attribution in parentheses (e.g. "(Beck / Burns)") is dropped so the
 * stamp matches the shorter labels the client UI shows.
 */
export function frameworkDisplayLabel(mode: Mode, selection: string): string {
  if (!selection || selection === "auto") return "all frameworks";
  const f = frameworksFor(mode).find((x) => x.id === selection);
  return f ? f.label.replace(/\s*\([^)]*\)\s*$/, "").trim() : "all frameworks";
}

/**
 * A short, human-readable stamp of the lens a piece of feedback or a report was
 * produced under, e.g. "Self-Knowledge lens · all frameworks" or
 * "Career lens · Holland RIASEC".
 */
export function lensStamp(mode: Mode, selection: string, stance?: string): string {
  const base = `${MODE_DISPLAY[mode]} lens · ${frameworkDisplayLabel(mode, selection)}`;
  return stance ? `${base} · ${stanceLabel(stance)}` : base;
}

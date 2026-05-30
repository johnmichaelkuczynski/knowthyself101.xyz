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
export function lensStamp(mode: Mode, selection: string): string {
  return `${MODE_DISPLAY[mode]} lens · ${frameworkDisplayLabel(mode, selection)}`;
}

// Client-side lens/framework catalog and labels. Mirrors the server's framework
// definitions so the UI can show which lens read an answer or produced a report.

export type Mode = "self_knowledge" | "career";

export type Stance =
  | "neutral"
  | "looking_for_good"
  | "really_looking_for_good"
  | "constructively_critical"
  | "constructively_very_critical"
  | "pure_damnation";

export type LensOption = { value: string; label: string };

// Temperament of the reader — an independent axis from mode/framework. Controls
// how charitable vs. severe the feedback is, ordered from kindest to harshest.
export const STANCE_OPTIONS: { value: Stance; label: string }[] = [
  { value: "neutral", label: "Neutral" },
  { value: "looking_for_good", label: "Looking for the good" },
  { value: "really_looking_for_good", label: "Really looking for the good" },
  { value: "constructively_critical", label: "Constructively critical" },
  { value: "constructively_very_critical", label: "Constructively very critical" },
  { value: "pure_damnation", label: "Pure damnation" },
];

const STANCE_LABELS: Record<Stance, string> = {
  neutral: "Neutral",
  looking_for_good: "Looking for the good",
  really_looking_for_good: "Really looking for the good",
  constructively_critical: "Constructively critical",
  constructively_very_critical: "Constructively very critical",
  pure_damnation: "Pure damnation",
};

/** Human label for a stance id, falling back to Neutral for unknown values. */
export function stanceLabel(stance: string | undefined | null): string {
  if (stance && stance in STANCE_LABELS) return STANCE_LABELS[stance as Stance];
  return STANCE_LABELS.neutral;
}

export const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: "self_knowledge", label: "Self-Knowledge" },
  { value: "career", label: "Career" },
];

export const MODE_DISPLAY: Record<Mode, string> = {
  self_knowledge: "Self-Knowledge",
  career: "Career",
};

export const SELF_FRAMEWORKS: LensOption[] = [
  { value: "auto", label: "Auto — surface what fires" },
  { value: "cognitive_distortions", label: "Cognitive distortions" },
  { value: "defense_mechanisms", label: "Defense mechanisms" },
  { value: "attachment", label: "Attachment style" },
  { value: "self_discrepancy", label: "Self-discrepancy" },
  { value: "attribution", label: "Attribution / locus of control" },
];

export const CAREER_FRAMEWORKS: LensOption[] = [
  { value: "auto", label: "Auto — surface what fires" },
  { value: "riasec", label: "Holland RIASEC" },
  { value: "onet", label: "O*NET Interest Profiler" },
  { value: "strong", label: "Strong Interest Inventory" },
  { value: "career_anchors", label: "Schein Career Anchors" },
  { value: "big_five", label: "Big Five → occupation fit" },
];

export function frameworksFor(mode: Mode): LensOption[] {
  return mode === "career" ? CAREER_FRAMEWORKS : SELF_FRAMEWORKS;
}

/** The active framework selection id for a mode, given both stored selections. */
export function activeFramework(
  mode: Mode,
  selfFramework: string,
  careerFramework: string,
): string {
  return mode === "career" ? careerFramework : selfFramework;
}

/** Human label for a framework selection ("auto" → all frameworks). */
export function frameworkDisplayLabel(mode: Mode, selection: string): string {
  if (!selection || selection === "auto") return "all frameworks";
  const f = frameworksFor(mode).find((x) => x.value === selection);
  return f ? f.label : "all frameworks";
}

/**
 * Short, human-readable stamp of the active lens, e.g.
 * "Self-Knowledge lens · Attachment style · Constructively critical".
 * The stance suffix is omitted for the neutral default to keep the stamp clean.
 */
export function lensStamp(mode: Mode, selection: string, stance?: string | null): string {
  const base = `${MODE_DISPLAY[mode]} lens · ${frameworkDisplayLabel(mode, selection)}`;
  if (!stance || stance === "neutral") return base;
  return `${base} · ${stanceLabel(stance)}`;
}

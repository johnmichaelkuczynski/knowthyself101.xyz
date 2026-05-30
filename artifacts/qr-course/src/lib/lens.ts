// Client-side lens/framework catalog and labels. Mirrors the server's framework
// definitions so the UI can show which lens read an answer or produced a report.

export type Mode = "self_knowledge" | "career";

export type LensOption = { value: string; label: string };

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

/** Short, human-readable stamp of the active lens, e.g. "Self-Knowledge lens · Attachment style". */
export function lensStamp(mode: Mode, selection: string): string {
  return `${MODE_DISPLAY[mode]} lens · ${frameworkDisplayLabel(mode, selection)}`;
}

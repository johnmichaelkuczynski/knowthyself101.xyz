import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSettings,
  useUpdateSettings,
  getGetSettingsQueryKey,
} from "@workspace/api-client-react";
import type {
  SettingsInputMode,
  SettingsInputSelfFramework,
  SettingsInputCareerFramework,
} from "@workspace/api-client-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Mode = "self_knowledge" | "career";

const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: "self_knowledge", label: "Self-Knowledge" },
  { value: "career", label: "Career" },
];

const SELF_FRAMEWORKS: { value: string; label: string }[] = [
  { value: "auto", label: "Auto — surface what fires" },
  { value: "cognitive_distortions", label: "Cognitive distortions" },
  { value: "defense_mechanisms", label: "Defense mechanisms" },
  { value: "attachment", label: "Attachment style" },
  { value: "self_discrepancy", label: "Self-discrepancy" },
  { value: "attribution", label: "Attribution / locus of control" },
];

const CAREER_FRAMEWORKS: { value: string; label: string }[] = [
  { value: "auto", label: "Auto — surface what fires" },
  { value: "riasec", label: "Holland RIASEC" },
  { value: "onet", label: "O*NET Interest Profiler" },
  { value: "strong", label: "Strong Interest Inventory" },
  { value: "career_anchors", label: "Schein Career Anchors" },
  { value: "big_five", label: "Big Five → occupation fit" },
];

export function ModeSwitcher() {
  const qc = useQueryClient();
  const { data: settings } = useGetSettings();
  const update = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        // Refresh settings everywhere; reports/feedback re-lens off the new mode.
        qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      },
    },
  });

  if (!settings) return null;

  const mode = settings.mode as Mode;
  const frameworks = mode === "career" ? CAREER_FRAMEWORKS : SELF_FRAMEWORKS;
  const framework = mode === "career" ? settings.careerFramework : settings.selfFramework;

  const setMode = (next: Mode) => {
    if (next === mode) return;
    update.mutate({ data: { mode: next as SettingsInputMode } });
  };

  const setFramework = (next: string) => {
    if (next === framework) return;
    update.mutate({
      data:
        mode === "career"
          ? { careerFramework: next as SettingsInputCareerFramework }
          : { selfFramework: next as SettingsInputSelfFramework },
    });
  };

  return (
    <div className="flex items-center gap-2" data-testid="mode-switcher">
      <span className="hidden lg:inline text-xs uppercase tracking-wider text-muted-foreground font-semibold">
        Lens
      </span>
      <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
        <SelectTrigger
          className="h-9 w-[150px] text-sm"
          data-testid="select-mode"
          title="Which lens reads your answers — self-knowledge or career fit"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MODE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} data-testid={`mode-${o.value}`}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={framework} onValueChange={setFramework}>
        <SelectTrigger
          className="h-9 w-[220px] text-sm"
          data-testid="select-framework"
          title="Auto runs all five frameworks and shows only those that genuinely fire"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {frameworks.map((o) => (
            <SelectItem key={o.value} value={o.value} data-testid={`framework-${o.value}`}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

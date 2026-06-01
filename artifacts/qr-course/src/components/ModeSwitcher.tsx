import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSettings,
  useUpdateSettings,
  getGetSettingsQueryKey,
  getGetLatestReportQueryKey,
  getGetReportHistoryQueryKey,
} from "@workspace/api-client-react";
import type {
  SettingsInputMode,
  SettingsInputSelfFramework,
  SettingsInputCareerFramework,
  SettingsInputStance,
} from "@workspace/api-client-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MODE_OPTIONS, frameworksFor, STANCE_OPTIONS, type Mode, type Stance } from "@/lib/lens";

export function ModeSwitcher() {
  const qc = useQueryClient();
  const { data: settings } = useGetSettings();
  const update = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        // Refresh settings everywhere; reports/feedback re-lens off the new mode.
        qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        // The saved profile + its history are mode-scoped; refetch them so the
        // Analytics page shows the new mode's persisted reading.
        qc.invalidateQueries({ queryKey: getGetLatestReportQueryKey() });
        qc.invalidateQueries({ queryKey: getGetReportHistoryQueryKey() });
      },
    },
  });

  if (!settings) return null;

  const mode = settings.mode as Mode;
  const frameworks = frameworksFor(mode);
  const framework = mode === "career" ? settings.careerFramework : settings.selfFramework;
  const stance = (settings.stance ?? "neutral") as Stance;

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

  const setStance = (next: Stance) => {
    if (next === stance) return;
    update.mutate({ data: { stance: next as SettingsInputStance } });
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
      <Select value={stance} onValueChange={(v) => setStance(v as Stance)}>
        <SelectTrigger
          className="h-9 w-[230px] text-sm"
          data-testid="select-stance"
          title="The reader's temperament — from charitable to severe — independent of the lens"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STANCE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} data-testid={`stance-${o.value}`}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

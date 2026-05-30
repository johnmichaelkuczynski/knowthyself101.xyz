import { eq } from "drizzle-orm";
import { db, appSettingsTable } from "@workspace/db";
import type { Mode } from "./frameworks";

export type AppSettings = {
  mode: Mode;
  selfFramework: string;
  careerFramework: string;
};

const DEFAULTS: AppSettings = {
  mode: "self_knowledge",
  selfFramework: "auto",
  careerFramework: "auto",
};

/** Ensure the single settings row (id = 1) exists; safe to call repeatedly. */
export async function ensureSettings(): Promise<void> {
  await db
    .insert(appSettingsTable)
    .values({ id: 1, ...DEFAULTS })
    .onConflictDoNothing({ target: appSettingsTable.id });
}

export async function getSettings(): Promise<AppSettings> {
  const [row] = await db
    .select()
    .from(appSettingsTable)
    .where(eq(appSettingsTable.id, 1));
  if (!row) {
    await ensureSettings();
    return { ...DEFAULTS };
  }
  return {
    mode: (row.mode === "career" ? "career" : "self_knowledge") as Mode,
    selfFramework: row.selfFramework || "auto",
    careerFramework: row.careerFramework || "auto",
  };
}

export async function updateSettings(
  patch: Partial<AppSettings>,
): Promise<AppSettings> {
  await ensureSettings();
  const next: AppSettings = { ...(await getSettings()), ...patch };
  await db
    .update(appSettingsTable)
    .set({
      mode: next.mode,
      selfFramework: next.selfFramework,
      careerFramework: next.careerFramework,
      updatedAt: new Date(),
    })
    .where(eq(appSettingsTable.id, 1));
  return next;
}

/** The active framework selection for the current mode. */
export function activeFramework(s: AppSettings): string {
  return s.mode === "career" ? s.careerFramework : s.selfFramework;
}

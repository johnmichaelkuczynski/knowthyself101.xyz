import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
  doublePrecision,
} from "drizzle-orm/pg-core";

// Distinct people whose work the app tracks. There is no auth: the app always
// operates as the "primary" user (the actual person using the course), while the
// diagnostics operate as the "synthetic" user. Giving the synthetic student its
// own ownership row is what keeps a self-test from ever touching the real user's
// attempts, practice, or evolving profile.
export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(), // "primary" | "synthetic"
  label: text("label").notNull(),
  isSynthetic: boolean("is_synthetic").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const topicsTable = pgTable("topics", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  weekNumber: integer("week_number").notNull(),
  blurb: text("blurb"),
  position: integer("position").notNull().default(0),
});

export const lecturesTable = pgTable("lectures", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id")
    .notNull()
    .references(() => topicsTable.id, { onDelete: "cascade" }),
  weekNumber: integer("week_number").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  bodyMedium: text("body_medium"),
  bodyLong: text("body_long"),
});

export const assignmentsTable = pgTable("assignments", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(), // homework | test | midterm | final
  title: text("title").notNull(),
  weekNumber: integer("week_number").notNull(),
  position: integer("position").notNull().default(0),
  isTimed: boolean("is_timed").notNull().default(false),
  timeLimitMinutes: integer("time_limit_minutes"),
  instructions: text("instructions"),
});

export const problemsTable = pgTable("problems", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id")
    .notNull()
    .references(() => assignmentsTable.id, { onDelete: "cascade" }),
  topicId: integer("topic_id")
    .notNull()
    .references(() => topicsTable.id),
  position: integer("position").notNull(),
  prompt: text("prompt").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation").notNull(),
  hint: text("hint"),
});

export const attemptsTable = pgTable("attempts", {
  id: serial("id").primaryKey(),
  // Owner of this attempt. Nullable only so existing rows survive the migration;
  // it is backfilled to the primary user at boot and always set on new inserts.
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  assignmentId: integer("assignment_id")
    .notNull()
    .references(() => assignmentsTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("in_progress"), // in_progress | submitted
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  deadlineAt: timestamp("deadline_at", { withTimezone: true }),
  scorePercent: doublePrecision("score_percent"),
});

export const answersTable = pgTable("answers", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id")
    .notNull()
    .references(() => attemptsTable.id, { onDelete: "cascade" }),
  problemId: integer("problem_id")
    .notNull()
    .references(() => problemsTable.id, { onDelete: "cascade" }),
  answer: text("answer").notNull().default(""),
  correct: boolean("correct"),
  explanation: text("explanation"),
  keystrokeCount: integer("keystroke_count").notNull().default(0),
  eraseCount: integer("erase_count").notNull().default(0),
  bulkInsertCount: integer("bulk_insert_count").notNull().default(0),
  longestBulkInsertChars: integer("longest_bulk_insert_chars").notNull().default(0),
  rewriteSegments: integer("rewrite_segments").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  aiScore: doublePrecision("ai_score"),
  aiFlagged: boolean("ai_flagged"),
  diachronicScore: doublePrecision("diachronic_score"),
  diachronicFlagged: boolean("diachronic_flagged"),
  detectionRationale: text("detection_rationale"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// A turn in the back-and-forth where the student pushes back on the app's reading
// of one of their answers. Persisted on purpose: it is real data about the person —
// how they argue, what they defend, whether they reconsider — and feeds the evolving
// self-portrait. Keyed by attempt + problem (matching how the UI addresses answers).
export const rebuttalsTable = pgTable("rebuttals", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id")
    .notNull()
    .references(() => attemptsTable.id, { onDelete: "cascade" }),
  problemId: integer("problem_id")
    .notNull()
    .references(() => problemsTable.id, { onDelete: "cascade" }),
  // Owner of this exchange, for scoping + analytics. Nullable only for migration
  // parity with the other owned tables; always set on insert.
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  userMessage: text("user_message").notNull(),
  appResponse: text("app_response").notNull(),
  // True when the app changed its reading in light of this push-back.
  revised: boolean("revised").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const practiceSessionsTable = pgTable("practice_sessions", {
  id: serial("id").primaryKey(),
  // Owner of this practice session (and, by cascade, its problems + attempts).
  // Nullable only for migration; backfilled to primary, always set on insert.
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  weekNumber: integer("week_number"),
  topicId: integer("topic_id"),
  tutorEnabled: boolean("tutor_enabled").notNull().default(false),
  focusOnWeaknesses: boolean("focus_on_weaknesses").notNull().default(true),
  difficulty: doublePrecision("difficulty").notNull().default(2.0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const practiceProblemsTable = pgTable("practice_problems", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => practiceSessionsTable.id, { onDelete: "cascade" }),
  topicId: integer("topic_id").notNull(),
  prompt: text("prompt").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation").notNull(),
  difficulty: doublePrecision("difficulty").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appSettingsTable = pgTable("app_settings", {
  id: integer("id").primaryKey().default(1),
  mode: text("mode").notNull().default("self_knowledge"), // self_knowledge | career
  selfFramework: text("self_framework").notNull().default("auto"),
  careerFramework: text("career_framework").notNull().default("auto"),
  // Temperament of the feedback — how charitable vs. severe the grader is.
  // neutral | looking_for_good | really_looking_for_good |
  // constructively_critical | constructively_very_critical | pure_damnation
  stance: text("stance").notNull().default("neutral"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// A timestamped snapshot of a generated self-portrait / career reading. Persisting
// every report is what gives the app real memory: the profile is remembered between
// visits, its evolution over time is visible, and each new reading is generated
// with the previous one as context so the picture genuinely builds rather than
// resetting on every generation. Scoped per user via userId.
export const profileReportsTable = pgTable("profile_reports", {
  id: serial("id").primaryKey(),
  // Owner of this snapshot. Each user evolves their own profile independently, so
  // the synthetic diagnostic's readings never mingle with the real user's memory.
  // Nullable only for migration; backfilled to primary, always set on insert.
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  mode: text("mode").notNull(), // self_knowledge | career
  framework: text("framework").notNull(), // active framework when generated (e.g. auto)
  narrative: text("narrative").notNull(),
  patterns: jsonb("patterns").notNull().$type<string[]>().default([]),
  tensions: jsonb("tensions").notNull().$type<string[]>().default([]),
  questions: jsonb("questions").notNull().$type<string[]>().default([]),
  answeredCount: integer("answered_count").notNull().default(0),
  assignmentCount: integer("assignment_count").notNull().default(0),
  practiceCount: integer("practice_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const practiceAttemptsTable = pgTable("practice_attempts", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => practiceSessionsTable.id, { onDelete: "cascade" }),
  problemId: integer("problem_id")
    .notNull()
    .references(() => practiceProblemsTable.id, { onDelete: "cascade" }),
  topicId: integer("topic_id").notNull(),
  answer: text("answer").notNull(),
  correct: boolean("correct").notNull(),
  difficulty: doublePrecision("difficulty").notNull(),
  trace: jsonb("trace"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

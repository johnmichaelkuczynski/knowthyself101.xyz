import { eq, isNull } from "drizzle-orm";
import {
  db,
  usersTable,
  attemptsTable,
  practiceSessionsTable,
  profileReportsTable,
} from "@workspace/db";

// The app has no auth. It always operates as the PRIMARY user (the actual person
// taking the course); the diagnostics operate as the SYNTHETIC user. Keeping the
// synthetic student as a distinct owner is what guarantees a self-test can never
// override, hijack, or pollute the real user's work or evolving profile.
export const PRIMARY_USER_SLUG = "primary";
export const SYNTHETIC_USER_SLUG = "synthetic";

let primaryIdCache: number | null = null;
let syntheticIdCache: number | null = null;

/** Create the two well-known users if they don't already exist. Idempotent. */
export async function ensureUsers(): Promise<void> {
  await db
    .insert(usersTable)
    .values([
      { slug: PRIMARY_USER_SLUG, label: "You", isSynthetic: false },
      {
        slug: SYNTHETIC_USER_SLUG,
        label: "Synthetic diagnostic student",
        isSynthetic: true,
      },
    ])
    .onConflictDoNothing({ target: usersTable.slug });
}

async function idForSlug(slug: string): Promise<number> {
  const [row] = await db.select().from(usersTable).where(eq(usersTable.slug, slug));
  if (row) return row.id;
  // Self-heal: the users may not have been seeded yet.
  await ensureUsers();
  const [again] = await db.select().from(usersTable).where(eq(usersTable.slug, slug));
  if (!again) throw new Error(`user "${slug}" is missing and could not be created`);
  return again.id;
}

export async function getPrimaryUserId(): Promise<number> {
  if (primaryIdCache != null) return primaryIdCache;
  primaryIdCache = await idForSlug(PRIMARY_USER_SLUG);
  return primaryIdCache;
}

export async function getSyntheticUserId(): Promise<number> {
  if (syntheticIdCache != null) return syntheticIdCache;
  syntheticIdCache = await idForSlug(SYNTHETIC_USER_SLUG);
  return syntheticIdCache;
}

/**
 * Ensure both users exist and assign any pre-existing, unowned rows (created
 * before ownership was introduced) to the primary user. Safe to call on every
 * boot: once backfilled there are no NULL owners left to touch.
 */
export async function ensureUsersAndBackfill(): Promise<void> {
  await ensureUsers();
  const primaryId = await getPrimaryUserId();
  await db
    .update(attemptsTable)
    .set({ userId: primaryId })
    .where(isNull(attemptsTable.userId));
  await db
    .update(practiceSessionsTable)
    .set({ userId: primaryId })
    .where(isNull(practiceSessionsTable.userId));
  await db
    .update(profileReportsTable)
    .set({ userId: primaryId })
    .where(isNull(profileReportsTable.userId));
}

/**
 * Data-access helpers for user preferences.
 *
 * Callers pass the Clerk user id; the helpers look up the corresponding local
 * `users` row and read/write `preferences` (a jsonb column). When the row does
 * not exist yet (e.g. first visit before syncCurrentUser runs) the helpers
 * fail gracefully — getPreferences returns {} and savePreferences is a no-op.
 */
import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { users, type UserPreferences } from "@/lib/db/schema"

/**
 * Return the stored preferences for a Clerk user, or an empty object when the
 * local users row does not exist or has no preferences saved yet.
 */
export async function getPreferences(
  clerkUserId: string,
): Promise<UserPreferences> {
  const [row] = await db
    .select({ preferences: users.preferences })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1)
  return row?.preferences ?? {}
}

/**
 * Persist preferences for a Clerk user. If no local users row exists the
 * update silently affects zero rows — the caller should not treat that as an
 * error (syncCurrentUser will create the row on the next navigation).
 */
export async function savePreferences(
  clerkUserId: string,
  prefs: UserPreferences,
): Promise<void> {
  await db
    .update(users)
    .set({ preferences: prefs })
    .where(eq(users.clerkUserId, clerkUserId))
}

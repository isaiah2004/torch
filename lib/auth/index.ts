/**
 * Clerk-backed auth helpers.
 *
 * Admin is determined from Clerk org/role metadata (per product decision):
 * either an organization role of `org:admin`, or a `role: "admin"` claim in the
 * session token's public metadata. Configure one of these in the Clerk
 * dashboard (and add `metadata` to the session token if using the latter).
 */
import { auth, currentUser } from "@clerk/nextjs/server"

import { logger } from "@/lib/logging"

export interface SessionMetadata {
  role?: "admin" | "user"
}

/** The authenticated Clerk user id, or null when signed out. */
export async function getUserId(): Promise<string | null> {
  const { userId } = await auth()
  return userId
}

/** Throws (for route handlers) when there is no authenticated user. */
export async function requireUserId(): Promise<string> {
  const userId = await getUserId()
  if (!userId) throw new UnauthorizedError()
  return userId
}

/** True when the session carries admin privileges via org or metadata role. */
export async function isAdmin(): Promise<boolean> {
  const { has, sessionClaims } = await auth()
  if (typeof has === "function" && has({ role: "org:admin" })) return true
  const claims = sessionClaims as { metadata?: SessionMetadata } | null
  return claims?.metadata?.role === "admin"
}

/** Throws unless the caller is an authenticated admin. */
export async function requireAdmin(): Promise<string> {
  const userId = await requireUserId()
  if (!(await isAdmin())) throw new ForbiddenError()
  return userId
}

/**
 * Ensure a local `users` row exists for the current Clerk user and return it.
 * Best-effort: returns null when the database is not configured.
 */
export async function syncCurrentUser() {
  if (!process.env.DATABASE_URL) return null
  const clerkUser = await currentUser()
  if (!clerkUser) return null

  const { db } = await import("@/lib/db")
  const { users } = await import("@/lib/db/schema")

  const email = clerkUser.primaryEmailAddress?.emailAddress ?? null
  const displayName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null
  const admin = await isAdmin()

  const [row] = await db
    .insert(users)
    .values({
      clerkUserId: clerkUser.id,
      email,
      displayName,
      role: admin ? "admin" : "user",
    })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: { email, displayName, role: admin ? "admin" : "user" },
    })
    .returning()

  logger.debug("auth.syncUser", { userId: row?.id, data: { clerkId: clerkUser.id } })
  return row ?? null
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized")
    this.name = "UnauthorizedError"
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden")
    this.name = "ForbiddenError"
  }
}

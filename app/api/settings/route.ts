/**
 * /api/settings — read and write the signed-in user's preferences.
 *
 * GET  → { preferences: UserPreferences }   (401 when signed out)
 * POST → { ok: true }                        (401 / 422 on bad input)
 */
import { z } from "zod"

import { getUserId } from "@/lib/auth"
import {
  getPreferences,
  savePreferences,
} from "@/lib/db/queries/user-prefs"

export const runtime = "nodejs"

const prefsSchema = z.object({
  preferredTraditions: z
    .array(z.enum(["REF", "LUT", "WES", "BAP", "ANG", "ECU"]))
    .optional(),
  defaultTranslation: z
    .enum(["KJV", "ASV", "YLT", "BSB", "GEN"])
    .optional(),
})

export async function GET() {
  const clerkUserId = await getUserId()
  if (!clerkUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const preferences = await getPreferences(clerkUserId)
  return Response.json({ preferences })
}

export async function POST(req: Request) {
  const clerkUserId = await getUserId()
  if (!clerkUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const result = prefsSchema.safeParse(body)
  if (!result.success) {
    return Response.json(
      { error: "Invalid preferences", issues: result.error.issues },
      { status: 422 },
    )
  }

  await savePreferences(clerkUserId, result.data)
  return Response.json({ ok: true })
}

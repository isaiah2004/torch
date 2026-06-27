/**
 * Settings page — loads the current user's preferences server-side and passes
 * them to the interactive client form.
 */
import { getUserId } from "@/lib/auth"
import { getPreferences } from "@/lib/db/queries/user-prefs"
import { PreferencesForm } from "@/components/settings/preferences-form"
import type { UserPreferences } from "@/lib/db/schema"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const clerkUserId = await getUserId()

  const prefs: UserPreferences = clerkUserId
    ? await getPreferences(clerkUserId).catch(() => ({}) as UserPreferences)
    : {}

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 lg:px-6">
      <h1 className="text-lg font-semibold">Settings</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Tune how Torch retrieves and presents answers.
      </p>

      <PreferencesForm
        initialTraditions={prefs.preferredTraditions ?? []}
        initialTranslation={prefs.defaultTranslation ?? ""}
      />
    </div>
  )
}

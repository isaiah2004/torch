import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const TRADITIONS = [
  ["REF", "Reformed / Calvinist"],
  ["LUT", "Lutheran"],
  ["WES", "Wesleyan / Arminian"],
  ["BAP", "Baptist / evangelical"],
  ["ANG", "Anglican"],
  ["ECU", "Broadly Protestant"],
]

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 lg:px-6">
      <h1 className="text-lg font-semibold">Settings</h1>
      <p className="text-sm text-muted-foreground">
        Tune how Torch retrieves and presents answers.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preferred traditions</CardTitle>
            <CardDescription>
              Torch stays neutral across traditions by default and always
              explains where camps disagree. Choosing a lens only adjusts
              emphasis — full preference controls arrive in Phase 4.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {TRADITIONS.map(([code, label]) => (
              <span
                key={code}
                className="rounded-md border px-2.5 py-1 text-xs text-muted-foreground"
                title={label}
              >
                {code}
              </span>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>
              Manage your profile and security from the account menu in the
              sidebar (powered by Clerk).
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}

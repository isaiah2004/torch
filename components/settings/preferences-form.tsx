"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Toaster } from "@/components/ui/sonner"

const TRADITIONS = [
  { code: "REF", label: "Reformed / Calvinist" },
  { code: "LUT", label: "Lutheran" },
  { code: "WES", label: "Wesleyan / Arminian" },
  { code: "BAP", label: "Baptist / Evangelical" },
  { code: "ANG", label: "Anglican" },
  { code: "ECU", label: "Ecumenical / Broadly Protestant" },
] as const

const TRANSLATIONS = [
  { code: "KJV", label: "KJV — King James Version" },
  { code: "ASV", label: "ASV — American Standard Version" },
  { code: "YLT", label: "YLT — Young's Literal Translation" },
  { code: "BSB", label: "BSB — Berean Standard Bible" },
  { code: "GEN", label: "GEN — Geneva Bible (1599)" },
] as const

type TraditionCode = (typeof TRADITIONS)[number]["code"]

interface PreferencesFormProps {
  initialTraditions: string[]
  initialTranslation: string
}

export function PreferencesForm({
  initialTraditions,
  initialTranslation,
}: PreferencesFormProps) {
  const [traditions, setTraditions] = React.useState<Set<TraditionCode>>(
    () => new Set(initialTraditions.filter((t): t is TraditionCode =>
      TRADITIONS.some((tr) => tr.code === t),
    )),
  )
  const [translation, setTranslation] = React.useState<string>(initialTranslation)
  const [pending, setPending] = React.useState(false)

  function toggleTradition(code: TraditionCode, checked: boolean) {
    setTraditions((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(code)
      } else {
        next.delete(code)
      }
      return next
    })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferredTraditions: Array.from(traditions),
          defaultTranslation: translation || undefined,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `Request failed (${res.status})`)
      }
      toast.success("Preferences saved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save preferences")
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <Toaster />
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        {/* Traditions card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preferred traditions</CardTitle>
            <CardDescription>
              Torch stays neutral across traditions by default and always
              explains where camps disagree. Selecting a lens adjusts emphasis
              in retrieved sources — you can pick more than one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TRADITIONS.map(({ code, label }) => (
                <label
                  key={code}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-transparent p-2 transition-colors hover:bg-muted/50 has-[:checked]:border-primary/30 has-[:checked]:bg-primary/5"
                >
                  <Checkbox
                    checked={traditions.has(code)}
                    onCheckedChange={(checked) =>
                      toggleTradition(code, checked === true)
                    }
                  />
                  <span className="text-sm leading-none">
                    <span className="font-medium">{code}</span>
                    <span className="ml-1.5 text-muted-foreground">
                      {label}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Default translation card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Default Bible translation</CardTitle>
            <CardDescription>
              The translation Torch prefers when quoting scripture. All
              options are public-domain texts that can be displayed in full.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="translation-select" className="text-xs text-muted-foreground">
                Translation
              </Label>
              <Select
                value={translation}
                onValueChange={setTranslation}
              >
                <SelectTrigger id="translation-select" className="w-full sm:w-72">
                  <SelectValue placeholder="Choose a translation…" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSLATIONS.map(({ code, label }) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Account card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>
              Manage your profile and security from the account menu in the
              sidebar (powered by Clerk).
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Save button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending} size="default">
            {pending ? "Saving…" : "Save preferences"}
          </Button>
        </div>
      </form>
    </>
  )
}

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Confidence } from "@/lib/db/schema"

const STYLES: Record<Confidence["level"], string> = {
  high: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  low: "bg-muted text-muted-foreground",
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <Badge
      variant="secondary"
      className={cn("gap-1 font-normal", STYLES[confidence.level])}
      title={confidence.reason}
    >
      Confidence: {confidence.level}
    </Badge>
  )
}

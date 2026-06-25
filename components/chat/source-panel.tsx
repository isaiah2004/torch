import { BookOpenIcon, ExternalLinkIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import type { Citation } from "@/lib/db/schema"

/**
 * Renders the "Supporting Sources" for an answer: each retrieved citation with
 * its verbatim quote and precise attribution. Users can inspect exactly where
 * every claim came from.
 */
export function SourcePanel({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null

  return (
    <div className="mt-3 flex flex-col gap-2">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Supporting sources
      </p>
      {citations.map((c, i) => (
        <Card key={`${c.chunkId}-${i}`} className="border-l-2 border-l-primary/50">
          <CardContent className="flex flex-col gap-2 p-3">
            {c.quote && (
              <blockquote className="text-sm leading-relaxed italic">
                “{c.quote}”
              </blockquote>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BookOpenIcon className="size-3.5 shrink-0" />
              <span className="truncate">
                {[c.author, c.work].filter(Boolean).join(", ")}
                {c.page ? `, p. ${c.page}` : ""}
              </span>
              {c.url && (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-1 hover:text-foreground"
                >
                  Source <ExternalLinkIcon className="size-3" />
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

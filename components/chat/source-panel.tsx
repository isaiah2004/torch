import { BookOpenIcon, ChevronRightIcon, ExternalLinkIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import type { Citation } from "@/lib/db/schema"

/**
 * "Supporting Sources" for an answer — each retrieved citation with its verbatim
 * quote and attribution. Collapsed by default (a single click expands), since an
 * answer can cite many passages. Uses a native <details> so it needs no JS.
 */
export function SourcePanel({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null

  return (
    <details className="group mt-3">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase select-none hover:text-foreground">
        <ChevronRightIcon className="size-3.5 transition-transform group-open:rotate-90" />
        Supporting sources ({citations.length})
      </summary>

      <div className="mt-2 flex flex-col gap-2">
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
    </details>
  )
}

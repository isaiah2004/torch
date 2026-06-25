import Link from "next/link"
import { FlameIcon } from "lucide-react"

/**
 * ChatGPT-style authentication layout: a centered, compact card with the brand
 * mark at the top and left-aligned copy above the Clerk auth box.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 self-start text-lg font-semibold"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <FlameIcon className="size-5" />
          </span>
          Torch
        </Link>

        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Theological research, grounded in real sources
          </h1>
          <p className="text-sm text-muted-foreground">
            Ask hard questions and receive trustworthy, well-sourced answers
            with verifiable quotations and citations.
          </p>
        </div>

        {children}
      </div>
    </div>
  )
}

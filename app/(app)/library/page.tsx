import { LibraryBigIcon } from "lucide-react"

export default function LibraryPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 lg:px-6">
      <h1 className="text-lg font-semibold">Source library</h1>
      <p className="text-sm text-muted-foreground">
        The trusted works Torch retrieves from — systematic theologies,
        commentaries, confessions, church fathers, and modern scholarship.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <LibraryBigIcon className="size-8 text-muted-foreground" />
        <p className="max-w-md text-sm text-muted-foreground">
          The library populates once documents are ingested (Phase 2). Sources
          are seeded from the curated theology knowledge base, tagged by
          tradition for fair, transparent answers.
        </p>
      </div>
    </div>
  )
}

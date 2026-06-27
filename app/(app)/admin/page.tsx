import Link from "next/link"
import {
  ActivityIcon,
  DatabaseIcon,
  SearchCheckIcon,
  WorkflowIcon,
  MessagesSquareIcon,
  ShieldAlertIcon,
  BookOpenIcon,
  FileTextIcon,
  LayersIcon,
  MessageCircleIcon,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { isAdmin } from "@/lib/auth"
import { getOverviewStats } from "@/lib/db/queries/admin-requests"

export const dynamic = "force-dynamic"

// ── Sub-page navigation panels ──────────────────────────────────────────────

const PANELS = [
  {
    title: "AI Requests",
    description:
      "Every non-private question: latency, provider, tokens, retrieval count.",
    href: "/admin/requests",
    icon: ActivityIcon,
  },
  {
    title: "Embeddings",
    description:
      "Ingestion + embedding jobs, document/chunk counts, vector stats.",
    href: "/admin/embeddings",
    icon: DatabaseIcon,
  },
  {
    title: "Retrieval inspector",
    description:
      "Retrieved chunks, similarity scores, selected vs rejected evidence.",
    href: "/admin/retrieval",
    icon: SearchCheckIcon,
  },
  {
    title: "Graph execution",
    description:
      "LangGraph state, executed/skipped nodes, tool calls, validation.",
    href: "/admin/graph",
    icon: WorkflowIcon,
  },
  {
    title: "Sessions",
    description:
      "Inspect conversations, messages, citations (never private mode).",
    href: "/admin/sessions",
    icon: MessagesSquareIcon,
  },
]

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {label}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">
          {value.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 px-4 py-20 text-center">
        <ShieldAlertIcon className="size-8 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Admin access required</h1>
        <p className="text-sm text-muted-foreground">
          This area is restricted to administrators. Admin is granted via Clerk
          org/role metadata.
        </p>
      </div>
    )
  }

  const stats = await getOverviewStats()

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
      {/* Header */}
      <h1 className="text-lg font-semibold">Admin & debugging</h1>
      <p className="text-sm text-muted-foreground">
        Full observability into retrieval, embeddings, and the reasoning graph.
      </p>

      {/* Overview stats */}
      <section className="mt-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Corpus overview
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Sources" value={stats.sources} icon={BookOpenIcon} />
          <StatCard
            label="Documents"
            value={stats.documents}
            icon={FileTextIcon}
          />
          <StatCard label="Chunks" value={stats.chunks} icon={LayersIcon} />
          <StatCard
            label="AI Requests"
            value={stats.aiRequests}
            icon={ActivityIcon}
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Conversations"
            value={stats.conversations}
            icon={MessagesSquareIcon}
          />
          <StatCard
            label="Messages"
            value={stats.messages}
            icon={MessageCircleIcon}
          />
          <StatCard
            label="Bible verses"
            value={stats.bibleVerses}
            icon={BookOpenIcon}
          />
          <StatCard
            label="Translations"
            value={stats.bibleTranslations}
            icon={DatabaseIcon}
          />
        </div>
      </section>

      {/* Sub-page links */}
      <section className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Inspector panels
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PANELS.map((p) => (
            <Link key={p.href} href={p.href} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/50">
                <CardHeader>
                  <p.icon className="size-5 text-primary" />
                  <CardTitle className="mt-2 text-base">{p.title}</CardTitle>
                  <CardDescription>{p.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  View →
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

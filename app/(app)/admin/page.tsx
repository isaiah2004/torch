import Link from "next/link"
import {
  ActivityIcon,
  DatabaseIcon,
  SearchCheckIcon,
  WorkflowIcon,
  MessagesSquareIcon,
  ShieldAlertIcon,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { isAdmin } from "@/lib/auth"

const PANELS = [
  {
    title: "AI Requests",
    description: "Every non-private question: latency, provider, tokens, retrieval count.",
    href: "/admin/requests",
    icon: ActivityIcon,
  },
  {
    title: "Embeddings",
    description: "Ingestion + embedding jobs, document/chunk counts, vector stats.",
    href: "/admin/embeddings",
    icon: DatabaseIcon,
  },
  {
    title: "Retrieval inspector",
    description: "Retrieved chunks, similarity scores, selected vs rejected evidence.",
    href: "/admin/retrieval",
    icon: SearchCheckIcon,
  },
  {
    title: "Graph execution",
    description: "LangGraph state, executed/skipped nodes, tool calls, validation.",
    href: "/admin/graph",
    icon: WorkflowIcon,
  },
  {
    title: "Sessions",
    description: "Inspect conversations, messages, citations (never private mode).",
    href: "/admin/sessions",
    icon: MessagesSquareIcon,
  },
]

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

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
      <h1 className="text-lg font-semibold">Admin & debugging</h1>
      <p className="text-sm text-muted-foreground">
        Full observability into retrieval, embeddings, and the reasoning graph.
        Dashboards are wired to live data across Phases 2–4.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PANELS.map((p) => (
          <Link key={p.href} href={p.href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/50">
              <CardHeader>
                <p.icon className="size-5 text-primary" />
                <CardTitle className="mt-2 text-base">{p.title}</CardTitle>
                <CardDescription>{p.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Coming online in a later phase →
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { syncCurrentUser } from "@/lib/auth"

// The app shell is authenticated and per-user; never statically prerender it.
export const dynamic = "force-dynamic"

/**
 * Authenticated application shell: persistent sidebar + header around every
 * signed-in screen (chat, history, library, settings, admin).
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Best-effort: keep the local users row in sync with Clerk on navigation.
  await syncCurrentUser().catch(() => null)

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

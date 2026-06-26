/**
 * Clerk auth at the network boundary + service-role partitioning.
 *
 * Next.js 16 renamed the `middleware` convention to `proxy` (nodejs runtime).
 * Public routes (auth pages, health) are open; everything else requires a
 * signed-in user. API routes do their own role checks on top of this.
 *
 * APP_ROLE partitions one image into the two app containers (see Dockerfile /
 * docker-compose.yml):
 *   web   → user-facing app; the admin surface is hidden (404).
 *   admin → admin dashboards + observability + ingest only; user routes 404.
 *   all   → everything (default; single-deploy / local dev).
 * Admin *authorization* is still enforced per-route by requireAdmin(); this only
 * controls which surface each container exposes.
 */
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
])

const isAdminRoute = createRouteMatcher([
  "/admin(.*)",
  "/api/admin(.*)",
  "/api/ingest(.*)",
])

const APP_ROLE = process.env.APP_ROLE ?? "all"

export default clerkMiddleware(async (auth, req) => {
  // Service-role partitioning across the web / admin containers.
  if (APP_ROLE === "web" && isAdminRoute(req)) {
    return new NextResponse("Not found", { status: 404 })
  }
  if (APP_ROLE === "admin" && !isAdminRoute(req) && !isPublicRoute(req)) {
    if (req.nextUrl.pathname === "/") {
      return NextResponse.redirect(new URL("/admin", req.url))
    }
    return new NextResponse("Not found", { status: 404 })
  }

  if (!isPublicRoute(req)) {
    // API routes get a 401 JSON; page routes redirect to sign-in.
    if (req.nextUrl.pathname.startsWith("/api")) {
      const { userId } = await auth()
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    } else {
      await auth.protect()
    }
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
    // Clerk auto-proxy / handshake path.
    "/__clerk/:path*",
  ],
}

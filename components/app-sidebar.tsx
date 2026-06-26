"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  FlameIcon,
  MessageSquareTextIcon,
  HistoryIcon,
  LibraryBigIcon,
  Settings2Icon,
  ShieldIcon,
  PlusIcon,
} from "lucide-react"

import { NavUser } from "@/components/nav-user"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navMain = [
  { title: "Chat", url: "/chat", icon: MessageSquareTextIcon },
  { title: "History", url: "/history", icon: HistoryIcon },
  { title: "Source Library", url: "/library", icon: LibraryBigIcon },
]

const navSecondary = [
  { title: "Settings", url: "/settings", icon: Settings2Icon },
  { title: "Admin", url: "/admin", icon: ShieldIcon, adminOnly: true },
]

export function AppSidebar({
  isAdmin = false,
  ...props
}: React.ComponentProps<typeof Sidebar> & { isAdmin?: boolean }) {
  const pathname = usePathname()
  const isActive = (url: string) =>
    pathname === url || pathname.startsWith(`${url}/`)
  const secondary = navSecondary.filter((i) => !i.adminOnly || isAdmin)

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/chat">
                <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <FlameIcon className="size-4" />
                </span>
                <span className="text-base font-semibold">Torch</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <Button asChild className="w-full justify-start gap-2">
                  <Link href="/chat">
                    <PlusIcon className="size-4" />
                    New conversation
                  </Link>
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarMenu>
              {navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive(item.url)}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {secondary.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive(item.url)}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}

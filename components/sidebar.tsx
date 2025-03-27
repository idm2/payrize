"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LucideIcon } from "lucide-react"
import {
  BarChart3,
  CreditCard,
  Home,
  LineChart,
  PiggyBank,
  Settings,
  X,
  Menu,
  Tags,
  FolderOpen,
  List
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ModeToggle } from "@/components/mode-toggle"
import { Separator } from "@/components/ui/separator"

interface NavProps {
  isCollapsed: boolean
  links: {
    title: string
    label?: string
    icon: LucideIcon
    variant: "default" | "ghost"
    href: string
  }[]
}

export function Nav({ links, isCollapsed }: NavProps) {
  const pathname = usePathname()

  return (
    <div
      data-collapsed={isCollapsed}
      className="group flex flex-col gap-4 py-2 data-[collapsed=true]:py-2"
    >
      <nav className="grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
        {links.map((link, index) =>
          isCollapsed ? (
            <Button
              key={index}
              variant={link.variant}
              size="icon"
              className={cn(
                "h-9 w-9",
                link.variant === "default" &&
                  "dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-white"
              )}
              asChild
            >
              <Link
                href={link.href}
                className={cn(
                  pathname === link.href &&
                    "dark:bg-muted dark:text-white dark:hover:bg-muted dark:hover:text-white",
                  pathname === link.href &&
                    link.variant === "default" &&
                    "dark:bg-muted dark:text-white dark:hover:bg-muted dark:hover:text-white"
                )}
              >
                <link.icon className="h-4 w-4" />
                <span className="sr-only">{link.title}</span>
              </Link>
            </Button>
          ) : (
            <Button
              key={index}
              variant={link.variant}
              size="sm"
              className={cn(
                "justify-start",
                link.variant === "default" &&
                  "dark:bg-muted dark:text-white dark:hover:bg-muted dark:hover:text-white"
              )}
              asChild
            >
              <Link
                href={link.href}
                className={cn(
                  pathname === link.href &&
                    "dark:bg-muted dark:text-white dark:hover:bg-muted dark:hover:text-white",
                  pathname === link.href &&
                    link.variant === "default" &&
                    "dark:bg-muted dark:text-white dark:hover:bg-muted dark:hover:text-white"
                )}
              >
                <link.icon className="mr-2 h-4 w-4" />
                {link.title}
                {link.label && (
                  <span
                    className={cn(
                      "ml-auto",
                      link.variant === "default" &&
                        "text-background dark:text-white"
                    )}
                  >
                    {link.label}
                  </span>
                )}
              </Link>
            </Button>
          )
        )}
      </nav>
    </div>
  )
}

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const pathname = usePathname()

  const routes: NavProps["links"] = [
    {
      title: "Dashboard",
      icon: Home,
      variant: pathname === "/" ? "default" : "ghost",
      href: "/",
    },
    {
      title: "Plans",
      icon: FolderOpen,
      variant: pathname === "/plans" ? "default" : "ghost",
      href: "/plans",
    },
    {
      title: "Expenses",
      icon: CreditCard,
      variant: pathname === "/expenses" ? "default" : "ghost",
      href: "/expenses",
    },
    {
      title: "Savings",
      icon: PiggyBank,
      variant: pathname === "/savings" ? "default" : "ghost",
      href: "/savings",
    },
    {
      title: "Tracker",
      icon: LineChart,
      variant: pathname === "/tracker" ? "default" : "ghost",
      href: "/tracker",
    },
    {
      title: "Analytics",
      icon: BarChart3,
      variant: pathname.includes("/analytics") ? "default" : "ghost",
      href: "/analytics",
    },
    {
      title: "Categories",
      icon: List,
      variant: pathname === "/categories" ? "default" : "ghost",
      href: "/categories",
    },
    {
      title: "Settings",
      icon: Settings,
      variant: pathname === "/settings" ? "default" : "ghost",
      href: "/settings",
    },
  ]

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 md:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col">
          <div className="flex items-center border-b px-2 pb-2">
            <h2 className="text-lg font-semibold">Payrize</h2>
            <div className="ml-auto">
              <ModeToggle />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <Nav isCollapsed={false} links={routes} />
          </ScrollArea>
        </SheetContent>
      </Sheet>
      <div className="hidden border-r bg-muted/40 md:flex md:w-[270px] md:flex-col">
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="text-lg">Payrize</span>
          </Link>
          <div className="ml-auto">
            <ModeToggle />
          </div>
        </div>
        <div className="flex-1">
          <Nav isCollapsed={isCollapsed} links={routes} />
        </div>
      </div>
    </>
  )
}


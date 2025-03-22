"use client"

import type React from "react"

import { Sidebar } from "@/components/sidebar"

export function DashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <main className="flex-1">
          <div className="container py-4 px-4 sm:py-6 md:py-8">{children}</div>
        </main>
        <footer className="border-t py-4 sm:py-6 md:py-0">
          <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row px-4">
            <p className="text-center text-xs sm:text-sm leading-loose text-muted-foreground md:text-left">
              Built with Next.js and Tailwind CSS. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}


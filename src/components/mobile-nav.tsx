"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface MobileNavProps {
  navItems: { title: string; href: string }[]
  userName: string
  workspaceName: string
  signOut: () => void
}

export default function MobileNav({
  navItems,
  userName,
  workspaceName,
  signOut,
}: MobileNavProps) {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className="inline-flex h-9 w-9 items-center justify-center border-2 border-[#0B0B0E] bg-[#F2ECD9] text-[#0B0B0E]"
        >
          <Menu className="h-4 w-4" />
        </button>
      </SheetTrigger>
      <SheetContent className="border-l-2 border-[#0B0B0E] bg-[#F2ECD9] text-[#0B0B0E]">
        <SheetHeader className="border-b-2 border-[#0B0B0E] pb-4">
          <SheetTitle className="font-stamp text-[14px] uppercase tracking-[0.18em]">
            Jargon Jar
          </SheetTitle>
          <div className="text-[10px] uppercase tracking-[0.22em] text-[#0B0B0E]/55">
            / Dept. of Fines
          </div>
        </SheetHeader>

        <div className="mt-4 border-2 border-[#0B0B0E] bg-[#F2ECD9] p-3">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[#0B0B0E]/55">
            Filed by
          </div>
          <div className="font-stamp text-[13px] uppercase tracking-[0.08em]">
            {userName}
          </div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-[#0B0B0E]/55">
            {workspaceName}
          </div>
        </div>

        <nav className="mt-6 flex flex-col">
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "font-stamp border-b border-dotted border-[#0B0B0E]/30 py-3 text-[12px] uppercase tracking-[0.22em] text-[#DC2626]"
                    : "border-b border-dotted border-[#0B0B0E]/30 py-3 text-[12px] uppercase tracking-[0.22em] text-[#0B0B0E]/80 hover:text-[#DC2626]"
                }
                onClick={() => setOpen(false)}
              >
                {item.title}
              </Link>
            )
          })}
        </nav>

        <form action={signOut} className="mt-8">
          <button
            type="submit"
            className="font-stamp w-full bg-[#0B0B0E] px-3 py-3 text-[12px] uppercase tracking-[0.18em] text-[#F2ECD9] hover:bg-[#DC2626]"
          >
            Sign out
          </button>
        </form>
      </SheetContent>
    </Sheet>
  )
}

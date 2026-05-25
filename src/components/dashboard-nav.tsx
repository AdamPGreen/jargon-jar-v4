"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

interface DashboardNavProps {
  items: { title: string; href: string }[]
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function DashboardNav({ items }: DashboardNavProps) {
  const pathname = usePathname()

  return (
    <nav className="hidden items-center gap-5 md:flex">
      {items.map((item) => {
        const active = isActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "text-[12px] uppercase tracking-[0.18em] text-[#0B0B0E] underline decoration-2 decoration-[#0B0B0E] underline-offset-[6px]"
                : "text-[12px] uppercase tracking-[0.18em] text-[#0B0B0E]/70 transition-colors hover:text-[#0B0B0E]"
            }
          >
            {item.title}
          </Link>
        )
      })}
    </nav>
  )
}

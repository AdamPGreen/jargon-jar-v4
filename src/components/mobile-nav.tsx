"use client"

import * as React from "react"
import Link from "next/link"
import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface MobileNavProps {
  navItems: {
    title: string
    href: string
  }[]
  userName: string
  workspaceName: string
  signOut: () => void
}

export default function MobileNav({ navItems, userName, workspaceName, signOut }: MobileNavProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Jargon Jar</SheetTitle>
        </SheetHeader>
        
        <div className="mt-2 flex flex-col text-sm text-muted-foreground">
          <span>{userName}</span>
          <span>{workspaceName}</span>
        </div>
        
        <div className="mt-8 flex flex-col space-y-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-base font-medium transition-colors hover:text-primary"
              onClick={() => setOpen(false)}
            >
              {item.title}
            </Link>
          ))}
        </div>
        
        <div className="mt-8">
          <form action={signOut}>
            <Button variant="outline" className="w-full" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
} 
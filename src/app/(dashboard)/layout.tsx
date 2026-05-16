import Link from 'next/link'
import { Button } from '@/components/ui/button'
import MobileNav from '@/components/mobile-nav'
import { requireDashboardContext } from '@/lib/auth/guards'
import { clearDashboardSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

// Dashboard layout with session provider and top navigation
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { member, workspace } = await requireDashboardContext()
  
  // Handle sign out
  const signOut = async () => {
    'use server'
    clearDashboardSession()
    redirect('/')
  }

  const navItems = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Leaderboard", href: "/dashboard/leaderboard" },
    { title: "Jargon Terms", href: "/dashboard/jargon" },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top navigation */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="font-bold text-xl">
              Jargon Jar
            </Link>
            
            <nav className="hidden md:flex space-x-4">
              {navItems.map((item) => (
                <Link 
                  key={item.href}
                  href={item.href} 
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  {item.title}
                </Link>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {member.displayName} • {workspace.name}
                </span>
              </div>
            </div>
            
            {/* Mobile menu trigger */}
            <div className="md:hidden">
              <MobileNav 
                navItems={navItems} 
                userName={member.displayName} 
                workspaceName={workspace.name} 
                signOut={signOut} 
              />
            </div>
            
            {/* Desktop sign out button */}
            <div className="hidden md:block">
              <form action={signOut}>
                <Button variant="outline" size="sm" type="submit">
                  Sign out
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-1 container px-4 py-6">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="border-t py-4 text-center text-sm text-muted-foreground">
        <div className="container px-4">
          <p>© {new Date().getFullYear()} Jargon Jar • Stay Jargon-Free</p>
        </div>
      </footer>
    </div>
  )
} 
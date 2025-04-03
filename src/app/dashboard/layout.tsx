import type { ReactNode } from 'react'
import { ScrollArea } from "@/components/ui/scroll-area"

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-slate-900 text-white">
      {/* Sidebar Placeholder */}
      <aside className="w-64 border-r border-slate-700 p-4 bg-slate-800 flex flex-col">
        <h2 className="text-lg font-semibold mb-4">Jargon Jar</h2>
        <nav className="flex-grow">
          {/* Navigation Links Placeholder */}
          <ul>
            <li className="mb-2"><a href="/dashboard" className="hover:text-slate-300">Dashboard Home</a></li>
            {/* Add more links here later */}
          </ul>
        </nav>
        <div>
          {/* User Info / Logout Placeholder */}
          <p className="text-sm">User: [Username]</p>
          <button type="button" className="text-sm text-red-400 hover:text-red-300">Logout</button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-6">
          {children}
        </ScrollArea>
      </main>
    </div>
  )
} 
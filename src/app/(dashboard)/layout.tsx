import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import DashboardNav from "@/components/dashboard-nav"
import MobileNav from "@/components/mobile-nav"
import { requireDashboardContext } from "@/lib/auth/guards"
import { clearDashboardSession } from "@/lib/auth/session"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { member, workspace } = await requireDashboardContext()

  const signOut = async () => {
    "use server"
    clearDashboardSession()
    redirect("/")
  }

  const navItems = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Hall of shame", href: "/dashboard/leaderboard" },
    { title: "Rate sheet", href: "/dashboard/jargon" },
  ]

  return (
    <div className="relative min-h-screen bg-[#F2ECD9] text-[#0B0B0E] selection:bg-[#FFD400] selection:text-[#0B0B0E]">
      {/* paper grain */}
      <div
        aria-hidden
        className="bg-paper-grain pointer-events-none fixed inset-0 z-[1] opacity-[0.18] mix-blend-multiply"
      />
      {/* ruled lines */}
      <div
        aria-hidden
        className="bg-paper-rules pointer-events-none fixed inset-0 z-[1] opacity-[0.05]"
      />

      <div className="relative z-[2] flex min-h-screen flex-col">
        {/* ───────── NAV ───────── */}
        <header className="sticky top-0 z-20 border-b-2 border-[#0B0B0E] bg-[#F2ECD9]/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3 md:px-8">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-[15px] uppercase tracking-[0.18em]"
            >
              <Image
                src="/images/coin-jar-no-shadow.png"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 object-contain"
                priority
              />
              <span className="font-stamp text-[13px] md:text-[14px]">Jargon Jar</span>
              <span className="hidden text-[11px] tracking-[0.22em] text-[#0B0B0E]/55 lg:inline">
                / DEPT. OF FINES
              </span>
            </Link>

            <DashboardNav items={navItems} />

            <div className="flex items-center gap-3">
              <div className="hidden text-right md:block">
                <div className="text-[10px] uppercase tracking-[0.22em] text-[#0B0B0E]/50">
                  Filed by
                </div>
                <div className="font-stamp text-[12px]">
                  {member.displayName}
                </div>
                <div className="text-[10px] tracking-[0.16em] text-[#0B0B0E]/55">
                  {workspace.name}
                </div>
              </div>

              <div className="md:hidden">
                <MobileNav
                  navItems={navItems}
                  userName={member.displayName}
                  workspaceName={workspace.name}
                  signOut={signOut}
                />
              </div>

              <div className="hidden md:block">
                <form action={signOut}>
                  <button
                    type="submit"
                    className="font-stamp inline-flex items-center bg-[#0B0B0E] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[#F2ECD9] transition-colors hover:bg-[#DC2626]"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </div>
        </header>

        {/* ───────── MAIN ───────── */}
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 md:px-8 md:py-12">
          {children}
        </main>

        {/* ───────── FOOTER ───────── */}
        <footer className="border-t-2 border-[#0B0B0E]">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-4 py-5 text-[11px] uppercase tracking-[0.22em] text-[#0B0B0E]/60 sm:flex-row sm:items-center sm:justify-between md:px-8">
            <span>© {new Date().getFullYear()} Jargon Jar · Dept. of Fines</span>
            <span>File no. JJ-V4-{String(new Date().getFullYear()).slice(-2)}-LIVE</span>
          </div>
        </footer>
      </div>
    </div>
  )
}

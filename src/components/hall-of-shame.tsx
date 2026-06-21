import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type JargonUser = {
  id: string
  display_name: string
  avatar_url: string | null
  total_charges: number
  jargon_count?: number
  favorite_phrase?: string
}

interface HallOfShameProps {
  topUsers: JargonUser[]
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function HallOfShame({ topUsers }: HallOfShameProps) {
  const ranked = [...topUsers]
    .sort((a, b) => b.total_charges - a.total_charges)
    .slice(0, 5)

  const max = ranked[0]?.total_charges ?? 0

  return (
    <div className="relative flex flex-col border-2 border-[#0B0B0E] bg-white receipt-shadow">
      <div className="flex items-center justify-between border-b border-dashed border-[#0B0B0E]/40 px-4 py-2">
        <span className="font-stamp text-[11px] uppercase tracking-[0.2em] text-[#0B0B0E]">
          Hall of shame
        </span>
        <span className="font-stamp bg-[#DC2626] px-2 py-[2px] text-[9px] uppercase tracking-[0.18em] text-white">
          Top offenders
        </span>
      </div>

      <div className="flex-1 px-4 py-5">
        {ranked.length === 0 ? (
          <p className="py-6 text-center text-[12px] uppercase tracking-[0.18em] text-[#0B0B0E]/50">
            No citations issued yet
          </p>
        ) : (
          <ol className="space-y-3">
            {ranked.map((user, i) => {
              const rank = i + 1
              const pct = max > 0 ? Math.max(0.04, user.total_charges / max) : 0
              return (
                <li key={user.id} className="flex items-center gap-3">
                  <span
                    className={
                      rank === 1
                        ? "font-stamp inline-flex h-6 w-7 shrink-0 items-center justify-center bg-[#DC2626] text-[11px] uppercase tracking-[0.04em] text-[#F2ECD9]"
                        : "font-stamp inline-flex h-6 w-7 shrink-0 items-center justify-center border border-[#0B0B0E]/30 text-[11px] uppercase tracking-[0.04em] text-[#0B0B0E]/60"
                    }
                  >
                    {String(rank).padStart(2, "0")}
                  </span>
                  <Avatar className="h-8 w-8 border-2 border-[#0B0B0E] bg-[#FFD400]">
                    <AvatarImage src={user.avatar_url ?? undefined} alt={user.display_name} />
                    <AvatarFallback className="bg-[#FFD400] text-[#0B0B0E] font-stamp text-[10px]">
                      {initials(user.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-stamp text-[12px] uppercase tracking-[0.06em]">
                        {user.display_name}
                      </span>
                      <span className="font-stamp shrink-0 text-[13px]">
                        ${user.total_charges.toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-1 h-[6px] w-full border border-[#0B0B0E]/40 bg-white">
                      <div
                        className={`h-full ${rank === 1 ? "bg-[#DC2626]" : "bg-[#0B0B0E]"}`}
                        style={{ width: `${pct * 100}%` }}
                      />
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}

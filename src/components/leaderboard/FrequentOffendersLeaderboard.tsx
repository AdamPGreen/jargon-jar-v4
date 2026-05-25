import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatCount, formatCurrency } from "@/lib/formatters"
import { useUserFrequencyLeaderboard } from "@/hooks/useLeaderboard"
import type { LeaderboardUser, TimePeriod } from "@/hooks/useLeaderboard"
import {
  LeaderboardEmpty,
  LeaderboardError,
  LeaderboardLoading,
  LeaderboardShell,
  rankLabel,
} from "./leaderboard-shell"

interface FrequentOffendersLeaderboardProps {
  workspaceId: string
  timePeriod: TimePeriod
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function FrequentOffendersLeaderboard({
  workspaceId,
  timePeriod,
}: FrequentOffendersLeaderboardProps) {
  const { data, isLoading, error } = useUserFrequencyLeaderboard({ workspaceId, timePeriod })

  return (
    <LeaderboardShell
      title="Repeat offenders"
      caption="Ranked by number of citations"
      stamp="Most cited"
    >
      {error ? (
        <LeaderboardError />
      ) : isLoading ? (
        <LeaderboardLoading />
      ) : data.length === 0 ? (
        <LeaderboardEmpty />
      ) : (
        <ul className="divide-y divide-dotted divide-[#0B0B0E]/30">
          {data.map((user, i) => (
            <UserRow key={user.user_id} user={user} rank={i + 1} />
          ))}
        </ul>
      )}
    </LeaderboardShell>
  )
}

function UserRow({ user, rank }: { user: LeaderboardUser; rank: number }) {
  return (
    <li className="grid grid-cols-[36px_1fr_auto_auto] items-center gap-4 px-4 py-3">
      <span className="font-stamp text-[12px] uppercase tracking-[0.18em] text-[#0B0B0E]/55">
        {rankLabel(rank)}
      </span>
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="h-8 w-8 border-2 border-[#0B0B0E]">
          <AvatarImage src={user.image_url || undefined} alt={user.name} />
          <AvatarFallback className="bg-[#FFD400] text-[#0B0B0E] font-stamp text-[10px]">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
        <span className="truncate font-stamp text-[12px] uppercase tracking-[0.06em]">
          {user.name}
        </span>
      </div>
      <span className="font-stamp text-right text-[13px] text-[#0B0B0E]">
        {formatCount(user.charge_count)}
      </span>
      <span className="hidden text-right text-[10px] uppercase tracking-[0.18em] text-[#0B0B0E]/55 sm:inline">
        {formatCurrency(user.total_amount)}
      </span>
    </li>
  )
}

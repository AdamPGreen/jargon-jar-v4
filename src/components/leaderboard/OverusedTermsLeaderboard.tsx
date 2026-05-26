import { formatCount, formatCurrency } from "@/lib/formatters"
import { useJargonFrequencyLeaderboard } from "@/hooks/useLeaderboard"
import type { LeaderboardJargon, TimePeriod } from "@/hooks/useLeaderboard"
import {
  LeaderboardEmpty,
  LeaderboardError,
  LeaderboardLoading,
  LeaderboardShell,
  rankLabel,
} from "./leaderboard-shell"

interface OverusedTermsLeaderboardProps {
  workspaceId: string
  timePeriod: TimePeriod
}

export function OverusedTermsLeaderboard({
  workspaceId,
  timePeriod,
}: OverusedTermsLeaderboardProps) {
  const { data, isLoading, error } = useJargonFrequencyLeaderboard({ workspaceId, timePeriod })

  return (
    <LeaderboardShell title="Most overused" caption="Ranked by usage count" stamp="Recurring">
      {error ? (
        <LeaderboardError />
      ) : isLoading ? (
        <LeaderboardLoading />
      ) : data.length === 0 ? (
        <LeaderboardEmpty />
      ) : (
        <ul className="divide-y divide-dotted divide-[#0B0B0E]/30">
          {data.map((jargon, i) => (
            <TermRow key={jargon.word_id} jargon={jargon} rank={i + 1} />
          ))}
        </ul>
      )}
    </LeaderboardShell>
  )
}

function TermRow({ jargon, rank }: { jargon: LeaderboardJargon; rank: number }) {
  return (
    <li
      title={jargon.description || ""}
      className="grid grid-cols-[36px_1fr_auto_auto] items-baseline gap-4 px-4 py-3"
    >
      <span className="font-stamp text-[12px] uppercase tracking-[0.18em] text-[#0B0B0E]/55">
        {rankLabel(rank)}
      </span>
      <span className="font-heading truncate text-[20px] uppercase leading-[1.05] tracking-[-0.005em] md:text-[22px]">
        {jargon.word}
      </span>
      <span className="font-stamp text-right text-[13px] text-[#0B0B0E]">
        {formatCount(jargon.usage_count)}
      </span>
      <span className="hidden text-right text-[10px] uppercase tracking-[0.18em] text-[#0B0B0E]/55 sm:inline">
        {formatCurrency(jargon.total_amount)}
      </span>
    </li>
  )
}

import type { ReactNode } from "react"

export function LeaderboardShell({
  title,
  caption,
  stamp,
  children,
}: {
  title: string
  caption: string
  stamp?: string
  children: ReactNode
}) {
  return (
    <div className="border-2 border-[#0B0B0E] bg-white receipt-shadow">
      <div className="flex items-center justify-between border-b border-dashed border-[#0B0B0E]/40 px-4 py-3">
        <div>
          <div className="font-stamp text-[11px] uppercase tracking-[0.2em] text-[#0B0B0E]">
            {caption}
          </div>
          <div className="font-stamp mt-[2px] text-[14px] uppercase tracking-[0.06em]">
            {title}
          </div>
        </div>
        {stamp && (
          <span className="font-stamp bg-[#0B0B0E] px-2 py-[2px] text-[9px] uppercase tracking-[0.18em] text-[#FFD400]">
            {stamp}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

export function LeaderboardLoading() {
  return (
    <div className="flex h-[300px] items-center justify-center text-[11px] uppercase tracking-[0.22em] text-[#0B0B0E]/55">
      Counting fines…
    </div>
  )
}

export function LeaderboardError() {
  return (
    <div className="flex h-[300px] items-center justify-center text-[11px] uppercase tracking-[0.22em] text-[#DC2626]">
      Failed to load
    </div>
  )
}

export function LeaderboardEmpty() {
  return (
    <div className="flex h-[300px] items-center justify-center text-[11px] uppercase tracking-[0.22em] text-[#0B0B0E]/55">
      Quiet quarter
    </div>
  )
}

export function rankLabel(rank: number) {
  return String(rank).padStart(2, "0")
}

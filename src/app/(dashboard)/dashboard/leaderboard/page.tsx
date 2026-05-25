"use client"

import { useState, useEffect } from "react"
import { DollarSignIcon, RepeatIcon, ZapIcon, TrendingUpIcon } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TopSpendersLeaderboard } from "@/components/leaderboard/TopSpendersLeaderboard"
import { FrequentOffendersLeaderboard } from "@/components/leaderboard/FrequentOffendersLeaderboard"
import { CostlyTermsLeaderboard } from "@/components/leaderboard/CostlyTermsLeaderboard"
import { OverusedTermsLeaderboard } from "@/components/leaderboard/OverusedTermsLeaderboard"

type TimePeriod = "all" | "month" | "week"

const PERIOD_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "month", label: "30 days" },
  { value: "week", label: "7 days" },
]

const TAB_OPTIONS: {
  value: string
  label: string
  short: string
  icon: typeof DollarSignIcon
}[] = [
  { value: "top-spenders", label: "Top spenders", short: "Spenders", icon: DollarSignIcon },
  { value: "frequent-offenders", label: "Repeat offenders", short: "Repeat", icon: RepeatIcon },
  { value: "costly-terms", label: "Costliest terms", short: "Costly", icon: ZapIcon },
  { value: "overused-terms", label: "Most overused", short: "Overused", icon: TrendingUpIcon },
]

export default function LeaderboardPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all")
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch("/api/me")
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        setWorkspaceId(data.workspace?.id ?? null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 border-b-2 border-[#0B0B0E] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#0B0B0E]/60">
            § III · Public record
          </div>
          <h1 className="font-heading mt-2 text-[44px] uppercase leading-[0.9] tracking-[-0.005em] md:text-[64px]">
            Hall of <span className="text-[#DC2626]">shame.</span>
          </h1>
          <p className="mt-2 text-[13px] text-[#0B0B0E]/75">
            Who's been writing the biggest cheques to the jar.
          </p>
        </div>

        <div className="flex items-center gap-0 border-2 border-[#0B0B0E] bg-white p-[2px]">
          {PERIOD_OPTIONS.map((opt) => {
            const active = timePeriod === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTimePeriod(opt.value)}
                className={`font-stamp px-3 py-2 text-[10px] uppercase tracking-[0.18em] transition-colors md:text-[11px] ${
                  active
                    ? "bg-[#0B0B0E] text-[#FFD400]"
                    : "bg-transparent text-[#0B0B0E]/70 hover:text-[#0B0B0E]"
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[400px] items-center justify-center border-2 border-[#0B0B0E] bg-white">
          <p className="font-stamp text-[12px] uppercase tracking-[0.22em] text-[#0B0B0E]/55">
            Pulling the docket…
          </p>
        </div>
      ) : !workspaceId ? (
        <div className="flex h-[400px] items-center justify-center border-2 border-[#DC2626] bg-[#FFE7E1]">
          <p className="font-stamp text-[12px] uppercase tracking-[0.22em] text-[#DC2626]">
            Failed to load workspace
          </p>
        </div>
      ) : (
        <Tabs defaultValue="top-spenders" className="w-full">
          <TabsList className="grid w-full grid-cols-2 gap-0 rounded-none border-2 border-[#0B0B0E] bg-white p-0 md:grid-cols-4">
            {TAB_OPTIONS.map((opt, i) => {
              const Icon = opt.icon
              return (
                <TabsTrigger
                  key={opt.value}
                  value={opt.value}
                  className={`font-stamp rounded-none px-3 py-3 text-[10px] uppercase tracking-[0.18em] text-[#0B0B0E]/70 data-[state=active]:bg-[#0B0B0E] data-[state=active]:text-[#FFD400] md:text-[11px] ${
                    i < TAB_OPTIONS.length - 1 ? "border-r-2 border-[#0B0B0E]" : ""
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Icon className="h-3 w-3" />
                    <span className="hidden sm:inline">{opt.label}</span>
                    <span className="sm:hidden">{opt.short}</span>
                  </span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          <TabsContent value="top-spenders" className="mt-6">
            <TopSpendersLeaderboard workspaceId={workspaceId} timePeriod={timePeriod} />
          </TabsContent>
          <TabsContent value="frequent-offenders" className="mt-6">
            <FrequentOffendersLeaderboard workspaceId={workspaceId} timePeriod={timePeriod} />
          </TabsContent>
          <TabsContent value="costly-terms" className="mt-6">
            <CostlyTermsLeaderboard workspaceId={workspaceId} timePeriod={timePeriod} />
          </TabsContent>
          <TabsContent value="overused-terms" className="mt-6">
            <OverusedTermsLeaderboard workspaceId={workspaceId} timePeriod={timePeriod} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

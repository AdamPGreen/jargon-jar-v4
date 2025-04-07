"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { DollarSignIcon, RepeatIcon, ZapIcon, TrendingUpIcon } from "lucide-react"
import { useState } from "react"
import { TopSpendersLeaderboard } from "@/components/leaderboard/TopSpendersLeaderboard"
import { FrequentOffendersLeaderboard } from "@/components/leaderboard/FrequentOffendersLeaderboard"
import { CostlyTermsLeaderboard } from "@/components/leaderboard/CostlyTermsLeaderboard"
import { OverusedTermsLeaderboard } from "@/components/leaderboard/OverusedTermsLeaderboard"

// Filter time periods
type TimePeriod = "all" | "month" | "week"

export default function LeaderboardPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all")
  // Mock workspace ID - in a real app, this would come from a context or auth session
  const workspaceId = "123e4567-e89b-12d3-a456-426614174000"

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hall of Shame</h1>
          <p className="text-muted-foreground">
            Who's been caught using the most corporate jargon?
          </p>
        </div>

        {/* Time period filter */}
        <div className="flex space-x-2">
          <Button
            variant={timePeriod === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimePeriod("all")}
            className={timePeriod === "all" ? "bg-[#feca11] hover:bg-[#e5b400] text-gray-900" : ""}
          >
            All Time
          </Button>
          <Button
            variant={timePeriod === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimePeriod("month")}
            className={timePeriod === "month" ? "bg-[#feca11] hover:bg-[#e5b400] text-gray-900" : ""}
          >
            This Month
          </Button>
          <Button
            variant={timePeriod === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimePeriod("week")}
            className={timePeriod === "week" ? "bg-[#feca11] hover:bg-[#e5b400] text-gray-900" : ""}
          >
            This Week
          </Button>
        </div>
      </div>

      {/* Main tabs interface */}
      <Tabs defaultValue="top-spenders" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-4">
          <TabsTrigger value="top-spenders" className="flex items-center gap-2">
            <DollarSignIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Top Spenders</span>
            <span className="sm:hidden">Spenders</span>
          </TabsTrigger>
          <TabsTrigger value="frequent-offenders" className="flex items-center gap-2">
            <RepeatIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Frequent Offenders</span>
            <span className="sm:hidden">Frequent</span>
          </TabsTrigger>
          <TabsTrigger value="costly-terms" className="flex items-center gap-2">
            <ZapIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Costly Terms</span>
            <span className="sm:hidden">Costly</span>
          </TabsTrigger>
          <TabsTrigger value="overused-terms" className="flex items-center gap-2">
            <TrendingUpIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Overused Terms</span>
            <span className="sm:hidden">Overused</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab content */}
        <TabsContent value="top-spenders">
          <TopSpendersLeaderboard workspaceId={workspaceId} timePeriod={timePeriod} />
        </TabsContent>

        <TabsContent value="frequent-offenders">
          <FrequentOffendersLeaderboard workspaceId={workspaceId} timePeriod={timePeriod} />
        </TabsContent>

        <TabsContent value="costly-terms">
          <CostlyTermsLeaderboard workspaceId={workspaceId} timePeriod={timePeriod} />
        </TabsContent>

        <TabsContent value="overused-terms">
          <OverusedTermsLeaderboard workspaceId={workspaceId} timePeriod={timePeriod} />
        </TabsContent>
      </Tabs>
    </div>
  )
} 
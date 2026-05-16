"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { DollarSignIcon, RepeatIcon, ZapIcon, TrendingUpIcon } from "lucide-react"
import { useState, useEffect } from "react"
import { TopSpendersLeaderboard } from "@/components/leaderboard/TopSpendersLeaderboard"
import { FrequentOffendersLeaderboard } from "@/components/leaderboard/FrequentOffendersLeaderboard"
import { CostlyTermsLeaderboard } from "@/components/leaderboard/CostlyTermsLeaderboard"
import { OverusedTermsLeaderboard } from "@/components/leaderboard/OverusedTermsLeaderboard"

// Filter time periods
type TimePeriod = "all" | "month" | "week"

export default function LeaderboardPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all")
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchWorkspaceId = async () => {
      try {
        const response = await fetch('/api/me')
        if (!response.ok) {
          console.error('Failed to fetch current workspace')
          return
        }
        const data = await response.json()
        setWorkspaceId(data.workspace?.id ?? null)
      } catch (error) {
        console.error('Error fetching workspace ID:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchWorkspaceId()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Hall of Shame</h1>
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
            className={timePeriod === "all" ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
          >
            All Time
          </Button>
          <Button
            variant={timePeriod === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimePeriod("month")}
            className={timePeriod === "month" ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
          >
            This Month
          </Button>
          <Button
            variant={timePeriod === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimePeriod("week")}
            className={timePeriod === "week" ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
          >
            This Week
          </Button>
        </div>
      </div>

      {/* Main tabs interface */}
      {isLoading ? (
        <div className="h-[400px] flex items-center justify-center">
          <p className="text-muted-foreground">Loading leaderboard data...</p>
        </div>
      ) : !workspaceId ? (
        <div className="h-[400px] flex items-center justify-center">
          <p className="text-red-500">Failed to load workspace data</p>
        </div>
      ) : (
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
      )}
    </div>
  )
} 
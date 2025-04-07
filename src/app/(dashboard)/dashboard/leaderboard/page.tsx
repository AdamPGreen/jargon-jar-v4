"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrophyIcon, DollarSignIcon, RepeatIcon, ZapIcon, TrendingUpIcon } from "lucide-react"
import { useState } from "react"

// Filter time periods
type TimePeriod = "all" | "month" | "week"

export default function LeaderboardPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("all")

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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-semibold">
                Top Spenders
              </CardTitle>
              <TrophyIcon className="h-5 w-5 text-[#feca11]" />
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[400px] flex items-center justify-center border-t">
                <p className="text-muted-foreground text-sm italic">
                  User data will be displayed here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="frequent-offenders">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-semibold">
                Frequent Offenders
              </CardTitle>
              <RepeatIcon className="h-5 w-5 text-[#feca11]" />
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[400px] flex items-center justify-center border-t">
                <p className="text-muted-foreground text-sm italic">
                  User frequency data will be displayed here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costly-terms">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-semibold">
                Most Expensive Jargon Terms
              </CardTitle>
              <ZapIcon className="h-5 w-5 text-[#feca11]" />
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[400px] flex items-center justify-center border-t">
                <p className="text-muted-foreground text-sm italic">
                  Jargon term data will be displayed here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overused-terms">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-semibold">
                Most Frequently Used Jargon
              </CardTitle>
              <TrendingUpIcon className="h-5 w-5 text-[#feca11]" />
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[400px] flex items-center justify-center border-t">
                <p className="text-muted-foreground text-sm italic">
                  Jargon frequency data will be displayed here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 
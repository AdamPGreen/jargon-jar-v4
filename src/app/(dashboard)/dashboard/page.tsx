import { differenceInDays, parseISO } from "date-fns"
import { DollarSignIcon, RepeatIcon, ZapIcon } from "lucide-react"
import { ActivityFeed, type ActivityItem } from "@/components/activity-feed"
import { HallOfShame } from "@/components/hall-of-shame"
import { StreakCard } from "@/components/streak-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireDashboardContext } from "@/lib/auth/guards"
import { getDashboardData } from "@/lib/db/queries"

export default async function DashboardPage() {
  const { member, workspace } = await requireDashboardContext()
  const { userCharges, workspaceCharges, recentCharges, recentTerms } =
    await getDashboardData({
      workspaceId: workspace.id,
      memberId: member.id,
    })

  const userTotalCharges = userCharges.reduce(
    (sum, charge) => sum + Number(charge.amount),
    0
  )
  const workspaceTotalCharges = workspaceCharges.reduce(
    (sum, charge) => sum + Number(charge.amount),
    0
  )

  const chargeDates = userCharges.map((charge) => parseISO(charge.createdAt.toISOString()))
  const currentStreak = chargeDates.length
    ? differenceInDays(new Date(), chargeDates[chargeDates.length - 1])
    : 0
  const recordStreak = chargeDates.reduce((record, date, index) => {
    if (index === 0) return Math.max(record, currentStreak)
    return Math.max(record, differenceInDays(date, chargeDates[index - 1]))
  }, currentStreak)

  const mostCommonJargon = Object.values(
    userCharges.reduce((acc, charge) => {
      const id = charge.jargonTerm.id
      acc[id] = acc[id] ?? { term: charge.jargonTerm.term, count: 0 }
      acc[id].count += 1
      return acc
    }, {} as Record<string, { term: string; count: number }>)
  ).sort((a, b) => b.count - a.count)[0] ?? { term: "N/A", count: 0 }

  const topUsers = Object.values(
    workspaceCharges.reduce((acc, charge) => {
      const user = charge.chargedMember
      acc[user.id] = acc[user.id] ?? {
        id: user.id,
        display_name: user.displayName,
        avatar_url: user.avatarUrl,
        total_charges: 0,
        jargon_count: 0,
        favorite_phrase: "None yet",
      }
      acc[user.id].total_charges += Number(charge.amount)
      acc[user.id].jargon_count += 1
      acc[user.id].favorite_phrase = charge.jargonTerm.term
      return acc
    }, {} as Record<string, { id: string; display_name: string; avatar_url: string | null; total_charges: number; jargon_count: number; favorite_phrase: string }>)
  )
    .sort((a, b) => b.total_charges - a.total_charges)
    .slice(0, 5)

  const activities: ActivityItem[] = [
    ...recentCharges.map((charge) => ({
      id: charge.id,
      type: charge.chargingMemberId === member.id ? "made" as const : "received" as const,
      charging_user: {
        id: charge.chargingMember.id,
        display_name: charge.chargingMember.displayName,
        avatar_url: charge.chargingMember.avatarUrl,
      },
      charged_user: {
        id: charge.chargedMember.id,
        display_name: charge.chargedMember.displayName,
        avatar_url: charge.chargedMember.avatarUrl,
      },
      jargon_term: {
        id: charge.jargonTerm.id,
        term: charge.jargonTerm.term,
      },
      amount: Number(charge.amount),
      channel_id: charge.channelId,
      created_at: charge.createdAt.toISOString(),
    })),
    ...recentTerms.map((term) => ({
      id: term.id,
      type: "term_added" as const,
      charging_user: term.createdBy
        ? {
            id: term.createdBy.id,
            display_name: term.createdBy.displayName,
            avatar_url: term.createdBy.avatarUrl,
          }
        : {
            id: member.id,
            display_name: member.displayName,
            avatar_url: member.avatarUrl,
          },
      jargon_term: {
        id: term.id,
        term: term.term,
        description: term.description,
      },
      created_at: term.createdAt.toISOString(),
    })),
  ].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Your virtual jargon jar for {workspace.name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Charges</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-heading text-3xl font-bold">${userTotalCharges.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {userCharges.length} times caught
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workspace Jar</CardTitle>
            <RepeatIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-heading text-3xl font-bold">${workspaceTotalCharges.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {workspaceCharges.length} total charges
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Common Jargon</CardTitle>
            <ZapIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="font-heading text-3xl font-bold">{mostCommonJargon.term}</div>
            <p className="text-xs text-muted-foreground">
              {mostCommonJargon.count} uses
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StreakCard currentStreak={currentStreak} recordStreak={recordStreak} />
        <HallOfShame topUsers={topUsers} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed activities={activities} userId={member.id} />
        </CardContent>
      </Card>
    </div>
  )
}

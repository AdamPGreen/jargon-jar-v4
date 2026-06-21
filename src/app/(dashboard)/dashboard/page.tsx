import { differenceInDays, parseISO } from "date-fns"
import { ActivityFeed, type ActivityItem } from "@/components/activity-feed"
import { HallOfShame } from "@/components/hall-of-shame"
import { StreakCard } from "@/components/streak-card"
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
    userCharges.reduce(
      (acc, charge) => {
        const id = charge.jargonTerm.id
        acc[id] = acc[id] ?? { term: charge.jargonTerm.term, count: 0 }
        acc[id].count += 1
        return acc
      },
      {} as Record<string, { term: string; count: number }>
    )
  ).sort((a, b) => b.count - a.count)[0] ?? { term: "—", count: 0 }

  const topUsers = Object.values(
    workspaceCharges.reduce(
      (acc, charge) => {
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
      },
      {} as Record<
        string,
        {
          id: string
          display_name: string
          avatar_url: string | null
          total_charges: number
          jargon_count: number
          favorite_phrase: string
        }
      >
    )
  )
    .sort((a, b) => b.total_charges - a.total_charges)
    .slice(0, 5)

  const activities: ActivityItem[] = [
    ...recentCharges.map((charge) => ({
      id: charge.id,
      type: charge.chargingMemberId === member.id ? ("made" as const) : ("received" as const),
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
    <div className="space-y-10">
      <PageHeader
        title="Dashboard"
        subtitle={`Active citations for ${workspace.name}`}
        fileNo={`MEMBER-${member.id.slice(0, 8).toUpperCase()}`}
      />

      <div className="grid gap-4 md:grid-cols-3 md:gap-6">
        <StatCard
          label="Your charges"
          caption={`${userCharges.length} times caught`}
          value={`$${userTotalCharges.toFixed(2)}`}
          ribbon="Personal tab"
        />
        <StatCard
          label="Workspace jar"
          caption={`${workspaceCharges.length} total citations`}
          value={`$${workspaceTotalCharges.toFixed(2)}`}
          ribbon="Group pot"
        />
        <StatCard
          label="Most common jargon"
          caption={mostCommonJargon.count > 0 ? `${mostCommonJargon.count} uses` : "no fines yet"}
          value={`"${mostCommonJargon.term}"`}
          ribbon="Repeat offense"
          monospace
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <StreakCard currentStreak={currentStreak} recordStreak={recordStreak} />
        <HallOfShame topUsers={topUsers} />
      </div>

      <section>
        <SectionHeader title="Recent activity" />
        <div className="border-2 border-[#0B0B0E] bg-white">
          <ActivityFeed activities={activities} userId={member.id} />
        </div>
      </section>
    </div>
  )
}

function PageHeader({
  title,
  subtitle,
  fileNo,
}: {
  title: string
  subtitle: string
  fileNo?: string
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b-2 border-[#0B0B0E] pb-5">
      <div>
        <h1 className="font-heading text-[44px] uppercase leading-[0.9] tracking-[-0.005em] md:text-[64px]">
          {title}
        </h1>
        <p className="mt-2 text-[13px] text-[#0B0B0E]/75">{subtitle}</p>
      </div>
      {fileNo && (
        <div className="hidden text-right text-[11px] uppercase tracking-[0.22em] text-[#0B0B0E]/55 md:block">
          File no.
          <br />
          {fileNo}
        </div>
      )}
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between border-b-2 border-[#0B0B0E] pb-3">
      <h2 className="font-heading text-[28px] uppercase leading-[0.95] md:text-[36px]">
        {title}
      </h2>
    </div>
  )
}

function StatCard({
  label,
  caption,
  value,
  ribbon,
  monospace = false,
}: {
  label: string
  caption: string
  value: string
  ribbon: string
  monospace?: boolean
}) {
  return (
    <div className="relative border-2 border-[#0B0B0E] bg-white receipt-shadow">
      <div className="flex items-center justify-between border-b border-dashed border-[#0B0B0E]/40 px-4 py-2">
        <span className="font-stamp text-[11px] uppercase tracking-[0.2em] text-[#0B0B0E]">
          {label}
        </span>
        <span className="font-stamp bg-[#DC2626] px-2 py-[2px] text-[9px] uppercase tracking-[0.18em] text-white">
          {ribbon}
        </span>
      </div>
      <div className="px-4 py-5">
        <div
          className={`${monospace ? "font-mono" : "font-heading"} text-[40px] leading-[1] tracking-[-0.01em] md:text-[52px]`}
        >
          {value}
        </div>
        <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[#0B0B0E]/55">
          {caption}
        </div>
      </div>
    </div>
  )
}

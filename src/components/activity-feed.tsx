"use client"

import { type ReactNode, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { BookOpenIcon, ScrollIcon, EyeIcon, Skull, XIcon } from "lucide-react"

export type ActivityItem = {
  id: string
  type: "received" | "made" | "term_added"
  charging_user?: {
    id: string
    display_name: string
    avatar_url: string | null
  }
  charged_user?: {
    id: string
    display_name: string
    avatar_url: string | null
  }
  jargon_term: {
    id: string
    term: string
    description?: string | null
  }
  amount?: number
  channel_id?: string
  channel_name?: string
  category?: string | null
  created_at: string
}

type ActivityFeedProps = {
  activities: ActivityItem[]
  userId: string
  onCancelCharge?: (chargeId: string) => void
}

const ITEMS_PER_PAGE = 8

function initials(name?: string) {
  if (!name) return "?"
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function ActivityFeed({ activities, userId, onCancelCharge }: ActivityFeedProps) {
  const [visibleItems, setVisibleItems] = useState(ITEMS_PER_PAGE)
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null)

  const renderEmptyState = (type: string) => {
    const message =
      type === "received"
        ? "No fines on your record. Suspicious."
        : type === "made"
          ? "You haven't issued a single citation. Pacifist."
          : type === "terms"
            ? "No new terms yet. Add one in Slack."
            : "Quiet day at the department."
    return (
      <div className="px-4 py-10 text-center text-[12px] uppercase tracking-[0.18em] text-[#0B0B0E]/55">
        {message}
      </div>
    )
  }

  if (!activities || activities.length === 0) {
    return (
      <div>
        <ActivityTabsList />
        {renderEmptyState("all")}
      </div>
    )
  }

  const receivedActivities = activities.filter(
    (item) => item.charged_user?.id === userId
  )
  const madeActivities = activities.filter(
    (item) =>
      item.charging_user?.id === userId &&
      item.charged_user?.id !== userId &&
      item.type !== "term_added"
  )
  const termAddedActivities = activities.filter((item) => item.type === "term_added")

  const renderActivity = (activity: ActivityItem) => {
    const timeAgo = formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })

    let stamp: { label: string; bg: string; fg: string }
    let body: ReactNode

    if (activity.type === "term_added") {
      stamp = { label: "Term", bg: "bg-[#0B0B0E]", fg: "text-[#FFD400]" }
      body = (
        <>
          <span className="font-stamp uppercase tracking-[0.04em]">
            {activity.charging_user?.display_name}
          </span>{" "}
          added{" "}
          <span className="italic">"{activity.jargon_term.term}"</span>
          {activity.jargon_term.description && (
            <span className="ml-2 text-[#0B0B0E]/55">
              · {activity.jargon_term.description}
            </span>
          )}
        </>
      )
    } else {
      const isReceived = activity.charged_user?.id === userId
      const isViewingUser = activity.charging_user?.id === userId

      if (isViewingUser) {
        stamp = { label: "Gotcha", bg: "bg-[#FFD400]", fg: "text-[#0B0B0E]" }
        body = (
          <>
            <span className="font-stamp uppercase tracking-[0.04em]">You</span> fined{" "}
            <span className="font-stamp uppercase tracking-[0.04em]">
              {activity.charged_user?.display_name}
            </span>{" "}
            for <span className="italic">"{activity.jargon_term.term}"</span>
          </>
        )
      } else if (isReceived) {
        stamp = { label: "Caught", bg: "bg-[#DC2626]", fg: "text-[#F2ECD9]" }
        body = (
          <>
            <span className="font-stamp uppercase tracking-[0.04em]">
              {activity.charging_user?.display_name}
            </span>{" "}
            fined <span className="font-stamp uppercase tracking-[0.04em]">you</span> for{" "}
            <span className="italic">"{activity.jargon_term.term}"</span>
          </>
        )
      } else {
        stamp = { label: "Cited", bg: "bg-[#0B0B0E]", fg: "text-[#F2ECD9]" }
        body = (
          <>
            <span className="font-stamp uppercase tracking-[0.04em]">
              {activity.charging_user?.display_name}
            </span>{" "}
            fined{" "}
            <span className="font-stamp uppercase tracking-[0.04em]">
              {activity.charged_user?.display_name}
            </span>{" "}
            for <span className="italic">"{activity.jargon_term.term}"</span>
          </>
        )
      }
    }

    const canCancel =
      activity.type === "made" && activity.charging_user?.id === userId

    return (
      <li
        key={activity.id}
        className="relative grid grid-cols-[40px_1fr_auto] items-start gap-3 border-b border-dotted border-[#0B0B0E]/30 px-4 py-3 last:border-b-0"
      >
        <Avatar className="h-9 w-9 border-2 border-[#0B0B0E]">
          <AvatarImage
            src={activity.charging_user?.avatar_url || undefined}
            alt={activity.charging_user?.display_name}
          />
          <AvatarFallback className="bg-[#FFD400] text-[#0B0B0E] font-stamp text-[10px]">
            {initials(activity.charging_user?.display_name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <p className="text-[13px] leading-[1.5] text-[#0B0B0E]/90">{body}</p>
          <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#0B0B0E]/55">
            {activity.type !== "term_added" && activity.amount !== undefined && (
              <>
                <span className="font-stamp text-[#0B0B0E]">
                  ${activity.amount.toFixed(2)}
                </span>
                <span aria-hidden>·</span>
              </>
            )}
            <span>{timeAgo}</span>
          </div>
        </div>

        <div className="shrink-0">
          {canCancel && cancelConfirmId !== activity.id ? (
            <button
              type="button"
              onClick={() => setCancelConfirmId(activity.id)}
              className={`font-stamp inline-flex items-center gap-1 px-2 py-[3px] text-[9px] uppercase tracking-[0.18em] ${stamp.bg} ${stamp.fg} hover:bg-[#DC2626] hover:text-[#F2ECD9]`}
            >
              {stamp.label}
            </button>
          ) : (
            <span
              className={`font-stamp inline-flex items-center gap-1 px-2 py-[3px] text-[9px] uppercase tracking-[0.18em] ${stamp.bg} ${stamp.fg}`}
            >
              {stamp.label}
            </span>
          )}
        </div>

        {cancelConfirmId === activity.id && (
          <div className="absolute inset-0 z-10 flex items-center justify-center border-2 border-[#DC2626] bg-white/95 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2 px-4 py-3 text-center">
              <p className="text-[11px] uppercase tracking-[0.18em]">
                Going soft on jargon?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onCancelCharge?.(activity.id)
                    setCancelConfirmId(null)
                  }}
                  className="font-stamp bg-[#DC2626] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#F2ECD9]"
                >
                  Refund it
                </button>
                <button
                  type="button"
                  onClick={() => setCancelConfirmId(null)}
                  className="font-stamp border-2 border-[#0B0B0E] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#0B0B0E]"
                >
                  Nevermind
                </button>
              </div>
            </div>
          </div>
        )}
      </li>
    )
  }

  const renderList = (items: ActivityItem[]) => {
    const hasMore = items.length > visibleItems
    const displayed = items.slice(0, visibleItems)
    return (
      <>
        <ul className="m-0 list-none p-0">{displayed.map(renderActivity)}</ul>
        {hasMore && (
          <div className="border-t-2 border-[#0B0B0E]">
            <button
              type="button"
              onClick={() => setVisibleItems((n) => n + ITEMS_PER_PAGE)}
              className="font-stamp w-full px-4 py-3 text-[11px] uppercase tracking-[0.22em] text-[#0B0B0E]/70 hover:text-[#DC2626]"
            >
              Show more citations
            </button>
          </div>
        )}
      </>
    )
  }

  return (
    <Tabs defaultValue="all" className="w-full">
      <ActivityTabsList />
      <TabsContent value="all" className="m-0">
        {activities.length > 0 ? renderList(activities) : renderEmptyState("all")}
      </TabsContent>
      <TabsContent value="received" className="m-0">
        {receivedActivities.length > 0
          ? renderList(receivedActivities)
          : renderEmptyState("received")}
      </TabsContent>
      <TabsContent value="made" className="m-0">
        {madeActivities.length > 0
          ? renderList(madeActivities)
          : renderEmptyState("made")}
      </TabsContent>
      <TabsContent value="terms" className="m-0">
        {termAddedActivities.length > 0
          ? renderList(termAddedActivities)
          : renderEmptyState("terms")}
      </TabsContent>
    </Tabs>
  )
}

function ActivityTabsList() {
  return (
    <TabsList className="grid w-full grid-cols-4 gap-0 rounded-none border-b-2 border-[#0B0B0E] bg-white p-0">
      <ActivityTabTrigger value="all" icon={<ScrollIcon className="h-3 w-3" />} label="All" />
      <ActivityTabTrigger value="received" icon={<Skull className="h-3 w-3" />} label="Caught" />
      <ActivityTabTrigger value="made" icon={<EyeIcon className="h-3 w-3" />} label="Gotchas" />
      <ActivityTabTrigger value="terms" icon={<BookOpenIcon className="h-3 w-3" />} label="Terms" />
    </TabsList>
  )
}

function ActivityTabTrigger({
  value,
  icon,
  label,
}: {
  value: string
  icon: ReactNode
  label: string
}) {
  return (
    <TabsTrigger
      value={value}
      className="font-stamp rounded-none border-r-2 border-[#0B0B0E] bg-white px-3 py-3 text-[10px] uppercase tracking-[0.18em] text-[#0B0B0E]/70 last:border-r-0 data-[state=active]:bg-[#0B0B0E] data-[state=active]:text-[#FFD400]"
    >
      <span className="inline-flex items-center gap-1.5">
        {icon}
        {label}
      </span>
    </TabsTrigger>
  )
}

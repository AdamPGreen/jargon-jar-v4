"use client"

import Link from "next/link"
import { type ReactNode, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { BellIcon, DollarSignIcon, HandCoinsIcon, BookOpenIcon, PencilIcon, AlertCircle, Skull, Eye, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

// Define types for activity items
export type ActivityItem = {
  id: string
  type: "received" | "made" | "term_added" // For determining if you were charged, you charged someone, or a term was added
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
  category?: string | null // The tag like #marketing, #engineering
  created_at: string
}

type ActivityFeedProps = {
  activities: ActivityItem[]
  userId: string // The current user's ID
  onCancelCharge?: (chargeId: string) => void
}

const ITEMS_PER_PAGE = 5

export function ActivityFeed({ activities, userId, onCancelCharge }: ActivityFeedProps) {
  const [visibleItems, setVisibleItems] = useState(ITEMS_PER_PAGE)
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null)

  // Helper function to render empty state for a specific tab
  const renderEmptyState = (type: string) => {
    let message = "No corporate speak here. Refreshing, isn't it?"
    
    if (type === "received") {
      message = "No jargon charges yet. Keep that corporate speak in check!"
    } else if (type === "made") {
      message = "You haven't caught any corporate jargon yet. Stay vigilant!"
    } else if (type === "terms") {
      message = "No jargon terms added yet. Time to expand our corporate dictionary!"
    }
    
    return (
      <div className="py-6">
        <div className="flex flex-col items-center justify-center px-4 text-[#9a9da5] font-inter">
          <p className="text-sm">{message}</p>
        </div>
      </div>
    )
  }

  if (!activities || activities.length === 0) {
    return renderEmptyState("all");
  }

  // Filter activities based on type
  const receivedActivities = activities.filter(item => item.charged_user?.id === userId)
  const madeActivities = activities.filter(item => 
    item.charging_user?.id === userId && 
    item.charged_user?.id !== userId &&
    item.type !== "term_added"
  )
  const termAddedActivities = activities.filter(item => item.type === "term_added")

  const loadMore = () => {
    setVisibleItems(prev => prev + ITEMS_PER_PAGE)
  }

  const handleCancelClick = (id: string) => {
    setCancelConfirmId(id)
  }

  const handleConfirmCancel = (id: string) => {
    if (onCancelCharge) {
      onCancelCharge(id)
    }
    setCancelConfirmId(null)
  }

  const handleCancelCancel = () => {
    setCancelConfirmId(null)
  }

  // Helper function to render activity item
  const renderActivity = (activity: ActivityItem) => {
    const timeAgo = formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })
    
    // Build the activity description based on type
    let activityDescription: ReactNode
    
    if (activity.type === "term_added") {
      activityDescription = (
        <>
          <span className="font-medium text-[#191d22]">{activity.charging_user?.display_name}</span> added the term{" "}
          <span className="italic">"{activity.jargon_term.term}"</span>
          {activity.jargon_term.description && (
            <div className="text-xs text-[#7e828d] mt-1">
              <span>Definition: {activity.jargon_term.description}</span>
            </div>
          )}
        </>
      )
    } else {
      const isReceived = activity.charged_user?.id === userId
      const isViewingUser = activity.charging_user?.id === userId
      
      if (isViewingUser) {
        activityDescription = (
          <>
            <span className="font-medium text-[#191d22]">You</span> charged <span className="font-medium text-[#191d22]">{activity.charged_user?.display_name}</span> for saying
          </>
        )
      } else if (isReceived) {
        activityDescription = (
          <>
            <span className="font-medium text-[#191d22]">{activity.charging_user?.display_name}</span> charged <span className="font-medium text-[#191d22]">you</span> for saying
          </>
        )
      } else {
        activityDescription = (
          <>
            <span className="font-medium text-[#191d22]">{activity.charging_user?.display_name}</span> charged <span className="font-medium text-[#191d22]">{activity.charged_user?.display_name}</span> for saying
          </>
        )
      }
    }
    
    // Determine if this activity can be cancelled (only "made" charges can be cancelled by the user who made them)
    const canCancel = activity.type === "made" && activity.charging_user?.id === userId
    
    return (
      <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors duration-200 ease-in-out relative">
        <div className="flex gap-3 items-start">
          <Avatar className="h-8 w-8 rounded-full">
            <AvatarImage 
              src={activity.type === "term_added" 
                ? activity.charging_user?.avatar_url || undefined 
                : activity.charging_user?.avatar_url || undefined} 
              alt={activity.type === "term_added" 
                ? activity.charging_user?.display_name 
                : activity.charging_user?.display_name}
              className="rounded-full" 
            />
            <AvatarFallback className={activity.type === "term_added" ? "bg-[#54bf04] text-[#191d22]" : "bg-[#feca11] text-[#191d22]"}>
              {activity.charging_user?.display_name.substring(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0 font-inter">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-[#191d22]">
                  {activityDescription}
                  {activity.type !== "term_added" && (
                    <span className="italic"> "{activity.jargon_term.term}"</span>
                  )}
                </p>
                {activity.type !== "term_added" && (
                  <div className="flex items-center gap-2 mt-1 text-xs text-[#7e828d]">
                    <span className="font-medium">${activity.amount?.toFixed(2)}</span>
                    <span>•</span>
                    <span>{timeAgo}</span>
                  </div>
                )}
              </div>
              <div className="ml-2">
                {canCancel ? (
                  <button
                    type="button"
                    className="relative cursor-pointer focus:outline-none"
                    onClick={cancelConfirmId === activity.id ? undefined : () => handleCancelClick(activity.id)}
                    aria-label={cancelConfirmId === activity.id ? "Cancel charge confirmation" : "Cancel charge"}
                  >
                    <Badge 
                      className={`rounded-full px-2 py-0.5 text-xs font-medium flex items-center gap-1 transition-all duration-200 
                        ${cancelConfirmId === activity.id 
                          ? "hidden" 
                          : "group hover:bg-[#FDE8E8] hover:text-[#FE0160] bg-[rgba(254,202,17,0.2)] text-[#e6b600] hover:scale-105"}`}
                    >
                      <Eye className="h-3 w-3 group-hover:hidden transition-opacity duration-200" />
                      <XIcon className="h-3 w-3 hidden group-hover:block transition-opacity duration-200" />
                      <span className="group-hover:hidden transition-opacity duration-200">Gotcha</span>
                      <span className="hidden group-hover:block transition-opacity duration-200">Cancel</span>
                    </Badge>
                  </button>
                ) : (
                  <Badge 
                    className={`rounded-full px-2 py-0.5 text-xs font-medium flex items-center gap-1
                      ${activity.type === "term_added" 
                        ? "bg-[rgba(84,191,4,0.2)] text-[#419703]" 
                        : activity.type === "received"
                          ? "bg-[rgba(255,99,71,0.2)] text-[#ff6347]"
                          : "bg-[rgba(254,202,17,0.2)] text-[#e6b600]"}`}
                  >
                    {activity.type === "term_added" ? (
                      <>
                        <PencilIcon className="h-3 w-3" />
                        <span>Term</span>
                      </>
                    ) : (
                      <>
                        {activity.type === "received" ? (
                          <>
                            <Skull className="h-3 w-3" />
                            <span>Caught</span>
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3" />
                            <span>Gotcha</span>
                          </>
                        )}
                      </>
                    )}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Confirmation Overlay */}
        {cancelConfirmId === activity.id && (
          <div className="absolute inset-0 bg-white bg-opacity-95 flex items-center justify-center z-10 rounded transition-all duration-200 ease-in-out">
            <div className="p-4 text-center">
              <p className="text-sm font-medium mb-3">Going soft on corporate jargon now?</p>
              <div className="flex gap-2 justify-center">
                <Button 
                  onClick={() => handleConfirmCancel(activity.id)} 
                  variant="destructive" 
                  size="sm" 
                  className="bg-[#FE0160] hover:bg-[#d9014f] text-white"
                >
                  Yeah, refund it
                </Button>
                <Button 
                  onClick={handleCancelCancel} 
                  variant="secondary" 
                  size="sm"
                >
                  Nevermind
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Helper function to render activity items with pagination
  const renderActivityList = (items: ActivityItem[]) => {
    const hasMore = items.length > visibleItems
    const displayedItems = items.slice(0, visibleItems)

    return (
      <div className="flex flex-col">
        <div className="divide-y divide-gray-100">
          {displayedItems.map((activity, index) => (
            <div key={activity.id} className={index === 0 ? '' : 'border-t border-gray-100'}>
              {renderActivity(activity)}
            </div>
          ))}
        </div>
        {hasMore && (
          <div className="p-4 flex justify-center border-t border-gray-100">
            <Button
              variant="ghost"
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={loadMore}
            >
              View More
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="font-inter">
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full bg-white border-b rounded-t-lg">
          <TabsTrigger value="all" className="flex-1 text-sm text-[#7e828d] data-[state=active]:text-[#191d22] data-[state=active]:border-b-2 data-[state=active]:border-[#feca11]">
            <span className="flex items-center gap-2">
              <BellIcon className="h-4 w-4" />
              All
            </span>
          </TabsTrigger>
          <TabsTrigger value="received" className="flex-1 text-sm text-[#7e828d] data-[state=active]:text-[#191d22] data-[state=active]:border-b-2 data-[state=active]:border-[#feca11]">
            <span className="flex items-center gap-2">
              <Skull className="h-4 w-4" />
              Times Caught
            </span>
          </TabsTrigger>
          <TabsTrigger value="made" className="flex-1 text-sm text-[#7e828d] data-[state=active]:text-[#191d22] data-[state=active]:border-b-2 data-[state=active]:border-[#feca11]">
            <span className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Gotchas
            </span>
          </TabsTrigger>
          <TabsTrigger value="terms" className="flex-1 text-sm text-[#7e828d] data-[state=active]:text-[#191d22] data-[state=active]:border-b-2 data-[state=active]:border-[#feca11]">
            <span className="flex items-center gap-2">
              <BookOpenIcon className="h-4 w-4" />
              Terms
            </span>
          </TabsTrigger>
        </TabsList>
        
        <div className="bg-white rounded-b-lg">
          <TabsContent value="all" className="m-0">
            {activities.length > 0 ? renderActivityList(activities) : renderEmptyState("all")}
          </TabsContent>
          
          <TabsContent value="received" className="m-0">
            {receivedActivities.length > 0 ? renderActivityList(receivedActivities) : renderEmptyState("received")}
          </TabsContent>
          
          <TabsContent value="made" className="m-0">
            {madeActivities.length > 0 ? renderActivityList(madeActivities) : renderEmptyState("made")}
          </TabsContent>
          
          <TabsContent value="terms" className="m-0">
            {termAddedActivities.length > 0 ? renderActivityList(termAddedActivities) : renderEmptyState("terms")}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
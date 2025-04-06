"use client"

import Link from "next/link"
import { type ReactNode } from "react"
import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { BellIcon, DollarSignIcon, ZapIcon, FilterIcon } from "lucide-react"

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
}

export function ActivityFeed({ activities, userId }: ActivityFeedProps) {
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
      <div className="p-6 border-t">
        <div className="flex flex-col items-center justify-center py-6 px-4 text-[#9a9da5] font-inter">
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
  const madeActivities = activities.filter(item => item.charging_user?.id === userId)
  const termAddedActivities = activities.filter(item => item.type === "term_added")

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
    
    return (
      <div key={activity.id} className="p-4 border-b last:border-b-0 hover:bg-gray-50 transition-colors duration-200 ease-in-out">
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
                <Badge 
                  className={`rounded-full px-2 py-0.5 text-xs font-medium flex items-center gap-1
                    ${activity.type === "term_added" 
                      ? "bg-[rgba(84,191,4,0.2)] text-[#419703]" 
                      : "bg-[rgba(254,202,17,0.2)] text-[#e6b600]"}`}
                >
                  {activity.type === "term_added" ? (
                    <>
                      <FilterIcon className="h-3 w-3" />
                      <span>Term</span>
                    </>
                  ) : (
                    <>
                      <DollarSignIcon className="h-3 w-3" />
                      <span>Charge</span>
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="font-inter">
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full bg-white border-b">
          <TabsTrigger value="all" className="flex-1 text-sm text-[#7e828d] data-[state=active]:text-[#191d22] data-[state=active]:border-b-2 data-[state=active]:border-[#feca11]">
            <span className="flex items-center gap-2">
              <BellIcon className="h-4 w-4" />
              All
            </span>
          </TabsTrigger>
          <TabsTrigger value="received" className="flex-1 text-sm text-[#7e828d] data-[state=active]:text-[#191d22] data-[state=active]:border-b-2 data-[state=active]:border-[#feca11]">
            <span className="flex items-center gap-2">
              <DollarSignIcon className="h-4 w-4" />
              Charges
            </span>
          </TabsTrigger>
          <TabsTrigger value="made" className="flex-1 text-sm text-[#7e828d] data-[state=active]:text-[#191d22] data-[state=active]:border-b-2 data-[state=active]:border-[#feca11]">
            <span className="flex items-center gap-2">
              <ZapIcon className="h-4 w-4" />
              Auto
            </span>
          </TabsTrigger>
          <TabsTrigger value="terms" className="flex-1 text-sm text-[#7e828d] data-[state=active]:text-[#191d22] data-[state=active]:border-b-2 data-[state=active]:border-[#feca11]">
            <span className="flex items-center gap-2">
              <FilterIcon className="h-4 w-4" />
              Terms
            </span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="bg-white">
          <div className="divide-y divide-gray-100">
            {activities.length > 0 ? (
              activities.map(renderActivity)
            ) : (
              renderEmptyState("all")
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="received" className="bg-white">
          <div className="divide-y divide-gray-100">
            {receivedActivities.length > 0 ? (
              receivedActivities.map(renderActivity)
            ) : (
              renderEmptyState("received")
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="made" className="bg-white">
          <div className="divide-y divide-gray-100">
            {madeActivities.length > 0 ? (
              madeActivities.map(renderActivity)
            ) : (
              renderEmptyState("made")
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="terms" className="bg-white">
          <div className="divide-y divide-gray-100">
            {termAddedActivities.length > 0 ? (
              termAddedActivities.map(renderActivity)
            ) : (
              renderEmptyState("terms")
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
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
    let message = "No activity found."
    
    if (type === "received") {
      message = "You haven't been charged for any jargon yet."
    } else if (type === "made") {
      message = "You haven't charged anyone for jargon yet."
    } else if (type === "terms") {
      message = "No jargon terms have been added yet."
    }
    
    return (
      <div className="p-6 border-t">
        <div className="text-center py-12 text-muted-foreground">
          <p>{message}</p>
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
    // Format timestamp
    const timeAgo = formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })
    
    // Build the activity description based on type
    let activityDescription: ReactNode
    
    if (activity.type === "term_added") {
      // For term additions
      activityDescription = (
        <>
          <span className="font-medium">{activity.charging_user?.display_name}</span> added the term{" "}
          <span className="font-semibold">"{activity.jargon_term.term}"</span>
          {activity.jargon_term.description && (
            <span className="text-sm text-muted-foreground block mt-1">
              {activity.jargon_term.description}
            </span>
          )}
        </>
      )
    } else {
      // For charges (received or made)
      const isReceived = activity.charged_user?.id === userId
      const isViewingUser = activity.charging_user?.id === userId
      
      if (isViewingUser) {
        activityDescription = (
          <>
            <span className="font-medium">You</span> charged <span className="font-medium">{activity.charged_user?.display_name}</span> for saying
          </>
        )
      } else if (isReceived) {
        activityDescription = (
          <>
            <span className="font-medium">{activity.charging_user?.display_name}</span> charged <span className="font-medium">you</span> for saying
          </>
        )
      } else {
        activityDescription = (
          <>
            <span className="font-medium">{activity.charging_user?.display_name}</span> charged <span className="font-medium">{activity.charged_user?.display_name}</span> for saying
          </>
        )
      }
    }
    
    return (
      <div key={activity.id} className="p-4 border-b last:border-b-0">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage 
              src={activity.type === "term_added" 
                ? activity.charging_user?.avatar_url || undefined 
                : activity.charging_user?.avatar_url || undefined} 
              alt={activity.type === "term_added" 
                ? activity.charging_user?.display_name 
                : activity.charging_user?.display_name} 
            />
            <AvatarFallback>
              {activity.type === "term_added" 
                ? activity.charging_user?.display_name.substring(0, 2).toUpperCase() 
                : activity.charging_user?.display_name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm">
                  {activityDescription}
                  {activity.type !== "term_added" && (
                    <span className="font-semibold"> "{activity.jargon_term.term}"</span>
                  )}
                </p>
                {activity.type !== "term_added" && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-semibold">${activity.amount}</span>
                    {activity.category && (
                      <Badge variant="outline" className="text-xs">
                        #{activity.category}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all" className="flex-1">
            <span className="flex items-center gap-2">
              <BellIcon className="h-4 w-4" />
              All
            </span>
          </TabsTrigger>
          <TabsTrigger value="received" className="flex-1">
            <span className="flex items-center gap-2">
              <DollarSignIcon className="h-4 w-4" />
              Charges
            </span>
          </TabsTrigger>
          <TabsTrigger value="made" className="flex-1">
            <span className="flex items-center gap-2">
              <ZapIcon className="h-4 w-4" />
              Auto
            </span>
          </TabsTrigger>
          <TabsTrigger value="terms" className="flex-1">
            <span className="flex items-center gap-2">
              <FilterIcon className="h-4 w-4" />
              Terms
            </span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <div className="divide-y">
            {activities.length > 0 ? (
              activities.map(renderActivity)
            ) : (
              renderEmptyState("all")
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="received">
          <div className="divide-y">
            {receivedActivities.length > 0 ? (
              receivedActivities.map(renderActivity)
            ) : (
              renderEmptyState("received")
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="made">
          <div className="divide-y">
            {madeActivities.length > 0 ? (
              madeActivities.map(renderActivity)
            ) : (
              renderEmptyState("made")
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="terms">
          <div className="divide-y">
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
"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

// Define types for activity items
type ActivityItem = {
  id: string
  type: "received" | "made" // For determining if you were charged or you charged someone
  charging_user: {
    id: string
    display_name: string
    avatar_url: string | null
  }
  charged_user: {
    id: string
    display_name: string
    avatar_url: string | null
  }
  jargon_term: {
    id: string
    term: string
  }
  amount: number
  channel_id: string
  channel_name?: string
  category?: string | null // The tag like #marketing, #engineering
  created_at: string
}

type ActivityFeedProps = {
  activities: ActivityItem[]
  userId: string // The current user's ID
}

export function ActivityFeed({ activities, userId }: ActivityFeedProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="p-6 border-t">
        <div className="text-center py-12 text-muted-foreground">
          <p>No activity found.</p>
        </div>
      </div>
    )
  }

  // Filter activities based on type
  const receivedActivities = activities.filter(item => item.charged_user.id === userId)
  const madeActivities = activities.filter(item => item.charging_user.id === userId)

  // Helper function to render activity item
  const renderActivity = (activity: ActivityItem) => {
    // Determine which user to show (either who charged you or who you charged)
    const isReceived = activity.charged_user.id === userId
    const otherUser = isReceived ? activity.charging_user : activity.charged_user
    const userAction = isReceived ? "charged you for saying" : "charged for saying"
    
    // Format timestamp
    const timeAgo = formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })
    
    return (
      <div key={activity.id} className="p-4 border-b last:border-b-0">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={otherUser.avatar_url || undefined} alt={otherUser.display_name} />
            <AvatarFallback>{otherUser.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium">
                  {isReceived ? otherUser.display_name : "You"} {userAction}{" "}
                  <span className="text-red-500 font-semibold">"{activity.jargon_term.term}"</span>
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-semibold">${activity.amount}</span>
                  {activity.category && (
                    <Badge variant="outline" className="text-xs">
                      #{activity.category}
                    </Badge>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo}</span>
            </div>
            
            <div className="mt-2 flex justify-between items-center">
              <Link href="#" className="text-xs text-blue-500 hover:underline">
                Appeal
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Tabs defaultValue="all">
        <TabsList className="w-full rounded-none border-b bg-transparent p-0">
          <TabsTrigger 
            value="all" 
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3 data-[state=active]:shadow-none"
          >
            All
          </TabsTrigger>
          <TabsTrigger 
            value="received"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3 data-[state=active]:shadow-none"
          >
            Received
          </TabsTrigger>
          <TabsTrigger 
            value="made"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary py-3 data-[state=active]:shadow-none"
          >
            Made
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <div className="divide-y">
            {activities.map(renderActivity)}
          </div>
        </TabsContent>
        
        <TabsContent value="received">
          <div className="divide-y">
            {receivedActivities.map(renderActivity)}
          </div>
        </TabsContent>
        
        <TabsContent value="made">
          <div className="divide-y">
            {madeActivities.map(renderActivity)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
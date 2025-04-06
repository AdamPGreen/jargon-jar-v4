import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { ActivityFeed } from '@/components/activity-feed'
import type { ActivityItem } from '@/components/activity-feed'
import { differenceInDays, parseISO } from 'date-fns'
import { StreakCard } from '@/components/streak-card'
import { HallOfShame } from '@/components/hall-of-shame'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSignIcon, ZapIcon, RepeatIcon } from 'lucide-react'

// Define types for the data coming from Supabase
type SupabaseActivityItem = {
  id: string
  amount: number
  channel_id: string
  created_at: string
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
}

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  // Extract Slack user ID from identities
  const { data: { user } } = await supabase.auth.getUser()
  
  // Find the slack_oidc identity to get the actual Slack user ID
  const slackIdentity = user?.identities?.find(id => id.provider === 'slack_oidc')
  const slackIdentityData = slackIdentity?.identity_data as { provider_id?: string } | undefined
  
  // Get the Slack ID either from the identity's id field or provider_id in identity_data
  const slackUserId = slackIdentity?.id || slackIdentityData?.provider_id
  
  // Create an admin client to bypass RLS
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Get user data using the Slack user ID with admin client
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('id, display_name, workspace_id')
    .eq('slack_id', slackUserId)
    .single()

  console.log('User Data:', { userData, slackUserId });

  // Get user's charges stats including timestamps
  const { data: userChargesData, error: userChargesError } = await supabaseAdmin
    .from('charges')
    .select(`
      amount, 
      created_at,
      jargon_term:jargon_term_id (
        id,
        term
      )
    `)
    .eq('charged_user_id', userData?.id)
    .order('created_at', { ascending: true }) // Order oldest to newest for record calculation

  if (userChargesError) {
    console.error("Error fetching user charges:", userChargesError);
  }

  const userCharges = userChargesData || [];
  const userTotalCharges = userCharges.reduce((sum, charge) => sum + charge.amount, 0);

  // --- Streak Calculation Logic ---
  let currentStreak = 0;
  let recordStreak = 0;
  const now = new Date();

  if (userCharges.length === 0) {
    // If no charges, streak is potentially since account creation, but let's default to 0 or handle based on user creation date if available
    // For now, let's assume a long streak if they have *never* been charged.
    // We might need user.created_at for a more accurate "since joining" streak.
    // Let's set a high default like 99 for now, assuming no charges means they are doing great.
     // Or perhaps just 0 is less confusing? Let's start with 0.
    currentStreak = 0; // Or calculate differenceInDays(now, parseISO(user.created_at)) if available
    recordStreak = 0;
  } else {
    const chargeDates = userCharges.map(charge => parseISO(charge.created_at));
    
    // Current streak: days since the *last* charge
    const lastChargeDate = chargeDates[chargeDates.length - 1];
    currentStreak = differenceInDays(now, lastChargeDate);

    // Record streak: find the largest gap between consecutive charges, 
    // and also consider the gap from the first charge until now (if only one charge),
    // or the gap from the last charge until now (which is the current streak).
    let maxGap = 0;
    if (chargeDates.length > 1) {
      for (let i = 1; i < chargeDates.length; i++) {
        const gap = differenceInDays(chargeDates[i], chargeDates[i - 1]);
        if (gap > maxGap) {
          maxGap = gap;
        }
      }
    }
    // The record streak is the maximum of the largest gap found and the current streak.
    recordStreak = Math.max(maxGap, currentStreak); 
  }
  // --- End Streak Calculation ---

  // --- Most Common Jargon Calculation ---
  let mostCommonJargon = { term: 'N/A', count: 0 };
  if (userCharges && userCharges.length > 0) {
    const termCounts: Record<string, { term: string; count: number }> = {};
    
    for (const charge of userCharges) {
      // Ensure jargon_term exists and has valid properties
      const jargonTerm = charge.jargon_term as { id?: string; term?: string } | null;
      if (jargonTerm?.id && jargonTerm?.term) {
        const termId = jargonTerm.id;
        const termName = jargonTerm.term;
        if (!termCounts[termId]) {
          termCounts[termId] = { term: termName, count: 0 };
        }
        termCounts[termId].count++;
      }
    }

    const sortedTerms = Object.values(termCounts).sort((a, b) => b.count - a.count);
    
    if (sortedTerms.length > 0) {
      mostCommonJargon = sortedTerms[0];
    } else {
      // Handle case where charges exist but none have valid jargon terms
      mostCommonJargon = { term: 'Unknown', count: 0 };
    }
  }
  // --- End Most Common Jargon Calculation ---

  // Get workspace total charges
  const { data: workspaceCharges } = await supabaseAdmin
    .from('charges')
    .select('amount')
    .eq('workspace_id', userData?.workspace_id)

  const workspaceTotalCharges = workspaceCharges?.reduce((sum, charge) => sum + charge.amount, 0) || 0

  // Get charges made by user
  const { count: chargesMadeCount } = await supabaseAdmin
    .from('charges')
    .select('*', { count: 'exact', head: true })
    .eq('charging_user_id', userData?.id)

  // Get top 5 worst jargon users in the workspace
  const { data: topJargonUsers, error: topUsersError } = await supabaseAdmin
    .from('charges')
    .select(`
      charged_user:charged_user_id(
        id,
        display_name,
        avatar_url
      ),
      amount
    `)
    .eq('workspace_id', userData?.workspace_id)
    .order('created_at', { ascending: false })

  if (topUsersError) {
    console.error('Error fetching top jargon users:', topUsersError);
  }

  // Process the top jargon users data
  const processedTopUsers = topJargonUsers?.reduce((acc, charge) => {
    // Type assertion to handle the nested structure
    const typedCharge = charge as unknown as {
      charged_user: {
        id: string;
        display_name: string;
        avatar_url: string | null;
      };
      amount: number;
    };
    
    if (!typedCharge.charged_user) return acc;
    
    const userId = typedCharge.charged_user.id;
    if (!acc[userId]) {
      acc[userId] = {
        id: userId,
        display_name: typedCharge.charged_user.display_name,
        avatar_url: typedCharge.charged_user.avatar_url,
        total_charges: 0
      };
    }
    
    acc[userId].total_charges += typedCharge.amount;
    return acc;
  }, {} as Record<string, { id: string; display_name: string; avatar_url: string | null; total_charges: number }>);

  // Convert to array and sort by total charges (descending)
  const topUsers = Object.values(processedTopUsers || {})
    .sort((a, b) => b.total_charges - a.total_charges)
    .slice(0, 5);

  // Get recent activity (both charges made and received)
  console.log('Query Parameters:', {
    userId: userData?.id,
    workspaceId: userData?.workspace_id
  });

  const { data: recentActivity, error: activityError } = await supabaseAdmin
    .from('charges')
    .select(`
      id,
      amount,
      channel_id,
      created_at,
      charging_user:charging_user_id(
        id,
        display_name,
        avatar_url
      ),
      charged_user:charged_user_id(
        id,
        display_name,
        avatar_url
      ),
      jargon_term:jargon_term_id(
        id,
        term
      )
    `)
    .or(`charged_user_id.eq.${userData?.id},charging_user_id.eq.${userData?.id}`)
    .order('created_at', { ascending: false })
    .limit(10)

  if (activityError) {
    console.error('Error fetching activity:', activityError);
  }

  // Get recently added jargon terms
  const { data: recentTerms, error: termsError } = await supabaseAdmin
    .from('jargon_terms')
    .select(`
      id,
      term,
      description,
      default_cost,
      created_at,
      created_by,
      users:created_by(
        id,
        display_name,
        avatar_url
      )
    `)
    .eq('workspace_id', userData?.workspace_id)
    .order('created_at', { ascending: false })
    .limit(5)

  if (termsError) {
    console.error('Error fetching recent terms:', termsError);
  }

  console.log('Recent Activity Raw:', recentActivity);
  console.log('Recent Terms Raw:', recentTerms);

  // Transform the Supabase nested array results into the format ActivityFeed expects
  const processedActivity = (recentActivity?.map((item) => {
    // Use type assertion to handle the mismatch between expected and actual data structure
    const typedItem = item as unknown as {
      id: string;
      amount: number;
      channel_id: string;
      created_at: string;
      charging_user: {
        id: string;
        display_name: string;
        avatar_url: string | null;
      };
      charged_user: {
        id: string;
        display_name: string;
        avatar_url: string | null;
      };
      jargon_term: {
        id: string;
        term: string;
      };
    };
    
    // Validate required nested data exists
    if (!typedItem.charged_user || !typedItem.charging_user || !typedItem.jargon_term) {
      console.error('Invalid activity item structure:', typedItem);
      return null;
    }

    const isReceived = typedItem.charged_user.id === userData?.id;
    
    return {
      id: typedItem.id,
      type: isReceived ? "received" as const : "made" as const,
      charging_user: {
        id: typedItem.charging_user.id,
        display_name: typedItem.charging_user.display_name,
        avatar_url: typedItem.charging_user.avatar_url
      },
      charged_user: {
        id: typedItem.charged_user.id,
        display_name: typedItem.charged_user.display_name,
        avatar_url: typedItem.charged_user.avatar_url
      },
      jargon_term: {
        id: typedItem.jargon_term.id,
        term: typedItem.jargon_term.term
      },
      amount: typedItem.amount,
      channel_id: typedItem.channel_id,
      category: null,
      created_at: typedItem.created_at
    }
  }).filter((item): item is NonNullable<typeof item> => item !== null) || []) as ActivityItem[];

  // Transform recently added terms into activity items
  const termActivities = (recentTerms?.map((term) => {
    // Skip terms without a creator
    if (!term.created_by || !term.users) {
      return null;
    }

    // Access the first user in the array
    const creator = Array.isArray(term.users) ? term.users[0] : term.users;

    return {
      id: `term-${term.id}`,
      type: "term_added" as const,
      charging_user: {
        id: term.created_by,
        display_name: creator.display_name,
        avatar_url: creator.avatar_url
      },
      jargon_term: {
        id: term.id,
        term: term.term,
        description: term.description
      },
      created_at: term.created_at
    }
  }).filter((item): item is NonNullable<typeof item> => item !== null) || []) as ActivityItem[];

  // Combine and sort activities by creation date
  const allActivities = [...processedActivity, ...termActivities].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  console.log('Processed Activity:', allActivities);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your Jargon Jar dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-8 space-y-6">
          {/* Top Row - Workspace Total and Streak Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Workspace Total Card - Updated to use Shadcn Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Workspace Total
                </CardTitle>
                <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  ${workspaceTotalCharges.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total charges across workspace
                </p>
              </CardContent>
            </Card>

            {/* Streak Card - Moved next to Workspace Total */}
            <StreakCard currentStreak={currentStreak} recordStreak={recordStreak} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Your Total Charges Card - Updated to use Shadcn Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Your Total Charges
                </CardTitle>
                <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  ${userTotalCharges.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total amount you've been charged
                </p>
              </CardContent>
            </Card>

            {/* Charges Made Card - Updated to use Shadcn Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Charges Made
                </CardTitle>
                <ZapIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {chargesMadeCount || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Times you've caught others
                </p>
              </CardContent>
            </Card>

            {/* Most Common Jargon Card - NEW */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Most Frequent Jargon
                </CardTitle>
                <RepeatIcon className="h-4 w-4 text-muted-foreground" /> 
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold truncate" title={mostCommonJargon.term}>
                  {mostCommonJargon.term}
                </div>
                <p className="text-xs text-muted-foreground">
                  Charged {mostCommonJargon.count} time{mostCommonJargon.count !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Hall of Shame Card */}
          <HallOfShame topUsers={topUsers} />
        </div>

        {/* Right Column - Activity Feed */}
        <div className="lg:col-span-4">
          <div className="rounded-lg border shadow-sm h-full">
            <div className="p-6">
              <h2 className="text-xl font-semibold">Recent Activity</h2>
              <p className="text-sm text-muted-foreground">
                Your recent jargon charges, payments, and term additions.
              </p>
            </div>
            <ActivityFeed activities={allActivities} userId={userData?.id} />
          </div>
        </div>
      </div>
    </div>
  )
} 
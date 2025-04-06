import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { ActivityFeed } from '@/components/activity-feed'
import type { ActivityItem } from '@/components/activity-feed'

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
  }[]
  charged_user: {
    id: string
    display_name: string
    avatar_url: string | null
  }[]
  jargon_term: {
    id: string
    term: string
  }[]
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

  // Get user's charges stats
  const { data: userCharges } = await supabaseAdmin
    .from('charges')
    .select('amount')
    .eq('charged_user_id', userData?.id)

  const userTotalCharges = userCharges?.reduce((sum, charge) => sum + charge.amount, 0) || 0

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

  console.log('Recent Activity Raw:', recentActivity);

  // Transform the Supabase nested array results into the format ActivityFeed expects
  const processedActivity = (recentActivity?.map((item: SupabaseActivityItem) => {
    // Validate required nested data exists
    if (!item.charged_user?.[0] || !item.charging_user?.[0] || !item.jargon_term?.[0]) {
      console.error('Invalid activity item structure:', item);
      return null;
    }

    const isReceived = item.charged_user[0].id === userData?.id;
    
    return {
      id: item.id,
      type: isReceived ? "received" as const : "made" as const,
      charging_user: {
        id: item.charging_user[0].id,
        display_name: item.charging_user[0].display_name,
        avatar_url: item.charging_user[0].avatar_url
      },
      charged_user: {
        id: item.charged_user[0].id,
        display_name: item.charged_user[0].display_name,
        avatar_url: item.charged_user[0].avatar_url
      },
      jargon_term: {
        id: item.jargon_term[0].id,
        term: item.jargon_term[0].term
      },
      amount: item.amount,
      channel_id: item.channel_id,
      category: null,
      created_at: item.created_at
    }
  }).filter((item): item is NonNullable<typeof item> => item !== null) || []) as ActivityItem[];

  console.log('Processed Activity:', processedActivity);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your Jargon Jar dashboard.
        </p>
      </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground">
            Workspace Total
          </div>
          <div className="mt-2 text-3xl font-bold">
            ${workspaceTotalCharges.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">
            Total charges across workspace
          </div>
        </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground">
            Your Total Charges
          </div>
          <div className="mt-2 text-3xl font-bold">
            ${userTotalCharges.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">
            Total amount you've been charged
          </div>
        </div>


        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground">
            Charges Made
          </div>
          <div className="mt-2 text-3xl font-bold">
            {chargesMadeCount || 0}
          </div>
          <div className="text-xs text-muted-foreground">
            Times you've caught others
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground">
            Jargon Ratio
          </div>
          <div className="mt-2 text-3xl font-bold">
            {chargesMadeCount && userCharges?.length 
              ? (chargesMadeCount / (userCharges.length || 1)).toFixed(2)
              : 'N/A'}
          </div>
          <div className="text-xs text-muted-foreground">
            Higher is better!
          </div>
        </div>
      </div>

      <div className="rounded-lg border shadow-sm">
        <div className="p-6">
          <h2 className="text-xl font-semibold">Recent Activity</h2>
          <p className="text-sm text-muted-foreground">
            Your recent jargon charges and payments.
          </p>
        </div>
        <ActivityFeed activities={processedActivity} userId={userData?.id} />
      </div>
    </div>
  )
} 
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { HallOfShame } from '@/components/hall-of-shame'

// Define types for better type safety
type LeaderboardEntry = {
  charged_user_id: string
  users: {
    display_name: string
    avatar_url: string | null
  }[]
  total_charges: number
  jargon_count: number
  favorite_phrase: string
}

export default async function LeaderboardPage() {
  const supabase = createClient()
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

  // Get user's workspace ID using the admin client
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('workspace_id')
    .eq('slack_id', slackUserId)
    .single()

  // Get top 10 charged users in the workspace using admin client
  const { data: leaderboard } = await supabaseAdmin
    .rpc('get_top_jargon_users', { workspace_id_param: userData?.workspace_id })
    .limit(10)

  // Add logging here
  console.log('[LeaderboardPage] Workspace ID:', userData?.workspace_id);
  console.log('[LeaderboardPage] Raw Leaderboard Data:', leaderboard);

  // Transform the data for the HallOfShame component
  const topUsers = leaderboard?.map((entry: LeaderboardEntry) => ({
    id: entry.charged_user_id,
    display_name: entry.users[0].display_name,
    avatar_url: entry.users[0].avatar_url,
    total_charges: entry.total_charges,
    jargon_count: entry.jargon_count,
    favorite_phrase: entry.favorite_phrase
  })) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">
          The Jargon Jar hall of shame - who's been caught the most?
        </p>
      </div>

      <div className="rounded-lg border shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-2">Top Jargon Offenders</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Based on the total amount charged for using jargon.
          </p>
          <HallOfShame topUsers={topUsers} />
      </div>
    </div>
  )
} 
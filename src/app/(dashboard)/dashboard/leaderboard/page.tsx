import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// Define types for better type safety
type LeaderboardEntry = {
  charged_user_id: string
  users: {
    display_name: string
    avatar_url: string | null
  }[] // users is an array since it's from a join
  count: number
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
    .from('charges')
    .select(`
      charged_user_id,
      users:charged_user_id (
        display_name,
        avatar_url
      ),
      count
    `)
    .eq('workspace_id', userData?.workspace_id)
    .order('count', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">
          The Jargon Jar hall of shame - who's been caught the most?
        </p>
      </div>

      {leaderboard && leaderboard.length > 0 ? (
        <div className="rounded-lg border shadow-sm">
          <div className="p-6">
            <h2 className="text-xl font-semibold">Top Jargon Offenders</h2>
            <p className="text-sm text-muted-foreground">
              Based on the number of times caught using jargon.
            </p>
          </div>
          <div className="border-t">
            <div className="divide-y">
              {leaderboard.map((entry: LeaderboardEntry, index: number) => (
                <div 
                  key={entry.charged_user_id} 
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-center font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">
                        {entry.users?.[0]?.display_name || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="font-bold">{entry.count} charges</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border shadow-sm">
          <div className="p-6">
            <h2 className="text-xl font-semibold">Top Jargon Offenders</h2>
            <p className="text-sm text-muted-foreground">
              Based on the number of times caught using jargon.
            </p>
          </div>
          <div className="p-6 border-t">
            <div className="text-center py-12 text-muted-foreground">
              <p>No charges have been made yet.</p>
              <p className="mt-1">Start catching your colleagues using jargon!</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
import { createClient } from '@/lib/supabase/server'

export default async function LeaderboardPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // Get user's workspace ID
  const { data: userData } = await supabase
    .from('users')
    .select('workspace_id')
    .eq('slack_id', session?.user.id)
    .single()

  // Get top 10 charged users in the workspace
  const { data: leaderboard } = await supabase
    .from('charges')
    .select(`
      charged_user_id,
      users:charged_user_id (
        display_name,
        avatar_url
      ),
      count: count(*)
    `)
    .eq('workspace_id', userData?.workspace_id)
    .group('charged_user_id, users.display_name, users.avatar_url')
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
              {leaderboard.map((entry, index) => (
                <div 
                  key={entry.charged_user_id} 
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-center font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{entry.users?.display_name || 'Unknown'}</p>
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
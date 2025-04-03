import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // Get user data
  const { data: userData } = await supabase
    .from('users')
    .select('id, display_name, workspace_id')
    .eq('slack_id', session?.user.id)
    .single()

  // Get user's charges stats
  const { count: chargesReceivedCount } = await supabase
    .from('charges')
    .select('*', { count: 'exact', head: true })
    .eq('charged_user_id', userData?.id)

  // Get charges made by user
  const { count: chargesMadeCount } = await supabase
    .from('charges')
    .select('*', { count: 'exact', head: true })
    .eq('charging_user_id', userData?.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your Jargon Jar dashboard.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground">
            Your Jar Total
          </div>
          <div className="mt-2 text-3xl font-bold">
            ${chargesReceivedCount || 0}
          </div>
          <div className="text-xs text-muted-foreground">
            Times caught using jargon
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
            {chargesMadeCount && chargesReceivedCount 
              ? (chargesMadeCount / (chargesReceivedCount || 1)).toFixed(2)
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
        <div className="p-6 border-t">
          <div className="text-center py-12 text-muted-foreground">
            <p>Your activity will appear here.</p>
          </div>
        </div>
      </div>
    </div>
  )
} 
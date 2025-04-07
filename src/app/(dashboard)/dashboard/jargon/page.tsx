import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// Define types for better type safety
type JargonTerm = {
  id: string
  term: string
  description: string
  default_cost: number
  created_at: string
  created_by: string | null
  workspace_id: string | null
  creator: { display_name: string }[] | null
}

export default async function JargonPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  // Extract Slack user ID from identities
  const { data: { user } } = await supabase.auth.getUser()
  
  // Find the slack_oidc identity to get the actual Slack user ID
  const slackIdentity = user?.identities?.find(id => id.provider === 'slack_oidc')
  const slackIdentityData = slackIdentity?.identity_data as { provider_id?: string } | undefined
  
  // Get the Slack ID either from the identity's id field or provider_id in identity_data
  const slackUserId = slackIdentity?.id || slackIdentityData?.provider_id
  
  console.log('DIAGNOSTIC (Jargon Page): Auth user details', {
    authUserId: session?.user?.id,
    hasSlackIdentity: !!slackIdentity,
    slackUserId,
    slackIdLength: slackUserId?.length,
  })

  // Get user's workspace ID
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('workspace_id')
    .eq('slack_id', slackUserId)
    .single()
    
  if (userError) {
    console.error('DIAGNOSTIC (Jargon Page): Error fetching user data:', userError)
  }
  
  console.log('DIAGNOSTIC (Jargon Page): User data', { userData, slackUserId })
  
  // Create admin client to bypass RLS for debugging
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  
  // Get jargon terms directly with admin client
  const { data: jargonTermsAdmin, error: jargonErrorAdmin } = await supabaseAdmin
    .from('jargon_terms')
    .select(`
      id,
      term,
      description,
      default_cost,
      created_at,
      created_by,
      workspace_id,
      creator:users(display_name)
    `)
    .order('term')
    
  if (jargonErrorAdmin) {
    console.error('DIAGNOSTIC (Jargon Page): Error fetching jargon terms with admin:', jargonErrorAdmin)
  }
  
  console.log('DIAGNOSTIC (Jargon Page): Total jargon terms with admin:', jargonTermsAdmin?.length)

  // Get jargon terms for the workspace (both global and workspace-specific)
  const { data: jargonTerms, error: jargonError } = await supabase
    .from('jargon_terms')
    .select(`
      id,
      term,
      description,
      default_cost,
      created_at,
      created_by,
      workspace_id,
      creator:users(display_name)
    `)
    .or(`workspace_id.eq.${userData?.workspace_id},workspace_id.is.null`)
    .order('term')
    
  if (jargonError) {
    console.error('DIAGNOSTIC (Jargon Page): Error fetching jargon terms:', jargonError)
  }
  
  console.log('DIAGNOSTIC (Jargon Page): Total jargon terms after filtering:', jargonTerms?.length)
  
  // Use admin client results for now if regular query fails
  const displayTerms = jargonTerms?.length ? jargonTerms : jargonTermsAdmin;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Jargon Terms</h1>
        <p className="text-muted-foreground">
          Browse all known jargon terms and their costs.
        </p>
      </div>

      <div className="rounded-lg border shadow-sm">
        <div className="p-6">
          <h2 className="text-xl font-semibold">Jargon Dictionary</h2>
          <p className="text-sm text-muted-foreground">
            All terms you can use to charge your colleagues.
          </p>
        </div>
        <div className="border-t">
          {displayTerms && displayTerms.length > 0 ? (
            <div className="divide-y">
              {displayTerms.map((term: JargonTerm) => (
                <div key={term.id} className="p-4">
                  <div className="mb-1">
                    <h3 className="font-medium">{term.term}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{term.description}</p>
                  <p className="font-bold">${term.default_cost}</p>
                  {term.creator && term.creator.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Added by {term.creator[0]?.display_name || 'Unknown'} 
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6">
              <div className="text-center py-12 text-muted-foreground">
                <p>No jargon terms found.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
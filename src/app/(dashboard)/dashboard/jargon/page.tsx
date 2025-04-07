import { createClient } from '@/lib/supabase/server'

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

  // Get user's workspace ID
  const { data: userData } = await supabase
    .from('users')
    .select('workspace_id')
    .eq('slack_id', session?.user.id)
    .single()

  // Get jargon terms for the workspace (both global and workspace-specific)
  const { data: jargonTerms } = await supabase
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
          {jargonTerms && jargonTerms.length > 0 ? (
            <div className="divide-y">
              {jargonTerms.map((term: JargonTerm) => (
                <div key={term.id} className="p-4">
                  <div className="flex justify-between mb-1">
                    <h3 className="font-medium">{term.term}</h3>
                    <span className="font-bold">${term.default_cost}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{term.description}</p>
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
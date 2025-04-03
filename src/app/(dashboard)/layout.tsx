import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import MobileNav from '@/components/mobile-nav'

// Dashboard layout with session provider and top navigation
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get user session from Supabase
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  // If no session, redirect to home page
  if (!session) {
    redirect('/')
  }
  
  // Extract Slack user ID from identities (added for OIDC flow)
  const { data: { user } } = await supabase.auth.getUser()
  
  // Find the slack_oidc identity to get the actual Slack user ID
  const slackIdentity = user?.identities?.find(id => id.provider === 'slack_oidc')
  const slackIdentityData = slackIdentity?.identity_data as { provider_id?: string } | undefined
  
  // Get the Slack ID either from the identity's id field or provider_id in identity_data
  const slackUserId = slackIdentity?.id || slackIdentityData?.provider_id
  
  console.log('DIAGNOSTIC (Dashboard Layout): Auth user details', {
    authUserId: session.user.id,
    hasSlackIdentity: !!slackIdentity,
    slackUserId,
    slackIdLength: slackUserId?.length,
    slackIdCharCodes: slackUserId?.split('').map(c => c.charCodeAt(0))
  })
  
  if (!slackUserId) {
    console.error('Could not find Slack user ID in auth identities')
    redirect('/?error=missing_slack_identity')
  }
  
  // Create an admin client to bypass RLS
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('DIAGNOSTIC (Dashboard Layout): SUPABASE_SERVICE_ROLE_KEY env var is missing!')
    redirect('/?error=server_config_error');
  }
  
  // Debug: Try to get all users first to verify the user exists at all (with admin client)
  const { data: allUsers } = await supabaseAdmin
    .from('users')
    .select('id, slack_id, email')
    .limit(10)
    
  console.log('DIAGNOSTIC (Dashboard Layout): All users (admin client):', allUsers)
  
  // Get user data using the Slack user ID with admin client to bypass RLS
  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, display_name, avatar_url, workspace_id')
    .eq('slack_id', slackUserId)
    .single()
  
  console.log('DIAGNOSTIC (Dashboard Layout): User lookup result (admin client):', {
    found: !!userData,
    error: userError ? {
      code: userError.code,
      message: userError.message,
      details: userError.details
    } : null
  })
  
  if (userError || !userData) {
    console.error('Error fetching user data:', userError)
    redirect('/?error=user_not_found')
  }
  
  // Get workspace data using admin client
  const { data: workspaceData, error: workspaceError } = await supabaseAdmin
    .from('workspaces')
    .select('id, name, domain')
    .eq('id', userData.workspace_id)
    .single()
  
  if (workspaceError || !workspaceData) {
    console.error('Error fetching workspace data:', workspaceError)
    redirect('/?error=workspace_not_found')
  }
  
  // Handle sign out
  const signOut = async () => {
    'use server'
    const supabase = createClient()
    await supabase.auth.signOut()
    redirect('/')
  }

  const navItems = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Leaderboard", href: "/dashboard/leaderboard" },
    { title: "Jargon Terms", href: "/dashboard/jargon" },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top navigation */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="font-bold text-xl">
              Jargon Jar
            </Link>
            
            <nav className="hidden md:flex space-x-4">
              {navItems.map((item) => (
                <Link 
                  key={item.href}
                  href={item.href} 
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  {item.title}
                </Link>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {userData.display_name} • {workspaceData.name}
                </span>
              </div>
            </div>
            
            {/* Mobile menu trigger */}
            <div className="md:hidden">
              <MobileNav 
                navItems={navItems} 
                userName={userData.display_name} 
                workspaceName={workspaceData.name} 
                signOut={signOut} 
              />
            </div>
            
            {/* Desktop sign out button */}
            <div className="hidden md:block">
              <form action={signOut}>
                <Button variant="outline" size="sm" type="submit">
                  Sign out
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-1 container px-4 py-6">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="border-t py-4 text-center text-sm text-muted-foreground">
        <div className="container px-4">
          <p>© {new Date().getFullYear()} Jargon Jar • Stay Jargon-Free</p>
        </div>
      </footer>
    </div>
  )
} 
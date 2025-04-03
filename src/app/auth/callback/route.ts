import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Helper function to manually create a supabase client with cookie handling for PKCE
function createCustomClient(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  return createAdminClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      flowType: 'pkce',
      // @ts-ignore - cookies property is available but not in TypeScript types
      cookies: {
        get(name: string) {
          let cookieValue = req.cookies.get(name)?.value;
          // Specifically handle the code verifier cookie
          if (cookieValue && name.includes('-auth-token-code-verifier')) {
            console.log('DIAGNOSTIC (Auth Callback): Processing PKCE cookie:', name);
            // Remove surrounding quotes if they exist
            if (cookieValue.startsWith('"') && cookieValue.endsWith('"')) {
              cookieValue = cookieValue.slice(1, -1);
              console.log('DIAGNOSTIC (Auth Callback): Unquoted PKCE cookie value');
            }
          }
          return cookieValue;
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set(name: string, value: string, options: Record<string, any>) {
          // This will be called by Supabase Auth after successful auth
          // We don't need to do anything here for the callback
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        remove(name: string, options: Record<string, any>) {
          // Not needed for auth callback
        },
      }
    }
  });
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  console.log('DIAGNOSTIC (Supabase Auth Callback): Received callback request', { code })

  // Log all received cookies
  console.log('DIAGNOSTIC (Supabase Auth Callback): Cookies received:', request.cookies.getAll());

  if (code) {
    try {
      // Use our custom client with PKCE cookie handling
      const supabase = createCustomClient(request);
      
      // Exchange code for session using the server client
      console.log('DIAGNOSTIC (Supabase Auth Callback): Attempting to exchange code for session...');
      const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('DIAGNOSTIC (Supabase Auth Callback): Error exchanging code for session:', exchangeError)
        return NextResponse.redirect(`${origin}/auth/auth-code-error?message=${encodeURIComponent(exchangeError.message)}`)
      }
      
      console.log('DIAGNOSTIC (Supabase Auth Callback): Code exchange successful!');

      if (!sessionData || !sessionData.user) {
        console.error('DIAGNOSTIC (Supabase Auth Callback): No user data found in session after exchange.')
        return NextResponse.redirect(`${origin}/auth/auth-code-error?message=Failed+to+retrieve+user+session`)
      }

      // Create a server client to save the session cookies
      const serverClient = createClient();
      const response = NextResponse.redirect(`${origin}/dashboard`);
      
      // Set the session cookies
      await serverClient.auth.setSession({
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token
      });

      // --- Workspace Check & Redirect Logic --- 
      console.log('DIAGNOSTIC (Supabase Auth Callback): Session obtained. Checking workspace installation...')
      const user = sessionData.user
      // Find the Slack identity to get the Slack user ID
      const slackIdentity = user.identities?.find(id => id.provider === 'slack')
      // Explicitly cast identity_data to access provider-specific fields if necessary
      // Adjust casting based on actual data structure if needed
      const slackIdentityData = slackIdentity?.identity_data as { team_id?: string } | undefined
      const slackUserId = slackIdentity?.id

      if (!slackUserId) {
        console.error('DIAGNOSTIC (Supabase Auth Callback): Could not find Slack user ID in user identities.', user.identities)
        // This might happen if scopes were incorrect or Slack didn't return the ID
        return NextResponse.redirect(`${origin}/auth/auth-code-error?message=Missing+Slack+user+identity`)
      }
      console.log('DIAGNOSTIC (Supabase Auth Callback): Extracted Slack User ID:', slackUserId)

      // Use Admin Client to bypass RLS for checking user/workspace existence
      const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        { auth: { autoRefreshToken: false, persistSession: false } }
      )
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('DIAGNOSTIC (Supabase Auth Callback): SUPABASE_SERVICE_ROLE_KEY env var is missing!')
        return NextResponse.redirect(`${origin}/auth/auth-code-error?message=Server+config+error+(Admin)`);
      }

      // 1. Check if the user exists in our users table
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('workspace_id')
        .eq('slack_id', slackUserId)
        .single()

      if (userError && userError.code !== 'PGRST116') { // PGRST116 = Row not found
        console.error('DIAGNOSTIC (Supabase Auth Callback): Error checking user existence:', userError)
        return NextResponse.redirect(`${origin}/auth/auth-code-error?message=Error+checking+user+data`)
      }

      let workspaceExists = false
      if (userData?.workspace_id) {
        console.log('DIAGNOSTIC (Supabase Auth Callback): User found in DB with workspace ID:', userData.workspace_id)
        // 2. If user exists, check if their associated workspace exists
        const { data: workspaceData, error: workspaceError } = await supabaseAdmin
          .from('workspaces')
          .select('id')
          .eq('id', userData.workspace_id)
          .single()

        if (workspaceError && workspaceError.code !== 'PGRST116') {
           console.error('DIAGNOSTIC (Supabase Auth Callback): Error checking workspace existence:', workspaceError)
           // Don't necessarily fail here, but log it. Redirect logic below handles it.
        }
        
        if (workspaceData) {
           console.log('DIAGNOSTIC (Supabase Auth Callback): Associated workspace found in DB.')
           workspaceExists = true
        }
      } else {
         console.log('DIAGNOSTIC (Supabase Auth Callback): User not found in DB or missing workspace ID.')
      }

      // 3. Redirect based on workspace existence
      if (workspaceExists) {
        console.log('DIAGNOSTIC (Supabase Auth Callback): Workspace exists. Redirecting to dashboard.')
        return response;
      }

      // If workspace doesn't exist, redirect to landing page
      console.log('DIAGNOSTIC (Supabase Auth Callback): Workspace does not exist or user not linked. Redirecting to landing page with install prompt.')
      // Access team_id via identity_data
      const teamIdHint = slackIdentityData?.team_id || 'unknown'
      return NextResponse.redirect(`${origin}/?install_required=true&workspace_hint=${teamIdHint}`)

    } catch (error) {
      console.error('DIAGNOSTIC (Supabase Auth Callback): Unexpected error during callback processing:', error)
      return NextResponse.redirect(`${origin}/auth/auth-code-error?message=Internal+server+error`)
    }
  } else {
    console.error('DIAGNOSTIC (Supabase Auth Callback): No code found in request parameters.')
    return NextResponse.redirect(`${origin}/auth/auth-code-error?message=Authorization+code+missing`)
  }
} 
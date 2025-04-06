import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  console.log('DIAGNOSTIC (Supabase Auth Callback): Received callback request', { code })

  // Log all received cookies
  console.log('DIAGNOSTIC (Supabase Auth Callback): Cookies received:', request.cookies.getAll());

  if (code) {
    const supabase = createClient()
    try {
      // Exchange code for session using the server client
      console.log('DIAGNOSTIC (Supabase Auth Callback): Attempting to exchange code for session...');
      console.log('DIAGNOSTIC (Supabase Auth Callback): Code value:', code);
      console.log('DIAGNOSTIC (Supabase Auth Callback): PKCE cookie value before exchange:', 
        request.cookies.get(`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('.')?.[0]?.split('//')?.[1] || 'unknown-project-id'}-auth-token-code-verifier`)?.value
      );
      
      const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('DIAGNOSTIC (Supabase Auth Callback): Error exchanging code for session:', exchangeError)
        // Log the cookie value *again* right before failure
        const pkceCookieName = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('.')?.[0]?.split('//')?.[1] || 'unknown'}-auth-token-code-verifier`;
        const finalPkceValue = request.cookies.get(pkceCookieName)?.value;
        console.error(`DIAGNOSTIC (Supabase Auth Callback): PKCE cookie value at failure: ${finalPkceValue}`);
        return NextResponse.redirect(`${origin}/auth/auth-code-error?message=${encodeURIComponent(exchangeError.message)}`)
      }
      
      console.log('DIAGNOSTIC (Supabase Auth Callback): Code exchange successful!');

      if (!sessionData || !sessionData.user) {
        console.error('DIAGNOSTIC (Supabase Auth Callback): No user data found in session after exchange.')
        return NextResponse.redirect(`${origin}/auth/auth-code-error?message=Failed+to+retrieve+user+session`)
      }

      // --- Workspace Check & Redirect Logic --- 
      console.log('DIAGNOSTIC (Supabase Auth Callback): Session obtained. Checking workspace installation...')
      const user = sessionData.user
      // Find the Slack identity to get the Slack user ID
      const slackIdentity = user.identities?.find(id => id.provider === 'slack_oidc')
      // Explicitly cast identity_data to access provider-specific fields if necessary
      // Adjust casting based on actual data structure if needed
      const slackIdentityData = slackIdentity?.identity_data as { 
        team_id?: string;
        provider_id?: string;
        email?: string;
        full_name?: string;
        name?: string;
        picture?: string;
        avatar_url?: string;
      } | undefined
      const slackUserId = slackIdentity?.id || slackIdentityData?.provider_id

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
         
         // New code to create user record if one doesn't exist
         // This helps bridge the gap between OIDC auth and app installation
         try {
           console.log('DIAGNOSTIC (Supabase Auth Callback): Attempting to create temporary user record...')
           
           // Extract user data from identity
           const userEmail = user.email || slackIdentityData?.email || ''
           const displayName = slackIdentityData?.full_name || slackIdentityData?.name || user.email?.split('@')[0] || 'Unknown User'
           const avatarUrl = slackIdentityData?.picture || slackIdentityData?.avatar_url || ''
           const teamId = slackIdentityData?.team_id
           
           console.log('DIAGNOSTIC (Supabase Auth Callback): Extracted user data:', { 
             userEmail, 
             displayName, 
             hasAvatar: !!avatarUrl,
             teamId 
           })
           
           if (teamId) {
             // Check if workspace exists
             const { data: workspace } = await supabaseAdmin
               .from('workspaces')
               .select('id')
               .eq('slack_id', teamId)
               .single()
             
             if (workspace?.id) {
               // Create user record linked to existing workspace
               const userInsertData = {
                 slack_id: slackUserId,
                 email: userEmail,
                 display_name: displayName,
                 avatar_url: avatarUrl,
                 workspace_id: workspace.id,
                 needs_install_completion: true // Flag indicating this user was created via OIDC
               }
               
               const { error: insertError } = await supabaseAdmin
                 .from('users')
                 .insert(userInsertData)
                 
               if (!insertError) {
                 console.log('DIAGNOSTIC (Supabase Auth Callback): Created temporary user record')
                 workspaceExists = true
               } else {
                 console.error('DIAGNOSTIC (Supabase Auth Callback): Failed to create user record:', insertError)
               }
             } else {
               console.log('DIAGNOSTIC (Supabase Auth Callback): Team exists but workspace record not found')
             }
           } else {
             console.log('DIAGNOSTIC (Supabase Auth Callback): No team ID available to find workspace')
           }
         } catch (createError) {
           console.error('DIAGNOSTIC (Supabase Auth Callback): Error creating temporary user:', createError)
         }
      }

      // 3. Redirect based on workspace existence
      if (workspaceExists) {
        console.log('DIAGNOSTIC (Supabase Auth Callback): Workspace exists. Redirecting to dashboard.')
        return NextResponse.redirect(`${origin}/dashboard`)
      }

      // If workspace doesn't exist, redirect to landing page
      console.log('DIAGNOSTIC (Supabase Auth Callback): Workspace does not exist or user not linked. Redirecting to landing page with install prompt.')
      // Access team_id via identity_data
      const teamIdHint = slackIdentityData?.team_id || 'unknown'
      return NextResponse.redirect(`${origin}/?install_required=true&workspace_hint=${teamIdHint}`)

      // --- End Workspace Check --- 

    } catch (error) {
      console.error('DIAGNOSTIC (Supabase Auth Callback): Unexpected error during callback processing:', error)
      return NextResponse.redirect(`${origin}/auth/auth-code-error?message=Internal+server+error`)
    }
  } else {
    console.error('DIAGNOSTIC (Supabase Auth Callback): No code found in request parameters.')
    return NextResponse.redirect(`${origin}/auth/auth-code-error?message=Authorization+code+missing`)
  }
} 
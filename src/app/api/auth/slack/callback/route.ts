import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  console.log('DIAGNOSTIC (Callback): Received callback request', { code })

  if (!code) {
    console.error('DIAGNOSTIC (Callback): No code provided in callback')
    return NextResponse.redirect(`${origin}/sign-in?error=No+code+provided`)
  }

  const clientId = process.env.SLACK_CLIENT_ID || ''
  const clientSecret = process.env.SLACK_CLIENT_SECRET || ''

  if (!clientId || !clientSecret) {
    console.error('DIAGNOSTIC (Callback): Missing SLACK_CLIENT_ID or SLACK_CLIENT_SECRET env vars')
    return NextResponse.redirect(`${origin}/sign-in?error=Server+configuration+error`)
  }

  try {
    console.log('DIAGNOSTIC (Callback): Exchanging code for tokens...')
    // 1. Exchange the code for access tokens (using correct redirect_uri)
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        code: code,
        redirect_uri: `${origin}/api/auth/slack/callback` // Match the URI used in signInWithOAuth
      }),
    })

    const tokenData = await tokenResponse.json()
    console.log('DIAGNOSTIC (Callback): Token exchange response data:', JSON.stringify(tokenData, null, 2))

    // Check if the exchange was successful and included user details
    if (!tokenData.ok || !tokenData.authed_user || !tokenData.authed_user.id || !tokenData.team || !tokenData.team.id) {
      console.error('DIAGNOSTIC (Callback): Error exchanging code or missing required user/team data:', tokenData.error || 'Missing data')
      return NextResponse.redirect(`${origin}/sign-in?error=Authentication+failed`)
    }

    const userId = tokenData.authed_user.id
    const workspaceSlackId = tokenData.team.id // This is the Slack Team ID (e.g., T12345)
    const userAccessToken = tokenData.authed_user.access_token // User token (might be needed for specific actions, but maybe not for just auth)
    const botToken = tokenData.access_token // Bot token (likely only present during full installation flow)

    console.log('DIAGNOSTIC (Callback): Tokens and IDs received:', { userId, workspaceSlackId, hasUserToken: !!userAccessToken, hasBotToken: !!botToken });

    // --- Setup Admin Client for DB operations ---
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('DIAGNOSTIC (Callback): SUPABASE_SERVICE_ROLE_KEY env var is missing!')
      return NextResponse.redirect(`${origin}/sign-in?error=Server+config+error+(Admin)`);
    }
    // ---------------------------------------------

    // 2. Check if the workspace exists in our DB
    console.log('DIAGNOSTIC (Callback): Checking for existing workspace with slack_id:', workspaceSlackId)
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from('workspaces')
      .select('id, slack_id, bot_token') // Select bot_token too
      .eq('slack_id', workspaceSlackId)
      .single()

    if (workspaceError && workspaceError.code !== 'PGRST116') { // Ignore "No rows found" error
      console.error('DIAGNOSTIC (Callback): Error checking workspace:', workspaceError)
      return NextResponse.redirect(`${origin}/sign-in?error=Database+error+checking+workspace`)
    }

    if (!workspace) {
      // Workspace not found - this user tried web sign-in without prior installation
      console.warn('DIAGNOSTIC (Callback): Workspace not found for slack_id. Installation likely required.', workspaceSlackId)
      // If we received a bot token HERE, it means this *was* an installation flow, handle it.
      if (botToken) {
        console.log('DIAGNOSTIC (Callback): Bot token received, proceeding with installation logic...')
        // --- Installation Logic (Similar to previous version) ---
        const workspaceName = tokenData.team.name

        // Fetch team info for domain (if needed, might already have it)
        const teamInfoResponse = await fetch(`https://slack.com/api/team.info?team=${workspaceSlackId}`, { 
          headers: { 'Authorization': `Bearer ${botToken}` },
        })
        const teamInfoData = await teamInfoResponse.json()
        if (!teamInfoData.ok || !teamInfoData.team) {
            console.error('DIAGNOSTIC (Callback): Error getting team info during install:', teamInfoData.error)
            return NextResponse.redirect(`${origin}/sign-in?error=Failed+to+get+team+info+during+install`)
        }
        const workspaceDomain = teamInfoData.team.domain

        const workspaceUpsertData = {
          slack_id: workspaceSlackId,
          name: workspaceName,
          domain: workspaceDomain,
          bot_token: botToken,
          token: userAccessToken || '', 
        }
        const { data: newWorkspace, error: newWorkspaceError } = await supabaseAdmin
          .from('workspaces')
          .upsert(workspaceUpsertData, { onConflict: 'slack_id' })
          .select('id')
          .single()

        if (newWorkspaceError || !newWorkspace) {
          console.error('DIAGNOSTIC (Callback): Error upserting new workspace:', newWorkspaceError)
          return NextResponse.redirect(`${origin}/sign-in?error=Failed+to+save+workspace+during+install`)
        }
        // Continue with user upsert using newWorkspace.id...
         console.log('DIAGNOSTIC (Callback): New workspace created/updated:', newWorkspace.id)
         // Fall through to user upsert logic below, using newWorkspace.id
         const workspaceIdDB = newWorkspace.id
          // ... rest of user creation/update logic ...
           // Fetch user info
        console.log('DIAGNOSTIC (Callback): Fetching user info (install flow)...')
        const userInfoResponse = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
          headers: { 'Authorization': `Bearer ${botToken}` }, // Use bot token for user info
        })
        const userInfoData = await userInfoResponse.json()
        if (!userInfoData.ok || !userInfoData.user) {
          console.error('DIAGNOSTIC (Callback): Error getting user info (install flow):', userInfoData.error)
          return NextResponse.redirect(`${origin}/sign-in?error=Failed+to+get+user+info`)
        }

        const userProfile = userInfoData.user.profile
        const userEmail = userProfile.email
        const userDisplayName = userProfile.display_name || userProfile.real_name || 'Unknown User'
        const userAvatarUrl = userProfile.image_512 || userProfile.image_192 || userProfile.image_72

        console.log('DIAGNOSTIC (Callback): Upserting user (install flow):', { userId, userEmail, workspaceIdDB })
        const { error: userError } = await supabaseAdmin
          .from('users')
          .upsert({
            slack_id: userId,
            email: userEmail,
            display_name: userDisplayName,
            avatar_url: userAvatarUrl,
            workspace_id: workspaceIdDB,
          }, { onConflict: 'slack_id' })

        if (userError) {
          console.error('DIAGNOSTIC (Callback): Error upserting user (install flow):', userError)
          return NextResponse.redirect(`${origin}/sign-in?error=Failed+to+save+user`)
        }
        console.log('DIAGNOSTIC (Callback): User upsert successful (install flow).')
        // Session creation will happen via Supabase OAuth exchange below
      } else {
        // No bot token, and workspace doesn't exist - redirect with error
        return NextResponse.redirect(`${origin}/sign-in?error=App+not+installed+in+this+workspace`)
      }
    } else {
      // Workspace exists - proceed with regular sign-in user update
      console.log('DIAGNOSTIC (Callback): Workspace found. DB ID:', workspace.id)
      const workspaceIdDB = workspace.id
      const existingBotToken = workspace.bot_token // Use the existing bot token from DB

      if (!existingBotToken) {
          console.error('DIAGNOSTIC (Callback): Existing workspace found but missing bot token!', workspace.id)
          return NextResponse.redirect(`${origin}/sign-in?error=Workspace+configuration+error`);
      }

      // Fetch user info
      console.log('DIAGNOSTIC (Callback): Fetching user info (sign-in flow)...')
      const userInfoResponse = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
        headers: { 'Authorization': `Bearer ${existingBotToken}` }, // Use existing bot token
      })
      const userInfoData = await userInfoResponse.json()
      if (!userInfoData.ok || !userInfoData.user) {
        console.error('DIAGNOSTIC (Callback): Error getting user info (sign-in flow):', userInfoData.error)
        // Don't fail the whole sign-in, maybe user info is unavailable temporarily?
        // Proceed to session creation, but log the error.
      } else {
         const userProfile = userInfoData.user.profile
         const userEmail = userProfile.email
         const userDisplayName = userProfile.display_name || userProfile.real_name || 'Unknown User'
         const userAvatarUrl = userProfile.image_512 || userProfile.image_192 || userProfile.image_72

         console.log('DIAGNOSTIC (Callback): Upserting user (sign-in flow):', { userId, userEmail, workspaceIdDB })
         // Update user details
         const { error: userError } = await supabaseAdmin
           .from('users')
           .upsert({
             slack_id: userId,
             email: userEmail,
             display_name: userDisplayName,
             avatar_url: userAvatarUrl,
             workspace_id: workspaceIdDB,
           }, { onConflict: 'slack_id' })

         if (userError) {
           console.error('DIAGNOSTIC (Callback): Error upserting user (sign-in flow):', userError)
           // Don't fail sign-in for user update error, just log it.
         }
         console.log('DIAGNOSTIC (Callback): User upsert successful (sign-in flow).')
      }
       // Session creation will happen via Supabase OAuth exchange below
    }

    // 3. Exchange the code for a Supabase session (This happens automatically via cookies)
    // Use the server client (which reads cookies set by the helper) to handle session
    const supabaseServer = createServerClient()
    const { error: sessionError } = await supabaseServer.auth.exchangeCodeForSession(code)

    if (sessionError) {
      console.error('DIAGNOSTIC (Callback): Error exchanging code for Supabase session:', sessionError)
      return NextResponse.redirect(`${origin}/sign-in?error=Failed+to+create+session`)
    }

    console.log('DIAGNOSTIC (Callback): Session exchange successful. Redirecting to dashboard...')
    // Success! Redirect to the dashboard page
    return NextResponse.redirect(`${origin}/dashboard`)

  } catch (error) {
    console.error('DIAGNOSTIC (Callback): Unexpected error in OAuth callback:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal+server+error'
    return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent(errorMessage)}`)
  }
}

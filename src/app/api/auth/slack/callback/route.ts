import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const state = requestUrl.searchParams.get('state') // TODO: Add state verification
  const origin = requestUrl.origin

  console.log('DIAGNOSTIC (Callback): Received callback request', { code, state })

  if (!code) {
    console.error('DIAGNOSTIC (Callback): No code provided in callback')
    return NextResponse.redirect(`${origin}/auth/signin?error=No+code+provided`)
  }

  // TODO: Verify state parameter here against a stored value (e.g., in cookies)

  const clientId = process.env.SLACK_CLIENT_ID || ''
  const clientSecret = process.env.SLACK_CLIENT_SECRET || ''

  if (!clientId || !clientSecret) {
    console.error('DIAGNOSTIC (Callback): Missing SLACK_CLIENT_ID or SLACK_CLIENT_SECRET env vars')
    return NextResponse.redirect(`${origin}/auth/signin?error=Server+configuration+error`)
  }

  try {
    console.log('DIAGNOSTIC (Callback): Exchanging code for tokens...')
    // 1. Exchange the code for access tokens
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        code: code,
        redirect_uri: `${origin}/api/auth/slack/callback` // Ensure this matches the redirect URI sent initially
      }),
    })

    const tokenData = await tokenResponse.json()
    console.log('DIAGNOSTIC (Callback): Token exchange response data:', JSON.stringify(tokenData, null, 2))

    if (!tokenData.ok || !tokenData.authed_user || !tokenData.access_token) {
      console.error('DIAGNOSTIC (Callback): Error exchanging code for tokens or missing required data:', tokenData.error || 'Missing data')
      return NextResponse.redirect(`${origin}/auth/signin?error=Failed+to+exchange+code`)
    }

    const botToken = tokenData.access_token // This is the bot token
    const userToken = tokenData.authed_user.access_token // User token
    const userId = tokenData.authed_user.id
    const workspaceId = tokenData.team.id
    const workspaceName = tokenData.team.name

    console.log('DIAGNOSTIC (Callback): Tokens and IDs received:', { botToken: '[REDACTED]', userToken: '[REDACTED]', userId, workspaceId, workspaceName });

    // --- Fetch team info to get domain ---
    console.log('DIAGNOSTIC (Callback): Fetching team info using bot token...')
    const teamInfoResponse = await fetch(`https://slack.com/api/team.info?team=${workspaceId}`, { // Use workspaceId from tokenData
      headers: {
        'Authorization': `Bearer ${botToken}`,
      },
    })
    const teamInfoData = await teamInfoResponse.json()
    console.log('DIAGNOSTIC (Callback): Team info response data:', JSON.stringify(teamInfoData, null, 2))

    if (!teamInfoData.ok || !teamInfoData.team) {
        console.error('DIAGNOSTIC (Callback): Error getting team info:', teamInfoData.error || 'Missing team data')
        return NextResponse.redirect(`${origin}/auth/signin?error=Failed+to+get+team+info`)
    }
    const workspaceDomain = teamInfoData.team.domain // Extract domain
    console.log('DIAGNOSTIC (Callback): Workspace domain extracted:', workspaceDomain)
    // --- End fetch team info ---

    // We need the user's profile info (email, name, avatar)
    console.log('DIAGNOSTIC (Callback): Fetching user info using bot token...')
    const userInfoResponse = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
      headers: {
        'Authorization': `Bearer ${botToken}`,
      },
    })
    const userInfoData = await userInfoResponse.json()
    console.log('DIAGNOSTIC (Callback): User info response data:', JSON.stringify(userInfoData, null, 2))

    if (!userInfoData.ok || !userInfoData.user) {
      console.error('DIAGNOSTIC (Callback): Error getting user info:', userInfoData.error || 'Missing user data')
      return NextResponse.redirect(`${origin}/auth/signin?error=Failed+to+get+user+info`)
    }

    const userProfile = userInfoData.user.profile
    const userEmail = userProfile.email
    const userDisplayName = userProfile.display_name || userProfile.real_name || 'Unknown User'
    const userAvatarUrl = userProfile.image_512 || userProfile.image_192 || userProfile.image_72

    console.log('DIAGNOSTIC (Callback): User details extracted:', { userEmail, userDisplayName, userAvatarUrl: '[REDACTED]' })

    // --- Use Admin Client for DB writes to bypass RLS ---
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('DIAGNOSTIC (Callback): SUPABASE_SERVICE_ROLE_KEY env var is missing!')
      return NextResponse.redirect(`${origin}/auth/signin?error=Server+config+error+(Admin)`);
    }
    // ------------------------------------------------------

    // 2. Create or update workspace using Admin Client
    const workspaceUpsertData = {
      slack_id: workspaceId,
      name: workspaceName,
      domain: workspaceDomain, // Include domain
      bot_token: botToken,
      token: userToken || '', // Include user token (handle potential null)
    }
    console.log('DIAGNOSTIC (Callback): Upserting workspace with data (Admin Client):', JSON.stringify({...workspaceUpsertData, bot_token: '[REDACTED]', token: '[REDACTED]'}, null, 2))

    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from('workspaces')
      .upsert(workspaceUpsertData, { onConflict: 'slack_id' })
      .select('id')
      .single()

    if (workspaceError || !workspace) {
      console.error('DIAGNOSTIC (Callback): Error upserting workspace (Admin Client):', workspaceError)
      return NextResponse.redirect(`${origin}/auth/signin?error=Failed+to+save+workspace`)
    }
    console.log('DIAGNOSTIC (Callback): Workspace upsert successful. DB Workspace ID:', workspace.id)

    // 3. Create or update user using Admin Client
    const userUpsertData = {
      slack_id: userId,
      email: userEmail,
      display_name: userDisplayName,
      avatar_url: userAvatarUrl,
      workspace_id: workspace.id,
      // We don't have the auth_id yet at this point in the flow
      // It will be updated later when the user signs in
    }
    console.log('DIAGNOSTIC (Callback): Upserting user with data (Admin Client):', JSON.stringify({...userUpsertData, avatar_url: '[REDACTED]'}, null, 2))

    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert(userUpsertData, { onConflict: 'slack_id' })

    if (userError) {
      console.error('DIAGNOSTIC (Callback): Error upserting user (Admin Client):', userError)
      return NextResponse.redirect(`${origin}/auth/signin?error=Failed+to+save+user`)
    }
    console.log('DIAGNOSTIC (Callback): User upsert successful.')

    // --- Switch back to Server Client for user-context operations ---
    const supabaseServer = createServerClient()
    // --------------------------------------------------------------

    // 4. Create a session for the user who installed the app
    console.log('DIAGNOSTIC (Callback): Attempting to sign in user with email:', userEmail)
    const { error: sessionError } = await supabaseServer.auth.signInWithPassword({
      email: userEmail,
      password: userId,
    })

    if (sessionError) {
      console.error('DIAGNOSTIC (Callback): Error creating session:', sessionError)
      return NextResponse.redirect(`${origin}/auth/signin?error=Failed+to+create+session`)
    }
    console.log('DIAGNOSTIC (Callback): Session creation successful.')

    // Success! Redirect to home page
    console.log('DIAGNOSTIC (Callback): Redirecting to origin:', origin)
    return NextResponse.redirect(origin)

  } catch (error) {
    console.error('DIAGNOSTIC (Callback): Unexpected error in OAuth callback:', error)
    return NextResponse.redirect(`${origin}/auth/signin?error=Internal+server+error`)
  }
}

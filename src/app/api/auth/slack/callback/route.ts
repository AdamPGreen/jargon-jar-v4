import { createClient } from '@/lib/supabase/server'
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
    const userToken = tokenData.authed_user.access_token // Optional user token if user scopes were requested
    const userId = tokenData.authed_user.id
    const workspaceId = tokenData.team.id
    const workspaceName = tokenData.team.name

    console.log('DIAGNOSTIC (Callback): Tokens and IDs received:', { botToken: '[REDACTED]', userToken: '[REDACTED]', userId, workspaceId, workspaceName });

    // We need the user's profile info (email, name, avatar)
    // We can use the bot token which usually has broader permissions
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
      // Don't fail the whole install, maybe proceed with placeholder data?
      // Or redirect with a specific error?
      return NextResponse.redirect(`${origin}/auth/signin?error=Failed+to+get+user+info`)
    }

    const userProfile = userInfoData.user.profile
    const userEmail = userProfile.email
    const userDisplayName = userProfile.display_name || userProfile.real_name || 'Unknown User'
    const userAvatarUrl = userProfile.image_512 || userProfile.image_192 || userProfile.image_72

    console.log('DIAGNOSTIC (Callback): User details extracted:', { userEmail, userDisplayName, userAvatarUrl: '[REDACTED]' })

    const supabase = createClient()

    // 2. Create or update workspace
    const workspaceUpsertData = {
      slack_id: workspaceId,
      name: workspaceName,
      // domain: tokenData.team.domain, // Domain isn't always available here, maybe fetch team.info?
      bot_token: botToken, // Store the bot token
      // token: userToken || '' // Store user token if available/needed
    }
    console.log('DIAGNOSTIC (Callback): Upserting workspace with data:', JSON.stringify({...workspaceUpsertData, bot_token: '[REDACTED]'}, null, 2))

    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .upsert(workspaceUpsertData, { onConflict: 'slack_id' })
      .select('id') // Select the internal UUID
      .single()

    if (workspaceError || !workspace) {
      console.error('DIAGNOSTIC (Callback): Error upserting workspace:', workspaceError)
      return NextResponse.redirect(`${origin}/auth/signin?error=Failed+to+save+workspace`)
    }
    console.log('DIAGNOSTIC (Callback): Workspace upsert successful. DB Workspace ID:', workspace.id)

    // 3. Create or update user
    const userUpsertData = {
      slack_id: userId,
      email: userEmail,
      display_name: userDisplayName,
      avatar_url: userAvatarUrl,
      workspace_id: workspace.id, // Link to the workspace's internal ID
    }
    console.log('DIAGNOSTIC (Callback): Upserting user with data:', JSON.stringify({...userUpsertData, avatar_url: '[REDACTED]'}, null, 2))

    const { error: userError } = await supabase
      .from('users')
      .upsert(userUpsertData, { onConflict: 'slack_id' })

    if (userError) {
      console.error('DIAGNOSTIC (Callback): Error upserting user:', userError)
      // Critical failure - user needs to exist for login
      return NextResponse.redirect(`${origin}/auth/signin?error=Failed+to+save+user`)
    }
    console.log('DIAGNOSTIC (Callback): User upsert successful.')

    // 4. Create a session for the user who installed the app
    // We'll use the signInWithPassword hack with slack_id as password
    console.log('DIAGNOSTIC (Callback): Attempting to sign in user with email:', userEmail)
    const { error: sessionError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: userId, // Use Slack ID as password
    })

    if (sessionError) {
      console.error('DIAGNOSTIC (Callback): Error creating session:', sessionError)
      // Don't fail entirely, maybe redirect home but user isn't logged in?
      // Or redirect to signin with a specific error?
      return NextResponse.redirect(`${origin}/auth/signin?error=Failed+to+create+session`)
    }
    console.log('DIAGNOSTIC (Callback): Session creation successful.')

    // Success! Redirect to home page (or a success page)
    console.log('DIAGNOSTIC (Callback): Redirecting to origin:', origin)
    return NextResponse.redirect(origin)

  } catch (error) {
    console.error('DIAGNOSTIC (Callback): Unexpected error in OAuth callback:', error)
    return NextResponse.redirect(`${origin}/auth/signin?error=Internal+server+error`)
  }
} 